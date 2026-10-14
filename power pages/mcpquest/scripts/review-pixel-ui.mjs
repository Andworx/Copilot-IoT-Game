/** UI regression checks: npm run dev, then node scripts/review-pixel-ui.mjs.
 * Uses local preview and mocked system discovery; never starts a live prize run.
 * Review images go to the ignored root refrences/ folder.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const site = process.env.SITE ?? "http://127.0.0.1:5177";
const output = fileURLToPath(new URL("../../../refrences/", import.meta.url));
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const servers = Array.from({ length: 15 }, (_, index) => ({
  slug: `review-${index}`, name: `Mission ${index + 1}: Freight Tracking`,
  description: "Layout review fixture", toolCount: 12,
}));
await page.route("**/api/mcpquest/servers", (route) => route.fulfill({ json: { servers } }));
await page.route("**/api/mcpquest/leaderboard?*", (route) => route.fulfill({ json: { entries: [] } }));

async function noOverflow() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Page must fit the viewport");
}
async function noMarkerOverlap(selector) {
  const overlap = await page.locator(selector).evaluateAll((elements) => elements.some((a, index) => elements.slice(index + 1).some((b) => {
    const x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
    return x.left < y.right && x.right > y.left && x.top < y.bottom && x.bottom > y.top;
  })));
  assert.equal(overlap, false, "Map controls must not overlap");
}
async function screenshot(name) {
  await page.screenshot({ path: `${output}/mcpquest-pixel-${name}.png`, fullPage: true });
}

try {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${site}/?api=live`);
    await page.getByRole("button", { name: /push start button/i }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await noOverflow();
    await screenshot(`title-${width}`);
    await page.getByRole("button", { name: /push start button/i }).click();
    await page.locator(".quest-map-node").first().waitFor();
    await noOverflow();
    await noMarkerOverlap(".quest-map-node");
    const compact = width <= 900;
    assert.equal(await page.locator(".quest-map-index").isVisible(), compact);
    const control = compact ? page.locator(".quest-map-index button").nth(14) : page.locator(".quest-map-node input").nth(14);
    await control.focus();
    await page.keyboard.press("Space");
    await page.locator(".quest-map-panel > strong").filter({ hasText: servers[14].name }).waitFor();
    if (compact) assert.equal(await control.getAttribute("aria-pressed"), "true");
    await screenshot(`map-${width}`);
  }

  let finishBuild;
  const buildReady = new Promise((resolve) => { finishBuild = resolve; });
  await page.route("**/api/mcpquest/generate", async (route) => {
    await buildReady;
    await route.fulfill({ json: { specId: "0123456789abcdef", title: "Pixel review mission", cached: false } });
  });
  await page.route("**/api/mcpquest/generate/status?*", (route) => route.fulfill({ json: { stage: "reading" } }));
  await page.locator("#nickname").fill("PIXELTEST");
  await page.getByRole("button", { name: "Start mission", exact: true }).click();
  await page.locator(".cave").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await screenshot("cave-mobile");
  finishBuild();
  await page.getByRole("button", { name: "Begin the mission", exact: true }).waitFor();
  assert.equal(await page.locator(".cave-item.is-have").count(), 6);
  await screenshot("cave-ready-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await screenshot("cave-ready-desktop");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await page.goto(`${site}/?api=preview`);
  await page.getByRole("button", { name: /push start button/i }).click();
  await page.getByRole("textbox").first().fill("PIXELTEST");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.locator(".mission-hud.is-normal").waitFor();
  await noOverflow();
  await noMarkerOverlap(".mission-room-item");
  assert.equal(await page.locator(".stats").evaluate((el) => el.getBoundingClientRect().right <= innerWidth), true);
  await page.locator(".mission-room-index button").nth(1).click();
  assert.equal(await page.locator(".mission-room-item").nth(1).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Begin work", exact: true }).click();
  await page.locator(".case-body").waitFor();
  await noOverflow();
  await screenshot("work-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await screenshot("work-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.fastForward(601_000);
  await page.locator(".mission-hud.is-warning").waitFor();
  await page.clock.fastForward(301_000);
  await page.locator(".mission-hud.is-urgent").waitFor();
  await screenshot("timer-urgent");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator(".mission-health i").evaluate((el) => getComputedStyle(el).animationName), "none");
  await page.clock.fastForward(300_000);
  await page.locator(".big-score").waitFor();
  await noOverflow();
  await screenshot("result-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await screenshot("result-desktop");
  assert.deepEqual(errors, []);
  console.log("PASS: 320/390/768/1440 layouts, marker selection, cave/build completion, work navigation, timer thresholds, reduced motion, expiry/results.");
} finally {
  await browser.close();
}
