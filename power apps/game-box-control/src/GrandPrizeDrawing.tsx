import { useEffect, useRef, useState } from "react";
import { staffRequest } from "./apiConfig";
import aiBuilderLogo from "./assets/logos/AIBuilder_scalable.svg";
import dataverseLogo from "./assets/logos/Dataverse_scalable.svg";
import powerAppsLogo from "./assets/logos/PowerApps_scalable.svg";
import powerAutomateLogo from "./assets/logos/PowerAutomate_scalable.svg";
import powerPagesLogo from "./assets/logos/PowerPages_scalable.svg";
import powerPlatformLogo from "./assets/logos/PowerPlatform_scalable.svg";

interface DrawingSlice {
  contactId: string;
  displayName: string;
  entryCount: number;
  color: string;
  code?: string;
}

interface DrawingLineupResponse {
  campaign?: {
    id: string;
    name: string;
    drawingTime?: string | null;
  };
  registeredContactCount?: number;
  checkedInContactCount?: number;
  checkedInEntryCount?: number;
  slices: DrawingSlice[];
}

interface DrawingStateResponse {
  result?: DrawResult | null;
}

interface DrawResult {
  drawResultId: string;
  winnerContactId: string;
  winnerName: string;
  winnerCode?: string;
  entryCode?: string;
  registrationCode?: string;
  checkInCode?: string;
  prizeCode?: string;
  winningEntryCount: number;
  eligibleContactCount: number;
}

interface GrandPrizeDrawingProps {
  presentationMode?: boolean;
}

const WHEEL_SIZE = 420;
const SAMPLE_REGISTERED_COUNT = 200;
const SAMPLE_CHECKED_IN_COUNT = 100;
const SAMPLE_COLORS = ["#1f8a70", "#f2a541", "#3f6fb5", "#c4515c", "#7b61a8", "#2f9ca0", "#d96b3b", "#5c83c6"];
const CONFETTI_LOGOS = [aiBuilderLogo, dataverseLogo, powerAppsLogo, powerAutomateLogo, powerPagesLogo, powerPlatformLogo];
const SAMPLE_SLICES: DrawingSlice[] = Array.from({ length: SAMPLE_CHECKED_IN_COUNT }, (_, index) => ({
  contactId: `sample-${index + 1}`,
  displayName: `Guest ${String(index + 1).padStart(3, "0")}`,
  entryCount: (index % 3) + 1,
  color: SAMPLE_COLORS[index % SAMPLE_COLORS.length],
  code: `GP-${String(2400 + index + 1).padStart(4, "0")}`,
}));

const CONFETTI = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 8) * 0.32}s`,
  duration: `${5.6 + (index % 5) * 0.45}s`,
  color: SAMPLE_COLORS[index % SAMPLE_COLORS.length],
  logo: CONFETTI_LOGOS[index % CONFETTI_LOGOS.length],
}));

function totalEntries(slices: DrawingSlice[]) {
  return slices.reduce((total, slice) => total + Math.max(0, slice.entryCount), 0);
}

function sliceMidpoint(slices: DrawingSlice[], contactId: string) {
  const total = totalEntries(slices);
  let start = -Math.PI / 2;
  for (const slice of slices) {
    const angle = (Math.PI * 2 * slice.entryCount) / total;
    if (slice.contactId === contactId) return start + angle / 2;
    start += angle;
  }
  return null;
}

function winnerCode(result: DrawResult | null) {
  if (!result) return "";
  return result.winnerCode ?? result.entryCode ?? result.registrationCode ?? result.checkInCode ?? result.prizeCode ?? result.drawResultId;
}

function randomIndex(length: number) {
  if (length <= 1) return 0;
  const values = new Uint32Array(1);
  const max = 0xffffffff - (0xffffffff % length);
  do {
    window.crypto.getRandomValues(values);
  } while (values[0] >= max);
  return values[0] % length;
}

export default function GrandPrizeDrawing({ presentationMode = false }: GrandPrizeDrawingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const [slices, setSlices] = useState<DrawingSlice[]>(SAMPLE_SLICES);
  const [campaignName, setCampaignName] = useState("Grand Prize Preview");
  const [loading, setLoading] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState<string | null>("Preview lineup shown until the grand-prize Functions are deployed.");
  const [result, setResult] = useState<DrawResult | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(SAMPLE_REGISTERED_COUNT);
  const [checkedInCount, setCheckedInCount] = useState(SAMPLE_CHECKED_IN_COUNT);

  const drawWheel = (rotation: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const entries = totalEntries(slices);
    if (!canvas || !ctx || entries <= 0) return;

    const center = canvas.width / 2;
    const radius = canvas.width / 2 - 16;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(rotation);

    let start = -Math.PI / 2;
    for (const slice of slices) {
      const angle = (Math.PI * 2 * slice.entryCount) / entries;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.fillStyle = slice.color;
      ctx.arc(0, 0, radius, start, start + angle);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
      ctx.stroke();
      start += angle;
    }

    ctx.restore();
    ctx.beginPath();
    ctx.arc(center, center, 32, 0, Math.PI * 2);
    ctx.fillStyle = "#11253b";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  };

  useEffect(() => {
    drawWheel(rotationRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slices]);

  useEffect(() => {
    if (!drawing && !spinning && !result) loadLineup({ quiet: true });
    const intervalId = window.setInterval(() => {
      if (!drawing && !spinning && !result) loadLineup({ quiet: true });
    }, 8000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing, spinning, result]);



  useEffect(() => {
    if (!presentationMode) return;
    if (!spinning) void loadDrawingState();
    const intervalId = window.setInterval(() => {
      if (!spinning) void loadDrawingState();
    }, 5000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationMode, result, spinning, slices]);

  async function loadLineup(options: { quiet?: boolean } = {}) {
    if (!options.quiet) setLoading(true);
    if (!options.quiet) setMessage(null);
    if (!options.quiet) {
      setResult(null);
      setRevealOpen(false);
    }
    try {
      const response = await staffRequest("/api/grand-prize/drawing-slices", {
      });
      if (!response.ok) throw new Error(`drawing-slices failed: ${response.status}`);
      const data = (await response.json()) as DrawingLineupResponse;
      setSlices(data.slices);
      setCampaignName(data.campaign?.name ?? "Grand Prize Drawing");
      setRegisteredCount(data.registeredContactCount ?? data.slices.length);
      setCheckedInCount(data.checkedInContactCount ?? data.slices.length);
      setMessage(null);
    } catch (error) {
      if (!options.quiet) {
        setMessage(error instanceof Error ? error.message : "Unable to load the drawing lineup.");
      }
    } finally {
      if (!options.quiet) setLoading(false);
    }
  }

  async function loadDrawingState() {
    try {
      const response = await staffRequest("/api/grand-prize/drawing-state", {
      });
      if (!response.ok) return;
      const data = (await response.json()) as DrawingStateResponse;
      if (data.result && data.result.drawResultId !== result?.drawResultId && !spinning) {
        setMessage(null);
        setResult(data.result);
        setRevealOpen(false);
        animateToWinner(data.result.winnerContactId);
      }
    } catch {
      // Retry on the next authenticated poll; never fall back to the public API.
    }
  }

  async function runDraw() {
    setDrawing(true);
    setMessage(null);
    setResult(null);
    setRevealOpen(false);
    try {
      const response = await staffRequest("/api/grand-prize/draw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`draw failed: ${response.status}`);
      const data = (await response.json()) as DrawResult;
      setResult(data);
      animateToWinner(data.winnerContactId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to run the grand-prize draw.");
    } finally {
      setDrawing(false);
    }
  }

  function previewAnimation() {
    const sampleWinner = slices[randomIndex(slices.length)];
    if (!sampleWinner) return;
    const previewResult: DrawResult = {
      drawResultId: "preview",
      winnerContactId: sampleWinner.contactId,
      winnerName: sampleWinner.displayName,
      winnerCode: sampleWinner.code,
      winningEntryCount: sampleWinner.entryCount,
      eligibleContactCount: slices.length,
    };
    setResult(previewResult);
    setRevealOpen(false);
    setMessage("Animation preview only. No winner was selected or recorded.");
    animateToWinner(sampleWinner.contactId);
  }

  function animateToWinner(contactId: string) {
    if (spinning) return;

    const target = sliceMidpoint(slices, contactId);
    if (target === null) {
      setMessage("The returned winner is not in the loaded wheel lineup.");
      return;
    }

    setSpinning(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const extraSpins = reduceMotion ? 0 : 6;
    const startRotation = rotationRef.current;
    const finalRotation =
      startRotation +
      extraSpins * Math.PI * 2 +
      (Math.PI * 1.5 - target - (startRotation % (Math.PI * 2)));
    const duration = reduceMotion ? 200 : 4200;
    const delta = finalRotation - startRotation;
    let startTime: number | null = null;

    function frame(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      rotationRef.current = startRotation + delta * eased;
      drawWheel(rotationRef.current);
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setSpinning(false);
        setRevealOpen(true);
      }
    }

    requestAnimationFrame(frame);
  }

  const entries = totalEntries(slices);
  const canRun = slices.length > 0 && entries > 0 && !loading && !drawing && !spinning;
  const checkedInEntries = entries;
  const winningSlice = result ? slices.find((slice) => slice.contactId === result.winnerContactId) : null;
  const winningCode = winnerCode(result);

  return (
    <div className="drawing-workspace">
      <section className="drawing-stage" aria-label="Grand prize wheel">
        {revealOpen && result && (
          <div className="winner-celebration" role="dialog" aria-modal="true" aria-labelledby="winner-title">
            <div className="confetti-field" aria-hidden="true">
              {CONFETTI.map((piece) => (
                <span
                  className="confetti-piece"
                  key={piece.id}
                  style={{ left: piece.left, animationDelay: piece.delay, animationDuration: piece.duration, backgroundImage: `url(${piece.logo})` }}
                />
              ))}
            </div>
            <div className="winner-card">
              <span className="winner-slice-token" style={{ background: winningSlice?.color ?? "#f2a541" }} aria-hidden="true" />
              <span className="winner-kicker">Grand prize winner</span>
              <h3 id="winner-title">{result.winnerName}</h3>
              <div className="winner-code" aria-label="Winner code">{winningCode}</div>
              <button type="button" className="secondary-action" onClick={() => setRevealOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
        <div className="drawing-counts" aria-label="Registration counts">
          <div>
            <span>Registered</span>
            <strong>{registeredCount}</strong>
          </div>
          <div>
            <span>Checked in</span>
            <strong>{checkedInCount}</strong>
          </div>
        </div>
        <div className="drawing-wheel-card">
          <div className="drawing-pointer" aria-hidden="true" />
          <canvas ref={canvasRef} className="drawing-wheel" width={WHEEL_SIZE} height={WHEEL_SIZE} />
        </div>
        <div className="drawing-result" aria-live="polite">
          <span className="eyebrow">{campaignName}</span>
          <h2>{result ? "Winner selected" : "Ready for the final draw"}</h2>
          <p>
            {result
              ? `The server-side draw has been recorded. ${result.eligibleContactCount} checked-in contacts were eligible.`
              : `${checkedInEntries} eligible checked-in entries across ${checkedInCount} checked-in contacts.`}
          </p>
        </div>
      </section>

      {!presentationMode && (
        <section className="drawing-controls" aria-label="Drawing controls">
          <div className="drawing-action-row">
            <button type="button" className="danger-action" disabled={!canRun} onClick={runDraw}>
              {drawing ? "Running..." : "Run final draw"}
            </button>
            <button type="button" className="secondary-action" disabled={spinning || drawing} onClick={previewAnimation}>
              Preview animation
            </button>
          </div>
          {message && <p className="drawing-message">{message}</p>}
        </section>
      )}
    </div>
  );
}
