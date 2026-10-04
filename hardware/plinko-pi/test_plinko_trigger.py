"""Off-Pi tests for the Plinko landing detector.

Run from hardware/plinko-pi:
    python -m pytest -q
"""
import unittest
from datetime import datetime, timezone

from plinko_trigger import LandingDetector


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
        detector = LandingDetector(
            debounce_ms=200,
            now=lambda: clock.value,
            utcnow=lambda: datetime(2026, 10, 2, 12, 0, tzinfo=timezone.utc),
        )
        self.assertIsNone(detector.sample(True, "plinko-1", 3, 2, 5, "test"))
        clock.advance(0.2)
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


if __name__ == "__main__":
    unittest.main()