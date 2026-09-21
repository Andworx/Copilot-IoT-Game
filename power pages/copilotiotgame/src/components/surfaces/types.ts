import type { DeviceProfile, DeviceState, LampColor, RestoreStep } from "../../types/game";

/** Read-only contract. There is deliberately no mutation callback. */
export interface PanelSurfaceProps {
  device: DeviceProfile;
  state: DeviceState;
  lampColors: Record<string, LampColor>;
  win: boolean;
  controls: readonly RestoreStep[];
  connection: { isLive: boolean; ageSeconds: number | null };
}
