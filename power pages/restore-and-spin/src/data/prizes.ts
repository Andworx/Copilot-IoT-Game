import type { Prize } from "../types/game";

/**
 * TEMPORARY client-side stand-in for `andy_prize`. Weighting and colors match the
 * worked example in PRIZE_ENGINE_SPEC.md §1.2. Once the claim endpoint exists
 * (PRIZE_ENGINE_SPEC.md §1.2/§1.3), the actual pick happens server-side and this file
 * goes away — PlaySpinPage should call that endpoint instead of picking locally.
 */
export const PRIZES: Prize[] = [
  { name: "Sticker Pack", weight: 40, color: "#3a4a5c" },
  { name: "Andworx T-Shirt", weight: 30, color: "#4c8dff" },
  { name: "$25 Gift Card", weight: 18, color: "#2f6e64" },
  { name: "Wireless Earbuds", weight: 9, color: "#c9a227" },
  { name: "Grand Prize: Conference Pass", weight: 3, color: "#d9573b" },
];

export function pickWeightedPrize(prizes: Prize[]): Prize {
  const total = prizes.reduce((sum, p) => sum + p.weight, 0);
  const r = Math.random() * total;
  let running = 0;
  for (const p of prizes) {
    running += p.weight;
    if (r <= running) return p;
  }
  return prizes[prizes.length - 1];
}
