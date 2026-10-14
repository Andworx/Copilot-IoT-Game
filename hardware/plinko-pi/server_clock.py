"""Server-clock offset for the Plinko Pi.

The backend scores the lit bucket from the landing's timestamp against a chase light that
is a pure function of the *server* clock, and the booth display draws it from the same clock.
Stamping landings with server time (local time plus a measured offset) puts the Pi on that
clock too, so a Pi that is a few hundred ms off from NTP no longer shifts the lit bucket.

The offset comes from GET /api/plinko-chase, the same endpoint and half-round-trip method the
display uses (power pages/plinko/src/lib/chase.ts), taking the quickest of a few samples.
"""
import json
import logging
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional

log = logging.getLogger("plinko.clock")

SAMPLES = 3
TIMEOUT_S = 5


def fetch_offset_ms(base_url: str, station_slug: str, samples: int = SAMPLES) -> Optional[float]:
    """Server clock minus local clock in ms, from the lowest-round-trip sample; None if unreachable."""
    url = f"{base_url.rstrip('/')}/api/plinko-chase?station={urllib.parse.quote(station_slug)}"
    best: Optional[tuple] = None
    for _ in range(samples):
        sent = time.time()
        try:
            request = urllib.request.Request(url, headers={"Cache-Control": "no-store"})
            with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:
                server_time_ms = float(json.load(response)["serverTime"])
        except Exception as exc:  # network down, 4xx/5xx, bad body: keep the previous offset
            log.warning("Clock sample failed: %s", exc)
            continue
        received = time.time()
        # Assume the server stamped the reply halfway through the round trip.
        offset = server_time_ms - (sent + received) / 2 * 1000.0
        round_trip = received - sent
        if best is None or round_trip < best[1]:
            best = (offset, round_trip)
    return best[0] if best else None


class ServerClock:
    """`now()` returns UTC as the server sees it. Until the first sync it is just local UTC."""

    def __init__(
        self,
        base_url: str,
        station_slug: str,
        resync_s: float = 300.0,
        fetch: Callable[[str, str], Optional[float]] = fetch_offset_ms,
        utcnow: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ):
        self._base_url = base_url
        self._station_slug = station_slug
        self._resync_s = resync_s
        self._fetch = fetch
        self._utcnow = utcnow
        self._offset_ms = 0.0
        self.synced = False

    @property
    def offset_ms(self) -> float:
        return self._offset_ms

    def now(self) -> datetime:
        return self._utcnow() + timedelta(milliseconds=self._offset_ms)

    def sync_once(self) -> bool:
        offset = self._fetch(self._base_url, self._station_slug)
        if offset is None:
            return False
        if not self.synced or abs(offset - self._offset_ms) > 50:
            log.info("Server clock offset %+.0f ms", offset)
        self._offset_ms = offset
        self.synced = True
        return True

    def start(self) -> None:
        """Syncs now and then every resync_s on a daemon thread, so the poll loop never waits on HTTP."""

        def loop() -> None:
            while True:
                if not self.sync_once():
                    log.warning("Server clock not reachable; keeping offset %+.0f ms", self._offset_ms)
                time.sleep(self._resync_s)

        threading.Thread(target=loop, name="server-clock", daemon=True).start()
