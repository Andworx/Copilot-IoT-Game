import type { PanelSurfaceProps } from "./types";
import "../../styles/smart-lock.css";

/** A logical security-panel schematic, not a measured door/tamper sensor. */
export function SmartLockSurface({ state, connection, win }: PanelSurfaceProps) {
  const known = (key: string) => connection.isLive && typeof state[key] === "boolean";
  const power = !known("power") ? "unknown" : state.power ? "on" : "off";
  const bolt = power === "unknown" || !known("deadbolt") ? "unknown" : power === "off" ? "unpowered" : state.deadbolt ? "extended" : "retracted";
  const alarm = power === "unknown" || !known("alarm") ? "unknown" : power === "off" ? "unpowered" : state.alarm ? "armed" : "disarmed";
  const auto = power === "unknown" || !known("autolock") ? "Unknown" : power === "off" ? "Unpowered" : state.autolock ? "Enabled" : "Disabled";
  const boltText = { unknown: "UNKNOWN", unpowered: "UNPOWERED", extended: "ENGAGED", retracted: "RELEASED" }[bolt];
  const alarmText = { unknown: "Unknown", unpowered: "Unpowered", armed: "Armed", disarmed: "Disarmed" }[alarm];
  return <div className="smart-lock-surface" data-bolt={bolt} data-alarm={alarm} data-power={power}>
    <div className="lock-door-panel">
      <div className="lock-door-heading"><span>SW2 / DEADBOLT</span><strong>{boltText}</strong></div>
      <svg className="lock-door" viewBox="0 0 320 230" role="img" aria-label={`Door schematic. Deadbolt ${boltText.toLowerCase()}. Door position is not monitored.`}>
        <rect className="lock-frame" x="47" y="10" width="218" height="210" rx="5" />
        <rect className="lock-leaf" x="60" y="22" width="172" height="198" rx="3" />
        <path className="lock-inset" d="M77 40 H215 V95 H77 Z M77 155 H215 V201 H77 Z" />
        <rect className="lock-strike" x="241" y="106" width="15" height="33" rx="2" />
        <rect className="lock-bolt" x="195" y="115" width="39" height="15" rx="3" />
        <rect className="lock-housing" x="170" y="101" width="42" height="45" rx="6" />
        <circle className="lock-cylinder" cx="190" cy="123" r="10" />
        <path className="lock-keyslot" d="M190 118 V128" />
        <path className="lock-hinge" d="M56 57 H65 M56 180 H65" />
        {(bolt === "unknown" || bolt === "unpowered") && <text className="lock-unknown" x="148" y="80" textAnchor="middle">?</text>}
      </svg>
      <span className="lock-schematic-note">Control schematic / door position not monitored</span>
    </div>
    <section className="lock-alarm-panel" aria-label="Security panel status">
      <div className="lock-alarm-heading"><svg viewBox="0 0 40 46" aria-hidden="true"><path d="M20 3 L36 10 V25 Q32 36 20 43 Q8 36 4 25 V10 Z" /><path className="lock-shield-mark" d={alarm === "armed" ? "M11 23 L18 30 L29 16" : "M13 23 H27"} /></svg><div><span>SW4 / ALARM</span><strong>{alarmText}</strong></div></div>
      <dl className="lock-status-list">
        <div><dt>SW1 / Power</dt><dd>{power === "unknown" ? "Unknown" : power === "on" ? "ON" : "OFF"}</dd></div>
        <div><dt>SW3 / Auto-lock</dt><dd>{auto}</dd></div>
        <div><dt>SW5 / Service key</dt><dd>{!known("keyed_one") ? "Unknown" : state.keyed_one ? "ON" : "OFF"}</dd></div>
        <div><dt>SW6 / Keyed switch 2</dt><dd>{!known("keyed_two") ? "Unknown" : state.keyed_two ? "ON" : "OFF"}</dd></div>
        <div className="lock-tamper"><dt>Tamper sensor</dt><dd>Not monitored</dd></div>
      </dl>
      <div className="lock-repair" data-restored={connection.isLive && win}>{!connection.isLive ? "Awaiting live panel readings" : win ? "RESTORED / all inputs verified" : "Setup incomplete / check keys & cables"}</div>
    </section>
  </div>;
}
