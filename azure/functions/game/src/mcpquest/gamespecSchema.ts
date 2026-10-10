import { DESIGNER_KINDS, GAME_SPEC_VERSION, SPEC_LIMITS } from "./gamespec";

/**
 * JSON Schema handed to the Foundry agent as its structured-output format.
 *
 * It follows the strict-mode conventions: every property is listed in `required` and optional
 * ones are nullable, and no object allows extra fields. `validateGameSpec` treats a null
 * optional the same as an absent one, so the agent's output validates unchanged.
 *
 * This schema only shapes the output. It cannot check tool names, argument values or
 * `fromInput` keys against the real server, so `validateGameSpec` stays authoritative.
 */

const str = (maxLength: number) => ({ type: "string", maxLength });
const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });
const scalar = { anyOf: [str(SPEC_LIMITS.scalarChars), { type: "number" }, { type: "boolean" }] };

function strictObject(properties: Record<string, object>) {
  return { type: "object", additionalProperties: false, required: Object.keys(properties), properties };
}

const argMatcher = {
  anyOf: [
    strictObject({ equals: scalar }),
    strictObject({ oneOf: { type: "array", minItems: 1, maxItems: 10, items: scalar } }),
    strictObject({ fromInput: str(40) }),
  ],
};

const callMatcher = strictObject({
  tool: str(64),
  args: nullable({ type: "object", additionalProperties: argMatcher }),
});

const predicate = {
  anyOf: [
    strictObject({
      op: { const: "called" },
      call: callMatcher,
      min: nullable({ type: "integer", minimum: 0, maximum: SPEC_LIMITS.maxCallCount }),
      max: nullable({ type: "integer", minimum: 0, maximum: SPEC_LIMITS.maxCallCount }),
    }),
    strictObject({ op: { const: "not-called" }, call: callMatcher }),
    strictObject({ op: { const: "before" }, first: callMatcher, then: callMatcher }),
    strictObject({ op: { const: "all" }, of: { type: "array", minItems: 1, maxItems: 8, items: { $ref: "#/$defs/predicate" } } }),
    strictObject({ op: { const: "any" }, of: { type: "array", minItems: 1, maxItems: 8, items: { $ref: "#/$defs/predicate" } } }),
    strictObject({ op: { const: "not" }, of: { $ref: "#/$defs/predicate" } }),
    strictObject({
      op: { const: "design" },
      path: { type: "string", maxLength: 80, pattern: "^[A-Za-z0-9_]+(\\.[A-Za-z0-9_]+|\\[\\d+\\])*$" },
      equals: nullable(scalar),
      contains: nullable(str(SPEC_LIMITS.scalarChars)),
    }),
  ],
};

const slug = { type: "string", pattern: "^[a-z][a-z0-9-]{0,39}$" };

const scenarioSpec = strictObject({
  name: str(60),
  trigger: { enum: ["record-created", "recurrence", "manual"] },
  input: { type: "object", additionalProperties: scalar },
});

const requirementSpec = strictObject({
  id: slug,
  text: str(SPEC_LIMITS.requirementChars),
  scenario: nullable(str(60)),
  check: { $ref: "#/$defs/predicate" },
});

const caseSpec = strictObject({
  id: slug,
  title: str(SPEC_LIMITS.titleChars),
  designer: { enum: [...DESIGNER_KINDS] },
  judging: { enum: ["run", "design"] },
  brief: str(SPEC_LIMITS.briefChars),
  requirements: { type: "array", minItems: SPEC_LIMITS.requirementsPerCase.min, maxItems: SPEC_LIMITS.requirementsPerCase.max, items: requirementSpec },
  scenarios: { type: "array", maxItems: SPEC_LIMITS.scenariosPerCase.max, items: scenarioSpec },
  hint: str(SPEC_LIMITS.hintChars),
  reference: nullable(strictObject({ pass: { type: "object" }, fail: { type: "object" } })),
});

export const GAME_SPEC_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "MCP Quest GameSpec",
  ...strictObject({
    version: { const: GAME_SPEC_VERSION },
    server: strictObject({ id: slug, name: str(SPEC_LIMITS.titleChars), toolsHash: { type: "string", pattern: "^[0-9a-f]{16}$" } }),
    title: str(SPEC_LIMITS.titleChars),
    scenario: str(SPEC_LIMITS.scenarioChars),
    cases: { type: "array", minItems: SPEC_LIMITS.cases.min, maxItems: SPEC_LIMITS.cases.max, items: caseSpec },
  }),
  $defs: { predicate },
} as const;
