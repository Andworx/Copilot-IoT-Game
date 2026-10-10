import { useCallback, useEffect, useState } from "react";
import { FlowInfographic } from "./components/FlowInfographic";
import { WinCelebration } from "./components/WinCelebration";
import { useSignalR } from "./context/SignalRContext";
import { STATION_SLUG } from "./lib/apiConfig";
import type { PlinkoResult } from "./types/plinko";

const DEMO_BUCKET_COUNT = 5;

function isPlinkoResult(value: unknown): value is PlinkoResult {
  const v = value as Partial<PlinkoResult> | null;
  return !!v && typeof v.stationSlug === "string" && typeof v.eventId === "string" && typeof v.claimToken === "string" &&
    Number.isInteger(v.bucket) && Number.isInteger(v.litBucket) && Number.isInteger(v.bucketCount) && Number.isInteger(v.entriesAwarded);
}

/**
 * Plinko booth display. Idle: the how-it-works infographic. When the backend accepts a
 * landing for this station it broadcasts `plinkoResult` on the shared `gamebox` hub and
 * the screen switches to the celebration + QR until the player scans, skips, or the
 * countdown ends. The newest landing always replaces the one on screen.
 */
export default function App() {
  const { connection, isConnected } = useSignalR();
  const [result, setResult] = useState<PlinkoResult | null>(null);
  const clear = useCallback(() => setResult(null), []);

  useEffect(() => {
    if (!connection) return;
    const handler = (payload: unknown) => {
      if (!isPlinkoResult(payload)) {
        console.warn("Ignoring malformed plinkoResult", payload);
        return;
      }
      if (payload.stationSlug === STATION_SLUG) setResult(payload);
    };
    connection.on("plinkoResult", handler);
    return () => connection.off("plinkoResult", handler);
  }, [connection]);

  // Dev-only preview: number keys simulate a landing in that bucket (bucket 3 lit).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      const bucket = Number(e.key);
      if (e.key === "Escape") clear();
      if (!Number.isInteger(bucket) || bucket < 1 || bucket > DEMO_BUCKET_COUNT) return;
      const litBucket = 3;
      setResult({
        stationSlug: STATION_SLUG,
        eventId: crypto.randomUUID(),
        bucket,
        litBucket,
        bucketCount: DEMO_BUCKET_COUNT,
        entriesAwarded: bucket === litBucket ? 3 : 1,
        claimToken: crypto.randomUUID(),
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  return (
    <main className="plinko-screen">
      <FlowInfographic />
      {result && <WinCelebration result={result} onDone={clear} />}
      <div className="connection" data-connected={isConnected} title={isConnected ? "Live" : "Reconnecting"}>
        <span aria-hidden="true" />
        {isConnected ? "Live" : "Reconnecting…"}
      </div>
    </main>
  );
}
