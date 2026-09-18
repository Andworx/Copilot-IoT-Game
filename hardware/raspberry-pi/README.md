# Panel Pi — Restore & Spin

Python firmware for the physical control panel that drives the
[`restore-and-spin`](../../power%20pages/restore-and-spin/) kiosk game
(`GAME_MODE_PLAN.md` in that folder's parent — §0, §4, §11). This is the
**panel Pi**: it reads 6 physical switches (2 safety switches, 2 toggle
switches, and 2 keyed switches) and 4 panel-side connector jack inputs; drives
4 LEDs; and publishes state to Azure IoT Hub. It does
**not** drive the kiosk touchscreen — that's the separate "kiosk Pi" described
in `GAME_MODE_PLAN.md` §4, out of scope here.

## Relationship to the documented plan

`GAME_MODE_PLAN.md` §11 specifies a panel with **4 switches, 4 LEDs**, reused
across all 11 devices, with device-specific behavior in
`hardware/raspberry-pi/logic_maps/<slug>.json` files. This build adds two things the
plan didn't originally call for, per direct request:

- **6 physical switches** — SW1-SW2 are safety switches, SW3-SW4 are toggle
  switches, and SW5-SW6 are keyed switches. SW5-SW6 are panel utility inputs,
  not part of any device's win/lamp logic: SW5 re-arms/resyncs, SW6 runs a lamp
  self-test.
- **4 connector jacks (J1-J4)** — presence/continuity inputs (cable
  plugged in or not). They're published as telemetry (`connectors` in the
  payload) but don't currently feed into any device's `win` condition — no
  existing device profile in `deviceProfiles.ts` models a socket/cable
  concept. If you want a specific device's fault (e.g. patient-monitor's
  "Leads Check") to be fixed by plugging in a cable instead of flipping a
  switch, that's a small edit to that device's `logic_maps/<slug>.json` —
  flag it and it can be wired in.

**SW1-SW4 map positionally** to whichever device/mode the Power App has
selected — index 0 is "Power" on every single device in `deviceProfiles.ts`, so
SW1 is always the Power switch regardless of the selected mode; SW2-SW4 change
meaning per device. Likewise **LED1-LED4** map to `lamps[0..3]`.

## Known open item: telemetry payload schema

`GAME_MODE_PLAN.md` §1/§4 says this panel Pi is **already registered to Azure
IoT Hub** from the sibling `copilot-iot-service` project, and that this build
should add the selected device/mode fields "to the same payload already sent
for switch/LED state." That existing payload schema lives in
`copilot-iot-service`, which isn't in this repo/workspace, so the JSON shape
below is a reasonable new design, not a verified match to what the existing
Azure Function/`andy_iottelemetryevent` table already expects. Reconcile field
names with that project before wiring this into the live pipeline — see
"Telemetry payload" below. If downstream code still expects the previous
logical mode-index field name, map it to the Power App-selected mode rather
than to any physical selector.

## Parts list

| Qty | Part | Notes |
|---|---|---|
| 1 | Raspberry Pi 4 / 400 / 3B+ | 40-pin GPIO header. Pi 5 also works but needs `lgpio` — see "Pi 5" note below |
| 2 | Safety switches | SW1-SW2 |
| 2 | Toggle switches | SW3-SW4 |
| 2 | Keyed switches | SW5-SW6 |
| 4 | Single-color LEDs (5mm) + 330Ω resistors | LED1 blue, LED2 yellow, LED3 orange, LED4 green; one resistor each, LED cathode/resistor to GND |
| 4 | 4-pin panel-mount jacks/receptacles (e.g. 4P4C/RJ9 handset jack, or any 4-pin connector) | J1-J4 — these are the panel-side jack/receptacle inputs; wire only the listed signal contact on each receptacle: J1 pin 3, J2 pin 1, J3 pin 2, J4 pin 4 |
| 4+ | Demo cables / matching 4-pin plugs | Cable pinouts are documented below. They are independent of the Pi harness for now and do not change the J1-J4 receptacle wiring |
| — | Hookup wire, breadboard/perfboard, pull-up not needed (internal pull-ups used throughout) | |

## GPIO pinout (BCM numbering)

All inputs use the Pi's **internal pull-up**. Each switch wires its signal pin
to a GPIO and its return to GND. Each jack/receptacle wires only the listed
signal contact to a GPIO; no demo cable pinout changes the Pi harness for now.
No external resistors are needed except the LED current-limiting resistors.

| Function | Signal | BCM GPIO | Physical pin |
|---|---|---|---|
| Safety switch 1 (Power, all devices) | SW1 | GPIO5 | 29 |
| Safety switch 2 | SW2 | GPIO6 | 31 |
| Toggle switch 1 | SW3 | GPIO13 | 33 |
| Toggle switch 2 | SW4 | GPIO19 | 35 |
| Keyed switch 1 (utility: re-arm) | SW5 | GPIO26 | 37 |
| Keyed switch 2 (utility: self-test) | SW6 | GPIO21 | 40 |
| LED 1 (Blue) | LED1 | GPIO17 | 11 |
| LED 2 (Yellow) | LED2 | GPIO27 | 13 |
| LED 3 (Orange) | LED3 | GPIO22 | 15 |
| LED 4 (Green) | LED4 | GPIO23 | 16 |
| Connector 1 — receptacle pin 3 | J1 | GPIO24 | 18 |
| Connector 2 — receptacle pin 1 | J2 | GPIO25 | 22 |
| Connector 3 — receptacle pin 2 | J3 | GPIO12 | 32 |
| Connector 4 — receptacle pin 4 | J4 | GPIO16 | 36 |

**14 of the Pi's 26 usable GPIO pins used, 12 spare** (GPIO2, 3, 4, 7, 8, 9,
10, 11, 14, 15, 18, 20). GPIO0/1 (ID_SD/ID_SC, reserved for HAT EEPROM) are not
used. All pin assignments live in `config.py` — change them there, not in
`panel_controller.py`.

## Wiring diagram

Open the full draw.io wiring diagram in
[`panel-pi-wiring.drawio`](panel-pi-wiring.drawio). It shows the Pi header,
switch harness, LED harness, connector jack harness, and common ground rail.

### Text schematic

```
   GPIO5  ──[SW1 Safety switch 1]── GND      (Power switch)
   GPIO6  ──[SW2 Safety switch 2]── GND
   GPIO13 ──[SW3 Toggle switch 1]── GND
   GPIO19 ──[SW4 Toggle switch 2]── GND
   GPIO26 ──[SW5 Keyed switch 1]── GND       (utility: re-arm)
   GPIO21 ──[SW6 Keyed switch 2]── GND       (utility: self-test)

   GPIO17 ──[330Ω]──▶│── GND   (LED1 blue)
   GPIO27 ──[330Ω]──▶│── GND   (LED2 yellow)
   GPIO22 ──[330Ω]──▶│── GND   (LED3 orange)
   GPIO23 ──[330Ω]──▶│── GND   (LED4 green)

   GPIO24 ──[J1 receptacle pin 3]
   GPIO25 ──[J2 receptacle pin 1]
   GPIO12 ──[J3 receptacle pin 2]
   GPIO16 ──[J4 receptacle pin 4]
        (J1-J4 receptacle wiring stays Pi-side only for now)
```

### Connector wiring

Each 4-pin jack/receptacle uses **only one selected contact as the GPIO
signal** (pulled up internally). This is the Pi panel-side wiring only:

| Connector | Receptacle contact wired to Pi GPIO | Pi GPIO |
|---|---:|---|
| J1 | Pin 3 | GPIO24 |
| J2 | Pin 1 | GPIO25 |
| J3 | Pin 2 | GPIO12 |
| J4 | Pin 4 | GPIO16 |

Leave the other receptacle contacts open for now unless a future Pi-side common
return is intentionally added. The demo cable pinouts below are standalone cable
documentation and do not change the Pi wiring. This is presence/continuity only
— the firmware does not try to distinguish one cable from another (see "Known
open item" above for what a richer per-cable-identity design would need — an ID
resistor per cable plus an ADC, since the Pi has no built-in analog input).

### Demo cable pinouts

These cables are for the later demo bundle and are **independent of the Pi
harness for now**. They do not add wires to the Pi header or change the J1-J4
receptacle GPIO mapping above.

Because J1-J4 use all four possible receptacle contact positions, a 2-pin
Side A to 4-pin quad Side B cable can be built in **6 unique two-contact
combinations**:

| Cable | Pinout | J contacts covered | Notes |
|---|---|---|---|
| Cable 1 | Side A pin 1 to Side B pin 3<br>Side A pin 2 to Side B pin 4 | J1 and J4 | Matches the requested first cable format |
| Cable 2 | Side A pin 1 to Side B pin 3<br>Side A pin 2 to Side B pin 1 | J1 and J2 | Alternate pairing |
| Cable 3 | Side A pin 1 to Side B pin 3<br>Side A pin 2 to Side B pin 2 | J1 and J3 | Alternate pairing |
| Cable 4 | Side A pin 1 to Side B pin 1<br>Side A pin 2 to Side B pin 2 | J2 and J3 | Alternate pairing |
| Cable 5 | Side A pin 1 to Side B pin 1<br>Side A pin 2 to Side B pin 4 | J2 and J4 | Alternate pairing |
| Cable 6 | Side A pin 1 to Side B pin 2<br>Side A pin 2 to Side B pin 4 | J3 and J4 | Alternate pairing |

For the current standalone pinout documentation, these 6 cables are the build
list and no Pi GPIO or GND connection is assigned yet.

## Software design

- **`config.py`** — the only file with pin numbers. Change hardware wiring
  here, not in the rest of the code.
- **`safe_eval.py`** — evaluates each device's `win`/lamp `when` boolean
  expressions from a parsed AST (and/or/not/names only) — no `eval()` of
  untrusted strings, even though these JSON files are repo-authored and
  trusted.
- **`pulled_input.py`** — a raw-`lgpio` replacement for gpiozero's
  `Button`/`DigitalInputDevice` on every pulled-up input (switches and
  connectors). Confirmed on real hardware that gpiozero
  2.0.1.post3's `LGPIOFactory` records a `pull_up=True` request
  (`pin.pull` reports `"up"`) but never actually applies it — every
  floating input reads permanently low regardless of pull_up, while raw
  `lgpio` calls apply the same request correctly. Re-test against a plain
  `gpiozero.DigitalInputDevice`/`Button` before ever reverting this —
  if a future gpiozero release fixes the bug, this workaround can go.
- **`telemetry.py`** — a background-threaded Azure IoT Hub publisher (queued,
  non-blocking) so a slow/dropped network connection never stalls GPIO
  polling. Runs in console-only mode if `AZURE_IOT_CONNECTION_STRING` isn't
  set, for bench-testing without cloud credentials.
- **`panel_controller.py`** — the main loop: reads SW1-SW4 into
  that device's switch keys, evaluates `win` and each lamp's `when`
  expression, drives the 4 LEDs, and publishes telemetry on state change plus
  a 30s heartbeat. SW5/SW6 are handled as edge-triggered utility buttons
  outside the per-device logic.
- **`logic_maps/<slug>.json`** — one file per Power App-selectable device/mode
  (12 total, including `demo-info.json` for the intro state), each a direct
  transcription of that device's `fault`/`checkWin`/`computeLamps` from
  `power pages/restore-and-spin/src/data/deviceProfiles.ts`, collapsed from
  4-color lamps (off/green/amber/red) to lit/unlit per the single-color LED
  decision. **These are hand-ported and can drift from `deviceProfiles.ts`
  if one side changes — there's no shared source of truth yet.** If the web
  demo's fault/win logic changes, update the matching JSON file here too.

### Logic map schema

```json
{
  "slug": "thermostat",
  "label": "Smart Thermostat",
  "modeIndex": 2,
  "isGameDevice": true,
  "switches": [
    { "physicalPin": "SW1", "key": "power", "label": "Power" }
  ],
  "lamps": [
    { "physicalPin": "LED1", "key": "power", "label": "Power", "when": "power" }
  ],
  "win": "power and fan and not mode",
  "faultStartingState": { "power": true, "eco": true, "fan": false, "mode": true },
  "winMessage": "Thermostat restored — holding your set temperature."
}
```

`faultStartingState` isn't enforced by the firmware — the Pi can't move a
physical toggle switch. It's informational: a staff cheat-sheet for how to
manually re-arm the panel's real switches between attendees (print it, or
extend `panel_controller.py` to log it when the selected mode changes).

### Telemetry payload

Published to Azure IoT Hub on state change, a 30s heartbeat, Power App mode
change, and the moment a device is won:

```json
{
  "deviceSlug": "thermostat",
  "modeIndex": 2,
  "switches": { "power": true, "eco": false, "fan": true, "mode": false },
  "lamps": { "power": true, "heating": true, "cooling": false, "fault": false },
  "connectors": { "J1": false, "J2": true, "J3": false, "J4": false },
  "win": true,
  "eventType": "win",
  "timestamp": "2026-09-04T12:34:56.789012+00:00"
}
```

Reconcile this shape with whatever `copilot-iot-service`'s Azure Function
already expects for `andy_iottelemetryevent` before pointing this at the live
Function — see "Known open item" above.

## Setup

```bash
sudo apt update
sudo apt install -y python3-lgpio
cd hardware/raspberry-pi
python3 -m venv --system-site-packages .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in AZURE_IOT_CONNECTION_STRING
python3 panel_controller.py
```

`--system-site-packages` matters here: `lgpio` needs `swig` *and*
`liblgpio-dev` to compile from source via pip, neither of which is installed
by default. Raspberry Pi OS already ships a working prebuilt `python3-lgpio`
apt package — `--system-site-packages` just lets the venv see it, so `pip
install -r requirements.txt` finds it already satisfied instead of trying
(and failing) to build its own copy.

Bench-test without an IoT Hub connection string set — the panel still runs
the full switch/mode/LED logic and logs what it *would* publish.

### Deploying from a dev machine (scp)

`deploy.ps1` pushes this folder to the Pi over SSH — no `git` on the Pi
required. It copies everything except `.env`, `.git`, `__pycache__`, and
`.venv`, so it never clobbers the Pi's real IoT Hub connection string once
it's set:

```powershell
.\deploy.ps1 -PiHost pi@<pi-hostname-or-ip>
```

Add `-RestartService` once the systemd unit (below) is installed, to restart
the running panel process after pushing an update:

```powershell
.\deploy.ps1 -PiHost pi@<pi-hostname-or-ip> -RestartService
```

**First deploy only** — `deploy.ps1` only copies files; it doesn't install
anything remotely. After the first push, SSH in once and run the `Setup`
commands above (venv, `pip install`, copy `.env.example` to `.env` and fill
it in) plus the `Run on boot` steps below.

### Run on boot

```bash
sudo cp systemd/restore-and-spin-panel.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now restore-and-spin-panel.service
journalctl -u restore-and-spin-panel.service -f   # tail logs
```

Adjust `WorkingDirectory`/`ExecStart`/`EnvironmentFile` in the unit file if
this repo isn't cloned to `/home/pi/restore-and-spin`.

### Why `lgpio` (via apt) and not `RPi.GPIO`

This setup uses `lgpio`, not the older `RPi.GPIO` — and installs it from
`apt` (`python3-lgpio` + `--system-site-packages`), not from `pip`. Both
parts matter:

- **Why not `RPi.GPIO` at all:** this isn't just a Pi 5 thing — on current
  Raspberry Pi OS (Bookworm and later, on *any* Pi model), `RPi.GPIO`'s edge
  detection depends on the legacy sysfs GPIO interface, which fails there
  with `RuntimeError: Failed to add edge detection` the moment a `Button`
  (switch/connector) tries to attach a callback. `lgpio` uses the modern GPIO
  character-device interface instead, and `gpiozero` auto-detects and
  prefers it — no code changes needed, just make sure it's the one that's
  actually installed. Pi 5 additionally *requires* it, since `RPi.GPIO`'s C
  extension can't address its GPIO chip at all.
- **Why apt instead of `pip install lgpio`:** the pip package compiles a SWIG
  wrapper against the system `liblgpio` C library — it needs both `swig` and
  `liblgpio-dev` installed first, and even then it's rebuilding something
  Raspberry Pi OS already ships prebuilt. `sudo apt install python3-lgpio`
  plus a `--system-site-packages` venv gets the same result with no compiler
  involved.

## Testing without the real panel

Every input class (`Button`, `LED`, `DigitalInputDevice`/`DigitalOutputDevice`
from `gpiozero`) supports gpiozero's mock pin factory for running this off a
Pi entirely — set `GPIOZERO_PIN_FACTORY=mock` before running
`panel_controller.py` to exercise the switch/mode/LED logic on a dev machine
without any hardware attached (though there's no interactive way to flip a
mock pin from the CLI; it's mainly useful for unit-testing `safe_eval.py` and
the per-device logic maps in isolation).
