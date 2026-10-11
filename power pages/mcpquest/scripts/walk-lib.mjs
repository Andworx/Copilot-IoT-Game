/**
 * Shared steps for the browser walk-throughs: build a generated game's reference solution with
 * the designers' own controls, test it, and submit. Used by walk-spec.mjs and walk-build.mjs.
 */

/** Flattens a nested design into [path, value] pairs using the same path syntax the judge reads. */
function flat(o, pre = "") {
  return Object.entries(o).flatMap(([k, v]) =>
    Array.isArray(v)
      ? v.flatMap((x, j) => (typeof x === "object" && x ? flat(x, `${pre}${k}[${j}].`) : [[`${pre}${k}[${j}]`, x]]))
      : v && typeof v === "object"
        ? flat(v, `${pre}${k}.`)
        : [[`${pre}${k}`, v]],
  );
}

async function setField(page, selector, value) {
  const field = page.locator(selector);
  if ((await field.evaluate((el) => el.tagName)) === "SELECT") await field.selectOption(String(value));
  else await field.fill(String(value));
}

/** Builds one case's reference solution in the open case tab. */
export async function buildReference(page, c) {
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
        if (key) await card.locator(`select[aria-label="Where ${arg} comes from"]`).selectOption(key);
        else await setField(page, `#s${n + 1}-${arg}`, val);
      }
    }
  } else {
    for (const [path, v] of flat(ref)) {
      const selector = `#setting-${path.replace(/[^A-Za-z0-9]+/g, "-")}`;
      if ((await page.locator(selector).count()) === 0) continue; // a key the checks never read
      await setField(page, selector, v);
    }
  }
}

/**
 * Plays every case of a stored spec in the open page and submits.
 * mode "pass" builds the reference solution; anything else submits untouched.
 */
export async function playThrough(page, saved, mode = "pass") {
  let failed = false;
  for (const [i, c] of saved.spec.cases.entries()) {
    await page.click(`.case-tabs .tab >> nth=${i}`);
    if (mode !== "pass") continue;
    await buildReference(page, c);
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
  if (score !== (mode === "pass" ? "100 / 100" : "0 / 100")) failed = true;
  return { score, failed };
}
