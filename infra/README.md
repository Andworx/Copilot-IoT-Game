# Infrastructure as code

Azure resources for the Restore & Spin pipeline live in one resource group,
`rg-aw-azcom-iot-copilot`. This folder makes the part this repo owns reproducible and puts
the rest under drift detection, without ever letting CI touch the IoT Hub.

```
panel Pi ─► IoT Hub ─► route ─► Event Hub ─► game Function App ─► SignalR ─► kiosk page
 (device)   iothub-…            evhns-…/       func-aw-azcom-       signalr-…
                                iot-telemetry  iot-game
```

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
| `funcapp` | the legacy `copilot-iot-service` function app |
| `gamefunc` | this repo's game Function App |

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
| PR or push touching `infra/**` | Bicep compile + lint, manifest check | none |
| Manual `what-if` | preview; changes nothing | `infra-deploy` (deployer identity, `main` only) |
| Manual `drift`, and weekly | `drift`: what-if must show no Create/Modify/Delete (`infra-deploy`); `snapshots`: every snapshot must match live (`infra-readonly`, read-only) |
| Manual `deploy` (from `main` only) | assign the Function App a managed identity, deploy `main.bicep`, merge the settings, re-check snapshots | `infra-deploy` (`main` only) |

The first `deploy` creates the `gamefunc` consumer group and the Function App's managed
identity, grants it Event Hubs Data Receiver on the hub, and points the Function App at the
hub with identity-based auth, so **no Event Hub key is stored anywhere**. This must happen
before the telemetry function ships (`azure/src/functions/telemetry.ts`), or its trigger
has nothing to read.

## One-time setup

1. Run `scripts/Initialize-InfraIdentities.ps1` (try `-WhatIf` first) as someone with Owner
   or User Access Administrator on the resource group. It creates two managed identities with
   GitHub OIDC credentials:
   - `id-gha-infra-reader`: Reader only. It runs the snapshot drift check. It cannot run `what-if`: ARM checks that the caller could write each resource in the template, so `what-if` runs as the deployer.
   - `id-gha-infra-deployer`: deployments-only custom role; Contributor on the Event Hub
     namespace, the SignalR service and the game Function App **only**; and permission to
     assign only the Event Hubs Data Receiver role, only on the hub.
2. Create the GitHub environments `infra-readonly` (no protection) and `infra-deploy`
   (deployment branches: `main`; add a required reviewer if the plan supports it: the org's Free
   plan does not, see `docs/CI_CD.md`).
3. Add the repository variables `AZURE_INFRA_READER_CLIENT_ID` and
   `AZURE_INFRA_DEPLOYER_CLIENT_ID` (the script prints the values).
4. Run the workflow with `what-if` first, then `deploy`, then `drift` to confirm it is clean
   (`drift` fails until the first deploy because the `gamefunc` group is still pending). The role
   assignments and the what-if permissions have not yet been exercised by CI.

## Known gaps and things worth changing later

- **Event Hub retention** is 1 hour or 1 day (Azure reports both). If the game Function App is
  down longer than that, readings are lost. Raising it is a one-line change in
  `main.prod.bicepparam` but a cost and behavior change, so it isn't done here.
- **IoT Hub to Event Hub auth** almost certainly uses the namespace-wide
  `RootManageSharedAccessKey` (Manage, Send, Listen), the only rule on the namespace. Moving the
  route to an identity-based endpoint with Event Hubs Data Sender would remove the stored key,
  but it changes a live route, so do it in a maintenance window after this pipeline is proven.
- **SignalR CORS is `*`** and the tier is Free (daily message cap); both mirror live. Move to
  Standard before a real booth event.
- **Leftovers** from the earlier Logic App design: the `eventhubs` API connection and the
  `la-*` deployments. Nothing here uses them.
- The Function Apps' **application settings** (names only; values are never recorded): see
  `docs/CI_CD.md` and `azure/README.md`. `DIRECTLINE_SECRET` and the Dataverse secret are set
  by hand.
