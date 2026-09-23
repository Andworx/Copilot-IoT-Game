import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/data/deviceProfiles.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { DEVICE_PROFILES, DEVICE_ORDER, CABLE_RECIPES, cablesMatch } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const profileUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const promptSource = readFileSync(new URL("../src/lib/quickFixPrompt.ts", import.meta.url), "utf8");
const promptJs = ts.transpileModule(promptSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace('"../data/deviceProfiles"', JSON.stringify(profileUrl));
const { buildQuickFixPrompt } = await import(`data:text/javascript;base64,${Buffer.from(promptJs).toString("base64")}`);
assert.equal(DEVICE_ORDER.length, 12);
for (const slug of DEVICE_ORDER) {
  const device = DEVICE_PROFILES[slug];
  const map = JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
  assert.deepEqual(device.requiredCables, map.requiredCables);
  assert.deepEqual(device.restoreSequence, map.restoreSequence, `${slug}: restore contract drift`);
  assert.deepEqual(device.fault, map.faultStartingState, `${slug}: initial state drift`);
  assert.deepEqual([...device.restoreSequence.map(c => c.physicalPin)].sort(), ["J1", "J2", "J3", "J4", "SW1", "SW2", "SW3", "SW4", "SW5", "SW6"]);
  for (const control of [...map.switches, ...map.connectors]) {
    const step = device.restoreSequence.find(c => c.physicalPin === control.physicalPin);
    assert.equal(step.key, control.key, `${slug}: physical binding`);
    assert.equal(step.label, control.label, `${slug}: physical label`);
  }
  const prompt = buildQuickFixPrompt(device, device.fault, []);
  assert.match(prompt, /restoration checks the final switch positions and cable connections/);
  assert.match(prompt, /Actions can be completed in any order/);
  assert.doesNotMatch(prompt, /restored in the listed order|change, in order/);
  for (const cable of map.requiredCables) assert.ok(prompt.includes(`Connect Cable ${cable.cable} to ${cable.sockets.join(" and ")}`));
  assert.ok(prompt.includes("Remove all other cables"));
  const keys = device.restoreSequence.map(c => c.key);
  assert.equal(device.checkWin({}), false, `${slug}: missing telemetry cannot win`);

  // This is repository-owned Boolean syntax, not user input. Validate the grammar
  // before translating the Pi expression, then compare every possible configuration.
  const tokens = map.win.match(/[a-z_][a-z_0-9]*|[()]/g);
  assert.equal(tokens.join(""), map.win.replace(/\s/g, ""));
  assert.ok(tokens.every(t => keys.includes(t) || ["and", "or", "not", "(", ")"].includes(t)));
  const expression = tokens.map(t => ({ and: "&&", or: "||", not: "!" })[t] ?? t).join(" ");
  const piWin = new Function(...keys, `return Boolean(${expression})`);
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
  for (const other of DEVICE_ORDER) {
    assert.equal(device.checkWin(target, CABLE_RECIPES[other]), slug === other, `${slug}: accepts ${other} cables`);
  }
  const reversed = device.requiredCables.map(c => ({ cable: c.cable, sockets: [...c.sockets].reverse() })).reverse();
  assert.equal(device.checkWin(target, reversed), true);
  assert.equal(device.checkWin(target, device.requiredCables.map(c => ({ ...c, cable: null }))), false);
  assert.equal(device.checkWin(target, [...device.requiredCables, device.requiredCables[0]]), false);
}
assert.equal(cablesMatch(CABLE_RECIPES.thermostat, [{ cable: 1, sockets: ["J1", "J1"] }]), false);
console.log("Exact cable recipes verified across all 144 mode pairs, missing/unknown/extra cables, and reversed ends.");
