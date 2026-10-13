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


## Epic #73 remaining work / Robot Arm #88
- Elevator #83 is ready in PR #110 (b93b81e), after browser/build validation and recovery from the approval-review usage limit.
- Added guarded cell and teach pendant. E-stop/servo/guard/key/circuit conditions gate simulated motion; no physical robot command or invented joint measurement.
- This is the final dedicated surface implementation. Combined validation and remaining foundation/live acceptance audit still required.
- Robot validation passed: all 60 fixtures, independent controls and every interlock, ON/OFF wins/QR/duplicates/rotation, stale data, reduced motion and narrow layout. Screenshots reviewed. Node 22 clean installs/builds pass for all three apps; 12,288 Pi/UI configurations agree. Elevator PR #110 CI passed. Combined and live validation remain.

## Epic #73 remaining work / Elevator #83
- Rechecked GitHub/main: PRs #106-109 remain open. Elevator and Robot Arm are the last unimplemented dedicated surfaces.
- Added shaft/car composition and independent door/brake/inspection states. Full final configuration gates simulated travel; no floor measurements or new puzzle mechanics.
- Started dedicated interlock, lifecycle and visual checks. Live remains Verify.
- Resumed after automatic approval-review usage limit; pending builds confirmed successful. All 60 fixtures and dedicated elevator interlock/win/isolation tests pass; kiosk/narrow screenshots reviewed. Node 22 clean installs/builds pass for all three apps, all 12,288 Pi/UI configurations agree. Live remains Verify.

## Epic #73 remaining work / EV Charger #82
- Cold-Chain #79 prepared in PR #108 (84f7334); Patient #107 CI passed. Started EV from current main, preserving independent PRs.
- Built charger/vehicle/cable schematic and readiness chain. Ground, contactor, billing and service-lock states independently reflect inputs; all ten requirements gate simulated energy motion.
- Corrected frontend win copy to describe charging controls, with no actual battery/rate claim. Testing in progress; live remains Verify.
- EV validation: all 60 fixture checks and dedicated independent-control/interlock/win/rotation suite pass. Kiosk/narrow screenshots reviewed. Node 22 clean installs/builds pass for all three apps; all 12,288 configurations agree. Cold-Chain PR #108 CI passed. Live remains Verify.

## Epic #73 remaining work / Cold-Chain Sensor #79
- Revalidated main and open PRs: Water Pump #106 and Patient Monitor #107 remain open; their changes are isolated from this branch.
- Added logger/probe/threshold/cloud composition, independent reading-control readiness and cloud sync. Temperature remains unmeasured; no fabricated trend or cloud receipt.
- Updated frontend win copy to confirm controls rather than assert cold storage stability. Testing in progress; live remains Verify.
- Cold-chain validation passed: all 60 fixtures plus independent calibration/threshold/cloud, both wins, QR, rotation, stale, Help Fix and narrow tests. Screenshots reviewed. Node 22 clean installs/builds pass for all three apps; 12,288 Pi/UI configurations agree. Patient PR #107 CI is also green.

## Epic #73 remaining work / Patient Monitor #85
- Water Pump #80 prepared separately in PR #106 (c310714), with local browser/build validation complete and live checks pending.
- Started Patient Monitor from current main. Added separate ECG/pulse demonstration traces, independent sensor states and alarm strip. Unknown/disconnected channels omit waveform; reduced motion freezes it.
- Corrected frontend win copy to avoid claiming actual vitals streaming. No Pi contracts or puzzle rules changed.
- Patient validation: 60 fixture checks and dedicated sensor/alarm/win/rotation suite pass; reviewed kiosk/narrow screenshots. Node 22 clean installs/builds pass for all three apps, and all 12,288 Pi/UI configurations agree. Live remains Verify. Epic checklist now reflects authoritative closed child issues.

## Epic #73 remaining work / Water Pump #80
- User requested all remaining epic issues. Revalidated GitHub/main: #87 merged; dedicated surfaces remain for #79, #80, #82, #83, #85, #88. #75-77 and #70 also remain open for completion audit/live checks.
- Started #80 pilot on feat/water-pump-surface from origin/main. Built semantic tank/relief/pump/outlet diagram and pressure preview; no physical identifiers or new puzzle rules.
- Full configuration gates simulated flow/impeller motion. Separate control status still explains incremental progress. Testing in progress.
- Water Pump validation: 60 mode/state fixtures, dedicated interlock/win/rotation suite, reduced motion and Help Fix pass. Reviewed 800x480/narrow screenshots. Node 22 clean installs/builds pass for all three apps; 12,288 contract configurations agree. Live remains Verify.


## Merge recovery after PR #106
- User merged Water Pump #106; shared registry, fixture selectors and documentation then conflicted in remaining PRs.
- Merged current main and all remaining mode work into feat/robot-arm-surface, preserving each dedicated component, test and note. Removed all remaining registry adapters.
- Built every intermediate combination successfully; all 12,288 contracts pass each time. Simulated squash-merge sequence showed sequential mode PRs would conflict again, so PR #111 is being consolidated to include all five remaining modes and supersede #107-110.
- Combined browser suites in progress. Do not claim production/live validation complete; #70 remains open.

## Issue #75 completion cleanup
- Clarified Help Fix final-configuration semantics; numbered actions do not require temporal order.
- Replaced stale cable UI assertions with Pi-map recipe and all-ten-control checks; expanded Help Fix fallback coverage to all twelve modes.
- Added prompt regression coverage to the prebuild contract checks. Validation in progress; live verification remains pending.
- Validation passed: 60 surface fixtures, all twelve Help Fix fallbacks, 12,288 configurations, 144 cable recipe pairs, and clean installs/production builds for Azure and the page. Inspected setup/help screenshots and skill-client state. Local Node 24; CI uses required Node 22.
- Remaining: merge/release through deploy-apps.yml and live Pi/page verification before closing #75.

## Issue #76 architecture cleanup
- Removed unused positional layouts, mutable helpers, adapter-only profile fields, and retired layout/physical-rail CSS.
- Updated active architecture guidance to the twelve-surface registry. Fixtures guard semantic telemetry reads against the mode contract.
- User will perform live Pi validation after deployment; retain Verify. Local checks in progress.
- Passed clean Azure/page installs and builds, 60 guarded surface fixtures, 12,288 configurations/144 cable recipes, and Game Mode ON/OFF completion/reset checks. Reviewed skill-client state and instrument/setup screenshots. CSS reduced from about 75 KB to 63 KB.
- Remaining: PR merge and normal CI deployment, then user Pi verification.

## MCP Quest Power Page UI
- User clarified this work belongs on `power pages/mcpquest`, not the Copilot IoT page.
- Added classic adventure styling, wizard/cave logo staging, Begin Mission warp transition, stronger contrast, and a sticky mission HUD with centered objective plus health-bar-style timer.
- Replaced placeholder build-stage icons with official Microsoft Power Platform/Copilot Studio SVGs and the official Microsoft Power BI SVG.
- Local MCP Quest production build passes. Browser verification covered the preview start/game HUD, seeded wizard completion, Begin Mission warp class toggle, and generated-game post-warp screen. No new console errors on the final pass.
- Home screen review iteration: converted the build-only start screen into a single quest-gate layout with sage dialogue, selected-system panel, all systems visible without an inner scrollbar, and the redundant rule list removed. Build passes; wide screenshots saved as `mcpquest-home-review.png` and `mcpquest-home-review-selected.png`.
- Added an 8-bit title gate before the home menu. Players now land on a retro `MCP Quest` push-start screen, then click/press start into the system-select menu. Build passes; title/menu screenshots saved as `mcpquest-title-review.png` and `mcpquest-after-start-review.png`.
- Revised the title gate from landscape art to a Power Platform pickup scene: `Andworx presents`, wider-spaced subtitle, official product logos as collectibles, and a small pixel player walking the pickup path. Build passes; updated screenshot saved as `mcpquest-title-review-pickups.png`.
- Selector screen updated to the same 8-bit aesthetic with a pixel-grid mission room, framed system tiles, all systems visible, and the player avatar in the bottom command strip. Reference screenshots moved to ignored `refrences/`; tracking issue created: https://github.com/Andworx/Copilot-IoT-Game/issues/328.
- Reworked the selector again into an 8-bit mission map: every mission marker is visible at once, selecting a marker moves the avatar to it, and the right panel shows mission details plus the Start Mission button. Build passes; screenshots saved as `refrences/mcpquest-selector-map-review.png` and `refrences/mcpquest-selector-map-selected-review.png`. Issue #328 was updated with this pass.
- Expanded the title and selector screens to use more of the viewport. Removed the selector's lantern portrait and duplicate chosen-quest card, then let the selected mission panel span the full right side from the top. Build passes and browser review has no console errors; screenshots saved as `refrences/mcpquest-title-expanded-review.png` and `refrences/mcpquest-selector-expanded-review.png`. Issue #328 was updated again.
- Started the mission screen redesign for build/generated missions. `CaseWorkspace` now opens with an 8-bit room map, selectable work-item markers, an avatar that moves to the selected marker, and a Begin Work gate before the existing designer/test controls appear. Build passes and browser review has no console errors; screenshots saved as `refrences/mcpquest-mission-room-review.png` and `refrences/mcpquest-mission-room-work-open-review.png`. Issue #328 was updated again.
- Adjusted the mission work-open state so the room collapses into a left-side mini-map and the selected work designer takes the majority of the screen. Build passes and browser review has no console errors; screenshot saved as `refrences/mcpquest-mission-mini-map-work-review.png`. Issue #328 was updated again.
- Updated the result/win screen to match the 8-bit quest theme with a quest-cleared room scene, pixel player, treasure chest, larger score readout, framed prize QR panel, and matching leaderboard treatment. Build passes and browser review has no console errors; screenshot saved as `refrences/mcpquest-win-8bit-review.png`. Issue #328 was updated again.
- Refined the win screen: removed the avatar and high-score panel, centered the result layout, matched the victory scene to the mission map's sand/peach paths, and placed the score on a compact plaque with a solid readable backdrop. Desktop/mobile browser review passed with no console errors or horizontal overflow. Screenshots: `refrences/mcpquest-win-8bit-clean-review.png` and `refrences/mcpquest-win-8bit-clean-mobile.png`. Leaderboard relocation remains pending design review.
- Installed the user-requested `8-bit-pixel-art-patterns` skill from TheOrcDev/8bitcn-ui into the local Codex skills directory. Read and applied it to a UI design review; added scoped MCP Quest agent instructions and `PIXEL_ART_GUIDE.md` for future iterations. Identified smooth button fills, rounded corners, conventional frames, and circular foliage as follow-up refinements. No runtime UI changes in this pass.
- Reviewed the saved title, selector, mini-map work, and refined win screenshots with the pixel-art skill and current source. Prioritized shared stepped frames/flat controls, readable color hierarchy, pixel terrain, numbered mini-map markers/integer avatar sizing, tighter title composition, and a compact victory header. Review recorded in `refrences/pixel-ui-review-issue.md` and issue #328; no runtime changes or new browser tests in this review pass.
- Release requested: clean installs/builds passed for the Function App, kiosk (twelve modes/12,288 configurations), and MCP Quest live bundle. Local Node 24; CI validates Node 22. Preparing an isolated UI PR from origin/main while preserving the original branch's unrelated Help Fix commits. Use the existing pinned MCP Quest deploy-apps.yml leg; live status remains Verify.
