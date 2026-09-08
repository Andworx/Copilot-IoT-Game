interface DialTicksProps {
  size: number;
  startDeg: number;
  endDeg: number;
  count: number;
  rOuter: number;
  rInner: number;
}

/** Tick-mark ring behind the thermostat and field-radio dials — KIOSK_UI_SPEC.md §2.1/§2.5. */
export function DialTicks({ size, startDeg, endDeg, count, rOuter, rInner }: DialTicksProps) {
  const cx = size / 2;
  const cy = size / 2;
  const lines = Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    const deg = startDeg + (endDeg - startDeg) * t;
    const rad = ((deg - 90) * Math.PI) / 180;
    const x1 = cx + rInner * Math.cos(rad);
    const y1 = cy + rInner * Math.sin(rad);
    const x2 = cx + rOuter * Math.cos(rad);
    const y2 = cy + rOuter * Math.sin(rad);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={1.5} />;
  });

  return (
    <div className="dial-ticks">
      <svg viewBox={`0 0 ${size} ${size}`}>{lines}</svg>
    </div>
  );
}
