import { useCallback, useEffect, useState } from "react";
import type { WalkthroughStep } from "../data/walkthrough";

const AUTO_ADVANCE_MS = 9000;

/**
 * Shared walkthrough engine: step navigation, auto-play and cleanup. It holds no
 * architecture content; a dataset supplies steps. `index === -1` means inactive.
 * The timer is owned by an effect, so exiting, changing steps or unmounting the
 * page (including a Demo Mode navigation) always clears it.
 */
export function useWalkthrough(steps: WalkthroughStep[]) {
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const active = index >= 0;
  const last = steps.length - 1;

  // A different dataset must never leave the old step index applied.
  useEffect(() => { setIndex(-1); setPlaying(false); }, [steps]);

  useEffect(() => {
    if (!playing || !active) return;
    if (index >= last) { setPlaying(false); return; }
    const timer = setTimeout(() => setIndex(i => Math.min(i + 1, last)), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [playing, active, index, last]);

  const start = useCallback(() => { setIndex(0); setPlaying(false); }, []);
  const exit = useCallback(() => { setIndex(-1); setPlaying(false); }, []);
  const previous = useCallback(() => setIndex(i => Math.max(i - 1, 0)), []);
  const next = useCallback(() => setIndex(i => Math.min(i + 1, last)), [last]);
  const togglePlaying = useCallback(() => setPlaying(p => !p), []);

  return { index, step: active ? steps[index] : null, total: steps.length, active, playing, start, exit, previous, next, togglePlaying };
}
