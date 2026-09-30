# GitHub Actions deployment

Two workflows release this repo:

- `.github/workflows/deploy-apps.yml` releases `azure/` (the Function App),
  `power apps/game-box-control/`, `power pages/copilotiotgame/` (site name
  `CopilotIoTGame`), and `power pages/prize wheel/` (site name `PrizeWheel`). It
  deploys automatically when a relevant change merges to `main`.
- `.github/workflows/deploy-infra.yml` manages the Azure resources in `infra/` (Event Hub,
  SignalR, and the Function App's access to the hub). Every push to `main` automatically
  compares Bicep with Azure and reports whether deployment approval is needed. Deployment is
  still a separate manual action. The separate staff app template is the owner-authorized
  exception: the application workflow provisions it automatically; see [staff wiring](STAFF_API_WIRING.md).

Other site folders, Dataverse solutions, flows, and the Pi firmware are outside both workflows.

## How the pieces fit

| | Application workflow | Infrastructure workflow |
|---|---|---|
| File | `deploy-apps.yml` | `deploy-infra.yml` |
| Covers | Function App code, Game Box Control, kiosk Code Site, PrizeWheel Code Site | `infra/`: Event Hub, consumer groups, SignalR, Function App Event Hub access |
| When it deploys | automatically on merge to `main` | checks Azure automatically on every push to `main`; `deploy` is a manual approval action allowed from `main` only |
| GitHub environment | `production` | `infra-deploy` (reconciliation preview and deploy) |
| Azure identity | `id-gha-copilot-iot-game-deploy` | `id-gha-infra-reader` and `id-gha-infra-deployer`, least privilege |
| Details | [Application workflow](#application-workflow-flow) and the sections below | [Infrastructure workflow](#infrastructure-workflow-deploy-infrayml) |

Not deployed by CI: the IoT Hub and DPS (recorded and drift-checked only, and the infra
identity cannot write to them), Dataverse solutions and Power Platform components (PAC), the
Copilot Studio agent, and the panel Pi firmware (`hardware/raspberry-pi/deploy.ps1`, copied over
SSH and restarted by hand).

Everything targets one Azure tenant, subscription, and resource group
(`rg-aw-azcom-iot-copilot`) and one Power Platform environment. The GitHub environments are
credential and branch gates, not separate deployment targets.

## Application workflow: flow

1. Work on a feature branch and open a PR to `main`. Every PR runs `Build apps`:
   Node 22, `npm ci`, and TypeScript/production builds for the Function App, the
   Game Box Control Code App, the kiosk Power Pages Code Site, and the PrizeWheel Code Site. No cloud credentials
   are available to the build job, and PRs never deploy.
2. Merge the PR. Pushes to `main` touching any deployed app or the workflow build
   all apps and retain deployment artifacts for 14 days. Documentation-only
   pushes do not deploy.
3. `Deploy production apps` uses the `production` environment, checks required
   settings, authenticates, previews/provisions and deploys the staff Function App. With `STAFF_API_CUTOVER_READY=true`, it then deploys the public Function App, rebuilds and pushes the
   Game Box Control Code App with its OAuth connector binding, then
   uploads both Code Sites. With the flag unset/false, only the staff backend is released; existing app releases are held while connector setup finishes. The Function ZIP contains only host/package metadata,
   compiled code, and production dependencies.
4. Validate the live kiosk and backend, then update related plan items from Verify
   to Done. A successful upload alone does not prove the application works.

Deployments are serialized and running deployments are not cancelled by a new
push. GitHub may replace an older pending run with a newer one. This is not an
atomic release: if the site upload fails, the backend may already be updated.
Keep backend changes compatible with the previous frontend during rollout.

## Application workflow: one-time configuration

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
| `POWER_PAGES_WEBSITE_ID` | Optional; defaults to the live `CopilotIoTGame` Code Site ID |
| `POWER_PRIZE_WHEEL_WEBSITE_ID` | Optional; defaults to the live `PrizeWheel` Code Site ID |
| `SOLUTION_DIAGRAM_URL` | Optional; defaults to `https://copilotiotgame.powerappsportals.com/kiosk/solution` for the PrizeWheel "Explore this solution" button |

Create the `POWER_PLATFORM_CLIENT_SECRET` **environment secret** in `production`.
Use a dedicated deployment application registered as a Dataverse application
user with permissions to upload the site and push the Code App; the backend's
runtime identity, which only accesses game tables, is not sufficient. Rotate
this secret when needed.

The Code App uses a per-user OAuth custom connector; no Function keys are injected into its build. Staff resource names and Entra IDs come from `infra/staff-api.prod.json`. An IAM administrator must first run the reviewed [deployment access bootstrap](STAFF_API_WIRING.md#deployment-access); the existing deployment identity cannot provision these resources yet. Leave repository variable `STAFF_API_CUTOVER_READY` unset/false for the staff-only bootstrap release. Complete [STAFF_API_SETUP.md](STAFF_API_SETUP.md), commit the actual connector binding, then set the flag true for coordinated cutover. The workflow requires an unauthenticated staff request to return 401 before advancing. Remove legacy CODE_APP_*_FUNCTION_KEY secrets and rotate previously exposed keys after acceptance.

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
Power Pages keeps its existing `VITE_API_BASE_URL`. The Code App uses the connector, with no direct Azure URL or client-bundled credentials.

The Power Platform environment must have the intended Game Box Control Code App
initialized with `power.config.json`; the workflow runs `pac code push
--environment "$POWER_PLATFORM_ENVIRONMENT_URL" --solutionName
"$POWER_PLATFORM_SOLUTION_NAME"` from `power apps/game-box-control`. The same
environment must support Code Sites, allow JavaScript attachments, and have the
intended Power Pages sites. The install action provides PAC; Code Sites require
PAC 1.44 or later. For the first Code Site upload, activate the resulting
inactive site in Power Pages and configure table permissions in its admin UI.
Subsequent uploads update the active site. Verify `powerpages.config.json` before
a release; changing its site name can target a different site.

**Which Power Pages site gets updated.** `pac pages upload-code-site` has no
website-ID parameter. It finds the site to update from the `.powerpages-site/`
folder (site metadata plus the per-environment manifest of RecordId + checksum
per record) sitting next to the compiled code, and creates a brand-new website
when that folder does not match a site in the environment. A checked-in copy
cannot be trusted for this: every upload rewrote the copy's IDs, so each deploy
created another "CopilotIoTGame" website and the live one (bound to
`copilotiotgame.powerappsportals.com`) was never updated, while every run still
reported success.

The deploy job therefore pins each live site by ID (`POWER_PAGES_WEBSITE_ID`,
a repository variable that defaults to `4938f099-b8dd-485f-a5c2-3c4ad4b7e02a`,
and `POWER_PRIZE_WHEEL_WEBSITE_ID`, which defaults to
`5dadde98-1e91-4a34-8182-1b0a87466e58`)
and, before uploading, runs `pac pages download-code-site --webSiteId` to fetch
each site's real `.powerpages-site/` into its artifact. The download fails the
deploy if a site cannot be fetched, and a post-upload step fails it if the
uploaded website ID is not the pinned one, so a wrong target is loud instead of
silent. Nothing is committed back to `main`.

**How `.powerpages-site/` is meant to be used.** It is generated state owned by
the live site (record IDs, checksums, the site's pages, templates, settings and
web files), not source code, so it is deliberately **not tracked in git** and is
listed in `power pages/copilotiotgame/.gitignore`. It used to be committed; every
upload rewrote its IDs and the committed copy drifted away from the live site,
which is what caused the duplicate-website incident. Rules:

- CI never needs it in the repo: the deploy job downloads it from the live site
  on every run and discards it afterwards.
- Locally you only need it for an explicit manual recovery upload. Get it with
  `pac pages download-code-site --webSiteId <live id>` (steps in
  `PAC_COMMANDS.md`), upload immediately, and leave it uncommitted.
- Never hand-edit it, copy it between environments, or reuse an old download:
  stale IDs make `pac` create a new website instead of updating the live one.
- If a copy is lying around and you are unsure about it, delete it. It is always
  recoverable from the live site.

**Browser console CSP messages.** The portal sends its own
`Content-Security-Policy` header (`script-src 'self' content.powerapps.com ...
'nonce-...' 'inject-hashes'`), and the browser console reports blocked inline
scripts at `(index):30`, `:53` and `:59`. Those scripts are generated by Power
Pages (the "This site is private" banner and page wrapper); their hashes change
between loads, and the repo's build output contains only external module
scripts, so there is nothing to externalize or whitelist. The site works
normally with these messages present. If a page shows the platform "Something
went wrong" error instead, check the deploy first (the run's "Verify Power Pages
upload targeted the live site" step), then restart the site and test in a
private window: a stale browser cache can keep showing the error after the site
has recovered (issue #48).

If the live site is ever recreated, look up its new ID with `pac pages list`
(the one whose `primarydomainname` is the portal's domain) and set the
`POWER_PAGES_WEBSITE_ID` repository variable. Duplicate "CopilotIoTGame"
websites in the environment are always mistakes and can be deleted, but check
the domain first: only one is bound to the portal URL.

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

## Infrastructure workflow (`deploy-infra.yml`)

`.github/workflows/deploy-infra.yml` manages the Azure resources this repo owns, defined in
[`infra/`](../infra/README.md): the Event Hub namespace, the `iot-telemetry` hub and its
consumer groups, the SignalR service, and the game Function App's read access to the hub. It
is separate from `deploy-apps.yml` on purpose: infrastructure changes can stop telemetry for
every device, so each relevant merge is compared with Azure and applied only after a separate
manual approval.

Everything else in the resource group (IoT Hub, DPS, both Function Apps, plans, storage,
App Insights) is currently **recorded but never deployed**. Its snapshots are checked as a
post-deployment safety guard. The deploy identity has no write access to it. These resources will
move into Bicep one at a time as their deployment behavior is validated; see
[`infra/README.md`](../infra/README.md).

### What triggers what

| Trigger | Jobs that run | Azure access |
|---|---|---|
| PR touching `infra/**` or the workflow | `validate`: compile and lint the Bicep, confirm every reference snapshot exists | none |
| Every push to `main` | `validate`, then `reconcile`: compare Bicep with Azure and fail with a change summary when approval/deployment is needed | `infra-deploy`; read-only operation |
| Manual, `action = what-if` | Run the same reconciliation check on demand; changes nothing | `infra-deploy` (deployer identity, `main` only) |
| Manual, `action = deploy`, from `main` only | `validate`, then `deploy`: assign the game Function App a managed identity, deploy `main.bicep` (incremental), merge the telemetry settings, re-check snapshots | `infra-deploy` (`main` only) |

This shared-infrastructure workflow never deploys automatically. The staff-only template is
released separately by deploy-apps.yml. Merging an infrastructure change checks Azure and
notifies repository watchers through the failed reconciliation check when Azure differs. Review
the job summary and run `deploy` to approve it. After deployment, rerun the failed reconciliation
job or dispatch `what-if`; it passes when Azure matches Bicep.

Deployments use ARM incremental mode. Resources absent from the template are retained, and Azure
reconciles declared resources to their desired properties. ARM can still issue a PUT for a declared
resource even when most properties are unchanged, so each resource must be captured and validated
individually before expanding the template. The known read-only Event Hub
`privateEndpointConnections` what-if difference is filtered from the approval signal.

### GitHub environments, Azure identities, and permissions

The two environments below are **GitHub Actions environments**, not Azure or Power Platform
environments: everything still targets the one tenant, one subscription, and one resource group
(`rg-aw-azcom-iot-copilot`). They exist so each kind of job gets its own credential and its own
branch rule. The existing `production` environment and its identity
(`id-gha-copilot-iot-game-deploy`) are for the app workflow and are unchanged.

| GitHub environment | Azure identity | What that identity can do | Protection |
|---|---|---|---|
| `infra-readonly` | `id-gha-infra-reader` | Reader on the resource group and nothing else. Retained for reference inspection while resources are migrated from snapshots into Bicep. | no active workflow job |
| `infra-deploy` | `id-gha-infra-deployer` | Runs reconciliation previews and approved deploys. `Infra Deployment Operator` (deployments only) and Reader on the resource group; Contributor on the Event Hub namespace, SignalR service, `func-aw-azcom-iot-game`, and `iot-demo-vnet` only; assign only the *Azure Event Hubs Data Receiver* role, only on the `iot-telemetry` hub (ABAC-restricted) | deployment branches limited to `main`; no required reviewer (not available on the Free plan) |

The `infra-deploy` environment has **no required reviewer**: the org is on GitHub's Free plan, which
does not offer that rule for private repositories. What gates a deploy instead: it is a manual action
(nothing deploys on merge), the environment only accepts `main` (so the Azure login is unavailable to any
other branch), `main` itself is protected by PR review, and the deploy identity can only change the
Event Hub, SignalR, the game Function App and the demo VNet. `what-if` shows exactly what a deploy would do. If the org
later moves to a plan with required reviewers, add one to `infra-deploy`; no workflow change is needed.

Each identity's GitHub credential is bound to its environment name, so a job can only log in as
the identity that matches its environment. The deploy job can never modify the IoT Hub, DPS,
the legacy Function App, or storage, because the identity has no permission to.

### One-time setup

1. **Azure identities and roles.** Someone with Owner or User Access Administrator on the
   resource group runs `infra/scripts/Initialize-InfraIdentities.ps1`. Try `-PreflightOnly` first
   (it confirms the permission and changes nothing) or `-WhatIf`. The script is safe to re-run.
   Contributor is not enough: it can create the identities but not the roles.
2. **GitHub environments** (Settings > Environments):
   - `infra-readonly`: no protection rules.
   - `infra-deploy`: **Deployment branches: selected branches, `main`**. Add **Required
     reviewers** too if the plan allows it. Create it with these rules *before* the first run,
     because GitHub creates a missing environment on first use with no protection at all.
3. **Repository variables** (Settings > Secrets and variables > Actions > **Variables**, not
   Secrets: they are client IDs, not secrets, and the workflow reads `vars.*`):

   | Variable | Value |
   |---|---|
   | `AZURE_INFRA_READER_CLIENT_ID` | client ID of `id-gha-infra-reader` |
   | `AZURE_INFRA_DEPLOYER_CLIENT_ID` | client ID of `id-gha-infra-deployer` |
   | `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | already set for the app workflow; shared |

   The infra workflow uses no secrets. Get the client IDs with
   `az identity show -g rg-aw-azcom-iot-copilot -n <identity> --query clientId -o tsv`.
4. **Workflow on `main`.** `workflow_dispatch` only works for a workflow file on the default
   branch, so merge the PR that adds it before running any of the manual actions.

### Running it

```powershell
gh workflow run deploy-infra.yml --ref main -f action=what-if   # preview, read-only
gh workflow run deploy-infra.yml --ref main -f action=deploy    # main only
gh run list --workflow deploy-infra.yml --limit 5
gh run watch <run-id> --exit-status
```

Or use Actions > Infrastructure > Run workflow. Read-only checks also work locally with the Azure
CLI and PowerShell 7 (`pwsh`): `az deployment group what-if ...` and
`./infra/scripts/Invoke-ReferenceSnapshot.ps1 -Mode Check` (commands in `infra/README.md`).

Always run `what-if` and read it before `deploy`. For the Event Hub lockdown,
expect the namespace and its default network rule set to change to private-only:
public access Disabled and trusted Microsoft services enabled. Azure normalizes
the default action to Allow while the public endpoint is disabled; this does not
permit public traffic.
The trusted exception is required for the identity-based IoT Hub route. After
deployment, the workflow checks the private endpoint, Function VNet integration,
route authentication, and sender/receiver roles. Live Pi-to-kiosk telemetry still
requires owner validation.

### Release order

App changes that depend on new infrastructure need the infrastructure first, because merging to
`main` deploys the apps automatically. The telemetry function needs the `gamefunc` consumer
group, the Function App's managed identity, and its Event Hub role before it can read anything.

```mermaid
flowchart TB
  PR[Pull request] -->|"Build apps + Validate Bicep, no cloud credentials"| Merge[Merge to main]
  Merge -->|"app code changed: automatic"| Apps["Deploy production apps (deploy-apps.yml)"]
  Merge -->|"infra changed: automatic comparison"| WI[reconcile: review the preview]
  WI -->|"difference found"| Manual[Approve by running Infrastructure deploy]
  Manual --> Deploy["deploy: main only"]
  Deploy -.->|"must finish first when the app needs it"| Apps
```

For the telemetry pipeline, in order:

1. Merge the infra PR (this adds the workflow to `main`).
2. Review the automatic reconciliation summary, then run `deploy`. Dispatch `what-if`
   afterward to confirm Azure matches Bicep.
3. Merge the application PR; `deploy-apps.yml` ships the telemetry function.
4. Restart the panel Pi service, then verify the live path (Pi to kiosk).
5. Keep the plan items at Verify until step 4 passes.

### Settings: what CI sets and what stays manual

`deploy` merges these into the game Function App. It only adds or updates these names and
leaves every other setting alone.

| Setting | Set by | Notes |
|---|---|---|
| `IoTHubEventHubConnectionString__fullyQualifiedNamespace` | infra `deploy` | identity-based Event Hub access, so no key is stored |
| `IOT_EVENTHUB_NAME`, `IOT_EVENTHUB_CONSUMER_GROUP` | infra `deploy` | `iot-telemetry`, and `gamefunc`, a group used by this app only |
| `DATAVERSE_*`, `AzureSignalRConnectionString` | by hand, already set | secrets are never written by CI |
| `DIRECTLINE_SECRET` | by hand, when the Copilot Studio agent is ready | until set, `/api/directline-token` returns 503 and the kiosk shows the standard steps |

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| `AADSTS700213` / no matching federated identity | The job's environment name does not match the identity's credential (`infra-readonly` / `infra-deploy`), or the environment does not exist |
| `AuthorizationFailed` on `what-if` or `deploy` | The identity's role assignment is missing; re-run `Initialize-InfraIdentities.ps1` |
| `Authorization failed for template resource ... /write` on reconciliation | The check was run as a read-only identity. ARM checks that the caller could write every resource in the template, even though what-if changes nothing, so reconciliation runs as the deployer identity |
| Reconciliation fails after a merge | Azure differs from `infra/`. Review the listed Create/Modify/Delete operations and run the manual `deploy` action if they are intended |
| `deploy` job does not start | Not run from `main` (the environment only accepts `main`) |
| Telemetry function does not start after `deploy` | Role assignments can take a few minutes to take effect; check the Function App's log stream, and confirm the three settings above exist |
| Retired `func-aw-iot-copilot` still runs | It is no longer an Event Hub dependency. Retire its dedicated app/plan/storage/monitoring resources separately after the game telemetry validation window. |

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

Infrastructure follows the same rule (see [Infrastructure workflow](#infrastructure-workflow-deploy-infrayml)):

```powershell
gh workflow run deploy-infra.yml --ref main -f action=what-if   # read-only preview
gh workflow run deploy-infra.yml --ref main -f action=deploy    # only when explicitly asked
```

Run `what-if` and show its output before `deploy`, and never run `deploy` unprompted. Do not
run `Initialize-InfraIdentities.ps1`, `az deployment group create`, or
`Set-FunctionAppSettings.ps1` locally; the read-only checks (`what-if`, `Invoke-ReferenceSnapshot.ps1
-Mode Check`) are fine. Never change the IoT Hub or DPS from this repo.

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

### Network baseline preview

Use Infrastructure > Run workflow > main > `network-what-if` for the captured
[network baseline](../infra/network/README.md). PRs compile it without credentials.
The main-only preview uses the existing infra-deploy identity with ProviderNoRbac;
it does not require network write grants and does not apply resources. This action
is separate from the existing service what-if/deploy; no network apply action or
public-access lockdown is introduced at this stage.
