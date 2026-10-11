import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_LANDING_AGE_MS,
  checkFreshness,
  isPlinkoLanding,
  judgePlinkoLanding,
  parsePlinkoLanding,
  resolveLitBucket,
  type PlinkoLanding,
  type PlinkoProfile,
} from "../src/lib/plinko";

const NOW = new Date("2026-10-11T20:00:00.000Z");

const profile: PlinkoProfile = {
  id: "p1",
  slug: "plinko-default",
  bucketCount: 6,
  litBucketEntries: 2,
  standardBucketEntries: 1,
  gameModeActive: true,
  activeLitBucket: 3,
};

function wire(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "plinkoLanding",
    stationSlug: "plinko-default",
    eventId: "0b8f6a3e-6c1d-4a39-9f4c-3f1f0b1e2a77",
    bucket: 2,
    litBucket: 1,
    bucketCount: 6,
    landedAt: "2026-10-11T19:59:58.123456+00:00",
    firmware: "plinko-pi/v0.2",
    ...overrides,
  };
}

function landing(overrides: Partial<PlinkoLanding> = {}): PlinkoLanding {
  const parsed = parsePlinkoLanding(wire());
  assert.ok("landing" in parsed);
  return { ...parsed.landing, ...overrides };
}

test("isPlinkoLanding only matches the plinkoLanding type", () => {
  assert.equal(isPlinkoLanding(wire()), true);
  assert.equal(isPlinkoLanding({ eventType: "state_change" }), false);
  assert.equal(isPlinkoLanding(null), false);
});

test("parsePlinkoLanding accepts the Pi payload, including microsecond timestamps", () => {
  const parsed = parsePlinkoLanding(wire());
  assert.ok("landing" in parsed);
  assert.equal(parsed.landing.bucket, 2);
  assert.equal(parsed.landing.stationSlug, "plinko-default");
  assert.equal(Number.isNaN(parsed.landing.landedAt.getTime()), false);
});

test("parsePlinkoLanding rejects missing or malformed fields", () => {
  for (const bad of [
    { stationSlug: "" },
    { eventId: "" },
    { bucket: 0 },
    { bucket: "2" },
    { landedAt: "yesterday" },
  ]) {
    assert.ok("error" in parsePlinkoLanding(wire(bad)), JSON.stringify(bad));
  }
});

test("checkFreshness rejects replays and clocks far in the future", () => {
  assert.equal(checkFreshness(new Date(NOW.getTime() - 1000), NOW), null);
  assert.match(checkFreshness(new Date(NOW.getTime() - MAX_LANDING_AGE_MS - 1000), NOW) ?? "", /old/);
  assert.match(checkFreshness(new Date(NOW.getTime() + 10 * 60 * 1000), NOW) ?? "", /future/);
});

test("the profile's active lit bucket wins over the Pi's placeholder", () => {
  assert.equal(resolveLitBucket(profile, landing({ litBucket: 1 }), 6), 3);
  assert.equal(resolveLitBucket({ ...profile, activeLitBucket: null }, landing({ litBucket: 5 }), 6), 5);
  assert.equal(resolveLitBucket({ ...profile, activeLitBucket: 9 }, landing({ litBucket: null }), 6), null);
});

test("a non-lit bucket earns the standard entries", () => {
  const decision = judgePlinkoLanding(landing({ bucket: 2 }), profile, NOW);
  assert.deepEqual(decision, { accepted: true, bucket: 2, litBucket: 3, bucketCount: 6, entriesAwarded: 1 });
});

test("the lit bucket earns the lit entries", () => {
  const decision = judgePlinkoLanding(landing({ bucket: 3 }), profile, NOW);
  assert.equal(decision.accepted && decision.entriesAwarded, 2);
});

test("a bucket beyond the station's count is rejected", () => {
  const decision = judgePlinkoLanding(landing({ bucket: 7 }), profile, NOW);
  assert.equal(decision.accepted, false);
});

test("an inactive station ignores landings", () => {
  const decision = judgePlinkoLanding(landing(), { ...profile, gameModeActive: false }, NOW);
  assert.equal(decision.accepted, false);
});

test("a stale landing is rejected", () => {
  const stale = landing({ landedAt: new Date(NOW.getTime() - MAX_LANDING_AGE_MS - 5000) });
  assert.equal(judgePlinkoLanding(stale, profile, NOW).accepted, false);
});
