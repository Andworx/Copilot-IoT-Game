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

/** Transitional switch bank. No fabricated time-series measurements. */
export function DipStripPanel({ device, state, lampColors, win, onToggle, disabled }: LayoutProps) {
  const { switches, lamps } = device;

  return (
    <div className="cc-layout">
      <div className="cc-dip-row">
        {switches.map((sw) => (
          <TactileButton key={sw.key} className="cc-dip" pressed={!!state[sw.key]} onToggle={() => onToggle(sw.key)} disabled={disabled}>
            {sw.label}
          </TactileButton>
        ))}
      </div>

      <div className="cc-readout">{win ? "RESTORED" : "CHECK INPUTS"}</div>

      <div className="cc-lamp-row">
        {lamps.map((lamp) => (
          <LampDot key={lamp.key} state={lampColors[lamp.key]} shape="sq" />
        ))}
      </div>
    </div>
  );
}
