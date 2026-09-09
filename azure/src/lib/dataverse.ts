import { ConfidentialClientApplication } from "@azure/msal-node";

const DATAVERSE_URL = (process.env.DATAVERSE_URL ?? "").replace(/\/$/, "");

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.DATAVERSE_CLIENT_ID ?? "",
    authority: `https://login.microsoftonline.com/${process.env.DATAVERSE_TENANT_ID ?? ""}`,
    clientSecret: process.env.DATAVERSE_CLIENT_SECRET ?? "",
  },
});

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.value;
  }
  const result = await msalClient.acquireTokenByClientCredential({
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
async function dataverseFetchRaw(path: string, init: RequestInit = {}): Promise<Response> {
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

async function dataverseFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await dataverseFetchRaw(path, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Dataverse ${init.method ?? "GET"} ${path} failed: ${response.status} ${body}`);
  }
  return response;
}

/** GUID-shaped strings only -- claim tokens and ids get interpolated into OData
 * $filter strings, so this is the injection guard for that. */
function isGuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export interface GameBoxState {
  id: string;
  deviceSlug: string | null;
  deviceName: string | null;
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
    "andy_gameboxstates?$top=1&$select=andy_gameboxstateid" +
      `&$expand=${ACTIVE_DEVICE_PROFILE_NAV_PROPERTY}($select=andy_deviceslug,andy_name)`
  );
  const body = (await response.json()) as {
    value: Array<{
      andy_gameboxstateid: string;
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
  };
}

export interface DeviceProfileSummary {
  id: string;
  name: string;
  deviceSlug: string;
}

/** Lists all andy_deviceprofile rows, for the control app's device picker. */
export async function listDeviceProfiles(): Promise<DeviceProfileSummary[]> {
  const response = await dataverseFetch(
    "andy_deviceprofiles?$select=andy_deviceprofileid,andy_name,andy_deviceslug&$orderby=andy_name"
  );
  const body = (await response.json()) as {
    value: Array<{ andy_deviceprofileid: string; andy_name: string; andy_deviceslug: string }>;
  };
  return body.value.map((row) => ({
    id: row.andy_deviceprofileid,
    name: row.andy_name,
    deviceSlug: row.andy_deviceslug,
  }));
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

// ============ Prize engine (PRIZE_ENGINE_SPEC.md) ============

// andy_gamewinstatus / andy_redemptionstatus option values -- see
// tables/choices/andy_gamewinstatus.json and andy_redemptionstatus.json. Confirmed
// against this environment's real exported OptionSets (both happened to land on the
// same values as documented there, no drift).
const GAMEWIN_STATUS_UNCLAIMED = 435700000;
const GAMEWIN_STATUS_CLAIMED = 435700001;
const REDEMPTION_STATUS_NOT_REDEEMED = 435700000;

export class ClaimError extends Error {
  constructor(
    public code: "invalid_token" | "not_found" | "already_claimed" | "no_prizes_available",
    message: string
  ) {
    super(message);
  }
}

/**
 * Creates the andy_gamewin row for a resolved fault, per PRIZE_ENGINE_SPEC.md §3 step 1.
 * Stands in for the not-yet-built Copilot Studio resolved-topic action -- same schema
 * effect (andy_status = Unclaimed, fresh andy_claimtoken), just triggered by the kiosk
 * client detecting `device.checkWin()` instead of a Copilot Studio topic. Swap the
 * caller, not this function, once that topic exists.
 */
export async function createGameWin(deviceSlug: string): Promise<{ claimToken: string }> {
  const deviceResponse = await dataverseFetch(
    `andy_deviceprofiles?$filter=andy_deviceslug eq '${deviceSlug.replace(/'/g, "''")}'` +
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
  await dataverseFetch("andy_gamewins", {
    method: "POST",
    body: JSON.stringify({
      andy_claimtoken: claimToken,
      "andy_DeviceProfile@odata.bind": `/andy_deviceprofiles(${deviceProfileId})`,
      andy_status: GAMEWIN_STATUS_UNCLAIMED,
      andy_redemptionstatus: REDEMPTION_STATUS_NOT_REDEEMED,
      andy_wontime: new Date().toISOString(),
      andy_sharedinfo: false,
    }),
  });
  return { claimToken };
}

/** Active, non-fallback prizes -- for the prize wheel SPA's wheel rendering (not the
 * pick itself, which stays server-side and can also draw the fallback). */
export async function listActivePrizes(): Promise<Array<{ name: string }>> {
  const response = await dataverseFetch(
    "andy_prizes?$filter=statecode eq 0 and andy_isfallback eq false" +
      "&$select=andy_prizename&$orderby=andy_prizename"
  );
  const body = (await response.json()) as { value: Array<{ andy_prizename: string }> };
  return body.value.map((row) => ({ name: row.andy_prizename }));
}

interface PrizeRow {
  id: string;
  name: string;
  weight: number;
  remaining: number;
  totalAwarded: number;
  etag: string;
}

function toPrizeRow(row: {
  andy_prizeid: string;
  andy_prizename: string;
  andy_weight: number;
  andy_remaining: number;
  andy_totalawarded: number;
  "@odata.etag": string;
}): PrizeRow {
  return {
    id: row.andy_prizeid,
    name: row.andy_prizename,
    weight: row.andy_weight,
    remaining: row.andy_remaining,
    totalAwarded: row.andy_totalawarded,
    etag: row["@odata.etag"],
  };
}

const PRIZE_SELECT = "andy_prizeid,andy_prizename,andy_weight,andy_remaining,andy_totalawarded";

async function fetchEligiblePrizes(): Promise<PrizeRow[]> {
  const response = await dataverseFetch(
    `andy_prizes?$select=${PRIZE_SELECT}` +
      "&$filter=statecode eq 0 and andy_remaining gt 0 and andy_isfallback eq false" +
      "&$orderby=andy_prizename"
  );
  const body = (await response.json()) as { value: Parameters<typeof toPrizeRow>[0][] };
  return body.value.map(toPrizeRow);
}

async function fetchFallbackPrize(): Promise<PrizeRow | null> {
  const response = await dataverseFetch(
    `andy_prizes?$select=${PRIZE_SELECT}&$filter=andy_isfallback eq true and statecode eq 0&$top=1`
  );
  const body = (await response.json()) as { value: Parameters<typeof toPrizeRow>[0][] };
  return body.value[0] ? toPrizeRow(body.value[0]) : null;
}

function pickWeighted(prizes: PrizeRow[]): PrizeRow {
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
  const r = Math.random() * totalWeight;
  let running = 0;
  for (const p of prizes) {
    running += p.weight;
    if (r <= running) return p;
  }
  return prizes[prizes.length - 1];
}

/** Conditional decrement -- false means the row changed since it was read (someone
 * else just took the last unit), which the caller retries from selection, not just
 * the decrement, per PRIZE_ENGINE_SPEC.md §1.3. */
async function tryClaimPrizeRow(prize: PrizeRow): Promise<boolean> {
  const response = await dataverseFetchRaw(`andy_prizes(${prize.id})`, {
    method: "PATCH",
    headers: { "If-Match": prize.etag },
    body: JSON.stringify({
      andy_remaining: prize.remaining - 1,
      andy_totalawarded: prize.totalAwarded + 1,
    }),
  });
  if (response.status === 412) return false;
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Dataverse PATCH andy_prizes(${prize.id}) failed: ${response.status} ${body}`);
  }
  return true;
}

const MAX_CLAIM_RETRIES = 5;

/** Runs PRIZE_ENGINE_SPEC.md §1.2/§1.3/§1.4 end to end: weighted pick from the
 * eligible pool (falling back to the designated fallback prize if that pool is
 * empty), atomic decrement, retrying the whole selection on a losing race. */
async function selectAndClaimPrize(): Promise<{ id: string; name: string }> {
  for (let attempt = 0; attempt < MAX_CLAIM_RETRIES; attempt++) {
    const eligible = await fetchEligiblePrizes();
    let pool = eligible;
    if (pool.length === 0) {
      const fallback = await fetchFallbackPrize();
      if (!fallback) {
        throw new ClaimError(
          "no_prizes_available",
          "No eligible prizes and no andy_isfallback row configured"
        );
      }
      pool = [fallback];
    }
    const chosen = pickWeighted(pool);
    if (await tryClaimPrizeRow(chosen)) {
      return { id: chosen.id, name: chosen.name };
    }
    // 412 -- someone else claimed the last unit between read and write. Retry from
    // selection (not just the decrement), since the eligible set itself may have
    // changed.
  }
  throw new ClaimError(
    "no_prizes_available",
    `Failed to claim a prize after ${MAX_CLAIM_RETRIES} attempts (persistent contention)`
  );
}

function generateRedemptionCode(): string {
  return `GW-${Math.floor(100000 + Math.random() * 900000)}`;
}

interface ContestantInfo {
  name?: string;
  email?: string;
  sharedInfo: boolean;
}

/**
 * PRIZE_ENGINE_SPEC.md §3 steps 3-4: validates the token is Unclaimed, runs the
 * weighted pick + atomic decrement, generates the redemption code, and marks the
 * andy_gamewin row Claimed. Throws ClaimError for anything the caller should turn
 * into a 4xx rather than a 500 (bad/reused token, no prizes configured).
 */
export async function claimGameWin(
  claimToken: string,
  contestant: ContestantInfo
): Promise<{ prizeName: string; redemptionCode: string }> {
  if (!isGuidLike(claimToken)) {
    throw new ClaimError("invalid_token", "claimToken is not a valid GUID");
  }

  const gameWinResponse = await dataverseFetch(
    `andy_gamewins?$filter=andy_claimtoken eq '${claimToken}'&$select=andy_gamewinid,andy_status&$top=1`
  );
  const gameWinBody = (await gameWinResponse.json()) as {
    value: Array<{ andy_gamewinid: string; andy_status: number }>;
  };
  const gameWin = gameWinBody.value[0];
  if (!gameWin) {
    throw new ClaimError("not_found", "No andy_gamewin row matches that claim token");
  }
  if (gameWin.andy_status !== GAMEWIN_STATUS_UNCLAIMED) {
    throw new ClaimError("already_claimed", "This claim token has already been used");
  }

  const prize = await selectAndClaimPrize();
  const redemptionCode = generateRedemptionCode();

  await dataverseFetch(`andy_gamewins(${gameWin.andy_gamewinid})`, {
    method: "PATCH",
    body: JSON.stringify({
      "andy_Prize@odata.bind": `/andy_prizes(${prize.id})`,
      andy_status: GAMEWIN_STATUS_CLAIMED,
      andy_redemptioncode: redemptionCode,
      andy_claimedtime: new Date().toISOString(),
      andy_sharedinfo: contestant.sharedInfo,
      ...(contestant.name ? { andy_contestantname: contestant.name } : {}),
      ...(contestant.email ? { andy_contestantemail: contestant.email } : {}),
    }),
  });

  return { prizeName: prize.name, redemptionCode };
}
