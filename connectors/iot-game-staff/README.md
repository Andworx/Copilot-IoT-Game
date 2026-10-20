# IoT Game staff connector

`openapi.json` defines the staff API's operations. It is a template: replace the
host, tenant and API client ID placeholders in a local import copy before creating
the connector. No credentials belong in this file. The API requires v2 delegated
Entra tokens with `Staff.Access`, the `Game.Operator` role, and the configured
connector client ID.

Use the [manual setup runbook](../../docs/STAFF_API_SETUP.md). Each operator creates
their own OAuth connection; do not share an administrator's authenticated connection.
PAC then generates connection metadata for the existing Code App. Review and retain
non-secret binding metadata in source so CI can build the same app. Keep secrets,
tokens and machine-local credentials out of Git.

Responses intentionally preserve the existing JSON contracts. The code app uses
the SDK result directly, without browser requests to Azure/private DNS. Staff
presentation screens poll drawing state; no staff winner details are broadcast on
the publicly negotiable kiosk SignalR hub.

Update this README and the operation definitions together when API contracts change.

## Deployment (source of truth)

The connector is solution-aware (in `CopilotIoTGame`) and is deployed from this folder:

- `openapi.json`: operations. `apiProperties.json`: Entra OAuth settings. Both use placeholders.
- `azure/infrastructure/scripts/Deploy-StaffConnector.ps1` fills in the staff host and the Entra IDs from
  `azure/infrastructure/staff-api.prod.json`, then runs `pac connector create` (first run) or
  `pac connector update` (finds the connector by display name, `IoT Game Staff API`).
- `deploy-apps.yml` runs it as the `deploy-connector` job when anything here changes, after the backend and
  before the Code App. Locally: `./azure/infrastructure/scripts/Deploy-StaffConnector.ps1` with an
  authenticated PAC profile (`-RenderOnly` just writes the rendered files for inspection).
- The OAuth client secret is never in source. Set the optional repository secret `STAFF_CONNECTOR_CLIENT_SECRET`
  to have the workflow send it; otherwise the connector keeps the secret stored on it in Power Platform.

Adding an operation is now: add it to `openapi.json`, add it to `staffOperations` or
`optionalStaffOperations` in the Code App's `src/apiConfig.ts`, and merge. Then regenerate the Code App binding
(`pac code add-data-source --apiId <shared_...> --connectionId <id>`) and commit `.power/schemas`.

## Operations added after the first release

- `PlinkoGameMode` (`POST /api/plinko-game-mode`): the Plinko switch and bucket icon picker.
- `GetCampaigns` (`GET /api/campaigns`) and `UpdateCampaign` (`POST /api/campaign-update`): the Campaigns
  screen, the staff view of the Prize Engine app's "Campaign to Source" connections (Source Cap rows) and each
  campaign's Max Entries per Contact. `UpdateCampaign` takes `{ campaignId, maxEntries }` (1-100) or
  `{ campaignId, sourceId, linked }`; unlinking deactivates the Source Cap so past Grand Prize Entries keep their rule.

The Code App treats these as optional until the connector has them.
