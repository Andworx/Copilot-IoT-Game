import type { PanelSurfaceProps } from "./types";
import "../../styles/coldchain.css";

export function ColdChainSurface({ state, connection, win }: PanelSurfaceProps) {
  const known = (key: string) => connection.isLive && typeof state[key] === "boolean";
  const power = !known("power") ? "unknown" : state.power ? "on" : "off";
  const status = (key: string) => !known(key) || power === "unknown" ? "unknown" : power === "off" ? "unpowered" : state[key] ? "enabled" : "disabled";
  const calibration = status("calibration"), threshold = status("threshold"), cloud = status("cloudsync");
  const ready = calibration === "enabled" && threshold === "disabled";
  const label = (value: ReturnType<typeof status>) => ({unknown:"Unknown",unpowered:"Unpowered",enabled:"Enabled",disabled:"Disabled"})[value];
  return <section className="coldchain-surface" aria-label="Cold-chain data logger control status" data-power={power} data-calibration={calibration} data-threshold={threshold} data-cloud={cloud} data-ready={ready}>
    <header><span>DATA LOGGER / COLD CHAIN</span><span>POWER <b>{power.toUpperCase()}</b></span></header>
    <div className="logger-body">
      <div className="logger-probe"><svg viewBox="0 0 55 105" aria-hidden="true"><path d="M28 5V20Q45 20 45 35V65H28"/><rect x="20" y="40" width="16" height="48" rx="8"/><path d="M28 53V77"/><circle cx="28" cy="82" r="3"/></svg><span>PROBE</span><strong>{calibration === "enabled" ? "Calibrated" : calibration === "disabled" ? "Uncalibrated" : label(calibration)}</strong></div>
      <div className="logger-display"><div className="logger-reading"><span>TEMPERATURE</span><strong>--</strong><small>Not measured</small></div><div className="logger-rails" role="img" aria-label="Illustrative threshold rails; no measured temperature or limits"><span>UPPER LIMIT</span><div/><div/><span>LOWER LIMIT</span></div><div className="logger-validity">{!connection.isLive || power === "unknown" ? "Awaiting live readings" : power === "off" ? "Logger unpowered" : ready ? "Reading controls ready" : "Reading controls unavailable"}</div><small className="logger-note">Control status / no temperature history</small></div>
      <div className="logger-cloud"><svg viewBox="0 0 100 70" aria-hidden="true"><path d="M25 48C5 48 5 21 25 21C30 0 63 0 68 23C95 20 99 48 77 48Z"/><path d="M43 62V34L34 43 M57 34V62L66 53"/></svg><span>CLOUD SYNC</span><strong>{label(cloud)}</strong><small>Sync control / not an upload receipt</small></div>
    </div>
    <div className="logger-controls"><span>Calibration <b>{label(calibration)}</b></span><span>Threshold <b>{label(threshold)}</b></span><span>Key 1 <b>{!known("keyed_one") ? "Unknown" : state.keyed_one ? "ON" : "OFF"}</b></span><span>Key 2 <b>{!known("keyed_two") ? "Unknown" : state.keyed_two ? "ON" : "OFF"}</b></span></div>
    <footer>{!connection.isLive ? "Awaiting live readings" : win ? "Logger controls restored" : "Restoration incomplete"}</footer>
  </section>;
}
