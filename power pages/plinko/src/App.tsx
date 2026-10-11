import { useCallback, useEffect, useRef, useState } from "react";
import { ChaseBoard } from "./components/ChaseBoard";
import { GuideDialog } from "./components/GuideDialog";
import { WinCelebration } from "./components/WinCelebration";
import { useSignalR } from "./context/SignalRContext";
import { STATION_SLUG } from "./lib/apiConfig";
import { releaseWin, useWinStillActive } from "./lib/lock";
import logoWhite from "./assets/brand/andworx-white.svg";
import type { PlinkoResult } from "./types/plinko";

const DEMO_BUCKET_COUNT = 5;

function isPlinkoResult(value: unknown): value is PlinkoResult {
  const v = value as Partial<PlinkoResult> | null;
  return !!v && typeof v.stationSlug === "string" && typeof v.eventId === "string" && typeof v.claimToken === "string" &&
    Number.isInteger(v.bucket) && Number.isInteger(v.litBucket) && Number.isInteger(v.bucketCount) && Number.isInteger(v.entriesAwarded);
}

/**
 * Plinko booth display. Idle: the live chase light across the buckets, with the how-it-works
 * guide behind a gear. When the backend accepts a landing for this station, it broadcasts
 * `plinkoResult` on the shared `gamebox` hub and the screen switches to the celebration + QR
 * until the player scans, skips, or the countdown ends. While that result is shown, newer
 * landings are held by the backend and ignored by the display.
 */
export default function App() {
  const { connection, isConnected } = useSignalR();
  const [result, setResult] = useState<PlinkoResult | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const shown = useRef<PlinkoResult | null>(null);
  shown.current = result;
  // Skip or the countdown ending: free the board for the next drop, then clear the screen.
  const dismiss = useCallback(() => {
    if (shown.current) releaseWin(shown.current);
    setResult(null);
  }, []);
  // Claimed on the phone (or expired on the server): the backend has already freed the board.
  const clear = useCallback(() => setResult(null), []);
  useWinStillActive(result, clear);

  useEffect(() => {
    if (!connection) return;
    const handler = (payload: unknown) => {
      if (!isPlinkoResult(payload)) {
        console.warn("Ignoring malformed plinkoResult", payload);
        return;
      }
      if (payload.stationSlug !== STATION_SLUG) return;
      // One win at a time: the backend refuses new drops while a QR is up, and so does the screen.
      if (shown.current && shown.current.eventId !== payload.eventId) return;
      setGuideOpen(false);
      setResult(payload);
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
      <header className="topbar">
        <img className="brand" src={logoWhite} alt="Andworx" />
        <button type="button" className="gear" onClick={() => setGuideOpen(true)} aria-label="How it works">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.4 5.1-1.7-1a7 7 0 0 0 0-1.2l1.7-1a.7.7 0 0 0 .2-.9l-1.6-2.8a.7.7 0 0 0-.9-.3l-1.9.7a7 7 0 0 0-1-.6l-.3-2a.7.7 0 0 0-.7-.6h-3.2a.7.7 0 0 0-.7.6l-.3 2a7 7 0 0 0-1 .6l-1.9-.7a.7.7 0 0 0-.9.3L3.4 9.5a.7.7 0 0 0 .2.9l1.7 1a7 7 0 0 0 0 1.2l-1.7 1a.7.7 0 0 0-.2.9l1.6 2.8c.2.3.6.4.9.3l1.9-.7c.3.2.6.4 1 .6l.3 2c0 .3.4.6.7.6h3.2c.4 0 .7-.3.7-.6l.3-2c.4-.2.7-.4 1-.6l1.9.7c.3.1.7 0 .9-.3l1.6-2.8c.2-.3.1-.7-.2-.9Z" />
          </svg>
        </button>
      </header>

      <section className="stage">
        <h1>Drop a puck. Hit the lit bucket for bonus entries.</h1>
        <ChaseBoard />
      </section>

      {guideOpen && <GuideDialog onClose={closeGuide} />}
      {result && <WinCelebration result={result} onDone={dismiss} />}
      <div className="connection" data-connected={isConnected} title={isConnected ? "Live" : "Reconnecting"}>
        <span aria-hidden="true" />
        {isConnected ? "Live" : "Reconnecting…"}
      </div>
    </main>
  );
}
