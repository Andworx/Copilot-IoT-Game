/**
 * What the panel Pi publishes (hardware/raspberry-pi/panel_controller.py), relayed
 * unchanged by the Function App's iot-telemetry trigger as `SendTelemetryUpdate`
 * (azure/src/lib/telemetry.ts). `controls` is keyed by the same restore-sequence keys as
 * deviceProfiles.ts (e.g. "power", "socket_s1"), so it can be used directly as DeviceState.
 */
export interface PanelCable {
  /** Generic RJ-45 patch cable marker, or null for something unrecognised. */
  cable: number | null;
  sockets: string[];
}

export interface PanelTelemetry {
  deviceSlug?: string;
  deviceName?: string;
  modeIndex?: number;
  controls?: Record<string, boolean>;
  cables?: PanelCable[];
  cableSchema?: string;
  lamps?: Record<string, boolean>;
  win?: boolean;
  /** state_change | heartbeat | win | mode_change */
  eventType?: string;
  timestamp?: string;
}

export interface TelemetryMessage {
  deviceId: string;
  timestamp: string;
  data: PanelTelemetry;
  source: string;
}
