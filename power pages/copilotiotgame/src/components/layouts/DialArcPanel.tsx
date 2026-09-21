import type { DeviceProfile, DeviceState, LampColor } from "../../types/game";
import { LampDot } from "../LampDot";
import { TactileButton } from "../TactileButton";
import { DialTicks } from "../DialTicks";

interface LayoutProps {
  device: DeviceProfile;
  state: DeviceState;
  lampColors: Record<string, LampColor>;
  onToggle: (key: string) => void;
  disabled?: boolean;
}

/** Transitional dial surface, explicitly bound to its domain control. */
export function DialArcPanel({ device, state, lampColors, onToggle, disabled }: LayoutProps) {
  const { switches, lamps } = device;
  const dialSwitch = switches.find(sw => sw.key === device.instruments.dial)!;
  const buttonSwitches = switches.filter(sw => sw.key !== dialSwitch.key);

  return (
    <div className="th-layout">
      <div className="th-arc">
        {lamps.map((lamp, i) => (
          <span key={lamp.key} className={`arc-indicator a${i + 1}`}><LampDot state={lampColors[lamp.key]} /><span>{lamp.label}</span></span>
        ))}
      </div>

      <div className="th-dial-wrap">
        <DialTicks size={110} startDeg={-75} endDeg={75} count={9} rOuter={53} rInner={44} />
        <TactileButton
          className="th-dial"
          pressed={!!state[dialSwitch.key]}
          onToggle={() => onToggle(dialSwitch.key)}
          ariaLabel={dialSwitch.label}
          disabled={disabled}
        >
          <span className="pointer" />
          <span className="dial-label">{dialSwitch.label.split(" ")[0].toUpperCase()}</span>
        </TactileButton>
      </div>

      <div className="th-buttons">
        {buttonSwitches.map((sw) => (
          <TactileButton key={sw.key} className="th-btn" pressed={!!state[sw.key]} onToggle={() => onToggle(sw.key)} disabled={disabled}>
            {sw.label}
          </TactileButton>
        ))}
      </div>
    </div>
  );
}
