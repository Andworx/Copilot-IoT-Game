import {
  CONTEST_CAMPAIGNS_SET,
  GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID,
  GRAND_PRIZE_ENTRIES_SET,
  GRAND_PRIZE_ENTRY_CONTACT_NAV,
  dataverseFetch,
  dataverseFetchRaw,
  escapeODataString,
  isGuidLike,
  parseDataverseIdFromEntityUrl,
} from "./dataverse";
import { buildOptInConfirmationEmail } from "./consentEmails";
import { buildPreferenceLink, signPreferenceToken } from "./preferenceToken";

/**
 * Marketing consent and data-removal handling (issue #133), Dataverse-native: the standard
 * Contact fields donotbulkemail (marketing) and donotemail (everything), Notes as the
 * human-readable consent trail, Tasks for requests staff must action. docs/PREFERENCE_CENTER_DESIGN.md.
 */
export const OPT_IN_NOTE_SUBJECT = "Marketing opt-in confirmed";
const NOTE_SUBJECT_REQUESTED = "Marketing opt-in requested";
const NOTE_SUBJECT_OPT_OUT = "Marketing opt-out";
const NOTE_SUBJECT_REMOVAL = "Removal requested";
const TASK_DUE_DAYS = 30;

// Navigation property names for polymorphic activity/note lookups. Confirm against this
// environment's EntityDefinitions metadata before first use (see the nav-property note in dataverse.ts).
const NOTE_CONTACT_NAV = "objectid_contact";
const NOTE_ENTRY_NAV = "objectid_andy_grandprizeentry";
const EMAIL_REGARDING_CONTACT_NAV = "regardingobjectid_contact_email";
const EMAIL_REGARDING_ENTRY_NAV = "regardingobjectid_andy_grandprizeentry";
const TASK_REGARDING_CONTACT_NAV = "regardingobjectid_contact_task";

export type ConsentSource = "claim-page" | "preference-page" | "follow-up-email";

export interface ContactRow {
  contactid: string;
  emailaddress1?: string | null;
  firstname?: string | null;
  donotemail?: boolean | null;
  donotbulkemail?: boolean | null;
  _createdby_value?: string | null;
}

const CONTACT_SELECT = "contactid,emailaddress1,firstname,donotemail,donotbulkemail,_createdby_value";

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(local.length - 1, 6)))}@${domain}`;
}

export async function fetchContact(contactId: string): Promise<ContactRow | null> {
  if (!isGuidLike(contactId)) return null;
  const response = await dataverseFetchRaw(`contacts(${contactId})?$select=${CONTACT_SELECT}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Dataverse GET contact failed: ${response.status} ${await response.text()}`);
  return (await response.json()) as ContactRow;
}

export async function addNote(target: { kind: "contact" | "entry"; id: string }, subject: string, text: string): Promise<void> {
  const nav = target.kind === "contact" ? NOTE_CONTACT_NAV : NOTE_ENTRY_NAV;
  const set = target.kind === "contact" ? "contacts" : GRAND_PRIZE_ENTRIES_SET;
  await dataverseFetch("annotations", {
    method: "POST",
    body: JSON.stringify({ subject, notetext: text, [`${nav}@odata.bind`]: `/${set}(${target.id})` }),
  });
}

async function createTask(contactId: string, subject: string, description: string, now: Date): Promise<void> {
  const due = new Date(now.getTime() + TASK_DUE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await dataverseFetch("tasks", {
    method: "POST",
    body: JSON.stringify({ subject, description, scheduledend: due, [`${TASK_REGARDING_CONTACT_NAV}@odata.bind`]: `/contacts(${contactId})` }),
  });
}

async function activeCampaignLinks(): Promise<{ preferenceUrl: string | null; privacyNoticeUrl: string | null }> {
  const response = await dataverseFetch(
    `${CONTEST_CAMPAIGNS_SET}?$select=andy_preference_url,andy_privacynoticeurl&$filter=statecode eq 0&$orderby=createdon desc&$top=1`
  );
  const body = (await response.json()) as { value: Array<{ andy_preference_url?: string | null; andy_privacynoticeurl?: string | null }> };
  return { preferenceUrl: body.value[0]?.andy_preference_url ?? null, privacyNoticeUrl: body.value[0]?.andy_privacynoticeurl ?? null };
}

/** Creates the email activity as a draft first, then sends it. A draft left behind by a failed send stays visible on the timeline. */
export async function createContactEmail(input: {
  contactId: string;
  regarding: { kind: "contact" | "entry"; id: string };
  subject: string;
  html: string;
}): Promise<{ status: "sent" | "not_configured" | "error"; emailActivityId?: string; message?: string }> {
  if (!GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID.trim()) {
    return { status: "not_configured", message: "GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID is not configured" };
  }
  const nav = input.regarding.kind === "contact" ? EMAIL_REGARDING_CONTACT_NAV : EMAIL_REGARDING_ENTRY_NAV;
  const set = input.regarding.kind === "contact" ? "contacts" : GRAND_PRIZE_ENTRIES_SET;
  let emailActivityId: string | undefined;
  try {
    const response = await dataverseFetch("emails", {
      method: "POST",
      body: JSON.stringify({
        subject: input.subject,
        description: input.html,
        directioncode: true,
        [`${nav}@odata.bind`]: `/${set}(${input.regarding.id})`,
        email_activity_parties: [
          { participationtypemask: 1, "partyid_systemuser@odata.bind": `/systemusers(${GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID})` },
          { participationtypemask: 2, "partyid_contact@odata.bind": `/contacts(${input.contactId})` },
        ],
      }),
    });
    emailActivityId = parseDataverseIdFromEntityUrl(response.headers.get("OData-EntityId")) ?? undefined;
    if (!emailActivityId) return { status: "error", message: "Email activity id was not returned" };
    await dataverseFetch(`emails(${emailActivityId})/Microsoft.Dynamics.CRM.SendEmail`, {
      method: "POST",
      body: JSON.stringify({ IssueSend: true, TrackingToken: "" }),
    });
    return { status: "sent", emailActivityId };
  } catch (error) {
    return { status: "error", emailActivityId, message: error instanceof Error ? error.message : "Failed to create or send email" };
  }
}

export async function hasMarketingOptInNote(contactId: string): Promise<boolean> {
  const response = await dataverseFetch(
    `annotations?$select=annotationid&$filter=_objectid_value eq ${contactId} and subject eq '${escapeODataString(OPT_IN_NOTE_SUBJECT)}'&$top=1`
  );
  return ((await response.json()) as { value: unknown[] }).value.length > 0;
}

/** Opted in = marketing flag off AND a recorded confirmation. A bare donotbulkemail=false (the Dataverse default) is not consent. */
export async function isMarketingOptedIn(contact: ContactRow): Promise<boolean> {
  return contact.donotemail !== true && contact.donotbulkemail === false && (await hasMarketingOptInNote(contact.contactid));
}

export interface PreferenceState {
  maskedEmail: string;
  marketing: "opted_in" | "opted_out";
  emailBlocked: boolean;
}

export async function getPreferenceState(contactId: string): Promise<PreferenceState | null> {
  const contact = await fetchContact(contactId);
  if (!contact) return null;
  return {
    maskedEmail: maskEmail(contact.emailaddress1),
    marketing: (await isMarketingOptedIn(contact)) ? "opted_in" : "opted_out",
    emailBlocked: contact.donotemail === true,
  };
}

/** Step 1 of double opt-in: record the request and email a confirmation link. Marketing stays off until it is used. */
export async function requestMarketingOptIn(contactId: string, source: ConsentSource): Promise<"sent" | "skipped" | "error"> {
  const contact = await fetchContact(contactId);
  if (!contact?.emailaddress1 || contact.donotemail === true) return "skipped";
  const links = await activeCampaignLinks();
  if (!links.preferenceUrl) return "skipped";
  const confirmUrl = buildPreferenceLink(links.preferenceUrl, signPreferenceToken({ contactId, purpose: "confirm" }));
  const email = buildOptInConfirmationEmail({ firstName: contact.firstname?.trim() || "there", confirmUrl, privacyNoticeUrl: links.privacyNoticeUrl });
  await addNote({ kind: "contact", id: contactId }, NOTE_SUBJECT_REQUESTED, `Requested via ${source} at ${new Date().toISOString()}. Privacy notice: ${links.privacyNoticeUrl ?? "not set"}. Confirmation email sent; marketing stays off until confirmed.`);
  const result = await createContactEmail({ contactId, regarding: { kind: "contact", id: contactId }, ...email });
  return result.status === "sent" ? "sent" : "error";
}

/** Step 2 of double opt-in: only called with a verified `confirm` token. */
export async function confirmMarketingOptIn(contactId: string, source: ConsentSource): Promise<"confirmed" | "blocked" | "not_found"> {
  const contact = await fetchContact(contactId);
  if (!contact) return "not_found";
  if (contact.donotemail === true) return "blocked";
  const links = await activeCampaignLinks();
  await dataverseFetch(`contacts(${contactId})`, { method: "PATCH", body: JSON.stringify({ donotbulkemail: false }) });
  await addNote({ kind: "contact", id: contactId }, OPT_IN_NOTE_SUBJECT, `Confirmed via ${source} at ${new Date().toISOString()}. Privacy notice: ${links.privacyNoticeUrl ?? "not set"}. Marketing email enabled (donotbulkemail=false).`);
  return "confirmed";
}

export async function optOutMarketing(contactId: string, source: ConsentSource): Promise<boolean> {
  const contact = await fetchContact(contactId);
  if (!contact) return false;
  await dataverseFetch(`contacts(${contactId})`, { method: "PATCH", body: JSON.stringify({ donotbulkemail: true }) });
  await addNote({ kind: "contact", id: contactId }, NOTE_SUBJECT_OPT_OUT, `Opted out via ${source} at ${new Date().toISOString()} (donotbulkemail=true).`);
  return true;
}

export async function requestDataCopy(contactId: string, now = new Date()): Promise<boolean> {
  const contact = await fetchContact(contactId);
  if (!contact) return false;
  await createTask(contactId, "Data copy request", `Contact asked for a copy of their data via the preference page on ${now.toISOString()}. Respond within ${TASK_DUE_DAYS} days.`, now);
  return true;
}

let cachedAppUserId: string | null | undefined;

/** Contacts the game created carry Created By = the Function's application user, which is how retention and removal tell them from CRM contacts. */
export async function getGameAppUserId(): Promise<string | null> {
  if (cachedAppUserId !== undefined) return cachedAppUserId;
  const clientId = process.env.DATAVERSE_CLIENT_ID ?? "";
  if (!isGuidLike(clientId)) return (cachedAppUserId = null);
  const response = await dataverseFetch(`systemusers?$select=systemuserid&$filter=applicationid eq ${clientId}&$top=1`);
  const body = (await response.json()) as { value: Array<{ systemuserid: string }> };
  return (cachedAppUserId = body.value[0]?.systemuserid ?? null);
}

export async function isGameCreatedContact(contact: ContactRow): Promise<boolean> {
  const appUserId = await getGameAppUserId();
  return !!appUserId && contact._createdby_value?.toLowerCase() === appUserId.toLowerCase();
}

/**
 * Removal routine. For each Grand Prize Entry of the Contact: add a note to the entry (no personal
 * data), delete the entry's emails (their bodies hold name and address), clear the name and unlink
 * the Contact. Entries are kept. Then the Contact is deleted; prize claims keep their history via Remove Link.
 */
export async function removeContactData(contactId: string, reason: "removal request" | "retention expiry", now = new Date()): Promise<number> {
  const entriesResponse = await dataverseFetch(`${GRAND_PRIZE_ENTRIES_SET}?$select=andy_grandprizeentryid&$filter=_andy_contact_value eq ${contactId}&$top=5000`);
  const entries = ((await entriesResponse.json()) as { value: Array<{ andy_grandprizeentryid: string }> }).value;
  for (const entry of entries) {
    const entryId = entry.andy_grandprizeentryid;
    await addNote({ kind: "entry", id: entryId }, "Contact removed", `${now.toISOString().slice(0, 10)}: contact removed (${reason}). Personal data cleared; entry kept for the drawing record.`);
    const emails = await dataverseFetch(`emails?$select=activityid&$filter=_regardingobjectid_value eq ${entryId}`);
    for (const email of ((await emails.json()) as { value: Array<{ activityid: string }> }).value) {
      await dataverseFetch(`emails(${email.activityid})`, { method: "DELETE" });
    }
    await dataverseFetch(`${GRAND_PRIZE_ENTRIES_SET}(${entryId})`, { method: "PATCH", body: JSON.stringify({ andy_participantname: "Removed participant" }) });
    await dataverseFetch(`${GRAND_PRIZE_ENTRIES_SET}(${entryId})/${GRAND_PRIZE_ENTRY_CONTACT_NAV}/$ref`, { method: "DELETE" });
  }
  await dataverseFetch(`contacts(${contactId})`, { method: "DELETE" });
  return entries.length;
}

/** Cancels any open (draft or scheduled) emails on the Contact's entries, such as the reminder. */
async function cancelOpenEntryEmails(contactId: string): Promise<void> {
  const entriesResponse = await dataverseFetch(`${GRAND_PRIZE_ENTRIES_SET}?$select=andy_grandprizeentryid&$filter=_andy_contact_value eq ${contactId}&$top=5000`);
  for (const entry of ((await entriesResponse.json()) as { value: Array<{ andy_grandprizeentryid: string }> }).value) {
    const emails = await dataverseFetch(`emails?$select=activityid&$filter=_regardingobjectid_value eq ${entry.andy_grandprizeentryid} and statecode eq 0`);
    for (const email of ((await emails.json()) as { value: Array<{ activityid: string }> }).value) {
      await dataverseFetch(`emails(${email.activityid})`, { method: "PATCH", body: JSON.stringify({ statecode: 2, statuscode: 5 }) });
    }
  }
}

/** Suppresses email immediately, then erases game-created contacts now; any other contact becomes a Task for staff. */
export async function requestRemoval(contactId: string, now = new Date()): Promise<"removed" | "task_created" | "not_found"> {
  const contact = await fetchContact(contactId);
  if (!contact) return "not_found";
  await dataverseFetch(`contacts(${contactId})`, { method: "PATCH", body: JSON.stringify({ donotemail: true, donotbulkemail: true }) });
  await addNote({ kind: "contact", id: contactId }, NOTE_SUBJECT_REMOVAL, `Removal requested via the preference page at ${now.toISOString()}. Email suppressed (donotemail=true).`);
  await cancelOpenEntryEmails(contactId);
  if (await isGameCreatedContact(contact)) {
    await removeContactData(contactId, "removal request", now);
    return "removed";
  }
  await createTask(contactId, "Removal request", `Contact asked to be removed via the preference page on ${now.toISOString()}. This contact was not created by the game, so it was suppressed but not deleted. Review and respond within ${TASK_DUE_DAYS} days.`, now);
  return "task_created";
}
