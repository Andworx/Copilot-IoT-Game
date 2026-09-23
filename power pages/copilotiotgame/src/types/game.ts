export interface CableRequirement { cable: number | null; sockets: readonly string[]; }

export type LampColor = "off" | "green" | "amber" | "red";

export type DeviceState = Record<string, boolean>;

export type SurfaceKind =
  | "hvac-thermostat" | "security-door-panel" | "coldchain-logger"
  | "pump-scada" | "field-radio" | "ev-charge-pedestal"
  | "elevator-service" | "traffic-cabinet" | "patient-monitor"
  | "payment-terminal" | "drone-ground-station" | "robot-teach-pendant";

export interface LampDef {
  key: string;
  label: string;
}

export type PhysicalControlKey =
  | "SW1"
  | "SW2"
  | "SW3"
  | "SW4"
  | "SW5"
  | "SW6"
  | "S1"
  | "S2"
  | "S3"
  | "S4";

export interface RestoreStep {
  physicalPin: PhysicalControlKey;
  key: string;
  label: string;
  target: boolean;
}

/**
 * One row of what `andy_deviceprofile` will hold in Dataverse (GAME_MODE_PLAN.md §5) plus
 * the presentation logic (checkWin/computeLamps) that stays in code, not the table —
 * see PRIZE_ENGINE_SPEC.md's equivalent note for why picking logic isn't data.
 */
export interface DeviceProfile {
  slug: string;
  label: string;
  sector: string;
  modeIndex: number;
  dialPosition: number;
  restoreSequence: readonly RestoreStep[];
  isGameDevice: boolean;
  surfaceKind: SurfaceKind;
  accent: string;
  displayFont: string;
  lamps: LampDef[];
  fault: DeviceState;
  requiredCables: readonly CableRequirement[];
  checkWin: (state: DeviceState, cables?: readonly CableRequirement[]) => boolean;
  computeLamps: (state: DeviceState, win: boolean) => Record<string, LampColor>;
  faultText: string;
  okText: string;
  steps: string[];
  winMessage: string;
  restoreItems: string[];
}

export interface Prize {
  name: string;
  weight: number;
  color: string;
}
