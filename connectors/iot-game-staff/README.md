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

## Adding the Plinko Game Mode operation

`PlinkoGameMode` (`POST /api/plinko-game-mode`, body `{ station, gameModeActive? }`) powers the Plinko
switch in Game Box Control. It was added after the connector was first registered, so the Code App treats
it as optional: until the connector has it, everything else works and the Plinko card says it needs an
update. To enable it:

1. In the Power Platform maker portal, edit the existing custom connector and add the
   `/plinko-game-mode` POST operation from `openapi.json` (or re-import the definition).
2. Update the connector's operation list in the Code App binding (`pac code add-data-source`) and keep the
   regenerated non-secret `.power/schemas` files in source.
3. Deploy the staff Function App (it ships with the app release workflow).
