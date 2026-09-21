import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.KIOSK_TEST_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const map = slug => JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
const lockProfile = map("smart-lock");
const target = Object.fromEntries(lockProfile.restoreSequence.map(c => [c.key, c.target]));
mkdirSync("test-results/smart-lock-flow", { recursive: true });
try {
  for (const gameModeEnabled of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 800, height: 480 } });
    const page = await context.newPage();
    let socket;
    let wins = 0;
    let rotations = 0;
    let currentMode = "smart-lock";
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const send = (name, value) => socket.send(JSON.stringify({ type: 1, target: name, arguments: [value] }) + "\x1e");
    const telemetry = (slug, controls) => send("SendTelemetryUpdate", { data: { deviceSlug: slug, controls }, deviceId: "fixture-panel" });
    // Intercept both HTTP and WebSocket traffic: no production services are contacted.
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let body;
      if (path.endsWith("/negotiate")) body = { connectionId: "fixture", connectionToken: "fixture", negotiateVersion: 1, availableTransports: [{ transport: "WebSockets", transferFormats: ["Text"] }] };
      else if (path.endsWith("/kiosk-state")) body = { deviceSlug: currentMode, gameModeEnabled };
      else if (path.endsWith("/create-win")) { wins++; body = { claimToken: "fixture-claim-token" }; }
      else if (path.endsWith("/pick-random-mode")) {
        rotations++;
        currentMode = "patient-monitor";
        body = { deviceSlug: "patient-monitor" };
        send("deviceChanged", { deviceSlug: "patient-monitor" });
      } else throw new Error(`Unexpected API request: ${path}`);
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.routeWebSocket(/azurewebsites\.net\/api/, ws => {
      ws.onMessage(message => {
        if (String(message).includes('"protocol"')) { socket = ws; ws.send("{}\x1e"); }
      });
    });
    await page.goto(`${base}/kiosk/smart-lock`);
    await page.locator('.smart-lock-surface[data-bolt="unknown"]').waitFor();
    for (let attempt = 0; !socket && attempt < 100; attempt++) await page.waitForTimeout(50);
    assert.ok(socket, "mock SignalR handshake missing");
    await page.waitForTimeout(100);
    telemetry("smart-lock", lockProfile.faultStartingState);
    await page.locator('.smart-lock-surface[data-bolt="unpowered"]').waitFor();
    const partial = { ...target, keyed_one: false };
    telemetry("smart-lock", { ...partial, deadbolt: false, alarm: false });
    await page.locator('.smart-lock-surface[data-bolt="retracted"][data-alarm="disarmed"]').waitFor();
    const retracted = await page.locator(".lock-bolt").evaluate(el => getComputedStyle(el).transform);
    telemetry("smart-lock", { ...partial, alarm: false });
    await page.locator('.smart-lock-surface[data-bolt="extended"][data-alarm="disarmed"]').waitFor();
    await page.waitForTimeout(400);
    assert.notEqual(await page.locator(".lock-bolt").evaluate(el => getComputedStyle(el).transform), retracted);
    telemetry("smart-lock", { ...partial, deadbolt: false });
    await page.locator('.smart-lock-surface[data-bolt="retracted"][data-alarm="armed"]').waitFor();
    telemetry("smart-lock", { ...partial, autolock: true });
    await page.locator('.lock-status-list > div').filter({hasText:"Auto-lock"}).getByText("Enabled",{exact:true}).waitFor();
    telemetry("smart-lock", partial);
    await page.locator('.smart-lock-surface[data-bolt="extended"][data-alarm="armed"]').waitFor();
    assert.equal(wins,0,"partial repair created a win");
    await page.locator(".lock-door").click();
    assert.equal(wins,0,"instrument tap changed the game");
    await page.screenshot({path:`test-results/smart-lock-flow/partial-${gameModeEnabled}.png`});
    telemetry("smart-lock", { ...partial, power:false });
    await page.locator('.smart-lock-surface[data-bolt="unpowered"][data-alarm="unpowered"]').waitFor();
    // Invalid bolt input must not hide an independently known alarm state.
    const missing = { ...partial, deadbolt: null };
    telemetry("smart-lock", missing);
    await page.locator('.smart-lock-surface[data-bolt="unknown"][data-alarm="armed"]').waitFor();
    assert.equal(await page.locator(".lock-tamper dd").innerText(),"Not monitored");
    telemetry("smart-lock", target);
    await page.locator(".win-overlay").waitFor();
    if (gameModeEnabled) await page.getByAltText("Scan to claim your prize").waitFor();
    else assert.equal(await page.locator(".qr-block").count(), 0);
    assert.equal(wins, gameModeEnabled ? 1 : 0);
    telemetry("smart-lock", target);
    await page.screenshot({ path: `test-results/smart-lock-flow/game-mode-${gameModeEnabled}.png` });
    await page.waitForURL("**/kiosk/patient-monitor", { timeout: 15000 });
    await page.locator('[data-surface="patient-monitor"]').last().waitFor();
    assert.equal(rotations, 1);
    assert.equal(wins, gameModeEnabled ? 1 : 0, "duplicate telemetry created an extra win");
    assert.equal(await page.locator(".win-overlay").count(), 0);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("smart-lock", target); // Old-mode packets must not affect the new page.
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("patient-monitor", map("patient-monitor").faultStartingState);
    await page.locator('.panel-surface[data-live="true"]').waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  }
  const preview = await browser.newPage({ viewport:{width:800,height:480} });
  await preview.route("**/api/**", route => route.fulfill({status:503,contentType:"application/json",body:"{}"}));
  for (const state of ["waiting","stale"]) {
    await preview.goto(`${base}/tests/surface-preview.html?mode=smart-lock&state=${state}`);
    await preview.locator('.smart-lock-surface[data-bolt="unknown"][data-alarm="unknown"]').waitFor();
    assert.equal(await preview.locator(".lock-bolt").evaluate(el => getComputedStyle(el).transitionDuration),"0s");
    assert.equal(await preview.locator(".lock-bolt").evaluate(el => getComputedStyle(el).visibility),"hidden");
  }
  await preview.goto(`${base}/tests/surface-preview.html?mode=smart-lock&state=partial`);
  await preview.emulateMedia({reducedMotion:"reduce"});
  assert.equal(await preview.locator(".lock-bolt").evaluate(el => getComputedStyle(el).transitionDuration),"0s");
  await preview.getByRole("button",{name:"Help Fix",exact:true}).click();
  await preview.locator(".fix-sheet ol").waitFor();
  assert.equal(await preview.locator(".fix-sheet li").count(),10);
  await preview.screenshot({path:"test-results/smart-lock-flow/help.png"});
  await preview.getByRole("button",{name:"Close Help Fix"}).click();
  await preview.setViewportSize({width:390,height:844});
  assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await preview.screenshot({path:"test-results/smart-lock-flow/narrow.png",fullPage:true});
  await preview.close();
  console.log("Smart Lock flow passed: bolt/alarm independence, power, auto-lock, invalid input, read-only taps, ON/OFF completion, QR, one win, rotation, and old-mode isolation.");
} finally {
  await browser.close();
}
