/**
 * Pure helpers for the Plinko landing pipeline (no Azure/Dataverse imports, so they are
 * unit-testable). The payload is what hardware/plinko-pi/plinko_trigger.py publishes and
 * the result is what power pages/plinko/src/types/plinko.ts expects -- keep them in sync.
 * See power pages/docs/PLINKO_GAME_PLAN.md §4.
 */

import { CHASE_DISPLAY_LAG_MS, CHASE_STEP_MS, litBucketAt } from "./plinkoChase";

export const PLINKO_LANDING_TYPE = "plinkoLanding";
export const PLINKO_RESULT_TARGET = "plinkoResult";
/** Sent by the Pi every couple of minutes to keep the Event Hub trigger warm; carries nothing to act on. */
export const PLINKO_HEARTBEAT_TYPE = "plinkoHeartbeat";
export const PLINKO_CONTEST_SOURCE_KEY = "plinko";

/** A landing older than this is treated as a replay, not a live drop. */
export const MAX_LANDING_AGE_MS = 15 * 60 * 1000;
/** Tolerated Pi clock lead over the server. */
export const MAX_LANDING_FUTURE_MS = 5 * 60 * 1000;

export interface PlinkoLanding {
  stationSlug: string;
  eventId: string;
  bucket: number;
  bucketCount: number | null;
  landedAt: Date;
  firmware: string | null;
}

export interface PlinkoProfile {
  id: string;
  slug: string;
  bucketCount: number | null;
  litBucketEntries: number;
  standardBucketEntries: number;
  gameModeActive: boolean;
  bucketIcons: string[];
}

/** The `plinkoResult` the booth display receives. */
export interface PlinkoResultMessage {
  stationSlug: string;
  eventId: string;
  bucket: number;
  litBucket: number;
  bucketCount: number;
  entriesAwarded: number;
  claimToken: string;
  bucketIcons: string[];
  /**
   * False when staff have turned Game Mode off for the station: the display just shows the bucket
   * (no QR, no entries, nothing recorded), and `claimToken` is empty.
   */
  gameModeActive: boolean;
}

export const PLINKO_BUCKET_ICON_IDS = [
  "powerapps",
  "dataverse",
  "powerautomate",
  "powerpages",
  "aibuilder",
  "powerplatform",
] as const;

const bucketIconIds = new Set<string>(PLINKO_BUCKET_ICON_IDS);

export function defaultBucketIcons(bucketCount: number | null | undefined): string[] {
  const count = Math.max(1, Math.floor(bucketCount ?? PLINKO_BUCKET_ICON_IDS.length));
  return Array.from({ length: count }, (_, index) => PLINKO_BUCKET_ICON_IDS[index % PLINKO_BUCKET_ICON_IDS.length]);
}

export function normalizeBucketIcons(value: unknown, bucketCount: number | null | undefined): string[] {
  const count = Math.max(1, Math.floor(bucketCount ?? PLINKO_BUCKET_ICON_IDS.length));
  const fallback = defaultBucketIcons(count);
  const source =
    Array.isArray(value)
      ? value
      : typeof value === "string" && value.trim()
        ? (() => {
            try {
              return JSON.parse(value) as unknown;
            } catch {
              return null;
            }
          })()
        : null;
  if (!Array.isArray(source)) return fallback;
  return Array.from({ length: count }, (_, index) => {
    const icon = source[index];
    return typeof icon === "string" && bucketIconIds.has(icon) ? icon : fallback[index];
  });
}

export function isPlinkoLanding(payload: unknown): boolean {
  return !!payload && typeof payload === "object" && (payload as { type?: unknown }).type === PLINKO_LANDING_TYPE;
}

export function isPlinkoHeartbeat(payload: unknown): boolean {
  return !!payload && typeof payload === "object" && (payload as { type?: unknown }).type === PLINKO_HEARTBEAT_TYPE;
}

function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

/** Validates the wire payload. Returns the parsed landing, or the reason it was rejected. */
export function parsePlinkoLanding(payload: unknown): { landing: PlinkoLanding } | { error: string } {
  if (!isPlinkoLanding(payload)) return { error: "not a plinkoLanding message" };
  const p = payload as Record<string, unknown>;

  const stationSlug = typeof p.stationSlug === "string" ? p.stationSlug.trim() : "";
  if (!stationSlug) return { error: "stationSlug is required" };

  const eventId = typeof p.eventId === "string" ? p.eventId.trim() : "";
  if (!eventId || eventId.length > 100) return { error: "eventId is required (max 100 characters)" };

  const bucket = positiveInt(p.bucket);
  if (bucket === null) return { error: "bucket must be a whole number >= 1" };

  const landedAt = typeof p.landedAt === "string" ? new Date(p.landedAt) : null;
  if (!landedAt || Number.isNaN(landedAt.getTime())) return { error: "landedAt must be an ISO timestamp" };

  return {
    landing: {
      stationSlug,
      eventId,
      bucket,
      bucketCount: positiveInt(p.bucketCount),
      landedAt,
      firmware: typeof p.firmware === "string" ? p.firmware.slice(0, 100) : null,
    },
  };
}

/** Replay control: the Pi has an NTP clock, so a landing far from "now" is stale or forged. */
export function checkFreshness(landedAt: Date, now: Date = new Date()): string | null {
  const age = now.getTime() - landedAt.getTime();
  if (age > MAX_LANDING_AGE_MS) return `landing is ${Math.round(age / 1000)}s old`;
  if (age < -MAX_LANDING_FUTURE_MS) return `landing is ${Math.round(-age / 1000)}s in the future`;
  return null;
}

/**
 * The lit bucket for scoring: where the display's chase light was when the puck landed. The Pi
 * has no lights and its `litBucket` is ignored; the chase is a function of time (plinkoChase.ts).
 * Just after a step boundary the screen can still show the previous bucket lit, so a landing in
 * that bucket within CHASE_DISPLAY_LAG_MS of the boundary counts as lit.
 */
export function resolveLitBucket(landing: PlinkoLanding, bucketCount: number): number {
  const at = landing.landedAt.getTime();
  const lit = litBucketAt(at, bucketCount);
  const sinceStep = ((at % CHASE_STEP_MS) + CHASE_STEP_MS) % CHASE_STEP_MS;
  if (sinceStep < CHASE_DISPLAY_LAG_MS && landing.bucket === litBucketAt(at - CHASE_STEP_MS, bucketCount)) {
    return landing.bucket;
  }
  return lit;
}

export function entriesFor(profile: PlinkoProfile, bucket: number, litBucket: number): number {
  return bucket === litBucket ? profile.litBucketEntries : profile.standardBucketEntries;
}

export type PlinkoDecision =
  | { accepted: true; gameModeActive: true; bucket: number; litBucket: number; bucketCount: number; entriesAwarded: number }
  | { accepted: true; gameModeActive: false; bucket: number; bucketCount: number }
  | { accepted: false; reason: string };

/**
 * Everything that can be decided without touching Dataverse. With Game Mode off the landing is
 * still valid (the display shows the bucket) but earns and records nothing.
 */
export function judgePlinkoLanding(landing: PlinkoLanding, profile: PlinkoProfile, now: Date = new Date()): PlinkoDecision {
  const stale = checkFreshness(landing.landedAt, now);
  if (stale) return { accepted: false, reason: stale };

  const bucketCount = profile.bucketCount ?? landing.bucketCount;
  if (bucketCount === null) return { accepted: false, reason: "station has no bucket count" };
  if (landing.bucket > bucketCount) {
    return { accepted: false, reason: `bucket ${landing.bucket} is outside 1..${bucketCount}` };
  }

  if (!profile.gameModeActive) {
    return { accepted: true, gameModeActive: false, bucket: landing.bucket, bucketCount };
  }

  const litBucket = resolveLitBucket(landing, bucketCount);
  return {
    accepted: true,
    gameModeActive: true,
    bucket: landing.bucket,
    litBucket,
    bucketCount,
    entriesAwarded: entriesFor(profile, landing.bucket, litBucket),
  };
}

/** Primary name of a Plinko Play row. */
export function playName(stationSlug: string, bucket: number, landedAt: Date): string {
  return `${stationSlug} · bucket ${bucket} · ${landedAt.toISOString()}`.slice(0, 200);
}

/** How long a win holds the screen. The display resets after 45 s, so this is only a backstop. */
export const LOCK_TTL_MS = 60 * 1000;

/** One win at a time per station: the QR on screen holds the board until it is claimed or cleared. */
export interface PlinkoLock {
  eventId: string;
  claimToken: string;
  expiresAt: number;
  released: boolean;
}

export function parsePlinkoLock(value: unknown): PlinkoLock | null {
  const v = value as Partial<PlinkoLock> | null;
  if (
    !v ||
    typeof v.eventId !== "string" ||
    typeof v.claimToken !== "string" ||
    typeof v.expiresAt !== "number" ||
    typeof v.released !== "boolean"
  ) {
    return null;
  }
  return { eventId: v.eventId, claimToken: v.claimToken, expiresAt: v.expiresAt, released: v.released };
}

/** True while the lock's win is still on screen: not released, not expired, and its claim not yet claimed. */
export function lockHolds(lock: PlinkoLock | null, claimUnclaimed: boolean, now: number = Date.now()): boolean {
  return !!lock && !lock.released && now < lock.expiresAt && claimUnclaimed;
}

export function lockPath(stationSlug: string): string {
  return `plinko/lock-${stationSlug.toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 60)}.json`;
}
