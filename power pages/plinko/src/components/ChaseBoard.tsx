import { useChase } from "../lib/chase";

/** Shown dimmed until the schedule loads, so a backend problem is visible instead of an empty screen. */
const PLACEHOLDER_BUCKETS = 6;

/**
 * The chase light, live on this screen: the lit bucket is the one that counts if the puck
 * lands now. The schedule comes from the backend (`plinko-chase`), which scores landings
 * against the same clock; the board itself has no lights.
 */
export function ChaseBoard() {
  const chase = useChase();
  const count = chase?.bucketCount ?? PLACEHOLDER_BUCKETS;
  const buckets = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <ol
      className="chase-board"
      data-ready={chase !== null}
      aria-label={chase ? `Bucket ${chase.litBucket} is lit` : "Connecting to the board"}
    >
      {buckets.map((b) => (
        <li key={b} data-lit={chase?.litBucket === b}>
          <span>{b}</span>
        </li>
      ))}
    </ol>
  );
}
