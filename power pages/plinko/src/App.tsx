import { useEffect, useMemo, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import QRCode from "qrcode";
import { API_BASE_URL, PRIZE_WHEEL_URL } from "./config";
import type { PlinkoResult } from "./types";
import { BucketBoard } from "./components/BucketBoard";

const BUCKET_COUNT = 6;
const RESET_SECONDS = 45;

const STEPS = [
  "Take one puck from the tray",
  "Drop it from the top slot",
  "Watch it bounce through the pins",
  "The IR beam reads the landing bucket",
  "The display compares it to the lit bucket",
  "Earn entries for the grand-prize drawing",
  "Scan the QR to claim your instant prize",
  "Share contact info only if you want reminders",
  "Staff can review every play in Plinko Backend",
  "The board resets for the next player",
];

function getStationSlug() {
  return new URLSearchParams(window.location.search).get("station") ?? "main";
}

function normalizeResult(value: unknown): PlinkoResult | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const bucket = Number(data.bucket ?? data.bucketNumber ?? data.landedBucket);
  const litBucket = Number(data.litBucket ?? data.bonusBucket);
  const entriesAwarded = Number(data.entriesAwarded ?? data.entries ?? (bucket === litBucket ? 2 : 1));
  if (!Number.isInteger(bucket) || bucket < 1 || bucket > BUCKET_COUNT) return null;
  return {
    station: typeof data.station === "string" ? data.station : undefined,
    stationSlug: typeof data.stationSlug === "string" ? data.stationSlug : undefined,
    bucket,
    litBucket: Number.isInteger(litBucket) && litBucket >= 1 && litBucket <= BUCKET_COUNT ? litBucket : bucket,
    isLitBucket: Boolean(data.isLitBucket ?? bucket === litBucket),
    entriesAwarded: Number.isFinite(entriesAwarded) ? entriesAwarded : 1,
    claimToken: typeof data.claimToken === "string" ? data.claimToken : undefined,
    hardwareEventId: typeof data.hardwareEventId === "string" ? data.hardwareEventId : undefined,
  };
}

function App() {
  const stationSlug = useMemo(getStationSlug, []);
  const [activeStep, setActiveStep] = useState(0);
  const [litBucket, setLitBucket] = useState(3);
  const [result, setResult] = useState<PlinkoResult | null>(null);
  const [remaining, setRemaining] = useState(RESET_SECONDS);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const resetRef = useRef(() => setResult(null));

  resetRef.current = () => {
    setResult(null);
    setQrDataUrl(null);
    setRemaining(RESET_SECONDS);
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveStep((step) => (step + 1) % STEPS.length);
      setLitBucket((bucket) => (bucket % BUCKET_COUNT) + 1);
    }, 1300);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!result) return;
    if (remaining <= 0) {
      resetRef.current();
      return;
    }
    const id = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [remaining, result]);

  useEffect(() => {
    if (!result?.claimToken) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    const claimUrl = `${PRIZE_WHEEL_URL}/?token=${encodeURIComponent(result.claimToken)}`;
    QRCode.toDataURL(claimUrl, { margin: 1, width: 220 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((error) => console.error("Failed to generate Plinko prize QR", error));

    return () => {
      cancelled = true;
    };
  }, [result]);

  useEffect(() => {
    let disposed = false;
    let starting = false;
    let failures = 0;
    let retryTimer: number | undefined;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/api`, { withCredentials: false })
      .withAutomaticReconnect()
      .build();

    function handleResult(payload: unknown) {
      const nextResult = normalizeResult(payload);
      if (!nextResult) return;
      const eventStation = nextResult.stationSlug ?? nextResult.station;
      if (eventStation && eventStation !== stationSlug) return;
      setResult(nextResult);
      setRemaining(RESET_SECONDS);
    }

    function markConnected() {
      if (!disposed) {
        failures = 0;
        setConnected(true);
      }
    }

    function scheduleStart() {
      if (disposed || retryTimer !== undefined) return;
      const delay = Math.min(30000, 5000 * 2 ** Math.min(failures++, 3));
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        void start();
      }, delay);
    }

    async function start() {
      if (disposed || starting || connection.state !== signalR.HubConnectionState.Disconnected) return;
      starting = true;
      try {
        await connection.start();
        markConnected();
      } catch (error) {
        console.error("Failed to connect to Plinko SignalR", error);
        if (!disposed) {
          setConnected(false);
          scheduleStart();
        }
      } finally {
        starting = false;
      }
    }

    connection.on("plinkoResult", handleResult);
    connection.onreconnected(markConnected);
    connection.onreconnecting(() => { if (!disposed) setConnected(false); });
    connection.onclose(() => {
      if (!disposed) {
        setConnected(false);
        scheduleStart();
      }
    });

    void start();

    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      connection.off("plinkoResult", handleResult);
      void connection.stop().catch(() => {});
    };
  }, [stationSlug]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    function simulate(event: KeyboardEvent) {
      const bucket = Number(event.key);
      if (!Number.isInteger(bucket) || bucket < 1 || bucket > BUCKET_COUNT) return;
      setResult({
        stationSlug,
        bucket,
        litBucket,
        isLitBucket: bucket === litBucket,
        entriesAwarded: bucket === litBucket ? 2 : 1,
        claimToken: `dev-${stationSlug}-${Date.now()}`,
        hardwareEventId: `keyboard-${Date.now()}`,
      });
      setRemaining(RESET_SECONDS);
    }
    window.addEventListener("keydown", simulate);
    return () => window.removeEventListener("keydown", simulate);
  }, [litBucket, stationSlug]);

  const showWin = result !== null;
  const displayedLitBucket = result?.litBucket ?? litBucket;

  return (
    <main className={showWin ? "plinko-page win-mode" : "plinko-page"}>
      <section className="hero-panel" aria-live="polite">
        <div className="status-strip">
          <span>Station {stationSlug}</span>
          <span className={connected ? "signal online" : "signal"}>{connected ? "Live" : "Waiting"}</span>
        </div>

        <div className="display-grid">
          <div className="instruction-panel">
            <p className="eyebrow">Plinko challenge</p>
            <h1>{showWin ? "Bucket landed" : "Drop the puck"}</h1>
            {!showWin && <p className="lede">Follow the traveling light. Match the lit bucket for bonus grand-prize entries.</p>}
            {showWin && result && (
              <p className="lede">Bucket {result.bucket} earned {result.entriesAwarded} {result.entriesAwarded === 1 ? "entry" : "entries"}. {result.isLitBucket ? "Bonus bucket hit." : "Standard landing."}</p>
            )}
          </div>

          <BucketBoard activeBucket={(activeStep % BUCKET_COUNT) + 1} litBucket={displayedLitBucket} landedBucket={result?.bucket} />

          {!showWin && (
            <ol className="step-list" aria-label="How to play Plinko">
              {STEPS.map((step, index) => (
                <li className={index === activeStep ? "step-active" : ""} key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {step}
                </li>
              ))}
            </ol>
          )}

          {showWin && result && (
            <div className="win-panel">
              <div className="burst" aria-hidden="true">
                {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
              </div>
              <p className="eyebrow">Prize unlock</p>
              <h2>{result.entriesAwarded} {result.entriesAwarded === 1 ? "entry" : "entries"} banked</h2>
              <p>Scan the QR to spin for your instant prize, or skip so the next player can drop.</p>
              <div className="qr-card">
                {qrDataUrl ? <img src={qrDataUrl} alt="Scan to open the prize wheel" /> : <span>QR loading</span>}
              </div>
              <div className="win-actions">
                <button type="button" onClick={() => resetRef.current()}>Skip</button>
                <span>Reset in {remaining}s</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;