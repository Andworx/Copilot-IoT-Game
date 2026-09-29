# Restore staff controls with a separate authenticated API

Status: staff backend deployed; owner confirmed connector GetKioskState HTTP 200. Real PAC binding generated in the follow-up PR; hosted Code App cutover still pending. Entra and connector
setup remains guided in the Portal; the owner requested automatic Function provisioning
on the next main release. Track [#177](https://github.com/Andworx/Copilot-IoT-Game/issues/177).
See [wiring and recorded progress](STAFF_API_WIRING.md). The existing app
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

Do not create this app manually. `deploy-apps.yml` runs
`infra/scripts/Deploy-StaffApi.ps1 -Mode Deploy` to preview and provision
`infra/staff-api.bicep` using `infra/staff-api.prod.json`. This creates Linux Node 22
**Flex Consumption** app `func-aw-azcom-iot-staff`, its FC1 plan and dedicated
`stawazcomiotstafffn` storage (names subject to availability). No always-ready
instances are configured. This adds consumption/storage cost, not an APIM fee.
Record the actual hostname returned by Azure, which may include a unique suffix;
do not assume it is `<name>.azurewebsites.net`.

Keep public HTTPS ingress enabled on this app, with no private endpoint. The
connector's cloud service must be able to reach it. Integrate its outbound network
with the existing compatible Flex integration subnet so it can reach private
SignalR. Preserve existing VNet DNS links and router forwarding rules. The Code
App calls the connector service, so its browser no longer resolves the staff
Function or connects directly to private SignalR.

ARM reads an explicit allowlist of Dataverse, SignalR and monitoring settings from
the existing game app; no manual secret copying is needed. Values are not printed
or written to runner files. The new app uses its own key-based host/deployment
storage, matching the existing Flex deployment model. Its system identity is not
currently used for Dataverse or storage authentication. Event Hub and Direct Line
settings are excluded, and only the public API surface registers telemetry.
See the wiring document for the exact allowlist and permissions.

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
bootstrap release in step 5. Share the
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

Use `.github/workflows/deploy-apps.yml` only. Before its first release, an IAM
administrator must grant the existing GitHub identity the reviewed provisioning
role; see [the one-time command and its scope](STAFF_API_WIRING.md#deployment-access).
The identity cannot grant itself that permission. Preserve its OIDC configuration.

1. Leave `STAFF_API_CUTOVER_READY` unset or `false`. Merge through a PR. The next
   main release previews/provisions the staff resources, deploys staff code and
   requires an unauthenticated request to return 401. It does not release the
   existing game app, Code App or Power Pages while this bootstrap flag is false.
2. Use the actual hostname in the job summary to finish the connector, operator
   role assignment, per-user connection and generated PAC binding. Commit the
   non-secret generated binding through a PR and validate it locally.
3. Set repository variable `STAFF_API_CUTOVER_READY=true` only when ready for the
   coordinated cutover. The next main release requires the real connector binding,
   deploys staff first, sets `API_SURFACE=public` on the existing game app, deploys
   that app, then the Code App and Power Pages. Subsequent releases retain this order.

Staff-only routes are absent from the public app after cutover. Remove the old
`CODE_APP_*_FUNCTION_KEY` GitHub secrets and
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

If connector setup is incomplete, keep cutover disabled. If a cutover fails, prefer fixing connector
or identity configuration while preserving the authorization boundary. A rollback
to the old package reintroduces legacy staff routes and exposed browser keys;
that requires an explicit decision, not an automatic fallback. Keep public prize
operations working and do not disable browser security or remove private DNS zones.

References: [Entra connector auth](https://learn.microsoft.com/en-us/connectors/custom-connectors/azure-active-directory-authentication),
[app roles](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps),
[Code Apps data connections](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/connect-to-data).
