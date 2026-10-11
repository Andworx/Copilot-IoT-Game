import { test } from "node:test";
import assert from "node:assert/strict";
import { entriesForScore, entryTierFor } from "../src/mcpquest/entryTier";
import { isMcpStationEndpoint, isMcpStationSlug, mcpStationEndpoint } from "../src/mcpquest/mcpstation";

test("tier boundaries: 90-100 top, 70-89 mid, below 70 base", () => {
  const cases: [number, string][] = [[100, "top"], [90, "top"], [89.6, "top"], [89.4, "mid"], [89, "mid"], [70, "mid"], [69.6, "mid"], [69.4, "base"], [0, "base"]];
  for (const [score, tier] of cases) assert.equal(entryTierFor(score), tier, String(score));
});

test("entries follow the campaign cap", () => {
  assert.deepEqual(entriesForScore(95, 5), { tier: "top", entries: 5 });
  assert.deepEqual(entriesForScore(75, 5), { tier: "mid", entries: 4 });
  assert.deepEqual(entriesForScore(20, 5), { tier: "base", entries: 1 });
});

test("small caps collapse the tiers and never go below one", () => {
  assert.deepEqual([95, 75, 20].map((s) => entriesForScore(s, 1).entries), [1, 1, 1]);
  assert.deepEqual([95, 75, 20].map((s) => entriesForScore(s, 2).entries), [2, 1, 1]);
});

test("bad input throws", () => {
  assert.throws(() => entriesForScore(NaN, 3));
  assert.throws(() => entriesForScore(50, 0));
  assert.throws(() => entriesForScore(50, 2.5));
});

test("only MCP Station catalog slugs build an endpoint", () => {
  assert.equal(mcpStationEndpoint("it-ticketing"), "https://www.mcpstation.io/mcp/it-ticketing");
  for (const bad of ["", "../x", "a/b", "A", "x".repeat(65), "http://evil.test", "it ticketing"]) {
    assert.equal(isMcpStationSlug(bad), false, bad);
    assert.throws(() => mcpStationEndpoint(bad));
  }
});

test("endpoint allowlist rejects other hosts and tricks", () => {
  assert.equal(isMcpStationEndpoint("https://www.mcpstation.io/mcp/it-ticketing"), true);
  assert.equal(isMcpStationEndpoint("https://mcpstation.io/mcp/it-ticketing"), true);
  for (const bad of [
    "http://www.mcpstation.io/mcp/it-ticketing",
    "https://www.mcpstation.io.evil.test/mcp/x",
    "https://evil.test/mcp/it-ticketing",
    "https://user@www.mcpstation.io/mcp/x",
    "https://www.mcpstation.io:8443/mcp/x",
    "https://www.mcpstation.io/mcp/x?a=1",
    "https://www.mcpstation.io/mcp/x/y",
    "https://www.mcpstation.io/api/catalog",
    "not a url",
  ]) assert.equal(isMcpStationEndpoint(bad), false, bad);
});
