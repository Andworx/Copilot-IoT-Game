import type { JsonSchemaProperty, ToolDef } from "../types";

/** An MCP `tools/list` entry, as much of it as the game uses. */
export interface RawTool {
  name?: unknown;
  description?: unknown;
  inputSchema?: { properties?: Record<string, Record<string, unknown>>; required?: unknown };
  annotations?: { readOnlyHint?: unknown };
}

/** Fields that exist on the server but are noise to a player. */
const HIDDEN_FIELDS = new Set(["data_quality"]);
const PRIMITIVES = new Set(["string", "integer", "number", "boolean"]);

export function toToolDef(raw: RawTool): ToolDef | null {
  if (typeof raw.name !== "string") return null;
  const properties: Record<string, JsonSchemaProperty> = {};
  for (const [name, schema] of Object.entries(raw.inputSchema?.properties ?? {})) {
    const type = schema.type;
    if (HIDDEN_FIELDS.has(name) || typeof type !== "string" || !PRIMITIVES.has(type)) continue;
    properties[name] = {
      type: type as JsonSchemaProperty["type"],
      description: typeof schema.description === "string" ? schema.description : undefined,
      enum: Array.isArray(schema.enum) ? schema.enum.map(String) : undefined,
      default: ["string", "number", "boolean"].includes(typeof schema.default)
        ? (schema.default as string | number | boolean)
        : undefined,
      minimum: typeof schema.minimum === "number" ? schema.minimum : undefined,
      maximum: typeof schema.maximum === "number" ? schema.maximum : undefined,
    };
  }
  const required = Array.isArray(raw.inputSchema?.required)
    ? raw.inputSchema.required.filter((r): r is string => typeof r === "string" && r in properties)
    : [];
  return {
    name: raw.name,
    description: typeof raw.description === "string" ? raw.description : raw.name,
    inputSchema: { type: "object", properties, required },
  };
}

/** The tools a player may call directly: read-only ones only. */
export function playerTools(raw: RawTool[]): ToolDef[] {
  return raw
    .filter((t) => t.annotations?.readOnlyHint === true)
    .map(toToolDef)
    .filter((t): t is ToolDef => t !== null);
}
