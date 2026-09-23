# Mode differentiation: issues #102 and #112

Status: #102's lamp engine is now wired into the controller with a distinct
per-mode LED script and a boot self-test animation; not yet live-verified on
hardware. #112 (cable integration) is unaffected by this update. Neither
issue is closed.

## Findings

The hardware LED test passed on 2026-09-22. All twelve playable JSON maps use
the same lamp rules. The kiosk computes its own domain lamp colors and does
not currently render the Pi's physical lamp pattern intent.

Before cable integration, all twelve complete physical targets were distinct. However SW1 is ON in
every mode, and some six-switch targets repeat. Changing a procedure's order
alone does not make a new puzzle: firmware evaluates the current state, not
whether the participant followed a particular sequence. Cable integration now requires an exact recipe; unknown or partially readable
cables no longer satisfy the win condition.

`1` means ON; `0` means OFF. Switch columns are SW1 through SW6 in order. The table below records the
pre-integration baseline; current cable targets are in CABLE-BUILD-PLAN.md.

| Mode | Switch target | Connected sockets |
|---|---|---|
| coldchain-sensor | 110100 | J1, J2 |
| drone-ground-control | 111101 | J1, J4 |
| elevator | 111001 | J1, J2 |
| ev-charger | 111110 | J1, J4 |
| field-radio | 111101 | J2, J3 |
| industrial-robot-arm | 111011 | J2, J3 |
| patient-monitor | 111110 | J1, J2 |
| retail-kiosk | 111101 | J3, J4 |
| smart-lock | 110111 | J3, J4 |
| thermostat | 101010 | J1, J2 |
| traffic-signal | 111010 | J1, J3 |
| water-pump | 111001 | J2, J4 |

## First implementation

- #112: README and wiring diagram reflect J4 quad contact 3 to GPIO3 and
  contact 2 to GPIO7; J1/J2/J3 unchanged. Record 4 quad / 2 dual cable connectors
  and the already built Cable 1 (quad 3 to dual 1, quad 4 to dual 2).
- #102: `lamp_patterns.py` adds restricted boolean condition evaluation,
  steady/slow-blink/fast-blink intent, common all-solid restored behavior, and
  GPIO driving that does not restart background blinking every scan.
- Unit tests cover condition evaluation, invalid patterns, repeated scans,
  restored overrides, reset, and the existing cable decoder.
- The new lamp engine is deliberately not wired into the running controller
  yet. Cable integration is implemented separately; LED behavior remains unchanged.

## Remaining implementation and verification

1. Inventory and J4 wiring confirmed by owner. Four-cable design and twelve
   distinct recipes are in [CABLE-BUILD-PLAN.md](CABLE-BUILD-PLAN.md); automated
   design tests pass. New cables still need building and live continuity checks.
2. Implemented: four-cable decoder, J4 mapping, exact Pi/kiosk recipes, explicit
   setup/help, schema gate and updated manuals. Verify after coordinated rollout.
3. ✅ Authored a distinct per-mode LED story with semantic labels and
   conditions in every playable `logic_maps/<slug>.json` (LED1 power/LED4 win
   stay universal; LED2/LED3 use each mode's own switches, with `blink`/
   `fast_blink` where an alert fits). Kept the common all-four-solid restored
   cue (forced by `lamp_patterns.evaluate_lamps(..., restored=win)`).
   Added instead of the planned mode-change chase: a one-time boot
   animation (`PanelController._run_boot_animation` — all 4 LEDs on 5s, then
   a left-to-right chase) since that's what was actually requested; a
   per-mode-change chase is still open if wanted later. Neither delays GPIO
   scanning or telemetry — the boot animation runs once before the loop
   starts, and mode changes only call `LampDriver.reset()`.
4. ✅ Integrated the lamp engine into the controller
   (`panel_controller.py` now imports `lamp_patterns.LampDriver`/
   `evaluate_lamps`). Kept boolean `lamps` for compatibility; added
   `lampPatterns` (physical pin's semantic key → `{active, pattern}`) to the
   telemetry payload. `LampDriver` only calls gpiozero `on`/`off`/`blink`
   when the requested pattern changes, not every 50ms scan.
5. Render that live intent in the kiosk, including blink timing and off/stale
   states. Keep physical mappings in gear setup/help per Power Pages conventions.
   Not yet done — the kiosk's `computeLamps` in `deviceProfiles.ts` still
   simulates its own lamp colors independently of `lampPatterns`.
6. Revise switch roles, polarities, and cable requirements together in Pi maps,
   kiosk profiles, agent instructions, and manuals. Exhaustively test realizable
   cable placements and all 64 switch combinations. Require each mode to be
   solvable and every winning setup to fail the other eleven modes; document
   any consciously retained shared switch role.
7. Updated `README.md` (per-mode LED table, boot animation, lamp schema,
   telemetry payload) and `RESTORE-MODES-MANUAL.md` (LED guide is now
   mode-specific, points to the README table; `build_restore_manual.py`'s
   generic LED2/LED3 copy no longer claims one universal meaning). The
   restoration procedures (switches/cables/win) themselves did not change, so
   the 100-page PDF's content is still accurate on substance, but it has not
   been regenerated/visually re-verified since `reportlab` isn't installed in
   this environment — do that (`python build_restore_manual.py`) before
   closing out documentation. Added `test_logic_map_lamps.py` covering lamp
   validity, uniqueness, and the restored-state override; run app builds and
   Python tests, review the PR, then deploy apps through CI and Pi firmware
   through its documented path.
8. Verify every mode and the boot animation on the panel and kiosk; keep
   issues open until that passes.

GPIO timing reference: [gpiozero LED API](https://gpiozero.readthedocs.io/en/stable/api_output.html#led).
Use LED blink for discrete patterns; smooth fades require a PWMLED and are not
part of this first implementation.
