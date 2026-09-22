import type { PanelSurfaceProps } from "./types";
import "../../styles/elevator.css";

export function ElevatorSurface({ state, connection, controls, win }: PanelSurfaceProps) {
  const known = (key: string) => connection.isLive && typeof state[key] === "boolean";
  const power = !known("power") ? "unknown" : state.power ? "on" : "off";
  const status = (key: string) => !known(key) || power === "unknown" ? "unknown" : power === "off" ? "unpowered" : state[key] ? "enabled" : "disabled";
  const brake = status("brake"), doors = status("doors"), inspection = status("inspection");
  const label = (value: ReturnType<typeof status>, on: string, off: string) => value === "enabled" ? on : value === "disabled" ? off : value === "unknown" ? "Unknown" : "Unpowered";
  const operation = !controls.every(c=>known(c.key)) ? "unknown" : !state.power ? "unpowered" : !state.doors ? "doors-open" : !state.brake ? "brake-held" : state.inspection ? "inspection" : !win ? "interlocked" : "ready";
  const reason = {unknown:"Awaiting live readings",unpowered:"Power off","doors-open":"Door indication open","brake-held":"Brake release disabled",inspection:"Inspection mode active",interlocked:"Restoration incomplete",ready:"Service controls ready"}[operation];
  return <section className="elevator-surface" aria-label="Elevator service controls" data-power={power} data-brake={brake} data-doors={doors} data-inspection={inspection} data-operation={operation}>
    <div className="elevator-shaft"><svg viewBox="0 0 180 210" role="img" aria-label={`Illustrative elevator shaft and door controls. ${reason}. Car travel is simulated, not measured position.`}>
      <rect className="shaft-wall" x="30" y="8" width="116" height="192"/><path className="shaft-rails" d="M44 12V195 M132 12V195 M13 55H30 M146 55H163 M13 120H30 M146 120H163 M13 182H30 M146 182H163"/>
      <circle className="elevator-pulley" cx="88" cy="26" r="12"/><path className="brake-clamps" d="M69 16V36 M107 16V36"/>
      <path className="elevator-rope" d="M80 40V124 M96 40V124"/>
      <g className="elevator-car"><rect x="53" y="124" width="70" height="59" rx="2"/><path className="elevator-door-left" d="M57 129H88V179H57Z"/><path className="elevator-door-right" d="M88 129H119V179H88Z"/></g>
    </svg><small>SIMULATED CAR TRAVEL</small></div>
    <div className="elevator-interlocks"><header><span>SERVICE INTERLOCKS</span><span>POWER <b>{power.toUpperCase()}</b></span></header>
      <div className="elevator-status-row"><div><span>DOOR INDICATION</span><strong>{label(doors,"Closed","Open")}</strong></div><span className="elevator-door-icon" aria-hidden="true"><i/><i/></span></div>
      <div className="elevator-status-row"><div><span>BRAKE RELEASE</span><strong>{label(brake,"Enabled","Disabled")}</strong></div><span className="elevator-brake-icon" aria-hidden="true">( O )</span></div>
      <div className="elevator-inspection"><span>INSPECTION MODE</span><strong>{label(inspection,"Enabled","Disabled")}</strong></div>
      <footer><span>Key 1 <b>{!known("keyed_one") ? "Unknown" : state.keyed_one ? "ON" : "OFF"}</b></span><span>Inspection key <b>{!known("keyed_two") ? "Unknown" : state.keyed_two ? "ON" : "OFF"}</b></span></footer>
      <strong className="elevator-reason">{reason}</strong><small className="elevator-note">Control indications / no floor or travel telemetry</small>
    </div>
  </section>;
}
