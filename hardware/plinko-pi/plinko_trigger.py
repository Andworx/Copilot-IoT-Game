"""Read the Plinko bucket break-beams and emit landing telemetry.

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
    """Active-low inputs on one or more BCM pins, with internal pull-ups."""

    def __init__(self, pins):
        try:
            import lgpio
        except ImportError as exc:
            raise RuntimeError("lgpio is required on the Raspberry Pi. Install it with pip.") from exc
        self._lgpio = lgpio
        self._chip = lgpio.gpiochip_open(0)
        self._pins = list(pins)
        for pin in self._pins:
            try:
                lgpio.gpio_claim_input(self._chip, pin, lgpio.SET_PULL_UP)
            except lgpio.error as exc:
                raise RuntimeError(
                    f"GPIO{pin}: {exc}. Another process (sensor_check.py or a second trigger?) holds it."
                ) from exc

    def active_pins(self) -> set:
        return {pin for pin in self._pins if self._lgpio.gpio_read(self._chip, pin) == 0}

    def close(self) -> None:
        for pin in self._pins:
            self._lgpio.gpio_free(self._chip, pin)
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


class BoardMonitor:
    """One LandingDetector per bucket, with a board-wide lockout after a landing.

    A puck rolling past a neighbouring beam can briefly block it, so once one
    bucket reports a landing the others are ignored for lockout_ms.
    """

    def __init__(
        self,
        pins,
        debounce_ms: int,
        lockout_ms: int,
        now: Callable[[], float] = time.monotonic,
        utcnow: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ):
        self._pins = list(pins)
        self._detectors = [LandingDetector(debounce_ms, now=now, utcnow=utcnow) for _ in self._pins]
        self._lockout_s = lockout_ms / 1000.0
        self._now = now
        self._locked_until = 0.0

    def sample(self, active_pins, station_slug, lit_bucket, firmware) -> Optional[LandingEvent]:
        now = self._now()
        locked = now < self._locked_until
        landing = None
        for index, (pin, detector) in enumerate(zip(self._pins, self._detectors)):
            event = detector.sample(
                pin in active_pins, station_slug, index + 1, lit_bucket, len(self._pins), firmware
            )
            if event is not None and not locked and landing is None:
                landing = event
        if landing is not None:
            self._locked_until = now + self._lockout_s
        return landing


def run(
    input_device,
    telemetry: TelemetryClient,
    station_slug: str,
    pins,
    lit_bucket: int,
    debounce_ms: int,
    lockout_ms: int,
    poll_ms: int,
) -> None:
    monitor = BoardMonitor(pins, debounce_ms=debounce_ms, lockout_ms=lockout_ms)
    last_active = None
    log.info(
        "Watching %s Plinko buckets (GPIO %s) for station %s, %sms debounce, %sms lockout",
        len(pins),
        list(pins),
        station_slug,
        debounce_ms,
        lockout_ms,
    )
    try:
        while True:
            active = input_device.active_pins()
            if active != last_active:
                blocked = [i + 1 for i, pin in enumerate(pins) if pin in active]
                log.info("Blocked buckets: %s", blocked or "none")
                last_active = active
            event = monitor.sample(active, station_slug, lit_bucket, config.FIRMWARE_VERSION)
            if event is not None:
                payload = event.to_payload()
                log.info("Detected Plinko landing: %s", payload)
                telemetry.publish(payload)
            time.sleep(poll_ms / 1000.0)
    finally:
        input_device.close()
        telemetry.close()


def parse_args():
    parser = argparse.ArgumentParser(description="Plinko bucket break-beam landing reporter")
    parser.add_argument("--station", default=config.DEFAULT_STATION_SLUG)
    parser.add_argument("--pins", type=int, nargs="+", default=config.DEFAULT_BUCKET_PINS, help="BCM pins, bucket 1..N")
    parser.add_argument("--lit-bucket", type=int, default=config.DEFAULT_LIT_BUCKET)
    parser.add_argument("--debounce-ms", type=int, default=config.DEFAULT_DEBOUNCE_MS)
    parser.add_argument("--lockout-ms", type=int, default=config.DEFAULT_LOCKOUT_MS)
    parser.add_argument("--poll-ms", type=int, default=config.DEFAULT_POLL_MS)
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    args = parse_args()
    run(
        input_device=GpioInput(args.pins),
        telemetry=TelemetryClient(),
        station_slug=args.station,
        pins=args.pins,
        lit_bucket=args.lit_bucket,
        debounce_ms=args.debounce_ms,
        lockout_ms=args.lockout_ms,
        poll_ms=args.poll_ms,
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Stopped")
