# Pi Panel 12-Mode Restoration User Manual

**For reading and printing:** open the [print-ready PDF](../../output/pdf/RESTORE-MODES-MANUAL.pdf).
This maintainer source uses the same short action format shown in the Power Page and required from the Copilot Studio agent.

To rebuild the PDF, install Python's `reportlab` package and run `python hardware/raspberry-pi/build_restore_manual.py` from the repository root. The generator validates each action list against the Pi logic maps.

Use this guide to restore each playable mode on the physical Pi panel. The Power App/Page selects the mode; the Pi reads the six switches and four sockets.

> **Goal:** Follow the numbered steps for the selected mode. The mode is restored when LED4 turns green.

## Panel controls

| Control | Printed name | User action |
|---|---|---|
| SW1 | Switch 1 | Turn on or off as requested |
| SW2 | Switch 2 | Turn on or off as requested |
| SW3 | Switch 3 | Turn on or off as requested |
| SW4 | Switch 4 | Turn on or off as requested |
| SW5 | Keyed switch 1 | Turn on or off as requested |
| SW6 | Keyed switch 2 | Turn on or off as requested |
| J1 | J1 | Connect a cable or disconnect as requested |
| J2 | J2 | Connect a cable or disconnect as requested |
| J3 | J3 | Connect a cable or disconnect as requested |
| J4 | J4 | Connect a cable or disconnect as requested |

## LED guide

| LED | Color | Meaning |
|---|---|---|
| LED1 | Blue | Ready/power condition is active |
| LED2 | Yellow | Restoration is still in progress |
| LED3 | Orange | At least one socket is connected |
| LED4 | Green | Current mode is restored successfully |

## Demo cable build reference

Use this list when preparing the demo cables. Every cable has a 2-pin plug on Side A and a 4-pin quad plug on Side B, and every cable has a different wiring pattern, so the panel can tell them apart. Label both ends (for example `C7-A` and `C7-B`). `A1 to B3` means Side A pin 1 to Side B pin 3.

| Cable | Pinout | Where it plugs |
|---|---|---|
| Cable 1 | A1 to B3; A2 to B4 | B in J1; A in J2, J3 or J4 |
| Cable 2 | A1 to B3; A2 to B1 | B in J1; A in J2, J3 or J4 |
| Cable 3 | A1 to B3; A2 to B2 | B in J1; A in J2, J3 or J4 |
| Cable 4 | A1 to B1; A2 to B2 | Any two sockets |
| Cable 5 | A1 to B1; A2 to B4 | B in J1; A in J2, J3 or J4 |
| Cable 6 | A1 to B2; A2 to B4 | B in J1; A in J2, J3 or J4 |
| Cable 7 | A1 to B4; A2 to B3 | B in J1; A in J2, J3 or J4 |
| Cable 8 | A1 to B1; A2 to B3 | B in J1; A in J2, J3 or J4 |
| Cable 9 | A1 to B2; A2 to B3 | B in J1; A in J2, J3 or J4 |
| Cable 10 | A1 to B2; A2 to B1 | Any two sockets |
| Cable 11 | A1 to B4; A2 to B1 | B in J1; A in J2, J3 or J4 |
| Cable 12 | A1 to B4; A2 to B2 | B in J1; A in J2, J3 or J4 |

## Before each run

1. Select the intended mode in the Power App/Page.
2. Ask the player to follow only the numbered steps for that mode.
3. Confirm LED4 turns green before starting the next mode.

## Mode restore procedures

### Mode 1: Smart Thermostat

**Device slug:** `thermostat`

1. Turn Switch 1 on
2. Turn Switch 2 off
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 off
7. Connect a cable to J1 and J2
8. Disconnect J3
9. Disconnect J4

**Success check:** Smart Thermostat restored.

### Mode 2: Smart Lock & Security Panel

**Device slug:** `smart-lock`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 off
4. Turn Switch 4 on
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 on
7. Connect a cable to J3 and J4
8. Disconnect J1
9. Disconnect J2

**Success check:** Smart Lock & Security Panel restored.

### Mode 3: Cold-Chain Warehouse Sensor

**Device slug:** `coldchain-sensor`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 off
4. Turn Switch 4 on
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 off
7. Connect a cable to J1 and J2
8. Disconnect J3
9. Disconnect J4

**Success check:** Cold-Chain Warehouse Sensor restored.

### Mode 4: Water Pump Station Controller

**Device slug:** `water-pump`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect a cable to J2 and J4
8. Disconnect J1
9. Disconnect J3

**Success check:** Water Pump Station Controller restored.

### Mode 5: Tactical Field Radio

**Device slug:** `field-radio`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 on
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect a cable to J2 and J3
8. Disconnect J1
9. Disconnect J4

**Success check:** Tactical Field Radio restored.

### Mode 6: Smart EV Charger

**Device slug:** `ev-charger`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 on
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 off
7. Connect a cable to J1 and J4
8. Disconnect J2
9. Disconnect J3

**Success check:** Smart EV Charger restored.

### Mode 7: Elevator Control Panel

**Device slug:** `elevator`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect a cable to J1 and J2
8. Disconnect J3
9. Disconnect J4

**Success check:** Elevator Control Panel restored.

### Mode 8: Traffic Signal Controller

**Device slug:** `traffic-signal`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 off
7. Connect a cable to J1 and J3
8. Disconnect J2
9. Disconnect J4

**Success check:** Traffic Signal Controller restored.

### Mode 9: Hospital Patient Monitor

**Device slug:** `patient-monitor`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 on
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 off
7. Connect a cable to J1 and J2
8. Disconnect J3
9. Disconnect J4

**Success check:** Hospital Patient Monitor restored.

### Mode 10: Retail Payment Kiosk

**Device slug:** `retail-kiosk`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 on
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect a cable to J3 and J4
8. Disconnect J1
9. Disconnect J2

**Success check:** Retail Payment Kiosk restored.

### Mode 11: Drone Ground Control

**Device slug:** `drone-ground-control`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 on
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect a cable to J1 and J4
8. Disconnect J2
9. Disconnect J3

**Success check:** Drone Ground Control restored.

### Mode 12: Industrial Robot Arm

**Device slug:** `industrial-robot-arm`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 on
7. Connect a cable to J2 and J3
8. Disconnect J1
9. Disconnect J4

**Success check:** Industrial Robot Arm restored.