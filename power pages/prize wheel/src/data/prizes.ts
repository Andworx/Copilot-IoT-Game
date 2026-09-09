import type { Prize } from "../types/prize";

/**
 * The actual weighted pick moved server-side (azure/src/functions/claimPrize.ts,
 * PRIZE_ENGINE_SPEC.md §1.2/§1.3) once andy_prize existed -- this file no longer
 * decides anything, it just turns the names GET /api/prizes returns into wheel
 * slices with a color. Known names keep their original colors from the prototype;
 * anything new cycles through FALLBACK_COLORS so a newly-added andy_prize row still
 * renders sensibly without a code change.
 */
const KNOWN_COLORS: Record<string, string> = {
  "Sticker Pack": "#3a4a5c",
  "Andworx T-Shirt": "#4c8dff",
  "$25 Gift Card": "#2f6e64",
  "Wireless Earbuds": "#c9a227",
  "Grand Prize: Conference Pass": "#d9573b",
};

const FALLBACK_COLORS = ["#3a4a5c", "#4c8dff", "#2f6e64", "#c9a227", "#d9573b", "#7c6ff2", "#22c55e"];

export function toWheelPrizes(names: string[]): Prize[] {
  return names.map((name, i) => ({
    name,
    color: KNOWN_COLORS[name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));
}
