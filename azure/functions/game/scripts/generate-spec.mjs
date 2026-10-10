#!/usr/bin/env node
/**
 * Runs the MCP Quest game generator end to end from a developer machine:
 * reads an MCP Station server, asks Foundry for a GameSpec, validates it, and saves the result.
 *
 *   npm ci && npm run build            (once, in azure/functions/game)
 *   az login
 *   $env:FOUNDRY_ENDPOINT = "https://<resource>.openai.azure.com/openai/v1"
 *   $env:FOUNDRY_MODEL    = "<deployment name>"
 *   node scripts/generate-spec.mjs it-ticketing [--out spec.json]
 *
 * Needs the machine's public IP to be allowed by the Foundry resource's network rules.
 * Nothing is written to Azure or MCP Station; only read tools are called. Each run calls the
 * model (once, or twice after a repair) and is not cached.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const outIndex = args.indexOf("--out");
const out = outIndex >= 0 ? args[outIndex + 1] : `spec-${slug}.json`;
if (!slug) {
  console.error("Usage: node scripts/generate-spec.mjs <mcp-station-slug> [--out file.json]");
  process.exit(2);
}
const endpoint = process.env.FOUNDRY_ENDPOINT;
const model = process.env.FOUNDRY_MODEL;
if (!endpoint || !model) {
  console.error("Set FOUNDRY_ENDPOINT and FOUNDRY_MODEL first.");
  process.exit(2);
}

const load = (rel) => import(pathToFileURL(resolve("dist/src/mcpquest", rel)).href);
let foundry, service;
try {
  foundry = await load("generate/foundry.js");
  service = await load("generate/service.js");
} catch {
  console.error("Build first: npm ci && npm run build (in azure/functions/game).");
  process.exit(2);
}

const audience = foundry.foundryAudience(endpoint);
const az = process.platform === "win32" ? "az.cmd" : "az";
const getToken = async () =>
  execFileSync(az, ["account", "get-access-token", "--resource", audience, "--query", "accessToken", "-o", "tsv"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  }).trim();

const realModel = foundry.createFoundryModel({ projectEndpoint: endpoint, model, getToken, timeoutMs: 180_000 });
const outputs = [];
const loggingModel = {
  async generate(req) {
    const started = Date.now();
    const output = await realModel.generate(req);
    console.log(`[Model] answered in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    outputs.push(output);
    return output;
  },
};

const judge = await load("specJudge.js");
const memory = new Map();
const store = {
  async get(s, hash) { return memory.get(`${s}:${hash}`) ?? null; },
  async put(s, stored) { memory.set(`${s}:${stored.toolsHash}`, stored); },
};

console.log(`[Generate] ${slug} via ${endpoint} (${model})`);
const started = Date.now();
try {
  const result = await service.generateGameSpec(slug, {
    model: loggingModel,
    store,
    fetchFn: fetch,
    prove: async (spec, digest) => judge.proveSpec(spec, digest.tools, digest.samples),
  });
  const spec = result.stored.spec;
  writeFileSync(out, JSON.stringify(result.stored, null, 2) + "\n");
  console.log(`[PASS] Valid spec in ${((Date.now() - started) / 1000).toFixed(1)}s, ${result.modelCalls} model call(s).`);
  console.log(`  title:  ${spec.title}`);
  console.log(`  specId: ${result.stored.specId}  (validated through the judge: ${result.stored.validated})`);
  for (const c of spec.cases) {
    console.log(`  - [${c.designer}/${c.judging}] ${c.title}: ${c.requirements.length} requirement(s), ${c.scenarios.length} scenario(s)`);
    for (const r of c.requirements) console.log(`      * ${r.text}`);
  }
  console.log(`  saved to ${out}`);
  if (outputs.length > 1) {
    // The first answer needed a repair: keep it so the prompt can be tuned from real failures.
    const firstFile = out.replace(/\.json$/, "") + ".first-attempt.json";
    writeFileSync(firstFile, JSON.stringify(outputs[0], null, 2) + "\n");
    console.log(`  first attempt (rejected, then repaired) saved to ${firstFile}`);
  }
} catch (error) {
  console.log(`[FAIL] ${error.code ?? "error"}: ${error.message}`);
  for (const d of error.details ?? []) console.log(`  - ${d}`);
  const rawFile = out.replace(/\.json$/, "") + ".raw.json";
  if (outputs.length) {
    writeFileSync(rawFile, JSON.stringify(outputs, null, 2) + "\n");
    console.log(`  raw model output saved to ${rawFile}`);
  }
  process.exit(1);
}
