import { useEffect, useState } from "react";
import { API_BASE_URL, STATION_SLUG } from "./apiConfig";

/** Mirrors azure/functions/game/src/lib/plinkoChase.ts: the lit bucket is a pure function of the clock. */
export function litBucketAt(timeMs: number, bucketCount: number, stepMs: number): number {
  const count = Math.max(1, Math.floor(bucketCount));
  return (Math.floor(timeMs / stepMs) % count) + 1;
}

interface ChaseSchedule {
  bucketCount: number;
  stepMs: number;
  /** False when staff have turned Game Mode off for this station. */
  gameModeActive: boolean;
  /** Ordered icon ids, one per bucket. */
  bucketIcons: string[];
  /** Server clock minus this device's clock, so the light matches the backend's. */
  offsetMs: number;
}

const RESYNC_MS = 60 * 1000;
/** Clock samples per sync; the quickest round trip has the least uncertainty about when the server stamped. */
const SYNC_SAMPLES = 3;

async function fetchSample(): Promise<ChaseSchedule & { roundTripMs: number }> {
  const sentAt = Date.now();
  const response = await fetch(`${API_BASE_URL}/api/plinko-chase?station=${encodeURIComponent(STATION_SLUG)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`plinko-chase ${response.status}`);
  const body = (await response.json()) as {
    serverTime: number;
    stepMs: number;
    bucketCount: number;
    gameModeActive?: boolean;
    bucketIcons?: string[];
  };
  const receivedAt = Date.now();
  // Assume the server stamped the reply halfway through the round trip.
  return {
    bucketCount: body.bucketCount,
    stepMs: body.stepMs,
    gameModeActive: body.gameModeActive !== false,
    bucketIcons: Array.isArray(body.bucketIcons) ? body.bucketIcons : [],
    offsetMs: body.serverTime - (sentAt + receivedAt) / 2,
    roundTripMs: receivedAt - sentAt,
  };
}

async function fetchSchedule(): Promise<ChaseSchedule> {
  let best: Awaited<ReturnType<typeof fetchSample>> | null = null;
  for (let i = 0; i < SYNC_SAMPLES; i++) {
    const sample = await fetchSample();
    if (!best || sample.roundTripMs < best.roundTripMs) best = sample;
  }
  return best!;
}

/**
 * The chase light for this station: which bucket is lit right now. Null until the schedule has
 * loaded (or if the backend is unreachable), so the screen never shows a made-up lit bucket.
 */
export function useChase(): { litBucket: number; bucketCount: number; gameModeActive: boolean; bucketIcons: string[] } | null {
  const [schedule, setSchedule] = useState<ChaseSchedule | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const sync = (delay: number) => {
      timer = setTimeout(async () => {
        try {
          const next = await fetchSchedule();
          if (!cancelled) setSchedule(next);
          sync(RESYNC_MS);
        } catch {
          sync(10_000);
        }
      }, delay);
    };
    sync(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Redraw exactly when the server's clock crosses into the next step, so the light changes
  // when the backend's scoring does rather than up to a poll interval later.
  useEffect(() => {
    if (!schedule) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const serverNow = Date.now() + schedule.offsetMs;
      setNow(Date.now());
      const untilNextStep = schedule.stepMs - (serverNow % schedule.stepMs);
      timer = setTimeout(tick, untilNextStep + 2);
    };
    tick();
    return () => clearTimeout(timer);
  }, [schedule]);

  if (!schedule) return null;
  return {
    litBucket: litBucketAt(now + schedule.offsetMs, schedule.bucketCount, schedule.stepMs),
    bucketCount: schedule.bucketCount,
    gameModeActive: schedule.gameModeActive,
    bucketIcons: schedule.bucketIcons,
  };
}
