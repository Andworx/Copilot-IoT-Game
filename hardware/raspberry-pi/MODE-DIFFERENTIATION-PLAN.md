# Mode differentiation: issues #102 and #112

Status: implementation started; neither issue is closed or live-verified.

## Findings

The hardware LED test passed on 2026-09-22. All twelve playable JSON maps use
the same lamp rules. The kiosk computes its own domain lamp colors and does
not currently render the Pi's physical lamp pattern intent.

All twelve complete physical targets are distinct today. However SW1 is ON in
every mode, and some six-switch targets repeat. Changing a procedure's order
alone does not make a new puzzle: firmware evaluates the current state, not
whether the participant followed a particular sequence. Cable identity is
reported but is not part of the win predicate; an unknown/partially readable
cable can satisfy socket-presence rules. These are explicit redesign targets.

`1` means ON; `0` means OFF. Switch columns are SW1 through SW6 in order.

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
  yet. Existing hardware behavior and telemetry remain unchanged in this draft.

## Remaining implementation and verification

1. Inventory and J4 wiring confirmed by owner. Four-cable design and twelve
   distinct recipes are in [CABLE-BUILD-PLAN.md](CABLE-BUILD-PLAN.md); automated
   design tests pass. New cables still need building and live continuity checks.
2. Integrate `cable-build-plan.json` into the decoder and update J4's firmware
   mapping together. Retire historical IDs, reject partial/unknown cables, and
   implement exact recipe matching in Pi and kiosk together.
3. Author a distinct per-mode LED story with semantic labels and conditions.
   Keep a common all-four-solid restored cue; use a short nonblocking chase
   on mode change. Do not delay GPIO scanning or telemetry for the animation.
4. Integrate the lamp engine into the controller. Retain boolean `lamps` for
   compatibility; add `lampPatterns` with physical pin, semantic key, label,
   active state, and pattern. Broadcast changes of intent, not every blink edge.
5. Render that live intent in the kiosk, including blink timing and off/stale
   states. Keep physical mappings in gear setup/help per Power Pages conventions.
6. Revise switch roles, polarities, and cable requirements together in Pi maps,
   kiosk profiles, agent instructions, and manuals. Exhaustively test realizable
   cable placements and all 64 switch combinations. Require each mode to be
   solvable and every winning setup to fail the other eleven modes; document
   any consciously retained shared switch role.
7. Update the operator manual and regenerate/visually verify its PDF when the
   restoration procedures change. Run app builds and Python tests; review the
   PR, then deploy apps through CI and Pi firmware through its documented path.
8. Verify every mode on the panel and kiosk; keep issues open until that passes.

GPIO timing reference: [gpiozero LED API](https://gpiozero.readthedocs.io/en/stable/api_output.html#led).
Use LED blink for discrete patterns; smooth fades require a PWMLED and are not
part of this first implementation.
