import { useEffect, useRef, useState } from "react";
import type { DeviceProfile, DeviceState, LampColor } from "../../types/game";
import { LampDot } from "../LampDot";
import { TactileButton } from "../TactileButton";

interface LayoutProps {
  device: DeviceProfile;
  state: DeviceState;
  lampColors: Record<string, LampColor>;
  win: boolean;
  onToggle: (key: string) => void;
  disabled?: boolean;
}

const SPARK_POINTS = 16;
const SPARK_WIDTH = 92;
const SPARK_HEIGHT = 28;

/** DIP-switch bank + live sparkline + LED strip — positional, see DialArcPanel's note. */
export function DipStripPanel({ device, state, lampColors, win, onToggle, disabled }: LayoutProps) {
  const { switches, lamps, readout } = device;
  const [points, setPoints] = useState<number[]>(() => Array(SPARK_POINTS).fill(14));
  const winRef = useRef(win);
  winRef.current = win;

  useEffect(() => {
    const id = setInterval(() => {
      setPoints((prev) => {
        const last = prev[prev.length - 1] ?? 14;
        const target = winRef.current ? 16 : 6;
        let next = last + (target - last) * 0.35 + (Math.random() - 0.5) * 3;
        next = Math.max(2, Math.min(26, next));
        return [...prev.slice(1), next];
      });
    }, 900);
    return () => clearInterval(id);
  }, []);

  const stepX = SPARK_WIDTH / (SPARK_POINTS - 1);
  const polyPoints = points.map((v, i) => `${(i * stepX).toFixed(1)},${(SPARK_HEIGHT - v).toFixed(1)}`).join(" ");

  return (
    <div className="cc-layout">
      <div className="cc-dip-row">
        {switches.map((sw) => (
          <TactileButton key={sw.key} className="cc-dip" pressed={!!state[sw.key]} onToggle={() => onToggle(sw.key)} disabled={disabled}>
            {sw.label.slice(0, 3).toUpperCase()}
          </TactileButton>
        ))}
      </div>

      {readout && (
        <div className="cc-readout-row">
          <div className="cc-readout">{win ? readout.ok : readout.fault}</div>
          <svg className="cc-spark" viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}>
            <polyline points={polyPoints} />
          </svg>
        </div>
      )}

      <div className="cc-lamp-row">
        {lamps.map((lamp) => (
          <LampDot key={lamp.key} state={lampColors[lamp.key]} shape="sq" />
        ))}
      </div>
    </div>
  );
}
