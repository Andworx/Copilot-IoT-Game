import type { ComponentType } from "react";
import type { SurfaceKind } from "../../types/game";
import type { PanelSurfaceProps } from "./types";
import { ThermostatSurface } from "./ThermostatSurface";
import { SmartLockSurface } from "./SmartLockSurface";
import { ColdChainSurface } from "./ColdChainSurface";
import { WaterPumpSurface } from "./WaterPumpSurface";
import { FieldRadioSurface } from "./FieldRadioSurface";
import { EvChargerSurface } from "./EvChargerSurface";
import { ElevatorSurface } from "./ElevatorSurface";
import { TrafficSignalSurface } from "./TrafficSignalSurface";
import { PatientMonitorSurface } from "./PatientMonitorSurface";
import { RetailKioskSurface } from "./RetailKioskSurface";
import { DroneGroundSurface } from "./DroneGroundSurface";
import { RobotArmSurface } from "./RobotArmSurface";

export const SURFACES: Record<SurfaceKind, ComponentType<PanelSurfaceProps>> = {
  "hvac-thermostat": ThermostatSurface,
  "security-door-panel": SmartLockSurface,
  "coldchain-logger": ColdChainSurface,
  "pump-scada": WaterPumpSurface,
  "field-radio": FieldRadioSurface,
  "ev-charge-pedestal": EvChargerSurface,
  "elevator-service": ElevatorSurface,
  "traffic-cabinet": TrafficSignalSurface,
  "patient-monitor": PatientMonitorSurface,
  "payment-terminal": RetailKioskSurface,
  "drone-ground-station": DroneGroundSurface,
  "robot-teach-pendant": RobotArmSurface,
};
