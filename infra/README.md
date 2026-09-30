# Infrastructure as code

Azure resources for the Restore & Spin pipeline live in one resource group,
`rg-aw-azcom-iot-copilot`. This folder makes the part this repo owns reproducible and puts
the rest under drift detection, without ever letting CI touch the IoT Hub.

```
panel Pi ─► IoT Hub ─► route ─► Event Hub ─► game Function App ─► SignalR ─► kiosk page
 (device)   iothub-…            evhns-…/       func-aw-azcom-       signalr-…
                                iot-telemetry  iot-game
```

## Staff API release exception

The owner requested automatic creation of the new staff backend. `staff-api.bicep` and `staff-api.prod.json` are deployed by `deploy-apps.yml` through `scripts/Deploy-StaffApi.ps1`. They create only the staff app, plan and dedicated storage and join the existing integration subnet. They do not replay `main.bicep` or adopt the manually built network. The historical reference-only rows below describe the two existing apps, not this new third app. See [wiring, IAM bootstrap and release stages](../docs/STAFF_API_WIRING.md).

## What is managed how

| Tier | Resources | How | Why |
|---|---|---|---|
| **1 + 2: deployed** | Event Hub namespace, the `iot-telemetry` hub and its consumer groups, the SignalR service, and read access for the game Function App's managed identity | `main.bicep` (incremental), verified with `what-if` against live | Additive or already matching live. A mismatch that can't be applied (for example the partition count) fails instead of recreating anything. |
| **Function App settings** | `IoTHubEventHubConnectionString__fullyQualifiedNamespace`, `IOT_EVENTHUB_NAME`, `IOT_EVENTHUB_CONSUMER_GROUP` | `scripts/Set-FunctionAppSettings.ps1` (merge) | A `Microsoft.Web/sites` resource replaces the whole app-settings collection and would wipe secrets such as `DATAVERSE_CLIENT_SECRET`. The merge only touches the three names above. |
| **3: reference only** | IoT Hub, DPS, both Function Apps, both plans, both storage accounts, both App Insights | `reference/snapshots/*.json`, checked by `scripts/Invoke-ReferenceSnapshot.ps1` | See below. |

## Why the IoT Hub is never deployed from here

- Devices, twins and DPS enrollments are not ARM resources, so a deployment could not delete
  them. The real risk is the hub's own settings: ARM replaces the whole resource, and the
  custom endpoint's connection string is redacted when read back, so a template built from
  live can't recreate the route to the Event Hub. A wrong route silently stops all telemetry
  reaching the kiosk, and the hub only keeps undelivered messages for a day.
- Recreating the hub (a name, SKU or region change) or rotating the DPS group key would
  break devices.
- The hub is shared with other devices and the sibling `copilot-iot-service` project.

So the hub is captured and drift-checked, and the deploy identity has **no write access** to
it, enforced by role assignments rather than by convention. The telemetry feature does not
need to change it: the existing catch-all route (`route-iotpanel`) already delivers every
device message to `iot-telemetry`.

## Files

```
infra/
├── main.bicep                     # tier 1+2 entry point (resource group scope)
├── main.prod.bicepparam           # values that reproduce live
├── modules/
│   ├── eventhub.bicep             # namespace, hub, consumer groups
│   ├── signalr.bicep
│   └── eventhub-receiver.bicep    # Event Hubs Data Receiver for the Function App identity
├── reference/
│   ├── manifest.json              # which resources, and which properties to record
│   └── snapshots/*.json           # committed live state (no keys or connection strings)
└── scripts/
    ├── Invoke-ReferenceSnapshot.ps1     # -Mode Export | Check
    ├── Set-FunctionAppSettings.ps1
    └── Initialize-InfraIdentities.ps1   # one-time bootstrap, run by a human
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
az deployment group what-if -g rg-aw-azcom-iot-copilot -f infra/main.bicep -p infra/main.prod.bicepparam

# Do the reference resources still match? (PowerShell 7, i.e. `pwsh`)
./infra/scripts/Invoke-ReferenceSnapshot.ps1 -Mode Check

# An intended change was made out of band: re-capture and commit
./infra/scripts/Invoke-ReferenceSnapshot.ps1 -Mode Export
```

Normally you run none of this by hand: use the **Infrastructure** workflow
(`.github/workflows/deploy-infra.yml`). How it fits with the app workflow, the GitHub environments,
the release order and troubleshooting are in [docs/CI_CD.md](../docs/CI_CD.md#infrastructure-workflow-deploy-infrayml).

| Trigger | Runs | Cloud access |
|---|---|---|
| PR touching `infra/**` | Bicep compile + lint, manifest check | none |
| Every push to `main` | compare Bicep with Azure; report and fail on actionable differences | `infra-deploy`; changes nothing |
| Manual `what-if` | run the same reconciliation check on demand | `infra-deploy`; changes nothing |
| Manual `deploy` (from `main` only) | assign the Function App a managed identity, deploy `main.bicep`, merge the settings, re-check snapshots | `infra-deploy` (`main` only) |

The first `deploy` creates the `gamefunc` consumer group and the Function App's managed
identity, grants it Event Hubs Data Receiver on the hub, and points the Function App at the
hub with identity-based auth, so **no Event Hub key is stored anywhere**. This must happen
before the telemetry function ships (`azure/src/functions/telemetry.ts`), or its trigger
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
   - `id-gha-infra-deployer`: deployments-only custom role; Contributor on the Event Hub
     namespace, the SignalR service and the game Function App **only**; and permission to
     assign only the Event Hubs Data Receiver role, only on the hub.
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
  `docs/CI_CD.md` and `azure/README.md`. `DIRECTLINE_SECRET` and the Dataverse secret are set
  by hand.

## Captured network baseline

The manually built VNet, VPN, DNS and private endpoints are now recorded separately
in [infra/network](network/README.md). The Infrastructure workflow has a
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
and inbound endpoint; VPN public IP and gateway; then one private endpoint and its DNS zone group at
a time. After the network is reproducible, adopt the remaining service plans, storage, Function Apps,
monitoring, IoT Hub and DPS. IoT Hub and DPS come last because device enrollment state is outside ARM
and the existing IoT Hub route contains a redacted credential that cannot be reconstructed from an
export. VPN client private keys and application secrets stay outside the repository; only public
certificates or secret-store references belong in deployment parameters.
