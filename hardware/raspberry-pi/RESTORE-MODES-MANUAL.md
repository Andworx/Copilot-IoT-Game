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
| S1 | S1 | Connect a cable or disconnect as requested |
| S2 | S2 | Connect a cable or disconnect as requested |
| S3 | S3 | Connect a cable or disconnect as requested |
| S4 | S4 | Connect a cable or disconnect as requested |

## LED guide

At startup, all 4 LEDs light for 5 seconds, then chase left to right
(LED1 → LED2 → LED3 → LED4) before the first mode loads — a self-test, not a
game state.

| LED | Color | Meaning |
|---|---|---|
| LED1 | Blue | Ready/power condition is active (same in every mode) |
| LED2 | Yellow | Mode-specific alert or progress cue — steady or blinking; see the per-mode LED table in `README.md` |
| LED3 | Orange | Mode-specific socket/system cue — steady or blinking; see the per-mode LED table in `README.md` |
| LED4 | Green | Current mode is restored successfully (same in every mode; forces all 4 LEDs solid on) |

LED2 and LED3's exact condition and color-blink pattern differ by mode — that
is intentional, so each mode has its own recognisable look on the panel. Only
LED4 green is a universal completion signal; don't use LED2/LED3 as a
generic step counter.

## Demo cable build reference

Four cables total, including the already-built Cable 1. Cable numbers and socket
pairs must both match the selected mode. Unknown or extra cables prevent a win.

| Cable | Pinout | Where it plugs |
|---|---|---|
| Cable 1 | Side A Quad Pin 3 - Side B Dual Pin 1<br>Side A Quad Pin 4 - Side B Dual Pin 2 | Side A in S1; Side B in S2/S3 |
| Cable 2 | Side A Quad Pin 3 - Side B Dual Pin 1<br>Side A Quad Pin 2 - Side B Dual Pin 2 | Side A in S1/S4; Side B in S2/S3 |
| Cable 3 | Side A Quad Pin 2 - Side B Quad Pin 3<br>Side A Quad Pin 3 - Side B Quad Pin 2 | S1 to S4, reversible |
| Cable 4 | Side A Quad Pin 1 - Side B Dual Pin 1<br>Side A Quad Pin 2 - Side B Dual Pin 2 | Side A in S1; Side B in S2/S3 |

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
7. Connect Cable 1 Side A (quad) to S1 and Side B (dual) to S2
8. Remove all other cables

**Success check:** Smart Thermostat restored.

### Mode 2: Smart Lock & Security Panel

**Device slug:** `smart-lock`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 off
4. Turn Switch 4 on
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 on
7. Connect Cable 2 Side A (quad) to S1 and Side B (dual) to S3
8. Remove all other cables

**Success check:** Smart Lock & Security Panel restored.

### Mode 3: Cold-Chain Warehouse Sensor

**Device slug:** `coldchain-sensor`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 off
4. Turn Switch 4 on
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 off
7. Connect Cable 1 Side A (quad) to S1 and Side B (dual) to S3
8. Remove all other cables

**Success check:** Cold-Chain Warehouse Sensor restored.

### Mode 4: Water Pump Station Controller

**Device slug:** `water-pump`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect Cable 4 Side A (quad) to S1 and Side B (dual) to S2
8. Connect Cable 2 Side A (quad) to S4 and Side B (dual) to S3
9. Remove all other cables

**Success check:** Water Pump Station Controller restored.

### Mode 5: Tactical Field Radio

**Device slug:** `field-radio`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 on
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect Cable 2 Side A (quad) to S4 and Side B (dual) to S2
8. Remove all other cables

**Success check:** Tactical Field Radio restored.

### Mode 6: Smart EV Charger

**Device slug:** `ev-charger`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 on
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 off
7. Connect Cable 1 Side A (quad) to S1 and Side B (dual) to S2
8. Connect Cable 2 Side A (quad) to S4 and Side B (dual) to S3
9. Remove all other cables

**Success check:** Smart EV Charger restored.

### Mode 7: Elevator Control Panel

**Device slug:** `elevator`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect Cable 4 Side A (quad) to S1 and Side B (dual) to S2
8. Remove all other cables

**Success check:** Elevator Control Panel restored.

### Mode 8: Traffic Signal Controller

**Device slug:** `traffic-signal`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 off
7. Connect Cable 1 Side A (quad) to S1 and Side B (dual) to S3
8. Connect Cable 2 Side A (quad) to S4 and Side B (dual) to S2
9. Remove all other cables

**Success check:** Traffic Signal Controller restored.

### Mode 9: Hospital Patient Monitor

**Device slug:** `patient-monitor`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 on
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 off
7. Connect Cable 4 Side A (quad) to S1 and Side B (dual) to S3
8. Remove all other cables

**Success check:** Hospital Patient Monitor restored.

### Mode 10: Retail Payment Kiosk

**Device slug:** `retail-kiosk`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 on
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect Cable 2 Side A (quad) to S1 and Side B (dual) to S2
8. Remove all other cables

**Success check:** Retail Payment Kiosk restored.

### Mode 11: Drone Ground Control

**Device slug:** `drone-ground-control`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 on
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect Cable 3 between S1 and S4 (reversible; either side can go into either socket)
8. Remove all other cables

**Success check:** Drone Ground Control restored.

### Mode 12: Industrial Robot Arm

**Device slug:** `industrial-robot-arm`

1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 on
7. Connect Cable 2 Side A (quad) to S4 and Side B (dual) to S3
8. Remove all other cables

**Success check:** Industrial Robot Arm restored.