import { readFileSync, existsSync } from "node:fs";
const metadata = new URL("../.power/schemas/appschemas/dataSourcesInfo.ts", import.meta.url);
if (!existsSync(metadata)) throw new Error("Staff connector metadata is missing. Complete docs/STAFF_API_SETUP.md before deployment.");
const source = readFileSync(metadata, "utf8");
const config = JSON.parse(readFileSync(new URL("../power.config.json", import.meta.url), "utf8"));
if (!Object.keys(config.connectionReferences ?? {}).length) throw new Error("No Power Apps connection reference is configured.");
const client = readFileSync(new URL("../src/apiConfig.ts", import.meta.url), "utf8");
for (const match of client.matchAll(/"(?:GET|POST) \/api\/[^"\n]+": "([^"]+)"/g)) {
  if (!source.includes(match[1])) throw new Error(`Staff connector operation missing: ${match[1]}`);
}
console.log("Staff connector metadata and connection references are present; live per-user consent still needs validation.");
