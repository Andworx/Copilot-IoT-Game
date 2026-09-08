# Restore & Spin — Azure Functions

Backend for mode selection: the Power App control device calls `POST /api/set-mode`, which
writes `andy_gameboxstate` and broadcasts the change over SignalR; the kiosk SPA calls
`GET /api/kiosk-state` once on load and `POST /api/negotiate` to open its SignalR
connection. Full design: `power pages/GAME_MODE_PLAN.md` §4a.

This is a fresh Node.js/TypeScript Function App (v4 programming model) — `GAME_MODE_PLAN.md`
describes an "existing Function App" from a sibling project (`copilot-iot-service`) that
isn't actually built yet, so this lives here instead, in this repo.

## Endpoints

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/negotiate` | POST | anonymous | SignalR connection bootstrap for the kiosk SPA |
| `/api/kiosk-state` | GET | anonymous | Current active device, for a freshly-loaded page |
| `/api/set-mode` | POST | function key | Sets the active device, broadcasts `deviceChanged` |

`set-mode`'s function key is what stands in for "only the Power App can call this" right
now — the Power App's custom connector holds the key. `GAME_MODE_PLAN.md` §4a describes
validating an Entra ID token passed through instead, for real per-user auth; not done yet,
tracked as a hardening step once the basic loop is proven out end to end.

**Known simplification:** `set-mode`'s caller passes `deviceSlug` directly rather than the
Function looking it up from `deviceProfileId` server-side. The Power App already has both
values from its data source, so this avoids an extra Dataverse round-trip, but it does mean
a buggy/malicious caller could send a mismatched slug. Fine behind a function key for now;
revisit if `set-mode` ever gets a less trusted caller.

## Prerequisites

1. **An Azure SignalR Service resource**, in **Serverless** mode (not Default — Serverless
   is what supports Functions-based negotiate/broadcast). Grab its connection string.
2. **An Entra ID app registration** for this Function App to authenticate to Dataverse as
   an application user (client-credentials flow) — create it, generate a client secret, and
   add it as an **Application User** in the Dataverse environment with a security role
   granting at least Create/Read/Write on `andy_gameboxstate` and Read on
   `andy_deviceprofile`.
3. **Node.js 20+** and the **Azure Functions Core Tools v4** (`npm i -g azure-functions-core-tools@4`) for local runs.

## Local setup

```bash
cd azure
npm install
cp local.settings.json.example local.settings.json
# fill in DATAVERSE_URL / DATAVERSE_TENANT_ID / DATAVERSE_CLIENT_ID /
# DATAVERSE_CLIENT_SECRET / AzureSignalRConnectionString in local.settings.json
npm start
```

`local.settings.json` is gitignored — never commit it, matching this project's "secrets via
environment variables only" convention.

Once running, `func start` prints the local base URL and each route. Test `kiosk-state`
with a plain `curl http://localhost:7071/api/kiosk-state`; `set-mode` needs the local
function key `func start` logs at startup, e.g.:

```bash
curl -X POST http://localhost:7071/api/set-mode \
  -H "x-functions-key: <key-from-func-start-output>" \
  -H "Content-Type: application/json" \
  -d '{"deviceProfileId": "<a real andy_deviceprofile GUID>", "deviceSlug": "smart-lock", "deviceName": "Smart Lock"}'
```

## Deploying

```bash
npm run build
func azure functionapp publish <your-function-app-name>
```

Set the same app settings (`DATAVERSE_URL`, `DATAVERSE_TENANT_ID`, `DATAVERSE_CLIENT_ID`,
`DATAVERSE_CLIENT_SECRET`, `AzureSignalRConnectionString`) on the deployed Function App
(Azure Portal → Configuration, or `func azure functionapp publish --publish-local-settings`)
— `local.settings.json` only applies locally.

## Structure

```
azure/
├── host.json                        # Functions host config, SignalR extension bundle
├── package.json / tsconfig.json
├── local.settings.json.example      # copy to local.settings.json, fill in, never commit
└── src/
    ├── index.ts                     # imports every function file so app.http(...) registers
    ├── functions/
    │   ├── negotiate.ts
    │   ├── kioskState.ts
    │   └── setMode.ts
    └── lib/
        └── dataverse.ts             # MSAL client-credentials auth + Web API helpers
```
