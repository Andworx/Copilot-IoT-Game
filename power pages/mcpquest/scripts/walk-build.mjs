#!/usr/bin/env node
/**
 * The whole visitor journey in a headless browser: pick a system, watch the build screen, begin
 * the mission, build the solution with the designers, and submit. It runs against the local dev
 * backend, which builds the mission for real (or from a seeded spec).
 *
 *   # terminal 1 (azure/functions/game, after npm run build and az login)
 *   FOUNDRY_ENDPOINT=... FOUNDRY_MODEL=... node scripts/dev-server.mjs --stage-delay 1200
 *   # terminal 2 (power pages/mcpquest)
 *   VITE_API_BASE_URL=http://localhost:7071 npm run dev
 *   # terminal 3 (power pages/mcpquest)
 *   node scripts/walk-build.mjs "Freight Tracking"
 *
 * Needs @playwright/test and a Chromium. SITE and BACKEND override the two URLs.
 */
import { chromium } from "@playwright/test";
import { playThrough } from "./walk-lib.mjs";

const serverName = process.argv[2];
if (!serverName) {
  console.error('Usage: node scripts/walk-build.mjs "<system name as shown in the picker>"');
  process.exit(2);
}
const site = process.env.SITE ?? "http://localhost:5177";
const backend = process.env.BACKEND ?? "http://localhost:7071";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const problems = [];
page.on("pageerror", (e) => problems.push(String(e)));
page.on("console", (m) => m.type() === "error" && problems.push(m.text()));

let failed = false;
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
};

try {
  await page.goto(`${site}/?api=live`);
  await page.waitForSelector(".server-picker label.mode");
  const names = await page.$$eval(".server-picker label.mode strong", (els) => els.map((e) => e.textContent));
  check(names.length > 0 && names.includes(serverName), `picker lists ${names.length} systems including "${serverName}"`);

  await page.click(`.server-picker label.mode:has(strong:text-is("${serverName}"))`);
  await page.fill("#nickname", "VISITOR");
  check((await page.textContent("button[type=submit]")).includes("Build my mission"), "start button says Build my mission");
  await page.click("button[type=submit]");

  await page.waitForSelector(".cave");
  const seen = new Set();
  const began = Date.now();
  // Watch the cave until the mission is ready, noting the items received along the way.
  for (;;) {
    for (const name of await page.locator(".cave-item.is-have .cave-item-name").allTextContents()) seen.add(name);
    if (await page.locator("button:has-text('Begin the mission')").count()) break;
    if (await page.locator(".cave .error").count()) {
      throw new Error(`the build failed: ${await page.textContent(".cave .error")}`);
    }
    if (Date.now() - began > 180_000) throw new Error("the build took longer than 3 minutes");
    await page.waitForTimeout(250);
  }
  const have = await page.locator(".cave-item.is-have").count();
  check(have === 6, `all six products received (${have}/6) after ${((Date.now() - began) / 1000).toFixed(0)}s`);
  check(seen.size >= 2, `items arrived progressively (${seen.size} seen before the mission was ready)`);
  console.log(`mission: "${await page.textContent(".cave-mission strong")}"`);

  await page.click("button:has-text('Begin the mission')");
  await page.waitForSelector(".cases");

  // Read back what was generated (dev backend only) to build its reference solution by hand.
  const saved = await (await fetch(`${backend}/api/mcpquest/dev/latest`)).json();
  check(saved.spec.cases.length > 0, `mission has ${saved.spec.cases.length} cases`);

  const result = await playThrough(page, saved, "pass");
  if (result.failed) failed = true;
  check((await page.locator(".claim").count()) > 0, "a prize code is shown");
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
