#!/usr/bin/env node
/**
 * Plays a saved generated game through the real MCP Quest page in a headless browser, building
 * each case's reference solution with the designers' own controls, testing it and submitting.
 * It proves that what a player is shown (requirements, scenario facts, tools, settings) is enough
 * to build a passing design, which a unit test of the judge alone cannot.
 *
 *   cd "power pages/mcpquest"
 *   npm run dev                                      (in another terminal, port 5177)
 *   node scripts/walk-spec.mjs <stored-spec.json> [pass|none]
 *
 * <stored-spec.json> is a file written by azure/functions/game/scripts/generate-spec.mjs.
 * `pass` builds the reference pass design (expects 100); `none` submits untouched (expects 0).
 * Needs @playwright/test and a Chromium (`npx playwright install chromium`). SITE overrides the URL.
 */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { playThrough } from "./walk-lib.mjs";

const [specFile, mode = "pass"] = process.argv.slice(2);
if (!specFile) {
  console.error("Usage: node scripts/walk-spec.mjs <stored-spec.json> [pass|none]");
  process.exit(2);
}
const saved = JSON.parse(readFileSync(specFile, "utf8"));
const site = process.env.SITE ?? "http://localhost:5177";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const problems = [];
page.on("pageerror", (e) => problems.push(String(e)));
page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
// Match the path only: the page URL itself also ends in the file name.
await page.route((u) => u.pathname === "/spec.json", (r) =>
  r.fulfill({ contentType: "application/json", body: JSON.stringify(saved) }),
);

let failed = false;
try {
  await page.goto(`${site}/?specUrl=/spec.json`);
  await page.fill("#nickname", "WALKER");
  await page.click("button:has-text('Start')");
  await page.waitForSelector(".cases");
  ({ failed } = await playThrough(page, saved, mode));
} catch (error) {
  console.error(`FAILED: ${error.message}`);
  failed = true;
}
if (problems.length) {
  console.error("browser errors:", problems.slice(0, 5));
  failed = true;
}
await browser.close();
process.exit(failed ? 1 : 0);
