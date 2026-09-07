# Panel Pi — Restore & Spin

Python firmware for the physical control panel that drives the
[`restore-and-spin`](../../power%20pages/restore-and-spin/) kiosk game
(`GAME_MODE_PLAN.md` in that folder's parent — §0, §4, §11). This is the
**panel Pi**: it reads the 12-position dial, 6 toggle switches, and 4
connector jacks; drives 4 LEDs; and publishes state to Azure IoT Hub. It does
**not** drive the kiosk touchscreen — that's the separate "kiosk Pi" described
in `GAME_MODE_PLAN.md` §4, out of scope here.

## Relationship to the documented plan

`GAME_MODE_PLAN.md` §11 specifies a panel with **4 switches, 4 LEDs**, reused
across all 11 devices, with device-specific behavior in
`hardware/raspberry-pi/logic_maps/<slug>.json` files. This build adds two things the
plan didn't originally call for, per direct request:

- **2 extra switches (SW5, SW6)** — panel utility buttons, not part of any
  device's win/lamp logic: SW5 re-arms/resyncs, SW6 runs a lamp self-test.
- **4 connector jacks (J1-J4)** — presence/continuity inputs (cable
  plugged in or not). They're published as telemetry (`connectors` in the
  payload) but don't currently feed into any device's `win` condition — no
  existing device profile in `deviceProfiles.ts` models a socket/cable
  concept. If you want a specific device's fault (e.g. patient-monitor's
  "Leads Check") to be fixed by plugging in a cable instead of flipping a
  switch, that's a small edit to that device's `logic_maps/<slug>.json` —
  flag it and it can be wired in.

**SW1-SW4 map positionally** to whichever device's `switches[0..3]` are
active for the current dial position — index 0 is "Power" on every single
device in `deviceProfiles.ts`, so SW1 is always the Power switch regardless of
dial position; SW2-SW4 change meaning per device. Likewise **LED1-LED4** map
to `lamps[0..3]`.

## Known open item: telemetry payload schema

`GAME_MODE_PLAN.md` §1/§4 says this panel Pi is **already registered to Azure
IoT Hub** from the sibling `copilot-iot-service` project, and that this build
should add `deviceSlug`/`dialPosition` fields "to the same payload already
sent for switch/LED state." That existing payload schema lives in
`copilot-iot-service`, which isn't in this repo/workspace, so the JSON shape
below is a reasonable new design, not a verified match to what the existing
Azure Function/`andy_iottelemetryevent` table already expects. Reconcile field
names with that project before wiring this into the live pipeline — see
"Telemetry payload" below.

## Parts list

| Qty | Part | Notes |
|---|---|---|
| 1 | Raspberry Pi 4 / 400 / 3B+ | 40-pin GPIO header. Pi 5 also works but needs `lgpio` — see "Pi 5" note below |
| 6 | SPDT toggle or slide switches | SW1-SW6 |
| 4 | Single-color LEDs (5mm) + 330Ω resistors | LED1-LED4, one resistor each, LED cathode/resistor to GND |
| 4 | 4-pin panel-mount jacks (e.g. 4P4C/RJ9 handset jack, or any 4-pin connector) | J1-J4 — only 1 of the 4 pins is wired into the circuit per jack |
| 4+ | Matching 4-pin cables | Bridge each jack's signal pin to its ground pin when plugged in — see "Connector wiring" below |
| 1 | 12-position, 1-pole rotary switch | Common pole + 12 individually-wired contacts |
| 1 | CD74HC4067 16-channel analog/digital mux breakout | Scans the rotary switch using only 5 GPIO pins instead of 12 |
| — | Hookup wire, breadboard/perfboard, pull-up not needed (internal pull-ups used throughout) | |

## GPIO pinout (BCM numbering)

All inputs use the Pi's **internal pull-up** — each switch/jack wires its
signal pin straight to a GPIO and its return to GND; no external resistors
needed except the LED current-limiting resistors.

| Function | Signal | BCM GPIO | Physical pin |
|---|---|---|---|
| Switch 1 (Power, all devices) | SW1 | GPIO5 | 29 |
| Switch 2 | SW2 | GPIO6 | 31 |
| Switch 3 | SW3 | GPIO13 | 33 |
| Switch 4 | SW4 | GPIO19 | 35 |
| Switch 5 (utility: re-arm) | SW5 | GPIO26 | 37 |
| Switch 6 (utility: self-test) | SW6 | GPIO21 | 40 |
| LED 1 | LED1 | GPIO17 | 11 |
| LED 2 | LED2 | GPIO27 | 13 |
| LED 3 | LED3 | GPIO22 | 15 |
| LED 4 | LED4 | GPIO23 | 16 |
| Connector 1 | J1 | GPIO24 | 18 |
| Connector 2 | J2 | GPIO25 | 22 |
| Connector 3 | J3 | GPIO12 | 32 |
| Connector 4 | J4 | GPIO16 | 36 |
| Rotary mux select S0 | MUX_S0 | GPIO4 | 7 |
| Rotary mux select S1 | MUX_S1 | GPIO18 | 12 |
| Rotary mux select S2 | MUX_S2 | GPIO20 | 38 |
| Rotary mux select S3 | MUX_S3 | GPIO7 | 26 |
| Rotary mux signal (SIG) | MUX_SIG | GPIO8 | 24 |

**19 of the Pi's 26 usable GPIO pins used, 7 spare** (GPIO2, 3, 9, 10, 11, 14,
15 — includes the I2C bus and UART, left free for future use). GPIO0/1
(ID_SD/ID_SC, reserved for HAT EEPROM) are not used. All pin assignments live
in `config.py` — change them there, not in `panel_controller.py`.

## Wiring diagram (text schematic)

```
                         +3.3V (mux VCC)
                             │
                    ┌────────┴────────┐
   GPIO4  (S0) ─────┤S0            VCC├
   GPIO18 (S1) ─────┤S1  CD74HC4067   │
   GPIO20 (S2) ─────┤S2               │
   GPIO7  (S3) ─────┤S3            GND├───── GND
   GPIO8 (SIG,pull-up)─┤SIG  EN───────┘ (EN tied to GND = always enabled)
                    │  C0..C11         │
                    └───┬──┬──┬ ... ┬──┘
                        │  │  │     │
                     ┌──┴──┴──┴─...─┴──┐
                     │  12-position     │   common pole
                     │  rotary switch   ├──────────────── GND
                     └──────────────────┘

   GPIO5,6,13,19,26,21 ──[SW1..SW6]── GND      (toggle switch, other leg to GND)

   GPIO17 ──[330Ω]──▶│── GND   (LED1)
   GPIO27 ──[330Ω]──▶│── GND   (LED2)
   GPIO22 ──[330Ω]──▶│── GND   (LED3)
   GPIO23 ──[330Ω]──▶│── GND   (LED4)

   GPIO24,25,12,16 ──[J1..J4 signal pin]        socket's ground pin ── GND
        (cable plugged in bridges signal pin to ground pin inside the plug)
```

### Rotary switch → mux detail

The rotary switch's **common pole goes to GND**. Each of its 12 fixed
contacts goes to one mux channel (`C0`-`C11`; `C12`-`C15` unused/left
floating). The Pi cycles the mux's 4 select lines through binary 0-11 while
reading `SIG` (pulled up internally on the Pi): whichever channel is
currently connected to the rotary's grounded common pole reads `SIG` LOW; all
other channels are floating contacts and read HIGH through the pull-up. This
needs a full pass over the loop in [`rotary_mux.py`](rotary_mux.py), roughly
every 50ms — fast enough that a dial turn is detected well under the software
debounce window (`DIAL_CONFIRM_READS = 3` consecutive matching scans, ~150ms).

### Connector wiring

Each 4-pin jack uses **1 pin as signal** (wired to a GPIO, pulled up
internally) and a second pin as **ground** (tied to the Pi's GND rail); the
other 2 pins of each jack are unused. A cable is simply a 2-wire jumper
between those two pins at one end (or a full 4-conductor cable where only
that pair matters) — when plugged in, it shorts signal to ground and the
GPIO reads LOW ("connected"); unplugged, it reads HIGH via the pull-up
("disconnected"). This is presence/continuity only — the firmware does not
try to distinguish one cable from another (see "Known open item" above for
what a richer per-cable-identity design would need — an ID resistor per cable
plus an ADC, since the Pi has no built-in analog input).

### Splitting the dial signal to a kiosk Pi (per `GAME_MODE_PLAN.md` §4)

If/when the separate kiosk Pi is built, the rotary switch's common pole and
each of its 12 contacts can be paralleled to a second CD74HC4067 feeding the
kiosk Pi's own GPIO, **as long as the two Pis share a common ground** (tie
their GND rails together) and both boards' mux SIG pins stay configured as
inputs, never outputs. That's not built here — this repo covers the panel Pi
only.

## Software design

- **`config.py`** — the only file with pin numbers. Change hardware wiring
  here, not in the rest of the code.
- **`safe_eval.py`** — evaluates each device's `win`/lamp `when` boolean
  expressions from a parsed AST (and/or/not/names only) — no `eval()` of
  untrusted strings, even though these JSON files are repo-authored and
  trusted.
- **`rotary_mux.py`** — the CD74HC4067 scanning logic described above.
- **`telemetry.py`** — a background-threaded Azure IoT Hub publisher (queued,
  non-blocking) so a slow/dropped network connection never stalls GPIO
  polling. Runs in console-only mode if `AZURE_IOT_CONNECTION_STRING` isn't
  set, for bench-testing without cloud credentials.
- **`panel_controller.py`** — the main loop: scans the dial (debounced),
  loads the matching `logic_maps/<slug>.json` on change, reads SW1-SW4 into
  that device's switch keys, evaluates `win` and each lamp's `when`
  expression, drives the 4 LEDs, and publishes telemetry on state change plus
  a 30s heartbeat. SW5/SW6 are handled as edge-triggered utility buttons
  outside the per-device logic.
- **`logic_maps/<slug>.json`** — one file per dial position (12 total,
  including `demo-info.json` for position 1), each a direct transcription of
  that device's `fault`/`checkWin`/`computeLamps` from
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
  "dialPosition": 2,
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
extend `panel_controller.py` to log it on dial change).

### Telemetry payload

Published to Azure IoT Hub on state change, a 30s heartbeat, dial change, and
the moment a device is won:

```json
{
  "deviceSlug": "thermostat",
  "dialPosition": 2,
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
cd hardware/raspberry-pi
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in AZURE_IOT_CONNECTION_STRING
python3 panel_controller.py
```

Bench-test without an IoT Hub connection string set — the panel still runs
the full switch/dial/LED logic and logs what it *would* publish.

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

### Why `lgpio` and not `RPi.GPIO`

`requirements.txt` installs `lgpio`, not the older `RPi.GPIO`. This isn't
just a Pi 5 thing — on current Raspberry Pi OS (Bookworm and later, on
*any* Pi model), `RPi.GPIO`'s edge detection depends on the legacy sysfs
GPIO interface, which fails there with `RuntimeError: Failed to add edge
detection` the moment a `Button` (switch/connector) tries to attach a
callback. `lgpio` uses the modern GPIO character-device interface instead,
and `gpiozero` auto-detects and prefers it — no code changes needed, just
make sure it's the one that's actually installed. Pi 5 additionally
*requires* it, since `RPi.GPIO`'s C extension can't address its GPIO chip
at all.

## Testing without the real panel

Every input class (`Button`, `LED`, `DigitalInputDevice`/`DigitalOutputDevice`
from `gpiozero`) supports gpiozero's mock pin factory for running this off a
Pi entirely — set `GPIOZERO_PIN_FACTORY=mock` before running
`panel_controller.py` to exercise the dial/switch/LED logic on a dev machine
without any hardware attached (though there's no interactive way to flip a
mock pin from the CLI; it's mainly useful for unit-testing `safe_eval.py` and
the per-device logic maps in isolation).
