import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import ts from "typescript";

// deviceProfiles.ts is bundled (not just transpiled) so its value-level import of
// lib/lampLogic.ts resolves — a data: URL module has no base path to resolve a bare
// relative import against. Type-only imports (e.g. "../types/game") never reach the
// bundle graph, so they don't need a real file to resolve against.
//
// quickFixPrompt.ts is then transpiled (not bundled) with its own "../data/deviceProfiles"
// import specifier redirected to that SAME data: URL string, rather than being bundled
// (and so re-evaluating deviceProfiles.ts) independently: socketActionsFrom's `slug =>
// RESTORE_SEQUENCES[slug] === sequence` lookup matches by array reference, and two
// separately bundled copies of deviceProfiles.ts would each build their own distinct
// RESTORE_SEQUENCES arrays, breaking that `===`. Importing the identical data: URL twice
// hits Node's module cache and returns one shared module instance instead.
const deviceProfilesEntry = fileURLToPath(new URL("../src/data/deviceProfiles.ts", import.meta.url));
const { outputFiles } = await esbuild.build({
  entryPoints: [deviceProfilesEntry],
  bundle: true,
  write: false,
  format: "esm",
  target: "es2022",
  platform: "neutral",
});
const profileUrl = `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`;
const { DEVICE_PROFILES, DEVICE_ORDER, CABLE_RECIPES, cablesMatch, cableActions } = await import(profileUrl);
const promptSource = readFileSync(new URL("../src/lib/quickFixPrompt.ts", import.meta.url), "utf8");
const promptJs = ts.transpileModule(promptSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace('"../data/deviceProfiles"', JSON.stringify(profileUrl));
const { buildQuickFixPrompt } = await import(`data:text/javascript;base64,${Buffer.from(promptJs).toString("base64")}`);

// This is repository-owned Boolean syntax, not user input (win and every lamp's `when`
// in logic_maps/<slug>.json). Validate the grammar, then compile to a real JS predicate
// so it can be compared against the kiosk's TS translation at every possible input.
function compileExpr(expr, keys, label) {
  const tokens = expr.match(/[a-z_][a-z_0-9]*|[()]/g);
  assert.equal(tokens.join(""), expr.replace(/\s/g, ""), label);
  assert.ok(tokens.every(t => keys.includes(t) || ["and", "or", "not", "(", ")"].includes(t)), label);
  const body = tokens.map(t => ({ and: "&&", or: "||", not: "!" })[t] ?? t).join(" ");
  return new Function(...keys, `return Boolean(${body})`);
}
// Mirrors lib/lampLogic.ts's PATTERN_COLOR — keep both in sync by hand.
const PATTERN_COLOR = { on: "green", blink: "amber", fast_blink: "red" };

assert.equal(DEVICE_ORDER.length, 12);
for (const slug of DEVICE_ORDER) {
  const device = DEVICE_PROFILES[slug];
  const map = JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
  assert.deepEqual(device.requiredCables, map.requiredCables);
  assert.deepEqual(device.restoreSequence, map.restoreSequence, `${slug}: restore contract drift`);
  assert.deepEqual(device.fault, map.faultStartingState, `${slug}: initial state drift`);
  assert.deepEqual([...device.restoreSequence.map(c => c.physicalPin)].sort(), ["S1", "S2", "S3", "S4", "SW1", "SW2", "SW3", "SW4", "SW5", "SW6"]);
  for (const control of [...map.switches, ...map.connectors]) {
    const step = device.restoreSequence.find(c => c.physicalPin === control.physicalPin);
    assert.equal(step.key, control.key, `${slug}: physical binding`);
    assert.equal(step.label, control.label, `${slug}: physical label`);
  }
  const prompt = buildQuickFixPrompt(device, device.fault, []);
  assert.match(prompt, /restoration checks the final switch positions and cable connections/);
  assert.match(prompt, /Actions can be completed in any order/);
  assert.doesNotMatch(prompt, /restored in the listed order|change, in order/);
  for (const action of cableActions(map.requiredCables)) assert.ok(prompt.includes(action));
  assert.ok(prompt.includes("Remove all other cables"));
  const keys = device.restoreSequence.map(c => c.key);
  assert.equal(device.checkWin({}), false, `${slug}: missing telemetry cannot win`);

  // Same lamp logic on both sides (issue #102 follow-up): the kiosk's lamp keys must
  // match the Pi's exactly, and every lamp's condition/pattern must agree at every input.
  assert.deepEqual(device.lamps.map(l => l.key).sort(), map.lamps.map(l => l.key).sort(), `${slug}: lamp keys diverge from the Pi`);
  const piWin = compileExpr(map.win, keys, `${slug}: win grammar`);
  // Unlike `win`, a lamp's `when` may itself reference "win" (e.g. "restored"'s is
  // literally "win") — safe_eval.py adds it to `variables` alongside the switch/connector
  // state, so it's an extra allowed token/argument here too.
  const piLamps = map.lamps.map((lamp) => ({
    key: lamp.key,
    pattern: lamp.pattern ?? "on",
    test: compileExpr(lamp.when, [...keys, "win"], `${slug}: lamp ${lamp.key} grammar`),
  }));
  for (let mask = 0; mask < 2 ** keys.length; mask++) {
    const state = Object.fromEntries(keys.map((key, i) => [key, Boolean(mask & (1 << i))]));
    const guarded = new Proxy(state, { get(target, key) {
      assert.ok(Object.hasOwn(target, key), `${slug}: lamp/win reads unknown control ${String(key)}`);
      return target[key];
    } });
    const win = device.checkWin(guarded, map.requiredCables);
    assert.equal(win, piWin(...keys.map(key => state[key])), `${slug}: win differs from Pi at ${mask}`);
    const lamps = device.computeLamps(guarded, win);
    assert.deepEqual(Object.keys(lamps).sort(), device.lamps.map(l => l.key).sort());
    assert.ok(Object.values(lamps).every(color => ["off", "green", "amber", "red"].includes(color)));
    if (win) assert.ok(!Object.values(lamps).includes("red"), `${slug}: restored panel still faults`);
    for (const piLamp of piLamps) {
      const active = win || piLamp.test(...keys.map(key => state[key]), win);
      const expected = active ? PATTERN_COLOR[win ? "on" : piLamp.pattern] : "off";
      assert.equal(lamps[piLamp.key], expected, `${slug}: lamp ${piLamp.key} diverges from the Pi at mask ${mask}`);
    }
  }
  const target = Object.fromEntries(device.restoreSequence.map(c => [c.key, c.target]));
  for (const step of device.restoreSequence) {
    assert.equal(device.checkWin({ ...target, [step.key]: !step.target }, map.requiredCables), false, `${slug}: ${step.physicalPin} does not participate in restoration`);
  }
}
console.log("12 mode contracts verified; all 12,288 physical configurations agree with the Pi.");

for (const slug of DEVICE_ORDER) {
  const device = DEVICE_PROFILES[slug];
  const target = Object.fromEntries(device.restoreSequence.map(c => [c.key, c.target]));
  assert.equal(device.checkWin(target), false, `${slug}: no cable telemetry`);
  assert.equal(device.checkWin(target, device.requiredCables), true, `${slug}: rejects its required RJ-45 links`);
  const reversed = device.requiredCables.map(c => ({ cable: c.cable, sockets: [...c.sockets].reverse() })).reverse();
  assert.equal(device.checkWin(target, reversed), true);
  assert.equal(device.checkWin(target, device.requiredCables.map(c => ({ ...c, cable: null }))), false);
  assert.equal(device.checkWin(target, device.requiredCables.map(c => ({ ...c, cable: 1 }))), true);
  assert.equal(device.checkWin(target, [...device.requiredCables, device.requiredCables[0]]), false);
}
assert.equal(cablesMatch(CABLE_RECIPES.thermostat, [{ cable: 1, sockets: ["S1", "S1"] }]), false);
console.log("RJ-45 socket-pair recipes verified for missing/unknown/extra links and reversed ends.");

// Walkthrough steps are data: every node/link id they cite must exist in the dataset they
// describe, so a renamed node cannot silently leave a step highlighting nothing.
const bundleModule = async entry => {
  const { outputFiles } = await esbuild.build({ entryPoints: [fileURLToPath(new URL(entry, import.meta.url))], bundle: true, write: false, format: "esm", target: "es2022", platform: "neutral" });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);
};
const { MAP_NODES, MAP_LINKS, SOLUTION_NODES, SOLUTION_LINKS } = await bundleModule("../src/data/systemMap.ts");
const { STANDARD_WALKTHROUGH, ADVANCED_WALKTHROUGH, linkKey } = await bundleModule("../src/data/walkthrough.ts");
const datasets = [[STANDARD_WALKTHROUGH, MAP_NODES, MAP_LINKS], [ADVANCED_WALKTHROUGH, SOLUTION_NODES, SOLUTION_LINKS]];
for (const [walkthrough, nodes, links] of datasets) {
  const nodeIds = new Set(nodes.map(n => n.id)), linkKeys = new Set(links.map(linkKey));
  assert.equal(linkKeys.size, links.length, `${walkthrough.id}: duplicate link keys`);
  assert.ok(walkthrough.steps.length > 0, `${walkthrough.id}: no steps`);
  walkthrough.steps.forEach((step, i) => {
    const label = `${walkthrough.id} step ${i + 1}`;
    assert.ok(step.title && step.description && step.nodes.length > 0, `${label}: needs title, description and nodes`);
    for (const id of [...step.nodes, ...(step.dim?.nodes ?? [])]) assert.ok(nodeIds.has(id), `${label}: unknown node ${id}`);
    for (const key of [...step.links, ...(step.dim?.links ?? [])]) assert.ok(linkKeys.has(key), `${label}: unknown link ${key}`);
  });
}
console.log("Walkthrough steps verified against their architecture datasets.");
