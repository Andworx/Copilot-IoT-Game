import type { DeviceProfile, DeviceState, LampColor } from "../../types/game";
import { LampDot } from "../LampDot";
import { TactileButton } from "../TactileButton";
import { DialTicks } from "../DialTicks";

interface LayoutProps {
  device: DeviceProfile;
  state: DeviceState;
  lampColors: Record<string, LampColor>;
  onToggle: (key: string) => void;
}

/**
 * Dial + arc gauge — reused across devices by array position, not by hardcoded key
 * names, so any device assigned this layout works regardless of its actual switch/lamp
 * keys. Convention: switches[2] becomes the dial, switches[0,1,3] become the 3 buttons
 * (in that order), lamps[0..3] sit in the arc. See KIOSK_UI_SPEC.md §2.1.
 */
export function DialArcPanel({ device, state, lampColors, onToggle }: LayoutProps) {
  const { switches, lamps } = device;
  const dialSwitch = switches[2];
  const buttonSwitches = [switches[0], switches[1], switches[3]];

  return (
    <div className="th-layout">
      <div className="th-arc">
        {lamps.map((lamp, i) => (
          <LampDot key={lamp.key} state={lampColors[lamp.key]} extraClass={`a${i + 1}`} />
        ))}
      </div>

      <div className="th-dial-wrap">
        <DialTicks size={110} startDeg={-75} endDeg={75} count={9} rOuter={53} rInner={44} />
        <TactileButton
          className="th-dial"
          pressed={!!state[dialSwitch.key]}
          onToggle={() => onToggle(dialSwitch.key)}
          ariaLabel={dialSwitch.label}
        >
          <span className="pointer" />
          <span className="dial-label">{dialSwitch.label.split(" ")[0].toUpperCase()}</span>
        </TactileButton>
      </div>

      <div className="th-buttons">
        {buttonSwitches.map((sw) => (
          <TactileButton key={sw.key} className="th-btn" pressed={!!state[sw.key]} onToggle={() => onToggle(sw.key)}>
            {sw.label}
          </TactileButton>
        ))}
      </div>
    </div>
  );
}
