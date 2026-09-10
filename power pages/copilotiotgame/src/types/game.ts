export type LampColor = "off" | "green" | "amber" | "red";

export type DeviceState = Record<string, boolean>;

export type LayoutKind =
  | "dial-arc"
  | "keypad"
  | "dip-strip"
  | "paired-columns"
  | "radio-cluster";

export interface SwitchDef {
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

/**
 * One row of what `andy_deviceprofile` will hold in Dataverse (GAME_MODE_PLAN.md §5) plus
 * the presentation logic (checkWin/computeLamps) that stays in code, not the table —
 * see PRIZE_ENGINE_SPEC.md's equivalent note for why picking logic isn't data.
 */
export interface DeviceProfile {
  slug: string;
  label: string;
  sector: string;
  dialPosition: number;
  isGameDevice: boolean;
  layout: LayoutKind;
  accent: string;
  displayFont: string;
  switches: SwitchDef[];
  lamps: LampDef[];
  fault: DeviceState;
  checkWin: (state: DeviceState) => boolean;
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
