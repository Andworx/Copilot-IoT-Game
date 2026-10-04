import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";

const base = process.env.KIOSK_TEST_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const map = slug => JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
const page = await browser.newPage({ viewport: { width: 800, height: 480 } });
let activeMode = "coldchain-sensor";
let gameModeEnabled = false;
let online = false;
let negotiationAttempts = 0;
let stateReads = 0;
let socket;
let socketCount = 0;
let wins = 0;
let holdSnapshots = false;
const pendingSnapshots = [];
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const send = (target, payload) => socket.send(JSON.stringify({ type: 1, target, arguments: [payload] }) + "\x1e");
const reading = (slug, controls = map(slug).faultStartingState) => send("SendTelemetryUpdate", { data: { deviceSlug: slug, controls, cables: map(slug).requiredCables, cableSchema: "panel-rj45-links/v1", win: map(slug).restoreSequence.every(c => controls[c.key] === c.target) }, deviceId: "fixture" });
await page.route("**/api/**", async route => {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith("/negotiate")) negotiationAttempts++;
  if (!online) return route.abort("internetdisconnected");
  let body;
  if (path.endsWith("/negotiate")) body = { connectionId: "fixture", connectionToken: "fixture", negotiateVersion: 1, availableTransports: [{ transport: "WebSockets", transferFormats: ["Text"] }] };
  else if (path.endsWith("/kiosk-state")) {
    stateReads++;
    body = { deviceSlug: activeMode, gameModeEnabled };
    if (holdSnapshots) await new Promise(resolve => pendingSnapshots.push(resolve));
  }
  else if (path.endsWith("/device-profiles")) body = { profiles: [] };
  else if (path.endsWith("/create-win")) { wins++; body = { claimToken: "recovery-fixture" }; }
  else throw new Error(`Unexpected API: ${path}`);
  await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
});
await page.routeWebSocket(/azurewebsites\.net\/api/, ws => {
  ws.onMessage(message => {
    if (String(message).includes('"protocol"')) { socket = ws; socketCount++; ws.send("{}\x1e"); }
  });
});
async function until(predicate, message) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await page.waitForTimeout(50);
  }
  assert.fail(message);
}
async function advance(ms) { await page.clock.runFor(ms); await page.waitForTimeout(100); }
try {
  await page.clock.install();
  await page.goto(`${base}/kiosk/thermostat`);
  await page.locator(".panel-surface").last().waitFor();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await until(() => negotiationAttempts > 0, "initial negotiation missing");
  await advance(5100);
  assert.ok(negotiationAttempts > 1, "initial failure did not retry");
  online = true;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await until(() => socketCount === 1, "online event failed to restart initial connection");
  await page.waitForURL("**/kiosk/coldchain-sensor");
  await page.waitForTimeout(100);
  reading(activeMode);
  await page.locator('.panel-surface[data-live="true"]').waitFor();
  await page.getByRole("button", { name: "Connection and display options" }).click();
  assert.equal(await page.locator('.gear-status strong[data-state="connected"]').count(), 2);

  // Intentional info-page exploration survives polling, then a missed mode broadcast recovers.
  await page.getByRole("menuitem", { name: /Info/ }).click();
  await page.waitForURL("**/kiosk/info");
  activeMode = "thermostat";
  await advance(5100);
  assert.ok(page.url().endsWith("/kiosk/info"), "polling interrupted intentional info-page exploration");
  await page.getByRole("button", { name: /Return to.*Thermostat/ }).click();
  await page.waitForURL("**/kiosk/thermostat");
  activeMode = "water-pump";
  await advance(5100);
  assert.ok(page.url().endsWith("/kiosk/water-pump"), "polling did not recover a missed mode broadcast");
  await page.getByRole("button", { name: "Connection and display options" }).click();

  // Outage longer than the SDK's default four-attempt window must still recover.
  online = false;
  socket.close({ code: 1006 });
  await page.locator('.panel-surface[data-live="false"]').waitFor();
  assert.equal(await page.locator('.gear-status strong[data-state="offline"]').count(), 2);
  const previousAttempts = negotiationAttempts;
  for (const duration of [2100, 10100, 30100, 30100]) await advance(duration);
  assert.ok(negotiationAttempts >= previousAttempts + 4, "reconnect stopped retrying");
  activeMode = "thermostat";
  online = true;
  await advance(30100);
  await until(() => socketCount === 2, "long outage never recovered");
  await page.waitForURL("**/kiosk/thermostat");
  await page.locator('.panel-surface[data-live="false"]').waitFor();
  await page.waitForTimeout(100);
  reading(activeMode);
  await page.locator('.panel-surface[data-live="true"]').waitFor();

  // A browser wake refreshes state even if the socket still appears connected.
  const readsBeforeWake = stateReads;
  activeMode = "patient-monitor";
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await page.waitForURL("**/kiosk/patient-monitor");
  await page.locator('.panel-surface[data-live="false"]').waitFor();
  assert.ok(stateReads > readsBeforeWake);
  // A same-mode wake also refreshes the missed Game Mode flag and requires a new reading.
  reading(activeMode);
  await page.locator('.panel-surface[data-live="true"]').waitFor();
  // A delayed snapshot must not rewind a more recent mode broadcast.
  holdSnapshots = true;
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await until(() => pendingSnapshots.length >= 2, "mode and flag refresh were not requested");
  holdSnapshots = false;
  activeMode = "smart-lock";
  send("deviceChanged", { deviceSlug: activeMode });
  await page.waitForURL("**/kiosk/smart-lock");
  for (const release of pendingSnapshots.splice(0)) release();
  await page.waitForTimeout(100);
  assert.ok(page.url().endsWith("/kiosk/smart-lock"), "old snapshot overwrote newer mode broadcast");
  reading(activeMode);
  await page.locator('.panel-surface[data-live="true"]').waitFor();
  gameModeEnabled = true;
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await page.locator('.panel-surface[data-live="false"]').waitFor();
  await page.waitForTimeout(100);
  const restored = Object.fromEntries(map(activeMode).restoreSequence.map(c => [c.key, c.target]));
  reading(activeMode, restored);
  await page.getByAltText("Scan to claim your prize").waitFor();
  assert.equal(wins, 1);

  mkdirSync("test-results/connection-recovery", { recursive: true });
  await page.screenshot({ path: "test-results/connection-recovery/recovered.png" });
  assert.deepEqual(errors, []);
  console.log("Recovery passed: initial failure, online restart, >4 reconnect attempts, stale deep link, polling fallback with intentional Info exploration, wake mode/flag resync, snapshot race, and fresh-reading gate.");
} finally {
  await browser.close();
}
