import type { PanelSurfaceProps } from "./types";

/** HVAC operating state from Boolean panel inputs; no simulated temperature. */
export function ThermostatSurface({ state, connection, win }: PanelSurfaceProps) {
  const known = connection.isLive && ["power", "fan", "eco", "mode"].every(key => typeof state[key] === "boolean");
  const powered = known && state.power;
  const fanRunning = powered && state.fan;
  const operating = fanRunning && !state.eco;
  const mode = !known ? "unknown" : !powered ? "off" : !operating ? "standby" : state.mode ? "cool" : "heat";
  const title = { unknown: "NO SIGNAL", off: "OFF", standby: "STANDBY", cool: "COOL", heat: "HEAT" }[mode];
  const detail = !known ? "Waiting for panel" : !powered ? "Power disconnected" : state.eco ? "Eco lockout active" : !state.fan ? "Fan required" : state.mode ? "Cooling enabled" : "Heating enabled";
  const fanText = !known ? "Unknown" : fanRunning ? "Running" : "Stopped";
  return <div className="thermostat-surface" data-hvac={mode}>
    <div className="thermostat-face" role="img" aria-label={`Thermostat: ${title}. ${detail}`}>
      <svg viewBox="0 0 180 180" aria-hidden="true" className="thermostat-ring">
        <circle className="thermostat-bezel" cx="90" cy="90" r="82" />
        <path className="thermostat-band heat-band" d="M 28,133 A 75,75 0 0,1 90,15" />
        <path className="thermostat-band cool-band" d="M 90,15 A 75,75 0 0,1 152,133" />
        <circle className="thermostat-inner" cx="90" cy="90" r="64" />
      </svg>
      <div className="thermostat-reading">
        <span className="thermostat-eyebrow">HVAC SYSTEM</span>
        <strong>{title}</strong>
        <span className="thermostat-detail">{detail}</span>
      </div>
    </div>
    <div className="thermostat-equipment">
      <div className="thermostat-mode-tabs" aria-label="Selected operating mode">
        <span data-selected={known && !state.mode}>HEAT</span>
        <span data-selected={known && state.mode}>COOL</span>
        <small>SW4 · mode select</small>
      </div>
      <div className="thermostat-fan-row">
        <svg className="thermostat-fan" data-running={fanRunning} viewBox="0 0 60 60" aria-hidden="true">
          <circle cx="30" cy="30" r="27" className="fan-housing" />
          <g className="fan-blades">
            {[0, 120, 240].map(angle => <path key={angle} transform={`rotate(${angle} 30 30)`} d="M30 30 C14 28 12 12 24 9 C38 6 43 21 30 30Z" />)}
            <circle cx="30" cy="30" r="5" />
          </g>
        </svg>
        <div><span className="thermostat-eyebrow">SW3 · CIRCULATION FAN</span><strong>{fanText}</strong></div>
      </div>
      <div className="thermostat-interlocks">
        <span>SW1 · Power <b>{!known ? "Unknown" : state.power ? "ON" : "OFF"}</b></span>
        <span>SW2 · Eco lockout <b>{!known ? "Unknown" : state.eco ? "Active" : "Clear"}</b></span>
      </div>
      <div className="thermostat-restore" data-restored={known && win}>
        {!known ? "Physical panel connection needed" : win ? "System restored · all inputs verified" : "Check keys and sockets as well as HVAC controls"}
      </div>
    </div>
  </div>;
}
