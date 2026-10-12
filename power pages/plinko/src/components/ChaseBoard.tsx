import { iconForBucket } from "../types/plinko";

/** Shown dimmed until the schedule loads, so a backend problem is visible instead of an empty screen. */
const PLACEHOLDER_BUCKETS = 6;

interface ChaseBoardProps {
  /** Null until the schedule has loaded. */
  chase: { litBucket: number; bucketCount: number; bucketIcons: string[] } | null;
  /** With Game Mode off nothing is lit: the board just shows where the puck lands. */
  gameModeActive: boolean;
}

/**
 * The chase light, live on this screen: the lit bucket is the one that counts if the puck
 * lands now. The schedule comes from the backend (`plinko-chase`), which scores landings
 * against the same clock; the board itself has no lights.
 */
export function ChaseBoard({ chase, gameModeActive }: ChaseBoardProps) {
  const count = chase?.bucketCount ?? PLACEHOLDER_BUCKETS;
  const buckets = Array.from({ length: count }, (_, i) => i + 1);
  const lit = gameModeActive ? chase?.litBucket : undefined;
  return (
    <ol
      className="chase-board"
      data-ready={chase !== null}
      aria-label={!chase ? "Connecting to the board" : lit ? `Bucket ${lit} is lit` : "Buckets"}
    >
      {buckets.map((b) => (
        <li key={b} data-lit={lit === b}>
          <img src={iconForBucket(b, chase?.bucketIcons).src} alt="" aria-hidden="true" />
          <span>{b}</span>
        </li>
      ))}
    </ol>
  );
}
