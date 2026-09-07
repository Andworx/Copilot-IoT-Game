"""Azure IoT Hub telemetry publisher for the panel Pi.

Runs a background thread so GPIO polling in panel_controller.py never blocks
on network I/O. Falls back to console-only logging if
AZURE_IOT_CONNECTION_STRING isn't set (or azure-iot-device isn't installed),
so the panel can be bench-tested before cloud credentials are wired up.

This targets an *existing* IoT Hub device identity — per GAME_MODE_PLAN.md
§0/§4, the panel Pi is already registered to IoT Hub from the sibling
`copilot-iot-service` project. Use that device's connection string; don't
provision a new one unless told otherwise.
"""
import json
import logging
import os
import queue
import threading
from datetime import datetime, timezone

log = logging.getLogger("telemetry")

try:
    from azure.iot.device import IoTHubDeviceClient, Message
except ImportError:  # azure-iot-device isn't installed (e.g. running off-Pi)
    IoTHubDeviceClient = None
    Message = None


class TelemetryClient:
    def __init__(self):
        self._queue: "queue.Queue[dict]" = queue.Queue(maxsize=100)
        self._client = None

        conn_str = os.environ.get("AZURE_IOT_CONNECTION_STRING")
        if conn_str and IoTHubDeviceClient is not None:
            self._client = IoTHubDeviceClient.create_from_connection_string(conn_str)
            self._client.connect()
            log.info("Connected to Azure IoT Hub")
        else:
            log.warning(
                "AZURE_IOT_CONNECTION_STRING not set (or azure-iot-device not installed) "
                "— telemetry will be logged locally only, not sent to Azure IoT Hub."
            )

        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()

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
