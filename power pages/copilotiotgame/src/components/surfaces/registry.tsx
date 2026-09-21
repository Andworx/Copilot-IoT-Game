import type { ComponentType } from "react";
import type { SurfaceKind } from "../../types/game";
import type { PanelSurfaceProps } from "./types";
import { DialArcPanel } from "../layouts/DialArcPanel";
import { KeypadPanel } from "../layouts/KeypadPanel";
import { DipStripPanel } from "../layouts/DipStripPanel";
import { PairedColumnsPanel } from "../layouts/PairedColumnsPanel";
import { RadioClusterPanel } from "../layouts/RadioClusterPanel";

// Read-only adapters preserve the remaining modes while their dedicated surfaces
// are built. Keys on device.instruments supply domain meaning, never array indexes.
function legacy(Component: typeof DialArcPanel | typeof KeypadPanel) {
  return function LegacySurface({ device, state, lampColors, win, connection }: PanelSurfaceProps) {
    const visibleLamps = connection.isLive ? lampColors : Object.fromEntries(device.lamps.map(lamp => [lamp.key, "off" as const]));
    return <div className="legacy-instrument" data-available={connection.isLive}>
      <Component device={device} state={state} lampColors={visibleLamps} win={win} disabled onToggle={() => {}} />
      {!connection.isLive && <div className="instrument-unavailable">Waiting for physical panel</div>}
    </div>;
  };
}

export const SURFACES: Record<SurfaceKind, ComponentType<PanelSurfaceProps>> = {
  "hvac-thermostat": legacy(DialArcPanel),
  "security-door-panel": legacy(KeypadPanel),
  "coldchain-logger": legacy(DipStripPanel),
  "pump-scada": legacy(PairedColumnsPanel),
  "field-radio": legacy(RadioClusterPanel),
  "ev-charge-pedestal": legacy(PairedColumnsPanel),
  "elevator-service": legacy(KeypadPanel),
  "traffic-cabinet": legacy(DipStripPanel),
  "patient-monitor": legacy(DialArcPanel),
  "payment-terminal": legacy(KeypadPanel),
  "drone-ground-station": legacy(RadioClusterPanel),
  "robot-teach-pendant": legacy(PairedColumnsPanel),
};
