import { GAME_SPEC_JSON_SCHEMA } from "../gamespecSchema";

/**
 * Calls a Foundry project's Responses endpoint for structured JSON. Unit-tested against a fake
 * `fetch`; the request shape follows Microsoft's published Foundry Agent Service docs but has
 * NOT been run against a live project from this repo yet (the build environment cannot reach
 * Azure). Verify in the first deployed test; see requirements/MCP_QUEST_AGENT_PLAN.md.
 */

export interface SpecModel {
  /** Returns the model's JSON output. `previous` carries the prior turn for one repair attempt. */
  generate(input: { instructions: string; input: string; previous?: { input: string; output: unknown } }): Promise<unknown>;
}

export interface FoundryConfig {
  /**
   * Either a Foundry project endpoint (`https://<resource>.services.ai.azure.com/api/projects/<project>`)
   * or the resource's OpenAI-style endpoint (`https://<resource>.openai.azure.com/openai/v1`).
   * A named prompt agent needs the project endpoint; a model deployment works with either.
   */
  projectEndpoint: string;
  /** A Foundry prompt agent to run. When set, `model` is not sent. */
  agentName?: string;
  /** A model deployment name, used when no agent is set. */
  model?: string;
  getToken: () => Promise<string>;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

const PROJECT_RE = /^https:\/\/[a-z0-9-]+\.services\.ai\.azure\.com\/api\/projects\/[A-Za-z0-9_-]+\/?$/;
const OPENAI_RE = /^https:\/\/[a-z0-9-]+\.(openai|cognitiveservices)\.azure\.com\/openai\/v1\/?$/;

export function isFoundryProjectEndpoint(url: string): boolean {
  return PROJECT_RE.test(url);
}

export function isFoundryEndpoint(url: string): boolean {
  return PROJECT_RE.test(url) || OPENAI_RE.test(url);
}

/** Where responses are created for each endpoint style. */
export function responsesUrl(endpoint: string): string {
  const base = endpoint.replace(/\/$/, "");
  return OPENAI_RE.test(endpoint) ? `${base}/responses` : `${base}/openai/v1/responses`;
}

/** Entra token audience for each endpoint style. */
export function foundryAudience(endpoint: string): string {
  return OPENAI_RE.test(endpoint) ? "https://cognitiveservices.azure.com" : "https://ai.azure.com";
}

/** Reads the first `output_text` the Responses API returned. */
export function extractOutputText(body: unknown): string | null {
  const b = body as { output_text?: unknown; output?: { type?: string; content?: { type?: string; text?: unknown }[] }[] };
  if (typeof b?.output_text === "string" && b.output_text) return b.output_text;
  for (const item of b?.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return null;
}

export function createFoundryModel(config: FoundryConfig): SpecModel {
  if (!isFoundryEndpoint(config.projectEndpoint)) {
    throw new Error(
      "FOUNDRY_ENDPOINT must look like https://<resource>.services.ai.azure.com/api/projects/<project> or https://<resource>.openai.azure.com/openai/v1",
    );
  }
  if (!config.agentName && !config.model) throw new Error("Set a Foundry agent name or a model deployment");
  if (config.agentName && !isFoundryProjectEndpoint(config.projectEndpoint)) {
    throw new Error("A Foundry agent needs the project endpoint; use a model deployment with the OpenAI-style endpoint");
  }
  const doFetch = config.fetchFn ?? fetch;

  return {
    async generate({ instructions, input, previous }) {
      const messages = previous
        ? [
            { role: "user", content: previous.input },
            { role: "assistant", content: JSON.stringify(previous.output) },
            { role: "user", content: input },
          ]
        : [{ role: "user", content: input }];
      const body = {
        ...(config.agentName ? { agent_reference: { type: "agent_reference", name: config.agentName } } : { model: config.model, instructions }),
        input: messages,
        text: { format: { type: "json_schema", name: "mcpquest_gamespec", strict: true, schema: GAME_SPEC_JSON_SCHEMA } },
        store: false,
      };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 90_000);
      try {
        const response = await doFetch(responsesUrl(config.projectEndpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${await config.getToken()}` },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Foundry responded HTTP ${response.status}`);
        const text = extractOutputText(await response.json());
        if (!text) throw new Error("Foundry returned no output text");
        try {
          return JSON.parse(text) as unknown;
        } catch {
          throw new Error("Foundry output was not valid JSON");
        }
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/**
 * Token for the Foundry data plane (audience from `foundryAudience`). In Azure, uses the Function
 * App's managed identity; for local work set FOUNDRY_ACCESS_TOKEN. No keys are stored anywhere.
 */
export async function foundryToken(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: typeof fetch = fetch,
  audience = "https://ai.azure.com",
): Promise<string> {
  if (env.FOUNDRY_ACCESS_TOKEN) return env.FOUNDRY_ACCESS_TOKEN;
  const endpoint = env.IDENTITY_ENDPOINT;
  const header = env.IDENTITY_HEADER;
  if (!endpoint || !header) throw new Error("No managed identity available and FOUNDRY_ACCESS_TOKEN is not set");
  const url = new URL(endpoint);
  url.searchParams.set("resource", audience);
  url.searchParams.set("api-version", "2019-08-01");
  if (env.FOUNDRY_IDENTITY_CLIENT_ID) url.searchParams.set("client_id", env.FOUNDRY_IDENTITY_CLIENT_ID);
  const response = await fetchFn(url, { headers: { "X-IDENTITY-HEADER": header } });
  if (!response.ok) throw new Error(`Managed identity token request failed: HTTP ${response.status}`);
  const body = (await response.json()) as { access_token?: unknown };
  if (typeof body.access_token !== "string") throw new Error("Managed identity returned no token");
  return body.access_token;
}
