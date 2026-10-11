import { useCallback, useEffect, useRef, useState } from "react";
import { BucketHit } from "./components/BucketHit";
import { ChaseBoard } from "./components/ChaseBoard";
import { GuideDialog } from "./components/GuideDialog";
import { WinCelebration } from "./components/WinCelebration";
import { useSignalR } from "./context/SignalRContext";
import { STATION_SLUG } from "./lib/apiConfig";
import { useChase } from "./lib/chase";
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
  const chase = useChase();
  // Staff can flip Game Mode from the Game Box Control app; the server pushes the change here.
  const [gameModeOverride, setGameModeOverride] = useState<boolean | null>(null);
  const gameModeActive = gameModeOverride ?? chase?.gameModeActive ?? true;
  const [guideOpen, setGuideOpen] = useState(false);
  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const shown = useRef<PlinkoResult | null>(null);
  shown.current = result;
  // Skip or the countdown ending: free the board for the next drop, then clear the screen.
  const dismiss = useCallback(() => {
    // A Game Mode off "hit" holds nothing on the server, so there is nothing to release.
    if (shown.current && shown.current.gameModeActive !== false) releaseWin(shown.current);
    setResult(null);
  }, []);
  // Claimed on the phone (or expired on the server): the backend has already freed the board.
  const clear = useCallback(() => setResult(null), []);
  useWinStillActive(result && result.gameModeActive !== false ? result : null, clear);

  useEffect(() => {
    if (!connection) return;
    const handler = (payload: unknown) => {
      if (!isPlinkoResult(payload)) {
        console.warn("Ignoring malformed plinkoResult", payload);
        return;
      }
      if (payload.stationSlug !== STATION_SLUG) return;
      // One win at a time: the backend refuses new drops while a QR is up, and so does the screen.
      if (shown.current && shown.current.gameModeActive !== false && shown.current.eventId !== payload.eventId) return;
      setGuideOpen(false);
      setResult(payload);
    };
    const modeHandler = (payload: unknown) => {
      const v = payload as { stationSlug?: unknown; gameModeActive?: unknown } | null;
      if (v && v.stationSlug === STATION_SLUG && typeof v.gameModeActive === "boolean") setGameModeOverride(v.gameModeActive);
    };
    connection.on("plinkoResult", handler);
    connection.on("plinkoGameModeChanged", modeHandler);
    return () => {
      connection.off("plinkoResult", handler);
      connection.off("plinkoGameModeChanged", modeHandler);
    };
  }, [connection]);

  // Dev-only preview: number keys simulate a landing in that bucket (bucket 3 lit); H shows the Game Mode off screen.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      const bucket = Number(e.key);
      if (e.key === "Escape") clear();
      if (e.key === "h") {
        // Game Mode off preview: just the bucket.
        setResult({
          stationSlug: STATION_SLUG,
          eventId: crypto.randomUUID(),
          bucket: 4,
          litBucket: 0,
          bucketCount: DEMO_BUCKET_COUNT,
          entriesAwarded: 0,
          claimToken: "",
          gameModeActive: false,
        });
        return;
      }
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
            <circle cx="12" cy="12" r="6.4" strokeWidth="2.4" />
            <circle cx="12" cy="12" r="9.2" strokeWidth="3.2" strokeDasharray="3.6 3.6" />
            <circle cx="12" cy="12" r="2.4" strokeWidth="2" />
          </svg>
        </button>
      </header>

      <section className="stage">
        <h1>{gameModeActive ? "Drop a puck. Hit the lit bucket for bonus entries." : "Drop a puck. See which bucket you hit."}</h1>
        <ChaseBoard chase={chase} gameModeActive={gameModeActive} />
      </section>

      {guideOpen && <GuideDialog onClose={closeGuide} />}
      {result && result.gameModeActive === false && <BucketHit result={result} onDone={dismiss} />}
      {result && result.gameModeActive !== false && <WinCelebration result={result} onDone={dismiss} />}
      <div className="connection" data-connected={isConnected} title={isConnected ? "Live" : "Reconnecting"}>
        <span aria-hidden="true" />
        {isConnected ? "Live" : "Reconnecting…"}
      </div>
    </main>
  );
}
