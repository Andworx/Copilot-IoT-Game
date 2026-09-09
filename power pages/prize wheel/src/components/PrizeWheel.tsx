import { useEffect, useRef, useState } from "react";
import type { Prize } from "../types/prize";

interface PrizeWheelProps {
  prizes: Prize[];
  /** Name of the prize the claim endpoint already picked (PRIZE_ENGINE_SPEC.md §1.2/
   * §1.3) -- the wheel just animates to it, it never decides the outcome itself. */
  winningPrizeName: string;
  onResult: (prize: Prize) => void;
}

const SIZE = 220;

/**
 * Canvas wheel — visual theater only. The prize was already chosen server-side
 * (claim-prize, called before this component mounts) so the spin can never land on a
 * result the backend didn't already commit to. Slices are drawn equal-sized since the
 * real odds (andy_weight) are a server-only concept now — the client never receives
 * them.
 */
export function PrizeWheel({ prizes, winningPrizeName, onResult }: PrizeWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const [spinning, setSpinning] = useState(false);

  const drawWheel = (rotation: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = canvas.width / 2 - 4;
    const sliceAngle = (Math.PI * 2) / prizes.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    let start = -Math.PI / 2;
    for (const p of prizes) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.fillStyle = p.color;
      ctx.arc(0, 0, radius, start, start + sliceAngle);
      ctx.closePath();
      ctx.fill();
      start += sliceAngle;
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fillStyle = "#080c08";
    ctx.fill();
  };

  useEffect(() => {
    drawWheel(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prizes]);

  function handleSpin() {
    if (spinning) return;

    const chosenIndex = prizes.findIndex((p) => p.name === winningPrizeName);
    if (chosenIndex === -1) {
      console.error(`winningPrizeName "${winningPrizeName}" isn't in the rendered wheel`);
      return;
    }
    const chosen = prizes[chosenIndex];
    setSpinning(true);

    const sliceAngle = (Math.PI * 2) / prizes.length;
    const targetSliceAngle = chosenIndex * sliceAngle + sliceAngle / 2;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const extraSpins = reduceMotion ? 0 : 5;
    const startRotation = rotationRef.current;
    const finalRotation =
      startRotation +
      extraSpins * Math.PI * 2 +
      (Math.PI * 1.5 - targetSliceAngle - (startRotation % (Math.PI * 2)));
    const duration = reduceMotion ? 200 : 3600;
    const delta = finalRotation - startRotation;
    let startTime: number | null = null;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    function frame(ts: number) {
      if (startTime === null) startTime = ts;
      const t = Math.min((ts - startTime) / duration, 1);
      rotationRef.current = startRotation + delta * easeOutCubic(t);
      drawWheel(rotationRef.current);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        setSpinning(false);
        onResult(chosen);
      }
    }
    requestAnimationFrame(frame);
  }

  return (
    <div className="wheel-wrap">
      <div className="wheel-stack">
        <div className="wheel-pointer" aria-hidden="true" />
        <canvas ref={canvasRef} className="wheel-canvas" width={SIZE} height={SIZE} />
      </div>
      <div className="wheel-legend">
        {prizes.map((p) => (
          <span key={p.name}>
            <span className="swatch" style={{ background: p.color }} />
            {p.name}
          </span>
        ))}
      </div>
      <div className="phone-actions">
        <button type="button" className="btn-primary" disabled={spinning} onClick={handleSpin}>
          {spinning ? "Spinning…" : "Spin the wheel"}
        </button>
      </div>
    </div>
  );
}
