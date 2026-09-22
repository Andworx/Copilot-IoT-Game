import type { PanelSurfaceProps } from "./types";
import "../../styles/patient-monitor.css";

function Waveform({ kind, available, message }: { kind: "ecg" | "pleth"; available: boolean; message: string }) {
  const path = kind === "ecg" ? "M0 35H35L43 31L51 35H66L72 42L79 10L87 56L94 35H120Q132 22 144 35H180" : "M0 42H15Q25 42 32 21Q38 6 49 28Q57 40 64 32Q71 29 80 42H180";
  return <div className="patient-wave" data-available={available} data-channel={kind}>
    {available ? <svg viewBox="0 0 360 65" preserveAspectRatio="none" role="img" aria-label={`Simulated ${kind === "ecg" ? "ECG" : "pulse"} waveform, not patient data`}><g className="patient-trace">{[0,180,360].map(x => <path key={x} transform={`translate(${x} 0)`} d={path}/>)}</g></svg> : <span>{message}</span>}
  </div>;
}

export function PatientMonitorSurface({ state, connection, win }: PanelSurfaceProps) {
  const known = (key: string) => connection.isLive && typeof state[key] === "boolean";
  const power = !known("power") ? "unknown" : state.power ? "on" : "off";
  const status = (key: string) => !known(key) || power === "unknown" ? "unknown" : power === "off" ? "unpowered" : state[key] ? "enabled" : "disabled";
  const leads = status("leads"), spo2 = status("spo2"), alarm = status("alarm");
  const label = (value: ReturnType<typeof status>) => ({unknown:"Unknown",unpowered:"Unpowered",enabled:"Connected",disabled:"Disconnected"})[value];
  const message = (value: ReturnType<typeof status>) => value === "unknown" ? "Awaiting live readings" : value === "unpowered" ? "Monitor power off" : "Sensor unavailable";
  return <section className="patient-surface" aria-label="Patient monitor demonstration" data-power={power} data-leads={leads} data-spo2={spo2} data-alarm={alarm}>
    <header><span>SIMULATED WAVEFORMS / NOT PATIENT DATA</span><span>POWER <b>{power.toUpperCase()}</b></span></header>
    <div className="patient-channel"><div className="patient-wave-region"><span>ECG</span><Waveform kind="ecg" available={leads === "enabled"} message={message(leads)}/></div><div className="patient-sensor"><span>LEADS</span><strong>{label(leads)}</strong><small>Heart rate: not measured</small></div></div>
    <div className="patient-channel"><div className="patient-wave-region"><span>PULSE</span><Waveform kind="pleth" available={spo2 === "enabled"} message={message(spo2)}/></div><div className="patient-sensor"><span>SpO2 SENSOR</span><strong>{label(spo2)}</strong><small>Oxygen level: not measured</small></div></div>
    <div className="patient-alarm" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17V10A7 7 0 0 1 19 10V17L21 19H3Z M9 22H15"/></svg><span>ALARM AUDIBLE</span><strong>{alarm === "enabled" ? "Enabled" : alarm === "disabled" ? "Disabled" : alarm === "unknown" ? "Unknown" : "Unpowered"}</strong><small>Control status</small></div>
    <footer><span>Nurse key <b>{!known("keyed_one") ? "Unknown" : state.keyed_one ? "ON" : "OFF"}</b></span><span>Key 2 <b>{!known("keyed_two") ? "Unknown" : state.keyed_two ? "ON" : "OFF"}</b></span><strong>{!connection.isLive ? "Awaiting live readings" : win ? "Monitor controls restored" : "Restoration incomplete"}</strong></footer>
  </section>;
}
