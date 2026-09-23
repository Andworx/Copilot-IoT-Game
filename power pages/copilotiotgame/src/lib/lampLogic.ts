import type { DeviceState, LampColor } from "../types/game";

/**
 * TS mirror of hardware/raspberry-pi/lamp_patterns.py's `evaluate_lamps`, so every mode's
 * on-screen lamps show the same condition and blink intent as the physical panel's LED1-4.
 * Kept in sync by hand with each mode's `lamps` block in logic_maps/<slug>.json — see
 * hardware/raspberry-pi/MODE-DIFFERENTIATION-PLAN.md. `blink`/`fast_blink` render as real
 * on/off blinking in theme.css (`.lamp-dot[data-state="amber"|"red"]`), timed to match the
 * Pi's gpiozero `LED.blink()` on_time/off_time exactly (0.5s / 0.15s).
 */
export type LampPattern = "on" | "blink" | "fast_blink";

export interface LampRule {
  key: string;
  label: string;
  when: (s: DeviceState) => boolean;
  pattern: LampPattern;
}

const PATTERN_COLOR: Record<LampPattern, LampColor> = {
  on: "green",
  blink: "amber",
  fast_blink: "red",
};

/** Restored always means all lamps solid green, matching the Pi's win override. */
export function evaluateLamps(rules: readonly LampRule[], state: DeviceState, win: boolean): Record<string, LampColor> {
  const result: Record<string, LampColor> = {};
  for (const rule of rules) {
    const active = win || rule.when(state);
    result[rule.key] = active ? PATTERN_COLOR[win ? "on" : rule.pattern] : "off";
  }
  return result;
}

export function lampDefs(rules: readonly LampRule[]) {
  return rules.map(({ key, label }) => ({ key, label }));
}
