"""Read a Plinko bucket switch/beam and emit landing telemetry.

The first hardware slice treats the input as active-low: internal pull-up holds
the pin high, and a switch closure or IR receiver open-collector output pulls it
to GND when the bucket is blocked.
"""
import argparse
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, Optional
from uuid import uuid4

import config
from telemetry import TelemetryClient

log = logging.getLogger("plinko.trigger")


class GpioInput:
    def __init__(self, pin: int):
        try:
            import lgpio
        except ImportError as exc:
            raise RuntimeError("lgpio is required on the Raspberry Pi. Install it with pip.") from exc
        self._lgpio = lgpio
        self._chip = lgpio.gpiochip_open(0)
        self._pin = pin
        lgpio.gpio_claim_input(self._chip, pin, lgpio.SET_PULL_UP)

    @property
    def is_active(self) -> bool:
        return self._lgpio.gpio_read(self._chip, self._pin) == 0

    def close(self) -> None:
        self._lgpio.gpio_free(self._chip, self._pin)
        self._lgpio.gpiochip_close(self._chip)


@dataclass(frozen=True)
class LandingEvent:
    station_slug: str
    bucket: int
    lit_bucket: int
    bucket_count: int
    firmware: str
    landed_at: str
    event_id: str

    def to_payload(self) -> dict:
        return {
            "type": "plinkoLanding",
            "stationSlug": self.station_slug,
            "eventId": self.event_id,
            "bucket": self.bucket,
            "litBucket": self.lit_bucket,
            "bucketCount": self.bucket_count,
            "landedAt": self.landed_at,
            "firmware": self.firmware,
        }


class LandingDetector:
    def __init__(
        self,
        debounce_ms: int,
        now: Callable[[], float] = time.monotonic,
        utcnow: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ):
        self._debounce_s = debounce_ms / 1000.0
        self._now = now
        self._utcnow = utcnow
        self._candidate_since: Optional[float] = None
        self._blocked = False

    def sample(
        self,
        is_active: bool,
        station_slug: str,
        bucket: int,
        lit_bucket: int,
        bucket_count: int,
        firmware: str,
    ) -> Optional[LandingEvent]:
        now = self._now()
        if is_active:
            if self._blocked:
                return None
            if self._candidate_since is None:
                self._candidate_since = now
                return None
            if now - self._candidate_since + 1e-9 < self._debounce_s:
                return None
            self._blocked = True
            return LandingEvent(
                station_slug=station_slug,
                bucket=bucket,
                lit_bucket=lit_bucket,
                bucket_count=bucket_count,
                firmware=firmware,
                landed_at=self._utcnow().isoformat(),
                event_id=str(uuid4()),
            )

        self._candidate_since = None
        self._blocked = False
        return None


def run(
    input_device,
    telemetry: TelemetryClient,
    station_slug: str,
    bucket: int,
    lit_bucket: int,
    bucket_count: int,
    debounce_ms: int,
    poll_ms: int,
) -> None:
    detector = LandingDetector(debounce_ms=debounce_ms)
    last_active = None
    log.info(
        "Watching Plinko bucket %s for station %s with %sms debounce",
        bucket,
        station_slug,
        debounce_ms,
    )
    try:
        while True:
            is_active = input_device.is_active
            if is_active != last_active:
                log.info("Input GPIO state: %s", "active" if is_active else "idle")
                last_active = is_active
            event = detector.sample(
                is_active,
                station_slug,
                bucket,
                lit_bucket,
                bucket_count,
                config.FIRMWARE_VERSION,
            )
            if event is not None:
                payload = event.to_payload()
                log.info("Detected Plinko landing: %s", payload)
                telemetry.publish(payload)
            time.sleep(poll_ms / 1000.0)
    finally:
        input_device.close()
        telemetry.close()


def parse_args():
    parser = argparse.ArgumentParser(description="Plinko bucket switch/beam smoke verifier")
    parser.add_argument("--station", default=config.DEFAULT_STATION_SLUG)
    parser.add_argument("--bucket", type=int, default=config.DEFAULT_BUCKET)
    parser.add_argument("--lit-bucket", type=int, default=config.DEFAULT_LIT_BUCKET)
    parser.add_argument("--bucket-count", type=int, default=config.DEFAULT_BUCKET_COUNT)
    parser.add_argument("--pin", type=int, default=config.DEFAULT_INPUT_PIN, help="BCM GPIO input pin")
    parser.add_argument("--debounce-ms", type=int, default=config.DEFAULT_DEBOUNCE_MS)
    parser.add_argument("--poll-ms", type=int, default=config.DEFAULT_POLL_MS)
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    args = parse_args()
    run(
        input_device=GpioInput(args.pin),
        telemetry=TelemetryClient(),
        station_slug=args.station,
        bucket=args.bucket,
        lit_bucket=args.lit_bucket,
        bucket_count=args.bucket_count,
        debounce_ms=args.debounce_ms,
        poll_ms=args.poll_ms,
    )


if __name__ == "__main__":
    main()