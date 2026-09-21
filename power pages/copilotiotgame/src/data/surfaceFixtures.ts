import type { DeviceProfile, DeviceState } from "../types/game";

/** Deterministic fixtures; never connected to the live kiosk or its win endpoint. */
export function surfaceFixtures(device: DeviceProfile) {
  const restored: DeviceState = Object.fromEntries(device.restoreSequence.map(c => [c.key, c.target]));
  const partial = { ...device.fault };
  for (const control of device.restoreSequence.filter(c => ["SW1", "SW3"].includes(c.physicalPin))) partial[control.key] = control.target;
  return {
    fault: { state: { ...device.fault }, connection: { isLive: true, ageSeconds: 0 } },
    partial: { state: partial, connection: { isLive: true, ageSeconds: 1 } },
    restored: { state: restored, connection: { isLive: true, ageSeconds: 0 } },
    stale: { state: restored, connection: { isLive: false, ageSeconds: 46 } },
    waiting: { state: {}, connection: { isLive: false, ageSeconds: null } },
  };
}
