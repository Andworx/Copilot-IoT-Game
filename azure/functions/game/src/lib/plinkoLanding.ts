import {
  createSourcedPrizeClaim,
  dataverseFetch,
  dataverseFetchRaw,
  escapeODataString,
} from "./dataverse";
import {
  PLINKO_CONTEST_SOURCE_KEY,
  judgePlinkoLanding,
  parsePlinkoLanding,
  playName,
  type PlinkoLanding,
  type PlinkoProfile,
  type PlinkoResultMessage,
} from "./plinko";

const PROFILES_SET = "andy_plinkoprofiles";
const PLAYS_SET = "andy_plinkoplaies";
const PLAY_PRIZE_CLAIM_NAV = "andy_PrizeClaim"; // on andy_plinkoplay, -> andy_prizeclaim
const PLAY_PROFILE_NAV = "andy_Profile"; // on andy_plinkoplay, -> andy_plinkoprofile

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
  andy_activelitbucket?: number | null;
}

async function getProfile(slug: string): Promise<PlinkoProfile | null> {
  const response = await dataverseFetch(
    `${PROFILES_SET}?$select=andy_plinkoprofileid,andy_profileslug,andy_numberofbuckets,andy_litbucketentries,` +
      `andy_standardbucketentries,andy_gamemodeactive,andy_activelitbucket` +
      `&$filter=statecode eq 0 and andy_profileslug eq '${escapeODataString(slug)}'&$top=1`
  );
  const row = ((await response.json()) as { value: ProfileRow[] }).value[0];
  if (!row) return null;
  return {
    id: row.andy_plinkoprofileid,
    slug: row.andy_profileslug,
    bucketCount: row.andy_numberofbuckets ?? null,
    litBucketEntries: row.andy_litbucketentries ?? 2,
    standardBucketEntries: row.andy_standardbucketentries ?? 1,
    gameModeActive: row.andy_gamemodeactive !== false,
    activeLitBucket: row.andy_activelitbucket ?? null,
  };
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
  const litBucket = play.andy_illuminatedbucketnumber ?? landing.litBucket ?? bucket;
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

/**
 * Judges one `plinkoLanding` from the Pi and, if accepted, records the Prize Claim and Plinko
 * Play and returns the `plinkoResult` to broadcast. Idempotent on the Pi's event id.
 */
export async function recordPlinkoLanding(payload: unknown, now: Date = new Date()): Promise<PlinkoOutcome> {
  const parsed = parsePlinkoLanding(payload);
  if ("error" in parsed) return { status: "rejected", reason: parsed.error };
  const { landing } = parsed;

  const profile = await getProfile(landing.stationSlug);
  if (!profile) return { status: "rejected", reason: `no active Plinko Profile for slug "${landing.stationSlug}"` };

  const existing = await findPlayByEventId(landing.eventId);
  if (existing) {
    const result = resultFromPlay(landing, profile, existing);
    return result
      ? { status: "accepted", result, duplicate: true }
      : { status: "rejected", reason: `play for event ${landing.eventId} has no prize claim token` };
  }

  const decision = judgePlinkoLanding(landing, profile, now);
  if (!decision.accepted) return { status: "rejected", reason: decision.reason };

  const claimToken = crypto.randomUUID();
  const { prizeClaimId } = await createSourcedPrizeClaim({
    claimToken,
    contestSourceKey: PLINKO_CONTEST_SOURCE_KEY,
    name: `Plinko ${landing.stationSlug} bucket ${decision.bucket}`,
    now,
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
