export interface CableRequirement { cable: number | null; sockets: readonly string[]; }

export type LampColor = "off" | "green" | "amber" | "red";

export type DeviceState = Record<string, boolean>;

export type SurfaceKind =
  | "hvac-thermostat" | "security-door-panel" | "coldchain-logger"
  | "pump-scada" | "field-radio" | "ev-charge-pedestal"
  | "elevator-service" | "traffic-cabinet" | "patient-monitor"
  | "payment-terminal" | "drone-ground-station" | "robot-teach-pendant";

export interface InstrumentBindings {
  dial?: string;
  gauge?: string;
  guards?: readonly [string, string];
  button?: string;
  signal?: string;
}

export type LayoutKind =
  | "dial-arc"
  | "keypad"
  | "dip-strip"
  | "paired-columns"
  | "radio-cluster";

export interface SwitchDef {
  physicalPin: PhysicalControlKey;
  key: string;
  label: string;
}

export interface LampDef {
  key: string;
  label: string;
}

export interface ReadoutText {
  fault: string;
  ok: string;
}

export type PhysicalControlKey =
  | "SW1"
  | "SW2"
  | "SW3"
  | "SW4"
  | "SW5"
  | "SW6"
  | "J1"
  | "J2"
  | "J3"
  | "J4";

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
  /** Temporary adapter for modes awaiting dedicated surfaces. */
  layout: LayoutKind;
  surfaceKind: SurfaceKind;
  instruments: InstrumentBindings;
  accent: string;
  displayFont: string;
  switches: SwitchDef[];
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
  readout?: ReadoutText;
}

export interface Prize {
  name: string;
  weight: number;
  color: string;
}
