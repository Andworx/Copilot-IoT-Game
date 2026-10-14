"""Off-Pi tests for the server clock offset and the keep-warm heartbeat."""
import unittest
from datetime import datetime, timezone

from plinko_trigger import heartbeat_payload
from server_clock import ServerClock

LOCAL = datetime(2026, 10, 14, 12, 0, 0, tzinfo=timezone.utc)


class ServerClockTests(unittest.TestCase):
    def test_unsynced_clock_is_local_time(self):
        clock = ServerClock("http://x", "s", fetch=lambda *_: None, utcnow=lambda: LOCAL)
        self.assertFalse(clock.sync_once())
        self.assertEqual(clock.now(), LOCAL)

    def test_now_applies_the_server_offset(self):
        clock = ServerClock("http://x", "s", fetch=lambda *_: 350.0, utcnow=lambda: LOCAL)
        self.assertTrue(clock.sync_once())
        self.assertEqual((clock.now() - LOCAL).total_seconds(), 0.35)

    def test_failed_resync_keeps_the_last_offset(self):
        offsets = iter([-120.0, None])
        clock = ServerClock("http://x", "s", fetch=lambda *_: next(offsets), utcnow=lambda: LOCAL)
        clock.sync_once()
        self.assertFalse(clock.sync_once())
        self.assertEqual(clock.offset_ms, -120.0)


class HeartbeatTests(unittest.TestCase):
    def test_payload_is_not_a_landing(self):
        payload = heartbeat_payload("plinko-default", "plinko-pi/v0.3", LOCAL)
        self.assertEqual(payload["type"], "plinkoHeartbeat")
        self.assertEqual(payload["stationSlug"], "plinko-default")


if __name__ == "__main__":
    unittest.main()
