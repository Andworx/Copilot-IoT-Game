import {
  createSourcedPrizeClaim,
  dataverseFetch,
  dataverseFetchRaw,
  escapeODataString,
  isGuidLike,
} from "./dataverse";
import { blobJson } from "./mcpquestBlobJson";
import { storageToken } from "./mcpquestSpecStore";
import {
  LOCK_TTL_MS,
  PLINKO_CONTEST_SOURCE_KEY,
  judgePlinkoLanding,
  lockHolds,
  lockPath,
  parsePlinkoLanding,
  parsePlinkoLock,
  playName,
  type PlinkoLanding,
  type PlinkoLock,
  type PlinkoProfile,
  type PlinkoResultMessage,
} from "./plinko";
import type { JsonBlobs } from "../mcpquest/generate/jobs";

const PROFILES_SET = "andy_plinkoprofiles";
const PLAYS_SET = "andy_plinkoplaies";
const PLAY_PRIZE_CLAIM_NAV = "andy_PrizeClaim"; // on andy_plinkoplay, -> andy_prizeclaim
const PLAY_PROFILE_NAV = "andy_Profile"; // on andy_plinkoplay, -> andy_plinkoprofile
const PRIZE_CLAIM_STATUS_UNCLAIMED = 435700000;

/** The station profile, the active campaign and the contest source rarely change; reuse them briefly. */
const LOOKUP_CACHE_MS = 60 * 1000;

export type PlinkoOutcome =
  | { status: "accepted"; result: PlinkoResultMessage; duplicate: boolean }
  | { status: "rejected"; reason: string };

interface ProfileRow {
  andy_plinkoprofileid: string;
  andy_profileslug: string;
  andy_numberofbuckets?: number | null;
  andy_litbucketentries?: number | null;
  andy_standardbucketentries?: number | null;
  andy_gamemodeactive?: boolean | null;
}

const profileCache = new Map<string, { at: number; profile: PlinkoProfile | null }>();

export async function getProfile(slug: string, now: number = Date.now()): Promise<PlinkoProfile | null> {
  const hit = profileCache.get(slug);
  if (hit && now - hit.at < LOOKUP_CACHE_MS) return hit.profile;
  const response = await dataverseFetch(
    `${PROFILES_SET}?$select=andy_plinkoprofileid,andy_profileslug,andy_numberofbuckets,andy_litbucketentries,` +
      `andy_standardbucketentries,andy_gamemodeactive` +
      `&$filter=statecode eq 0 and andy_profileslug eq '${escapeODataString(slug)}'&$top=1`
  );
  const row = ((await response.json()) as { value: ProfileRow[] }).value[0];
  const profile: PlinkoProfile | null = row
    ? {
        id: row.andy_plinkoprofileid,
        slug: row.andy_profileslug,
        bucketCount: row.andy_numberofbuckets ?? null,
        litBucketEntries: row.andy_litbucketentries ?? 2,
        standardBucketEntries: row.andy_standardbucketentries ?? 1,
        gameModeActive: row.andy_gamemodeactive !== false,
      }
    : null;
  profileCache.set(slug, { at: now, profile });
  return profile;
}

interface PlayRow {
  andy_bucketnumber?: number | null;
  andy_illuminatedbucketnumber?: number | null;
  andy_entriesawarded?: number | null;
  andy_PrizeClaim?: { andy_claim_token?: string | null } | null;
}

/** The existing play for a Pi event id, so a redelivered message re-broadcasts instead of double-counting. */
async function findPlayByEventId(eventId: string): Promise<PlayRow | null> {
  const response = await dataverseFetch(
    `${PLAYS_SET}?$select=andy_bucketnumber,andy_illuminatedbucketnumber,andy_entriesawarded` +
      `&$expand=${PLAY_PRIZE_CLAIM_NAV}($select=andy_claim_token)` +
      `&$filter=andy_hardwareeventidentifier eq '${escapeODataString(eventId)}'&$top=1`
  );
  return ((await response.json()) as { value: PlayRow[] }).value[0] ?? null;
}

function resultFromPlay(landing: PlinkoLanding, profile: PlinkoProfile, play: PlayRow): PlinkoResultMessage | null {
  const claimToken = play.andy_PrizeClaim?.andy_claim_token;
  if (!claimToken) return null;
  const bucket = play.andy_bucketnumber ?? landing.bucket;
  const litBucket = play.andy_illuminatedbucketnumber ?? bucket;
  return {
    stationSlug: landing.stationSlug,
    eventId: landing.eventId,
    bucket,
    litBucket,
    bucketCount: profile.bucketCount ?? landing.bucketCount ?? bucket,
    entriesAwarded: play.andy_entriesawarded ?? 1,
    claimToken,
  };
}

// ---- one win on screen at a time -----------------------------------------------------------

let lockBlobs: JsonBlobs | null | undefined;

/** The lock lives next to the MCP Quest documents. No container configured means no lock (fails open). */
function locks(): JsonBlobs | null {
  if (lockBlobs !== undefined) return lockBlobs;
  const container = process.env.MCPQUEST_SPEC_BLOB_URL;
  lockBlobs = container ? blobJson({ containerUrl: container, getToken: () => storageToken() }) : null;
  return lockBlobs;
}

async function readLock(stationSlug: string): Promise<PlinkoLock | null> {
  const store = locks();
  if (!store) return null;
  try {
    const doc = await store.get(lockPath(stationSlug));
    return doc ? parsePlinkoLock(doc.value) : null;
  } catch (error) {
    console.warn("Could not read the Plinko lock; continuing without it", error instanceof Error ? error.message : error);
    return null;
  }
}

async function writeLock(stationSlug: string, lock: PlinkoLock): Promise<void> {
  const store = locks();
  if (!store) return;
  try {
    await store.put(lockPath(stationSlug), lock, { any: true });
  } catch (error) {
    console.warn("Could not write the Plinko lock", error instanceof Error ? error.message : error);
  }
}

async function claimIsUnclaimed(claimToken: string): Promise<boolean> {
  if (!isGuidLike(claimToken)) return false;
  const response = await dataverseFetch(
    `andy_prizeclaims?$select=andy_claim_status&$filter=andy_claim_token eq '${claimToken}'&$top=1`
  );
  const row = ((await response.json()) as { value: Array<{ andy_claim_status?: number }> }).value[0];
  return row?.andy_claim_status === PRIZE_CLAIM_STATUS_UNCLAIMED;
}

/** Called by the display when the win is skipped or its countdown ends. */
export async function releasePlinkoLock(stationSlug: string, eventId: string): Promise<void> {
  const lock = await readLock(stationSlug);
  if (lock && lock.eventId === eventId && !lock.released) await writeLock(stationSlug, { ...lock, released: true });
}

/** Whether `eventId` is still the win on screen (not skipped, expired or claimed). Fails open without a lock store. */
export async function isPlinkoWinActive(stationSlug: string, eventId: string): Promise<boolean> {
  if (!locks()) return true;
  const lock = await readLock(stationSlug);
  if (!lock || lock.eventId !== eventId) return false;
  return lockHolds(lock, await claimIsUnclaimed(lock.claimToken));
}

/**
 * Judges one `plinkoLanding` from the Pi and, if accepted, records the Prize Claim and Plinko
 * Play and returns the `plinkoResult` to broadcast. Idempotent on the Pi's event id, and
 * refuses new wins while the previous one is still on screen.
 */
export async function recordPlinkoLanding(payload: unknown, now: Date = new Date()): Promise<PlinkoOutcome> {
  const parsed = parsePlinkoLanding(payload);
  if ("error" in parsed) return { status: "rejected", reason: parsed.error };
  const { landing } = parsed;

  const [profile, existing, lock] = await Promise.all([
    getProfile(landing.stationSlug),
    findPlayByEventId(landing.eventId),
    readLock(landing.stationSlug),
  ]);
  if (!profile) return { status: "rejected", reason: `no active Plinko Profile for slug "${landing.stationSlug}"` };

  if (existing) {
    const result = resultFromPlay(landing, profile, existing);
    return result
      ? { status: "accepted", result, duplicate: true }
      : { status: "rejected", reason: `play for event ${landing.eventId} has no prize claim token` };
  }

  if (lock && !lock.released && now.getTime() < lock.expiresAt && (await claimIsUnclaimed(lock.claimToken))) {
    return { status: "rejected", reason: `a win is still on screen (event ${lock.eventId}); landing ignored` };
  }

  const decision = judgePlinkoLanding(landing, profile, now);
  if (!decision.accepted) return { status: "rejected", reason: decision.reason };

  const claimToken = crypto.randomUUID();
  const { prizeClaimId } = await createSourcedPrizeClaim({
    claimToken,
    contestSourceKey: PLINKO_CONTEST_SOURCE_KEY,
    name: `Plinko ${landing.stationSlug} bucket ${decision.bucket}`,
    now,
    freshToken: true,
    lookupCacheMs: LOOKUP_CACHE_MS,
  });

  const response = await dataverseFetchRaw(PLAYS_SET, {
    method: "POST",
    body: JSON.stringify({
      andy_playname: playName(landing.stationSlug, decision.bucket, landing.landedAt),
      andy_hardwareeventidentifier: landing.eventId,
      andy_bucketnumber: decision.bucket,
      andy_illuminatedbucketnumber: decision.litBucket,
      andy_isbucketlit: decision.bucket === decision.litBucket,
      andy_entriesawarded: decision.entriesAwarded,
      andy_timelanded: landing.landedAt.toISOString(),
      [`${PLAY_PRIZE_CLAIM_NAV}@odata.bind`]: `/andy_prizeclaims(${prizeClaimId})`,
      [`${PLAY_PROFILE_NAV}@odata.bind`]: `/${PROFILES_SET}(${profile.id})`,
    }),
  });
  if (!response.ok) {
    // A concurrent redelivery may have created the play first; return that one rather than failing.
    const raced = await findPlayByEventId(landing.eventId);
    const result = raced ? resultFromPlay(landing, profile, raced) : null;
    if (result) return { status: "accepted", result, duplicate: true };
    throw new Error(`Dataverse POST ${PLAYS_SET} failed: ${response.status} ${await response.text()}`);
  }

  // Hold the board before the result is broadcast, so the next landing already sees it.
  await writeLock(landing.stationSlug, {
    eventId: landing.eventId,
    claimToken,
    expiresAt: now.getTime() + LOCK_TTL_MS,
    released: false,
  });

  return {
    status: "accepted",
    duplicate: false,
    result: {
      stationSlug: landing.stationSlug,
      eventId: landing.eventId,
      bucket: decision.bucket,
      litBucket: decision.litBucket,
      bucketCount: decision.bucketCount,
      entriesAwarded: decision.entriesAwarded,
      claimToken,
    },
  };
}
