"""Plinko Pi hardware configuration.

All GPIO values use BCM numbering. The verifier defaults to one active-low
input so the first bench test can prove the Pi, switch/beam, and wiring before
the multi-bucket board is finalized.
"""
import os


FIRMWARE_VERSION = "plinko-pi-smoke/v0.1"
DEFAULT_STATION_SLUG = os.environ.get("PLINKO_STATION_SLUG", "plinko-1")
DEFAULT_BUCKET = int(os.environ.get("PLINKO_BUCKET", "1"))
DEFAULT_LIT_BUCKET = int(os.environ.get("PLINKO_LIT_BUCKET", str(DEFAULT_BUCKET)))
DEFAULT_BUCKET_COUNT = int(os.environ.get("PLINKO_BUCKET_COUNT", "5"))
DEFAULT_INPUT_PIN = int(os.environ.get("PLINKO_INPUT_PIN", "17"))
DEFAULT_DEBOUNCE_MS = int(os.environ.get("PLINKO_DEBOUNCE_MS", "200"))
DEFAULT_POLL_MS = int(os.environ.get("PLINKO_POLL_MS", "20"))