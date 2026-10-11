#!/usr/bin/env node
/**
 * Plays a saved generated game through the real MCP Quest page in a headless browser, building
 * each case's reference solution with the designers' own controls, testing it and submitting.
 * It proves that what a player is shown (requirements, scenario facts, tools, settings) is enough
 * to build a passing design, which a unit test of the judge alone cannot.
 *
 *   cd "power pages/mcpquest"
 *   npm run dev                                      (in another terminal, port 5177)
 *   node scripts/walk-spec.mjs <stored-spec.json> [pass|none]
 *
 * <stored-spec.json> is a file written by azure/functions/game/scripts/generate-spec.mjs.
 * `pass` builds the reference pass design (expects 100); `none` submits untouched (expects 0).
 * Needs @playwright/test and a Chromium (`npx playwright install chromium`). SITE overrides the URL.
 */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const [specFile, mode = "pass"] = process.argv.slice(2);
if (!specFile) {
  console.error("Usage: node scripts/walk-spec.mjs <stored-spec.json> [pass|none]");
  process.exit(2);
}
const saved = JSON.parse(readFileSync(specFile, "utf8"));
const site = process.env.SITE ?? "http://localhost:5177";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const problems = [];
page.on("pageerror", (e) => problems.push(String(e)));
page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
// Match the path only: the page URL itself also ends in the file name.
await page.route((u) => u.pathname === "/spec.json", (r) =>
  r.fulfill({ contentType: "application/json", body: JSON.stringify(saved) }),
);

let failed = false;
try {
  await page.goto(`${site}/?specUrl=/spec.json`);
  await page.fill("#nickname", "WALKER");
  await page.click("button:has-text('Start')");
  await page.waitForSelector(".cases");

  for (const [i, c] of saved.spec.cases.entries()) {
    await page.click(`.case-tabs .tab >> nth=${i}`);
    if (mode !== "pass") continue;
    const ref = c.reference.pass;

    if (c.judging === "run") {
      await page.selectOption("#seq-trigger", ref.trigger);
      for (const [n, step] of ref.steps.entries()) {
        await page.click("button.add-step");
        await page.click(`.palette-item:has(strong:text-is("${step.tool}"))`);
        const card = page.locator(".flow-step").nth(n);
        // Optional settings sit in a collapsible.
        await card.locator("details.more-args").evaluateAll((els) => els.forEach((e) => (e.open = true)));
        for (const [arg, val] of Object.entries(step.args ?? {})) {
          const key = typeof val === "object" ? val.fromInput : /^\{\{\s*(\w+)\s*\}\}$/.exec(String(val))?.[1];
          if (key) {
            await card.locator(`select[aria-label="Where ${arg} comes from"]`).selectOption(key);
          } else {
            const field = page.locator(`#s${n + 1}-${arg}`);
            if ((await field.evaluate((el) => el.tagName)) === "SELECT") await field.selectOption(String(val));
            else await field.fill(String(val));
          }
        }
      }
    } else {
      const flat = (o, pre = "") =>
        Object.entries(o).flatMap(([k, v]) =>
          Array.isArray(v)
            ? v.flatMap((x, j) => (typeof x === "object" ? flat(x, `${pre}${k}[${j}].`) : [[`${pre}${k}[${j}]`, x]]))
            : v && typeof v === "object"
              ? flat(v, `${pre}${k}.`)
              : [[`${pre}${k}`, v]],
        );
      for (const [path, v] of flat(ref)) {
        const field = page.locator(`#setting-${path.replace(/[^A-Za-z0-9]+/g, "-")}`);
        if ((await field.count()) === 0) continue; // a key the checks never read
        if ((await field.evaluate((el) => el.tagName)) === "SELECT") await field.selectOption(String(v));
        else await field.fill(String(v));
      }
    }

    await page.click(".test-bar button.primary");
    await page.waitForSelector(".requirements .req.ok, .requirements .req.bad");
    const met = await page.locator(".requirements .req.ok").count();
    const missed = await page.locator(".requirements .req.bad").count();
    console.log(`${c.designer}/${c.judging}  "${c.title}": ${met} met, ${missed} missed`);
    if (missed > 0) failed = true;
  }

  await page.click("button:has-text('Submit answers')");
  await page.waitForSelector(".big-score");
  const score = (await page.textContent(".big-score")).replace(/\s+/g, " ").trim();
  console.log(`score: ${score}`);
  const expected = mode === "pass" ? "100 / 100" : "0 / 100";
  if (score !== expected) failed = true;
} catch (error) {
  console.error(`FAILED: ${error.message}`);
  failed = true;
}
if (problems.length) {
  console.error("browser errors:", problems.slice(0, 5));
  failed = true;
}
await browser.close();
process.exit(failed ? 1 : 0);
