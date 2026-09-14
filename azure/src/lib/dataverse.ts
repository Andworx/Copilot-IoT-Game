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
}

/** Lists all andy_deviceprofile rows, for the control app's device picker. */
export async function listDeviceProfiles(): Promise<DeviceProfileSummary[]> {
  const response = await dataverseFetch(
    "andy_deviceprofiles?$select=andy_deviceprofileid,andy_name,andy_deviceslug,andy_isenabled&$orderby=andy_name"
  );
  const body = (await response.json()) as {
    value: Array<{
      andy_deviceprofileid: string;
      andy_name: string;
      andy_deviceslug: string;
      andy_isenabled: boolean | null;
    }>;
  };
  return body.value.map((row) => ({
    id: row.andy_deviceprofileid,
    name: row.andy_name,
    deviceSlug: row.andy_deviceslug,
    // Same null-safe treatment as gameModeEnabled above.
    isEnabled: row.andy_isenabled !== false,
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

/** Flips andy_isenabled on one device profile. Staff use this from Game Box Control to
 * hide a mode from manual selection and exclude it from pickRandomEnabledMode. */
export async function setDeviceProfileEnabled(deviceProfileId: string, isEnabled: boolean): Promise<void> {
  await dataverseFetch(`andy_deviceprofiles(${deviceProfileId})`, {
    method: "PATCH",
    body: JSON.stringify({ andy_isenabled: isEnabled }),
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

// Entity set names -- confirmed against solutions/CopilotIoTGame/Entities/andy_Prizes/
// Entity.xml and .../andy_PrizeTypes/Entity.xml's <EntitySetName> after the Phase 5
// export. Both logical names already end in "s", so Dataverse's naive "+s"
// pluralization double-pluralizes them -- not a typo.
const PRIZE_TYPES_SET = "andy_prizetypeses";
const PRIZES_SET = "andy_prizeses";

// Navigation properties -- confirmed against solutions/CopilotIoTGame/Other/
// Relationships/{andy_GameWin,andy_PrizeTypes,andy_Prizes}.xml after the Phase 5
// export, not assumed.
const PRIZES_GAMEWIN_NAV = "andy_GameWin"; // on andy_Prizes, -> andy_GameWin
const GAMEWIN_PRIZETYPE_NAV = "andy_PrizeType"; // on andy_gamewin, -> andy_PrizeTypes
const GAMEWIN_PRIZEINSTANCE_NAV = "andy_PrizeInstance"; // on andy_gamewin, -> andy_Prizes
// Same string as GAMEWIN_PRIZETYPE_NAV above, but a *different* relationship -- this one
// is on andy_Prizes (confirmed against solutions/PrizeEngine/Other/Relationships/
// andy_PrizeTypes.xml), not andy_gamewin. Kept as its own constant so the two don't get
// conflated if either relationship's nav property name ever diverges.
const PRIZES_PRIZETYPE_NAV = "andy_PrizeType"; // on andy_Prizes, -> andy_PrizeTypes

/** Active, non-fallback prize types -- for the prize wheel SPA's wheel rendering (not
 * the pick itself, which stays server-side and can also draw the fallback type). */
export async function listActivePrizeTypes(): Promise<Array<{ name: string }>> {
  const response = await dataverseFetch(
    `${PRIZE_TYPES_SET}?$select=andy_prizetypename` +
      "&$filter=statecode eq 0 and andy_isfallback eq false" +
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
 * not just this claim, since the eligible/stock set may have changed. Binds the
 * instance straight to this win via andy_GameWin (the new andy_Prizes lookup), rather
 * than the old single-row decrement this replaces. */
async function tryClaimInstance(instance: UntakenInstance, gameWinId: string): Promise<boolean> {
  const response = await dataverseFetchRaw(`${PRIZES_SET}(${instance.id})`, {
    method: "PATCH",
    headers: { "If-Match": instance.etag },
    body: JSON.stringify({
      andy_prizetaken: true,
      [`${PRIZES_GAMEWIN_NAV}@odata.bind`]: `/andy_gamewins(${gameWinId})`,
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
   * nothing to bind andy_gamewin.andy_PrizeInstance to. */
  instanceId: string | null;
}

/** Weighted-picks a *type* from eligible types that currently have untaken instance
 * stock (falling back to the designated andy_isfallback type, which isn't
 * instance-tracked, if none do), then atomically claims one specific instance row of
 * the chosen type. Retries the whole selection on a losing race. */
async function selectAndClaimPrize(gameWinId: string): Promise<SelectedPrize> {
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
    if (await tryClaimInstance(chosenInstance, gameWinId)) {
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

function generateRedemptionCode(): string {
  return `GW-${Math.floor(100000 + Math.random() * 900000)}`;
}

interface ContestantInfo {
  name?: string;
  email?: string;
  sharedInfo: boolean;
}

/**
 * Validates the claim token is Unclaimed, runs the weighted-type-pick +
 * atomic-instance-claim (PRIZE_CODE_MIGRATION.md), generates the redemption code, and
 * marks the andy_gamewin row Claimed. Throws ClaimError for anything the caller should
 * turn into a 4xx rather than a 500 (bad/reused token, no prizes configured).
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

  const prize = await selectAndClaimPrize(gameWin.andy_gamewinid);
  const redemptionCode = generateRedemptionCode();

  await dataverseFetch(`andy_gamewins(${gameWin.andy_gamewinid})`, {
    method: "PATCH",
    body: JSON.stringify({
      [`${GAMEWIN_PRIZETYPE_NAV}@odata.bind`]: `/${PRIZE_TYPES_SET}(${prize.typeId})`,
      ...(prize.instanceId
        ? { [`${GAMEWIN_PRIZEINSTANCE_NAV}@odata.bind`]: `/${PRIZES_SET}(${prize.instanceId})` }
        : {}),
      andy_status: GAMEWIN_STATUS_CLAIMED,
      andy_redemptioncode: redemptionCode,
      andy_claimedtime: new Date().toISOString(),
      andy_sharedinfo: contestant.sharedInfo,
      ...(contestant.name ? { andy_contestantname: contestant.name } : {}),
      ...(contestant.email ? { andy_contestantemail: contestant.email } : {}),
    }),
  });

  return { prizeName: prize.typeName, redemptionCode };
}
