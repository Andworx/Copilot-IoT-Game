# Help Fix prompt test set

Each block is the exact text the kiosk sends. `EXPECTED` is what the old deterministic list would return for the same state: use it to judge the agent's reply (order may vary; content must match).

## 1. All wrong, no cables (2 switches + 1 cable) (thermostat)

```
Panel quick-fix request.
CURRENT_MODE: Smart Thermostat (thermostat), mode 1.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. SW3 Toggle switch 1 - fan running: currently OFF, WRONG
2. S1 Socket S1 connected: currently OPEN, WRONG
3. SW1 Safety switch 1 - power: currently OFF, WRONG
4. S4 Socket S4 connected: currently OPEN, OK
5. SW5 Keyed switch 1: currently OFF, WRONG
6. S2 Socket S2 connected: currently OPEN, WRONG
7. SW2 Safety switch 2 - eco lockout: currently ON, WRONG
8. SW6 Keyed switch 2: currently ON, WRONG
9. S3 Socket S3 connected: currently OPEN, OK
10. SW4 Toggle switch 2 - heat/cool select: currently ON, WRONG
CABLES: No cables detected. A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Turn Switch 1 on
2. Turn Switch 2 off
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 off
7. Connect an RJ-45 patch cable between LAN 1 and LAN 2
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Turn Switch 1 on
2. Turn Switch 2 off
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 off
7. Connect an RJ-45 patch cable between LAN 1 and LAN 2

## 2. All wrong, no cables (smart-lock)

```
Panel quick-fix request.
CURRENT_MODE: Smart Lock & Security Panel (smart-lock), mode 2.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. S2 Socket S2 connected: currently OPEN, WRONG
2. SW5 Keyed switch 1 - service key: currently OFF, WRONG
3. SW2 Safety switch 2 - deadbolt: currently OFF, WRONG
4. S4 Socket S4 connected: currently OPEN, WRONG
5. SW1 Safety switch 1 - power: currently OFF, WRONG
6. SW4 Toggle switch 2 - alarm arm: currently OFF, WRONG
7. S1 Socket S1 connected: currently OPEN, WRONG
8. SW3 Toggle switch 1 - auto-lock: currently ON, WRONG
9. SW6 Keyed switch 2: currently OFF, WRONG
10. S3 Socket S3 connected: currently OPEN, WRONG
CABLES: No cables detected. A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 off
4. Turn Switch 4 on
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 on
7. Connect an RJ-45 patch cable between LAN 1 and LAN 4
8. Connect an RJ-45 patch cable between LAN 2 and LAN 3
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 off
4. Turn Switch 4 on
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 on
7. Connect an RJ-45 patch cable between LAN 1 and LAN 4
8. Connect an RJ-45 patch cable between LAN 2 and LAN 3

## 3. All wrong, no cables (largest cable set) (elevator)

```
Panel quick-fix request.
CURRENT_MODE: Elevator Control Panel (elevator), mode 7.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. SW2 Safety switch 2 - brake release: currently OFF, WRONG
2. S4 Socket S4 connected: currently OPEN, OK
3. SW6 Keyed switch 2 - inspection key: currently OFF, WRONG
4. S2 Socket S2 connected: currently OPEN, WRONG
5. SW1 Safety switch 1 - power: currently OFF, WRONG
6. SW3 Toggle switch 1 - doors closed: currently OFF, WRONG
7. S1 Socket S1 connected: currently OPEN, WRONG
8. SW5 Keyed switch 1: currently ON, WRONG
9. S3 Socket S3 connected: currently OPEN, OK
10. SW4 Toggle switch 2 - inspection mode: currently ON, WRONG
CABLES: No cables detected. A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect an RJ-45 patch cable between LAN 1 and LAN 2
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
7. Connect an RJ-45 patch cable between LAN 1 and LAN 2

## 4. Keyed switches involved, no cables (industrial-robot-arm)

```
Panel quick-fix request.
CURRENT_MODE: Industrial Robot Arm (industrial-robot-arm), mode 12.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. S4 Socket S4 connected: currently OPEN, WRONG
2. SW1 Safety switch 1 - main power: currently OFF, WRONG
3. SW6 Keyed switch 2 - teach pendant key: currently OFF, WRONG
4. S2 Socket S2 connected: currently OPEN, OK
5. SW3 Toggle switch 1 - servo enable: currently OFF, WRONG
6. S1 Socket S1 connected: currently OPEN, OK
7. SW5 Keyed switch 1 - cell access: currently OFF, WRONG
8. SW2 Safety switch 2 - E-stop reset: currently OFF, WRONG
9. S3 Socket S3 connected: currently OPEN, WRONG
10. SW4 Toggle switch 2 - guard door: currently ON, WRONG
CABLES: No cables detected. A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 on
7. Connect an RJ-45 patch cable between LAN 4 and LAN 3
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 on
7. Connect an RJ-45 patch cable between LAN 4 and LAN 3

## 5. Half the switches fixed, no cables (patient-monitor)

```
Panel quick-fix request.
CURRENT_MODE: Hospital Patient Monitor (patient-monitor), mode 9.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. SW5 Keyed switch 1 - nurse key: currently ON, OK
2. S3 Socket S3 connected: currently OPEN, WRONG
3. SW2 Safety switch 2 - leads connected: currently ON, OK
4. S1 Socket S1 connected: currently OPEN, WRONG
5. SW4 Toggle switch 2 - alarm audible: currently ON, OK
6. SW1 Safety switch 1 - power: currently OFF, WRONG
7. S4 Socket S4 connected: currently OPEN, OK
8. SW3 Toggle switch 1 - SpO2 sensor: currently OFF, WRONG
9. SW6 Keyed switch 2: currently ON, WRONG
10. S2 Socket S2 connected: currently OPEN, OK
CABLES: No cables detected. A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Turn Switch 1 on
2. Turn Switch 3 on
3. Turn Keyed switch 2 off
4. Connect an RJ-45 patch cable between LAN 1 and LAN 3
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Turn Switch 1 on
2. Turn Switch 3 on
3. Turn Keyed switch 2 off
4. Connect an RJ-45 patch cable between LAN 1 and LAN 3

## 6. Switches all correct, cables missing (ev-charger)

```
Panel quick-fix request.
CURRENT_MODE: Smart EV Charger (ev-charger), mode 6.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. S3 Socket S3 connected: currently OPEN, WRONG
2. SW1 Safety switch 1 - power: currently ON, OK
3. SW5 Keyed switch 1 - service lock: currently ON, OK
4. SW4 Toggle switch 2 - billing link: currently ON, OK
5. S1 Socket S1 connected: currently OPEN, WRONG
6. SW2 Safety switch 2 - contactor: currently ON, OK
7. S4 Socket S4 connected: currently OPEN, WRONG
8. SW6 Keyed switch 2: currently OFF, OK
9. SW3 Toggle switch 1 - ground check: currently ON, OK
10. S2 Socket S2 connected: currently OPEN, WRONG
CABLES: No cables detected. A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Connect an RJ-45 patch cable between LAN 1 and LAN 2
2. Connect an RJ-45 patch cable between LAN 4 and LAN 3
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Connect an RJ-45 patch cable between LAN 1 and LAN 2
2. Connect an RJ-45 patch cable between LAN 4 and LAN 3

## 7. Cables correct, switches all wrong (water-pump)

```
Panel quick-fix request.
CURRENT_MODE: Water Pump Station Controller (water-pump), mode 4.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. S4 Socket S4 connected: currently CONNECTED, OK
2. SW2 Safety switch 2 - pump enable: currently OFF, WRONG
3. SW5 Keyed switch 1: currently ON, WRONG
4. S1 Socket S1 connected: currently CONNECTED, OK
5. SW4 Toggle switch 2 - remote override: currently ON, WRONG
6. S2 Socket S2 connected: currently CONNECTED, OK
7. SW1 Safety switch 1 - power: currently OFF, WRONG
8. S3 Socket S3 connected: currently CONNECTED, OK
9. SW6 Keyed switch 2: currently OFF, WRONG
10. SW3 Toggle switch 1 - pressure relief: currently OFF, WRONG
CABLES: RJ-45 patch cable between LAN 1 and LAN 2; RJ-45 patch cable between LAN 4 and LAN 3 A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 on

## 8. Switches correct, one of two required cables present (ev-charger)

```
Panel quick-fix request.
CURRENT_MODE: Smart EV Charger (ev-charger), mode 6.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. S3 Socket S3 connected: currently OPEN, WRONG
2. SW1 Safety switch 1 - power: currently ON, OK
3. SW5 Keyed switch 1 - service lock: currently ON, OK
4. SW4 Toggle switch 2 - billing link: currently ON, OK
5. S1 Socket S1 connected: currently CONNECTED, OK
6. SW2 Safety switch 2 - contactor: currently ON, OK
7. S4 Socket S4 connected: currently OPEN, WRONG
8. SW6 Keyed switch 2: currently OFF, OK
9. SW3 Toggle switch 1 - ground check: currently ON, OK
10. S2 Socket S2 connected: currently CONNECTED, OK
CABLES: RJ-45 patch cable between LAN 1 and LAN 2 A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Connect an RJ-45 patch cable between LAN 4 and LAN 3
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Connect an RJ-45 patch cable between LAN 4 and LAN 3

## 9. Wrong cable plugged in (needs removing + connecting) (field-radio)

```
Panel quick-fix request.
CURRENT_MODE: Tactical Field Radio (field-radio), mode 5.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. SW6 Keyed switch 2 - crypto key: currently ON, OK
2. S2 Socket S2 connected: currently OPEN, WRONG
3. SW3 Toggle switch 1 - channel hop: currently ON, OK
4. S1 Socket S1 connected: currently CONNECTED, WRONG
5. SW1 Safety switch 1 - power: currently ON, OK
6. S4 Socket S4 connected: currently CONNECTED, OK
7. SW2 Safety switch 2 - encryption: currently ON, OK
8. SW5 Keyed switch 1: currently OFF, OK
9. S3 Socket S3 connected: currently OPEN, OK
10. SW4 Toggle switch 2 - transmit: currently ON, OK
CABLES: RJ-45 patch cable between LAN 1 and LAN 4 A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Connect an RJ-45 patch cable between LAN 4 and LAN 2
2. Remove all other cables
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Connect an RJ-45 patch cable between LAN 4 and LAN 2
2. Remove all other cables

## 10. Correct cables plus one extra cable (drone-ground-control)

```
Panel quick-fix request.
CURRENT_MODE: Drone Ground Control (drone-ground-control), mode 11.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. S2 Socket S2 connected: currently CONNECTED, WRONG
2. SW4 Toggle switch 2 - uplink: currently ON, OK
3. SW6 Keyed switch 2 - flight key: currently ON, OK
4. S1 Socket S1 connected: currently CONNECTED, OK
5. SW2 Safety switch 2 - GPS lock: currently ON, OK
6. S3 Socket S3 connected: currently OPEN, OK
7. SW1 Safety switch 1 - power: currently ON, OK
8. SW5 Keyed switch 1: currently OFF, OK
9. S4 Socket S4 connected: currently CONNECTED, OK
10. SW3 Toggle switch 1 - telemetry: currently ON, OK
CABLES: RJ-45 patch cable between LAN 1 and LAN 4; RJ-45 patch cable between LAN 2 and LAN 4 A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Remove all other cables
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Remove all other cables

## 11. Unrecognised link (cable null) with switches wrong (traffic-signal)

```
Panel quick-fix request.
CURRENT_MODE: Traffic Signal Controller (traffic-signal), mode 8.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. S1 Socket S1 connected: currently CONNECTED, OK
2. SW4 Toggle switch 2 - manual override: currently ON, WRONG
3. SW1 Safety switch 1 - power: currently OFF, WRONG
4. S3 Socket S3 connected: currently OPEN, WRONG
5. SW5 Keyed switch 1 - cabinet key: currently OFF, WRONG
6. SW2 Safety switch 2 - controller: currently OFF, WRONG
7. S2 Socket S2 connected: currently CONNECTED, OK
8. SW6 Keyed switch 2: currently ON, WRONG
9. SW3 Toggle switch 1 - timing plan: currently OFF, WRONG
10. S4 Socket S4 connected: currently OPEN, WRONG
CABLES: an unrecognised link between LAN 1 and LAN 2 A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 off
7. Connect an RJ-45 patch cable between LAN 1 and LAN 3
8. Connect an RJ-45 patch cable between LAN 4 and LAN 2
9. Remove all other cables
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 on
4. Turn Switch 4 off
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 off
7. Connect an RJ-45 patch cable between LAN 1 and LAN 3
8. Connect an RJ-45 patch cable between LAN 4 and LAN 2
9. Remove all other cables

## 12. Right cable plugged in reversed socket order (no cable action expected), switches wrong (coldchain-sensor)

```
Panel quick-fix request.
CURRENT_MODE: Cold-Chain Warehouse Sensor (coldchain-sensor), mode 3.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. SW4 Toggle switch 2 - cloud sync: currently OFF, WRONG
2. S3 Socket S3 connected: currently CONNECTED, OK
3. SW1 Safety switch 1 - power: currently OFF, WRONG
4. SW6 Keyed switch 2: currently ON, WRONG
5. S1 Socket S1 connected: currently CONNECTED, OK
6. SW2 Safety switch 2 - calibration: currently OFF, WRONG
7. S4 Socket S4 connected: currently OPEN, OK
8. SW5 Keyed switch 1: currently ON, WRONG
9. SW3 Toggle switch 1 - threshold: currently ON, WRONG
10. S2 Socket S2 connected: currently OPEN, OK
CABLES: RJ-45 patch cable between LAN 3 and LAN 1 A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 off
4. Turn Switch 4 on
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 off
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 off
4. Turn Switch 4 on
5. Turn Keyed switch 1 off
6. Turn Keyed switch 2 off

## 13. Nearly done: one switch left, cables correct (elevator)

```
Panel quick-fix request.
CURRENT_MODE: Elevator Control Panel (elevator), mode 7.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. SW2 Safety switch 2 - brake release: currently ON, OK
2. S4 Socket S4 connected: currently OPEN, OK
3. SW6 Keyed switch 2 - inspection key: currently ON, OK
4. S2 Socket S2 connected: currently CONNECTED, OK
5. SW1 Safety switch 1 - power: currently ON, OK
6. SW3 Toggle switch 1 - doors closed: currently ON, OK
7. S1 Socket S1 connected: currently CONNECTED, OK
8. SW5 Keyed switch 1: currently OFF, OK
9. S3 Socket S3 connected: currently OPEN, OK
10. SW4 Toggle switch 2 - inspection mode: currently ON, WRONG
CABLES: RJ-45 patch cable between LAN 1 and LAN 2 A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Turn Switch 4 off
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Turn Switch 4 off

## 14. Nearly done: switches correct, one cable left (industrial-robot-arm)

```
Panel quick-fix request.
CURRENT_MODE: Industrial Robot Arm (industrial-robot-arm), mode 12.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. S4 Socket S4 connected: currently OPEN, WRONG
2. SW1 Safety switch 1 - main power: currently ON, OK
3. SW6 Keyed switch 2 - teach pendant key: currently ON, OK
4. S2 Socket S2 connected: currently OPEN, OK
5. SW3 Toggle switch 1 - servo enable: currently ON, OK
6. S1 Socket S1 connected: currently OPEN, OK
7. SW5 Keyed switch 1 - cell access: currently ON, OK
8. SW2 Safety switch 2 - E-stop reset: currently ON, OK
9. S3 Socket S3 connected: currently OPEN, WRONG
10. SW4 Toggle switch 2 - guard door: currently OFF, OK
CABLES: No cables detected. A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Connect an RJ-45 patch cable between LAN 4 and LAN 3
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Connect an RJ-45 patch cable between LAN 4 and LAN 3

## 15. Mixed: some switches wrong, one cable right, one wrong (smart-lock)

```
Panel quick-fix request.
CURRENT_MODE: Smart Lock & Security Panel (smart-lock), mode 2.
TARGET: restoration checks the final switch positions and cable connections. Actions can be completed in any order; numbering is for readability only.
CURRENT_STATE:
1. S2 Socket S2 connected: currently CONNECTED, OK
2. SW5 Keyed switch 1 - service key: currently OFF, WRONG
3. SW2 Safety switch 2 - deadbolt: currently OFF, WRONG
4. S4 Socket S4 connected: currently CONNECTED, OK
5. SW1 Safety switch 1 - power: currently OFF, WRONG
6. SW4 Toggle switch 2 - alarm arm: currently OFF, WRONG
7. S1 Socket S1 connected: currently CONNECTED, OK
8. SW3 Toggle switch 1 - auto-lock: currently ON, WRONG
9. SW6 Keyed switch 2: currently OFF, WRONG
10. S3 Socket S3 connected: currently OPEN, WRONG
CABLES: RJ-45 patch cable between LAN 1 and LAN 4; RJ-45 patch cable between LAN 1 and LAN 2 A socket reads CONNECTED only while both ends of a cable are plugged in, so sockets connect and disconnect in pairs. Cable identity does not matter; the required LAN 1-LAN 4 socket pairs matter, and extra cables prevent restoration.
ACTIONS_TO_RETURN:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 off
4. Turn Switch 4 on
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 on
7. Connect an RJ-45 patch cable between LAN 2 and LAN 3
8. Remove all other cables
What must the player change to restore this device? Reply with ONLY the numbered ACTIONS_TO_RETURN list. Each action must start with Turn, Connect, Disconnect, or Remove. No emojis, no citations, no markdown, no preamble, no explanation.
```

EXPECTED:
1. Turn Switch 1 on
2. Turn Switch 2 on
3. Turn Switch 3 off
4. Turn Switch 4 on
5. Turn Keyed switch 1 on
6. Turn Keyed switch 2 on
7. Connect an RJ-45 patch cable between LAN 2 and LAN 3
8. Remove all other cables

