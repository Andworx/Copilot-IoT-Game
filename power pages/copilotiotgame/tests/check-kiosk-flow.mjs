import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.KIOSK_TEST_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const map = slug => JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
const thermostat = map("thermostat");
const target = Object.fromEntries(thermostat.restoreSequence.map(c => [c.key, c.target]));
mkdirSync("test-results/instrument-flow", { recursive: true });
try {
  for (const gameModeEnabled of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 800, height: 480 } });
    const page = await context.newPage();
    let socket;
    let wins = 0;
    let rotations = 0;
    let currentMode = "thermostat";
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const send = (name, value) => socket.send(JSON.stringify({ type: 1, target: name, arguments: [value] }) + "\x1e");
    const telemetry = (slug, controls, overrides = {}) => send("SendTelemetryUpdate", { data: {
      deviceSlug: slug, controls, cables: map(slug).requiredCables, cableSchema: "panel-cable-build/v1",
      win: map(slug).restoreSequence.every(c => controls[c.key] === c.target), ...overrides,
    }, deviceId: "fixture-panel" });
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
    await page.goto(`${base}/kiosk/thermostat`);
    await page.locator('.thermostat-surface[data-hvac="unknown"]').waitFor();
    for (let attempt = 0; !socket && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve, 50));
    assert.ok(socket, "mock SignalR handshake missing");
    // Allow React to install subscribers after the SignalR start promise resolves.
    await page.waitForTimeout(100);
    telemetry("thermostat", thermostat.faultStartingState);
    await page.locator('.thermostat-surface[data-hvac="off"]').waitFor();
    const partial = { ...target, keyed_one: false };
    telemetry("thermostat", partial);
    await page.locator('.thermostat-surface[data-hvac="heat"]').waitFor();
    assert.equal(wins, 0, "partial repair created a win");
    await page.locator('.thermostat-fan[data-running="true"]').waitFor();
    telemetry("thermostat", { ...partial, eco: true });
    await page.locator('.thermostat-surface[data-hvac="standby"]').waitFor();
    await page.locator('.thermostat-fan[data-running="true"]').waitFor();
    telemetry("thermostat", { ...partial, fan: false });
    await page.locator('.thermostat-fan[data-running="false"]').waitFor();
    telemetry("thermostat", { ...partial, mode: true });
    await page.locator('.thermostat-surface[data-hvac="cool"]').waitFor();
    telemetry("thermostat", { ...partial, power: false });
    await page.locator('.thermostat-surface[data-hvac="off"]').waitFor();
    await page.locator('.thermostat-fan[data-running="false"]').waitFor();
    for (const overrides of [
      { cables: [{ cable: 4, sockets: ["J1", "J2"] }] },
      { cables: [{ cable: null, sockets: ["J1", "J2"] }] },
      { cableSchema: undefined },
      { win: false },
    ]) {
      telemetry("thermostat", target, overrides);
      await page.waitForTimeout(100);
      assert.equal(await page.locator(".win-overlay").count(), 0, "invalid cable telemetry showed success");
      assert.equal(wins, 0);
    }
    telemetry("thermostat", target);
    await page.locator(".win-overlay").waitFor();
    if (gameModeEnabled) await page.getByAltText("Scan to claim your prize").waitFor();
    else assert.equal(await page.locator(".qr-block").count(), 0);
    assert.equal(wins, gameModeEnabled ? 1 : 0);
    telemetry("thermostat", target);
    await page.screenshot({ path: `test-results/instrument-flow/game-mode-${gameModeEnabled}.png` });
    await page.waitForURL("**/kiosk/patient-monitor", { timeout: 15000 });
    await page.locator('[data-surface="patient-monitor"]').last().waitFor();
    assert.equal(rotations, 1);
    assert.equal(wins, gameModeEnabled ? 1 : 0, "duplicate telemetry created an extra win");
    assert.equal(await page.locator(".win-overlay").count(), 0);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("thermostat", target); // Old-mode packets must not affect the new page.
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
    telemetry("patient-monitor", map("patient-monitor").faultStartingState);
    await page.locator('.panel-surface[data-live="true"]').waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log("Mock telemetry flow passed: power/fan/eco/heat/cool, ON/OFF completion, QR, one win, rotation, and old-mode isolation.");
} finally {
  await browser.close();
}
