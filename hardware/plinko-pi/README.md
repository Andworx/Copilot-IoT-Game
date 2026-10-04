# Plinko Pi Hardware Smoke Verifier

This folder contains the first Plinko hardware path: read one active-low bucket
switch or IR break-beam receiver on a Raspberry Pi, debounce it, and emit a
`plinkoLanding` message. It is intentionally scoped to proving the Pi, input,
and wiring before the full multi-bucket board and backend judgement path are
connected.

## Message shape

When the input stays active for the debounce window, `plinko_trigger.py` emits:

```json
{
  "type": "plinkoLanding",
  "stationSlug": "plinko-1",
  "eventId": "<uuid>",
  "bucket": 1,
  "litBucket": 1,
  "bucketCount": 5,
  "landedAt": "2026-10-02T12:00:00+00:00",
  "firmware": "plinko-pi-smoke/v0.1"
}
```

If `AZURE_IOT_CONNECTION_STRING` is unset, the message is logged locally instead
of sent to IoT Hub. That is the expected mode for the first wiring check.

`litBucket` is configurable for smoke testing the planned backend envelope. The
first single-input bench test does not drive chase lights; set `PLINKO_LIT_BUCKET`
to the bucket value when you only need a known lit-bucket win payload.

## Wiring assumption

The input is active-low. The Pi enables its internal pull-up; the switch or IR
receiver output pulls the GPIO to GND when the puck blocks the bucket sensor.
Never pull a Pi input up to 5 V. If using the Adafruit 2167 break beam receiver,
power the emitter and receiver as required by the part, but wire the receiver
signal only to the Pi GPIO input and use the Pi-side pull-up.

Defaults are in `config.py` and can be overridden by environment variables or
CLI options:

| Setting | Default | Notes |
|---|---:|---|
| `PLINKO_STATION_SLUG` | `plinko-1` | Station identifier in telemetry. |
| `PLINKO_BUCKET` | `1` | Bucket number to report for this smoke input. |
| `PLINKO_LIT_BUCKET` | `1` | Lit bucket to include in the planned event envelope. |
| `PLINKO_BUCKET_COUNT` | `5` | Total bucket count for range validation downstream. |
| `PLINKO_INPUT_PIN` | `17` | BCM GPIO input pin. |
| `PLINKO_DEBOUNCE_MS` | `200` | Stable active time required before a landing. |
| `PLINKO_POLL_MS` | `20` | Poll interval. |

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

For the wiring-only smoke test, the Pi only needs `lgpio`. The current
`iotplinko` image already has it installed. `azure-iot-device` is optional until
the IoT Hub send path is enabled; without it, messages are logged locally.

If dependencies are missing, create a virtual environment once, then install
them:

```bash
cd /home/pi/plinko-pi
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Run the smoke verifier:

```bash
cd /home/pi/plinko-pi
. .venv/bin/activate
python3 plinko_trigger.py --pin 17 --bucket 1 --lit-bucket 1 --bucket-count 5
```

Trigger the switch or block the beam. A valid wiring path prints a single
`Telemetry (offline)` log for each stable block, and it does not repeat until
the switch/beam is released and triggered again.