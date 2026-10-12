import { useEffect, useRef } from "react";
import logoBlue from "../assets/brand/andworx-blue.svg";
import type { PlinkoResult } from "../types/plinko";

/** Long enough to read from across a booth; there is no QR to scan in this mode. */
const SHOW_MS = 6000;

/** Game Mode off: simply shows which bucket the puck landed in. Nothing is earned or recorded. */
export function BucketHit({ result, onDone }: { result: PlinkoResult; onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // A new drop replaces this one, so restart the timer with it.
  useEffect(() => {
    const id = setTimeout(() => onDoneRef.current(), SHOW_MS);
    return () => clearTimeout(id);
  }, [result.eventId]);

  const buckets = Array.from({ length: result.bucketCount }, (_, i) => i + 1);
  return (
    <section className="win" role="dialog" aria-modal="true" aria-label={`You hit bucket ${result.bucket}`} onClick={onDone}>
      <div className="hit-card">
        <img className="win-brand" src={logoBlue} alt="Andworx" />
        <span className="eyebrow">You hit</span>
        <h2>Bucket {result.bucket}</h2>
        <ol className="bucket-row" aria-label="Buckets">
          {buckets.map((b) => (
            <li key={b} data-landed={b === result.bucket}>
              <span>{b}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
