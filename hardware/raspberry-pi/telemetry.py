"""Azure IoT Hub telemetry publisher for the panel Pi.

Runs a background thread so GPIO polling in panel_controller.py never blocks
on network I/O. Falls back to console-only logging if
AZURE_IOT_CONNECTION_STRING isn't set (or azure-iot-device isn't installed),
so the panel can be bench-tested before cloud credentials are wired up.

This targets an *existing* IoT Hub device identity — per GAME_MODE_PLAN.md
§0/§4, the panel Pi is already registered to IoT Hub from the sibling
`copilot-iot-service` project. Use that device's connection string; don't
provision a new one unless told otherwise.

A failed connection is retried with backoff instead of being given up on: the Pi has no
battery-backed clock, so if the service starts before network time sync the hub rejects the
device's time-based token ("Connection Refused: not authorised"), and a one-shot connect
would leave telemetry offline until someone restarted the service.
"""
import json
import logging
import os
import queue
import threading
import time
from datetime import datetime, timezone

log = logging.getLogger("telemetry")

try:
    from azure.iot.device import IoTHubDeviceClient, Message
except ImportError:  # azure-iot-device isn't installed (e.g. running off-Pi)
    IoTHubDeviceClient = None
    Message = None


# Seconds to wait before each successive reconnect attempt; the last value repeats.
RECONNECT_BACKOFF_S = (30, 60, 120, 300)


class TelemetryClient:
    def __init__(self):
        self._queue: "queue.Queue[dict]" = queue.Queue(maxsize=100)
        self._client = None
        self._conn_str = os.environ.get("AZURE_IOT_CONNECTION_STRING")
        self._failures = 0
        self._next_attempt = 0.0

        if self._conn_str and IoTHubDeviceClient is not None:
            self._connect()
        else:
            log.warning(
                "AZURE_IOT_CONNECTION_STRING not set (or azure-iot-device not installed) "
                "— telemetry will be logged locally only, not sent to Azure IoT Hub."
            )

        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()

    def _connect(self) -> bool:
        """One connection attempt. On failure, schedules the next one with backoff."""
        try:
            client = IoTHubDeviceClient.create_from_connection_string(self._conn_str)
            client.connect()
        except Exception as exc:
            self._client = None
            delay = RECONNECT_BACKOFF_S[min(self._failures, len(RECONNECT_BACKOFF_S) - 1)]
            self._next_attempt = time.monotonic() + delay
            if self._failures == 0:
                log.exception(
                    "Failed to connect to Azure IoT Hub with the configured "
                    "AZURE_IOT_CONNECTION_STRING — telemetry is logged locally and the "
                    "connection will be retried every %ds or more.", delay
                )
            else:
                log.warning("Azure IoT Hub still unreachable (%s); retrying in %ds", exc, delay)
            self._failures += 1
            return False
        self._client = client
        self._failures = 0
        log.info("Connected to Azure IoT Hub")
        return True

    def _retry_connection_if_due(self) -> None:
        if (
            self._client is None
            and self._conn_str
            and IoTHubDeviceClient is not None
            and time.monotonic() >= self._next_attempt
        ):
            self._connect()

    def publish(self, state: dict, event_type: str) -> None:
        envelope = dict(state)
        envelope["eventType"] = event_type
        envelope["timestamp"] = datetime.now(timezone.utc).isoformat()
        try:
            self._queue.put_nowait(envelope)
        except queue.Full:
            log.warning("Telemetry queue full — dropping %s event", event_type)

    def _worker(self):
        while True:
            envelope = self._queue.get()
            body = json.dumps(envelope)
            self._retry_connection_if_due()
            if self._client is not None:
                try:
                    self._client.send_message(Message(body))
                except Exception:
                    log.exception("Failed to publish telemetry to Azure IoT Hub")
            else:
                log.info("Telemetry (offline): %s", body)

    def close(self):
        if self._client is not None:
            try:
                self._client.shutdown()
            except Exception:
                log.exception("Error shutting down Azure IoT Hub client")
