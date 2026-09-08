import { useEffect, useRef, useState } from "react";
import type { Prize } from "../types/prize";
import { pickWeightedPrize } from "../data/prizes";

interface PrizeWheelProps {
  prizes: Prize[];
  onResult: (prize: Prize) => void;
}

const SIZE = 220;

/**
 * Canvas wheel — visual theater only. The prize is chosen before the animation starts
 * (client-side here; server-side once the claim endpoint exists — PRIZE_ENGINE_SPEC.md
 * §1.2/§1.3) so the spin can never land on a result the backend didn't already commit to.
 */
export function PrizeWheel({ prizes, onResult }: PrizeWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);

  const drawWheel = (rotation: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = canvas.width / 2 - 4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    let start = -Math.PI / 2;
    for (const p of prizes) {
      const slice = (p.weight / totalWeight) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.fillStyle = p.color;
      ctx.arc(0, 0, radius, start, start + slice);
      ctx.closePath();
      ctx.fill();
      start += slice;
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
  }, []);

  function angleForIndex(index: number) {
    let start = 0;
    for (let i = 0; i < index; i++) start += (prizes[i].weight / totalWeight) * Math.PI * 2;
    return start + (prizes[index].weight / totalWeight) * Math.PI;
  }

  function handleSpin() {
    if (spinning) return;
    setSpinning(true);

    const chosen = pickWeightedPrize(prizes);
    const chosenIndex = prizes.indexOf(chosen);
    const targetSliceAngle = angleForIndex(chosenIndex);

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
