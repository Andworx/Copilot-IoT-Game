import assert from "node:assert/strict";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { describe, it, mock } from "node:test";
import {
  buildGrandPrizeDrawingSlices,
  buildContactCreatePayload,
  buildGrandPrizeEntryPayload,
  buildIotGameWinCreatePayload,
  buildPrizeClaimCreatePayload,
  createSourcedPrizeClaim,
  GAME_PLAY_ENTRY_TABLES,
  MAX_ENTRIES_PER_CLAIM,
  normalizeContestantEmail,
  planGrandPrizeEntryCount,
  selectGrandPrizeWinningSlice,
  summarizePrizeCounts,
} from "../src/lib/dataverse";

describe("createSourcedPrizeClaim", () => {
  it("atomically upserts concurrent claims by the unique claim-token key", async (t) => {
    process.env.DATAVERSE_CLIENT_ID = "00000000-0000-0000-0000-000000000001";
    process.env.DATAVERSE_TENANT_ID = "00000000-0000-0000-0000-000000000002";
    process.env.DATAVERSE_CLIENT_SECRET = "test-only";
    t.mock.method(ConfidentialClientApplication.prototype, "acquireTokenByClientCredential", async () => ({
      accessToken: "test-only",
      expiresOn: new Date(Date.now() + 3600000),
    }));

    const claimToken = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const prizeClaimId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const requests: Array<{ url: string; init: RequestInit }> = [];
    let claimCreated = false;
    t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const request = init ?? {};
      requests.push({ url, init: request });
      if (url.includes("andy_contestcampaigns")) return Response.json({ value: [] });
      if (url.includes("andy_contestsources")) {
        return Response.json({ value: [{ andy_contestsourceid: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }] });
      }
      if (url.includes("andy_prizeclaims?")) return Response.json({ value: [{ andy_prizeclaimid: prizeClaimId }] });
      if (claimCreated) return new Response(null, { status: 412 });
      claimCreated = true;
      return new Response(null, {
        status: 201,
        headers: { "OData-EntityId": `https://example.crm.dynamics.com/api/data/v9.2/andy_prizeclaims(${prizeClaimId})` },
      });
    });

    const results = await Promise.all([
      createSourcedPrizeClaim({ claimToken, contestSourceKey: "mcpquest", name: "MCP Quest win" }),
      createSourcedPrizeClaim({ claimToken, contestSourceKey: "mcpquest", name: "MCP Quest win" }),
    ]);

    assert.deepEqual(results.map((result) => result.prizeClaimId), [prizeClaimId, prizeClaimId]);
    assert.deepEqual(results.map((result) => result.existed).sort(), [false, true]);
    const upserts = requests.filter(({ init }) => init.method === "PATCH");
    assert.equal(upserts.length, 2);
    assert.ok(upserts.every(({ url }) => url.includes(`andy_prizeclaims(andy_claim_token='${claimToken}')`)));
    assert.ok(upserts.every(({ init }) => new Headers(init.headers).get("If-None-Match") === "*"));
  });
});

describe("normalizeContestantEmail", () => {
  it("trims and lowercases an email address", () => {
    assert.equal(normalizeContestantEmail("  Player@Example.COM  "), "player@example.com");
  });

  it("returns null for missing or blank email", () => {
    assert.equal(normalizeContestantEmail(undefined), null);
    assert.equal(normalizeContestantEmail("   "), null);
  });
});

describe("buildContactCreatePayload", () => {
  it("creates a minimal Contact payload only when sharing is enabled and email is present", () => {
    assert.deepEqual(
      buildContactCreatePayload({ firstName: " Ada ", lastName: " Lovelace ", email: " ADA@Example.com ", sharedInfo: true }),
      { emailaddress1: "ada@example.com", firstname: "Ada", lastname: "Lovelace", fullname: "Ada Lovelace" }
    );
  });

  it("falls back to the legacy single name when first and last name are absent", () => {
    assert.deepEqual(
      buildContactCreatePayload({ name: "  Grace Hopper ", email: " GRACE@example.com ", sharedInfo: true }),
      { emailaddress1: "grace@example.com", fullname: "Grace Hopper" }
    );
  });

  it("omits blank names and refuses non-shared contact capture", () => {
    assert.deepEqual(buildContactCreatePayload({ name: " ", email: "guest@example.com", sharedInfo: true }), {
      emailaddress1: "guest@example.com",
    });
    assert.equal(buildContactCreatePayload({ name: "Guest", email: "guest@example.com", sharedInfo: false }), null);
  });
});

describe("buildPrizeClaimCreatePayload", () => {
  it("builds the shared claim parent with the new Prize Claim schema", () => {
    assert.deepEqual(
      buildPrizeClaimCreatePayload({
        claimToken: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        deviceSlug: "smart-lock",
        campaignId: "11111111-1111-1111-1111-111111111111",
        contestSourceId: "22222222-2222-2222-2222-222222222222",
        now: new Date("2026-09-25T15:30:00.000Z"),
      }),
      {
        andy_name: "IoT smart-lock 2026-09-25T15:30:00.000Z",
        andy_claim_token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        andy_claim_status: 435700000,
        andy_win_time: "2026-09-25T15:30:00.000Z",
        "andy_Campaign@odata.bind": "/andy_contestcampaigns(11111111-1111-1111-1111-111111111111)",
        "andy_Contest_Source@odata.bind": "/andy_contestsources(22222222-2222-2222-2222-222222222222)",
      }
    );
  });
});

describe("buildIotGameWinCreatePayload", () => {
  it("builds the IoT detail row linked to Prize Claim and Device Profile", () => {
    assert.deepEqual(
      buildIotGameWinCreatePayload({
        prizeClaimId: "11111111-1111-1111-1111-111111111111",
        deviceProfileId: "22222222-2222-2222-2222-222222222222",
        deviceSlug: "smart-lock",
        now: new Date("2026-09-25T15:30:00.000Z"),
      }),
      {
        andy_name: "IoT smart-lock 2026-09-25T15:30:00.000Z",
        "andy_prize_claim@odata.bind": "/andy_prizeclaims(11111111-1111-1111-1111-111111111111)",
        "andy_device_profile@odata.bind": "/andy_deviceprofiles(22222222-2222-2222-2222-222222222222)",
      }
    );
  });
});

describe("buildGrandPrizeEntryPayload", () => {
  it("builds a lookup-based Grand Prize Entry payload from the exported schema", () => {
    assert.deepEqual(
      buildGrandPrizeEntryPayload({
        campaignId: "11111111-1111-1111-1111-111111111111",
        contactId: "22222222-2222-2222-2222-222222222222",
        prizeClaimId: "33333333-3333-3333-3333-333333333333",
        sourceCapId: "44444444-4444-4444-4444-444444444444",
        checkInCode: "DEMO-123456",
        contestant: { firstName: " Grace ", lastName: " Hopper ", email: " GRACE@example.com ", sharedInfo: true },
        now: new Date("2026-09-24T12:00:00.000Z"),
      }),
      {
        andy_participantname: "Grace Hopper",
        andy_entrytimestamp: "2026-09-24T12:00:00.000Z",
        andy_privacyacceptancetime: "2026-09-24T12:00:00.000Z",
        andy_checkinstatus: 100000000,
        andy_checkincode: "DEMO-123456",
        "andy_CampaignName@odata.bind": "/andy_contestcampaigns(11111111-1111-1111-1111-111111111111)",
        "andy_Contact@odata.bind": "/contacts(22222222-2222-2222-2222-222222222222)",
        "andy_PrizeClaim@odata.bind": "/andy_prizeclaims(33333333-3333-3333-3333-333333333333)",
        "andy_SourceIdentifier@odata.bind": "/andy_contestsourcecaps(44444444-4444-4444-4444-444444444444)",
      }
    );
  });

  it("omits optional Prize Claim and source-cap lookups when they are unavailable", () => {
    assert.deepEqual(
      buildGrandPrizeEntryPayload({
        campaignId: "11111111-1111-1111-1111-111111111111",
        contactId: "22222222-2222-2222-2222-222222222222",
        contestant: { name: "", email: " PLAYER@example.com ", sharedInfo: true },
        now: new Date("2026-09-25T15:30:00.000Z"),
      }),
      {
        andy_participantname: "player@example.com",
        andy_entrytimestamp: "2026-09-25T15:30:00.000Z",
        andy_privacyacceptancetime: "2026-09-25T15:30:00.000Z",
        andy_checkinstatus: 100000000,
        "andy_CampaignName@odata.bind": "/andy_contestcampaigns(11111111-1111-1111-1111-111111111111)",
        "andy_Contact@odata.bind": "/contacts(22222222-2222-2222-2222-222222222222)",
      }
    );
  });
});

describe("buildGrandPrizeDrawingSlices", () => {
  it("groups checked-in Grand Prize Entries by contact for weighted drawing slices", () => {
    assert.deepEqual(
      buildGrandPrizeDrawingSlices([
        {
          andy_grandprizeentryid: "11111111-1111-1111-1111-111111111111",
          _andy_contact_value: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          andy_participantname: "Ada Lovelace",
          andy_checkincode: "DEMO-111111",
        },
        {
          andy_grandprizeentryid: "22222222-2222-2222-2222-222222222222",
          _andy_contact_value: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          andy_participantname: "Ada Lovelace",
          andy_checkincode: "DEMO-111111",
        },
        {
          andy_grandprizeentryid: "33333333-3333-3333-3333-333333333333",
          _andy_contact_value: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          andy_participantname: " Grace Hopper ",
          andy_checkincode: " DEMO-222222 ",
        },
      ]),
      [
        {
          contactId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          displayName: "Ada Lovelace",
          entryCount: 2,
          color: "#1f8a70",
          code: "DEMO-111111",
        },
        {
          contactId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          displayName: "Grace Hopper",
          entryCount: 1,
          color: "#f2a541",
          code: "DEMO-222222",
        },
      ]
    );
  });
});

describe("selectGrandPrizeWinningSlice", () => {
  const slices = [
    { contactId: "a", displayName: "Ada", entryCount: 2, color: "#1f8a70", code: "DEMO-111111" },
    { contactId: "b", displayName: "Grace", entryCount: 1, color: "#f2a541", code: "DEMO-222222" },
  ];

  it("selects a slice by weighted entry position", () => {
    assert.equal(selectGrandPrizeWinningSlice(slices, 0)?.contactId, "a");
    assert.equal(selectGrandPrizeWinningSlice(slices, 1)?.contactId, "a");
    assert.equal(selectGrandPrizeWinningSlice(slices, 2)?.contactId, "b");
  });

  it("rejects out-of-range or empty selections", () => {
    assert.equal(selectGrandPrizeWinningSlice(slices, -1), null);
    assert.equal(selectGrandPrizeWinningSlice(slices, 3), null);
    assert.equal(selectGrandPrizeWinningSlice([], 0), null);
  });
});
describe("summarizePrizeCounts", () => {
  it("totals only the per-type rows it is given (active types)", () => {
    const byType = [
      { typeId: "a", typeName: "Candy", total: 104, available: 64 },
      { typeId: "b", typeName: "Pin or Sticker", total: 118, available: 118 },
      { typeId: "c", typeName: "Empty", total: 0, available: 0 },
    ];
    assert.deepEqual(summarizePrizeCounts(byType), { total: 222, available: 182, byType });
  });

  it("returns zeros when there are no active types", () => {
    assert.deepEqual(summarizePrizeCounts([]), { total: 0, available: 0, byType: [] });
  });
});

describe("planGrandPrizeEntryCount", () => {
  it("defaults to one entry when no game awarded a number", () => {
    for (const requested of [null, undefined, 0, -3, NaN]) assert.equal(planGrandPrizeEntryCount(requested, 5, 0), 1);
    assert.equal(planGrandPrizeEntryCount(null, null, 0), 1);
  });

  it("creates what the game awarded, clamped to the cap minus existing entries", () => {
    assert.equal(planGrandPrizeEntryCount(5, 5, 0), 5);
    assert.equal(planGrandPrizeEntryCount(4, 5, 2), 3);
    assert.equal(planGrandPrizeEntryCount(5, 5, 4), 1);
  });

  it("returns 0 once the contact is at the cap, however often they play", () => {
    assert.equal(planGrandPrizeEntryCount(5, 5, 5), 0);
    assert.equal(planGrandPrizeEntryCount(1, 5, 7), 0);
  });

  it("rounds down fractions and applies a ceiling when the campaign has no cap", () => {
    assert.equal(planGrandPrizeEntryCount(2.9, null, 0), 2);
    assert.equal(planGrandPrizeEntryCount(1000, null, 0), MAX_ENTRIES_PER_CLAIM);
    assert.equal(planGrandPrizeEntryCount(1000, 0, 0), MAX_ENTRIES_PER_CLAIM);
  });

  it("reads awarded entries from the Plinko and MCP Quest play tables", () => {
    assert.ok(GAME_PLAY_ENTRY_TABLES.includes("andy_plinkoplaies"));
    assert.ok(GAME_PLAY_ENTRY_TABLES.includes("andy_mcpquestplaies"));
  });
});
