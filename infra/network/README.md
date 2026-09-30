# Network adoption baseline

Status: captured from live Azure for review; no network deployment or public-access
lockdown has been performed. This is the current manually built network, not the
older proposed foundation in the companion service repository.

## Ownership and scope

`main.bicep` loads `baseline.json`, an explicit allowlist of writable properties.
It declares the VNet with all four subnets inline, VPN public IP/gateway, DNS
resolver/inbound endpoint, five private endpoints, five private DNS zones, five
VNet links and five endpoint DNS zone groups. It preserves existing names, subnet
prefixes, delegation names, tags, gateway settings and service connections.

Service-owned NICs, DNS A records and service-association links are not independently
managed. DNS zone groups maintain their records. Dynamic endpoint addresses and
gateway private addresses remain allocated by Azure; this is adoption of existing
resources, not a promise that recreating them yields identical dynamic addresses.
The resolver inbound address is explicitly static at 10.20.3.4.

No IoT Hub/DPS/service resource, Function app/config, storage account, role assignment,
NSG, route table or public-access toggle is declared here. References to existing
services do not redeploy them. The existing staff template remains the owner of
staff app outbound integration. Existing game app integration remains captured in
the staff/network wiring documentation rather than replaying the app resource.

Only public VPN root certificate data is included. No private key, client VPN
profile, Function setting or service credential is stored. The router still owns
its client certificate/key and the host-route hotplug hook.

## Findings that supersede earlier notes

- VNet `iot-demo-vnet`, 10.20.0.0/16.
- Subnets: `GatewaySubnet` 10.20.0.0/27; **`private-endpoint`** 10.20.1.0/24;
  `function-integration` 10.20.2.0/26; `dns-inbound` 10.20.3.0/28.
- Actual delegation names and defaultOutboundAccess settings are retained.
- VPN `iot-demo-vpn`: VpnGw1AZ, **Generation2, BGP enabled**, active-active false.
  Earlier notes saying Generation1/BGP off were not the live configuration.
- P2S: OpenVPN/certificate, 172.27.240.0/24. Preserve the root certificate.
- Public IP `iot-demo-vpn-pip`: Standard/Static, zones 1/2/3.
- Resolver inbound: static 10.20.3.4.
- IoT Hub endpoint attaches both azure-devices and servicebus private DNS zones,
  including auxiliary addresses 10.20.1.5-.7 as well as primary 10.20.1.4.
- Event Hub 10.20.1.8, SignalR 10.20.1.9, game Function 10.20.1.10,
  game storage blob 10.20.1.11 were recorded in prior verified endpoint checks.
- No NSGs or route tables were present in the network inventory. The older proposal
  adding NSGs is not adopted as if already deployed.

## GitHub workflow

PR/push checks in `.github/workflows/deploy-infra.yml` compile this Bicep and run
`check-baseline.py`. They do not change Azure. After merging, choose **Infrastructure
> Run workflow > main > network-what-if**. It runs `Preview-Network.ps1`, which
checks the subscription, validates, then runs a detailed preview only.

The existing `infra-deploy` identity already has Reader at RG scope plus the
Infra Deployment Operator role. The preview uses `ProviderNoRbac` (Azure CLI
2.76+): provider validation with read permission rather than adding network write
permissions just to preview. Its result must be inspected; a successful preview
alone does not mean zero differences. No role grants were changed by this work.

There is intentionally no network apply action yet. Before adoption/apply, review
all differences, settle ownership with companion network PR 207, and explicitly
add narrowly scoped network deployment permissions. Existing service `deploy`
continues to deploy `infra/main.bicep`; it does **not** deploy this baseline. Do not
run that older service deployment as a substitute for network adoption.

Local read-only preview:

```powershell
az account set --subscription 2e291b4a-5f03-4dcd-bb56-09643c729adc
./infra/network/Preview-Network.ps1
```

## Next: Event Hub lockdown

After reviewing this baseline, inspect both Event Hub consumers (`gamefunc` and
legacy `funcapp`), their network paths and DNS, and the IoT Hub managed-identity
route. Only then prepare a separate service-access change and before/after
telemetry checks. The legacy consumer is not assumed to have private networking.
Keep public staff HTTPS/Entra and the public prize API reachable.

References: [current wiring](../../docs/STAFF_API_WIRING.md),
[ARM incremental deployment/subnet guidance](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-modes),
[what-if validation levels](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-what-if).

## Validation record — 2026-09-29

Bicep compilation and the baseline contract checks passed. Both required app
builds passed (including the Power Pages device-contract checks).
A local Azure what-if succeeded using the signed-in operator and CLI 2.75's
normal provider validation. The GitHub identity's ProviderNoRbac path still needs
its first workflow run; the preview script requires CLI 2.76 or later.

The preview reported no resource creations or deletions, but did report Modify
entries. DNS zone-group differences are child resource metadata (etag, id, type,
provisioning state). Additional differences involve gateway runtime health and
migration fields, private-endpoint IPv6 defaults and a VNet policy field omitted
by the selected API schema. These are not a verified zero-difference deployment.
The captured false values for gateway remote-VNet/Virtual-WAN traffic are now
explicit. Review remaining provider/default differences before any apply action
is introduced; do not suppress all Modify results as harmless.
