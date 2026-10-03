import {
  CONTEST_CAMPAIGNS_SET,
  GRAND_PRIZE_CHECK_IN_STATUS_CHECKED_IN,
  GRAND_PRIZE_ENTRIES_SET,
  GRAND_PRIZE_ENTRY_CONTACT_NAV,
  dataverseFetch,
  escapeODataString,
} from "./dataverse";
import { buildFollowUpEmail, FOLLOW_UP_SUBJECT } from "./consentEmails";
import { createContactEmail, isGameCreatedContact, isMarketingOptedIn, removeContactData, type ContactRow } from "./consent";
import { buildPreferenceLink, signPreferenceToken } from "./preferenceToken";

/** Daily job: post-event follow-up emails and 90-day retention (docs/PREFERENCE_CENTER_DESIGN.md). */
export const FOLLOW_UP_WINDOW_DAYS = 3;
export const RETENTION_DAYS = 90;
const MAX_RETENTION_PER_RUN = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A campaign is eligible from its follow-up time until FOLLOW_UP_WINDOW_DAYS later, then the job ignores it. */
export function followUpWindow(now: Date): { from: string; to: string } {
  return { from: new Date(now.getTime() - FOLLOW_UP_WINDOW_DAYS * DAY_MS).toISOString(), to: now.toISOString() };
}

export function retentionCutoff(now: Date): string {
  return new Date(now.getTime() - RETENTION_DAYS * DAY_MS).toISOString();
}

interface FollowUpCampaign {
  id: string;
  eventName: string | null;
  preferenceUrl: string | null;
  privacyNoticeUrl: string | null;
}

async function listFollowUpCampaigns(now: Date): Promise<FollowUpCampaign[]> {
  const { from, to } = followUpWindow(now);
  const response = await dataverseFetch(
    `${CONTEST_CAMPAIGNS_SET}?$select=andy_contestcampaignid,andy_eventname,andy_preference_url,andy_privacynoticeurl` +
      `&$filter=statecode eq 0 and andy_followup_send_time ge ${from} and andy_followup_send_time le ${to}`
  );
  const body = (await response.json()) as {
    value: Array<{ andy_contestcampaignid: string; andy_eventname?: string | null; andy_preference_url?: string | null; andy_privacynoticeurl?: string | null }>;
  };
  return body.value.map((c) => ({ id: c.andy_contestcampaignid, eventName: c.andy_eventname ?? null, preferenceUrl: c.andy_preference_url ?? null, privacyNoticeUrl: c.andy_privacynoticeurl ?? null }));
}

async function hasFollowUpEmail(entryId: string): Promise<boolean> {
  const response = await dataverseFetch(
    `emails?$select=activityid&$filter=_regardingobjectid_value eq ${entryId} and subject eq '${escapeODataString(FOLLOW_UP_SUBJECT)}'&$top=1`
  );
  return ((await response.json()) as { value: unknown[] }).value.length > 0;
}

export interface FollowUpSummary {
  campaigns: number;
  sent: number;
  skipped: number;
  failed: number;
}

export async function runFollowUps(now = new Date()): Promise<FollowUpSummary> {
  const summary: FollowUpSummary = { campaigns: 0, sent: 0, skipped: 0, failed: 0 };
  const marketingAddress = (process.env.MARKETING_SENDER_ADDRESS ?? "").trim();
  const marketingHtml = (process.env.FOLLOW_UP_MARKETING_HTML ?? "").trim();

  for (const campaign of await listFollowUpCampaigns(now)) {
    summary.campaigns++;
    if (!campaign.preferenceUrl) {
      console.warn(`Follow-up skipped for campaign ${campaign.id}: andy_preference_url is not set`);
      continue;
    }
    const response = await dataverseFetch(
      `${GRAND_PRIZE_ENTRIES_SET}?$select=andy_grandprizeentryid` +
        `&$filter=statecode eq 0 and _andy_campaignname_value eq ${campaign.id} and andy_checkinstatus eq ${GRAND_PRIZE_CHECK_IN_STATUS_CHECKED_IN} and _andy_contact_value ne null` +
        `&$expand=${GRAND_PRIZE_ENTRY_CONTACT_NAV}($select=contactid,emailaddress1,firstname,donotemail,donotbulkemail)&$top=5000`
    );
    const entries = ((await response.json()) as { value: Array<{ andy_grandprizeentryid: string; [k: string]: unknown }> }).value;

    for (const entry of entries) {
      const contact = entry[GRAND_PRIZE_ENTRY_CONTACT_NAV] as ContactRow | null | undefined;
      if (!contact?.emailaddress1 || contact.donotemail === true || (await hasFollowUpEmail(entry.andy_grandprizeentryid))) {
        summary.skipped++;
        continue;
      }
      // Marketing content only with a confirmed opt-in and a sender address; otherwise the neutral thank-you.
      const optedIn = marketingHtml && marketingAddress ? await isMarketingOptedIn(contact) : false;
      const email = buildFollowUpEmail({
        firstName: contact.firstname?.trim() || "there",
        eventName: campaign.eventName ?? "the event",
        manageUrl: buildPreferenceLink(campaign.preferenceUrl, signPreferenceToken({ contactId: contact.contactid, purpose: "manage" })),
        marketing: optedIn ? { html: marketingHtml, senderAddress: marketingAddress } : null,
        privacyNoticeUrl: campaign.privacyNoticeUrl,
      });
      const result = await createContactEmail({ contactId: contact.contactid, regarding: { kind: "entry", id: entry.andy_grandprizeentryid }, ...email });
      if (result.status === "sent") summary.sent++;
      else {
        summary.failed++;
        console.error(`Follow-up email ${result.status} for entry ${entry.andy_grandprizeentryid}: ${result.message ?? ""}`);
      }
    }
  }
  return summary;
}

export interface RetentionSummary {
  checked: number;
  removed: number;
}

/**
 * Erases game-created contacts that never confirmed a marketing opt-in, RETENTION_DAYS after their
 * campaign's drawing and with no newer play. Entries are kept (see removeContactData).
 */
export async function runRetention(now = new Date()): Promise<RetentionSummary> {
  const cutoff = retentionCutoff(now);
  const summary: RetentionSummary = { checked: 0, removed: 0 };
  const campaigns = await dataverseFetch(`${CONTEST_CAMPAIGNS_SET}?$select=andy_contestcampaignid&$filter=andy_drawingtime le ${cutoff}`);
  const seen = new Set<string>();

  for (const campaign of ((await campaigns.json()) as { value: Array<{ andy_contestcampaignid: string }> }).value) {
    const response = await dataverseFetch(
      `${GRAND_PRIZE_ENTRIES_SET}?$select=andy_grandprizeentryid&$filter=_andy_campaignname_value eq ${campaign.andy_contestcampaignid} and _andy_contact_value ne null` +
        `&$expand=${GRAND_PRIZE_ENTRY_CONTACT_NAV}($select=contactid,donotemail,donotbulkemail,_createdby_value)&$top=5000`
    );
    for (const entry of ((await response.json()) as { value: Array<{ [k: string]: unknown }> }).value) {
      const contact = entry[GRAND_PRIZE_ENTRY_CONTACT_NAV] as ContactRow | null | undefined;
      if (!contact || seen.has(contact.contactid)) continue;
      seen.add(contact.contactid);
      if (summary.removed >= MAX_RETENTION_PER_RUN) return summary;
      summary.checked++;
      if (!(await isGameCreatedContact(contact)) || (await isMarketingOptedIn(contact))) continue;
      const recent = await dataverseFetch(`${GRAND_PRIZE_ENTRIES_SET}?$select=andy_grandprizeentryid&$filter=_andy_contact_value eq ${contact.contactid} and createdon gt ${cutoff}&$top=1`);
      if (((await recent.json()) as { value: unknown[] }).value.length > 0) continue;
      try {
        await removeContactData(contact.contactid, "retention expiry", now);
        summary.removed++;
      } catch (error) {
        console.error(`Retention removal failed for contact ${contact.contactid}`, error);
      }
    }
  }
  return summary;
}
