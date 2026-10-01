import { test } from "node:test";
import assert from "node:assert/strict";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { createStaffGuard, readStaffAuthConfig } from "../src/lib/staffAuth";
import { apiSurface, routeEnabled } from "../src/lib/apiSurface";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

test("staff API verifies signed delegated tokens before any business side effects", async () => {
  const config = {
    tenantId: "11111111-1111-4111-8111-111111111111",
    audience: "22222222-2222-4222-8222-222222222222",
    clientId: "33333333-3333-4333-8333-333333333333",
  };
  const pair = await generateKeyPair("RS256");
  const jwk = { ...await exportJWK(pair.publicKey), kid: "test" };
  const guard = createStaffGuard(config, createLocalJWKSet({ keys: [jwk] }));
  let effects = 0;
  const handler = guard(async () => { effects++; return { status: 200, jsonBody: { ok: true } }; });
  async function token(overrides: Record<string, unknown> = {}, signingKey = pair.privateKey) {
    return new SignJWT({
      tid: config.tenantId, ver: "2.0", oid: "operator", azp: config.clientId,
      scp: "Staff.Access", roles: ["Game.Operator"],
      iss: `https://login.microsoftonline.com/${config.tenantId}/v2.0`,
      aud: config.audience, sub: "operator", iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300, ...overrides,
    }).setProtectedHeader({ alg: "RS256", kid: "test" }).sign(signingKey);
  }
  async function call(bearer?: string, extra: Record<string, string> = {}) {
    return handler(new HttpRequest({
      url: "https://staff.example/api/set-mode", method: "POST",
      headers: { ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...extra },
    }), new InvocationContext());
  }
  assert.equal((await call()).status, 401);
  assert.equal((await call(undefined, { "x-functions-key": "legacy", "x-ms-client-principal": "forged" })).status, 401);
  assert.equal((await call("invalid")).status, 401);
  for (const claims of [
    { exp: 1 }, { aud: "another-api" }, { iss: "https://attacker.example" },
    { tid: "another-tenant" }, { ver: "1.0" }, { nbf: Math.floor(Date.now() / 1000) + 300 },
  ]) assert.equal((await call(await token(claims))).status, 401);
  for (const claims of [{ roles: [] }, { scp: "Other.Access" }, { azp: "other-client" }, { scp: undefined }]) {
    assert.equal((await call(await token(claims))).status, 403);
  }
  const otherPair = await generateKeyPair("RS256");
  assert.equal((await call(await token({}, otherPair.privateKey))).status, 401);
  assert.equal(effects, 0);
  assert.equal((await call(await token())).status, 200);
  assert.equal(effects, 1);
});

test("configuration and route boundaries fail closed", () => {
  assert.throws(() => readStaffAuthConfig({}));
  assert.throws(() => apiSurface("typo"));
  assert.throws(() => routeEnabled("unreviewed-operation", "public"));
  for (const name of ["set-mode", "toggle-device", "set-game-mode", "bulk-create-prizes",
    "prize-types", "prize-count", "grand-prize-check-in", "grand-prize-draw",
    "grand-prize-drawing-state", "grand-prize-drawing-slices"]) {
    assert.equal(routeEnabled(name, "public"), false, name);
    assert.equal(routeEnabled(name, "staff"), true, name);
  }
  for (const name of ["prizes", "negotiate", "pick-random-mode", "directline-token"]) {
    assert.equal(routeEnabled(name, "public"), true, name);
    assert.equal(routeEnabled(name, "staff"), false, name);
  }
  for (const name of ["claim-prize", "create-win", "kiosk-state", "device-profiles"]) {
    assert.equal(routeEnabled(name, "public"), true, name);
    assert.equal(routeEnabled(name, "staff"), true, name);
  }
});

test("actual Function registrations separate staff routes and never duplicate telemetry", () => {
  const script = `
    const { app, HttpRequest, InvocationContext } = require('@azure/functions');
    const routes = [];
    const checks = [];
    app.http = (name, options) => {
      const route = {name, auth: options.authLevel};
      routes.push(route);
      if (process.env.API_SURFACE === 'staff') checks.push(
        Promise.resolve(options.handler(new HttpRequest({url:'https://staff.example/api/' + name, method: options.methods[0]}), new InvocationContext()))
          .then(response => route.deniedStatus = response.status)
      );
    };
    app.eventHub = name => routes.push({name, trigger: 'eventHub'});
    require('./dist/src/index.js');
    Promise.all(checks).then(() => process.stdout.write(JSON.stringify(routes)));
  `;
  for (const surface of ["staff", "public"]) {
    const result = spawnSync(process.execPath, ["-e", script], {
      cwd: join(__dirname, "../.."), env: {
        ...process.env, API_SURFACE: surface,
        STAFF_AUTH_TENANT_ID: "11111111-1111-4111-8111-111111111111",
        STAFF_AUTH_AUDIENCE: "22222222-2222-4222-8222-222222222222",
        STAFF_AUTH_CLIENT_ID: "33333333-3333-4333-8333-333333333333",
      }, encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const routes = JSON.parse(result.stdout) as { name: string; auth?: string; trigger?: string; deniedStatus?: number }[];
    assert.equal(routes.some(route => route.name === "iot-telemetry"), surface === "public");
    assert.equal(routes.some(route => route.name === "set-mode"), surface === "staff");
    assert.equal(routes.some(route => route.name === "grand-prize-drawing-slices"), surface === "staff");
    assert.equal(routes.some(route => route.name === "prizes"), surface === "public");
    assert.ok(routes.some(route => route.name === "claim-prize"));
    for (const route of routes.filter(route => route.auth)) {
      assert.equal(route.auth, "anonymous", `${surface}/${route.name} relies on the explicit boundary`);
      if (surface === "staff") assert.equal(route.deniedStatus, 401, route.name);
    }
  }
});
