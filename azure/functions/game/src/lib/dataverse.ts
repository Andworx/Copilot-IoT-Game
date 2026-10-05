import { randomInt } from "node:crypto";
import { ConfidentialClientApplication } from "@azure/msal-node";
import QRCode from "qrcode";
import { buildPreferenceLink, signPreferenceToken } from "./preferenceToken";

const DATAVERSE_URL = (process.env.DATAVERSE_URL ?? "").replace(/\/$/, "");
export const GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID = process.env.GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID ?? "";

let msalClient: ConfidentialClientApplication | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;

function getMsalClient(): ConfidentialClientApplication {
  if (!msalClient) {
    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.DATAVERSE_CLIENT_ID ?? "",
        authority: `https://login.microsoftonline.com/${process.env.DATAVERSE_TENANT_ID ?? ""}`,
        clientSecret: process.env.DATAVERSE_CLIENT_SECRET ?? "",
      },
    });
  }
  return msalClient;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.value;
  }
  const result = await getMsalClient().acquireTokenByClientCredential({
    scopes: [`${DATAVERSE_URL}/.default`],
  });
  if (!result?.accessToken) {
    throw new Error("Failed to acquire a Dataverse access token");
  }
  cachedToken = {
    value: result.accessToken,
    expiresAt: result.expiresOn ? result.expiresOn.getTime() : now + 60 * 60 * 1000,
  };
  return cachedToken.value;
}

/** Doesn't throw on non-ok -- callers that need to inspect the status (e.g. a 412 from
 * an If-Match conditional update) use this directly; dataverseFetch wraps it for the
 * common "throw on anything unexpected" case. */
export async function dataverseFetchRaw(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${DATAVERSE_URL}/api/data/v9.2/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      ...(init.headers ?? {}),
    },
  });
}

export async function dataverseFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await dataverseFetchRaw(path, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Dataverse ${init.method ?? "GET"} ${path} failed: ${response.status} ${body}`);
  }
  return response;
}

/**
 * Writes one event to the generic andy_iottelemetryevent event log (name, device, type, value
 * plus a JSON payload; see azure/functions/game/README.md). The record is built by lib/telemetry.ts.
 */
export async function createTelemetryEvent(record: Record<string, unknown>): Promise<void> {
  await dataverseFetch("andy_iottelemetryevents", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

/** GUID-shaped strings only -- claim tokens and ids get interpolated into OData
 * $filter strings, so this is the injection guard for that. */
export function isGuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

export interface GameBoxState {
  id: string;
  deviceSlug: string | null;
  deviceName: string | null;
  gameModeEnabled: boolean;
}

// The andy_activedeviceprofile lookup's OData *navigation property* name is
// andy_ActiveDeviceProfile -- confirmed against this environment's real
// EntityDefinitions metadata, not just the (lowercase) attribute logical
// name. $expand, @odata.bind, and $ref operations all need this exact
// casing; only plain $select of the raw FK value would use the lowercase
// attribute name, which this file doesn't currently do.
const ACTIVE_DEVICE_PROFILE_NAV_PROPERTY = "andy_ActiveDeviceProfile";

/** Reads the andy_gameboxstate singleton row. Throws if the row hasn't been created yet. */
export async function getGameBoxState(): Promise<GameBoxState> {
  const response = await dataverseFetch(
    "andy_gameboxstates?$top=1&$select=andy_gameboxstateid,andy_gamemodeenabled" +
      `&$expand=${ACTIVE_DEVICE_PROFILE_NAV_PROPERTY}($select=andy_deviceslug,andy_name)`
  );
  const body = (await response.json()) as {
    value: Array<{
      andy_gameboxstateid: string;
      andy_gamemodeenabled: boolean | null;
      [ACTIVE_DEVICE_PROFILE_NAV_PROPERTY]?: { andy_deviceslug?: string; andy_name?: string } | null;
    }>;
  };
  const row = body.value[0];
  if (!row) {
    throw new Error("andy_gameboxstate has no rows -- create the single row before using this API");
  }
  const activeDevice = row[ACTIVE_DEVICE_PROFILE_NAV_PROPERTY];
  return {
    id: row.andy_gameboxstateid,
    deviceSlug: activeDevice?.andy_deviceslug ?? null,
    deviceName: activeDevice?.andy_name ?? null,
    // Treat a not-yet-backfilled null as enabled -- the column defaults to
    // true for new rows, and every existing row was explicitly backfilled to
    // true, but this keeps behavior safe if a row somehow predates both.
    gameModeEnabled: row.andy_gamemodeenabled !== false,
  };
}

export interface DeviceProfileSummary {
  id: string;
  name: string;
  deviceSlug: string;
  isEnabled: boolean;
  winText: string | null;
  winTextInNonGameMode: string | null;
}

async function queryDeviceProfiles(includeWinText: boolean, includeWinTextInNonGameMode: boolean): Promise<DeviceProfileSummary[]> {
  const select = "andy_deviceprofileid,andy_name,andy_deviceslug,statecode" +
    (includeWinText ? ",andy_wintext" : "") +
    (includeWinTextInNonGameMode ? ",andy_wintextinnongamemode" : "");
  const response = await dataverseFetch(`andy_deviceprofiles?$select=${select}&$orderby=andy_name`);
  const body = (await response.json()) as {
    value: Array<{
      andy_deviceprofileid: string;
      andy_name: string;
      andy_deviceslug: string;
      statecode: number;
      andy_wintext?: string | null;
      andy_wintextinnongamemode?: string | null;
    }>;
  };
  return body.value.map((row) => ({
    id: row.andy_deviceprofileid,
    name: row.andy_name,
    deviceSlug: row.andy_deviceslug,
    // Built-in Status: only Active (0) profiles are enabled.
    isEnabled: row.statecode === 0,
    winText: row.andy_wintext?.trim() || null,
    winTextInNonGameMode: row.andy_wintextinnongamemode?.trim() || null,
  }));
}

/** Lists all andy_deviceprofile rows, for the control app's device picker. */
export async function listDeviceProfiles(): Promise<DeviceProfileSummary[]> {
  try {
    return await queryDeviceProfiles(true, true);
  } catch (error) {
    if (error instanceof Error && error.message.includes("andy_wintextinnongamemode")) {
      return queryDeviceProfiles(true, false);
    }
    if (error instanceof Error && error.message.includes("andy_wintext")) {
      return queryDeviceProfiles(false, false);
    }
    throw error;
  }
}

/** Sets or clears andy_gameboxstate's active device lookup. Pass null to return to demo/info. */
export async function setActiveDeviceProfile(
  gameBoxStateId: string,
  deviceProfileId: string | null
): Promise<void> {
  if (deviceProfileId) {
    await dataverseFetch(`andy_gameboxstates(${gameBoxStateId})`, {
      method: "PATCH",
      body: JSON.stringify({
        [`${ACTIVE_DEVICE_PROFILE_NAV_PROPERTY}@odata.bind`]: `/andy_deviceprofiles(${deviceProfileId})`,
      }),
    });
  } else {
    // Clearing a single-valued lookup is a $ref DELETE, not a PATCH-to-null.
    await dataverseFetch(
      `andy_gameboxstates(${gameBoxStateId})/${ACTIVE_DEVICE_PROFILE_NAV_PROPERTY}/$ref`,
      { method: "DELETE" }
    );
  }
}

/** Activates/deactivates one device profile using built-in Status. Staff use this from Game Box Control to
 * hide a mode from manual selection and exclude it from pickRandomEnabledMode. */
export async function setDeviceProfileEnabled(deviceProfileId: string, isEnabled: boolean): Promise<void> {
  await dataverseFetch(`andy_deviceprofiles(${deviceProfileId})`, {
    method: "PATCH",
    // State/status pairs come from the exported Device Profile solution.
    body: JSON.stringify({ statecode: isEnabled ? 0 : 1, statuscode: isEnabled ? 1 : 2 }),
  });
}

/** Flips andy_gamemodeenabled on the andy_gameboxstate singleton. OFF makes the kiosk
 * show a simple success popup instead of the QR/phone-spin/claim flow on completion. */
export async function setGameModeEnabled(gameBoxStateId: string, gameModeEnabled: boolean): Promise<void> {
  await dataverseFetch(`andy_gameboxstates(${gameBoxStateId})`, {
    method: "PATCH",
    body: JSON.stringify({ andy_gamemodeenabled: gameModeEnabled }),
  });
}

/** Picks a random *enabled* device profile (excluding the currently-active one when
 * there's another enabled choice available), writes it as the new active device, and
 * returns its slug/name -- the same write the caller then broadcasts over SignalR via
 * the existing deviceChanged mechanism (see setActiveDeviceProfile / setMode.ts). Used
 * to auto-rotate the kiosk to a new mode after a device is completed, in both Game Mode
 * states. Looks up the currently-active device itself (rather than trusting a
 * caller-supplied id) since the exclusion is a nicety, not a security boundary, and the
 * server already has this state in andy_gameboxstate. Throws if there are no enabled
 * device profiles at all. */
export async function pickRandomEnabledMode(
  gameBoxStateId: string
): Promise<{ deviceProfileId: string; deviceSlug: string; deviceName: string }> {
  const [profiles, current] = await Promise.all([listDeviceProfiles(), getGameBoxState()]);
  const enabled = profiles.filter((p) => p.isEnabled);
  if (enabled.length === 0) {
    throw new Error("No enabled device profiles to pick from");
  }
  // Prefer a different device than the one currently active, but fall back to it if
  // it's the only enabled option -- better to re-select the same mode than throw.
  const candidates = enabled.filter((p) => p.deviceSlug !== current.deviceSlug);
  const pickFrom = candidates.length > 0 ? candidates : enabled;
  const chosen = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  await setActiveDeviceProfile(gameBoxStateId, chosen.id);
  return { deviceProfileId: chosen.id, deviceSlug: chosen.deviceSlug, deviceName: chosen.name };
}

// ============ Prize engine (PRIZE_ENGINE_SPEC.md) ============

// Prize claim status option values -- see tables/choices/andy_prizeclaim_*.json.
const PRIZE_CLAIM_STATUS_UNCLAIMED = 435700000;
const PRIZE_CLAIM_STATUS_CLAIMED = 435700001;

export class ClaimError extends Error {
  constructor(
    public code: "invalid_token" | "not_found" | "already_claimed" | "no_prizes_available",
    message: string
  ) {
    super(message);
  }
}

/**
 * Creates the shared Prize Claim parent plus the IoT Game Win detail row for a resolved
 * fault. The kiosk still receives only the bearer claim token it encodes into the QR.
 */
export async function createGameWin(
  deviceSlug: string,
  options: { contestSourceKey?: string } = {}
): Promise<{ claimToken: string }> {
  const deviceResponse = await dataverseFetch(
    `andy_deviceprofiles?$filter=andy_deviceslug eq '${escapeODataString(deviceSlug)}'` +
      "&$select=andy_deviceprofileid&$top=1"
  );
  const deviceBody = (await deviceResponse.json()) as {
    value: Array<{ andy_deviceprofileid: string }>;
  };
  const deviceProfileId = deviceBody.value[0]?.andy_deviceprofileid;
  if (!deviceProfileId) {
    throw new Error(`No andy_deviceprofile row found for slug "${deviceSlug}"`);
  }

  const claimToken = crypto.randomUUID();
  const now = new Date();
  const contestSourceKey = normalizeContestSourceKey(options.contestSourceKey);
  const [campaign, contestSource] = await Promise.all([
    fetchActiveContestCampaign(),
    fetchContestSourceByKey(contestSourceKey),
  ]);
  if (options.contestSourceKey && !contestSource) {
    throw new Error(`No active Contest Source row found for source key "${contestSourceKey}"`);
  }

  const prizeClaimResponse = await dataverseFetch(PRIZE_CLAIMS_SET, {
    method: "POST",
    body: JSON.stringify(
      buildPrizeClaimCreatePayload({
        claimToken,
        deviceSlug,
        campaignId: campaign?.id,
        contestSourceId: contestSource?.id,
        now,
      })
    ),
  });
  const prizeClaimId = parseDataverseIdFromEntityUrl(prizeClaimResponse.headers.get("OData-EntityId"));
  if (!prizeClaimId) {
    throw new Error("Dataverse did not return the created Prize Claim id");
  }

  await dataverseFetch(IOT_GAME_WINS_SET, {
    method: "POST",
    body: JSON.stringify(buildIotGameWinCreatePayload({ prizeClaimId, deviceProfileId, deviceSlug, now })),
  });
  return { claimToken };
}

// Entity set names -- confirmed against solutions/CopilotIoTGame/Entities/andy_Prizes/
// Entity.xml and .../andy_PrizeTypes/Entity.xml's <EntitySetName> after the Phase 5
// export. Both logical names already end in "s", so Dataverse's naive "+s"
// pluralization double-pluralizes them -- not a typo.
const PRIZE_TYPES_SET = "andy_prizetypeses";
const PRIZES_SET = "andy_prizeses";
const PRIZE_CLAIMS_SET = "andy_prizeclaims";
const IOT_GAME_WINS_SET = "andy_iotgamewins";
export const CONTEST_CAMPAIGNS_SET = "andy_contestcampaigns";
const CONTEST_SOURCES_SET = "andy_contestsources";
const CONTEST_SOURCE_CAPS_SET = "andy_contestsourcecaps";
export const GRAND_PRIZE_ENTRIES_SET = "andy_grandprizeentries";

// Navigation properties -- confirmed against the unpacked Dataverse relationship XML,
// not assumed from logical column names.
const PRIZE_CLAIM_PRIZEINSTANCE_NAV = "andy_Prize_Instance"; // on andy_prizeclaim, -> andy_Prizes
const PRIZE_CLAIM_CONTACT_NAV = "andy_Contact"; // on andy_prizeclaim, -> contact
const PRIZE_CLAIM_CAMPAIGN_NAV = "andy_Campaign"; // on andy_prizeclaim, -> andy_contestcampaign
const PRIZE_CLAIM_CONTEST_SOURCE_NAV = "andy_Contest_Source"; // on andy_prizeclaim, -> andy_contestsource
const IOT_GAME_WIN_PRIZE_CLAIM_NAV = "andy_prize_claim"; // on andy_iotgamewin, -> andy_prizeclaim
const IOT_GAME_WIN_DEVICE_PROFILE_NAV = "andy_device_profile"; // on andy_iotgamewin, -> andy_deviceprofile
const GRAND_PRIZE_ENTRY_CAMPAIGN_NAV = "andy_CampaignName"; // on andy_grandprizeentry, -> andy_contestcampaign
export const GRAND_PRIZE_ENTRY_CONTACT_NAV = "andy_Contact"; // on andy_grandprizeentry, -> contact
const GRAND_PRIZE_ENTRY_PRIZE_CLAIM_NAV = "andy_PrizeClaim"; // on andy_grandprizeentry, -> andy_prizeclaim
const GRAND_PRIZE_ENTRY_SOURCE_CAP_NAV = "andy_SourceIdentifier"; // on andy_grandprizeentry, -> andy_contestsourcecap
const GRAND_PRIZE_CHECK_IN_STATUS_NOT_CHECKED_IN = 100000000;
export const GRAND_PRIZE_CHECK_IN_STATUS_CHECKED_IN = 100000001;
const PRIZES_PRIZETYPE_NAV = "andy_PrizeType"; // on andy_Prizes, -> andy_PrizeTypes
const IOT_CONTEST_SOURCE_IDENTIFIER = "iot";

function normalizeContestSourceKey(sourceKey: string | undefined): string {
  const trimmed = sourceKey?.trim().toLowerCase();
  return trimmed || IOT_CONTEST_SOURCE_IDENTIFIER;
}

export function buildPrizeClaimCreatePayload(input: {
  claimToken: string;
  deviceSlug: string;
  campaignId?: string | null;
  contestSourceId?: string | null;
  now?: Date;
}): Record<string, string | number> {
  const timestamp = (input.now ?? new Date()).toISOString();
  return {
    andy_name: `IoT ${input.deviceSlug} ${timestamp}`,
    andy_claim_token: input.claimToken,
    andy_claim_status: PRIZE_CLAIM_STATUS_UNCLAIMED,
    andy_win_time: timestamp,
    ...(input.campaignId ? { [`${PRIZE_CLAIM_CAMPAIGN_NAV}@odata.bind`]: `/${CONTEST_CAMPAIGNS_SET}(${input.campaignId})` } : {}),
    ...(input.contestSourceId
      ? { [`${PRIZE_CLAIM_CONTEST_SOURCE_NAV}@odata.bind`]: `/${CONTEST_SOURCES_SET}(${input.contestSourceId})` }
      : {}),
  };
}

export function buildIotGameWinCreatePayload(input: {
  prizeClaimId: string;
  deviceProfileId: string;
  deviceSlug: string;
  now?: Date;
}): Record<string, string> {
  const timestamp = (input.now ?? new Date()).toISOString();
  return {
    andy_name: `IoT ${input.deviceSlug} ${timestamp}`,
    [`${IOT_GAME_WIN_PRIZE_CLAIM_NAV}@odata.bind`]: `/${PRIZE_CLAIMS_SET}(${input.prizeClaimId})`,
    [`${IOT_GAME_WIN_DEVICE_PROFILE_NAV}@odata.bind`]: `/andy_deviceprofiles(${input.deviceProfileId})`,
  };
}

/** Active prize types -- for the prize wheel SPA's wheel rendering (not the pick itself,
 * which stays server-side and only draws from stocked non-fallback types before fallback). */
export async function listActivePrizeTypes(): Promise<Array<{ name: string }>> {
  const response = await dataverseFetch(
    `${PRIZE_TYPES_SET}?$select=andy_prizetypename` +
      "&$filter=statecode eq 0" +
      "&$orderby=andy_prizetypename"
  );
  const body = (await response.json()) as { value: Array<{ andy_prizetypename: string }> };
  return body.value.map((row) => ({ name: row.andy_prizetypename }));
}

/** All active prize types including the fallback one, with ids -- for Game Box
 * Control's bulk-create picker, where staff need to target a specific type
 * (unlike the wheel, which only ever shows the non-fallback ones). */
export async function listAllPrizeTypes(): Promise<Array<{ id: string; name: string }>> {
  const response = await dataverseFetch(
    `${PRIZE_TYPES_SET}?$select=andy_prizetypesid,andy_prizetypename` +
      "&$filter=statecode eq 0" +
      "&$orderby=andy_prizetypename"
  );
  const body = (await response.json()) as {
    value: Array<{ andy_prizetypesid: string; andy_prizetypename: string }>;
  };
  return body.value.map((row) => ({ id: row.andy_prizetypesid, name: row.andy_prizetypename }));
}

/** Count of untaken andy_Prizes rows still available to be claimed -- for Game Box
 * Control's at-a-glance stock indicator. Uses $count=true with $top=1 rather than
 * fetching every row: Dataverse returns the total-matching-rows count in the
 * "@odata.count" annotation regardless of how many rows are actually returned, so
 * this stays cheap even once the prize pool grows into the hundreds. */
export async function countAvailablePrizes(): Promise<number> {
  const response = await dataverseFetch(
    `${PRIZES_SET}?$select=andy_prizesid&$filter=andy_prizetaken eq false&$count=true&$top=1`
  );
  const body = (await response.json()) as { "@odata.count"?: number };
  return body["@odata.count"] ?? 0;
}

/** Count of every andy_Prizes row regardless of taken status -- the total size of
 * the prize pool ever created, shown alongside countAvailablePrizes() on the Prize
 * Management screen so staff can see both "still up for grabs" and "created total"
 * at a glance. Same cheap $count=true/$top=1 pattern, no filter. */
export async function countAllPrizes(): Promise<number> {
  const response = await dataverseFetch(`${PRIZES_SET}?$select=andy_prizesid&$count=true&$top=1`);
  const body = (await response.json()) as { "@odata.count"?: number };
  return body["@odata.count"] ?? 0;
}

async function countPrizesForType(typeId: string, availableOnly: boolean): Promise<number> {
  const filters = [`_andy_prizetype_value eq ${typeId}`];
  if (availableOnly) filters.push("andy_prizetaken eq false");
  const response = await dataverseFetch(
    `${PRIZES_SET}?$select=andy_prizesid&$filter=${filters.join(" and ")}&$count=true&$top=1`
  );
  const body = (await response.json()) as { "@odata.count"?: number };
  return body["@odata.count"] ?? 0;
}

/** Per-prize-type inventory counts for Game Box Control. Includes active prize types
 * with zero rows so staff can distinguish "not stocked yet" from "missing type". */
export async function countPrizesByType(): Promise<
  Array<{ typeId: string; typeName: string; total: number; available: number }>
> {
  const prizeTypes = await listAllPrizeTypes();
  return Promise.all(
    prizeTypes.map(async (type) => {
      const [total, available] = await Promise.all([
        countPrizesForType(type.id, false),
        countPrizesForType(type.id, true),
      ]);
      return { typeId: type.id, typeName: type.name, total, available };
    })
  );
}

/** Creates `quantity` andy_Prizes instance rows bound to one andy_PrizeTypes row, for
 * Game Box Control's bulk-create action (mirrors the Bulk Add Prizes genpage's
 * per-row naming/info note, power apps/bulk-add-prizes/bulk-add-prizes.tsx). */
export async function createPrizeInstances(
  prizeTypeId: string,
  quantity: number,
  namePrefix: string
): Promise<Array<{ id: string; name: string }>> {
  const createdAt = new Date().toLocaleString();
  const infoNote = `Bulk added on ${createdAt} via Game Box Control`;
  const created: Array<{ id: string; name: string }> = [];
  for (let i = 1; i <= quantity; i++) {
    const prizeName = quantity > 1 ? `${namePrefix} #${i}` : namePrefix;
    const response = await dataverseFetch(PRIZES_SET, {
      method: "POST",
      body: JSON.stringify({
        andy_prizename: prizeName,
        andy_prizeinfo: infoNote,
        andy_prizetaken: false,
        [`${PRIZES_PRIZETYPE_NAV}@odata.bind`]: `/${PRIZE_TYPES_SET}(${prizeTypeId})`,
      }),
    });
    const entityId = response.headers.get("OData-EntityId");
    const match = entityId?.match(/\(([0-9a-f-]{36})\)/i);
    created.push({ id: match?.[1] ?? "", name: prizeName });
  }
  return created;
}

interface EligiblePrizeType {
  id: string;
  name: string;
  /** andy_rarity, used directly as the weighted-pick weight per project decision
   * (higher rarity number = more likely) -- the PRIZE_CODE_MIGRATION.md draft assumed
   * a column named andy_weight, but the live schema only has andy_rarity; there is no
   * andy_weight column. */
  weight: number;
}

async function fetchEligiblePrizeTypes(): Promise<EligiblePrizeType[]> {
  const response = await dataverseFetch(
    `${PRIZE_TYPES_SET}?$select=andy_prizetypesid,andy_prizetypename,andy_rarity` +
      "&$filter=statecode eq 0 and andy_isfallback eq false"
  );
  const body = (await response.json()) as {
    value: Array<{ andy_prizetypesid: string; andy_prizetypename: string; andy_rarity: number }>;
  };
  return body.value.map((row) => ({
    id: row.andy_prizetypesid,
    name: row.andy_prizetypename,
    weight: row.andy_rarity,
  }));
}

async function fetchFallbackPrizeType(): Promise<{ id: string; name: string } | null> {
  const response = await dataverseFetch(
    `${PRIZE_TYPES_SET}?$select=andy_prizetypesid,andy_prizetypename` +
      "&$filter=andy_isfallback eq true and statecode eq 0&$top=1"
  );
  const body = (await response.json()) as {
    value: Array<{ andy_prizetypesid: string; andy_prizetypename: string }>;
  };
  const row = body.value[0];
  return row ? { id: row.andy_prizetypesid, name: row.andy_prizetypename } : null;
}

interface UntakenInstance {
  id: string;
  etag: string;
  typeId: string;
}

/** Untaken instance rows for the given eligible type ids, fetched in one call and
 * grouped client-side by type. Uses an OR-chain over `_andy_prizetype_value eq <guid>`
 * rather than the OData `in` operator -- this environment's Dataverse rejects `in` on
 * a lookup FK value with "The query node In is not supported" (confirmed live), so
 * `in` is not an option here even though it's valid OData v4. At the scale here (a few
 * dozen types, a few hundred instances at most) this is simpler and safer than
 * trusting a cross-table aggregate anyway. */
async function fetchUntakenInstances(typeIds: string[]): Promise<UntakenInstance[]> {
  if (typeIds.length === 0) return [];
  const typeFilter = typeIds.map((id) => `_andy_prizetype_value eq ${id}`).join(" or ");
  const response = await dataverseFetch(
    `${PRIZES_SET}?$select=andy_prizesid,_andy_prizetype_value` +
      `&$filter=andy_prizetaken eq false and (${typeFilter})`
  );
  const body = (await response.json()) as {
    value: Array<{ andy_prizesid: string; _andy_prizetype_value: string; "@odata.etag": string }>;
  };
  return body.value.map((row) => ({
    id: row.andy_prizesid,
    etag: row["@odata.etag"],
    typeId: row._andy_prizetype_value,
  }));
}

function pickWeightedType(types: EligiblePrizeType[]): EligiblePrizeType {
  const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
  const r = Math.random() * totalWeight;
  let running = 0;
  for (const t of types) {
    running += t.weight;
    if (r <= running) return t;
  }
  return types[types.length - 1];
}

/** Conditional claim of one specific instance row -- false means it changed since it
 * was read (someone else just claimed it), which the caller retries from selection,
 * not just this claim, since the eligible/stock set may have changed. */
async function tryClaimInstance(instance: UntakenInstance): Promise<boolean> {
  const response = await dataverseFetchRaw(`${PRIZES_SET}(${instance.id})`, {
    method: "PATCH",
    headers: { "If-Match": instance.etag },
    body: JSON.stringify({
      andy_prizetaken: true,
    }),
  });
  if (response.status === 412) return false;
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Dataverse PATCH ${PRIZES_SET}(${instance.id}) failed: ${response.status} ${body}`);
  }
  return true;
}

const MAX_CLAIM_RETRIES = 5;

interface SelectedPrize {
  typeId: string;
  typeName: string;
  /** null for a fallback claim -- the fallback type isn't instance-tracked, so there's
   * no prize instance to bind to the Prize Claim. */
  instanceId: string | null;
}

/** Weighted-picks a *type* from eligible types that currently have untaken instance
 * stock (falling back to the designated andy_isfallback type, which isn't
 * instance-tracked, if none do), then atomically claims one specific instance row of
 * the chosen type. Retries the whole selection on a losing race. */
async function selectAndClaimPrize(): Promise<SelectedPrize> {
  for (let attempt = 0; attempt < MAX_CLAIM_RETRIES; attempt++) {
    const eligibleTypes = await fetchEligiblePrizeTypes();
    const instances = await fetchUntakenInstances(eligibleTypes.map((t) => t.id));

    const instancesByType = new Map<string, UntakenInstance[]>();
    for (const instance of instances) {
      const list = instancesByType.get(instance.typeId);
      if (list) list.push(instance);
      else instancesByType.set(instance.typeId, [instance]);
    }
    const typesWithStock = eligibleTypes.filter((t) => (instancesByType.get(t.id)?.length ?? 0) > 0);

    if (typesWithStock.length === 0) {
      const fallback = await fetchFallbackPrizeType();
      if (!fallback) {
        throw new ClaimError(
          "no_prizes_available",
          "No eligible prize types have stock and no andy_isfallback type is configured"
        );
      }
      // Fallback isn't instance-tracked -- nothing to claim atomically, no retry loop.
      return { typeId: fallback.id, typeName: fallback.name, instanceId: null };
    }

    const chosenType = pickWeightedType(typesWithStock);
    const candidates = instancesByType.get(chosenType.id) ?? [];
    const chosenInstance = candidates[Math.floor(Math.random() * candidates.length)];
    if (await tryClaimInstance(chosenInstance)) {
      return { typeId: chosenType.id, typeName: chosenType.name, instanceId: chosenInstance.id };
    }
    // 412 -- someone else claimed that exact instance between read and write. Retry
    // from selection (not just the claim), since the eligible/stock set itself may
    // have changed.
  }
  throw new ClaimError(
    "no_prizes_available",
    `Failed to claim a prize after ${MAX_CLAIM_RETRIES} attempts (persistent contention)`
  );
}

interface ContestantInfo {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  sharedInfo: boolean;
}

export function normalizeContestantEmail(email: string | undefined): string | null {
  const trimmed = email?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function normalizeContestantName(name: string | undefined): string | null {
  const trimmed = name?.trim();
  return trimmed || null;
}

function contestantFullName(contestant: ContestantInfo): string | null {
  const firstName = normalizeContestantName(contestant.firstName);
  const lastName = normalizeContestantName(contestant.lastName);
  const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return combinedName || normalizeContestantName(contestant.name);
}

export function buildContactCreatePayload(contestant: ContestantInfo): Record<string, string> | null {
  if (!contestant.sharedInfo) return null;

  const email = normalizeContestantEmail(contestant.email);
  if (!email) return null;

  const firstName = normalizeContestantName(contestant.firstName);
  const lastName = normalizeContestantName(contestant.lastName);
  const name = contestantFullName(contestant);
  return {
    emailaddress1: email,
    ...(firstName ? { firstname: firstName } : {}),
    ...(lastName ? { lastname: lastName } : {}),
    ...(name ? { fullname: name } : {}),
  };
}

export function parseDataverseIdFromEntityUrl(entityUrl: string | null): string | null {
  return entityUrl?.match(/\(([0-9a-f-]{36})\)$/i)?.[1] ?? null;
}

interface ActiveContestCampaign {
  id: string;
  eventName: string | null;
  drawingTime: string | null;
  checkInLocation: string | null;
  preferenceUrl: string | null;
  reminderLeadMinutes: number | null;
  maxEntriesPerContact: number | null;
  checkInCodePrefix: string | null;
}

interface ContestSource {
  id: string;
  sourceKey: string;
}

export interface GrandPrizeDrawingSlice {
  contactId: string;
  displayName: string;
  entryCount: number;
  color: string;
  code?: string;
}

export interface GrandPrizeDrawingLineup {
  campaign: {
    id: string;
    name: string;
    drawingTime: string | null;
  };
  registeredContactCount: number;
  checkedInContactCount: number;
  checkedInEntryCount: number;
  slices: GrandPrizeDrawingSlice[];
}

export interface GrandPrizeDrawResult {
  drawResultId: string;
  campaignId: string;
  campaignName: string;
  winnerContactId: string;
  winnerName: string;
  winnerCode?: string;
  entryCode?: string;
  registrationCode?: string;
  checkInCode?: string;
  winningEntryCount: number;
  eligibleContactCount: number;
  eligibleEntryCount: number;
}

export interface GrandPrizeDrawingState {
  result: GrandPrizeDrawResult | null;
}

export interface GrandPrizeCheckInResult {
  status: "checked_in" | "already_checked_in" | "invalid" | "invalidated";
  message?: string;
  participantName?: string;
  participantCode?: string;
  checkedInEntryCount?: number;
  totalEntryCount?: number;
  checkedInAt?: string;
  campaignName?: string;
}

interface GrandPrizeEntryForDrawing {
  andy_grandprizeentryid: string;
  andy_participantname?: string | null;
  andy_checkincode?: string | null;
  _andy_contact_value?: string | null;
}

interface GrandPrizeEntryForCheckIn {
  andy_grandprizeentryid: string;
  andy_participantname?: string | null;
  andy_checkincode?: string | null;
  andy_checkinstatus?: number | null;
}

const GRAND_PRIZE_DRAWING_COLORS = ["#1f8a70", "#f2a541", "#3f6fb5", "#c4515c", "#7b61a8", "#2f9ca0", "#d96b3b", "#5c83c6"];
let latestGrandPrizeDraw: { campaignId: string; result: GrandPrizeDrawResult } | null = null;

export function buildGrandPrizeDrawingSlices(entries: GrandPrizeEntryForDrawing[]): GrandPrizeDrawingSlice[] {
  const byContact = new Map<string, GrandPrizeDrawingSlice>();
  for (const entry of entries) {
    const contactId = entry._andy_contact_value ?? entry.andy_grandprizeentryid;
    const existing = byContact.get(contactId);
    if (existing) {
      existing.entryCount += 1;
      if (!existing.code && entry.andy_checkincode?.trim()) existing.code = entry.andy_checkincode.trim();
      continue;
    }

    byContact.set(contactId, {
      contactId,
      displayName: entry.andy_participantname?.trim() || "Grand Prize Guest",
      entryCount: 1,
      color: GRAND_PRIZE_DRAWING_COLORS[byContact.size % GRAND_PRIZE_DRAWING_COLORS.length],
      ...(entry.andy_checkincode?.trim() ? { code: entry.andy_checkincode.trim() } : {}),
    });
  }

  return Array.from(byContact.values());
}

export function selectGrandPrizeWinningSlice(slices: GrandPrizeDrawingSlice[], winningEntryIndex: number): GrandPrizeDrawingSlice | null {
  const total = totalEntriesForDrawing(slices);
  if (total <= 0 || winningEntryIndex < 0 || winningEntryIndex >= total) return null;

  let cursor = 0;
  for (const slice of slices) {
    cursor += Math.max(0, slice.entryCount);
    if (winningEntryIndex < cursor) return slice;
  }

  return null;
}

function totalEntriesForDrawing(slices: GrandPrizeDrawingSlice[]): number {
  return slices.reduce((total, slice) => total + Math.max(0, slice.entryCount), 0);
}

async function fetchActiveContestCampaign(): Promise<ActiveContestCampaign | null> {
  const response = await dataverseFetch(
    `${CONTEST_CAMPAIGNS_SET}?$select=andy_contestcampaignid,andy_eventname,andy_drawingtime,andy_check_in_location,andy_preference_url,andy_reminder_lead_minutes,andy_maxentriespercontact,andy_checkincodeprefix&$filter=statecode eq 0&$orderby=createdon desc&$top=1`
  );
  const body = (await response.json()) as {
    value: Array<{
      andy_contestcampaignid: string;
      andy_eventname?: string | null;
      andy_drawingtime?: string | null;
      andy_check_in_location?: string | null;
      andy_preference_url?: string | null;
      andy_reminder_lead_minutes?: number | null;
      andy_maxentriespercontact?: number | null;
      andy_checkincodeprefix?: string | null;
    }>;
  };
  const campaign = body.value[0];
  return campaign
    ? {
        id: campaign.andy_contestcampaignid,
        eventName: campaign.andy_eventname ?? null,
        drawingTime: campaign.andy_drawingtime ?? null,
        checkInLocation: campaign.andy_check_in_location ?? null,
        preferenceUrl: campaign.andy_preference_url ?? null,
        reminderLeadMinutes: campaign.andy_reminder_lead_minutes ?? null,
        maxEntriesPerContact: campaign.andy_maxentriespercontact ?? null,
        checkInCodePrefix: campaign.andy_checkincodeprefix ?? null,
      }
    : null;
}

export async function listGrandPrizeDrawingLineup(): Promise<GrandPrizeDrawingLineup | null> {
  const campaign = await fetchActiveContestCampaign();
  if (!campaign) return null;

  const registeredResponse = await dataverseFetch(
    `${GRAND_PRIZE_ENTRIES_SET}?$select=andy_grandprizeentryid,_andy_contact_value` +
      `&$filter=statecode eq 0 and _andy_campaignname_value eq ${campaign.id}&$top=5000`
  );
  const registeredBody = (await registeredResponse.json()) as {
    value: Array<{ andy_grandprizeentryid: string; _andy_contact_value?: string | null }>;
  };

  const checkedInResponse = await dataverseFetch(
    `${GRAND_PRIZE_ENTRIES_SET}?$select=andy_grandprizeentryid,andy_participantname,andy_checkincode,_andy_contact_value` +
      `&$filter=statecode eq 0 and _andy_campaignname_value eq ${campaign.id}` +
      ` and andy_checkinstatus eq ${GRAND_PRIZE_CHECK_IN_STATUS_CHECKED_IN}&$top=5000`
  );
  const checkedInBody = (await checkedInResponse.json()) as { value: GrandPrizeEntryForDrawing[] };
  const registeredContacts = new Set(
    registeredBody.value.map((entry) => entry._andy_contact_value ?? entry.andy_grandprizeentryid)
  );
  const slices = buildGrandPrizeDrawingSlices(checkedInBody.value);

  return {
    campaign: {
      id: campaign.id,
      name: campaign.eventName ?? "Grand Prize Drawing",
      drawingTime: campaign.drawingTime,
    },
    registeredContactCount: registeredContacts.size,
    checkedInContactCount: slices.length,
    checkedInEntryCount: checkedInBody.value.length,
    slices,
  };
}

export async function getGrandPrizeDrawingState(): Promise<GrandPrizeDrawingState> {
  const campaign = await fetchActiveContestCampaign();
  if (!campaign || latestGrandPrizeDraw?.campaignId !== campaign.id) return { result: null };

  return { result: latestGrandPrizeDraw.result };
}

export async function runGrandPrizeDraw(): Promise<GrandPrizeDrawResult> {
  const lineup = await listGrandPrizeDrawingLineup();
  if (!lineup) throw new Error("no_active_campaign");

  if (latestGrandPrizeDraw?.campaignId === lineup.campaign.id) {
    return latestGrandPrizeDraw.result;
  }

  const eligibleEntryCount = totalEntriesForDrawing(lineup.slices);
  if (lineup.slices.length === 0 || eligibleEntryCount <= 0) {
    throw new Error("no_checked_in_entries");
  }

  const winner = selectGrandPrizeWinningSlice(lineup.slices, randomInt(eligibleEntryCount));
  if (!winner) throw new Error("winner_selection_failed");

  const result: GrandPrizeDrawResult = {
    drawResultId: crypto.randomUUID(),
    campaignId: lineup.campaign.id,
    campaignName: lineup.campaign.name,
    winnerContactId: winner.contactId,
    winnerName: winner.displayName,
    ...(winner.code ? { winnerCode: winner.code, checkInCode: winner.code } : {}),
    winningEntryCount: winner.entryCount,
    eligibleContactCount: lineup.checkedInContactCount,
    eligibleEntryCount,
  };

  latestGrandPrizeDraw = { campaignId: lineup.campaign.id, result };
  return result;
}

export async function checkInGrandPrizeEntry(checkInCode: string): Promise<GrandPrizeCheckInResult> {
  const normalizedCode = checkInCode.trim().replace(/\s+/g, "").toUpperCase();
  if (!normalizedCode) return { status: "invalid", message: "checkInCode is required" };

  const campaign = await fetchActiveContestCampaign();
  if (!campaign) return { status: "invalid", message: "No active grand-prize campaign was found" };

  const response = await dataverseFetch(
    `${GRAND_PRIZE_ENTRIES_SET}?$select=andy_grandprizeentryid,andy_participantname,andy_checkincode,andy_checkinstatus` +
      `&$filter=statecode eq 0 and _andy_campaignname_value eq ${campaign.id}` +
      ` and andy_checkincode eq '${escapeODataString(normalizedCode)}'&$top=5000`
  );
  const body = (await response.json()) as { value: GrandPrizeEntryForCheckIn[] };
  if (body.value.length === 0) {
    return { status: "invalid", participantCode: normalizedCode, campaignName: campaign.eventName ?? "Grand Prize Drawing" };
  }

  if (body.value.every((entry) => entry.andy_checkinstatus === 100000002)) {
    return {
      status: "invalidated",
      participantName: body.value[0]?.andy_participantname ?? undefined,
      participantCode: normalizedCode,
      totalEntryCount: body.value.length,
      checkedInEntryCount: 0,
      campaignName: campaign.eventName ?? "Grand Prize Drawing",
    };
  }

  const now = new Date().toISOString();
  const entriesToCheckIn = body.value.filter(
    (entry) => entry.andy_checkinstatus !== GRAND_PRIZE_CHECK_IN_STATUS_CHECKED_IN && entry.andy_checkinstatus !== 100000002
  );
  for (const entry of entriesToCheckIn) {
    await dataverseFetch(`${GRAND_PRIZE_ENTRIES_SET}(${entry.andy_grandprizeentryid})`, {
      method: "PATCH",
      body: JSON.stringify({
        andy_checkinstatus: GRAND_PRIZE_CHECK_IN_STATUS_CHECKED_IN,
        andy_checkintime: now,
      }),
    });
  }

  const checkedInEntryCount = body.value.length - body.value.filter((entry) => entry.andy_checkinstatus === 100000002).length;
  return {
    status: entriesToCheckIn.length > 0 ? "checked_in" : "already_checked_in",
    participantName: body.value[0]?.andy_participantname ?? undefined,
    participantCode: normalizedCode,
    checkedInEntryCount,
    totalEntryCount: body.value.length,
    checkedInAt: now,
    campaignName: campaign.eventName ?? "Grand Prize Drawing",
  };
}

async function fetchContestCampaignById(campaignId: string): Promise<ActiveContestCampaign | null> {
  const response = await dataverseFetch(
    `${CONTEST_CAMPAIGNS_SET}(${campaignId})?$select=andy_contestcampaignid,andy_eventname,andy_drawingtime,andy_check_in_location,andy_preference_url,andy_reminder_lead_minutes,andy_maxentriespercontact,andy_checkincodeprefix`
  );
  if (response.status === 404) return null;
  const campaign = (await response.json()) as {
    andy_contestcampaignid: string;
    andy_eventname?: string | null;
    andy_drawingtime?: string | null;
    andy_check_in_location?: string | null;
    andy_preference_url?: string | null;
    andy_reminder_lead_minutes?: number | null;
    andy_maxentriespercontact?: number | null;
    andy_checkincodeprefix?: string | null;
  };
  return {
    id: campaign.andy_contestcampaignid,
    eventName: campaign.andy_eventname ?? null,
    drawingTime: campaign.andy_drawingtime ?? null,
    checkInLocation: campaign.andy_check_in_location ?? null,
    preferenceUrl: campaign.andy_preference_url ?? null,
    reminderLeadMinutes: campaign.andy_reminder_lead_minutes ?? null,
    maxEntriesPerContact: campaign.andy_maxentriespercontact ?? null,
    checkInCodePrefix: campaign.andy_checkincodeprefix ?? null,
  };
}

async function fetchContestSourceByKey(sourceKey: string): Promise<ContestSource | null> {
  const response = await dataverseFetch(
    `${CONTEST_SOURCES_SET}?$select=andy_contestsourceid,andy_sourcekey` +
      `&$filter=statecode eq 0 and andy_sourcekey eq '${escapeODataString(sourceKey)}'&$top=1`
  );
  const body = (await response.json()) as {
    value: Array<{ andy_contestsourceid: string; andy_sourcekey: string }>;
  };
  const source = body.value[0];
  return source ? { id: source.andy_contestsourceid, sourceKey: source.andy_sourcekey } : null;
}

async function fetchContestSourceCap(campaignId: string, contestSourceId: string | null): Promise<string | null> {
  if (!contestSourceId) return null;

  const response = await dataverseFetch(
    `${CONTEST_SOURCE_CAPS_SET}?$select=andy_contestsourcecapid` +
      `&$filter=statecode eq 0 and _andy_campaignname_value eq ${campaignId}` +
      ` and _andy_source_value eq ${contestSourceId}&$top=1`
  );
  const body = (await response.json()) as { value: Array<{ andy_contestsourcecapid: string }> };
  return body.value[0]?.andy_contestsourcecapid ?? null;
}

async function fetchGrandPrizeEntriesForContact(
  campaignId: string,
  contactId: string,
  top: number
): Promise<{ count: number; checkInCode: string | null }> {
  const response = await dataverseFetch(
    `${GRAND_PRIZE_ENTRIES_SET}?$select=andy_grandprizeentryid,andy_checkincode` +
      `&$filter=statecode eq 0 and _andy_campaignname_value eq ${campaignId} and _andy_contact_value eq ${contactId}` +
      `&$top=${top}`
  );
  const body = (await response.json()) as { value: Array<{ andy_grandprizeentryid: string; andy_checkincode?: string | null }> };
  return {
    count: body.value.length,
    checkInCode: body.value.find((entry) => entry.andy_checkincode?.trim())?.andy_checkincode?.trim() ?? null,
  };
}

export function buildGrandPrizeEntryPayload(input: {
  campaignId: string;
  contactId: string;
  prizeClaimId?: string | null;
  contestant: ContestantInfo;
  sourceCapId?: string | null;
  checkInCode?: string | null;
  now?: Date;
}): Record<string, string | number> {
  const email = normalizeContestantEmail(input.contestant.email);
  const name = contestantFullName(input.contestant) ?? email ?? "Grand Prize Entry";
  const timestamp = (input.now ?? new Date()).toISOString();

  return {
    andy_participantname: name,
    andy_entrytimestamp: timestamp,
    andy_privacyacceptancetime: timestamp,
    andy_checkinstatus: GRAND_PRIZE_CHECK_IN_STATUS_NOT_CHECKED_IN,
    ...(input.checkInCode ? { andy_checkincode: input.checkInCode } : {}),
    [`${GRAND_PRIZE_ENTRY_CAMPAIGN_NAV}@odata.bind`]: `/${CONTEST_CAMPAIGNS_SET}(${input.campaignId})`,
    [`${GRAND_PRIZE_ENTRY_CONTACT_NAV}@odata.bind`]: `/contacts(${input.contactId})`,
    ...(input.prizeClaimId ? { [`${GRAND_PRIZE_ENTRY_PRIZE_CLAIM_NAV}@odata.bind`]: `/${PRIZE_CLAIMS_SET}(${input.prizeClaimId})` } : {}),
    ...(input.sourceCapId
      ? { [`${GRAND_PRIZE_ENTRY_SOURCE_CAP_NAV}@odata.bind`]: `/${CONTEST_SOURCE_CAPS_SET}(${input.sourceCapId})` }
      : {}),
  };
}

function generateCheckInCode(prefix: string | null): string {
  const normalizedPrefix = (prefix ?? "GP").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 10) || "GP";
  return `${normalizedPrefix}-${randomInt(0, 1_000_000).toString().padStart(6, "0")}`;
}

async function checkInCodeExists(campaignId: string, checkInCode: string): Promise<boolean> {
  const response = await dataverseFetch(
    `${GRAND_PRIZE_ENTRIES_SET}?$select=andy_grandprizeentryid` +
      `&$filter=statecode eq 0 and _andy_campaignname_value eq ${campaignId}` +
      ` and andy_checkincode eq '${escapeODataString(checkInCode)}'&$top=1`
  );
  const body = (await response.json()) as { value: Array<{ andy_grandprizeentryid: string }> };
  return body.value.length > 0;
}

async function generateUniqueCheckInCode(campaignId: string, prefix: string | null): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const checkInCode = generateCheckInCode(prefix);
    if (!(await checkInCodeExists(campaignId, checkInCode))) return checkInCode;
  }
  throw new Error("Unable to generate a unique grand-prize check-in code");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstName(contestant: ContestantInfo): string {
  return normalizeContestantName(contestant.firstName) ?? contestantFullName(contestant)?.split(/\s+/)[0] ?? "there";
}

async function createCheckInQrDataUrl(checkInCode: string): Promise<string> {
  return QRCode.toDataURL(checkInCode, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 220,
    color: {
      dark: "#2a3380",
      light: "#ffffff",
    },
  });
}

function formatDrawingTime(drawingTime: string | null): string {
  return drawingTime ? new Date(drawingTime).toLocaleString("en-US", { timeZone: "America/New_York" }) : "the announced final drawing time";
}

function campaignCheckInLocation(campaign: ActiveContestCampaign): string {
  return campaign.checkInLocation?.trim() || "the booth";
}

/** Per-contact preference link: the campaign URL plus a signed token. Empty when either is unavailable. */
function campaignPreferenceUrl(campaign: ActiveContestCampaign, contactId: string): string {
  const base = campaign.preferenceUrl?.trim() ?? "";
  if (!base) return "";
  try {
    return buildPreferenceLink(base, signPreferenceToken({ contactId, purpose: "manage" }));
  } catch (error) {
    console.error("Preference link unavailable; sending the email without it", error);
    return "";
  }
}

function campaignReminderLeadMinutes(campaign: ActiveContestCampaign): number {
  return typeof campaign.reminderLeadMinutes === "number" && Number.isFinite(campaign.reminderLeadMinutes)
    ? campaign.reminderLeadMinutes
    : 30;
}

async function buildBrandedGrandPrizeCheckInEmail(input: {
  contactId: string;
  contestant: ContestantInfo;
  campaign: ActiveContestCampaign;
  checkInCode: string;
}): Promise<{ subject: string; html: string }> {
  const eventName = input.campaign.eventName ?? "Copilot IoT Game Grand Prize Drawing";
  const drawingTime = formatDrawingTime(input.campaign.drawingTime);
  const checkInLocation = campaignCheckInLocation(input.campaign);
  const preferenceUrl = campaignPreferenceUrl(input.campaign, input.contactId);
  const checkInQrDataUrl = await createCheckInQrDataUrl(input.checkInCode);
  const preferenceLine = preferenceUrl
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#53657a;">If you no longer want to participate or receive event messages, update your preferences here: <a href="${escapeHtml(preferenceUrl)}">${escapeHtml(preferenceUrl)}</a>.</p>`
    : "";

  return {
    subject: `Your grand-prize check-in code: ${input.checkInCode}`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f4f7fb;color:#172033;font-family:Segoe UI,Arial,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#ffffff;border:1px solid #d8e0ea;border-radius:10px;overflow:hidden;"><tr><td style="background:#2a3380;color:#ffffff;padding:24px 28px;border-bottom:4px solid #f59e0b;"><p style="margin:0 0 8px;font-size:28px;line-height:1;font-weight:800;letter-spacing:0;color:#ffffff;">andworx</p><p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#f8d36b;">Copilot IoT Game</p><h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800;">Your check-in code is ready</h1></td></tr><tr><td style="padding:28px;"><p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(firstName(input.contestant))},</p><p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Thanks for playing. You are entered for the ${escapeHtml(eventName)} grand-prize drawing.</p><p style="margin:0 0 18px;font-size:16px;line-height:1.6;"><strong>You must be present in person to win.</strong> Bring this QR code or the text code to staff check-in at ${escapeHtml(checkInLocation)} before the drawing begins.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border:1px solid #b7d8ff;border-radius:10px;background:#eef6ff;"><tr><td style="padding:22px;text-align:center;"><p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#2a3380;">Check-in code</p><p style="margin:0 0 18px;font-size:34px;line-height:1.15;font-weight:800;letter-spacing:.08em;color:#172033;">${escapeHtml(input.checkInCode)}</p><img src="${checkInQrDataUrl}" width="220" height="220" alt="QR code for ${escapeHtml(input.checkInCode)}" style="display:block;margin:0 auto 12px;border:10px solid #ffffff;border-radius:8px;background:#ffffff;"><p style="margin:0;font-size:13px;line-height:1.5;color:#52657a;">Staff can scan this QR in the Game Box Control check-in screen.</p></td></tr></table><p style="margin:0 0 8px;font-size:16px;line-height:1.6;"><strong>Drawing time:</strong> ${escapeHtml(drawingTime)}</p><p style="margin:0 0 18px;font-size:16px;line-height:1.6;"><strong>Check-in location:</strong> ${escapeHtml(checkInLocation)}</p>${preferenceLine}<p style="margin:0;font-size:16px;line-height:1.6;">Good luck,<br>Andworx Copilot IoT Game Team</p></td></tr></table></td></tr></table></body></html>`,
  };
}

async function buildBrandedGrandPrizeReminderEmail(input: {
  contestant: ContestantInfo;
  campaign: ActiveContestCampaign;
  checkInCode: string;
}): Promise<{ subject: string; html: string; delayedSendTime?: string }> {
  const eventName = input.campaign.eventName ?? "Copilot IoT Game Grand Prize Drawing";
  const drawingTime = formatDrawingTime(input.campaign.drawingTime);
  const drawingDate = input.campaign.drawingTime ? new Date(input.campaign.drawingTime) : null;
  const reminderLead = campaignReminderLeadMinutes(input.campaign);
  const checkInLocation = campaignCheckInLocation(input.campaign);
  const delayedSendTime = drawingDate ? new Date(drawingDate.getTime() - reminderLead * 60_000).toISOString() : undefined;
  const checkInQrDataUrl = await createCheckInQrDataUrl(input.checkInCode);

  return {
    subject: `Reminder: ${eventName} drawing at ${drawingTime}`,
    delayedSendTime,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f4f7fb;color:#172033;font-family:Segoe UI,Arial,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#ffffff;border:1px solid #d8e0ea;border-radius:10px;overflow:hidden;"><tr><td style="background:#2a3380;color:#ffffff;padding:24px 28px;border-bottom:4px solid #f59e0b;"><p style="margin:0 0 8px;font-size:28px;line-height:1;font-weight:800;letter-spacing:0;color:#ffffff;">andworx</p><p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#f8d36b;">Copilot IoT Game</p><h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800;">Please come to the booth</h1></td></tr><tr><td style="padding:28px;"><p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(firstName(input.contestant))},</p><p style="margin:0 0 16px;font-size:16px;line-height:1.6;">The ${escapeHtml(eventName)} drawing is coming up at ${escapeHtml(drawingTime)}.</p><p style="margin:0 0 18px;font-size:16px;line-height:1.6;"><strong>You must be present in person to win.</strong> Bring this QR code or the text code to staff check-in at ${escapeHtml(checkInLocation)} before the drawing begins.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border:1px solid #b7d8ff;border-radius:10px;background:#eef6ff;"><tr><td style="padding:22px;text-align:center;"><p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#2a3380;">Check-in code</p><p style="margin:0 0 18px;font-size:34px;line-height:1.15;font-weight:800;letter-spacing:.08em;color:#172033;">${escapeHtml(input.checkInCode)}</p><img src="${checkInQrDataUrl}" width="220" height="220" alt="QR code for ${escapeHtml(input.checkInCode)}" style="display:block;margin:0 auto 12px;border:10px solid #ffffff;border-radius:8px;background:#ffffff;"><p style="margin:0;font-size:13px;line-height:1.5;color:#52657a;">Staff can scan this QR in the Game Box Control check-in screen.</p></td></tr></table><p style="margin:0;font-size:16px;line-height:1.6;">Good luck,<br>Andworx Copilot IoT Game Team</p></td></tr></table></td></tr></table></body></html>`,
  };
}

async function createAndSendGrandPrizeEmailActivity(input: {
  contactId: string;
  grandPrizeEntryId: string;
  contestant: ContestantInfo;
  campaign: ActiveContestCampaign;
  checkInCode: string;
  kind?: "check_in_code" | "reminder";
}): Promise<{ status: "sent" | "scheduled" | "not_configured" | "error"; emailActivityId?: string; delayedSendTime?: string; message?: string }> {
  if (!GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID.trim()) {
    return { status: "not_configured", message: "GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID is not configured" };
  }

  try {
    const email: { subject: string; html: string; delayedSendTime?: string } =
      input.kind === "reminder" ? await buildBrandedGrandPrizeReminderEmail(input) : await buildBrandedGrandPrizeCheckInEmail(input);

    const response = await dataverseFetch("emails", {
      method: "POST",
      body: JSON.stringify({
        subject: email.subject,
        description: email.html,
        directioncode: true,
        ...(email.delayedSendTime ? { delayedemailsendtime: email.delayedSendTime } : {}),
        [`regardingobjectid_andy_grandprizeentry@odata.bind`]: `/${GRAND_PRIZE_ENTRIES_SET}(${input.grandPrizeEntryId})`,
        email_activity_parties: [
          {
            participationtypemask: 1,
            "partyid_systemuser@odata.bind": `/systemusers(${GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID})`,
          },
          {
            participationtypemask: 2,
            "partyid_contact@odata.bind": `/contacts(${input.contactId})`,
          },
        ],
      }),
    });
    const emailActivityId = parseDataverseIdFromEntityUrl(response.headers.get("OData-EntityId")) ?? undefined;
    if (emailActivityId) {
      await dataverseFetch(`emails(${emailActivityId})/Microsoft.Dynamics.CRM.SendEmail`, {
        method: "POST",
        body: JSON.stringify({ IssueSend: true, TrackingToken: "" }),
      });
    }
    return { status: email.delayedSendTime ? "scheduled" : "sent", emailActivityId, delayedSendTime: email.delayedSendTime };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Failed to create or send email activity" };
  }
}

async function createGrandPrizeEntryForClaim(
  contactId: string,
  contestant: ContestantInfo,
  input: { campaignId?: string | null; contestSourceKey?: string | null; prizeClaimId?: string | null } = {}
): Promise<GrandPrizeEntryResult> {
  const campaign = input.campaignId ? await fetchContestCampaignById(input.campaignId) : await fetchActiveContestCampaign();
  if (!campaign) return { status: "skipped", reason: "no_active_campaign" };

  const maxEntriesPerContact = campaign.maxEntriesPerContact;
  const existingEntries = await fetchGrandPrizeEntriesForContact(campaign.id, contactId, maxEntriesPerContact && maxEntriesPerContact > 0 ? maxEntriesPerContact : 5000);
  if (maxEntriesPerContact && maxEntriesPerContact > 0) {
    if (existingEntries.count >= maxEntriesPerContact) {
      return { status: "capped", currentEntries: existingEntries.count, maxEntriesPerContact, checkInCode: existingEntries.checkInCode ?? undefined };
    }
  }

  const contestSource = await fetchContestSourceByKey(
    normalizeContestSourceKey(input.contestSourceKey ?? undefined)
  );
  const sourceCapId = await fetchContestSourceCap(campaign.id, contestSource?.id ?? null);
  const checkInCode = existingEntries.checkInCode ?? await generateUniqueCheckInCode(campaign.id, campaign.checkInCodePrefix);
  const response = await dataverseFetch(GRAND_PRIZE_ENTRIES_SET, {
    method: "POST",
    body: JSON.stringify(
      buildGrandPrizeEntryPayload({
        campaignId: campaign.id,
        contactId,
        prizeClaimId: input.prizeClaimId,
        contestant,
        sourceCapId,
        checkInCode,
      })
    ),
  });
  const entryId = parseDataverseIdFromEntityUrl(response.headers.get("OData-EntityId")) ?? undefined;
  const emailActivity = entryId
    ? await createAndSendGrandPrizeEmailActivity({
        contactId,
        grandPrizeEntryId: entryId,
        contestant,
        campaign,
        checkInCode,
      })
    : { status: "error" as const, message: "Grand Prize Entry id was not returned" };
  const reminderActivity = entryId && campaign.drawingTime
    ? await createAndSendGrandPrizeEmailActivity({
        contactId,
        grandPrizeEntryId: entryId,
        contestant,
        campaign,
        checkInCode,
        kind: "reminder",
      })
    : { status: "not_configured" as const, message: "Campaign drawing time is not configured" };
  return {
    status: "created",
    entryId,
    checkInCode,
    emailActivity,
    reminderActivity,
    maxEntriesPerContact: maxEntriesPerContact ?? undefined,
  };
}

export type GrandPrizeEntryResult =
  | {
      status: "created";
      entryId?: string;
      checkInCode: string;
      emailActivity: { status: "sent" | "scheduled" | "not_configured" | "error"; emailActivityId?: string; delayedSendTime?: string; message?: string };
      reminderActivity: { status: "sent" | "scheduled" | "not_configured" | "error"; emailActivityId?: string; delayedSendTime?: string; message?: string };
      maxEntriesPerContact?: number;
    }
  | { status: "capped"; currentEntries: number; maxEntriesPerContact: number; checkInCode?: string }
  | { status: "skipped"; reason: "no_contact_info" | "no_active_campaign" }
  | { status: "error"; message: string };

async function upsertContestantContact(contestant: ContestantInfo): Promise<string | null> {
  const payload = buildContactCreatePayload(contestant);
  if (!payload) return null;

  const contactResponse = await dataverseFetch(
    `contacts?$select=contactid,firstname,lastname,fullname&$filter=emailaddress1 eq '${escapeODataString(payload.emailaddress1)}'&$top=1`
  );
  const contactBody = (await contactResponse.json()) as {
    value: Array<{ contactid: string; firstname?: string | null; lastname?: string | null; fullname?: string | null }>;
  };
  const existingContact = contactBody.value[0];
  if (existingContact) {
    const updatePayload: Record<string, string> = {};
    if (payload.firstname && payload.firstname !== existingContact.firstname) updatePayload.firstname = payload.firstname;
    if (payload.lastname && payload.lastname !== existingContact.lastname) updatePayload.lastname = payload.lastname;
    if (payload.fullname && payload.fullname !== existingContact.fullname) updatePayload.fullname = payload.fullname;
    if (Object.keys(updatePayload).length > 0) {
      await dataverseFetch(`contacts(${existingContact.contactid})`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload),
      });
    }
    return existingContact.contactid;
  }

  // New contacts start with marketing off; only a confirmed opt-in (lib/consent.ts) turns it on.
  // Existing contacts are never changed here, so earlier consent choices are not overwritten.
  const createResponse = await dataverseFetch("contacts", {
    method: "POST",
    body: JSON.stringify({ ...payload, donotbulkemail: true }),
  });
  return parseDataverseIdFromEntityUrl(createResponse.headers.get("OData-EntityId"));
}

/**
 * Validates the claim token is Unclaimed, runs the weighted-type-pick +
 * atomic-instance-claim, and marks the Prize Claim Claimed. Throws ClaimError for
 * anything the caller should turn into a 4xx rather than a 500 (bad/reused token,
 * no prizes configured).
 */
export async function claimGameWin(
  claimToken: string,
  contestant: ContestantInfo
): Promise<{ prizeName: string; grandPrizeEntry: GrandPrizeEntryResult; contactId: string | null }> {
  if (!isGuidLike(claimToken)) {
    throw new ClaimError("invalid_token", "claimToken is not a valid GUID");
  }

  const prizeClaimResponse = await dataverseFetch(
    `${PRIZE_CLAIMS_SET}?$filter=andy_claim_token eq '${claimToken}'` +
      `&$select=andy_prizeclaimid,andy_claim_status,_andy_campaign_value&$expand=${PRIZE_CLAIM_CONTEST_SOURCE_NAV}($select=andy_sourcekey)&$top=1`
  );
  const prizeClaimBody = (await prizeClaimResponse.json()) as {
    value: Array<{
      andy_prizeclaimid: string;
      andy_claim_status: number;
      _andy_campaign_value?: string | null;
      [PRIZE_CLAIM_CONTEST_SOURCE_NAV]?: { andy_sourcekey?: string | null } | null;
    }>;
  };
  const prizeClaim = prizeClaimBody.value[0];
  if (!prizeClaim) {
    throw new ClaimError("not_found", "No Prize Claim row matches that claim token");
  }
  if (prizeClaim.andy_claim_status !== PRIZE_CLAIM_STATUS_UNCLAIMED) {
    throw new ClaimError("already_claimed", "This claim token has already been used");
  }

  const contactId = await upsertContestantContact(contestant);

  const prize = await selectAndClaimPrize();

  await dataverseFetch(`${PRIZE_CLAIMS_SET}(${prizeClaim.andy_prizeclaimid})`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(prize.instanceId
        ? { [`${PRIZE_CLAIM_PRIZEINSTANCE_NAV}@odata.bind`]: `/${PRIZES_SET}(${prize.instanceId})` }
        : {}),
      andy_claim_status: PRIZE_CLAIM_STATUS_CLAIMED,
      andy_claimed_time: new Date().toISOString(),
      ...(contactId ? { [`${PRIZE_CLAIM_CONTACT_NAV}@odata.bind`]: `/contacts(${contactId})` } : {}),
    }),
  });

  let grandPrizeEntry: GrandPrizeEntryResult = { status: "skipped", reason: "no_contact_info" };
  if (contactId) {
    try {
      grandPrizeEntry = await createGrandPrizeEntryForClaim(contactId, contestant, {
        campaignId: prizeClaim._andy_campaign_value ?? null,
        contestSourceKey: prizeClaim[PRIZE_CLAIM_CONTEST_SOURCE_NAV]?.andy_sourcekey ?? null,
        prizeClaimId: prizeClaim.andy_prizeclaimid,
      });
    } catch (error) {
      console.error("Failed to create Grand Prize Entry for claimed Prize Claim", error);
      grandPrizeEntry = { status: "error", message: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  return { prizeName: prize.typeName, grandPrizeEntry, contactId };
}
