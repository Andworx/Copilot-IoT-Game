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

/** Transitional radio surface with explicit domain bindings. */
export function RadioClusterPanel({ device, state, lampColors, onToggle, disabled }: LayoutProps) {
  const { switches, lamps } = device;
  const binding = device.instruments;
  const guardA = switches.find(sw => sw.key === binding.guards![0])!;
  const guardB = switches.find(sw => sw.key === binding.guards![1])!;
  const sqSwitch = switches.find(sw => sw.key === binding.button)!;
  const dialSwitch = switches.find(sw => sw.key === binding.dial)!;
  const waveActive = lampColors[binding.signal!] === "green";

  return (
    <div className="fr-layout">
      <div className="fr-guards">
        {[guardA, guardB].map((sw) => (
          <TactileButton key={sw.key} className="fr-guard" pressed={!!state[sw.key]} onToggle={() => onToggle(sw.key)} disabled={disabled}>
            <span className="flap" />
            {sw.label}
          </TactileButton>
        ))}
      </div>

      <div className="fr-dial-wrap">
        <DialTicks size={100} startDeg={-50} endDeg={230} count={10} rOuter={48} rInner={40} />
        <TactileButton
          className="fr-dial"
          pressed={!!state[dialSwitch.key]}
          onToggle={() => onToggle(dialSwitch.key)}
          ariaLabel={dialSwitch.label}
          disabled={disabled}
        >
          <span className="pointer" /><span className="radio-dial-label">{dialSwitch.label}</span>
        </TactileButton>
      </div>

      <div className="fr-right">
        <TactileButton className="fr-sq" pressed={!!state[sqSwitch.key]} onToggle={() => onToggle(sqSwitch.key)} disabled={disabled}>
          {sqSwitch.label}
        </TactileButton>
        <div className="fr-lamp-cluster">
          {lamps.map((lamp) => (
            <LampDot key={lamp.key} state={lampColors[lamp.key]} shape="sq" />
          ))}
        </div>
        <div aria-label="Illustrative link activity" className={`fr-wave${waveActive ? " is-active" : ""}`}>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
