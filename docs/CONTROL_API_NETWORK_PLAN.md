# Browser control API and private IoT network

Status: design and diagnostic tooling, 2026-09-29. No authentication cutover,
public-access restriction, or gateway deployment is included in this change.
Network ownership remains in the [network plan](https://github.com/Andworx/copilot-iot-service/pull/207).
Track authentication implementation and live acceptance in [issue #177](https://github.com/Andworx/Copilot-IoT-Game/issues/177).

## Problem and evidence

After private DNS was enabled, the Game Box Control Code App could no longer load
current state. A direct PowerShell request to `kiosk-state` still returned the
active device and game-mode state. Edge reported denial of access to the local
address space from the hosted Code App. This establishes a browser-path failure;
it does not establish a backend outage or prove which iframe policy denied access.
Allowing local-network access on the outer Power Apps page did not resolve it.

Public network access being enabled does not override private DNS. CORS also does
not grant browser local-network permission. Do not disable browser security or
pin a changing public service IP in a hosts file.

## Proposed decision and cost

Preferred cost-conscious design: a public HTTPS control API with Entra token
validation and staff authorization, with private outbound access to IoT services.
This avoids a new API Management resource. Confirmation of the gateway versus
direct API option remains pending; do not interpret this document as an approved
cloud purchase or implemented authentication.

Alternative: a public API Management endpoint validates Entra tokens and calls
the private Function through a VNet. This must prevent direct backend bypass and
must explicitly allow only intended routes and methods.

| Option | Incremental gateway estimate | Constraint |
|---|---:|---|
| Direct public API with Entra | $0 gateway fee | Function usage, identity/licensing, logging and existing network costs remain |
| APIM Developer | about $48/month | Development/test tier, no SLA; VNet injection |
| APIM Standard v2 | about $700/month | Outbound VNet integration; excessive for this demo unless justified |

East US retail USD estimate, checked 2026-09-29, 730 hours/month: Developer
$0.0658/hour; Standard v2 $0.9589/hour. Excludes traffic, logs, additional network
resources and overages. Re-price before provisioning. Basic v2 is not a substitute
for the private-backend VNet requirement.
[Pricing](https://azure.microsoft.com/en-us/pricing/details/api-management/),
[network tier capabilities](https://learn.microsoft.com/en-us/azure/api-management/virtual-network-concepts).

## Security and consumer boundaries

Power Apps sign-in does not automatically authenticate a direct `fetch` to the
Function. Current staff operations use Function keys embedded in the client
bundle. Those keys are observable by users and are not user authorization.

| Consumer | Contract to preserve | Planned boundary |
|---|---|---|
| Staff Code App | Device/game-mode control, prize administration, check-in and draw | Entra access token for this API, required delegated scope and staff role/group policy |
| Kiosk | State/device reads, negotiation, mode progression and telemetry display | Explicitly inventory and authorize separately; do not apply staff login globally |
| Attendee phone | Prize listing and token-based claims over cellular | Preserve server-side claim validation, atomic stock allocation, expiry and replay handling |
| Function worker | Event Hub consumption, SignalR output, Dataverse and host storage | Preserve VNet integration and downstream identities/credentials |
| CI/CD | Function and Code Site deployment | Preserve supported hosted-runner deployment access |

Inventory every HTTP registration and each frontend caller before enforcement;
the table is a consumer grouping, not an exhaustive endpoint allowlist. Public
prize APIs share the Function today. Do not globally enable mandatory staff login
on that app or disable its public ingress until those routes are separated or
explicitly exempted with their own security contract.

Evaluate an Entra OAuth custom connector with the Code Apps SDK before adding a
second browser sign-in flow. Connector execution changes the network origin, so
validate its reachability separately from browser fetch. If direct browser token
acquisition is selected, prove it works inside the hosted app, including consent,
popup/redirect handling and refresh. Never assume the host's sign-in token is
available to the API. Client IDs and scopes may be public config; secrets and
Function keys must not be new Vite values.
[Custom connector authentication](https://learn.microsoft.com/en-us/connectors/custom-connectors/azure-active-directory-authentication),
[Code Apps overview](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/overview).

API validation must reject missing, expired, wrong-issuer and wrong-audience
tokens, and deny authenticated callers without required permission. Validate
signatures against the configured tenant's trusted keys; never trust a decoded
JWT or client-supplied identity headers. Choose platform authentication or a
maintained token-validation library and test key rotation. Log correlation IDs
and outcomes, not tokens, Function keys or participant data.

## DNS and rollout

1. Capture current router rules and Azure settings before changes. Keep the VPN
   resolver host route and the IoT Hub, Event Hub, SignalR and storage private DNS
   paths. Firmware updates previously removed the custom router hotplug hook.
2. For the selected public browser API, ensure its hostname resolves publicly on
   demo clients. Prefer a dedicated public API hostname/app boundary. If reusing
   the Function hostname for recovery, change only its LAN DNS forwarding policy;
   do not remove Azure VNet private-zone links or change downstream DNS. Check
   both A and AAAA resolution. No static public-IP mappings.
3. Treat public-DNS recovery with legacy Function-key auth as temporary. It is
   not completion of the Entra migration. Keep public access enabled during this
   staged work; a private endpoint alone does not prove public isolation.
4. Implement and test token validation/authorization, then the authenticated
   client/connector. Configure tenant, API audience, permissions and operator
   assignments manually with the owner; do not invent registration identifiers.
5. Deploy through `deploy-apps.yml`, backend before frontend. Remove browser key
   injection and rotate the old exposed keys after all consumers are migrated.
   Keep the previous application/configuration available for a deliberate rollback.
6. Test in hosted Edge on VPN and off VPN; then retest telemetry, mode controls,
   SignalR, prize claims on cellular, check-in/draw and the deployment pipeline.
   Capture results before translating the final network configuration into Bicep.

## Acceptance evidence still required

- Hosted Code App loads state and an authorized operator changes mode successfully.
- Missing/invalid tokens receive 401; valid tokens without staff permission receive
  403; both are rejected before business side effects.
- No staff credential is shipped in built JavaScript or browser URLs.
- Public attendees can redeem valid tokens and cannot call staff operations.
- Normal Internet and private telemetry work after VPN reconnect and router reboot.
- Chosen browser API resolves to the intended public address; downstream services
  still resolve privately where required. A TCP pass alone is not application proof.
- Live authentication and rollback checks remain **Verify** until observed.

Use `scripts/Test-DemoNetwork.ps1` to capture DNS from system/router/Azure resolver
and TCP to an expected endpoint. It does not change settings, call write APIs,
authenticate users, or prove browser permissions. See [Edge local network access](https://learn.microsoft.com/en-us/deployedge/ms-edge-local-network-access).
