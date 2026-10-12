import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.KIOSK_TEST_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const map = slug => JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
const trafficProfile = map("traffic-signal");
const target = Object.fromEntries(trafficProfile.restoreSequence.map(c => [c.key, c.target]));
mkdirSync("test-results/traffic-flow", { recursive: true });
try {
  for (const gameModeEnabled of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 800, height: 480 } });
    const page = await context.newPage();
    let socket;
    let wins = 0;
    let rotations = 0;
    let currentMode = "traffic-signal";
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
    await page.goto(`${base}/kiosk/traffic-signal`);
    await page.locator('.traffic-surface[data-operation="unknown"]').waitFor();
    for (let attempt = 0; !socket && attempt < 100; attempt++) await page.waitForTimeout(50);
    assert.ok(socket);
    await page.waitForTimeout(100);
    telemetry("traffic-signal", trafficProfile.faultStartingState);
    await page.locator('.traffic-surface[data-operation="unpowered"]').waitFor();
    const partial = { ...target, keyed_one: !target.keyed_one };
    for (const [key, value, operation] of [["controller",false,"controller-disabled"],["timing",false,"timing-missing"],["manual",true,"manual-override"],["power",false,"unpowered"]]) {
      telemetry("traffic-signal", { ...partial, [key]:value });
      await page.locator(`.traffic-surface[data-operation="${operation}"][data-cycling="false"]`).waitFor();
      assert.equal(await page.locator('.traffic-head[data-signal="off"]').count(),4);
    }
    telemetry("traffic-signal", partial);
    await page.locator('.traffic-surface[data-operation="enabled"][data-cycling="true"]').waitFor();
    assert.equal(wins,0,"cycle enabled without keys must not win");
    await page.locator(".traffic-intersection").click();
    assert.equal(wins,0);
    await page.screenshot({path:`test-results/traffic-flow/partial-${gameModeEnabled}.png`});
    telemetry("traffic-signal", { ...partial, timing:null });
    await page.locator('.traffic-surface[data-operation="unknown"][data-cycling="false"]').waitFor();
    await page.locator(".traffic-controller dl > div").filter({hasText:"Controller"}).getByText("Enabled",{exact:true}).waitFor();
    telemetry("traffic-signal", target);
    await page.locator(".win-overlay").waitFor();
    if (gameModeEnabled) await page.getByAltText("Scan to claim your prize").waitFor();
    else assert.equal(await page.locator(".qr-block").count(), 0);
    assert.equal(wins, gameModeEnabled ? 1 : 0);
    telemetry("traffic-signal", target);
    await page.screenshot({ path: `test-results/traffic-flow/game-mode-${gameModeEnabled}.png` });
    await page.waitForURL("**/kiosk/patient-monitor", { timeout: 15000 });
    await page.locator('[data-surface="patient-monitor"]').last().waitFor();
    assert.equal(rotations, 1);
    assert.equal(wins, gameModeEnabled ? 1 : 0, "duplicate telemetry created an extra win");
    assert.equal(await page.locator(".win-overlay").count(), 0);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("traffic-signal", target); // Old-mode packets must not affect the new page.
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("patient-monitor", map("patient-monitor").faultStartingState);
    await page.locator('.panel-surface[data-live="true"]').waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  }
  const preview = await browser.newPage({viewport:{width:800,height:480}});
  await preview.route("**/api/**", route => route.fulfill({status:503,contentType:"application/json",body:"{}"}));
  await preview.clock.install();
  await preview.goto(`${base}/tests/surface-preview.html?mode=traffic-signal&state=partial`);
  await preview.locator('.traffic-surface[data-phase="0"]').waitFor();
  await preview.clock.pauseAt(await preview.evaluate(() => Date.now()));
  // Both opposing pairs agree; the crossing direction never gets green at the same time.
  const phases = [["green","red"],["amber","red"],["red","red"],["red","green"],["red","amber"],["red","red"],["green","red"]];
  for (let phase = 0; phase < phases.length; phase++) {
    assert.equal(await preview.locator('[data-direction="north"]').getAttribute("data-signal"),phases[phase][0]);
    assert.equal(await preview.locator('[data-direction="south"]').getAttribute("data-signal"),phases[phase][0]);
    assert.equal(await preview.locator('[data-direction="east"]').getAttribute("data-signal"),phases[phase][1]);
    assert.equal(await preview.locator('[data-direction="west"]').getAttribute("data-signal"),phases[phase][1]);
    if (phase < 6) await preview.clock.runFor([4000,1500,800,4000,1500,800][phase]);
  }
  await preview.emulateMedia({reducedMotion:"reduce"});
  await preview.locator('.traffic-surface[data-cycling="false"]').waitFor();
  assert.equal(await preview.locator('.traffic-head[data-signal="red"]').count(),4);
  await preview.clock.runFor(15000);
  assert.equal(await preview.locator('.traffic-surface').getAttribute("data-phase"),"paused");
  await preview.emulateMedia({reducedMotion:"no-preference"});
  await preview.locator('.traffic-surface[data-phase="0"]').waitFor();
  for (const state of ["waiting","stale"]) {
    await preview.goto(`${base}/tests/surface-preview.html?mode=traffic-signal&state=${state}`);
    await preview.locator('.traffic-surface[data-operation="unknown"][data-cycling="false"]').waitFor();
    await preview.clock.runFor(15000);
    assert.equal(await preview.locator('.traffic-head[data-signal="off"]').count(),4);
  }
  await preview.clock.resume();
  await preview.goto(`${base}/tests/surface-preview.html?mode=traffic-signal&state=partial`);
  await preview.getByRole("button",{name:"Help Fix",exact:true}).click();
  await preview.locator(".fix-unavailable").waitFor();
  assert.equal(await preview.locator(".fix-sheet ol").count(),0);
  assert.match(await preview.locator(".fix-unavailable").innerText(),/Help Fix is unreachable/);
  await preview.screenshot({path:"test-results/traffic-flow/help.png"});
  await preview.getByRole("button",{name:"Close Help Fix"}).click();
  await preview.setViewportSize({width:390,height:844});
  assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await preview.screenshot({path:"test-results/traffic-flow/narrow.png",fullPage:true});
  await preview.close();
  console.log("Traffic flow passed: controller/timing/manual blocks, power, invalid input, read-only taps, ON/OFF completion, QR, one win, rotation, and old-mode isolation.");
} finally {
  await browser.close();
}
