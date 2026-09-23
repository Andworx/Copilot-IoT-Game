import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.KIOSK_TEST_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const page = await browser.newPage({ viewport: { width: 800, height: 480 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
// Never contact a real backend from the preview or send a Direct Line request.
await page.route("**/api/**", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
const modes = ["thermostat", "smart-lock", "coldchain-sensor", "water-pump", "field-radio", "ev-charger", "elevator", "traffic-signal", "patient-monitor", "retail-kiosk", "drone-ground-control", "industrial-robot-arm"];
const artifact = "test-results/instrument-surfaces";
await mkdir(artifact, { recursive: true });
try {
  for (const mode of modes) {
    const map = JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${mode}.json`, import.meta.url), "utf8"));
    const cableActions = [...map.requiredCables.map(c => `Connect Cable ${c.cable} to ${c.sockets.join(" and ")}`), "Remove all other cables"];
    for (const state of ["fault", "partial", "restored", "stale", "waiting"]) {
      await page.goto(`${base}/tests/surface-preview.html?mode=${mode}&state=${state}`);
      await page.locator(".panel-surface").waitFor();
      assert.equal(await page.locator(".physical-input").count(), 0);
      const deviceCopy = await page.locator(".panel-surface").evaluate(el => [el.textContent, ...[...el.querySelectorAll("[aria-label], [title], [alt]")].flatMap(n => [n.getAttribute("aria-label"), n.getAttribute("title"), n.getAttribute("alt")])].join(" "));
      assert.doesNotMatch(deviceCopy, /\b(?:SW[1-6]|J[1-4]|GPIO)\b/i, `${mode}/${state}: physical identifiers leaked onto device`);
      assert.equal(await page.locator(".panel-surface button:not(:disabled)").count(), 0, `${mode}: mutable surface`);
      const outside = await page.locator(".physical-input, .surface-connection, .surface-status-strip, .surface-instrument, .help-fix-btn").evaluateAll(elements => elements.filter(el => {
        const r = el.getBoundingClientRect();
        return r.left < 0 || r.right > innerWidth + 1 || r.top < 0 || r.bottom > innerHeight + 1;
      }).map(el => el.className));
      assert.deepEqual(outside, [], `${mode}/${state}: clipping`);
      const instrumentOverflow = await page.locator(".surface-instrument").evaluate(container => {
        const bounds = container.getBoundingClientRect();
        return [...container.querySelectorAll(".thermostat-face, .thermostat-equipment, .smart-lock-surface, .retail-surface, .traffic-surface, .field-radio-surface, .drone-surface, .robot-surface, .elevator-surface, .ev-surface, .coldchain-surface, .patient-surface, .water-pump-surface")].some(el => {
          const rect = el.getBoundingClientRect();
          return rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1;
        });
      });
      assert.equal(instrumentOverflow, false, `${mode}/${state}: instrument overlaps shared chrome`);
      if (["stale", "waiting"].includes(state)) {
        assert.equal(await page.locator(".instrument-status").filter({ hasText: "Unknown" }).count(), 4);
      }
      await page.screenshot({ path: `${artifact}/${mode}-${state}.png` });
      await page.getByRole("button", { name: "Connection and display options" }).click();
      await page.getByRole("menuitem", { name: "Switch positions & cables" }).click();
      await page.getByRole("dialog").waitFor();
      assert.equal(await page.locator(".control-setup [data-pin]").count(), 10);
      assert.equal(await page.locator(".control-setup tbody tr").count(), 6);
      assert.deepEqual(await page.getByRole("region", { name: "Required cable connections" }).locator("ul").first().locator("li").allTextContents(), cableActions, `${mode}: cable recipe`);
      for (const step of map.restoreSequence) {
        const row = page.locator(`.control-setup [data-pin="${step.physicalPin}"]`);
        if (step.physicalPin.startsWith("SW")) {
          assert.equal(await row.locator("td").first().innerText(), step.label.replace(/^.*? - /, ""));
          assert.equal(await row.locator("strong").innerText(), step.target ? "ON" : "OFF");
        } else {
          assert.equal(await row.innerText(), `${step.physicalPin}: ${step.target ? "Connected" : "Leave open"}`);
        }
      }
      if (state === "partial") await page.screenshot({ path: `${artifact}/${mode}-setup.png` });
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(await page.locator(".gear-btn").evaluate(el => el === document.activeElement), true);
      if (state === "partial") {
        assert.deepEqual(errors, [], `${mode}: unexpected browser errors`);
        await page.getByRole("button", { name: "Help Fix", exact: true }).click();
        await page.locator(".fix-sheet ol").waitFor();
        const actions = await page.locator(".fix-sheet li").allTextContents();
        assert.equal(actions.length, 6 + cableActions.length, `${mode}: help actions`);
        assert.deepEqual(actions.slice(6), cableActions);
        for (const step of map.restoreSequence.filter(c => c.physicalPin.startsWith("SW"))) {
          const name = step.physicalPin === "SW5" ? "Keyed switch 1" : step.physicalPin === "SW6" ? "Keyed switch 2" : `Switch ${step.physicalPin.slice(2)}`;
          assert.ok(actions.includes(`Turn ${name} ${step.target ? "on" : "off"}`), `${mode}: missing switch action ${step.physicalPin}`);
        }
        await page.locator(".fix-sheet").evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.finished)); });
        await page.screenshot({ path: `${artifact}/${mode}-help.png` });
        await page.getByRole("button", { name: "Close Help Fix" }).click();
        assert.equal(await page.locator(".fix-sheet.is-open").count(), 0);
        assert.ok(errors.every(error => error.includes("503") || error.startsWith("Agent request failed AgentUnavailableError: Direct Line is not configured")), `${mode}: unexpected help error: ${errors}`);
        errors.length = 0;
      }
    }
  }
  await page.goto(`${base}/tests/surface-preview.html?mode=thermostat&state=partial`);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const animated = await page.locator(".panel-surface *").evaluateAll(elements => elements.filter(el => getComputedStyle(el).animationName !== "none").map(el => el.className));
  assert.deepEqual(animated, [], "reduced-motion leaves an instrument animated");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "narrow horizontal overflow");
  await page.screenshot({ path: `${artifact}/thermostat-narrow.png`, fullPage: true });
  // Read-only instrument taps must not mutate the fixture state.
  const before = await page.evaluate(() => window.render_game_to_text());
  await page.locator(".surface-instrument").click();
  assert.equal(await page.evaluate(() => window.render_game_to_text()), before);
  assert.deepEqual(errors, [], "unexpected browser errors");
  console.log("60 surface fixtures passed at 800x480; read-only, stale, narrow, reduced motion, and Help Fix checked.");
} finally {
  await browser.close();
}
