import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContactCreatePayload, buildGrandPrizeEntryPayload, normalizeContestantEmail } from "../src/lib/dataverse";

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
      buildContactCreatePayload({ name: "  Ada Lovelace ", email: " ADA@Example.com ", sharedInfo: true }),
      { emailaddress1: "ada@example.com", fullname: "Ada Lovelace" }
    );
  });

  it("omits blank names and refuses non-shared contact capture", () => {
    assert.deepEqual(buildContactCreatePayload({ name: " ", email: "guest@example.com", sharedInfo: true }), {
      emailaddress1: "guest@example.com",
    });
    assert.equal(buildContactCreatePayload({ name: "Guest", email: "guest@example.com", sharedInfo: false }), null);
  });
});

describe("buildGrandPrizeEntryPayload", () => {
  it("builds a lookup-based Grand Prize Entry payload from the exported schema", () => {
    assert.deepEqual(
      buildGrandPrizeEntryPayload({
        campaignId: "11111111-1111-1111-1111-111111111111",
        contactId: "22222222-2222-2222-2222-222222222222",
        gameWinId: "33333333-3333-3333-3333-333333333333",
        sourceCapId: "44444444-4444-4444-4444-444444444444",
        contestant: { name: "  Grace Hopper ", email: " GRACE@example.com ", sharedInfo: true },
        now: new Date("2026-09-24T12:00:00.000Z"),
      }),
      {
        andy_participantname: "Grace Hopper",
        andy_entrytimestamp: "2026-09-24T12:00:00.000Z",
        andy_entrycount: 1,
        andy_sharedinformation: "Yes",
        andy_privacyacceptancetime: "2026-09-24T12:00:00.000Z",
        "andy_CampaignName@odata.bind": "/andy_contestcampaigns(11111111-1111-1111-1111-111111111111)",
        "andy_Contact@odata.bind": "/contacts(22222222-2222-2222-2222-222222222222)",
        "andy_GameWin@odata.bind": "/andy_gamewins(33333333-3333-3333-3333-333333333333)",
        "andy_SourceIdentifier@odata.bind": "/andy_contestsourcecaps(44444444-4444-4444-4444-444444444444)",
      }
    );
  });
});