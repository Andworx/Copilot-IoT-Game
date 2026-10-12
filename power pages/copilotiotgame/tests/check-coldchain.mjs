import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.KIOSK_TEST_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const map = slug => JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
const loggerProfile = map("coldchain-sensor");
const target = Object.fromEntries(loggerProfile.restoreSequence.map(c => [c.key, c.target]));
mkdirSync("test-results/coldchain-flow", { recursive: true });
try {
  for (const gameModeEnabled of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 800, height: 480 } });
    const page = await context.newPage();
    let socket;
    let wins = 0;
    let rotations = 0;
    let currentMode = "coldchain-sensor";
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
    await page.goto(`${base}/kiosk/coldchain-sensor`);
    await page.locator('.coldchain-surface[data-calibration="unknown"]').waitFor();
    for (let attempt=0; !socket && attempt<100; attempt++) await page.waitForTimeout(50);
    assert.ok(socket); await page.waitForTimeout(100);
    telemetry("coldchain-sensor", loggerProfile.faultStartingState);
    await page.locator('.coldchain-surface[data-power="off"][data-calibration="unpowered"]').waitFor();
    const partial = { ...target, keyed_one: !target.keyed_one };
    const features = { calibration:"calibration", threshold:"threshold", cloudsync:"cloud" };
    for (const key of Object.keys(features)) {
      telemetry("coldchain-sensor", { ...partial, calibration:false, threshold:false, cloudsync:false, [key]:true });
      await page.locator(`.coldchain-surface[data-${features[key]}="enabled"]`).waitFor();
      for (const other of Object.keys(features).filter(k => k !== key)) assert.equal(await page.locator(".coldchain-surface").getAttribute(`data-${features[other]}`),"disabled");
    }
    telemetry("coldchain-sensor",{...partial,calibration:true,threshold:false,cloudsync:false});
    await page.locator('.coldchain-surface[data-ready="true"][data-cloud="disabled"]').waitFor();
    telemetry("coldchain-sensor",{...partial,calibration:false,cloudsync:true});
    await page.locator('.coldchain-surface[data-ready="false"][data-cloud="enabled"]').waitFor();
    telemetry("coldchain-sensor",partial);
    await page.locator('.coldchain-surface[data-calibration="enabled"][data-threshold="disabled"][data-cloud="enabled"]').waitFor();
    assert.equal(wins,0);
    await page.locator(".logger-display").click();
    assert.equal(wins,0);
    await page.screenshot({path:`test-results/coldchain-flow/partial-${gameModeEnabled}.png`});
    telemetry("coldchain-sensor",{...partial,power:false});
    await page.locator('.coldchain-surface[data-calibration="unpowered"][data-threshold="unpowered"][data-cloud="unpowered"]').waitFor();
    telemetry("coldchain-sensor",{...partial,calibration:null});
    await page.locator('.coldchain-surface[data-calibration="unknown"][data-threshold="disabled"][data-cloud="enabled"]').waitFor();
    telemetry("coldchain-sensor", target);
    await page.locator(".win-overlay").waitFor();
    if (gameModeEnabled) await page.getByAltText("Scan to claim your prize").waitFor();
    else assert.equal(await page.locator(".qr-block").count(), 0);
    assert.equal(wins, gameModeEnabled ? 1 : 0);
    telemetry("coldchain-sensor", target);
    await page.screenshot({ path: `test-results/coldchain-flow/game-mode-${gameModeEnabled}.png` });
    await page.waitForURL("**/kiosk/patient-monitor", { timeout: 15000 });
    await page.locator('[data-surface="patient-monitor"]').last().waitFor();
    assert.equal(rotations, 1);
    assert.equal(wins, gameModeEnabled ? 1 : 0, "duplicate telemetry created an extra win");
    assert.equal(await page.locator(".win-overlay").count(), 0);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("coldchain-sensor", target); // Old-mode packets must not affect the new page.
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("patient-monitor", map("patient-monitor").faultStartingState);
    await page.locator('.panel-surface[data-live="true"]').waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  }
  const preview = await browser.newPage({viewport:{width:800,height:480}});
  await preview.route("**/api/**", route => route.fulfill({status:503,contentType:"application/json",body:"{}"}));
  for (const state of ["waiting","stale"]) {
    await preview.goto(`${base}/tests/surface-preview.html?mode=coldchain-sensor&state=${state}`);
    await preview.locator('.coldchain-surface[data-calibration="unknown"][data-threshold="unknown"][data-cloud="unknown"]').waitFor();
  }
  await preview.goto(`${base}/tests/surface-preview.html?mode=coldchain-sensor&state=partial`);
  assert.equal(await preview.locator(".logger-reading strong").innerText(),"--");
  assert.equal(await preview.locator(".logger-reading small").innerText(),"Not measured");
  await preview.emulateMedia({reducedMotion:"reduce"});
  await preview.getByRole("button",{name:"Help Fix",exact:true}).click();
  await preview.locator(".fix-unavailable").waitFor();
  assert.equal(await preview.locator(".fix-sheet ol").count(),0);
  assert.match(await preview.locator(".fix-unavailable").innerText(),/Help Fix is unreachable/);
  await preview.screenshot({path:"test-results/coldchain-flow/help.png"});
  await preview.getByRole("button",{name:"Close Help Fix"}).click();
  await preview.setViewportSize({width:390,height:844});
  assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await preview.screenshot({path:"test-results/coldchain-flow/narrow.png",fullPage:true});
  await preview.close();
  console.log("Cold-chain flow passed: independent calibration/threshold/cloudsync, power, invalid input, read-only taps, ON/OFF completion, QR, one win, rotation, and old-mode isolation.");
} finally {
  await browser.close();
}
