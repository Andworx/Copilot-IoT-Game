import type { PanelSurfaceProps } from "./types";
import "../../styles/ev-charger.css";

export function EvChargerSurface({ state, connection, controls, win }: PanelSurfaceProps) {
  const known = (key: string) => connection.isLive && typeof state[key] === "boolean";
  const power = !known("power") ? "unknown" : state.power ? "on" : "off";
  const status = (key: string) => !known(key) || power === "unknown" ? "unknown" : power === "off" ? "unpowered" : state[key] ? "enabled" : "disabled";
  const ground = status("ground"), contactor = status("contactor"), billing = status("billing");
  const label = (value: ReturnType<typeof status>) => ({unknown:"Unknown",unpowered:"Unpowered",enabled:"Enabled",disabled:"Disabled"})[value];
  const operation = !controls.every(c=>known(c.key)) ? "unknown" : !state.power ? "unpowered" : !state.ground ? "ground-disabled" : !state.contactor ? "contactor-disabled" : !state.billing ? "billing-disabled" : !state.keyed_one ? "service-lock" : !win ? "interlocked" : "ready";
  const reason = {unknown:"Awaiting live readings",unpowered:"Power off","ground-disabled":"Ground check disabled","contactor-disabled":"Contactor disabled","billing-disabled":"Billing link disabled","service-lock":"Service lock inactive",interlocked:"Restoration incomplete",ready:"Charging controls ready"}[operation];
  const rows = [{key:"power",label:"Power",value:power === "unknown" ? "Unknown" : power === "on" ? "ON" : "OFF",ready:power === "on"},{key:"ground",label:"Ground check",value:label(ground),ready:ground === "enabled"},{key:"contactor",label:"Contactor",value:label(contactor),ready:contactor === "enabled"},{key:"billing",label:"Billing link",value:label(billing),ready:billing === "enabled"},{key:"keyed_one",label:"Service lock",value:!known("keyed_one") ? "Unknown" : state.keyed_one ? "ON" : "OFF",ready:power === "on" && known("keyed_one") && state.keyed_one}];
  return <section className="ev-surface" aria-label="EV charger readiness" data-power={power} data-ground={ground} data-contactor={contactor} data-billing={billing} data-operation={operation}>
    <div className="ev-station"><span>CHARGER / VEHICLE</span><svg viewBox="0 0 450 180" role="img" aria-label={`Illustrative charger and vehicle cable. ${reason}. Energy transfer is simulated.`}>
      <rect className="ev-pedestal" x="25" y="15" width="78" height="139" rx="9"/><rect className="ev-display" x="38" y="32" width="52" height="49" rx="3"/><path className="ev-bolt" d="M66 39L51 59H65L58 73L77 52H63Z"/><path className="ev-base" d="M14 157H114"/>
      <path className="ev-cable" d="M101 94H120Q137 94 137 120V143Q137 158 157 158H184Q207 158 207 137V111"/><path className="ev-energy" d="M101 94H120Q137 94 137 120V143Q137 158 157 158H184Q207 158 207 137V111"/>
      <path className="ev-car" d="M198 107L217 88L245 46H351L384 87L418 102V131H197Z"/><path className="ev-window" d="M252 55H341L364 87H231Z"/><path className="ev-car-detail" d="M294 53V89M207 107H227 M388 108H407"/><circle className="ev-wheel" cx="244" cy="131" r="18"/><circle className="ev-wheel" cx="376" cy="131" r="18"/>
      <text x="300" y="171" textAnchor="middle">Battery level not measured</text>
    </svg><strong className="ev-reason">{reason}</strong><small>SIMULATED ENERGY PATH / no charge-rate telemetry</small></div>
    <div className="ev-readiness"><header>READINESS CHAIN</header><ol>{rows.map(row=><li key={row.key} data-ready={row.ready}><span className="ev-stage-dot" aria-hidden="true"/><span>{row.label}</span><b>{row.value}</b></li>)}</ol><div className="ev-key">Key 2 <b>{!known("keyed_two") ? "Unknown" : state.keyed_two ? "ON" : "OFF"}</b></div></div>
  </section>;
}
