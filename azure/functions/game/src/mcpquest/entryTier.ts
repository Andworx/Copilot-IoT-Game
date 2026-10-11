/**
 * Score to grand-prize entries for agent-generated MCP Quest games.
 *
 * Every generated game is scored out of 100. Everyone who submits gets a Prize Claim (and so
 * a Prize Wheel QR); the score decides how many grand-prize entries the claim is worth:
 *
 *   90-100  the most entries the campaign allows
 *   70-89   one fewer than that
 *   0-69    one entry
 *
 * The campaign's per-contact cap is the "most the campaign allows". With a cap of 1 or 2 the
 * tiers collapse (1 -> 1/1/1, 2 -> 2/1/1).
 */

export const TOP_TIER_MIN_SCORE = 90;
export const MID_TIER_MIN_SCORE = 70;

export type EntryTier = "top" | "mid" | "base";

export interface EntryAward {
  tier: EntryTier;
  /** Entries the claim is worth, before the contact's existing entries are taken into account. */
  entries: number;
}

/** Scores shown to the player are whole numbers, so tiers use the rounded score. */
export function entryTierFor(score: number): EntryTier {
  const s = Math.round(score);
  if (s >= TOP_TIER_MIN_SCORE) return "top";
  if (s >= MID_TIER_MIN_SCORE) return "mid";
  return "base";
}

/**
 * @param score 0-100 game score
 * @param maxEntries the campaign's per-contact entry cap (whole number, at least 1)
 */
export function entriesForScore(score: number, maxEntries: number): EntryAward {
  if (!Number.isFinite(score)) throw new Error("score must be a number");
  if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new Error("maxEntries must be a whole number of at least 1");
  const tier = entryTierFor(score);
  const entries = tier === "top" ? maxEntries : tier === "mid" ? Math.max(1, maxEntries - 1) : 1;
  return { tier, entries };
}
