import assert from "node:assert/strict";
import { test } from "node:test";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { listCampaignOverview, setCampaignMaxEntries, setCampaignSourceLinked } from "../src/lib/campaigns";

const CAMPAIGN = "11111111-1111-1111-1111-111111111111";
const SOURCE = "22222222-2222-2222-2222-222222222222";
const CAP = "33333333-3333-3333-3333-333333333333";

function mockDataverse(t: import("node:test").TestContext, caps: Array<{ id: string; statecode: number }>) {
  process.env.DATAVERSE_CLIENT_ID = "00000000-0000-0000-0000-000000000001";
  process.env.DATAVERSE_TENANT_ID = "00000000-0000-0000-0000-000000000002";
  process.env.DATAVERSE_CLIENT_SECRET = "test-only";
  t.mock.method(ConfidentialClientApplication.prototype, "acquireTokenByClientCredential", async () => ({
    accessToken: "test-only", expiresOn: new Date(Date.now() + 3600000),
  }));
  const writes: Array<{ method: string; path: string; body: unknown }> = [];
  t.mock.method(globalThis, "fetch", async (input: string, init: RequestInit = {}) => {
    const path = decodeURIComponent(String(input)).split("/api/data/v9.2/")[1];
    if (init.method === "PATCH" || init.method === "POST") {
      writes.push({ method: init.method, path, body: JSON.parse(String(init.body)) });
      return new Response(null, { status: 204 });
    }
    if (path.startsWith("andy_contestcampaigns")) {
      return Response.json({ value: [{ andy_contestcampaignid: CAMPAIGN, andy_eventname: " Summit ", andy_maxentriespercontact: 3 }] });
    }
    if (path.startsWith("andy_contestsources")) {
      return Response.json({ value: [{ andy_contestsourceid: SOURCE, andy_sourcekey: "plinko", andy_sourcename: "Plinko" }] });
    }
    const forPair = path.includes("_andy_source_value eq");
    const rows = caps.filter((cap) => forPair || cap.statecode === 0);
    return Response.json({
      value: rows.map((cap) => ({
        andy_contestsourcecapid: cap.id, statecode: cap.statecode,
        _andy_campaignname_value: CAMPAIGN, _andy_source_value: SOURCE,
      })),
    });
  });
  return writes;
}

test("overview lists campaigns with only their active connected sources", async (t) => {
  mockDataverse(t, [{ id: CAP, statecode: 0 }]);
  const overview = await listCampaignOverview();
  assert.deepEqual(overview.sources, [{ id: SOURCE, key: "plinko", name: "Plinko" }]);
  assert.deepEqual(overview.campaigns, [{ id: CAMPAIGN, name: "Summit", maxEntries: 3, sourceIds: [SOURCE] }]);
});

test("linking creates a Source Cap named like the MDA form, once", async (t) => {
  const writes = mockDataverse(t, []);
  await setCampaignSourceLinked(CAMPAIGN, SOURCE, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].method, "POST");
  assert.deepEqual(writes[0].body, {
    andy_settingname: "Summit - Plinko",
    "andy_CampaignName@odata.bind": `/andy_contestcampaigns(${CAMPAIGN})`,
    "andy_Source@odata.bind": `/andy_contestsources(${SOURCE})`,
  });
});

test("linking reactivates an inactive pair and skips one that is already active", async (t) => {
  const inactive = mockDataverse(t, [{ id: CAP, statecode: 1 }]);
  await setCampaignSourceLinked(CAMPAIGN, SOURCE, true);
  assert.deepEqual(inactive.map((w) => [w.method, w.path, w.body]), [["PATCH", `andy_contestsourcecaps(${CAP})`, { statecode: 0, statuscode: 1 }]]);
});

test("linking an already active pair writes nothing", async (t) => {
  const writes = mockDataverse(t, [{ id: CAP, statecode: 0 }]);
  await setCampaignSourceLinked(CAMPAIGN, SOURCE, true);
  assert.deepEqual(writes, []);
});

test("unlinking deactivates the Source Cap instead of deleting it", async (t) => {
  const writes = mockDataverse(t, [{ id: CAP, statecode: 0 }]);
  await setCampaignSourceLinked(CAMPAIGN, SOURCE, false);
  assert.deepEqual(writes.map((w) => [w.method, w.path, w.body]), [["PATCH", `andy_contestsourcecaps(${CAP})`, { statecode: 1, statuscode: 2 }]]);
});

test("max entries patches the campaign, and ids must be GUIDs", async (t) => {
  const writes = mockDataverse(t, []);
  await setCampaignMaxEntries(CAMPAIGN, 5);
  assert.deepEqual(writes.map((w) => [w.method, w.path, w.body]), [["PATCH", `andy_contestcampaigns(${CAMPAIGN})`, { andy_maxentriespercontact: 5 }]]);
  await assert.rejects(() => setCampaignMaxEntries("x' or 1 eq 1", 5));
});
