import type { PanelSurfaceProps } from "./types";
import { SURFACES } from "./registry";
import { StatusIndicator } from "./StatusIndicator";

export function PanelSurface(props: PanelSurfaceProps) {
  const { device, lampColors, connection } = props;
  const Surface = SURFACES[device.surfaceKind];
  const status = connection.isLive ? "LIVE PANEL" : connection.ageSeconds === null ? "WAITING FOR PANEL" : "PANEL SIGNAL STALE";
  return <section className="panel-surface" data-surface={device.surfaceKind} data-live={connection.isLive} aria-label={`${device.label} instrument`}>
    <div className="surface-connection" role="status">
      <strong>{status}</strong>
      <span>{connection.ageSeconds === null ? "No readings received" : `Last reading ${connection.ageSeconds}s ago`}</span>
    </div>
    <div className="surface-instrument"><Surface {...props} /></div>
    <div className="surface-status-strip">
      {device.lamps.map(lamp => <StatusIndicator key={lamp.key} label={lamp.label} color={lampColors[lamp.key]} isLive={connection.isLive} />)}
    </div>
  </section>;
}
