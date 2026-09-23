# Four-cable build and mode plan

Design verified against the connector inventory confirmed on 2026-09-22:
**Cable 1 already built, plus 4 spare quad and 2 spare dual connectors.**
S4 wiring is confirmed by the owner: contact 3 to GPIO3, contact 2 to GPIO7.
S1/S2/S3 are unchanged. S4 contacts 1 and 4 remain unwired.

[Readable cable pinout diagram](cable-build-plan.png)

## Build schedule

A and B are cable end labels, not viewing directions. Use the connector's molded
contact numbers; do not infer solder-side positions from a front-view sketch.
Only like types mate: quad ends use S1/S4; dual ends use S2/S3. No adapters.
Each cable contains two separate wires, with no join between them and no ground.

| Cable | Status | A end to B end | Separate wires |
|---|---|---|---|
| 1 | Already built | quad to dual | A3 - B1; A4 - B2 |
| 2 | Build next | quad to dual | A3 - B1; A2 - B2 |
| 3 | Build next | quad to quad | A2 - B3; A3 - B2 |
| 4 | Build next | quad to dual | A1 - B1; A2 - B2 |

Cable 1 is unchanged: quad 3 to dual 1, quad 4 to dual 2.
Cable 2 consumes 1 quad + 1 dual. Cable 3 consumes 2 quad.
Cable 4 consumes 1 quad + 1 dual. Total new parts: **4 quad + 2 dual; zero left**.
The complete four-cable set contains 5 quad + 3 dual ends including Cable 1.
Label both ends C1-C4; additionally label C3-A and C3-B for continuity checks.
C3 works in either orientation because its 2/3 crossover is symmetric.

## Valid placements

| Cable | Fully detected placements | What happens elsewhere |
|---|---|---|
| C1 | Quad in S1, dual in S2 or S3 | Quad in S4 exposes only one wire: unknown, not valid |
| C2 | Quad in S1 or S4, dual in S2 or S3 | Every mechanically matching placement is fully readable |
| C3 | Between S1 and S4, either direction | No other matching pair of quad sockets exists |
| C4 | Quad in S1, dual in S2 or S3 | Quad in S4 exposes only one wire: unknown, not valid |

S2-S3 cannot be connected by this set because none is dual-to-dual.
This is intentional: using the available stock for two new quad-to-dual cables
and one quad-to-quad cable gives nine distinct single-cable states, plus pairs
of cables on disjoint sockets. Do not force quad plugs into dual sockets.

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
| retail-kiosk | C2 S1-S2 | Route the payment communications link through the local controller. |
| smart-lock | C2 S1-S3 | Reconnect the credential-reader communications link. |
| traffic-signal | C1 S1-S3 + C2 S4-S2 | Restore both the detector loop and the remote coordination link. |
| water-pump | C4 S1-S2 + C2 S4-S3 | Restore local pressure feedback and remote pump permission together. |

## Verification and rollout

`python -m unittest test_cable_build_plan -v` checks inventory, contact ranges,
all mechanically possible placements, reversed ends, unique electrical signatures,
missing-wire rejection, and all twelve recipes (including socket conflicts and
attempts to reuse a cable). This is an electrical model, not a continuity test.

Before using a newly built cable, check both intended wires end-to-end and check
that there is no cross-short. Then scan every intended placement on the Pi and
confirm both expected raw bridges. Test C1/C4 in S4 as unknown-cable cases.

The diagram's **Cable Build Plan** page contains the pinouts. The JSON plan is
the machine-readable runtime catalogue. Pi and page now require exact cable IDs
and socket pairs, with no extra/unknown cables. S4's firmware map uses contacts
3/2. The page requires the new cable schema and a current Pi win signal, so old
firmware cannot accidentally award a win using historical cable IDs.

Implementation is ready for PR review. Deployment and physical continuity/live
validation remain pending; build Cables 2-4 using the pinouts above.
