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

/** 2x2 keypad + LCD readout + side LED column — positional, see DialArcPanel's note. */
export function KeypadPanel({ device, state, lampColors, win, onToggle, disabled }: LayoutProps) {
  const { switches, lamps } = device;

  return (
    <div className="lk-layout">
      <div className="lk-stack">
        <div className="lk-lcd" data-mode={win ? "ok" : "fault"}>
          {win ? "RESTORED" : "CHECK INPUTS"}
        </div>
        <div className="lk-keypad">
          {switches.map((sw) => (
            <TactileButton key={sw.key} className="lk-key" pressed={!!state[sw.key]} onToggle={() => onToggle(sw.key)} disabled={disabled}>
              {sw.label}
            </TactileButton>
          ))}
        </div>
      </div>

      <div className="lk-led-col">
        {lamps.map((lamp) => (
          <div className="lk-led-row" key={lamp.key}>
            <LampDot state={lampColors[lamp.key]} shape="sq" />
            <label>{lamp.label}</label>
          </div>
        ))}
      </div>
    </div>
  );
}
