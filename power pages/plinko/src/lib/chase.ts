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

const RESYNC_MS = 5 * 60 * 1000;
const TICK_MS = 100;

async function fetchSchedule(): Promise<ChaseSchedule> {
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
  };
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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (!schedule) return null;
  return {
    litBucket: litBucketAt(now + schedule.offsetMs, schedule.bucketCount, schedule.stepMs),
    bucketCount: schedule.bucketCount,
    gameModeActive: schedule.gameModeActive,
    bucketIcons: schedule.bucketIcons,
  };
}
