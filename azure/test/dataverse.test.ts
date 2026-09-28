import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGrandPrizeDrawingSlices,
  buildContactCreatePayload,
  buildGrandPrizeEntryPayload,
  buildIotGameWinCreatePayload,
  buildPrizeClaimCreatePayload,
  normalizeContestantEmail,
} from "../src/lib/dataverse";

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
        contestant: { name: "  Grace Hopper ", email: " GRACE@example.com ", sharedInfo: true },
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