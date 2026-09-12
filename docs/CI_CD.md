# GitHub Actions deployment

`.github/workflows/deploy-apps.yml` is the release workflow for `azure/`,
`power apps/game-box-control/`, and `power pages/copilotiotgame/` (site name
`CopilotIoTGame`). Other site folders, Dataverse solutions, flows, hardware, and
infrastructure are outside this workflow.

## Flow

1. Work on a feature branch and open a PR to `main`. Every PR runs `Build apps`:
   Node 22, `npm ci`, and TypeScript/production builds for the Function App, the
   Game Box Control Code App, and the Power Pages Code Site. No cloud credentials
   are available to the build job, and PRs never deploy.
2. Merge the PR. Pushes to `main` touching any deployed app or the workflow build
   all apps and retain deployment artifacts for 14 days. Documentation-only
   pushes do not deploy.
3. `Deploy production apps` uses the `production` environment, checks required
   settings, authenticates, deploys the Function App, rebuilds and pushes the
   Game Box Control Code App with protected production function-key secrets, then
   uploads the Code Site. The Function ZIP contains only host/package metadata,
   compiled code, and production dependencies.
4. Validate the live kiosk and backend, then update related plan items from Verify
   to Done. A successful upload alone does not prove the application works.

Deployments are serialized and running deployments are not cancelled by a new
push. GitHub may replace an older pending run with a newer one. This is not an
atomic release: if the site upload fails, the backend may already be updated.
Keep backend changes compatible with the previous frontend during rollout.

## One-time configuration

Create a GitHub environment named `production`. Restrict deployment branches to
`main`; add required reviewers if your release policy requires them. Protect
`main` with PR reviews and the `Build apps` status check.

Set these **repository Actions variables** (Settings > Secrets and variables >
Actions > Variables). Keep `AZURE_FUNCTIONAPP_NAME` repository-scoped so the build
and deploy jobs use the same API host; do not override it at environment scope.

| Variable | Value/purpose |
|---|---|
| `AZURE_FUNCTIONAPP_NAME` | `func-aw-azcom-iot-game` for the consolidated IoT resource group deployment |
| `AZURE_CLIENT_ID` | Deployment identity/application client ID |
| `AZURE_TENANT_ID` | Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Subscription containing the Function App |
| `POWER_PLATFORM_ENVIRONMENT_URL` | Target Dataverse HTTPS URL, not the public website URL |
| `POWER_PLATFORM_TENANT_ID` | Target Power Platform tenant ID |
| `POWER_PLATFORM_CLIENT_ID` | Power Platform deployment application ID |
| `POWER_PLATFORM_SOLUTION_NAME` | Optional; defaults to `CopilotIoTGame` and is passed to `pac code push --solutionName` |

Create the `POWER_PLATFORM_CLIENT_SECRET` **environment secret** in `production`.
Use a dedicated deployment application registered as a Dataverse application
user with permissions to upload the site and push the Code App; the backend's
runtime identity, which only accesses game tables, is not sufficient. Rotate
this secret when needed.

Create these additional `production` **environment secrets** for the deployed
Game Box Control bundle. They are Vite inputs and are intentionally client-side
stopgap values until the Function App validates Entra ID tokens directly:

| Secret | Purpose |
|---|---|
| `CODE_APP_SET_MODE_FUNCTION_KEY` | Function key for `POST /api/set-mode` |
| `CODE_APP_TOGGLE_DEVICE_FUNCTION_KEY` | Function key for `POST /api/toggle-device` |
| `CODE_APP_SET_GAME_MODE_FUNCTION_KEY` | Function key for `POST /api/set-game-mode` |
| `CODE_APP_BULK_CREATE_PRIZES_FUNCTION_KEY` | Function key for `POST /api/bulk-create-prizes` |

The workflow authenticates PAC with `--url` instead of `--environment` for the
service-principal profile. `--environment` causes PAC to query the Business
Application Platform admin environment endpoint during auth, which requires
broader Power Platform admin-management permissions than the Dataverse
Application User role needed for code-site upload.

PAC still requires the deployment app to be registered as a Power Platform admin
management application before service-principal auth can complete in GitHub
Actions. A tenant admin with `ManageAdminApplications` permission must run:

```powershell
pac admin application register --application-id 6bf6a3f1-39d1-4b99-99e7-8460dd1a7d3d
```

Configure Azure OIDC federation for the Azure deployment identity:

- Issuer: `https://token.actions.githubusercontent.com`
- Subject: `repo:Andworx@226577816/Copilot-IoT-Game@1350685991:environment:production`
- Audience: `api://AzureADTokenExchange`
- Assign Website Contributor scoped to the consolidated Function App (or a tested
  equivalent deployment role). No Azure publish-profile secret is used.

The Function App must already exist with the Node 22 runtime. Current target:
`func-aw-azcom-iot-game` in `rg-aw-azcom-iot-copilot`, hosted on Flex
Consumption with dedicated storage account `stawazcomiotgamefn` and shared
Serverless SignalR resource `signalr-aw-iot-copilot`. Preserve its runtime
Dataverse/SignalR settings and storage configuration. This workflow does not
provision resources or publish `local.settings.json`. The deploy job uses the
prebuilt zip package with `sku: flexconsumption` and `remote-build: false`; do
not add the legacy `SCM_DO_BUILD_DURING_DEPLOYMENT` app setting to the Flex
Consumption app. Configure CORS for the public Power Pages and Code App origins.
The frontends' `VITE_API_BASE_URL` is derived from the Function App name at
build time and is not secret. The Code App function-key values are stored as
GitHub environment secrets only to keep them out of source control; they still
become client-visible after the Vite build and remain a temporary stopgap.

The Power Platform environment must have the intended Game Box Control Code App
initialized with `power.config.json`; the workflow runs `pac code push
--environment "$POWER_PLATFORM_ENVIRONMENT_URL" --solutionName
"$POWER_PLATFORM_SOLUTION_NAME"` from `power apps/game-box-control`. The same
environment must support Code Sites, allow JavaScript attachments, and have the
intended Power Pages site. The install action provides PAC; Code Sites require
PAC 1.44 or later. For the first Code Site upload, activate the resulting
inactive site in Power Pages and configure table permissions in its admin UI.
Subsequent uploads update the active site. Verify `powerpages.config.json` before
a release; changing its site name can target a different site.

Code Apps also enforce the target environment's Content Security Policy. When a
frontend calls the Function App directly, add the production Function App origin
to the environment's Code App `connect-src` allowlist in the Power Platform
admin center:

```text
https://func-aw-azcom-iot-game.azurewebsites.net
```

This is separate from the GitHub Actions `AZURE_FUNCTIONAPP_NAME` variable and
cannot be configured by `pac code push`. If the allowlist still contains only
the retired `func-aw-azcom-copilot-iot-game.azurewebsites.net` origin, the
browser blocks requests before they reach Azure Functions, even though the
Function App and its CORS settings are healthy. After changing the policy,
reload the Code App and verify `/api/prize-types`, `/api/device-profiles`, and
`/api/kiosk-state` in the browser network panel.

## Copilot, Claude, and Codex procedure

All three assistants use the same workflow, not separate deployment mechanisms.
Read this document, run the local builds, submit a PR, and inspect the Actions
result for the merged commit. Do not use local cloud publishing as the default.

```powershell
npm --prefix azure ci
npm --prefix azure run build
npm --prefix "power apps/game-box-control" ci
npm --prefix "power apps/game-box-control" run build
npm --prefix "power pages/copilotiotgame" ci
npm --prefix "power pages/copilotiotgame" run build

# Redeploy current main when requested (also available via Actions > Run workflow).
gh workflow run deploy-apps.yml --ref main
gh run list --workflow deploy-apps.yml --limit 5
gh run watch <run-id> --exit-status
gh run view <run-id> --log-failed
```

Manual dispatch on any other branch builds only; deployment is restricted to main.
The workflow must first be merged to the default branch to appear for dispatch.
Report the run URL, commit SHA, and live verification result. If settings or
permissions are missing, identify them without printing credentials.

Check `GET /api/kiosk-state`, load `/kiosk/info` and a kiosk device route, and
validate mode changes/SignalR through the authorized control app. Check the
browser for API/CORS failures. These live checks are manual; the workflow builds
and uploads but does not change game state for a smoke test.

For a failed upload or push, fix the reported configuration/permission issue and
rerun the failed job from the same run while artifacts remain available. To roll
back code, revert the problematic change through a PR and merge it so all apps
redeploy. Do not dispatch an old branch expecting a rollback. Local publishing
commands in component docs are reserved for explicitly requested
recovery/bootstrap work.

## Action references

- [Azure Functions action](https://github.com/Azure/functions-action): Function ZIP deployment.
- [Azure OIDC configuration](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure): federation setup.
- [Power Platform install action](https://github.com/microsoft/powerplatform-actions/tree/main/actions-install): PAC installation.
- [Power Pages Code Sites](https://learn.microsoft.com/en-us/power-pages/configure/create-code-sites): Code Site upload and activation.
- [Power Apps Code Apps](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/): Code App build and `pac code push` workflow.

Do not substitute classic `upload-paportal` / `pac pages upload` actions or GitHub
Pages actions: this repository deploys a Power Pages Code Site and a Power Apps
Code App.
