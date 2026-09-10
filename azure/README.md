# Restore & Spin — Azure Functions

Backend for mode selection: the Power App control device calls `POST /api/set-mode`, which
writes `andy_gameboxstate` and broadcasts the change over SignalR; the kiosk SPA calls
`GET /api/kiosk-state` once on load and `POST /api/negotiate` to open its SignalR
connection. Full design: `power pages/docs/GAME_MODE_PLAN.md` §4a.

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
3. **Node.js 22** and the **Azure Functions Core Tools v4** (`npm i -g azure-functions-core-tools@4`) for local runs. Node 20 is refused at creation (EOL 2026-04-30); **Node 24 was tried first and didn't work** — the deployed app got stuck with "Runtime version: Error" in the portal and 503'd on every route, including Kudu itself, even after a restart. Node 22 (LTS) fixed it immediately. Worth retrying Node 24 in the future once it's had more time to bake on Linux Consumption specifically.

### Deployed resources (2026-09-08)

All in resource group `rg-aw-azcom-copilot-iot-game` (subscription "Microsoft Azure
Sponsorship", `eastus2`):

| Resource | Name |
|---|---|
| Function App | `func-aw-azcom-copilot-iot-game` (`func-aw-azcom-copilot-iot-game.azurewebsites.net`) |
| Storage account | `stawazcomiotgame` |
| SignalR Service | `sigr-aw-azcom-copilot-iot-game` (Free_F1 — fine for dev; upgrade to Standard_S1 before the real booth event, Free tier caps concurrent connections/daily messages) |
| Entra app registration | `restore-and-spin-function`, App ID `8eb31f00-6f72-4663-8de9-e5290d2a2aa7`, tenant `7cea0515-a5e4-4e8a-8f2a-6d1ad5d6b9f8` — added as a Dataverse Application User (client secret was generated and set directly as the Function App's `DATAVERSE_CLIENT_SECRET` setting, not committed anywhere) |

All 5 app settings (`DATAVERSE_URL`, `DATAVERSE_TENANT_ID`, `DATAVERSE_CLIENT_ID`,
`DATAVERSE_CLIENT_SECRET`, `AzureSignalRConnectionString`) are set on the live Function App
via `az functionapp config appsettings set`. Runtime is `Node|22` — see the Node version
note under Prerequisites before ever trying Node 24 again.

**CORS:** `az functionapp cors add --allowed-origins <origin>` per origin that needs to call
these endpoints from a browser (no wildcard). `http://localhost:5173` (the
`restore-and-spin` dev server) is allowed today; add the real production URL once that site
is deployed.

**Confirmed working end to end (2026-09-08):** `GET /api/kiosk-state` returns real
Dataverse data, and a live browser tab running `restore-and-spin` navigated automatically
in response to an external `POST /api/set-mode` call, via the SignalR broadcast — no
reload, no polling. See `power pages/restore-and-spin/README.md`.

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

## GitHub Actions releases

Use [the CI/CD workflow](../docs/CI_CD.md) for routine Function App and
`restore-and-spin` releases: PR build checks, then automatic deployment after
relevant changes merge to `main`. Workflow: `.github/workflows/deploy-apps.yml`.
Local publishing commands are for explicitly requested recovery/bootstrap work.
Other Power Platform components retain their existing PAC workflows.

## Deploying

```bash
npm run build
func azure functionapp publish func-aw-azcom-copilot-iot-game --typescript
```

`--typescript` matters — without it, `func` can't determine the project language from a
TS-only source tree and refuses to publish.

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
