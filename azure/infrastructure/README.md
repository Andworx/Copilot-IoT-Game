# Infrastructure as code

Azure resources for the Restore & Spin pipeline live in one resource group,
`rg-aw-azcom-iot-copilot`. This folder makes the part this repo owns reproducible and puts
the rest under drift detection, without ever letting CI touch the IoT Hub.

```
panel Pi â”€â–º IoT Hub â”€â–º route â”€â–º Event Hub â”€â–º game Function App â”€â–º SignalR â”€â–º kiosk page
 (device)   iothub-â€¦            evhns-â€¦/       func-aw-azcom-       signalr-â€¦
                                iot-telemetry  iot-game
```

## Staff API ownership exception

The owner requested automatic creation of the new staff backend. `staff-api.bicep` and `staff-api.prod.json` are deployed by `deploy-apps.yml` through `scripts/Deploy-StaffApi.ps1`. They are the single owner for the staff app, plan, dedicated storage, package container, VNet integration and staff auth settings. They do not replay `main.bicep` or adopt the manually built network. The deployment script refuses to run if the staff app, plan or storage names are added to `main.prod.bicepparam` or the reference manifest, so the staff resources cannot quietly become co-owned by the portable infrastructure stack. The historical reference-only rows below describe the legacy app, not this staff app. See [wiring, IAM bootstrap and release stages](../../docs/STAFF_API_WIRING.md).

## What is managed how

| Tier | Resources | How | Why |
|---|---|---|---|
| **1 + 2: deployed** | VNet and four subnets; five private DNS zones and their VNet links; DNS Private Resolver and inbound endpoint; Point-to-Site VPN gateway and public IP; Event Hub namespace, the `iot-telemetry` hub and its consumer groups; SignalR service and private endpoint; game Function App host, plan, storage account, package container, Application Insights component, Smart Detection action group, game Function private endpoint, game storage blob private endpoint, IoT Hub private endpoint; and read access for the game Function App's managed identity | `main.bicep` (incremental), verified with `what-if` against live | Resources are adopted one unit at a time. A mismatch that cannot be applied safely (for example the Event Hub partition count) fails instead of recreating anything. |
| **Function App settings** | `IoTHubEventHubConnectionString__fullyQualifiedNamespace`, `IOT_EVENTHUB_NAME`, `IOT_EVENTHUB_CONSUMER_GROUP` | `scripts/Set-FunctionAppSettings.ps1` (merge) | A `Microsoft.Web/sites` resource replaces the whole app-settings collection and would wipe secrets such as `DATAVERSE_CLIENT_SECRET`. The merge only touches the three names above. |
| **3: reference only** | IoT Hub, DPS, the legacy Function App, legacy plan, and legacy storage account | `reference/snapshots/*.json`, checked by `scripts/Invoke-ReferenceSnapshot.ps1` | See below. |

## Monitoring ownership

`main.bicep` owns the active game Application Insights component `func-aw-azcom-iot-game`, the local `application insights smart detection` action group, and the active `Failure Anomalies - func-aw-azcom-iot-game` Smart Detector alert.

The Application Insights component stays connected to the existing default Log Analytics workspace in `DefaultResourceGroup-EUS`. That workspace is shared/default Azure platform state outside this resource group, so this repo references it by resource ID but does not deploy or modify it.

There are currently no diagnostic settings, metric alerts, scheduled-query alerts or activity-log alerts in the `rg-aw-azcom-iot-copilot` target design. The retired `func-aw-iot-copilot` Application Insights component, its retired `Failure Anomalies - func-aw-iot-copilot` alert, and the old demo resource group action group are intentionally excluded from the deployable and reference target state.

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

## Files

```
azure/infrastructure/
â”œâ”€â”€ main.bicep                     # tier 1+2 entry point (resource group scope)
â”œâ”€â”€ main.prod.bicepparam           # values that reproduce live
â”œâ”€â”€ modules/
â”‚   â”œâ”€â”€ action-group.bicep          # local Smart Detection action group
â”‚   â”œâ”€â”€ eventhub.bicep             # namespace, hub, consumer groups
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
    â””â”€â”€ Initialize-InfraIdentities.ps1   # one-time bootstrap, run by a human
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

1. Run `scripts/Initialize-InfraIdentities.ps1` (try `-WhatIf` first) as someone with Owner
   or User Access Administrator on the resource group. It creates two managed identities with
   GitHub OIDC credentials:
   - `id-gha-infra-reader`: Reader only. It remains available for reference inspection while
     resources are moved from snapshots into Bicep. It cannot run ARM what-if because ARM checks
     that the caller could write each resource in the template.
   - `id-gha-infra-deployer`: deployments-only custom role; Private DNS Zone Contributor on
    the resource group; Contributor on the Event Hub namespace, the SignalR service, the game
    Function App, game Function plan, game Function storage account, game Application Insights component,
    game failure anomalies Smart Detector alert, `iot-demo-vnet`,
    `iot-demo-dns-resolver`, the VPN public IP, VPN gateway, SignalR private endpoint, game
    Function private endpoint, game storage blob private endpoint, and IoT Hub private endpoint
    **only**; a custom action-group operator role on the resource group; the custom IoT Hub private endpoint approval role on `iothub-aw-iot-copilot`;
    and permission to assign only the Event Hubs Data
     Receiver role, only on the hub.
2. Create the GitHub environments `infra-readonly` (no protection) and `infra-deploy`
   (deployment branches: `main`; add a required reviewer if the plan supports it: the org's Free
   plan does not, see `docs/CI_CD.md`).
3. Add the repository variables `AZURE_INFRA_READER_CLIENT_ID` and
   `AZURE_INFRA_DEPLOYER_CLIENT_ID` (the script prints the values).
4. Merge an infrastructure change. Review the automatic reconciliation summary, approve it with
   the manual `deploy` action, then rerun `what-if` to confirm Azure matches Bicep.

## Known gaps and things worth changing later

- **Event Hub retention** is 1 hour or 1 day (Azure reports both). If the game Function App is
  down longer than that, readings are lost. Raising it is a one-line change in
  `main.prod.bicepparam` but a cost and behavior change, so it isn't done here.
- **Retired app cleanup:** `func-aw-iot-copilot` is no longer used. It remains a
  separately owned reference resource until the app, its dedicated `EastUSPlan`,
  `stfuncawiotcopilot`, Application Insights component and failure alert are
  deliberately removed. Keep the shared Log Analytics workspace. The legacy
  `funcapp` consumer group has already been removed.
- **SignalR CORS is `*`** and the live tier is Standard S1. The Bicep now records
  Standard explicitly because Free does not support the existing private endpoint.
- **Leftovers** from the earlier Logic App design: the `eventhubs` API connection and the
  `la-*` deployments. Nothing here uses them.
- The Function Apps' **application settings** (names only; values are never recorded): see
  `docs/CI_CD.md` and `azure/functions/game/README.md`. `DIRECTLINE_SECRET` and the Dataverse secret are set
  by hand.

## Captured network baseline

The remaining manually built private endpoints are recorded separately in
[azure/infrastructure/network](network/README.md); the SignalR, game Function, game storage blob, and IoT Hub endpoints are now deployable. The game Function App host, its Flex Consumption plan, and its deployment storage account are also deployable, while app settings are still merged separately to avoid replacing secrets. The Infrastructure workflow has a
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
and inbound endpoint (complete); VPN public IP and gateway (complete); SignalR, game Function, and game storage blob private endpoints and DNS zone groups
(adopted); then the remaining private endpoints one at a time. After the network is reproducible, adopt the remaining service plans, storage, Function Apps,
monitoring, IoT Hub and DPS. IoT Hub and DPS come last because device enrollment state is outside ARM
and the existing IoT Hub route contains a redacted credential that cannot be reconstructed from an
export. VPN client private keys and application secrets stay outside the repository; only public
certificates or secret-store references belong in deployment parameters.
