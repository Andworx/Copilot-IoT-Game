# Infrastructure as code

Azure resources for the Restore & Spin pipeline live in one resource group,
`rg-aw-azcom-iot-copilot`. This folder makes the part this repo owns reproducible and puts
the rest under drift detection, without ever letting CI touch the IoT Hub.

```
panel Pi â”€â–º IoT Hub â”€â–º route â”€â–º Event Hub â”€â–º game Function App â”€â–º SignalR â”€â–º kiosk page
 (device)   iothub-â€¦            evhns-â€¦/       func-aw-azcom-       signalr-â€¦
                                iot-telemetry  iot-game
```

## Destination VPN bootstrap

Issue #259 adds `vpn-bootstrap.bicep` and the manual-only
`bootstrap-destination-vpn.yml` workflow for the first migration stage in subscription
`9e8c862e-9bba-4363-a21b-c45cabe8b637`. It creates only the destination VNet with four
subnets, Standard zone-redundant public IP and VpnGw1AZ gateway. It reuses the reviewed
modules and selected non-secret values from `network/baseline.json`; source resource
IDs are never included in the compiled template.

New VpnGw1AZ creation uses the documented Generation1 pairing. The source gateway
reports Generation2 and is not changed. OpenVPN, certificate authentication, public
root certificate, BGP and the address plan are preserved. Client private keys remain
on the router and outside git.

An IAM administrator must first create `rg-aw-azcom-iot-copilot` in `eastus` in the
destination and grant the existing `id-gha-infra-deployer` identity Contributor on that
group only. No existing GitHub deployment variable is retargeted. Run `preview` from
`main`, inspect the result, then run `deploy` with confirmation
`CREATE BILLABLE DESTINATION VPN` to acknowledge additional gateway charges.

The workflow rejects modifications/deletions of existing destination network resources
and any resource outside the exact bootstrap allowlist. It verifies gateway provisioning
and reports the new public IP, SHA and run URL. The router stays on the source VPN until
a real destination connection passes; identical-address source and destination VPNs
must not be connected concurrently. DNS resolver, private DNS, private endpoints,
workloads, source cleanup and future release retargeting are separate stages.

See [the destination bootstrap runbook](../../docs/CI_CD.md#destination-vpn-bootstrap).

## Remaining subscription migration

Issue #261 added `dns-bootstrap.bicep` and the manual migration workflow. That workflow
was retired on 2026-10-08 after the source resource group was deleted. Its historical
DNS stage created five private DNS zones, destination VNet links, and the resolver
inbound endpoint at `10.20.3.4`; current updates use the active `main.bicep` deployment.

**Migration record only:** the manual migration workflow and its source-dependent Function
rebuild templates have been removed. The remaining migration details below document
completed actions and must not be used as deployment instructions.

Its separate `validate-move` action builds a request from `service-move.json`, checks
all 13 exact source candidates against live inventory and rejects destination name/type
collisions. It calls only ARM `validateMoveResources`, not `moveResources`. The source
private endpoints and Function VNet integration deliberately remain attached during this
first validation so Azure reports the actual blockers before any outage is accepted.

`roles/move-validator.json` grants only source resource-group read and move validation.
An IAM administrator must create/assign it; the workflow never changes IAM.

The separately acknowledged `detach-revalidate` action runs
`scripts/Invoke-FunctionMovePreflight.ps1` for the two source Function Apps only. It
checks all permissions and initial state before any detach, captures non-secret original
subnet IDs, patches only `virtualNetworkSubnetId`, revalidates the same 13 candidates,
and restores integrations in `finally` even when validation succeeds. An `always()`
restore-only workflow step retries/verifies cleanup from the snapshot. Nine offline
transaction/recovery scenarios run in credential-free CI. No app settings are read or
rewritten, and no resource is moved/deleted by this action.

The narrow `roles/function-network-preflight.json` role is assigned only on the two
source apps. The public app already has Contributor; the staff app needs site-write
permission before the action can start. The role grants site metadata read/write, not
config/secret read, deletion, IAM or move execution. A site-write role can update other
site properties; the reviewed script restricts its request body to the integration field.
Actual service moves, private endpoint deletion, RBAC restoration, identity replacement,
release retargeting and source retirement remain separate reviewed stages.

The owner deferred physical VPN testing until the remaining infrastructure is migrated.
This changes the order, not acceptance: VPN/private DNS and complete application/physical
telemetry tests still precede router cutover and source retirement. See
[remaining migration](../../docs/CI_CD.md#remaining-infrastructure-migration).

## Destination Functions and app ownership

The retired migration workflow created destination apps `func-aw-iot-game-v2` and
`func-aw-iot-staff-v2`, dedicated storage/FC1 plans, and a destination SignalR private
endpoint to the existing shared service. The source resource group was subsequently
deleted by the owner. Current release ownership is split: `main.bicep` owns the public
Function host, plan, storage, package container, CORS, private endpoints and receiver
role; `staff-api.bicep` owns the staff host, plan, storage, package container, VNet
integration and staff auth settings. The app workflow deploys the shared package to both.

`MIGRATION_STAGING=true` omits telemetry/timer registrations from the staged artifact;
the destination apps remain staged until the coordinated GitHub Actions release enables
background work after the staff-auth check. `AZURE_MIGRATION_FREEZE=true` still suppresses
normal releases until the deleted source-owned OIDC identities are replaced.

The retired `validate-stateful` action validated the nine non-Web candidates, excluding
the former app/plan resources. The stateful move completed; the owner later deleted the
source resource group. IoT Hub/DPS enrollment/device state and Event Hubs checkpoints
remain in the destination. Destination OIDC access must be recreated before releases resume. See
[historical rebuild record](../../docs/CI_CD.md#historical-function-rebuild-and-cutover).

## Historical stateful move record

The retired `move-stateful` action ran `scripts/Move-StatefulResources.ps1` from GitHub main with the
release freeze and exact acknowledgement `MOVE VALIDATED STATEFUL RESOURCES`. It moves
only the nine non-Web entries in `service-move.json`, never the old apps/plans, network
or deployment identities. Device/enrollment state and storage contents remain on the
existing services; no service is recreated or deleted by this action.

An administrator runs `scripts/Grant-StatefulMoveAccess.ps1` to grant the read/validate/
move-only source role and destination RBAC administration conditioned to Event Hubs
Sender/Receiver roles. `-WhatIf` previews the IAM handoff. The mover checks permissions,
captures inventory/data assignments, proves temporary destination data-role grants,
revalidates, moves once, verifies all nine destination IDs and restores scoped data
roles for the existing readers/IoT Hub and staged public Function. Temporary broad
data-role grants are removed only before a rejected move or after scoped restoration.
An uncertain move retains access and writes a result journal instead of retrying or
deleting anything. Six offline move/RBAC scenarios run in credential-free CI.

`AZURE_MIGRATION_FREEZE=true` also freezes old infrastructure reconcile/apply/preview
jobs during the move. This action does not activate the new Functions, replace GitHub
identities, retarget clients, delete old private endpoints or retire the source group.
Those dependencies must be resolved and verified after the stateful move.

## Staff API ownership exception

The owner requested automatic creation of the new staff backend. `staff-api.bicep` and `staff-api.prod.json` are deployed by `deploy-apps.yml` through `scripts/Deploy-StaffApi.ps1`. They are the single owner for the staff app, plan, dedicated storage, package container, VNet integration and staff auth settings. They do not replay `main.bicep` or adopt the manually built network. The deployment script refuses to run if the staff app, plan or storage names are added to `main.prod.bicepparam` or the reference manifest, so the staff resources cannot quietly become co-owned by the portable infrastructure stack. The historical reference-only rows below describe the legacy app, not this staff app. See [wiring, IAM bootstrap and release stages](../../docs/STAFF_API_WIRING.md).

## What is managed how

| Tier | Resources | How | Why |
|---|---|---|---|
| **1 + 2: deployed** | VNet and four subnets; five private DNS zones and their VNet links; DNS Private Resolver and inbound endpoint; Point-to-Site VPN gateway and public IP; Event Hub namespace, the `iot-telemetry` hub and its consumer groups, and the Event Hub private endpoint; SignalR service and private endpoint; game Function App host, plan, storage account, package container, Application Insights component, Smart Detection action group, game Function private endpoint, game storage blob private endpoint, IoT Hub private endpoint; and read access for the game Function App's managed identity | `main.bicep` (incremental), verified with `what-if` against live | Resources are adopted one unit at a time. A mismatch that cannot be applied safely (for example the Event Hub partition count) fails instead of recreating anything. |
| **Function App settings** | `IoTHubEventHubConnectionString__fullyQualifiedNamespace`, `IOT_EVENTHUB_NAME`, `IOT_EVENTHUB_CONSUMER_GROUP` | `scripts/Set-FunctionAppSettings.ps1` (merge) | A `Microsoft.Web/sites` resource replaces the whole app-settings collection and would wipe secrets such as `DATAVERSE_CLIENT_SECRET`. The merge only touches the three names above. |
| **3: reference only** | IoT Hub and DPS | `reference/snapshots/*.json`, checked by `scripts/Invoke-ReferenceSnapshot.ps1` | See below. |

## Monitoring ownership

`main.bicep` owns the active game Application Insights component `func-aw-azcom-iot-game`, the local `application insights smart detection` action group, and the active `Failure Anomalies - func-aw-azcom-iot-game` Smart Detector alert.

The Application Insights component currently has `IngestionMode=Disabled`. Its former
`DefaultResourceGroup-EUS` workspace reference disappeared with the source subscription;
the destination Bicep no longer references or deploys that workspace. Re-enable ingestion
only after a destination-owned workspace is selected and configured.

There are currently no diagnostic settings, metric alerts, scheduled-query alerts or activity-log alerts in the `rg-aw-azcom-iot-copilot` target design. The retired `func-aw-iot-copilot` Application Insights component and its retired `Failure Anomalies - func-aw-iot-copilot` alert were deleted on 2026-10-04. The old demo resource group action group remains outside the deployable and reference target state.

## Why the IoT Hub is never deployed from here

- Devices, twins and DPS enrollments are not ARM resources, so a deployment could not delete
  them. The real risk is the hub's own settings: ARM replaces the whole resource, and the
  custom endpoint's connection string is redacted when read back, so a template built from
  live can't recreate the route to the Event Hub. A wrong route silently stops all telemetry
  reaching the kiosk, and the hub only keeps undelivered messages for a day.
- Recreating the hub (a name, SKU or region change) or rotating the DPS group key would
  break devices.
- The hub is shared with other devices and the sibling `copilot-iot-service` project.

So the hub service is captured and drift-checked, and the deploy identity has **no write access** to
it, enforced by role assignments rather than by convention. The deploy identity only has the custom IoT Hub private endpoint approval action on the hub, which Azure requires when ARM deploys the private endpoint. The IoT Hub private endpoint is deployable separately from the hub service. The telemetry feature does not
need to change it: the existing catch-all route (`route-iotpanel`) already delivers every
device message to `iot-telemetry`.

## IoT Hub adoption guardrails

Issue #213 starts the final adoption path for the IoT Hub service configuration. Until the
owner approves that deployment, the hub stays in Tier 3 reference snapshots and the deploy
identity remains unable to change it. The first implementation step is to keep the current
working route observable, then add the missing deployment permissions and template coverage in
separate reviewed changes.

The deployable model must preserve the live S1 hub, built-in endpoint, route
`route-iotpanel`, `$fallback` route, enrichments, cloud-to-device delivery settings and the
identity-based Event Hub custom endpoint `endpoint-iotpanel`. The route must be recreated with
the IoT Hub system-assigned identity and an Event Hubs Data Sender role assignment, never with
an exported connection string.

Device identities, module identities, twins and DPS enrollments are not ARM state. They remain
outside this issue and must be backed up or migrated by the separate DPS/device procedure in
issue #214. See the [DPS enrollment migration and device registration runbook](../../docs/DPS_ENROLLMENT_MIGRATION.md).
The hub is still shared with the sibling `copilot-iot-service` project, so the
first deployment approval must include an explicit sibling-project impact check and
before/after proof that physical device telemetry still reaches Event Hub, the game Function,
SignalR and Dataverse.

## Files

```
azure/infrastructure/
â”œâ”€â”€ main.bicep                     # tier 1+2 entry point (resource group scope)
â”œâ”€â”€ main.prod.bicepparam           # values that reproduce live
â”œâ”€â”€ modules/
â”‚   â”œâ”€â”€ action-group.bicep          # local Smart Detection action group
â”‚   â”œâ”€â”€ eventhub.bicep             # namespace, hub, consumer groups
â”‚   â”œâ”€â”€ eventhub-private-endpoint.bicep
â”‚   â”œâ”€â”€ game-function-hosting.bicep # game Function host, plan, storage and package container
â”‚   â”œâ”€â”€ game-function-private-endpoint.bicep
â”‚   â”œâ”€â”€ game-storage-blob-private-endpoint.bicep
â”‚   â”œâ”€â”€ iothub-private-endpoint.bicep
â”‚   â”œâ”€â”€ signalr-private-endpoint.bicep
â”‚   â”œâ”€â”€ signalr.bicep
â”‚   â””â”€â”€ eventhub-receiver.bicep    # Event Hubs Data Receiver for the Function App identity
â”œâ”€â”€ reference/
â”‚   â”œâ”€â”€ manifest.json              # which resources, and which properties to record
â”‚   â””â”€â”€ snapshots/*.json           # committed live state (no keys or connection strings)
â””â”€â”€ scripts/
    â”œâ”€â”€ Invoke-ReferenceSnapshot.ps1     # -Mode Export | Check
    â”œâ”€â”€ Set-FunctionAppSettings.ps1
    â”œâ”€â”€ Initialize-DestinationDeploymentIdentities.ps1 # app + infra OIDC and role bootstrap
    â””â”€â”€ Initialize-InfraIdentities.ps1   # lower-level infra identity helper
```

## Consumer groups

One per independent reader, never shared. Two readers in one group split the partition
leases and each misses events.

| Group | Reader |
|---|---|
| `$Default` | nothing (kept; it exists on every hub) |
| `gamefunc` | this repo's game Function App |

The owner confirmed on 2026-09-29 that the former `copilot-iot-service` app is
retired. Its `funcapp` consumer group was removed on 2026-09-30 after the
private-access path was validated.

## Running it

```powershell
# Preview (read-only)
az deployment group what-if -g rg-aw-azcom-iot-copilot -f azure/infrastructure/main.bicep -p azure/infrastructure/main.prod.bicepparam

# Do the reference resources still match? (PowerShell 7, i.e. `pwsh`)
./azure/infrastructure/scripts/Invoke-ReferenceSnapshot.ps1 -Mode Check

# An intended change was made out of band: re-capture and commit
./azure/infrastructure/scripts/Invoke-ReferenceSnapshot.ps1 -Mode Export
```

Normally you run none of this by hand: use the **Infrastructure** workflow
(`.github/workflows/deploy-infra.yml`). How it fits with the app workflow, the GitHub environments,
the release order and troubleshooting are in [docs/CI_CD.md](../../docs/CI_CD.md#infrastructure-workflow-deploy-infrayml).

| Trigger | Runs | Cloud access |
|---|---|---|
| PR touching `azure/infrastructure/**` | Bicep compile + lint, manifest check | none |
| Every push to `main` | compare Bicep with Azure; report and fail on actionable differences | `infra-deploy`; changes nothing |
| Manual `what-if` | run the same reconciliation check on demand | `infra-deploy`; changes nothing |
| Manual `deploy` (from `main` only) | assign the Function App a managed identity, deploy `main.bicep`, merge the settings, re-check snapshots | `infra-deploy` (`main` only) |

The deployed DNS resolver is `iot-demo-dns-resolver`; its `iot-demo-dns-inbound`
endpoint retains the static `10.20.3.4` address in the delegated `dns-inbound`
subnet. The GL.iNet router forwards the five private service suffixes to that
address over the VPN. Router configuration and its reconnect hotplug script remain
outside ARM and are documented in [staff/network wiring](../../docs/STAFF_API_WIRING.md).

The deployed Point-to-Site path preserves `iot-demo-vpn-pip` and `iot-demo-vpn`:
Standard static zonal IPv4, VpnGw1AZ Generation 2, route-based VPN with BGP,
OpenVPN certificate authentication, and the `172.27.240.0/24` client pool. Only
the public `IoTDemo-VPN-Root` certificate is stored in parameters. The GL.iNet
client certificate and private key remain on the router and outside this repo.

The first `deploy` creates the `gamefunc` consumer group and the Function App's managed
identity, grants it Event Hubs Data Receiver on the hub, and points the Function App at the
hub with identity-based auth, so **no Event Hub key is stored anywhere**. This must happen
before the telemetry function ships (`azure/functions/game/src/functions/telemetry.ts`), or its trigger
has nothing to read.

The declared namespace configuration is private-only. `publicNetworkAccess` is
disabled. Azure reports the otherwise-unused default action as Allow when the
public endpoint is disabled. The trusted Microsoft services exception remains enabled
because IoT Hub sends to the custom Event Hub endpoint with its system-assigned
identity. The game Function App reads through VNet integration, private DNS, and
the Event Hub private endpoint. Local/SAS authentication remains enabled for now,
but it is unreachable over the public network; disabling local auth is a later,
separately validated hardening step.

## One-time setup

1. Run `scripts/Initialize-DestinationDeploymentIdentities.ps1 -WhatIf`, review the
  plan, then rerun without `-WhatIf` as someone with Owner or User Access Administrator
  on the destination resource group. It creates the production app identity, creates
  the infra reader/deployer identities through `Initialize-InfraIdentities.ps1`, and
  applies the staff provisioner role through `Initialize-StaffDeploymentAccess.ps1`.
  It prints client IDs for `AZURE_CLIENT_ID`, `AZURE_INFRA_READER_CLIENT_ID`, and
  `AZURE_INFRA_DEPLOYER_CLIENT_ID`; enter them manually in GitHub. It does not update
  GitHub variables, clear the release freeze, or remove the unresolved old principal's
  grants. It creates two infra managed identities with GitHub OIDC credentials:
   - `id-gha-infra-reader`: Reader only. It remains available for reference inspection while
     resources are moved from snapshots into Bicep. It cannot run ARM what-if because ARM checks
     that the caller could write each resource in the template.
   - `id-gha-infra-deployer`: deployments-only custom role; Private DNS Zone Contributor on
    the resource group; Contributor on the Event Hub namespace, the SignalR service, the game
    Function App, game Function plan, game Function storage account, game Application Insights component,
    game failure anomalies Smart Detector alert, `iot-demo-vnet`,
    `iot-demo-dns-resolver`, the VPN public IP, VPN gateway, Event Hub private endpoint, SignalR private endpoint, game
    Function private endpoint, game storage blob private endpoint, and IoT Hub private endpoint
    **only**; a custom action-group operator role on the resource group; the custom IoT Hub private endpoint approval role on `iothub-aw-iot-copilot`;
    and permission to assign only the Event Hubs Data
     Receiver role, only on the hub.
2. Create the GitHub environments `infra-readonly` (no protection) and `infra-deploy`
   (deployment branches: `main`; add a required reviewer if the plan supports it: the org's Free
   plan does not, see `docs/CI_CD.md`).
3. Add the client ID variables printed by the script to repository/environment settings.
  The workflow pins the destination subscription; do not restore `AZURE_SUBSCRIPTION_ID`.
4. Merge an infrastructure change. Review the automatic reconciliation summary, approve it with
   the manual `deploy` action, then rerun `what-if` to confirm Azure matches Bicep.

## Foundry private endpoint and MCP Quest access

MCP Quest builds missions with a model on the Foundry (Azure AI Services) account
`foundry-aw--ed-azcomm-eastus2`, which lives in `rg-aw-ed-azcom-foundry` with its firewall set to
deny by default. The Function App reaches it over a private endpoint, and stores generated games in
a private container on its own storage account.

**Who owns what.** The CI deploy identity is limited to `rg-aw-azcom-iot-copilot` and can assign only
the Event Hubs Data Receiver role, so the parts that sit outside that boundary are written as
standalone files an owner runs, not added to `main.bicep`.

| Piece | File | Deployed by | Scope |
|---|---|---|---|
| `mcpquest-specs` container and a lifecycle rule that expires `jobs/`, `limits/` and `locks/` after a day | `modules/game-function-hosting.bicep` (via `main.bicep`) | The infra workflow (`what-if`, then `deploy`) | `rg-aw-azcom-iot-copilot` |
| CORS origin `https://mcpquest.powerappsportals.com` for the MCP Quest Code Site (it was missing, so every `/api/mcpquest/*` call from the site would have been blocked) | `main.prod.bicepparam` (`gameFunctionCorsOrigins`) | The infra workflow, which then runs `Test-GameFunctionSiteConfig.ps1` against live | `rg-aw-azcom-iot-copilot` |
| Private DNS zones and VNet links for Foundry (`privatelink.cognitiveservices`, `.openai`, `.services.ai`) | `foundry-private-dns.bicep` | An owner | `rg-aw-azcom-iot-copilot` |
| The Foundry private endpoint `iot-copilot-pe` and its DNS zone group, plus **Foundry User** for the Function App identity | `foundry-private-endpoint.bicep` | An owner | `rg-aw-ed-azcom-foundry` |
| **Storage Blob Data Contributor** for the Function App identity, on the container only | `mcpquest-storage-access.bicep` | An owner | `rg-aw-azcom-iot-copilot` |

The DNS and endpoint files describe resources that already exist (they were created by hand). They are
written to match them, so a `what-if` should report no change: that is the check that the Bicep is
faithful, not a deployment.

### Verified against the live resources (2026-10-10)

- The endpoint is `Approved`, group `account`, with three private IPs in `iot-demo-vnet/private-endpoint`.
- The three zones sit in the same group as the other `privatelink` zones, are linked to `iot-demo-vnet`
  (which uses Azure-provided DNS), and their A records match the endpoint's IPs.
- The Function App is integrated into `iot-demo-vnet/function-integration`, the same VNet.
- `what-if` of `foundry-private-dns.bicep`: no changes. Of `foundry-private-endpoint.bicep`: only
  provider-owned read-only values differ (`etag`, `id`, `provisioningState`, `type`,
  `isIPv6EnabledPrivateEndpoint`), the same noise `deploy-infra.yml` already ignores for the other
  endpoints; with a principal id it adds one role assignment. Of `main.bicep`: the only difference
  from `main` is the two creates in the first row of the table.
- Not provable from outside the VNet: resolution and traffic from inside it. The first real check is the
  deployed Function App calling Foundry (`POST /api/mcpquest/generate`).

### Running it (an owner, once)

Merge, then let the infra workflow create the container (`what-if`, review, `deploy`). Then:

```powershell
$principal = az functionapp show -g rg-aw-azcom-iot-copilot -n func-aw-iot-game-v2 --query identity.principalId -o tsv
$env:FUNCTION_APP_PRINCIPAL_ID = $principal

# Preview, then deploy, each file. Expect no changes except the role assignments.
az deployment group what-if -g rg-aw-azcom-iot-copilot -f azure/infrastructure/foundry-private-dns.bicep -p azure/infrastructure/foundry-private-dns.prod.bicepparam
az deployment group what-if -g rg-aw-ed-azcom-foundry -f azure/infrastructure/foundry-private-endpoint.bicep -p azure/infrastructure/foundry-private-endpoint.prod.bicepparam
az deployment group what-if -g rg-aw-azcom-iot-copilot -f azure/infrastructure/mcpquest-storage-access.bicep -p functionAppPrincipalId=$principal

# Then the same three with `create` instead of `what-if`, once the preview reads as expected.
```

App settings are merged, never replaced, by both workflows, so set these once (none are secrets):

```powershell
az functionapp config appsettings set -g rg-aw-azcom-iot-copilot -n func-aw-iot-game-v2 --settings `
  MCPQUEST_SPEC_BLOB_URL=https://stawazcomiotgamev2.blob.core.windows.net/mcpquest-specs `
  FOUNDRY_ENDPOINT=https://foundry-aw--ed-azcomm-eastus2.openai.azure.com/openai/v1 `
  FOUNDRY_MODEL=gpt-6-sol
```

`MCPQUEST_TOKEN_SECRET` (a random value of 48 or more characters) must also be set as a secret; it
signs play tokens and salts the rate-limit client hash. It is not recorded here and was not present
on the Function App when this was written.

### Things to know

- The Foundry account allows public access with default action `Deny` and one IP rule (the home
  address used for testing). Private traffic through the endpoint bypasses that rule. Once the
  Function App is confirmed working, public access can be turned off; that also closes local testing.
- The account also carries an unrelated VNet rule for `vnet-core/subnet1` in its own group. It is left
  as is.
- The endpoint is in `eastus` with the VNet; the account is in `eastus2`. That is fine for private link.
- To bring the endpoint under CI later, grant the deploy identity Contributor on `iot-copilot-pe`
  and the role-assignment condition for the two roles above in `Initialize-InfraIdentities.ps1`,
  and add `privateDnsZoneConfigs[2]` to the ignored what-if paths (it has three zone configs).

## Known gaps and things worth changing later

- **Event Hub retention** is 1 hour or 1 day (Azure reports both). If the game Function App is
  down longer than that, readings are lost. Raising it is a one-line change in
  `main.prod.bicepparam` but a cost and behavior change, so it isn't done here.
- **Retired app cleanup:** `func-aw-iot-copilot`, its dedicated `EastUSPlan`,
  `stfuncawiotcopilot`, Application Insights component and failure alert were
  deleted on 2026-10-04 after rollback capture and private telemetry validation.
  The shared Log Analytics workspace was preserved. The legacy `funcapp` consumer
  group had already been removed.
- **SignalR CORS is `*`** and the live tier is Standard S1. The Bicep now records
  Standard explicitly because Free does not support the existing private endpoint.
- **Leftovers** from the earlier Logic App design were removed on 2026-10-04:
  the unused `eventhubs` API connection in this resource group, plus the old
  `la-*` workflows and API connections in `rg-aw-azcom-iot-demo`.
- The Function Apps' **application settings** (names only; values are never recorded): see
  `docs/CI_CD.md` and `azure/functions/game/README.md`. `DIRECTLINE_SECRET` and the Dataverse secret are set
  by hand.

## Captured network baseline

The remaining manually built private endpoints are recorded separately in
[azure/infrastructure/network](network/README.md); the Event Hub, SignalR, game Function, game storage blob, and IoT Hub endpoints are now deployable. The game Function App host, its Flex Consumption plan, and its deployment storage account are also deployable, while app settings are still merged separately to avoid replacing secrets. The Infrastructure workflow has a
`network-what-if` action; this is preview-only and never runs the older service
main.bicep. Actual live gateway settings (Generation2, BGP on) and the singular
`private-endpoint` subnet name supersede earlier planning notes.

## Step-by-step adoption plan

The end state is a portable deployment that can recreate the demo in another subscription.
The captured network template is intentionally not deployed as one large change. Move one resource
group into the owned template at a time, using this loop for every step:

1. Add one resource or tightly coupled resource set to Bicep and parameterize subscription-specific
   values.
2. Merge the PR. The main-branch reconciliation check reports the exact Azure difference.
3. Review the summary and manually run `deploy` to approve it.
4. Run reconciliation again; it must report no actionable difference.
5. Validate VPN, private DNS, telemetry, the Power Page and the agent before continuing.

Adopt the network in dependency order: VNet and subnets; private DNS zones and links; DNS resolver
and inbound endpoint (complete); VPN public IP and gateway (complete); Event Hub, SignalR, game Function, and game storage blob private endpoints and DNS zone groups
(adopted); then the remaining private endpoints one at a time. After the network is reproducible, adopt the remaining service plans, storage, Function Apps,
monitoring, IoT Hub and DPS. IoT Hub and DPS come last because device enrollment state is outside ARM
and the existing IoT Hub route contains a redacted credential that cannot be reconstructed from an
export. VPN client private keys and application secrets stay outside the repository; only public
certificates or secret-store references belong in deployment parameters.
