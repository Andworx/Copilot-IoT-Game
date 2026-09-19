/**
 * Pure helpers for the panel Pi telemetry pipeline (no Azure/Dataverse imports, so they
 * are unit-testable). The payload shape is what hardware/raspberry-pi/panel_controller.py
 * publishes -- keep the two in sync.
 */

export interface PanelCable {
  /** Cable number from hardware/raspberry-pi/cable_matrix.py CABLES, or null if unrecognised. */
  cable: number | null;
  sockets: string[];
}

export interface PanelPayload {
  deviceSlug?: string;
  deviceName?: string;
  modeIndex?: number;
  /** Restore-sequence key -> state, e.g. { power: true, socket_j1: false }. */
  controls?: Record<string, boolean>;
  rawSwitches?: Record<string, boolean>;
  rawConnectors?: Record<string, boolean>;
  cables?: PanelCable[];
  lamps?: Record<string, boolean>;
  win?: boolean;
  /** state_change | heartbeat | win | mode_change */
  eventType?: string;
  timestamp?: string;
  needs_help?: boolean;
  deviceId?: string;
  device_id?: string;
}

export const DEFAULT_DEVICE_ID = "raspberry-pi-iotpanel";

/** Event Hub bodies arrive as an object, or a JSON string when the sender didn't set a content type. */
export function parsePayload(event: unknown): PanelPayload | null {
  if (typeof event === "string") {
    try {
      const parsed: unknown = JSON.parse(event);
      return parsed && typeof parsed === "object" ? (parsed as PanelPayload) : null;
    } catch {
      return null;
    }
  }
  return event && typeof event === "object" ? (event as PanelPayload) : null;
}

/**
 * IoT Hub stamps the sending device on every event; the panel payload itself doesn't carry
 * an id. Falls back to the payload, then the single-panel default.
 */
export function resolveDeviceId(
  payload: PanelPayload,
  systemProperties?: Record<string, unknown>
): string {
  const fromHub = systemProperties?.["iothub-connection-device-id"];
  if (typeof fromHub === "string" && fromHub) return fromHub;
  return payload.deviceId || payload.device_id || DEFAULT_DEVICE_ID;
}

/**
 * True when the panel is unrestored and the update is a live reading. An explicit
 * `needs_help` from the Pi wins. `mode_change` events carry no state, so they never
 * count.
 */
export function deriveNeedsHelp(payload: PanelPayload): boolean {
  if (typeof payload.needs_help === "boolean") return payload.needs_help;
  if (payload.eventType === "mode_change") return false;
  return payload.win === false;
}

const flag = (value: boolean | undefined) => (value ? 1 : 0);

function flags(record: Record<string, boolean> | undefined): string | null {
  if (!record) return null;
  return JSON.stringify(Object.fromEntries(Object.entries(record).map(([k, v]) => [k, flag(v)])));
}

/** e.g. "10:J1-J4;12:J2-J3"; an unrecognised cable is "?". */
export function summarizeCables(cables: PanelCable[] | undefined): string {
  return (cables ?? []).map((c) => `${c.cable ?? "?"}:${c.sockets.join("-")}`).join(";");
}

/**
 * Maps a panel payload onto the existing andy_iottelemetryevent columns (no schema
 * change): switch/socket state and lamp state go in the JSON text columns as 0/1 flags,
 * the mode slug plus any recognised cables go in andy_activerule, and "mismatch" means
 * the panel isn't restored.
 */
export function toTelemetryRecord(
  payload: PanelPayload,
  deviceId: string,
  now: () => Date = () => new Date()
): Record<string, unknown> {
  const timestamp = payload.timestamp ?? now().toISOString();
  const unrestored = payload.win === false;
  const cables = summarizeCables(payload.cables);
  const activeRule = [payload.deviceSlug, cables && `cables=${cables}`].filter(Boolean).join(" ");
  const switchState = flags({ ...payload.rawSwitches, ...payload.rawConnectors });

  return {
    andy_name: `${deviceId} ${timestamp}`,
    andy_deviceid: deviceId,
    andy_eventtype: payload.eventType ?? "telemetry-snapshot",
    andy_value: unrestored ? "MISMATCH" : "OK",
    andy_mismatch: unrestored,
    andy_activerule: activeRule || null,
    andy_switchstate: switchState === "{}" ? null : switchState,
    andy_ledstate: flags(payload.lamps),
    andy_expectedledstate: null,
  };
}

export interface SignalRMessage {
  target: string;
  arguments: unknown[];
}

/** SendTelemetryUpdate always; TriggerAgentHelp too when the panel needs help. */
export function buildSignalRMessages(
  payload: PanelPayload,
  deviceId: string,
  now: () => Date = () => new Date()
): SignalRMessage[] {
  const timestamp = payload.timestamp ?? now().toISOString();
  const messages: SignalRMessage[] = [
    {
      target: "SendTelemetryUpdate",
      arguments: [{ deviceId, timestamp, data: payload, source: "iot-hub" }],
    },
  ];
  if (deriveNeedsHelp(payload)) {
    messages.push({
      target: "TriggerAgentHelp",
      arguments: [
        {
          deviceId,
          timestamp,
          deviceSlug: payload.deviceSlug ?? null,
          controls: payload.controls ?? null,
          cables: payload.cables ?? [],
          win: payload.win ?? false,
        },
      ],
    });
  }
  return messages;
}
