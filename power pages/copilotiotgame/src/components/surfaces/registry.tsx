import type { ComponentType } from "react";
import type { SurfaceKind } from "../../types/game";
import type { PanelSurfaceProps } from "./types";
import { ThermostatSurface } from "./ThermostatSurface";
import { SmartLockSurface } from "./SmartLockSurface";
import { ColdChainSurface } from "./ColdChainSurface";
import { WaterPumpSurface } from "./WaterPumpSurface";
import { FieldRadioSurface } from "./FieldRadioSurface";
import { TrafficSignalSurface } from "./TrafficSignalSurface";
import { PatientMonitorSurface } from "./PatientMonitorSurface";
import { RetailKioskSurface } from "./RetailKioskSurface";
import { DroneGroundSurface } from "./DroneGroundSurface";
import { DialArcPanel } from "../layouts/DialArcPanel";
import { KeypadPanel } from "../layouts/KeypadPanel";
import { PairedColumnsPanel } from "../layouts/PairedColumnsPanel";

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
  "hvac-thermostat": ThermostatSurface,
  "security-door-panel": SmartLockSurface,
  "coldchain-logger": ColdChainSurface,
  "pump-scada": WaterPumpSurface,
  "field-radio": FieldRadioSurface,
  "ev-charge-pedestal": legacy(PairedColumnsPanel),
  "elevator-service": legacy(KeypadPanel),
  "traffic-cabinet": TrafficSignalSurface,
  "patient-monitor": PatientMonitorSurface,
  "payment-terminal": RetailKioskSurface,
  "drone-ground-station": DroneGroundSurface,
  "robot-teach-pendant": legacy(PairedColumnsPanel),
};
