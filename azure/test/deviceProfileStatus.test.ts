import assert from "node:assert/strict";
import { test } from "node:test";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { listDeviceProfiles, setDeviceProfileEnabled } from "../src/lib/dataverse";

test("device profiles read built-in status and toggle with valid state/reason pairs", async (t) => {
  process.env.DATAVERSE_CLIENT_ID = "00000000-0000-0000-0000-000000000001";
  process.env.DATAVERSE_TENANT_ID = "00000000-0000-0000-0000-000000000002";
  process.env.DATAVERSE_CLIENT_SECRET = "test-only";
  t.mock.method(ConfidentialClientApplication.prototype, "acquireTokenByClientCredential", async () => ({
    accessToken: "test-only", expiresOn: new Date(Date.now() + 3600000),
  }));
  const writes: unknown[] = [];
  t.mock.method(globalThis, "fetch", async (input: string, init: RequestInit) => {
    assert.ok(!input.includes("andy_isenabled"));
    if (init.method === "PATCH") {
      writes.push(JSON.parse(String(init.body)));
      return new Response(null, { status: 204 });
    }
    assert.ok(input.includes("statecode"));
    return Response.json({ value: [0, 1, null, 99].map((statecode, index) => ({
      andy_deviceprofileid: String(index), andy_name: `Device ${index}`,
      andy_deviceslug: `device-${index}`, statecode, andy_wintext: " Done ",
    })) });
  });
  const profiles = await listDeviceProfiles();
  assert.deepEqual(profiles.map(p => p.isEnabled), [true, false, false, false]);
  assert.equal(profiles[0].winText, "Done");
  await setDeviceProfileEnabled("00000000-0000-0000-0000-000000000003", false);
  await setDeviceProfileEnabled("00000000-0000-0000-0000-000000000003", true);
  assert.deepEqual(writes, [{ statecode: 1, statuscode: 2 }, { statecode: 0, statuscode: 1 }]);
});
