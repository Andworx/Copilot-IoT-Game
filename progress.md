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

## Issue #91: interactive System Map
- User requested implementing the Demo / Info System Map from the supplied screenshot and sibling repo.
- Replaced the Info mode list with Edge, Azure/Cloud and Power Platform architecture, 12 selectable components, connected-path highlighting and native detail dialogs. Includes real telemetry, mode polling, agent and prize paths; no unsupported Power Automate runtime.
- Gear exploration preserves the map across staff mode changes and reconnection; Return follows the latest known mode. Home/info snapshots retain the info page; normal live device routes continue to follow the server and non-exploration deviceChanged events.
- Browser tests cover all nodes, focus restoration/containment, read-only navigation, staff changes, wake refresh, mobile touch and 800x480 layout. Existing gameplay and recovery tests pass.
- System Map and existing gameplay/recovery browser suites pass; screenshots reviewed at kiosk and narrow sizes. Node 22 clean installs/builds pass for all three apps and all 12,288 mode contract states agree. Production validation remains Verify; feature PR prepared.

## Issue #78: Smart Lock surface
- Implemented dedicated door/frame, sliding deadbolt and security panel, replacing the keypad adapter. Explicit power/deadbolt/alarm/autolock/key bindings; independent incremental feedback.
- Door position and tamper are unmonitored because neither exists in telemetry; power loss and stale readings do not imply an unlocked door. No Pi or puzzle rule changes.
- Initial browser pass found vertical overlap at 800x480; compacted the surface. Gear setup remains the only physical target listing.
- All 60 surface fixtures and Smart Lock telemetry/completion tests pass, including stale data, reduced motion, Help Fix and narrow layout. Screenshots reviewed. Node 22 clean installs/builds pass for all three apps; all 12,288 Pi/UI contract states agree. Deployment/live validation remains Verify.

## Issue #86: Retail Payment Kiosk
- User requested the dedicated retail mode. Implemented payment-terminal silhouette plus independent reader, network and receipt-printer regions.
- Named Boolean equipment bindings preserve all existing switch/socket win rules. Power loss shows Unpowered; stale data shows Unknown.
- Full live restoration displays a clearly simulated test receipt marked NO PAYMENT TAKEN; reduced motion disables paper feed. Gear setup remains shared.
- Retail flow tests pass for partial repairs, independent subsystems, ON/OFF wins, QR, duplicate prevention, rotation and old-mode isolation; stale/reduced-motion/Help Fix/mobile checks pass. Screenshots reviewed. All 60 surface fixtures and Node 22 clean installs/builds pass for all three apps; all 12,288 Pi/UI contract states agree. Live validation remains Verify.

## Issue #84: Traffic Signal Controller
- Resumed after an automatic approval-review usage limit; user continued and read-only repository/GitHub access succeeded.
- Added top-down intersection and controller panel with named power/controller/timing/manual bindings, key readouts and explicit SIMULATED SIGNAL CYCLE labeling.
- Local phase timer alternates green/amber/all-red without conflicting directions; blocked/unknown states clear the heads. Reduced motion stops the timer and shows a static all-red preview. No measured timing or Pi rule changes.
- All 60 surface fixtures plus Traffic interlock, phase, reduced-motion, stale, Help Fix, narrow, ON/OFF completion and mode-isolation browser checks pass. Screenshots reviewed at 800x480 and narrow sizes. Node 22 clean installs/builds pass for all three apps and all 12,288 Pi/UI contract configurations agree. Live validation remains Verify.

## Issue #81: Field Radio
- Built rugged transceiver face with channel window, two-position read-only selector, encryption/transmit status and key readouts. RF bars are unfilled and explicitly unmeasured; no invented frequency or on-air claim.
- Independent control transitions, power loss, invalid input, ON/OFF completion, QR, duplicate prevention, rotation/isolation, stale data, reduced motion, Help Fix and narrow checks pass.
- Surface matrix found vertical overlap at 800x480; compacted window spacing and reran visual validation. All 60 surface fixtures and Node 22 clean installs/builds pass for all three apps; all 12,288 Pi/UI configurations agree. Final screenshots reviewed. Live validation remains Verify.

## Issue #100: device-facing labels
- User requested domain-only labels on all completed devices, with physical wiring identifiers hidden until players open help/setup.
- Removed SW prefixes from Thermostat, Smart Lock, Field Radio, Traffic Signal and Retail surfaces, plus physicalPin from the shared paired-column adapter. Replaced inline repair-action hints with neutral status text.
- Created #100 and linked it to epic #73. Updated #73, #70, #75-#88 bodies with the shared rule; added repository guidance and a 60-fixture visible/accessibility label regression check. Gear setup and Help Fix remain explicit opt-in mapping views.
- All 60 mode/state label/layout checks and updated Smart Lock/Traffic gameplay suites pass. Node 22 clean builds pass for all three apps; all 12,288 Pi/UI configurations agree. Screenshot reviewed. Production validation remains Verify.


## Issue #87: Drone Ground Control
- User requested a drone taking off on win. Added a clearly labeled simulation in both completion overlays, with a static airborne reduced-motion alternative.
- Dedicated ground station binds GPS, telemetry, uplink and power independently without measured flight data or physical identifiers. Shared setup/help and final configuration remain unchanged.
- Browser checks caught shared-theme cascade overriding the completion grid; strengthened scoped selectors to keep QR, animation and countdown visible at 800x480.
- Validation passed: all 60 surface fixtures, dedicated drone and shared kiosk win flows, visual review at 800x480 and narrow widths, and Node 22 clean installs/builds for all three apps. All 12,288 Pi/UI configurations agree. Issue #87 updated with takeoff acceptance criteria. Live validation remains Verify.


## Epic #73 remaining work / Cold-Chain Sensor #79
- Revalidated main and open PRs: Water Pump #106 and Patient Monitor #107 remain open; their changes are isolated from this branch.
- Added logger/probe/threshold/cloud composition, independent reading-control readiness and cloud sync. Temperature remains unmeasured; no fabricated trend or cloud receipt.
- Updated frontend win copy to confirm controls rather than assert cold storage stability. Testing in progress; live remains Verify.
- Cold-chain validation passed: all 60 fixtures plus independent calibration/threshold/cloud, both wins, QR, rotation, stale, Help Fix and narrow tests. Screenshots reviewed. Node 22 clean installs/builds pass for all three apps; 12,288 Pi/UI configurations agree. Patient PR #107 CI is also green.
