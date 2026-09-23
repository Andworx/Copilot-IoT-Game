# Panel Pi — Restore & Spin

Python firmware for the physical control panel that drives the
[`copilotiotgame`](../../power%20pages/copilotiotgame/) kiosk game. This is the
**panel Pi**: it reads 6 physical switches (2 safety switches, 2 toggle
switches, and 2 keyed switches) and scans 4 panel-side cable sockets; drives
4 LEDs; and publishes state to Azure IoT Hub. It does
**not** drive the kiosk touchscreen.

On startup, before the first mode loads, the Pi runs a fixed self-test
animation: all 4 LEDs light for 5 seconds, then it chases left to right
(LED1 blue → LED2 yellow → LED3 orange → LED4 green), one LED at a time. See
`PanelController._run_boot_animation` in `panel_controller.py`.

## Relationship to the playable modes

The panel has **12 playable modes** selected by the Power App/Page. The physical
rotary switch and CD74HC4067 mux are no longer part of the active design. Each
playable mode uses all 10 physical inputs exactly once in a unique restore
order:

- `SW1-SW2` — safety switches.
- `SW3-SW4` — toggle switches.
- `SW5-SW6` — keyed switches.
- `J1-J4` — panel-side cable sockets: `J1` and `J4` are quad (4-pin) sockets; `J2-J3`
  are double (2-pin) sockets. J4 wires only contacts 3 and 2. A socket reads as connected when a cable is
  plugged into it (see "Cable matrix" below).

The selected mode determines which real-world meaning each control has. The
same restore sequence is represented in the Power Pages `deviceProfiles.ts` data
and in the Pi `logic_maps/<slug>.json` files so the screen instructions and Pi
win logic stay aligned. **LED1-LED4** map to each mode's lamp expressions, and
each mode has its own LED story (which condition lights which lamp, steady or
blinking) so the panel gives a distinct visual cue per mode — see "Per-mode
LED behavior" below.

Use `RESTORE-MODES-MANUAL.md` as the operator-facing guide for restoring each
of the 12 playable modes during demos.

For a paginated manual, open the [print-ready PDF](../../output/pdf/RESTORE-MODES-MANUAL.pdf).
It is a 100-page participant handbook with seven pages per mode, diagnostic
guidance, control indexes, and record sheets. For the manual-versus-agent demo,
use the [facilitator guide](MANUAL-VS-AGENT-DEMO.md) and give participants the PDF,
not the concise Markdown source. Print single-sided on US Letter in portrait at
100% for a 100-sheet binder (or Fit on A4). After editing the procedures, regenerate
the PDF with `python hardware/raspberry-pi/build_restore_manual.py` (requires
`reportlab`) and check the page layout. Keep these links and the PDF current when
the restoration procedures change.

## Telemetry payload and the cloud pipeline

The payload below is consumed by this repo's `azure/` Function App (`iot-telemetry`
Event Hub trigger, `azure/src/lib/telemetry.ts`), which relays it to the kiosk over
SignalR and logs each state change and win to the `andy_iottelemetryevent` event log (the full
payload goes into its JSON `andy_payload` column). Keep the two in sync when the shape
changes. The sibling `copilot-iot-service` app expects an older payload
(`switches`/`actual_leds`/`active_rule`); if it still reads the same IoT Hub, point it at
its own consumer group and expect it to ignore or mis-handle these messages. If downstream
code still expects the previous logical mode-index field name, map it to the Power
App-selected mode rather than to any physical selector.

## Parts list

| Qty | Part | Notes |
|---|---|---|
| 1 | Raspberry Pi 4 / 400 / 3B+ | 40-pin GPIO header. Pi 5 also works but needs `lgpio` — see "Pi 5" note below |
| 2 | Safety switches | SW1-SW2 |
| 2 | Toggle switches | SW3-SW4 |
| 2 | Keyed switches | SW5-SW6 |
| 4 | Single-color LEDs (5mm) + 330Ω resistors | LED1 blue, LED2 yellow, LED3 orange, LED4 green; one resistor each, LED cathode/resistor to GND |
| 2 | Quad (4-pin) panel-mount jacks/receptacles | J1: contacts 1-4; J4: contacts 3 and 2 only |
| 2 | Double (2-pin) panel-mount jacks/receptacles | J2, J3: contacts 1-2 wired |
| 4 quad + 2 dual | Available cable connectors recorded in #112 | Inventory inclusion of the built Cable 1 awaits confirmation |
| 1 | Confirmed built cable: quad to dual | Quad 3 to dual 1; quad 4 to dual 2 |
| — | Hookup wire, breadboard/perfboard, pull-up not needed (internal pull-ups used throughout) | |

## GPIO pinout (BCM numbering)

All inputs use the Pi's **internal pull-up**. Each switch wires its signal pin
to a GPIO and its return to GND. The cable sockets are different: each wired
socket contact goes to its own GPIO and **nothing on a socket goes to GND**;
cables are detected by which contacts they bridge (see "Cable matrix").
No external resistors are needed except the LED current-limiting resistors.

| Function | Signal | BCM GPIO | Physical pin |
|---|---|---|---|
| Safety switch 1 (Power, all devices) | SW1 | GPIO5 | 29 |
| Safety switch 2 | SW2 | GPIO6 | 31 |
| Toggle switch 1 | SW3 | GPIO13 | 33 |
| Toggle switch 2 | SW4 | GPIO19 | 35 |
| Keyed switch 1 | SW5 | GPIO26 | 37 |
| Keyed switch 2 | SW6 | GPIO21 | 40 |
| LED 1 (Blue) | LED1 | GPIO17 | 11 |
| LED 2 (Yellow) | LED2 | GPIO27 | 13 |
| LED 3 (Orange) | LED3 | GPIO22 | 15 |
| LED 4 (Green) | LED4 | GPIO23 | 16 |
| J1 pin 1 | J1P1 | GPIO4 | 7 |
| J1 pin 2 | J1P2 | GPIO18 | 12 |
| J1 pin 3 | J1P3 | GPIO24 | 18 |
| J1 pin 4 | J1P4 | GPIO16 | 36 |
| J2 pin 1 | J2P1 | GPIO25 | 22 |
| J2 pin 2 | J2P2 | GPIO20 | 38 |
| J3 pin 1 | J3P1 | GPIO2 | 3 |
| J3 pin 2 | J3P2 | GPIO12 | 32 |
| J4 pin 3 | J4P3 | GPIO3 | 5 |
| J4 pin 2 | J4P2 | GPIO7 | 26 |

**20 of the Pi's 26 usable GPIO pins used, 6 spare** (GPIO8, 9, 10, 11, 14, 15 —
the SPI0 and UART pins, which this project has found unreliable as pulled-up
inputs; see `pulled_input.py`). GPIO0/1 (ID_SD/ID_SC, reserved for HAT EEPROM)
are not used. GPIO2/3 have board-level I2C pull-ups, which is fine here since
the cable scan only ever drives them low. GPIO7 has only been proven as an
output on this project, so bench-test J4 pin 2 first. All pin assignments live
in `config.py` — change them there, not in `panel_controller.py`.

## Wiring diagram

Open the full draw.io wiring diagram in
[`panel-pi-wiring.drawio`](panel-pi-wiring.drawio). It shows the Pi header,
switch harness, LED harness, cable socket matrix, and common ground rail.

### Text schematic

```
   GPIO5  ──[SW1 Safety switch 1]── GND      (Power switch)
   GPIO6  ──[SW2 Safety switch 2]── GND
   GPIO13 ──[SW3 Toggle switch 1]── GND
   GPIO19 ──[SW4 Toggle switch 2]── GND
   GPIO26 ──[SW5 Keyed switch 1]── GND
   GPIO21 ──[SW6 Keyed switch 2]── GND

   GPIO17 ──[330Ω]──▶│── GND   (LED1 blue)
   GPIO27 ──[330Ω]──▶│── GND   (LED2 yellow)
   GPIO22 ──[330Ω]──▶│── GND   (LED3 orange)
   GPIO23 ──[330Ω]──▶│── GND   (LED4 green)

   J1 (quad)                        J2 (double)
   GPIO4  ────[J1 pin 1]            GPIO25 ────[J2 pin 1]
   GPIO18 ────[J1 pin 2]            GPIO20 ────[J2 pin 2]
   GPIO24 ────[J1 pin 3]
   GPIO16 ────[J1 pin 4]            J3 (double)
                                    GPIO2  ────[J3 pin 1]
   J4 (quad)                      GPIO12 ────[J3 pin 2]
   GPIO3  ────[J4 pin 3]
   GPIO7  ────[J4 pin 2]
        (direct GPIO wiring, no series resistors; no socket contact goes to
         GND; cables bridge contacts to each other)
```

### Cable matrix

The four sockets J1-J4 detect **which cable is plugged in and where**, not just
whether something is plugged in. Every wired socket contact has its own GPIO and
nothing on a socket goes to GND. A cable only bridges contacts to each other.

| Socket | Connector | Wired contacts | Notes |
|---|---|---|---|
| J1 | Quad (4-pin) | pins 1, 2, 3, 4 | Unchanged; the only socket with all four contacts wired. |
| J2 | Double (2-pin) | pins 1, 2 | The contacts a 2-pin side A plug lands on. |
| J3 | Double (2-pin) | pins 1, 2 | Same. |
| J4 | Quad (4-pin) | pins 3, 2 | Contact 3 to GPIO3; contact 2 to GPIO7. Contacts 1/4 unwired. |

The GPIO for each contact is in the pinout table above and in
`config.SOCKET_NODES`. Leave unlisted contacts open.

**How it is read** (`cable_matrix.py`): every node idles as an input with a
pull-up. The scan drives one node low, reads the other nine, and repeats for
each node. A node that follows it low is wired to it through a cable. Only one
node is driven at a time, and only low, so a wrongly-plugged cable cannot short
two outputs together. A change is accepted after two identical scans in a row.
Bridges are grouped by socket pair and matched against the cable build list.
Two cables at once decode independently.

**What the controller reports:** `J1`-`J4` are true when a cable with at least
one visible wire is plugged into that socket, used for presence indicators. Winning also requires the exact cable recipe. The telemetry payload also carries
`cables: [{"cable": 1, "sockets": ["J1", "J2"]}]`. `cable` is `null` for
something the build list does not recognise, such as a cable with a broken wire.
A plug that lands only on unwired contacts (for example a side B plug using pin
3 in J2) reads as unplugged.

### Confirmed four-cable build plan (#112)

Cable 1 is already built. The owner confirmed **4 spare quad and 2 spare dual
connectors in addition to Cable 1**, and J4 is already wired on contacts 3/2.
Build two quad-to-dual cables and one quad-to-quad cable from that stock.

See [CABLE-BUILD-PLAN.md](CABLE-BUILD-PLAN.md) for the exact pinouts, valid
placements, twelve proposed mode use cases, and continuity checks. The wiring
diagram now includes a **Cable Build Plan** page with each wire drawn.
`cable-build-plan.json` is the tested design source.

The decoder reads the four builds from `cable-build-plan.json`. `config.py` maps
J4 contacts 3/2 to GPIO3/7. Each mode's `requiredCables` must match exactly before
its switch/socket expression can win. The page independently checks the recipe,
fresh telemetry, `cableSchema: "panel-cable-build/v1"`, and the Pi's win flag.
Setup and Help Fix name each cable and its socket pair. Unknown/extra cables
prevent a win even if socket-presence indicators look correct.

Deploy the page through CI before activating the new firmware. Old firmware
cannot win on the new page; this temporary mismatch fails closed. Restart the Pi
service after deploying the reviewed firmware, then verify the physical cables.

## Software design

- **`config.py`** — the only file with pin numbers. Change hardware wiring
  here, not in the rest of the code.
- **`safe_eval.py`** — evaluates each device's `win`/lamp `when` boolean
  expressions from a parsed AST (and/or/not/names only) — no `eval()` of
  untrusted strings, even though these JSON files are repo-authored and
  trusted.
- **`pulled_input.py`** — a raw-`lgpio` replacement for gpiozero's
  `Button`/`DigitalInputDevice` on every pulled-up switch input. Confirmed on real hardware that gpiozero
  2.0.1.post3's `LGPIOFactory` records a `pull_up=True` request
  (`pin.pull` reports `"up"`) but never actually applies it — every
  floating input reads permanently low regardless of pull_up, while raw
  `lgpio` calls apply the same request correctly. Re-test against a plain
  `gpiozero.DigitalInputDevice`/`Button` before ever reverting this —
  if a future gpiozero release fixes the bug, this workaround can go.
- **`cable_matrix.py`** — scans the 10 socket contacts (drive one low, read the
  rest), debounces, and decodes the bridges into per-socket presence and cable
  numbers. Its `CABLES` table loads the four-cable JSON build list. Tested off-Pi with
  `python -m unittest test_cable_matrix` (fake GPIO backend, no `lgpio`).
- **`telemetry.py`** — a background-threaded Azure IoT Hub publisher (queued,
  non-blocking) so a slow/dropped network connection never stalls GPIO
  polling. Runs in console-only mode if `AZURE_IOT_CONNECTION_STRING` isn't
  set, for bench-testing without cloud credentials.
- **`lamp_patterns.py`** — evaluates each lamp's `when` expression into an
  `{active, pattern}` state (`on`/`blink`/`fast_blink`), forcing all 4 lamps
  solid on the moment a mode is won, and drives gpiozero `LED`s so a blink
  only (re)starts when its requested pattern actually changes — not on every
  50ms GPIO scan. Kept independent of gpiozero so it's tested off-Pi with
  `python -m unittest test_lamp_patterns`.
- **`panel_controller.py`** — the main loop: runs the boot animation once at
  startup, then selects the active mode from the Power App/Page state, reads
  SW1-SW6 and J1-J4 (via the cable matrix) into that mode's restore keys,
  evaluates `win` and each lamp's `when`/`pattern` via `lamp_patterns.py`,
  drives the 4 LEDs, and publishes telemetry on mode change, state change,
  heartbeat, and win.
- **`logic_maps/<slug>.json`** — one file per Power App-selectable device/mode.
  There are 12 playable maps plus `demo-info.json` for the intro state. Each
  playable map includes a `restoreSequence` that mirrors
  `power pages/copilotiotgame/src/data/deviceProfiles.ts`.

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
    { "physicalPin": "LED1", "key": "power", "label": "Power", "when": "power", "pattern": "on" }
  ],
  "win": "power and fan and not mode",
  "faultStartingState": { "power": true, "eco": true, "fan": false, "mode": true },
  "winMessage": "Thermostat restored — holding your set temperature."
}
```

Each lamp's `when` is a restricted boolean expression (`and`/`or`/`not` over
switch/connector keys and `win` only — see `safe_eval.py`) and `pattern` is
`on` (steady, the default when omitted), `blink` (0.5s on/off), or
`fast_blink` (0.15s on/off — see `lamp_patterns.py`). The moment a mode is
won, all 4 lamps go solid on regardless of their individual `when`/`pattern`,
so the restored cue is identical across every mode.

`faultStartingState` isn't enforced by the firmware — the Pi can't move a
physical toggle switch. It's informational: a staff cheat-sheet for how to
manually re-arm the panel's real switches between attendees (print it, or
extend `panel_controller.py` to log it when the selected mode changes).

### Per-mode LED behavior

LED1 (blue, ready) is solid on whenever `power` is on, and LED4 (green,
restored) is solid on whenever `win` is true, in every mode. LED2 (yellow)
and LED3 (orange) carry each mode's own story:

| Mode | LED2 yellow | LED3 orange |
|---|---|---|
| coldchain-sensor | `threshold` fast-blinks (temperature alarm) | `cloudsync` + any socket blinks (syncing) |
| drone-ground-control | `not gps` blinks (acquiring lock) | `uplink` + any socket, solid |
| elevator | `inspection` blinks (inspection mode) | `doors` + any socket, solid (car ready) |
| ev-charger | `not ground` fast-blinks (ground fault) | `contactor` + any socket blinks (charging) |
| field-radio | `transmit` fast-blinks (on air) | `encryption` + any socket, solid (secure link) |
| industrial-robot-arm | `guard` fast-blinks (guard door open) | `servo` + any socket blinks (servo active) |
| patient-monitor | `not leads` blinks (leads not connected) | `alarm` and `spo2` fast-blinks (clinical alarm) |
| retail-kiosk | `not network` blinks (network searching) | `reader` and `printer` + any socket, solid |
| smart-lock | `alarm` fast-blinks (alarm armed) | `deadbolt` + any socket, solid |
| thermostat | `fan` blinks (fan running) | `not eco` + any socket, solid (climate active) |
| traffic-signal | `manual` fast-blinks (manual override) | `timing` + any socket blinks (signal cycling) |
| water-pump | `remote` blinks (remote override) | `pumpenable` + any socket fast-blinks (pump running) |

No two modes share an identical 4-lamp script (see
`test_logic_map_lamps.test_no_two_modes_share_an_identical_lamp_script`).
`demo-info` keeps all 4 lamps off (`when: "false"`) and is unaffected.

### Telemetry payload

Published to Azure IoT Hub on state change, a 30s heartbeat, Power App mode
change, and the moment a device is won:

```json
{
  "deviceSlug": "thermostat",
  "modeIndex": 2,
  "switches": { "power": true, "eco": false, "fan": true, "mode": false },
  "lamps": { "power": true, "fan_running": true, "climate_active": false, "restored": false },
  "lampPatterns": {
    "power": { "active": true, "pattern": "on" },
    "fan_running": { "active": true, "pattern": "blink" },
    "climate_active": { "active": false, "pattern": "on" },
    "restored": { "active": false, "pattern": "on" }
  },
  "connectors": { "J1": false, "J2": true, "J3": true, "J4": false },
  "cables": [{ "cable": 4, "sockets": ["J2", "J3"] }],
  "win": true,
  "eventType": "win",
  "timestamp": "2026-09-04T12:34:56.789012+00:00"
}
```

`lamps` (boolean, keyed by lamp `key`) is kept for existing consumers;
`lampPatterns` adds each lamp's `pattern` alongside `active` so the kiosk can
render the same blink intent the panel is showing. New fields need no schema
change: the event log stores the whole payload as JSON. See
"Telemetry payload and the cloud pipeline" above.

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
sudo systemctl enable systemd-time-wait-sync.service   # makes time-sync.target actually wait for NTP
sudo systemctl enable --now restore-and-spin-panel.service
journalctl -u restore-and-spin-panel.service -f   # tail logs
```

**Why the time-sync line matters.** The Pi has no battery-backed clock, so after power-up its
clock is wrong until NTP syncs (minutes later on a slow network; in one incident, hours). IoT Hub
authenticates the device with a time-based token, so a service that starts first is refused
("Connection Refused: not authorised") even though the key is right. The unit now waits for time
sync, and `telemetry.py` retries a refused connection with backoff (30s, 1m, 2m, then every 5m)
instead of staying offline until restarted. Check a Pi's credential and connectivity, without
printing the key, with `.venv/bin/python3 check_iot_connection.py`.

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
