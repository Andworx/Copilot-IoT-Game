/**
 * Pure helpers for the Plinko landing pipeline (no Azure/Dataverse imports, so they are
 * unit-testable). The payload is what hardware/plinko-pi/plinko_trigger.py publishes and
 * the result is what power pages/plinko/src/types/plinko.ts expects -- keep them in sync.
 * See power pages/docs/PLINKO_GAME_PLAN.md §4.
 */

import { litBucketAt } from "./plinkoChase";

export const PLINKO_LANDING_TYPE = "plinkoLanding";
export const PLINKO_RESULT_TARGET = "plinkoResult";
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
}

export function isPlinkoLanding(payload: unknown): boolean {
  return !!payload && typeof payload === "object" && (payload as { type?: unknown }).type === PLINKO_LANDING_TYPE;
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
 */
export function resolveLitBucket(landing: PlinkoLanding, bucketCount: number): number {
  return litBucketAt(landing.landedAt.getTime(), bucketCount);
}

export function entriesFor(profile: PlinkoProfile, bucket: number, litBucket: number): number {
  return bucket === litBucket ? profile.litBucketEntries : profile.standardBucketEntries;
}

export type PlinkoDecision =
  | { accepted: true; bucket: number; litBucket: number; bucketCount: number; entriesAwarded: number }
  | { accepted: false; reason: string };

/** Everything that can be decided without touching Dataverse. */
export function judgePlinkoLanding(landing: PlinkoLanding, profile: PlinkoProfile, now: Date = new Date()): PlinkoDecision {
  if (!profile.gameModeActive) return { accepted: false, reason: `station "${profile.slug}" is not active` };

  const stale = checkFreshness(landing.landedAt, now);
  if (stale) return { accepted: false, reason: stale };

  const bucketCount = profile.bucketCount ?? landing.bucketCount;
  if (bucketCount === null) return { accepted: false, reason: "station has no bucket count" };
  if (landing.bucket > bucketCount) {
    return { accepted: false, reason: `bucket ${landing.bucket} is outside 1..${bucketCount}` };
  }

  const litBucket = resolveLitBucket(landing, bucketCount);

  return {
    accepted: true,
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
