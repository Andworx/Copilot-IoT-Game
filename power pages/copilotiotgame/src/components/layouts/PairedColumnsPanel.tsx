import type { DeviceProfile, DeviceState, LampColor } from "../../types/game";
import { TactileButton } from "../TactileButton";

interface LayoutProps {
  device: DeviceProfile;
  state: DeviceState;
  lampColors: Record<string, LampColor>;
  onToggle: (key: string) => void;
  disabled?: boolean;
}

/** Transitional control-state gauge; does not represent a measured quantity. */
export function PairedColumnsPanel({ device, state, onToggle, disabled }: LayoutProps) {
  const { switches } = device;
  const gaugeSwitch = switches.find(sw => sw.key === device.instruments.gauge)!;
  const needleAngle = state[gaugeSwitch.key] ? -35 : -125;

  return (
    <div className="wp-stack">
      <span className="gauge-caption">{gaugeSwitch.label}: {state[gaugeSwitch.key] ? "ON" : "OFF"}</span>
      <svg aria-hidden="true" className="wp-gauge" viewBox="0 0 110 66">
        <path d="M5,58 A50,50 0 0 1 38.4,13.4" fill="none" stroke="#ef4444" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
        <path d="M38.4,13.4 A50,50 0 0 1 71.6,13.4" fill="none" stroke="#f59e0b" strokeWidth={8} opacity={0.85} />
        <path d="M71.6,13.4 A50,50 0 0 1 105,58" fill="none" stroke="#22c55e" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
        <g className="needle" style={{ transform: `rotate(${needleAngle}deg)` }}>
          <line x1={55} y1={58} x2={99} y2={58} stroke="var(--color-text-bright)" strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={55} cy={58} r={4.5} fill="var(--color-text-bright)" />
        </g>
      </svg>

      <div className="wp-layout">
        {switches.map((sw) => (
          <div className="wp-col" key={sw.key}>
            <TactileButton className="wp-rocker" pressed={!!state[sw.key]} onToggle={() => onToggle(sw.key)} disabled={disabled} />
            <label>{sw.physicalPin}: {sw.label}</label>
          </div>
        ))}
      </div>
    </div>
  );
}
