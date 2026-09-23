import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSignalRMessages,
  deriveNeedsHelp,
  MAX_PAYLOAD_CHARS,
  PAYLOAD_SCHEMA,
  parsePayload,
  resolveDeviceId,
  shouldLog,
  toTelemetryRecord,
  type PanelPayload,
} from "../src/lib/telemetry";

const fixedNow = () => new Date("2026-09-19T12:00:00.000Z");

const restoring: PanelPayload = {
  deviceSlug: "thermostat",
  modeIndex: 1,
  eventType: "state_change",
  timestamp: "2026-09-19T11:59:00.000Z",
  controls: { fan: true, socket_s1: true, socket_s2: true },
  rawSwitches: { SW1: true, SW2: false },
  rawConnectors: { S1: true, S2: true, S3: false, S4: false },
  cables: [{ cable: 4, sockets: ["S1", "S2"] }],
  lamps: { power: true, progress: true },
  win: false,
};

describe("parsePayload", () => {
  it("accepts objects and JSON strings, rejects everything else", () => {
    assert.deepEqual(parsePayload({ win: true }), { win: true });
    assert.deepEqual(parsePayload('{"win":false}'), { win: false });
    assert.equal(parsePayload("not json"), null);
    assert.equal(parsePayload("42"), null);
    assert.equal(parsePayload(null), null);
  });
});

describe("resolveDeviceId", () => {
  it("prefers the IoT Hub system property, then the payload, then the default", () => {
    assert.equal(resolveDeviceId({}, { "iothub-connection-device-id": "pi-a" }), "pi-a");
    assert.equal(resolveDeviceId({ deviceId: "pi-b" }, {}), "pi-b");
    assert.equal(resolveDeviceId({ device_id: "pi-c" }), "pi-c");
    assert.equal(resolveDeviceId({}), "raspberry-pi-iotpanel");
  });
});

describe("deriveNeedsHelp", () => {
  it("is true only for an unrestored live reading", () => {
    assert.equal(deriveNeedsHelp({ win: false, eventType: "state_change" }), true);
    assert.equal(deriveNeedsHelp({ win: true, eventType: "win" }), false);
    assert.equal(deriveNeedsHelp({ eventType: "mode_change" }), false);
    assert.equal(deriveNeedsHelp({ win: false, eventType: "mode_change" }), false);
    assert.equal(deriveNeedsHelp({ eventType: "heartbeat" }), false); // no win field: unknown, not a fault
  });

  it("lets an explicit needs_help override", () => {
    assert.equal(deriveNeedsHelp({ win: true, needs_help: true }), true);
    assert.equal(deriveNeedsHelp({ win: false, needs_help: false }), false);
  });
});

describe("shouldLog", () => {
  it("logs real events, not heartbeats or mode changes", () => {
    assert.equal(shouldLog({ eventType: "state_change" }), true);
    assert.equal(shouldLog({ eventType: "win" }), true);
    assert.equal(shouldLog({ eventType: "heartbeat" }), false);
    assert.equal(shouldLog({ eventType: "mode_change" }), false);
    assert.equal(shouldLog({}), false);
  });
});

describe("toTelemetryRecord", () => {
  it("writes four short columns plus a JSON payload holding the thing's own attributes", () => {
    const record = toTelemetryRecord(restoring, "pi-a", fixedNow);
    assert.deepEqual(Object.keys(record).sort(), [
      "andy_deviceid", "andy_eventtype", "andy_name", "andy_payload", "andy_value",
    ]);
    assert.equal(record.andy_name, "pi-a 2026-09-19T11:59:00.000Z");
    assert.equal(record.andy_deviceid, "pi-a");
    assert.equal(record.andy_eventtype, "state_change");
    assert.equal(record.andy_value, "UNRESTORED");

    const payload = JSON.parse(record.andy_payload as string);
    assert.equal(payload.schema, PAYLOAD_SCHEMA);
    assert.equal(payload.deviceSlug, "thermostat");
    assert.equal(payload.win, false);
    assert.deepEqual(payload.cables, [{ cable: 4, sockets: ["S1", "S2"] }]);
    assert.deepEqual(payload.controls, { fan: true, socket_s1: true, socket_s2: true });
    assert.deepEqual(payload.lamps, { power: true, progress: true });
  });

  it("marks a restored panel and fills in a missing timestamp", () => {
    const record = toTelemetryRecord({ deviceSlug: "elevator", win: true, eventType: "win" }, "pi-a", fixedNow);
    assert.equal(record.andy_value, "RESTORED");
    assert.equal(record.andy_name, "pi-a 2026-09-19T12:00:00.000Z");
    assert.equal(JSON.parse(record.andy_payload as string).timestamp, "2026-09-19T12:00:00.000Z");
  });

  it("does not claim a result when the reading has none", () => {
    assert.equal(toTelemetryRecord({ eventType: "state_change" }, "pi-a", fixedNow).andy_value, "UNKNOWN");
  });

  it("uses the same columns for a different kind of thing", () => {
    const claw = { eventType: "win", win: true, prize: "plush", arm: { x: 3, y: 9 } } as unknown as PanelPayload;
    const record = toTelemetryRecord(claw, "claw-01", fixedNow);
    assert.equal(record.andy_deviceid, "claw-01");
    assert.deepEqual(JSON.parse(record.andy_payload as string).arm, { x: 3, y: 9 });
  });

  it("never fails the write over an oversized payload: keeps the headline fields and flags it", () => {
    const huge = { ...restoring, controls: Object.fromEntries(Array.from({ length: 1500 }, (_, i) => [`k${i}`, true])) };
    const record = toTelemetryRecord(huge, "pi-a", fixedNow);
    const body = record.andy_payload as string;
    assert.ok(body.length <= MAX_PAYLOAD_CHARS);
    const parsed = JSON.parse(body);
    assert.equal(parsed.truncated, true);
    assert.equal(parsed.deviceSlug, "thermostat");
    assert.equal(parsed.win, false);
  });
});

describe("buildSignalRMessages", () => {
  it("always sends telemetry and adds an agent-help message while unrestored", () => {
    const messages = buildSignalRMessages(restoring, "pi-a", fixedNow);
    assert.deepEqual(messages.map((m) => m.target), ["SendTelemetryUpdate", "TriggerAgentHelp"]);
    const telemetry = messages[0].arguments[0] as { deviceId: string; data: PanelPayload; source: string };
    assert.equal(telemetry.deviceId, "pi-a");
    assert.equal(telemetry.source, "iot-hub");
    assert.deepEqual(telemetry.data.cables, [{ cable: 4, sockets: ["S1", "S2"] }]);
  });

  it("sends only telemetry for a restored panel", () => {
    const messages = buildSignalRMessages({ ...restoring, win: true, eventType: "win" }, "pi-a", fixedNow);
    assert.deepEqual(messages.map((m) => m.target), ["SendTelemetryUpdate"]);
  });
});
