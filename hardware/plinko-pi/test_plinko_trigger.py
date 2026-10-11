"""Off-Pi tests for the Plinko landing detector.

Run from hardware/plinko-pi:
    python -m pytest -q
"""
import unittest
from datetime import datetime, timezone

from plinko_trigger import BoardMonitor, LandingDetector


class Clock:
    def __init__(self):
        self.value = 0.0

    def advance(self, seconds):
        self.value += seconds


class LandingDetectorTests(unittest.TestCase):
    def test_short_bounce_does_not_emit_landing(self):
        clock = Clock()
        detector = LandingDetector(
            debounce_ms=200,
            now=lambda: clock.value,
            utcnow=lambda: datetime(2026, 10, 2, 12, 0, tzinfo=timezone.utc),
        )
        self.assertIsNone(detector.sample(True, "plinko-1", 1, 1, 5, "test"))
        clock.advance(0.15)
        self.assertIsNone(detector.sample(False, "plinko-1", 1, 1, 5, "test"))

    def test_stable_block_emits_one_landing_until_released(self):
        clock = Clock()
        utc_clock = [datetime(2026, 10, 2, 12, 0, tzinfo=timezone.utc)]
        detector = LandingDetector(
            debounce_ms=200,
            now=lambda: clock.value,
            utcnow=lambda: utc_clock[0],
        )
        self.assertIsNone(detector.sample(True, "plinko-1", 3, 2, 5, "test"))
        clock.advance(0.2)
        utc_clock[0] = datetime(2026, 10, 2, 12, 0, 0, 200000, tzinfo=timezone.utc)
        event = detector.sample(True, "plinko-1", 3, 2, 5, "test")
        self.assertIsNotNone(event)
        self.assertEqual(event.to_payload()["type"], "plinkoLanding")
        self.assertEqual(event.to_payload()["stationSlug"], "plinko-1")
        self.assertEqual(event.to_payload()["bucket"], 3)
        self.assertEqual(event.to_payload()["litBucket"], 2)
        self.assertEqual(event.to_payload()["bucketCount"], 5)
        self.assertEqual(event.to_payload()["landedAt"], "2026-10-02T12:00:00+00:00")
        self.assertIsNone(detector.sample(True, "plinko-1", 3, 2, 5, "test"))

        clock.advance(0.1)
        self.assertIsNone(detector.sample(False, "plinko-1", 3, 2, 5, "test"))
        self.assertIsNone(detector.sample(True, "plinko-1", 3, 2, 5, "test"))
        clock.advance(0.2)
        self.assertIsNotNone(detector.sample(True, "plinko-1", 3, 2, 5, "test"))


class BoardMonitorTests(unittest.TestCase):
    def _monitor(self, clock):
        return BoardMonitor(
            [17, 27, 22],
            debounce_ms=200,
            lockout_ms=1000,
            now=lambda: clock.value,
            utcnow=lambda: datetime(2026, 10, 2, 12, 0, tzinfo=timezone.utc),
        )

    def _land(self, monitor, clock, pins):
        monitor.sample(pins, "plinko-1", 2, "test")
        clock.advance(0.2)
        return monitor.sample(pins, "plinko-1", 2, "test")

    def test_pin_maps_to_bucket_number_and_count(self):
        clock = Clock()
        event = self._land(self._monitor(clock), clock, {27})
        self.assertEqual(event.to_payload()["bucket"], 2)
        self.assertEqual(event.to_payload()["bucketCount"], 3)

    def test_neighbour_blocked_right_after_landing_is_ignored(self):
        clock = Clock()
        monitor = self._monitor(clock)
        self.assertIsNotNone(self._land(monitor, clock, {27}))
        clock.advance(0.1)
        self.assertIsNone(monitor.sample({27, 22}, "plinko-1", 2, "test"))
        clock.advance(0.2)
        self.assertIsNone(monitor.sample({27, 22}, "plinko-1", 2, "test"))

    def test_next_landing_reported_after_lockout(self):
        clock = Clock()
        monitor = self._monitor(clock)
        self.assertIsNotNone(self._land(monitor, clock, {27}))
        clock.advance(0.1)
        monitor.sample(set(), "plinko-1", 2, "test")
        clock.advance(1.0)
        event = self._land(monitor, clock, {22})
        self.assertEqual(event.to_payload()["bucket"], 3)


if __name__ == "__main__":
    unittest.main()