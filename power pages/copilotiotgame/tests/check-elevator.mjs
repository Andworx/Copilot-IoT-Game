import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.KIOSK_TEST_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const map = slug => JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
const elevatorProfile = map("elevator");
const target = Object.fromEntries(elevatorProfile.restoreSequence.map(c => [c.key, c.target]));
mkdirSync("test-results/elevator-flow", { recursive: true });
try {
  for (const gameModeEnabled of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 800, height: 480 } });
    const page = await context.newPage();
    let socket;
    let wins = 0;
    let rotations = 0;
    let currentMode = "elevator";
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
    await page.goto(`${base}/kiosk/elevator`);
    await page.locator('.elevator-surface[data-brake="unknown"]').waitFor();
    for (let attempt=0; !socket && attempt<100; attempt++) await page.waitForTimeout(50);
    assert.ok(socket); await page.waitForTimeout(100);
    telemetry("elevator", elevatorProfile.faultStartingState);
    await page.locator('.elevator-surface[data-power="off"][data-brake="unpowered"]').waitFor();
    const partial = { ...target, keyed_one: !target.keyed_one };
    const features = { brake:"brake", doors:"doors", inspection:"inspection" };
    for (const key of Object.keys(features)) {
      telemetry("elevator", { ...partial, brake:false, doors:false, inspection:false, [key]:true });
      await page.locator(`.elevator-surface[data-${features[key]}="enabled"]`).waitFor();
      for (const other of Object.keys(features).filter(k => k !== key)) assert.equal(await page.locator(".elevator-surface").getAttribute(`data-${features[other]}`),"disabled");
    }
    for (const [key,value,operation] of [["power",false,"unpowered"],["doors",false,"doors-open"],["brake",false,"brake-held"],["inspection",true,"inspection"],["keyed_two",false,"interlocked"],["socket_s1",false,"interlocked"]]) {
      telemetry("elevator",{...target,[key]:value});
      await page.locator(`.elevator-surface[data-operation="${operation}"]`).waitFor();
      assert.equal(await page.locator(".elevator-car").evaluate(el=>getComputedStyle(el).animationName),"none");
    }
    telemetry("elevator",partial);
    await page.locator('.elevator-surface[data-brake="enabled"][data-doors="enabled"][data-inspection="disabled"]').waitFor();
    assert.equal(wins,0);
    await page.locator(".elevator-shaft").click();
    assert.equal(wins,0);
    await page.screenshot({path:`test-results/elevator-flow/partial-${gameModeEnabled}.png`});
    telemetry("elevator",{...partial,power:false});
    await page.locator('.elevator-surface[data-brake="unpowered"][data-doors="unpowered"][data-inspection="unpowered"]').waitFor();
    telemetry("elevator",{...partial,brake:null});
    await page.locator('.elevator-surface[data-brake="unknown"][data-doors="enabled"][data-inspection="disabled"]').waitFor();
    telemetry("elevator", target);
    await page.locator(".win-overlay").waitFor();
    if (gameModeEnabled) await page.getByAltText("Scan to claim your prize").waitFor();
    else assert.equal(await page.locator(".qr-block").count(), 0);
    assert.equal(wins, gameModeEnabled ? 1 : 0);
    telemetry("elevator", target);
    await page.screenshot({ path: `test-results/elevator-flow/game-mode-${gameModeEnabled}.png` });
    await page.waitForURL("**/kiosk/patient-monitor", { timeout: 15000 });
    await page.locator('[data-surface="patient-monitor"]').last().waitFor();
    assert.equal(rotations, 1);
    assert.equal(wins, gameModeEnabled ? 1 : 0, "duplicate telemetry created an extra win");
    assert.equal(await page.locator(".win-overlay").count(), 0);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("elevator", target); // Old-mode packets must not affect the new page.
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
    await preview.goto(`${base}/tests/surface-preview.html?mode=elevator&state=${state}`);
    await preview.locator('.elevator-surface[data-brake="unknown"][data-doors="unknown"][data-inspection="unknown"]').waitFor();
  }
  await preview.goto(`${base}/tests/surface-preview.html?mode=elevator&state=restored`);
  await preview.locator('.elevator-surface[data-operation="ready"]').waitFor();
  assert.equal(await preview.locator(".elevator-car").evaluate(el=>getComputedStyle(el).animationName),"elevator-travel");
  await preview.emulateMedia({reducedMotion:"reduce"});
  assert.equal(await preview.locator(".elevator-car").evaluate(el=>getComputedStyle(el).animationName),"none");
  await preview.goto(`${base}/tests/surface-preview.html?mode=elevator&state=partial`);
  await preview.emulateMedia({reducedMotion:"reduce"});
  await preview.getByRole("button",{name:"Help Fix",exact:true}).click();
  await preview.locator(".fix-sheet ol").waitFor();
  assert.equal(await preview.locator(".fix-sheet li").count(),10);
  await preview.screenshot({path:"test-results/elevator-flow/help.png"});
  await preview.getByRole("button",{name:"Close Help Fix"}).click();
  await preview.setViewportSize({width:390,height:844});
  assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await preview.screenshot({path:"test-results/elevator-flow/narrow.png",fullPage:true});
  await preview.close();
  console.log("Elevator flow passed: independent brake/doors/inspection, power, invalid input, read-only taps, ON/OFF completion, QR, one win, rotation, and old-mode isolation.");
} finally {
  await browser.close();
}
