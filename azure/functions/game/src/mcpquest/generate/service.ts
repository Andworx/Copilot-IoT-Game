import { computeSpecId, computeToolsHash, validateGameSpec, type GameSpec } from "../gamespec";
import { fromWireSpec } from "../gamespecSchema";
import { isMcpStationSlug } from "../mcpstation";
import type { ToolDef } from "../types";
import { fetchServerDigest, type FetchLike, type ServerDigest } from "./digest";
import type { SpecModel } from "./foundry";
import { GENERATOR_INSTRUCTIONS, buildGeneratorInput, buildRepairInput } from "./prompt";

export interface StoredSpec {
  specId: string;
  toolsHash: string;
  spec: GameSpec;
  /** The tool list the spec was validated against. Plays judge designs against it. */
  tools: ToolDef[];
  /** True once the reference designs have been proven through the judge (proveSpec). */
  validated: boolean;
  createdAt: number;
}

/** Reads a stored spec by its id. This is all a play needs. */
export interface SpecReader {
  getById(specId: string): Promise<StoredSpec | null>;
}

/** Reads a stored spec by its id. This is all a play needs. */
export interface SpecReader {
  getById(specId: string): Promise<StoredSpec | null>;
}

/** Where generated specs live, keyed by tool-list hash. Blob storage in production. */
export interface SpecStore {
  get(slug: string, toolsHash: string): Promise<StoredSpec | null>;
  put(slug: string, stored: StoredSpec): Promise<void>;
}

export interface GenerateDeps {
  model: SpecModel;
  store: SpecStore;
  fetchFn: FetchLike;
  now?: () => number;
  /**
   * Runs a spec's reference designs through the judge. Not built yet (plan, Phase 2): until it
   * exists specs are stored with `validated: false` and must not mint prizes.
   */
  prove?: (spec: GameSpec, digest: ServerDigest) => Promise<{ ok: boolean; problems: string[] }>;
}

export class GenerateError extends Error {
  constructor(
    readonly code: "bad_server" | "server_unavailable" | "model_unavailable" | "invalid_spec" | "unproven_spec",
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = "GenerateError";
  }
}

export interface GenerateResult {
  stored: StoredSpec;
  cached: boolean;
  /** Model calls used: 0 on a cache hit, 1 normally, 2 after a repair. */
  modelCalls: number;
}

/**
 * Slug in, validated GameSpec out. The expensive path (read server, call the model) runs only
 * on a cache miss; the cache key includes the tool-list hash, so a changed server regenerates.
 */
export async function generateGameSpec(slug: unknown, deps: GenerateDeps): Promise<GenerateResult> {
  if (!isMcpStationSlug(slug)) throw new GenerateError("bad_server", "Unknown MCP server.");

  let digest: ServerDigest;
  try {
    digest = await fetchServerDigest(slug, deps.fetchFn);
  } catch (error) {
    console.error("MCP Quest could not read the MCP server", error);
    throw new GenerateError("server_unavailable", "The MCP server could not be read.");
  }
  if (digest.tools.length === 0) throw new GenerateError("bad_server", "That MCP server has no usable tools.");

  const toolsHash = computeToolsHash(digest.tools);
  const cached = await deps.store.get(slug, toolsHash);
  if (cached) return { stored: cached, cached: true, modelCalls: 0 };

  const input = buildGeneratorInput(digest, toolsHash);
  const check = (output: unknown) => validateGameSpec(fromWireSpec(output), { tools: digest.tools, bindToTools: true, requireReference: true });

  let modelCalls = 0;
  const ask = async (previous?: { input: string; output: unknown }, repairInput?: string) => {
    modelCalls += 1;
    try {
      return await deps.model.generate({ instructions: GENERATOR_INSTRUCTIONS, input: repairInput ?? input, previous });
    } catch (error) {
      console.error("MCP Quest generator model call failed", error);
      throw new GenerateError("model_unavailable", "The game could not be generated right now.");
    }
  };

  // Checking one answer: shape and tool-list validation first, then (when a judge is supplied)
  // the proof that its reference designs behave. Both kinds of complaint go back to the model.
  type Checked = { spec: GameSpec; problems: [] } | { spec?: undefined; problems: string[]; code: "invalid_spec" | "unproven_spec" };
  const evaluate = async (output: unknown): Promise<Checked> => {
    const result = check(output);
    if (!result.ok) return { problems: result.errors, code: "invalid_spec" };
    if (result.spec.server.id !== slug) return { problems: [`spec.server.id must be "${slug}"`], code: "invalid_spec" };
    if (deps.prove) {
      const proof = await deps.prove(result.spec, digest);
      if (!proof.ok) return { problems: proof.problems, code: "unproven_spec" };
    }
    return { spec: result.spec, problems: [] };
  };

  let output = await ask();
  let checked = await evaluate(output);
  if (!checked.spec) {
    // One repair attempt: the validator's or the judge's complaints go back to the model.
    output = await ask({ input, output }, buildRepairInput(checked.problems));
    checked = await evaluate(output);
  }
  if (!checked.spec) {
    throw checked.code === "unproven_spec"
      ? new GenerateError("unproven_spec", "The generated game could not be proven solvable.", checked.problems)
      : new GenerateError(
          "invalid_spec",
          checked.problems.some((p) => p.startsWith("spec.server.id must be"))
            ? "The generated game names a different server."
            : "The generated game was not valid.",
          checked.problems,
        );
  }
  const result = { spec: checked.spec };
  const validated = !!deps.prove;
  const stored: StoredSpec = {
    specId: computeSpecId(result.spec),
    toolsHash,
    spec: result.spec,
    tools: digest.tools,
    validated,
    createdAt: (deps.now ?? Date.now)(),
  };
  await deps.store.put(slug, stored);
  return { stored, cached: false, modelCalls };
}

