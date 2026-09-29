# Restore staff controls with a separate authenticated API

Status: implementation in progress; no production cutover yet. Operator requested
manual Portal setup. Track [#177](https://github.com/Andworx/Copilot-IoT-Game/issues/177).
Do not merge/deploy until the prerequisites below are complete. The existing app
continues serving Power Pages and kiosk operations; the new app serves staff only.
Both run the same package with different `API_SURFACE` settings.

## 1. Entra API registration

Create **IoT Game Staff API**, single tenant, no redirect URI and no client secret.
Under Expose an API, use `api://<API_CLIENT_ID>` and an enabled admin-consent
delegated scope named `Staff.Access`.

Create an app role: display name **Game Operator**, allowed member types
**Users/Groups**, value **Game.Operator**, enabled. In Enterprise applications,
open this API's service principal and assign individual operators to that role.
Set assignment required if appropriate for the tenant. App sharing and API role
assignment are separate controls; both are needed.

In the API manifest set `api.requestedAccessTokenVersion` to `2`. The backend
accepts only v2 access tokens for this API; ID tokens and Function keys are not
accepted. Record client/tenant IDs as non-secret deployment configuration.

## 2. Entra connector registration

Create **IoT Game Staff Connector**, single tenant. Add delegated API permission
**IoT Game Staff API / Staff.Access**, then grant tenant admin consent.
The redirect URI must be the exact URI shown by the saved Power Platform custom
connector; add it as a **Web** redirect URI after the connector is created.
Create a client secret only when needed for the connector security page. Paste it
directly there; never into chat, Git, frontend settings or the API registration.
Record its expiry and a rotation reminder privately.

## 3. Separate staff Function App

In the existing Azure resource group create a new Linux Node 22 **Flex Consumption**
Function App (proposed name `func-aw-azcom-iot-staff`, subject to availability).
Use the existing region and a dedicated storage account. No always-ready instances
are required for this demo. This adds consumption/storage cost, not an APIM fee.
Record the actual hostname returned by Azure, which may include a unique suffix;
do not assume it is `<name>.azurewebsites.net`.

Keep public HTTPS ingress enabled on this app, with no private endpoint. The
connector's cloud service must be able to reach it. Integrate its outbound network
with the existing compatible Flex integration subnet so it can reach private
SignalR. Preserve existing VNet DNS links and router forwarding rules. The Code
App calls the connector service, so its browser no longer resolves the staff
Function or connects directly to private SignalR.

Configure only required runtime settings, using the same approved Dataverse
application permissions as the existing backend initially. Copy secrets privately
through the Portal; do not export them into the repo. See `azure/src/lib/dataverse.ts`
for the current required Dataverse setting names, including PrizeEngine settings.
Retain its own AzureWebJobsStorage/deployment storage configuration. Set the
SignalR connection setting needed for staff mode-change broadcasts. Do not copy
Event Hub consumer settings: the staff app must not run the telemetry trigger.

| Setting | Existing game app | New staff app |
|---|---|---|
| `API_SURFACE` | `public` | `staff` |
| `STAFF_AUTH_TENANT_ID` | Not used | Tenant GUID |
| `STAFF_AUTH_AUDIENCE` | Not used | API registration client GUID (v2 token audience) |
| `STAFF_AUTH_CLIENT_ID` | Not used | Connector registration client GUID |

Entra validation is implemented in code using JOSE, including issuer, audience,
signature, expiry, delegated scope, role and authorized connector client. Azure's
HTTP trigger auth level is `anonymous` on this app to let the bearer validator
run; this does **not** mean unauthenticated business operations are allowed.
Do not enable interactive App Service authentication redirects over these APIs.
Node must support `require(esm)` (Node 22.12+; CI uses Node 22).

## 4. Custom connector and per-user connections

In the same Power Platform environment as Game Box Control, create a custom
connector from `connectors/iot-game-staff/openapi.json`. In a local copy replace
the invalid example host and tenant/API placeholders with the actual values.
Use OAuth 2.0 / Microsoft Entra ID security with the connector client registration,
tenant ID, API resource URI and `api://<API_CLIENT_ID>/Staff.Access` scope.
Save, copy its redirect URI into the connector registration, and finish security
configuration with the secret kept only in Power Platform.

Create your own OAuth connection and consent. Test `GetKioskState` after the staff
package has been deployed in step 5; the empty Function App cannot serve it yet. Share the
connector and Code App with intended staff; each operator uses their own identity
and assigned API role. Check DLP/connector policies if the environment blocks it.
Do not select an on-premises data gateway.

In the isolated Code App checkout, use the installed PAC command to add the real
connection (replace placeholders, do not reinitialize the app):

```powershell
pac code add-data-source --apiId <connector-id> --connectionId <your-connection-id>
```

Inspect the generated `.power/schemas/appschemas/dataSourcesInfo.ts`, generated
services and `power.config.json`. Confirm operation IDs match `src/apiConfig.ts`,
the existing app ID is unchanged, and metadata contains no secrets. The adapter
requires exactly one matching data source; it fails closed without it.
Run `node scripts/verify-staff-binding.mjs` from the Code App directory and test
through the local Power Apps host before a release. If PAC changes its generated
layout, update the adapter based on actual generated output rather than guessing.

## 5. CI/CD cutover

Use `.github/workflows/deploy-apps.yml` only. Set repository variables
`AZURE_STAFF_FUNCTIONAPP_NAME` and `AZURE_RESOURCE_GROUP`. Assign the existing
GitHub deployment identity Website Contributor on the new staff app only.
Preserve its existing game app scope and OIDC configuration.

The workflow validates real connector bindings and API surface settings before
deploying. It deploys the staff app first, then the existing public app, then the
Code App and Power Pages. Staff-only routes are absent from the public app after
the new package is deployed. Do not merge this change until configuration and
bindings are ready: this is a coordinated release, not an automatic fallback to
old browser keys. Remove the old `CODE_APP_*_FUNCTION_KEY` GitHub secrets and
rotate exposed keys after successful cutover and any other callers are migrated.

## 6. Acceptance and rollback

- No bearer token: staff API returns 401; expired/forged/wrong audience or issuer
  tokens return 401; valid tokens without scope/role/authorized client return 403.
- With your connector connection, load state, set mode, toggle enablement, manage
  inventory and check in. Run draw only with an approved test campaign because it
  commits a winner. Presentation polling should reveal the committed result within
  roughly five seconds. No winner broadcast remains on the public kiosk hub.
- Verify former staff routes on the public host return 404 and public claim/read
  operations still work. Test a cellular claim and real Pi/kiosk updates.
- Verify staff app on/off VPN, including refresh and connection consent for a
  second authorized operator and denial for a non-operator. Reboot VPN test remains
  necessary for private telemetry, not for staff connector DNS.
- Check the actual deployed artifact and pipeline run; a passing build is not live
  acceptance. Keep plan entries Verify until these results are captured.

If setup is incomplete, do not deploy. If a cutover fails, prefer fixing connector
or identity configuration while preserving the authorization boundary. A rollback
to the old package reintroduces legacy staff routes and exposed browser keys;
that requires an explicit decision, not an automatic fallback. Keep public prize
operations working and do not disable browser security or remove private DNS zones.

References: [Entra connector auth](https://learn.microsoft.com/en-us/connectors/custom-connectors/azure-active-directory-authentication),
[app roles](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps),
[Code Apps data connections](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/connect-to-data).
