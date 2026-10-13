# Help Fix prompt test set

Each block is the exact text the kiosk sends. `EXPECTED` is what the old deterministic list would return for the same state: use it to judge the agent's reply (order may vary; content must match).

## 1. All wrong, no cables (2 switches + 1 cable) (thermostat)

```
CURRENT_MODE: Smart Thermostat (thermostat), mode 1.
CURRENT_STATE:
Switch 1: OFF
Switch 2: ON
Switch 3: OFF
Switch 4: ON
Keyed switch 1: OFF
Keyed switch 2: ON
LAN 1: OPEN
LAN 2: OPEN
LAN 3: OPEN
LAN 4: OPEN
CABLES: none detected.
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
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
CURRENT_MODE: Smart Lock & Security Panel (smart-lock), mode 2.
CURRENT_STATE:
Switch 1: OFF
Switch 2: OFF
Switch 3: ON
Switch 4: OFF
Keyed switch 1: OFF
Keyed switch 2: OFF
LAN 1: OPEN
LAN 2: OPEN
LAN 3: OPEN
LAN 4: OPEN
CABLES: none detected.
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
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
CURRENT_MODE: Elevator Control Panel (elevator), mode 7.
CURRENT_STATE:
Switch 1: OFF
Switch 2: OFF
Switch 3: OFF
Switch 4: ON
Keyed switch 1: ON
Keyed switch 2: OFF
LAN 1: OPEN
LAN 2: OPEN
LAN 3: OPEN
LAN 4: OPEN
CABLES: none detected.
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
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
CURRENT_MODE: Industrial Robot Arm (industrial-robot-arm), mode 12.
CURRENT_STATE:
Switch 1: OFF
Switch 2: OFF
Switch 3: OFF
Switch 4: ON
Keyed switch 1: OFF
Keyed switch 2: OFF
LAN 1: OPEN
LAN 2: OPEN
LAN 3: OPEN
LAN 4: OPEN
CABLES: none detected.
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
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
CURRENT_MODE: Hospital Patient Monitor (patient-monitor), mode 9.
CURRENT_STATE:
Switch 1: OFF
Switch 2: ON
Switch 3: OFF
Switch 4: ON
Keyed switch 1: ON
Keyed switch 2: ON
LAN 1: OPEN
LAN 2: OPEN
LAN 3: OPEN
LAN 4: OPEN
CABLES: none detected.
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
```

EXPECTED:
1. Turn Switch 1 on
2. Turn Switch 3 on
3. Turn Keyed switch 2 off
4. Connect an RJ-45 patch cable between LAN 1 and LAN 3

## 6. Switches all correct, cables missing (ev-charger)

```
CURRENT_MODE: Smart EV Charger (ev-charger), mode 6.
CURRENT_STATE:
Switch 1: ON
Switch 2: ON
Switch 3: ON
Switch 4: ON
Keyed switch 1: ON
Keyed switch 2: OFF
LAN 1: OPEN
LAN 2: OPEN
LAN 3: OPEN
LAN 4: OPEN
CABLES: none detected.
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
```

EXPECTED:
1. Connect an RJ-45 patch cable between LAN 1 and LAN 2
2. Connect an RJ-45 patch cable between LAN 4 and LAN 3

## 7. Cables correct, switches all wrong (water-pump)

```
CURRENT_MODE: Water Pump Station Controller (water-pump), mode 4.
CURRENT_STATE:
Switch 1: OFF
Switch 2: OFF
Switch 3: OFF
Switch 4: ON
Keyed switch 1: ON
Keyed switch 2: OFF
LAN 1: CONNECTED
LAN 2: CONNECTED
LAN 3: CONNECTED
LAN 4: CONNECTED
CABLES: RJ-45 patch cable between LAN 1 and LAN 2; RJ-45 patch cable between LAN 4 and LAN 3
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
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
CURRENT_MODE: Smart EV Charger (ev-charger), mode 6.
CURRENT_STATE:
Switch 1: ON
Switch 2: ON
Switch 3: ON
Switch 4: ON
Keyed switch 1: ON
Keyed switch 2: OFF
LAN 1: CONNECTED
LAN 2: CONNECTED
LAN 3: OPEN
LAN 4: OPEN
CABLES: RJ-45 patch cable between LAN 1 and LAN 2
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
```

EXPECTED:
1. Connect an RJ-45 patch cable between LAN 4 and LAN 3

## 9. Wrong cable plugged in (needs removing + connecting) (field-radio)

```
CURRENT_MODE: Tactical Field Radio (field-radio), mode 5.
CURRENT_STATE:
Switch 1: ON
Switch 2: ON
Switch 3: ON
Switch 4: ON
Keyed switch 1: OFF
Keyed switch 2: ON
LAN 1: CONNECTED
LAN 2: OPEN
LAN 3: OPEN
LAN 4: CONNECTED
CABLES: RJ-45 patch cable between LAN 1 and LAN 4
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
```

EXPECTED:
1. Connect an RJ-45 patch cable between LAN 4 and LAN 2
2. Remove all other cables

## 10. Correct cables plus one extra cable (drone-ground-control)

```
CURRENT_MODE: Drone Ground Control (drone-ground-control), mode 11.
CURRENT_STATE:
Switch 1: ON
Switch 2: ON
Switch 3: ON
Switch 4: ON
Keyed switch 1: OFF
Keyed switch 2: ON
LAN 1: CONNECTED
LAN 2: CONNECTED
LAN 3: OPEN
LAN 4: CONNECTED
CABLES: RJ-45 patch cable between LAN 1 and LAN 4; RJ-45 patch cable between LAN 2 and LAN 4
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
```

EXPECTED:
1. Remove all other cables

## 11. Unrecognised link (cable null) with switches wrong (traffic-signal)

```
CURRENT_MODE: Traffic Signal Controller (traffic-signal), mode 8.
CURRENT_STATE:
Switch 1: OFF
Switch 2: OFF
Switch 3: OFF
Switch 4: ON
Keyed switch 1: OFF
Keyed switch 2: ON
LAN 1: CONNECTED
LAN 2: CONNECTED
LAN 3: OPEN
LAN 4: OPEN
CABLES: an unrecognised link between LAN 1 and LAN 2
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
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

## 12. Right cable plugged in reversed socket order, one switch still wrong (coldchain-sensor)

```
CURRENT_MODE: Cold-Chain Warehouse Sensor (coldchain-sensor), mode 3.
CURRENT_STATE:
Switch 1: OFF
Switch 2: OFF
Switch 3: ON
Switch 4: OFF
Keyed switch 1: ON
Keyed switch 2: ON
LAN 1: CONNECTED
LAN 2: OPEN
LAN 3: CONNECTED
LAN 4: OPEN
CABLES: RJ-45 patch cable between LAN 3 and LAN 1
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
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
CURRENT_MODE: Elevator Control Panel (elevator), mode 7.
CURRENT_STATE:
Switch 1: ON
Switch 2: ON
Switch 3: ON
Switch 4: ON
Keyed switch 1: OFF
Keyed switch 2: ON
LAN 1: CONNECTED
LAN 2: CONNECTED
LAN 3: OPEN
LAN 4: OPEN
CABLES: RJ-45 patch cable between LAN 1 and LAN 2
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
```

EXPECTED:
1. Turn Switch 4 off

## 14. Nearly done: switches correct, one cable left (industrial-robot-arm)

```
CURRENT_MODE: Industrial Robot Arm (industrial-robot-arm), mode 12.
CURRENT_STATE:
Switch 1: ON
Switch 2: ON
Switch 3: ON
Switch 4: OFF
Keyed switch 1: ON
Keyed switch 2: ON
LAN 1: OPEN
LAN 2: OPEN
LAN 3: OPEN
LAN 4: OPEN
CABLES: none detected.
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
```

EXPECTED:
1. Connect an RJ-45 patch cable between LAN 4 and LAN 3

## 15. Mixed: some switches wrong, one cable right, one wrong (smart-lock)

```
CURRENT_MODE: Smart Lock & Security Panel (smart-lock), mode 2.
CURRENT_STATE:
Switch 1: OFF
Switch 2: OFF
Switch 3: ON
Switch 4: OFF
Keyed switch 1: OFF
Keyed switch 2: OFF
LAN 1: CONNECTED
LAN 2: CONNECTED
LAN 3: OPEN
LAN 4: CONNECTED
CABLES: RJ-45 patch cable between LAN 1 and LAN 4; RJ-45 patch cable between LAN 1 and LAN 2
Using the restore manual for this mode, list what the player must change to restore this device. Reply with ONLY a numbered list. Each step must start with Turn, Connect, Disconnect, or Remove. No emojis, citations, markdown, preamble or explanation.
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

