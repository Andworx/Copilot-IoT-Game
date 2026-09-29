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
