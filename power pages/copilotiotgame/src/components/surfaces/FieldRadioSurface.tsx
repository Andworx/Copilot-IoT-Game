import type { PanelSurfaceProps } from "./types";
import "../../styles/field-radio.css";

/** Control-state transceiver: no frequency, RF measurement or on-air claim. */
export function FieldRadioSurface({ state, connection, win }: PanelSurfaceProps) {
  const known = (key: string) => connection.isLive && typeof state[key] === "boolean";
  const power = !known("power") ? "unknown" : state.power ? "on" : "off";
  const status = (key: string) => !known(key) || power === "unknown" ? "unknown" : power === "off" ? "unpowered" : state[key] ? "enabled" : "disabled";
  const channel = status("channelhop"), encryption = status("encryption"), transmit = status("transmit");
  const label = (value: ReturnType<typeof status>) => ({ unknown:"Unknown", unpowered:"Unpowered", enabled:"Enabled", disabled:"Disabled" })[value];
  return <div className="field-radio-surface" data-channel={channel} data-encryption={encryption} data-transmit={transmit} data-power={power}>
    <div className="radio-carry-handle" aria-hidden="true" />
    <section className="radio-faceplate" aria-label="Field transceiver control status">
      <header><span>FIELD TRANSCEIVER</span><span>SW1 / POWER <b>{power === "unknown" ? "UNKNOWN" : power.toUpperCase()}</b></span></header>
      <div className="radio-console">
        <div className="radio-channel-window"><span>SW3 / CHANNEL HOP</span><strong>{channel === "enabled" ? "HOP ENABLED" : channel === "disabled" ? "HOP DISABLED" : channel === "unpowered" ? "POWER OFF" : "NO SIGNAL"}</strong><small>Channel selection control / no frequency telemetry</small>
          <div className="radio-rf"><svg viewBox="0 0 100 34" aria-hidden="true">{[0,1,2,3,4].map(i => <rect key={i} x={i*20+3} y={26-i*5} width="12" height={5+i*5} />)}</svg><span>RF STRENGTH<b>Not measured</b></span></div>
        </div>
        <div className="radio-selector" role="img" aria-label={`Channel hop ${label(channel)}. Read-only switch indicator.`}><div className="radio-selector-ring"><div className="radio-selector-knob"><span /></div></div><span>CHANNEL HOP</span><strong>{label(channel)}</strong></div>
      </div>
      <div className="radio-service-row">
        <div className="radio-encryption"><svg viewBox="0 0 26 30" aria-hidden="true"><path d="M6 13 V8 A7 7 0 0 1 20 8 V13" /><rect x="3" y="13" width="20" height="14" rx="3" /><path d="M13 18 V22" /></svg><div><span>SW2 / ENCRYPTION</span><strong>{label(encryption)}</strong></div></div>
        <div className="radio-transmit"><span className="radio-tx-lamp" aria-hidden="true" /><div><span>SW4 / TRANSMIT</span><strong>{label(transmit)}</strong></div><small>Control state / not on-air telemetry</small></div>
      </div>
      <footer><span>SW5 / Key 1 <b>{!known("keyed_one") ? "Unknown" : state.keyed_one ? "ON" : "OFF"}</b></span><span>SW6 / Crypto key <b>{!known("keyed_two") ? "Unknown" : state.keyed_two ? "ON" : "OFF"}</b></span><span className="radio-restore" data-restored={connection.isLive && win}>{!connection.isLive ? "Awaiting live readings" : win ? "RESTORED / all inputs verified" : "Check remaining keys & cables"}</span></footer>
    </section>
    <div className="radio-carry-handle" aria-hidden="true" />
  </div>;
}
