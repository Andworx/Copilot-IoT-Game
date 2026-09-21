import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/data/deviceProfiles.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { DEVICE_PROFILES, DEVICE_ORDER } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
assert.equal(DEVICE_ORDER.length, 12);
for (const slug of DEVICE_ORDER) {
  const device = DEVICE_PROFILES[slug];
  const map = JSON.parse(readFileSync(new URL(`../../../hardware/raspberry-pi/logic_maps/${slug}.json`, import.meta.url), "utf8"));
  assert.deepEqual(device.restoreSequence, map.restoreSequence, `${slug}: restore contract drift`);
  assert.deepEqual(device.fault, map.faultStartingState, `${slug}: initial state drift`);
  assert.deepEqual([...device.restoreSequence.map(c => c.physicalPin)].sort(), ["J1", "J2", "J3", "J4", "SW1", "SW2", "SW3", "SW4", "SW5", "SW6"]);
  for (const control of [...map.switches, ...map.connectors]) {
    const step = device.restoreSequence.find(c => c.physicalPin === control.physicalPin);
    assert.equal(step.key, control.key, `${slug}: physical binding`);
    assert.equal(step.label, control.label, `${slug}: physical label`);
  }
  for (const sw of device.switches) {
    assert.ok(map.switches.some(c => c.key === sw.key && c.physicalPin === sw.physicalPin), `${slug}: unknown screen control ${sw.key}`);
  }
  const keys = device.restoreSequence.map(c => c.key);
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
    const win = device.checkWin(guarded);
    assert.equal(win, piWin(...keys.map(key => state[key])), `${slug}: win differs from Pi at ${mask}`);
    const lamps = device.computeLamps(guarded, win);
    assert.deepEqual(Object.keys(lamps).sort(), device.lamps.map(l => l.key).sort());
    assert.ok(Object.values(lamps).every(color => ["off", "green", "amber", "red"].includes(color)));
    if (win) assert.ok(!Object.values(lamps).includes("red"), `${slug}: restored panel still faults`);
  }
  const target = Object.fromEntries(device.restoreSequence.map(c => [c.key, c.target]));
  for (const step of device.restoreSequence) {
    assert.equal(device.checkWin({ ...target, [step.key]: !step.target }), false, `${slug}: ${step.physicalPin} does not participate in restoration`);
  }
}
console.log("12 mode contracts verified; all 12,288 physical configurations agree with the Pi.");
