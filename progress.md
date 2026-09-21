Original prompt: begin working 75 and then 76 then 77. we will then add a pr to push these updates to the page then push the updates to the pi

- Isolated feature worktree from origin/main; original model/hardware edits preserved.
- #75: derive visible main switches from physical restore sequences; reconcile semantic indicators for all twelve modes. Win rules unchanged.
- Implementation complete for #75, #76, #77; live validation remains pending.

- #76: typed registry, explicit legacy bindings, connection freshness, deterministic fixtures, shared status/input primitives. Removed fake random time series. Contract checks pass; TypeScript passes. Browser setup in progress (port 5183; skill Chromium download required).

- #76 validated: 60 browser fixtures at 800x480, narrow viewport, reduced motion, read-only taps, and Help Fix. Skill client screenshot/text state inspected. Registry and adapters ready for thermostat pilot.

- #77: circular HVAC face, separate mode/fan/power/eco indicators; no invented measurements. Fixed instrument overlap after screenshot inspection.
- Validation: all 60 mode/state fixtures at 800x480, narrow screen, reduced motion, read-only taps, Help Fix; mocked real-route SignalR verifies HVAC transitions, Game Mode ON/OFF, QR, one win, reset/rotation, and old-mode isolation.
- Node 22 locked installs and production builds passed for Azure, Code Site, and Game Box Control. Final frontend build repeated after spacing fix.
- Release remains pending: PR review/merge, production Actions run and live validation; then inspect installed Pi version before any firmware push. No Pi source or win rules changed.

## Connection recovery follow-up
- User reported the deployed thermostat deep link waiting for Pi, with WebSocket 1006 and ERR_NETWORK_IO_SUSPENDED.
- Live diagnosis: pi@iotcase publishes Cold-Chain Sensor heartbeats; Azure Functions and SignalR receive them; portal CORS is allowed. Installed Pi restore contract matches. No firmware change needed.
- New branch fix/kiosk-connection-recovery from deployed main. Added startup retries, unbounded capped reconnect retries, resume state refresh, honest connection status, and live-mode deep-link synchronization.
- Recovery and completion browser tests pass, including startup failure, >4 reconnect attempts, wake mode/flag refresh, fresh-reading gate, and stale snapshot race. Production builds passed with Node 22; all 12,288 contract states still pass.
- PR pending; deployment/live recovery validation remains Verify. No Pi, Azure infrastructure, or browser settings changed.

## Gear setup popup follow-up
- User confirmed controls/live connection work and requested removing the bottom panel rail, replacing it with required switch/cable setup in the gear menu.
- Shared modal derives all ten requirements from each mode restoreSequence; native dialog supports keyboard containment, Escape, Close, and gear focus return. Main instruments no longer render PhysicalInputs.
- All 60 fixtures plus gameplay and reconnection browser tests passed. Screenshot reviewed at 800x480.
- Created System Map Demo / Info issue #91 using the supplied screenshot and reference Infrastructure.tsx; recorded shared UI direction on epic #73.
- Production deployment and live validation remain Verify.
