import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.KIOSK_TEST_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const map = slug => JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
const droneProfile = map("drone-ground-control");
const target = Object.fromEntries(droneProfile.restoreSequence.map(c => [c.key, c.target]));
mkdirSync("test-results/drone-flow", { recursive: true });
try {
  for (const gameModeEnabled of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 800, height: 480 } });
    const page = await context.newPage();
    let socket;
    let wins = 0;
    let rotations = 0;
    let currentMode = "drone-ground-control";
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
    await page.goto(`${base}/kiosk/drone-ground-control`);
    await page.locator('.drone-surface[data-gps="unknown"]').waitFor();
    for (let attempt=0; !socket && attempt<100; attempt++) await page.waitForTimeout(50);
    assert.ok(socket); await page.waitForTimeout(100);
    telemetry("drone-ground-control", droneProfile.faultStartingState);
    await page.locator('.drone-surface[data-power="off"][data-gps="unpowered"]').waitFor();
    const partial = { ...target, keyed_one: !target.keyed_one };
    const features = { gps:"gps", telemetry:"telemetry", uplink:"uplink" };
    for (const key of Object.keys(features)) {
      telemetry("drone-ground-control", { ...partial, gps:false, telemetry:false, uplink:false, [key]:true });
      await page.locator(`.drone-surface[data-${features[key]}="enabled"]`).waitFor();
      for (const other of Object.keys(features).filter(k => k !== key)) assert.equal(await page.locator(".drone-surface").getAttribute(`data-${features[other]}`),"disabled");
    }
    telemetry("drone-ground-control",partial);
    await page.locator('.drone-surface[data-gps="enabled"][data-telemetry="enabled"][data-uplink="enabled"]').waitFor();
    assert.equal(wins,0);
    await page.locator(".drone-navigation").click();
    assert.equal(wins,0);
    await page.screenshot({path:`test-results/drone-flow/partial-${gameModeEnabled}.png`});
    telemetry("drone-ground-control",{...partial,power:false});
    await page.locator('.drone-surface[data-gps="unpowered"][data-telemetry="unpowered"][data-uplink="unpowered"]').waitFor();
    telemetry("drone-ground-control",{...partial,gps:null});
    await page.locator('.drone-surface[data-gps="unknown"][data-telemetry="enabled"][data-uplink="enabled"]').waitFor();
    telemetry("drone-ground-control", target);
    await page.locator(".win-overlay").waitFor();
    if (gameModeEnabled) await page.getByAltText("Scan to claim your prize").waitFor();
    else assert.equal(await page.locator(".qr-block").count(), 0);
    assert.equal(wins, gameModeEnabled ? 1 : 0);
    await page.locator(".drone-takeoff").waitFor();
    assert.doesNotMatch(await page.locator(".win-overlay").innerText(), /\b(?:SW[1-6]|J[1-4])\b/i);
    await page.screenshot({path:`test-results/drone-flow/liftoff-${gameModeEnabled}.png`});
    const aircraft = page.locator(".takeoff-aircraft");
    await aircraft.evaluate(el => { window.takeoffElement = el; window.takeoffStart = el.getAnimations()[0].startTime; });
    telemetry("drone-ground-control", target);
    await page.waitForTimeout(3300);
    assert.equal(await aircraft.evaluate(el => el === window.takeoffElement && el.getAnimations()[0].startTime === window.takeoffStart), true, "duplicate telemetry restarted takeoff");
    assert.equal(await aircraft.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42), -115);
    const clipped = await page.locator(".drone-takeoff, .qr-block, .reset-timer, .win-overlay h2, .restore-grid").evaluateAll(els => els.some(el => { const r=el.getBoundingClientRect(); return r.top<0 || r.bottom>innerHeight || r.left<0 || r.right>innerWidth; }));
    if(clipped) { console.log(await page.locator(".drone-takeoff, .qr-block, .reset-timer, .win-overlay h2, .restore-grid").evaluateAll(els=>els.map(el=>({cls:el.className,rect:el.getBoundingClientRect().toJSON()})))); await page.screenshot({path:"test-results/drone-flow/clipped.png"}); }
    assert.equal(clipped,false,"completion content clipped");
    await page.screenshot({ path: `test-results/drone-flow/game-mode-${gameModeEnabled}.png` });
    await page.emulateMedia({ reducedMotion:"reduce" });
    assert.equal(await aircraft.evaluate(el => getComputedStyle(el).animationName),"none");
    assert.equal(await aircraft.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42),-115);
    await page.screenshot({path:`test-results/drone-flow/reduced-${gameModeEnabled}.png`});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await page.locator(".reset-timer").scrollIntoViewIfNeeded();
    await page.setViewportSize({width:800,height:480});
    await page.waitForURL("**/kiosk/patient-monitor", { timeout: 15000 });
    await page.locator('[data-surface="patient-monitor"]').last().waitFor();
    assert.equal(rotations, 1);
    assert.equal(wins, gameModeEnabled ? 1 : 0, "duplicate telemetry created an extra win");
    assert.equal(await page.locator(".win-overlay, .drone-takeoff").count(), 0);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("drone-ground-control", target); // Old-mode packets must not affect the new page.
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
    await preview.goto(`${base}/tests/surface-preview.html?mode=drone-ground-control&state=${state}`);
    await preview.locator('.drone-surface[data-gps="unknown"][data-telemetry="unknown"][data-uplink="unknown"]').waitFor();
  }
  await preview.goto(`${base}/tests/surface-preview.html?mode=drone-ground-control&state=partial`);
  await preview.emulateMedia({reducedMotion:"reduce"});
  await preview.getByRole("button",{name:"Help Fix",exact:true}).click();
  await preview.locator(".fix-sheet ol").waitFor();
  assert.equal(await preview.locator(".fix-sheet li").count(),10);
  await preview.screenshot({path:"test-results/drone-flow/help.png"});
  await preview.getByRole("button",{name:"Close Help Fix"}).click();
  await preview.setViewportSize({width:390,height:844});
  assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await preview.screenshot({path:"test-results/drone-flow/narrow.png",fullPage:true});
  await preview.close();
  console.log("Drone flow passed: independent gps/telemetry/uplink, power, invalid input, read-only taps, ON/OFF completion, QR, one win, rotation, and old-mode isolation.");
} finally {
  await browser.close();
}
