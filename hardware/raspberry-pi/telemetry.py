"""Azure IoT Hub telemetry publisher for the panel Pi.

Runs a background thread so GPIO polling in panel_controller.py never blocks
on network I/O. Falls back to console-only logging if AZURE_IOT_DPS_* or
AZURE_IOT_CONNECTION_STRING isn't set (or azure-iot-device isn't installed),
so the panel can be bench-tested before cloud credentials are wired up.

Prefer DPS symmetric-key provisioning through the `iot-game-fleet` enrollment
group. A direct IoT Hub connection string is still supported as a rollback path.

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
    from azure.iot.device import IoTHubDeviceClient, Message, ProvisioningDeviceClient
except ImportError:  # azure-iot-device isn't installed (e.g. running off-Pi)
    IoTHubDeviceClient = None
    Message = None
    ProvisioningDeviceClient = None


# Seconds to wait before each successive reconnect attempt; the last value repeats.
RECONNECT_BACKOFF_S = (30, 60, 120, 300)


class TelemetryClient:
    def __init__(self):
        self._queue: "queue.Queue[dict]" = queue.Queue(maxsize=100)
        self._client = None
        self._conn_str = os.environ.get("AZURE_IOT_CONNECTION_STRING")
        self._dps_id_scope = os.environ.get("AZURE_IOT_DPS_ID_SCOPE")
        self._dps_registration_id = os.environ.get("AZURE_IOT_DPS_REGISTRATION_ID")
        self._dps_symmetric_key = os.environ.get("AZURE_IOT_DPS_SYMMETRIC_KEY")
        self._failures = 0
        self._next_attempt = 0.0

        if self._has_auth_config() and self._sdk_available():
            self._connect()
        else:
            log.warning(
                "Azure IoT auth config not set (or azure-iot-device not installed) "
                "— telemetry will be logged locally only, not sent to Azure IoT Hub."
            )

        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()

    def _has_dps_config(self) -> bool:
        return bool(self._dps_id_scope and self._dps_registration_id and self._dps_symmetric_key)

    def _has_auth_config(self) -> bool:
        return bool(self._conn_str or self._has_dps_config())

    def _sdk_available(self) -> bool:
        if self._conn_str:
            return IoTHubDeviceClient is not None
        return IoTHubDeviceClient is not None and ProvisioningDeviceClient is not None

    def _create_hub_client(self):
        if self._conn_str:
            return IoTHubDeviceClient.create_from_connection_string(self._conn_str)

        provisioning_client = ProvisioningDeviceClient.create_from_symmetric_key(
            provisioning_host="global.azure-devices-provisioning.net",
            registration_id=self._dps_registration_id,
            id_scope=self._dps_id_scope,
            symmetric_key=self._dps_symmetric_key,
        )
        registration_result = provisioning_client.register()
        if registration_result.status != "assigned":
            raise RuntimeError(f"DPS registration returned status {registration_result.status!r}")

        assigned_hub = registration_result.registration_state.assigned_hub
        device_id = registration_result.registration_state.device_id or self._dps_registration_id
        return IoTHubDeviceClient.create_from_symmetric_key(
            symmetric_key=self._dps_symmetric_key,
            hostname=assigned_hub,
            device_id=device_id,
        )

    def _connect(self) -> bool:
        """One connection attempt. On failure, schedules the next one with backoff."""
        try:
            client = self._create_hub_client()
            client.connect()
        except Exception as exc:
            self._client = None
            delay = RECONNECT_BACKOFF_S[min(self._failures, len(RECONNECT_BACKOFF_S) - 1)]
            self._next_attempt = time.monotonic() + delay
            if self._failures == 0:
                log.exception(
                    "Failed to connect to Azure IoT Hub with the configured "
                    "Azure IoT credential — telemetry is logged locally and the "
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
            and self._has_auth_config()
            and self._sdk_available()
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
