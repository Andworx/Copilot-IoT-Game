"""Azure IoT Hub telemetry publisher for the Plinko Pi.

If AZURE_IOT_CONNECTION_STRING is missing, messages are logged locally. That
keeps the wiring smoke test useful before the IoT Hub device identity is wired.
"""
import json
import logging
import os
import queue
import threading
import time

log = logging.getLogger("plinko.telemetry")

try:
    from azure.iot.device import IoTHubDeviceClient, Message
except ImportError:
    IoTHubDeviceClient = None
    Message = None


RECONNECT_BACKOFF_S = (30, 60, 120, 300)


class TelemetryClient:
    def __init__(self):
        self._queue: "queue.Queue[dict]" = queue.Queue(maxsize=100)
        self._client = None
        self._conn_str = os.environ.get("AZURE_IOT_CONNECTION_STRING")
        self._failures = 0
        self._next_attempt = 0.0
        self.sent_offline = []

        if self._conn_str and IoTHubDeviceClient is not None:
            self._connect()
        else:
            log.warning(
                "AZURE_IOT_CONNECTION_STRING not set or azure-iot-device is not installed; "
                "Plinko landing messages will be logged locally only."
            )

        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()

    def _connect(self) -> bool:
        try:
            client = IoTHubDeviceClient.create_from_connection_string(self._conn_str)
            client.connect()
        except Exception as exc:
            self._client = None
            delay = RECONNECT_BACKOFF_S[min(self._failures, len(RECONNECT_BACKOFF_S) - 1)]
            self._next_attempt = time.monotonic() + delay
            if self._failures == 0:
                log.exception("Failed to connect to Azure IoT Hub; retrying in %ds", delay)
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

    def publish(self, payload: dict) -> None:
        try:
            self._queue.put_nowait(dict(payload))
        except queue.Full:
            log.warning("Telemetry queue full; dropping Plinko landing event %s", payload.get("eventId"))

    def _worker(self):
        while True:
            payload = self._queue.get()
            body = json.dumps(payload)
            self._retry_connection_if_due()
            if self._client is not None:
                try:
                    self._client.send_message(Message(body))
                except Exception:
                    log.exception("Failed to publish Plinko telemetry to Azure IoT Hub")
            else:
                self.sent_offline.append(payload)
                log.info("Telemetry (offline): %s", body)

    def close(self):
        if self._client is not None:
            try:
                self._client.shutdown()
            except Exception:
                log.exception("Error shutting down Azure IoT Hub client")