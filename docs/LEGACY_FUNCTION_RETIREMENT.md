# Retiring the original IoT dashboard Function App

`func-aw-iot-copilot` served the original `iot-panel-dashboard`. The owner
confirmed on 2026-09-29 that it is no longer used. It is not part of the claw
machine and the current game uses `func-aw-azcom-iot-game` instead.

## Exact retirement scope

The following resources are dedicated to the retired app:

- Function App `func-aw-iot-copilot`
- Consumption plan `EastUSPlan` (inventory found no other apps on it)
- Storage account `stfuncawiotcopilot`
- Application Insights component `func-aw-iot-copilot`
- Smart detector alert `Failure Anomalies - func-aw-iot-copilot`
- Event Hub consumer group `funcapp` on `evhns-aw-iot-copilot/iot-telemetry`

Do not delete the linked Log Analytics workspace in `DefaultResourceGroup-EUS`;
it is outside this retirement scope and may contain other telemetry.

## Safe sequence

1. Deploy the Event Hub private-access change from the Infrastructure workflow.
2. Confirm the Pi still sends events and the current kiosk receives updates.
3. Stop `func-aw-iot-copilot` and observe the current game through the agreed
   validation window. Stopping is reversible.
4. Delete the empty `funcapp` consumer group.
5. Delete the Function App. Retain Application Insights and storage until their
   desired evidence/retention period has elapsed.
6. Delete the dedicated plan, storage, Application Insights component and smart
   detector alert. Remove their reference snapshots in the same cleanup PR.

The infrastructure deploy identity intentionally cannot delete the legacy app or
its storage. These steps require an operator with explicit access and should not
be folded into the normal game deployment.
