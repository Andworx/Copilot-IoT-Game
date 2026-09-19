import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSignalRMessages,
  deriveNeedsHelp,
  parsePayload,
  resolveDeviceId,
  summarizeCables,
  toTelemetryRecord,
  type PanelPayload,
} from "../src/lib/telemetry";

const fixedNow = () => new Date("2026-09-19T12:00:00.000Z");

const restoring: PanelPayload = {
  deviceSlug: "thermostat",
  modeIndex: 1,
  eventType: "state_change",
  timestamp: "2026-09-19T11:59:00.000Z",
  controls: { fan: true, socket_j1: true, socket_j2: true },
  rawSwitches: { SW1: true, SW2: false },
  rawConnectors: { J1: true, J2: true, J3: false, J4: false },
  cables: [{ cable: 4, sockets: ["J1", "J2"] }],
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

describe("summarizeCables", () => {
  it("formats recognised and unrecognised cables", () => {
    assert.equal(summarizeCables(undefined), "");
    assert.equal(
      summarizeCables([
        { cable: 10, sockets: ["J1", "J4"] },
        { cable: null, sockets: ["J2", "J3"] },
      ]),
      "10:J1-J4;?:J2-J3"
    );
  });
});

describe("toTelemetryRecord", () => {
  it("maps a panel reading onto the legacy telemetry columns", () => {
    const record = toTelemetryRecord(restoring, "pi-a", fixedNow);
    assert.equal(record.andy_name, "pi-a 2026-09-19T11:59:00.000Z");
    assert.equal(record.andy_deviceid, "pi-a");
    assert.equal(record.andy_eventtype, "state_change");
    assert.equal(record.andy_value, "MISMATCH");
    assert.equal(record.andy_mismatch, true);
    assert.equal(record.andy_activerule, "thermostat cables=4:J1-J2");
    assert.deepEqual(JSON.parse(record.andy_switchstate as string), {
      SW1: 1, SW2: 0, J1: 1, J2: 1, J3: 0, J4: 0,
    });
    assert.deepEqual(JSON.parse(record.andy_ledstate as string), { power: 1, progress: 1 });
    assert.equal(record.andy_expectedledstate, null);
  });

  it("marks a restored panel OK and fills in a missing timestamp", () => {
    const record = toTelemetryRecord({ deviceSlug: "elevator", win: true, eventType: "win" }, "pi-a", fixedNow);
    assert.equal(record.andy_value, "OK");
    assert.equal(record.andy_mismatch, false);
    assert.equal(record.andy_name, "pi-a 2026-09-19T12:00:00.000Z");
    assert.equal(record.andy_activerule, "elevator");
    assert.equal(record.andy_switchstate, null);
    assert.equal(record.andy_ledstate, null);
  });
});

describe("buildSignalRMessages", () => {
  it("always sends telemetry and adds an agent-help message while unrestored", () => {
    const messages = buildSignalRMessages(restoring, "pi-a", fixedNow);
    assert.deepEqual(messages.map((m) => m.target), ["SendTelemetryUpdate", "TriggerAgentHelp"]);
    const telemetry = messages[0].arguments[0] as { deviceId: string; data: PanelPayload; source: string };
    assert.equal(telemetry.deviceId, "pi-a");
    assert.equal(telemetry.source, "iot-hub");
    assert.deepEqual(telemetry.data.cables, [{ cable: 4, sockets: ["J1", "J2"] }]);
  });

  it("sends only telemetry for a restored panel", () => {
    const messages = buildSignalRMessages({ ...restoring, win: true, eventType: "win" }, "pi-a", fixedNow);
    assert.deepEqual(messages.map((m) => m.target), ["SendTelemetryUpdate"]);
  });
});
