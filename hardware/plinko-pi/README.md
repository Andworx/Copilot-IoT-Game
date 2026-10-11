# Plinko Pi Hardware

Runs on the `iotplinko` Pi 3B. It reads one Adafruit 2167 IR break-beam receiver
per bucket, debounces each, and emits a `plinkoLanding` message.

1. `sensor_check.py` - live per-sensor monitor for proving wiring and sensors.
2. `plinko_trigger.py` - the landing reporter (all buckets), run by `systemd/plinko-pi.service`.

## Message shape

When the input stays active for the debounce window, `plinko_trigger.py` emits:

```json
{
  "type": "plinkoLanding",
  "stationSlug": "plinko-default",
  "eventId": "<uuid>",
  "bucket": 1,
  "litBucket": 1,
  "bucketCount": 6,
  "landedAt": "2026-10-02T12:00:00+00:00",
  "firmware": "plinko-pi/v0.2"
}
```

If `AZURE_IOT_CONNECTION_STRING` is unset, the message is logged locally instead
of sent to IoT Hub. That is the expected mode for the first wiring check.

The board has no lights. The chase light runs on the booth display and the backend
scores `landedAt` against it, so `litBucket` is informational only and is ignored.

## Wiring

Each bucket has an Adafruit 2167 pair (emitter + receiver). Receivers are
active-low: the receiver output pulls the GPIO to GND while the beam is blocked,
and the Pi's internal pull-up holds it high otherwise. **Never pull a signal
line up to 5 V.**

| Bucket | BCM GPIO | Header pin | Receiver wires |
|---:|---:|---:|---|
| 1 | 17 | 11 | white (signal) -> pin |
| 2 | 27 | 13 | white (signal) -> pin |
| 3 | 22 | 15 | white (signal) -> pin |
| 4 | 23 | 16 | white (signal) -> pin |
| 5 | 24 | 18 | white (signal) -> pin |
| 6 | 25 | 22 | white (signal) -> pin |

Power for every emitter and receiver (red/black): 5 V (header pin 2 or 4) and GND
(pins 6, 9, 14, 20, 25, 30, 34, 39). Emitters have no signal wire. Bucket 1 is the
leftmost bucket as viewed from the front. Pins avoid I2C, UART and SPI.

Settings (environment variables or CLI options; see `.env.example`):

| Setting | Default | Notes |
|---|---:|---|
| `PLINKO_STATION_SLUG` | `plinko-default` | Station identifier in telemetry. |
| `PLINKO_BUCKET_PINS` | `17,27,22,23,24,25` | BCM pins for buckets 1..N; N is the bucket count. |
| `PLINKO_LIT_BUCKET` | `1` | Informational only: the backend derives the lit bucket from the display's chase. |
| `PLINKO_DEBOUNCE_MS` | `200` | Stable blocked time required before a landing. |
| `PLINKO_LOCKOUT_MS` | `1000` | After a landing, other buckets are ignored this long (a puck passing a neighbouring beam). |
| `PLINKO_POLL_MS` | `20` | Poll interval. |

## Bench check

```powershell
ssh pi@iotplinko "cd plinko-pi && python3 sensor_check.py"
```

Block each beam in turn; it prints BLOCKED / CLEAR with the hold time. If it
reports `GPIO busy`, another copy is running: `pkill -f '[s]ensor_check.py'`.

## Local tests

From this folder:

```powershell
python -m pytest -q
```

The tests use a fake clock and do not require Raspberry Pi GPIO libraries.

## Deploy to the Pi

From this folder on the dev machine:

```powershell
.\deploy.ps1 -PiHost pi@iotplinko
```

The Pi needs `lgpio` (installed on the `iotplinko` image, system python 3.13). `azure-iot-device` is optional until
the IoT Hub send path is enabled; without it, messages are logged locally.

If dependencies are missing, create a virtual environment once, then install
them:

```bash
cd /home/pi/plinko-pi
python3 -m venv --system-site-packages .venv   # keeps the apt lgpio visible
. .venv/bin/activate
pip install -r requirements.txt
```

Run the reporter by hand:

```bash
cd /home/pi/plinko-pi
.venv/bin/python plinko_trigger.py
```

Each stable block prints `Detected Plinko landing` and `Telemetry (offline)`
until `AZURE_IOT_CONNECTION_STRING` is set in `.env`.

### Run on boot

```bash
sudo cp systemd/plinko-pi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable systemd-time-wait-sync.service
sudo systemctl enable --now plinko-pi.service
journalctl -u plinko-pi.service -f
```

Stop the service before using `sensor_check.py`, since both claim the pins.
