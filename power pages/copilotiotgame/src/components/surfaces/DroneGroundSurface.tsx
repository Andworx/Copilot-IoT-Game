import type { PanelSurfaceProps } from "./types";
import "../../styles/drone-ground.css";

/** Navigation schematic reflects control states, never measured flight data. */
export function DroneGroundSurface({ state, connection, win }: PanelSurfaceProps) {
  const known = (key: string) => connection.isLive && typeof state[key] === "boolean";
  const power = !known("power") ? "unknown" : state.power ? "on" : "off";
  const status = (key: string) => !known(key) || power === "unknown" ? "unknown" : power === "off" ? "unpowered" : state[key] ? "enabled" : "disabled";
  const gps = status("gps"), telemetry = status("telemetry"), uplink = status("uplink");
  const label = (value: ReturnType<typeof status>) => ({ unknown: "Unknown", unpowered: "Unpowered", enabled: "Enabled", disabled: "Disabled" })[value];
  return <section className="drone-surface" aria-label="Ground station control status" data-power={power} data-gps={gps} data-telemetry={telemetry} data-uplink={uplink}>
    <header><span>GROUND STATION / NAVIGATION</span><span>POWER <b>{power.toUpperCase()}</b></span></header>
    <div className="drone-console">
      <div className="drone-navigation">
        <svg viewBox="0 0 200 150" aria-hidden="true">
          <g className="nav-grid"><circle cx="100" cy="75" r="65"/><circle cx="100" cy="75" r="43"/><circle cx="100" cy="75" r="21"/><path d="M100 6V144 M30 75H170"/></g>
          <g className="nav-satellites">{[[55,33],[149,38],[156,113],[48,113]].map(([x,y]) => <g key={x} transform={`translate(${x} ${y})`}><path d={`M0 0 L${100-x} ${75-y}`} className="nav-link"/><rect x="-5" y="-5" width="10" height="10"/><path d="M-15 -7H-8V7H-15Z M8 -7H15V7H8Z"/></g>)}</g>
          <path className="nav-aircraft" d="M100 60L110 87L100 81L90 87Z"/>
        </svg>
        <div><span>GPS</span><strong>{label(gps)}</strong><small>Acquisition schematic / control state</small></div>
      </div>
      <div className="drone-link-column" data-state={telemetry}><span>TELEMETRY</span><svg viewBox="0 0 120 45" aria-hidden="true"><path d="M10 8V32H110 M30 12V22 M60 12V22 M90 12V22 M55 28L60 33L65 28"/></svg><strong>{label(telemetry)}</strong><small>Downlink control</small></div>
      <div className="drone-link-column" data-state={uplink}><span>UPLINK</span><svg viewBox="0 0 120 45" aria-hidden="true"><path d="M10 32H110 M60 32V8 M45 22L60 7L75 22"/></svg><strong>{label(uplink)}</strong><small>Command link control</small></div>
    </div>
    <footer><span>Key 1 <b>{!known("keyed_one") ? "Unknown" : state.keyed_one ? "ON" : "OFF"}</b></span><span>Flight key <b>{!known("keyed_two") ? "Unknown" : state.keyed_two ? "ON" : "OFF"}</b></span><strong data-restored={connection.isLive && win}>{!connection.isLive ? "Awaiting live readings" : win ? "COMMUNICATIONS READY" : "Restoration incomplete"}</strong></footer>
  </section>;
}
