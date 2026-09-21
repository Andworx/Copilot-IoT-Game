import { useEffect, useState } from "react";
import type { PanelSurfaceProps } from "./types";
import "../../styles/traffic-signal.css";

type Signal = "red" | "amber" | "green" | "off";
// Illustrative phases only: telemetry has no actual phase or countdown measurement.
const PHASES: { ns: Signal; ew: Signal; duration: number; label: string }[] = [
  { ns: "green", ew: "red", duration: 4000, label: "North / south GO" },
  { ns: "amber", ew: "red", duration: 1500, label: "North / south CHANGE" },
  { ns: "red", ew: "red", duration: 800, label: "All directions STOP" },
  { ns: "red", ew: "green", duration: 4000, label: "East / west GO" },
  { ns: "red", ew: "amber", duration: 1500, label: "East / west CHANGE" },
  { ns: "red", ew: "red", duration: 800, label: "All directions STOP" },
];

function SignalHead({ x, y, signal, direction }: { x: number; y: number; signal: Signal; direction: string }) {
  return <g transform={`translate(${x} ${y})`} className="traffic-head" data-direction={direction} data-signal={signal}>
    <rect x="-12" y="-29" width="24" height="58" rx="5" />
    {(["red", "amber", "green"] as const).map((color, i) => <circle key={color} cx="0" cy={-17 + i * 17} r="6" className={`traffic-lens ${color}`} data-lit={signal === color} />)}
  </g>;
}

export function TrafficSignalSurface({ state, connection, win }: PanelSurfaceProps) {
  const known = (key: string) => connection.isLive && typeof state[key] === "boolean";
  const power = !known("power") ? "unknown" : state.power ? "on" : "off";
  const ready = ["power", "controller", "timing", "manual"].every(known);
  const operation = !ready ? "unknown" : !state.power ? "unpowered" : !state.controller ? "controller-disabled" : state.manual ? "manual-override" : !state.timing ? "timing-missing" : "enabled";
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const cycling = operation === "enabled" && !reducedMotion;
  useEffect(() => {
    if (!cycling) { setPhase(0); return; }
    const timer = setTimeout(() => setPhase(value => (value + 1) % PHASES.length), PHASES[phase].duration);
    return () => clearTimeout(timer);
  }, [cycling, phase]);
  const ns: Signal = operation !== "enabled" ? "off" : reducedMotion ? "red" : PHASES[phase].ns;
  const ew: Signal = operation !== "enabled" ? "off" : reducedMotion ? "red" : PHASES[phase].ew;
  const reason = { unknown: "Waiting for live control readings", unpowered: "Power off / preview stopped", "controller-disabled": "Controller disabled / preview blocked", "manual-override": "Manual override / automatic cycle blocked", "timing-missing": "Timing plan off / preview blocked", enabled: reducedMotion ? "Static preview / reduced motion" : PHASES[phase].label }[operation];
  function enabled(key: string) { return !known(key) || power === "unknown" ? "Unknown" : power === "off" ? "Unpowered" : state[key] ? "Enabled" : "Disabled"; }
  return <div className="traffic-surface" data-operation={operation} data-cycling={cycling} data-phase={cycling ? phase : "paused"}>
    <section className="traffic-map" aria-label="Simulated intersection">
      <div className="traffic-simulation-label">SIMULATED SIGNAL CYCLE</div>
      <svg viewBox="0 0 310 220" className="traffic-intersection" role="img" aria-label={`Simulated intersection: north/south ${ns}, east/west ${ew}. ${reason}`}>
        <rect className="traffic-ground" width="310" height="220" rx="10" />
        <path className="traffic-road" d="M111 0 H199 V66 H310 V154 H199 V220 H111 V154 H0 V66 H111Z" />
        <path className="traffic-curb" d="M108 0 V63 H0 M202 0 V63 H310 M0 157 H108 V220 M310 157 H202 V220" />
        <path className="traffic-lanes" d="M155 0 V58 M155 162 V220 M0 110 H100 M210 110 H310" />
        <path className="traffic-crosswalk" d="M118 56 H192 M118 164 H192 M100 74 V147 M210 74 V147" />
        <text x="155" y="18">N</text><text x="294" y="114">E</text><text x="155" y="211">S</text><text x="15" y="114">W</text>
        <SignalHead x={82} y={31} signal={ns} direction="north" />
        <SignalHead x={228} y={189} signal={ns} direction="south" />
        <SignalHead x={228} y={31} signal={ew} direction="east" />
        <SignalHead x={82} y={189} signal={ew} direction="west" />
        <path className="traffic-direction" d="M132 142 V84 L127 91 M178 78 V136 L183 129" />
      </svg>
      <div className="traffic-phase-readout">{reason}</div>
    </section>
    <section className="traffic-controller" aria-label="Traffic controller status">
      <header><span>INTERSECTION CONTROLLER</span><strong>{operation === "unknown" ? "NO SIGNAL" : operation === "enabled" ? "CYCLE ENABLED" : "CYCLE BLOCKED"}</strong></header>
      <dl><div><dt>Power</dt><dd>{power === "unknown" ? "Unknown" : power.toUpperCase()}</dd></div>
        <div><dt>Controller</dt><dd>{enabled("controller")}</dd></div>
        <div><dt>Timing plan</dt><dd>{enabled("timing")}</dd></div>
        <div><dt>Manual override</dt><dd>{!known("manual") || power === "unknown" ? "Unknown" : power === "off" ? "Unpowered" : state.manual ? "Active" : "Clear"}</dd></div>
      </dl>
      <div className="traffic-keys"><span>Cabinet key <b>{!known("keyed_one") ? "Unknown" : state.keyed_one ? "ON" : "OFF"}</b></span><span>Key 2 <b>{!known("keyed_two") ? "Unknown" : state.keyed_two ? "ON" : "OFF"}</b></span></div>
      <div className="traffic-repair" data-restored={connection.isLive && win}>{!connection.isLive ? "Live panel connection needed" : win ? "RESTORED / all inputs verified" : "Restoration incomplete"}</div>
    </section>
  </div>;
}
