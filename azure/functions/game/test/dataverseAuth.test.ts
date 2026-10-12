import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { dataverseAuthMode, dataverseFetchRaw, resetDataverseTokenCache } from "../src/lib/dataverse";
import { gameAppClientIds } from "../src/lib/consent";

const LEGACY = "8eb31f00-6f72-4663-8de9-e5290d2a2aa7";
const GAME_MI = "6d7ce7e2-606d-425d-aed0-e3916d91baea";
const STAFF_MI = "81e9d457-f06f-4478-87d4-fd4f88399d6f";

describe("dataverseAuthMode", () => {
  it("defaults to the client secret so existing deployments are unchanged", () => {
    assert.equal(dataverseAuthMode(undefined), "client-secret");
    assert.equal(dataverseAuthMode(""), "client-secret");
  });
  it("accepts managed-identity case-insensitively", () => {
    assert.equal(dataverseAuthMode(" Managed-Identity "), "managed-identity");
  });
  it("rejects unknown values instead of silently falling back", () => {
    assert.throws(() => dataverseAuthMode("certificate"), /DATAVERSE_AUTH_MODE/);
  });
});

describe("managed identity token", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    resetDataverseTokenCache();
  });

  it("requests a token from the identity endpoint with the identity header and caches it", async (t) => {
    process.env.DATAVERSE_AUTH_MODE = "managed-identity";
    process.env.IDENTITY_ENDPOINT = "http://127.0.0.1:9999/msi/token";
    process.env.IDENTITY_HEADER = "header-value";
    resetDataverseTokenCache();
    const expiry = String(Math.floor(Date.now() / 1000) + 3600);
    const calls: Array<{ url: string; auth?: string; identity?: string }> = [];
    t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      calls.push({ url: String(input), auth: headers.get("authorization") ?? undefined, identity: headers.get("x-identity-header") ?? undefined });
      if (String(input).startsWith("http://127.0.0.1:9999/msi/token")) {
        return Response.json({ access_token: "mi-token", expires_on: expiry });
      }
      return Response.json({ value: [] });
    });

    await dataverseFetchRaw("contacts?$top=1");
    await dataverseFetchRaw("contacts?$top=1");

    const identityCalls = calls.filter((c) => c.url.includes("/msi/token"));
    assert.equal(identityCalls.length, 1, "token is cached between calls");
    assert.match(identityCalls[0].url, /api-version=2019-08-01/);
    assert.equal(identityCalls[0].identity, "header-value");
    const dataverseCalls = calls.filter((c) => !c.url.includes("/msi/token"));
    assert.equal(dataverseCalls.length, 2);
    assert.equal(dataverseCalls[0].auth, "Bearer mi-token");
  });

  it("fails clearly when the platform did not provide an identity endpoint", async () => {
    process.env.DATAVERSE_AUTH_MODE = "managed-identity";
    delete process.env.IDENTITY_ENDPOINT;
    delete process.env.IDENTITY_HEADER;
    resetDataverseTokenCache();
    await assert.rejects(() => dataverseFetchRaw("contacts"), /Managed identity is not available/);
  });
});

describe("gameAppClientIds", () => {
  it("keeps the legacy app and adds the managed identities, de-duplicated", () => {
    const ids = gameAppClientIds({
      DATAVERSE_CLIENT_ID: LEGACY,
      DATAVERSE_APP_USER_CLIENT_IDS: `${GAME_MI}, ${STAFF_MI},${LEGACY.toUpperCase()}`,
    } as unknown as NodeJS.ProcessEnv);
    assert.deepEqual(ids.sort(), [GAME_MI, LEGACY, STAFF_MI].sort());
  });
  it("drops values that are not GUIDs so they cannot reach an OData filter", () => {
    const ids = gameAppClientIds({
      DATAVERSE_CLIENT_ID: "x' or 1 eq 1",
      DATAVERSE_APP_USER_CLIENT_IDS: `${GAME_MI},not-a-guid`,
    } as unknown as NodeJS.ProcessEnv);
    assert.deepEqual(ids, [GAME_MI]);
  });
});
