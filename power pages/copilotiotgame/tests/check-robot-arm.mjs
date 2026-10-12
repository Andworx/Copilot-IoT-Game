import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.KIOSK_TEST_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const map = slug => JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
const robotProfile = map("industrial-robot-arm");
const target = Object.fromEntries(robotProfile.restoreSequence.map(c => [c.key, c.target]));
mkdirSync("test-results/robot-flow", { recursive: true });
try {
  for (const gameModeEnabled of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 800, height: 480 } });
    const page = await context.newPage();
    let socket;
    let wins = 0;
    let rotations = 0;
    let currentMode = "industrial-robot-arm";
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
    await page.goto(`${base}/kiosk/industrial-robot-arm`);
    await page.locator('.robot-surface[data-estop="unknown"]').waitFor();
    for (let attempt=0; !socket && attempt<100; attempt++) await page.waitForTimeout(50);
    assert.ok(socket); await page.waitForTimeout(100);
    telemetry("industrial-robot-arm", robotProfile.faultStartingState);
    await page.locator('.robot-surface[data-power="off"][data-estop="unpowered"]').waitFor();
    const partial = { ...target, keyed_one: !target.keyed_one };
    const features = { estop:"estop", servo:"servo", guard:"guard" };
    for (const key of Object.keys(features)) {
      telemetry("industrial-robot-arm", { ...partial, estop:false, servo:false, guard:false, [key]:true });
      await page.locator(`.robot-surface[data-${features[key]}="enabled"]`).waitFor();
      for (const other of Object.keys(features).filter(k => k !== key)) assert.equal(await page.locator(".robot-surface").getAttribute(`data-${features[other]}`),"disabled");
    }
    for (const [key,value,operation] of [["power",false,"unpowered"],["estop",false,"estop"],["guard",true,"guard"],["servo",false,"servo"],["keyed_one",false,"access"],["keyed_two",false,"pendant"],["socket_s2",false,"interlocked"]]) {
      telemetry("industrial-robot-arm",{...target,[key]:value});
      await page.locator(`.robot-surface[data-operation="${operation}"]`).waitFor();
      assert.equal(await page.locator(".robot-linkage").evaluate(el=>getComputedStyle(el).animationName),"none");
    }
    telemetry("industrial-robot-arm",partial);
    await page.locator('.robot-surface[data-estop="enabled"][data-servo="enabled"][data-guard="disabled"]').waitFor();
    assert.equal(wins,0);
    await page.locator(".robot-cell").click();
    assert.equal(wins,0);
    await page.screenshot({path:`test-results/robot-flow/partial-${gameModeEnabled}.png`});
    telemetry("industrial-robot-arm",{...partial,power:false});
    await page.locator('.robot-surface[data-estop="unpowered"][data-servo="unpowered"][data-guard="unpowered"]').waitFor();
    telemetry("industrial-robot-arm",{...partial,estop:null});
    await page.locator('.robot-surface[data-estop="unknown"][data-servo="enabled"][data-guard="disabled"]').waitFor();
    telemetry("industrial-robot-arm", target);
    await page.locator(".win-overlay").waitFor();
    if (gameModeEnabled) await page.getByAltText("Scan to claim your prize").waitFor();
    else assert.equal(await page.locator(".qr-block").count(), 0);
    assert.equal(wins, gameModeEnabled ? 1 : 0);
    telemetry("industrial-robot-arm", target);
    await page.screenshot({ path: `test-results/robot-flow/game-mode-${gameModeEnabled}.png` });
    await page.waitForURL("**/kiosk/patient-monitor", { timeout: 15000 });
    await page.locator('[data-surface="patient-monitor"]').last().waitFor();
    assert.equal(rotations, 1);
    assert.equal(wins, gameModeEnabled ? 1 : 0, "duplicate telemetry created an extra win");
    assert.equal(await page.locator(".win-overlay").count(), 0);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("industrial-robot-arm", target); // Old-mode packets must not affect the new page.
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
    await preview.goto(`${base}/tests/surface-preview.html?mode=industrial-robot-arm&state=${state}`);
    await preview.locator('.robot-surface[data-estop="unknown"][data-servo="unknown"][data-guard="unknown"]').waitFor();
  }
  await preview.goto(`${base}/tests/surface-preview.html?mode=industrial-robot-arm&state=restored`);
  await preview.locator('.robot-surface[data-operation="ready"]').waitFor();
  assert.equal(await preview.locator(".robot-linkage").evaluate(el=>getComputedStyle(el).animationName),"robot-motion");
  await preview.emulateMedia({reducedMotion:"reduce"});
  assert.equal(await preview.locator(".robot-linkage").evaluate(el=>getComputedStyle(el).animationName),"none");
  await preview.goto(`${base}/tests/surface-preview.html?mode=industrial-robot-arm&state=partial`);
  await preview.emulateMedia({reducedMotion:"reduce"});
  await preview.getByRole("button",{name:"Help Fix",exact:true}).click();
  await preview.locator(".fix-unavailable").waitFor();
  assert.equal(await preview.locator(".fix-sheet ol").count(),0);
  assert.match(await preview.locator(".fix-unavailable").innerText(),/Help Fix is unreachable/);
  await preview.screenshot({path:"test-results/robot-flow/help.png"});
  await preview.getByRole("button",{name:"Close Help Fix"}).click();
  await preview.setViewportSize({width:390,height:844});
  assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await preview.screenshot({path:"test-results/robot-flow/narrow.png",fullPage:true});
  await preview.close();
  console.log("Robot flow passed: independent estop/servo/guard, power, invalid input, read-only taps, ON/OFF completion, QR, one win, rotation, and old-mode isolation.");
} finally {
  await browser.close();
}
