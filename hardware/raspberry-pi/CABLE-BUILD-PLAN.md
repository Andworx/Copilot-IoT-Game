# Five-cable build and mode plan

Design verified against the connector inventory confirmed on 2026-09-22:
**Cable 1 and Cable 3 already built, plus 1 spare quad, 1 spare triple, and 4 spare dual connectors needed for the remaining cables.**
S4 will move to a triple socket. S4 triple contact 2 maps to GPIO3 and
triple contact 3 maps to GPIO7. S1/S2/S3 are unchanged. S4 contact 1 remains unwired.

[Readable cable pinout diagram](cable-build-plan.png)

## Build schedule

A and B are cable end labels, not viewing directions. Use the connector's molded
contact numbers; do not infer solder-side positions from a front-view sketch.
Only like types mate: quad ends use S1; triple ends use S4; dual ends use S2/S3. No adapters.
Each cable contains two separate wires, with no join between them and no ground.

| Cable | Status | A end to B end | Separate wires |
|---|---|---|---|
| 1 | Already built | quad to dual | A3 - B1; A4 - B2 |
| 2 | Build next | triple to dual | A2 - B1; A3 - B2 |
| 3 | Already built | quad to triple | A2 - B2; A3 - B3 |
| 4 | Build next | quad to dual | A1 - B1; A2 - B2 |
| 5 | Build next | dual to dual | A1 - B1; A2 - B2 |

Cable 1 is unchanged: quad 3 to dual 1, quad 4 to dual 2.
Cable 3 is now documented for the replacement S4 triple socket: quad side A goes to S1,
triple side B goes to S4. Cable 2 consumes 1 triple + 1 dual. Cable 4 consumes
1 quad + 1 dual. Cable 5 consumes 2 dual ends. Total new cable ends: **1 quad +
1 triple + 4 dual**.
The complete five-cable set contains 3 quad + 2 triple + 3 dual ends including
Cable 1 and Cable 3. Label both ends C1-C5; additionally label C3-A/C3-B and
C5-A/C5-B for continuity checks.

## Valid placements

| Cable | Fully detected placements | What happens elsewhere |
|---|---|---|
| C1 | Quad in S1, dual in S2 or S3 | Does not mate with triple S4 |
| C2 | Triple in S4, dual in S2 or S3 | Every mechanically matching placement is fully readable |
| C3 | Side A quad in S1, Side B triple in S4 | Does not reverse because the end types differ |
| C4 | Quad in S1, dual in S2 or S3 | Does not mate with triple S4 |
| C5 | Between S2 and S3, either direction | No other matching pair of dual sockets exists |

This is intentional: replacing S4 with triple keeps S4 distinct from S2/S3 while
Cable 5 preserves twelve distinct mode recipes. Do not force quad plugs into
dual or triple sockets.

## Proposed mode use cases

Require the **exact** listed cable IDs and socket pairs, with no extra or unknown
cable. These recipes are all different even before switch positions are checked.
They describe simulated device stories, not real patient/vehicle wiring.

| Mode | Required cable recipe | Device story |
|---|---|---|
| thermostat | C1 S1-S2 | Reconnect the room sensor to the controller. |
| coldchain-sensor | C1 S1-S3 | Connect the refrigerated cargo probe rather than the room sensor port. |
| elevator | C4 S1-S2 | Restore local landing-position feedback. |
| patient-monitor | C4 S1-S3 | Restore the patient data lead to its acquisition port. |
| drone-ground-control | C3 S1-S4 | Cross-connect the ground station and flight-link interlock. |
| ev-charger | C1 S1-S2 + C2 S4-S3 | Connect both the vehicle pilot and remote authorization links. |
| field-radio | C2 S4-S2 | Restore the remote radio control link. |
| industrial-robot-arm | C2 S4-S3 | Reconnect the remote teach-pendant interlock. |
| retail-kiosk | C5 S2-S3 | Route the payment communications link through the local controller. |
| smart-lock | C3 S1-S4 + C5 S2-S3 | Reconnect the credential-reader communications link. |
| traffic-signal | C1 S1-S3 + C2 S4-S2 | Restore both the detector loop and the remote coordination link. |
| water-pump | C4 S1-S2 + C2 S4-S3 | Restore local pressure feedback and remote pump permission together. |

## Verification and rollout

`python -m unittest test_cable_build_plan -v` checks inventory, contact ranges,
all mechanically possible placements, reversed ends, unique electrical signatures,
missing-wire rejection, and all twelve recipes (including socket conflicts and
attempts to reuse a cable). This is an electrical model, not a continuity test.

Before using a newly built or revised cable, check both intended wires end-to-end and check
that there is no cross-short. Then scan every intended placement on the Pi and
confirm both expected raw bridges. Test C1/C4 in S4 as non-mating/unknown-cable cases.

The diagram's **Cable Build Plan** page contains the pinouts. The JSON plan is
the machine-readable runtime catalogue. Pi and page now require exact cable IDs
and socket pairs, with no extra/unknown cables. S4's firmware map uses contacts
3/2. The page requires the new cable schema and a current Pi win signal, so old
firmware cannot accidentally award a win using historical cable IDs.

Implementation is ready for PR review. Deployment and physical continuity/live
validation remain pending; build Cables 2, 4, and 5 using the pinouts above.
