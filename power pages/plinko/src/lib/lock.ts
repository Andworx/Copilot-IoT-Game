import { useEffect } from "react";
import { API_BASE_URL } from "./apiConfig";
import type { PlinkoResult } from "../types/plinko";

const POLL_MS = 2000;

/** Tells the backend this win is off the screen, so the board accepts the next drop. */
export function releaseWin(result: PlinkoResult): void {
  void fetch(`${API_BASE_URL}/api/plinko-release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ station: result.stationSlug, eventId: result.eventId }),
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * While a win is on screen, watches whether it is still the live one. The backend says no once the
 * prize has been claimed on the phone (or the hold expired), and the screen clears itself. A failed
 * check leaves the win up: only an explicit "not active" clears it.
 */
export function useWinStillActive(result: PlinkoResult | null, onGone: () => void): void {
  useEffect(() => {
    // The dev preview (number keys) fakes landings the backend has never heard of.
    if (!result || import.meta.env.DEV) return;
    let cancelled = false;
    const check = async () => {
      try {
        const url = `${API_BASE_URL}/api/plinko-lock?station=${encodeURIComponent(result.stationSlug)}&eventId=${encodeURIComponent(result.eventId)}`;
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { active?: boolean };
        if (!cancelled && body.active === false) onGone();
      } catch {
        // Offline blip: keep showing the QR.
      }
    };
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [result, onGone]);
}
