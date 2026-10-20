"""Plinko Pi hardware configuration.

All GPIO values use BCM numbering. The verifier defaults to one active-low
input so the first bench test can prove the Pi, switch/beam, and wiring before
the multi-bucket board is finalized. PLINKO_BUCKET_PINS maps bucket 1..N to pins.
"""
import os


FIRMWARE_VERSION = "plinko-pi/v0.3"
DEFAULT_STATION_SLUG = os.environ.get("PLINKO_STATION_SLUG", "plinko-default")
DEFAULT_BUCKET = int(os.environ.get("PLINKO_BUCKET", "1"))
DEFAULT_LIT_BUCKET = int(os.environ.get("PLINKO_LIT_BUCKET", str(DEFAULT_BUCKET)))
DEFAULT_BUCKET_COUNT = int(os.environ.get("PLINKO_BUCKET_COUNT", "5"))
DEFAULT_INPUT_PIN = int(os.environ.get("PLINKO_INPUT_PIN", "17"))
# BCM pins for buckets 1..N, left to right. Avoids I2C (2,3), UART (14,15) and SPI (7-11).
DEFAULT_BUCKET_PINS = [
    int(p) for p in os.environ.get("PLINKO_BUCKET_PINS", "23,24,25,22,27,17").split(",") if p.strip()
]
DEFAULT_DEBOUNCE_MS = int(os.environ.get("PLINKO_DEBOUNCE_MS", "50"))
DEFAULT_POLL_MS = int(os.environ.get("PLINKO_POLL_MS", "20"))
DEFAULT_LOCKOUT_MS = int(os.environ.get("PLINKO_LOCKOUT_MS", "1000"))
# Backend used to learn the server clock (GET /api/plinko-chase) so landings are stamped on it.
DEFAULT_API_BASE_URL = os.environ.get("PLINKO_API_BASE_URL", "https://func-aw-iot-game-v2.azurewebsites.net")
DEFAULT_CLOCK_RESYNC_S = int(os.environ.get("PLINKO_CLOCK_RESYNC_S", "300"))
# A small message every N seconds keeps the Function App's Event Hub trigger warm; 0 turns it off.
DEFAULT_HEARTBEAT_S = int(os.environ.get("PLINKO_HEARTBEAT_S", "120"))
