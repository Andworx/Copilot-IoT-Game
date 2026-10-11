/**
 * The Plinko chase light. The booth display sweeps a light across the buckets; whichever one
 * is lit when the puck lands is the lit bucket. Nothing is sent per step: the position is a
 * pure function of the clock, so the display draws it and the backend scores a landing against
 * the same schedule. Keep power pages/plinko/src/lib/chase.ts in sync.
 */

/** How long the light rests on each bucket. */
export const CHASE_STEP_MS = 1000;

/** 1-based bucket that is lit at `timeMs` (epoch ms) on a board with `bucketCount` buckets. */
export function litBucketAt(timeMs: number, bucketCount: number, stepMs: number = CHASE_STEP_MS): number {
  const count = Math.max(1, Math.floor(bucketCount));
  return (Math.floor(timeMs / stepMs) % count) + 1;
}
