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
  cableSchema?: string;
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

/** Identifies the payload shape for this kind of thing; bump the suffix if the shape changes. */
export const PAYLOAD_SCHEMA = "restore-and-spin/v1";

/** andy_payload is a multiline text column; keep the JSON comfortably inside its limit. */
export const MAX_PAYLOAD_CHARS = 10_000;

/** Events worth a history row. Heartbeats only prove the panel is alive, and mode changes carry no state. */
const LOGGED_EVENT_TYPES = new Set(["state_change", "win"]);

export function shouldLog(payload: PanelPayload): boolean {
  return LOGGED_EVENT_TYPES.has(payload.eventType ?? "");
}

function valueFor(payload: PanelPayload): string {
  if (payload.win === true) return "RESTORED";
  if (payload.win === false) return "UNRESTORED";
  return "UNKNOWN";
}

/**
 * Maps a panel reading onto the generic andy_iottelemetryevent event log: four short,
 * filterable columns (name, device, event type, value) plus `andy_payload`, a JSON
 * document holding everything specific to this kind of thing. A different device (a claw
 * machine, another IoT panel) writes the same columns with its own payload and schema tag,
 * so adding a new thing never needs a new column.
 */
export function toTelemetryRecord(
  payload: PanelPayload,
  deviceId: string,
  now: () => Date = () => new Date()
): Record<string, unknown> {
  const timestamp = payload.timestamp ?? now().toISOString();
  let body = JSON.stringify({ schema: PAYLOAD_SCHEMA, ...payload, timestamp });
  if (body.length > MAX_PAYLOAD_CHARS) {
    // Never fail the write over size: keep the headline fields and flag the cut.
    body = JSON.stringify({
      schema: PAYLOAD_SCHEMA,
      truncated: true,
      deviceSlug: payload.deviceSlug ?? null,
      win: payload.win ?? null,
      eventType: payload.eventType ?? null,
      timestamp,
    });
  }

  return {
    andy_name: `${deviceId} ${timestamp}`,
    andy_deviceid: deviceId,
    andy_eventtype: payload.eventType ?? "telemetry-snapshot",
    andy_value: valueFor(payload),
    andy_payload: body,
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
