import { useChase } from "../lib/chase";

/**
 * The chase light, live on this screen: the lit bucket is the one that counts if the puck
 * lands now. The schedule comes from the backend (`plinko-chase`), which scores landings
 * against the same clock; the board itself has no lights.
 */
export function ChaseBoard() {
  const chase = useChase();
  if (!chase) return null;
  const buckets = Array.from({ length: chase.bucketCount }, (_, i) => i + 1);
  return (
    <ol className="chase-board" aria-label={`Bucket ${chase.litBucket} is lit`}>
      {buckets.map((b) => (
        <li key={b} data-lit={b === chase.litBucket}>
          <span>{b}</span>
        </li>
      ))}
    </ol>
  );
}
