import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.KIOSK_TEST_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const map = slug => JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
const patientProfile = map("patient-monitor");
const target = Object.fromEntries(patientProfile.restoreSequence.map(c => [c.key, c.target]));
mkdirSync("test-results/patient-flow", { recursive: true });
try {
  for (const gameModeEnabled of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 800, height: 480 } });
    const page = await context.newPage();
    let socket;
    let wins = 0;
    let rotations = 0;
    let currentMode = "patient-monitor";
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
        currentMode = "thermostat";
        body = { deviceSlug: "thermostat" };
        send("deviceChanged", { deviceSlug: "thermostat" });
      } else throw new Error(`Unexpected API request: ${path}`);
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.routeWebSocket(/azurewebsites\.net\/api/, ws => {
      ws.onMessage(message => {
        if (String(message).includes('"protocol"')) { socket = ws; ws.send("{}\x1e"); }
      });
    });
    await page.goto(`${base}/kiosk/patient-monitor`);
    await page.locator('.patient-surface[data-leads="unknown"]').waitFor();
    for (let attempt=0; !socket && attempt<100; attempt++) await page.waitForTimeout(50);
    assert.ok(socket); await page.waitForTimeout(100);
    telemetry("patient-monitor", patientProfile.faultStartingState);
    await page.locator('.patient-surface[data-power="off"][data-leads="unpowered"]').waitFor();
    const partial = { ...target, keyed_one: !target.keyed_one };
    const features = { leads:"leads", spo2:"spo2", alarm:"alarm" };
    for (const key of Object.keys(features)) {
      telemetry("patient-monitor", { ...partial, leads:false, spo2:false, alarm:false, [key]:true });
      await page.locator(`.patient-surface[data-${features[key]}="enabled"]`).waitFor();
      for (const other of Object.keys(features).filter(k => k !== key)) assert.equal(await page.locator(".patient-surface").getAttribute(`data-${features[other]}`),"disabled");
    }
    telemetry("patient-monitor",{...partial,leads:false,spo2:true,alarm:false});
    await page.locator('.patient-surface[data-leads="disabled"][data-spo2="enabled"][data-alarm="disabled"]').waitFor();
    assert.equal(await page.locator('.patient-wave[data-channel="ecg"] svg').count(),0);
    assert.equal(await page.locator('.patient-wave[data-channel="pleth"] svg').count(),1);
    telemetry("patient-monitor",{...partial,leads:true,spo2:false});
    await page.locator('.patient-surface[data-leads="enabled"][data-spo2="disabled"]').waitFor();
    assert.equal(await page.locator('.patient-wave[data-channel="ecg"] svg').count(),1);
    assert.equal(await page.locator('.patient-wave[data-channel="pleth"] svg').count(),0);
    telemetry("patient-monitor",partial);
    await page.locator('.patient-surface[data-leads="enabled"][data-spo2="enabled"][data-alarm="enabled"]').waitFor();
    assert.equal(wins,0);
    await page.locator(".patient-wave-region").first().click();
    assert.equal(wins,0);
    await page.screenshot({path:`test-results/patient-flow/partial-${gameModeEnabled}.png`});
    telemetry("patient-monitor",{...partial,power:false});
    await page.locator('.patient-surface[data-leads="unpowered"][data-spo2="unpowered"][data-alarm="unpowered"]').waitFor();
    telemetry("patient-monitor",{...partial,leads:null});
    await page.locator('.patient-surface[data-leads="unknown"][data-spo2="enabled"][data-alarm="enabled"]').waitFor();
    telemetry("patient-monitor", target);
    await page.locator(".win-overlay").waitFor();
    if (gameModeEnabled) await page.getByAltText("Scan to claim your prize").waitFor();
    else assert.equal(await page.locator(".qr-block").count(), 0);
    assert.equal(wins, gameModeEnabled ? 1 : 0);
    telemetry("patient-monitor", target);
    await page.screenshot({ path: `test-results/patient-flow/game-mode-${gameModeEnabled}.png` });
    await page.waitForURL("**/kiosk/thermostat", { timeout: 15000 });
    await page.locator('[data-surface="hvac-thermostat"]').last().waitFor();
    assert.equal(rotations, 1);
    assert.equal(wins, gameModeEnabled ? 1 : 0, "duplicate telemetry created an extra win");
    assert.equal(await page.locator(".win-overlay").count(), 0);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("patient-monitor", target); // Old-mode packets must not affect the new page.
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("thermostat", map("thermostat").faultStartingState);
    await page.locator('.panel-surface[data-live="true"]').waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  }
  const preview = await browser.newPage({viewport:{width:800,height:480}});
  await preview.route("**/api/**", route => route.fulfill({status:503,contentType:"application/json",body:"{}"}));
  for (const state of ["waiting","stale"]) {
    await preview.goto(`${base}/tests/surface-preview.html?mode=patient-monitor&state=${state}`);
    await preview.locator('.patient-surface[data-leads="unknown"][data-spo2="unknown"][data-alarm="unknown"]').waitFor();
    assert.equal(await preview.locator(".patient-trace").count(),0);
  }
  await preview.goto(`${base}/tests/surface-preview.html?mode=patient-monitor&state=partial`);
  assert.match(await preview.locator(".patient-surface header").innerText(),/SIMULATED WAVEFORMS/);
  assert.equal(await preview.locator(".patient-trace").count(),2);
  await preview.emulateMedia({reducedMotion:"reduce"});
  assert.equal(await preview.locator(".patient-trace").first().evaluate(el=>getComputedStyle(el).animationName),"none");
  await preview.getByRole("button",{name:"Help Fix",exact:true}).click();
  await preview.locator(".fix-unavailable").waitFor();
  assert.equal(await preview.locator(".fix-sheet ol").count(),0);
  assert.match(await preview.locator(".fix-unavailable").innerText(),/Help Fix is unreachable/);
  await preview.screenshot({path:"test-results/patient-flow/help.png"});
  await preview.getByRole("button",{name:"Close Help Fix"}).click();
  await preview.setViewportSize({width:390,height:844});
  assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await preview.screenshot({path:"test-results/patient-flow/narrow.png",fullPage:true});
  await preview.close();
  console.log("Patient flow passed: independent leads/spo2/alarm, power, invalid input, read-only taps, ON/OFF completion, QR, one win, rotation, and old-mode isolation.");
} finally {
  await browser.close();
}
