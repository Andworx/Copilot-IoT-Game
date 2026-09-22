import type { PanelSurfaceProps } from "./types";
import "../../styles/water-pump.css";

/** Process schematic only; panel controls do not measure pressure or water flow. */
export function WaterPumpSurface({ state, connection, win, controls }: PanelSurfaceProps) {
  const known = (key: string) => connection.isLive && typeof state[key] === "boolean";
  const power = !known("power") ? "unknown" : state.power ? "on" : "off";
  const status = (key: string) => !known(key) || power === "unknown" ? "unknown" : power === "off" ? "unpowered" : state[key] ? "enabled" : "disabled";
  const pump = status("pumpenable"), relief = status("relief"), remote = status("remote");
  const label = (value: ReturnType<typeof status>) => ({ unknown:"Unknown", unpowered:"Unpowered", enabled:"Enabled", disabled:"Disabled" })[value];
  const allKnown = controls.every(control => known(control.key));
  const operation = !allKnown ? "unknown" : !state.power ? "unpowered" : !state.pumpenable ? "pump-disabled" : !state.relief ? "relief-disabled" : state.remote ? "remote-override" : !win ? "interlocked" : "ready";
  const reason = { unknown:"Awaiting live readings", unpowered:"Power off", "pump-disabled":"Pump disabled", "relief-disabled":"Pressure relief disabled", "remote-override":"Remote override active", interlocked:"Restoration incomplete", ready:"Station ready" }[operation];
  return <section className="water-pump-surface" aria-label="Pump station process schematic" data-power={power} data-pump={pump} data-relief={relief} data-remote={remote} data-operation={operation}>
    <header><span>PROCESS OVERVIEW</span><span>POWER <b>{power.toUpperCase()}</b></span></header>
    <div className="pump-process">
      <svg viewBox="0 0 500 155" role="img" aria-label={`Illustrative tank, relief valve, pump and outlet. ${reason}. Flow is simulated.`}>
        <path className="pump-pipe" d="M85 103H450 M175 103V42H85"/>
        <path className="pump-flow" d="M85 103H450 M175 103V42H85"/>
        <path className="pump-tank" d="M20 25H85V125H20Z"/><path className="pump-water" d="M23 78Q38 72 53 78T82 78V122H23Z"/>
        <text x="52" y="146" textAnchor="middle">TANK</text>
        <g className="pump-valve"><path d="M160 50L190 72V50L160 72Z"/><path d="M175 49V30M165 30H185"/></g>
        <text x="198" y="35">RELIEF</text>
        <circle className="pump-housing" cx="310" cy="103" r="33"/>
        <g className="pump-impeller"><path d="M310 82Q330 82 310 103Q310 122 290 113Q292 99 310 103Q327 113 327 91Q319 89 310 103Z"/></g>
        <text x="310" y="151" textAnchor="middle">PUMP</text>
        <path className="pump-outlet" d="M440 92L455 103L440 114"/><text x="437" y="135" textAnchor="middle">OUTLET</text>
      </svg>
      <div className="pump-pressure"><span>PRESSURE</span><svg viewBox="0 0 120 75" aria-hidden="true"><path d="M15 65A45 45 0 0 1 105 65"/><path className="pump-needle" d="M60 65L32 39"/><circle cx="60" cy="65" r="4"/></svg><strong>{operation === "ready" ? "Regulated preview" : "Unavailable"}</strong><small>Simulated flow / no pressure sensor</small></div>
    </div>
    <div className="pump-controls"><div><span>Pump</span><b>{label(pump)}</b></div><div><span>Pressure relief</span><b>{label(relief)}</b></div><div><span>Remote override</span><b>{label(remote)}</b></div></div>
    <footer><span>Key 1 <b>{!known("keyed_one") ? "Unknown" : state.keyed_one ? "ON" : "OFF"}</b></span><span>Key 2 <b>{!known("keyed_two") ? "Unknown" : state.keyed_two ? "ON" : "OFF"}</b></span><strong>{reason}</strong></footer>
  </section>;
}
