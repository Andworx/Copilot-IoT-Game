import type { PanelSurfaceProps } from "./types";
import "../../styles/robot-arm.css";

export function RobotArmSurface({ state, connection, controls, win }: PanelSurfaceProps) {
  const known = (key: string) => connection.isLive && typeof state[key] === "boolean";
  const power = !known("power") ? "unknown" : state.power ? "on" : "off";
  const status = (key: string) => !known(key) || power === "unknown" ? "unknown" : power === "off" ? "unpowered" : state[key] ? "enabled" : "disabled";
  const estop = status("estop"), servo = status("servo"), guard = status("guard");
  const label = (value: ReturnType<typeof status>) => ({unknown:"Unknown",unpowered:"Unpowered",enabled:"Enabled",disabled:"Disabled"})[value];
  const operation = !controls.every(c=>known(c.key)) ? "unknown" : !state.power ? "unpowered" : !state.estop ? "estop" : state.guard ? "guard" : !state.servo ? "servo" : !state.keyed_one ? "access" : !state.keyed_two ? "pendant" : !win ? "interlocked" : "ready";
  const reason = {unknown:"Awaiting live readings",unpowered:"Power off",estop:"E-stop reset disabled",guard:"Guard fault active",servo:"Servo disabled",access:"Cell access key inactive",pendant:"Pendant key inactive",interlocked:"Restoration incomplete",ready:"Cell controls ready"}[operation];
  return <section className="robot-surface" aria-label="Robot cell and teach pendant control status" data-power={power} data-estop={estop} data-servo={servo} data-guard={guard} data-operation={operation}>
    <div className="robot-cell"><header>GUARDED CELL <span>POWER <b>{power.toUpperCase()}</b></span></header><svg viewBox="0 0 400 165" role="img" aria-label={`Illustrative robot inside a guard boundary. ${reason}. Motion is simulated.`}>
      <path className="robot-boundary" d="M18 140V20H380V140H300 M18 140H240"/><path className="robot-gate" d="M240 140H300"/>
      <path className="robot-floor" d="M35 145H365 M75 125H340"/><path className="robot-base" d="M100 138L110 118H155L167 138Z"/>
      <g className="robot-linkage"><path className="robot-arm-segment" d="M132 119L102 75L185 48L243 80"/><circle cx="132" cy="119" r="12"/><circle cx="102" cy="75" r="11"/><circle cx="185" cy="48" r="10"/><circle cx="243" cy="80" r="8"/><path className="robot-gripper" d="M243 80L256 95M248 94L256 108L270 98L260 85"/></g>
      <path className="robot-workpiece" d="M300 108H330V124H300Z"/>
    </svg><strong>{reason}</strong><small>SIMULATED MOTION / no joint-position telemetry</small></div>
    <div className="robot-pendant"><header>TEACH PENDANT <span>READ ONLY</span></header><div className="robot-pendant-screen"><div><span>E-stop reset</span><b>{label(estop)}</b></div><div><span>Servo</span><b>{label(servo)}</b></div><div><span>Guard fault</span><b>{guard === "enabled" ? "Active" : guard === "disabled" ? "Clear" : label(guard)}</b></div></div><div className="robot-key-row"><span>Cell access</span><b>{!known("keyed_one") ? "Unknown" : state.keyed_one ? "ON" : "OFF"}</b></div><div className="robot-key-row"><span>Pendant key</span><b>{!known("keyed_two") ? "Unknown" : state.keyed_two ? "ON" : "OFF"}</b></div><div className="robot-pendant-grip" aria-hidden="true"/></div>
  </section>;
}
