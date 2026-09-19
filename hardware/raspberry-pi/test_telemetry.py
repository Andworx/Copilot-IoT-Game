"""Off-Pi tests for the telemetry client's connection retry. Run from hardware/raspberry-pi:
    python -m unittest test_telemetry -v
No azure-iot-device needed: the SDK classes are replaced with fakes."""
import os
import unittest
from unittest import mock

import telemetry


class FakeClient:
    """Fails to connect until `fail_times` attempts have been used up."""

    attempts = 0
    fail_times = 0

    @classmethod
    def create_from_connection_string(cls, _conn_str):
        return cls()

    def connect(self):
        FakeClient.attempts += 1
        if FakeClient.attempts <= FakeClient.fail_times:
            raise RuntimeError("Connection Refused: not authorised")

    def send_message(self, _message):
        pass

    def shutdown(self):
        pass


def make_client(fail_times):
    FakeClient.attempts = 0
    FakeClient.fail_times = fail_times
    env = {"AZURE_IOT_CONNECTION_STRING": "HostName=h;DeviceId=d;SharedAccessKey=k"}
    with mock.patch.dict(os.environ, env), \
            mock.patch.object(telemetry, "IoTHubDeviceClient", FakeClient), \
            mock.patch.object(telemetry, "Message", lambda body: body):
        return telemetry.TelemetryClient()


class ReconnectTests(unittest.TestCase):
    def test_connects_first_time_when_the_hub_accepts(self):
        client = make_client(fail_times=0)
        self.assertIsNotNone(client._client)
        self.assertEqual(FakeClient.attempts, 1)

    def test_failed_start_is_retried_not_abandoned(self):
        client = make_client(fail_times=1)
        self.assertIsNone(client._client)            # first attempt refused (clock not synced yet)
        with mock.patch.object(telemetry, "IoTHubDeviceClient", FakeClient):
            client._next_attempt = 0                 # the backoff has elapsed
            client._retry_connection_if_due()
        self.assertIsNotNone(client._client)
        self.assertEqual(client._failures, 0)

    def test_no_retry_before_the_backoff_elapses(self):
        client = make_client(fail_times=5)
        attempts = FakeClient.attempts
        with mock.patch.object(telemetry, "IoTHubDeviceClient", FakeClient):
            client._retry_connection_if_due()        # _next_attempt is ~30s away
        self.assertEqual(FakeClient.attempts, attempts)

    def test_backoff_grows_and_is_capped(self):
        client = make_client(fail_times=99)
        delays = []
        with mock.patch.object(telemetry, "IoTHubDeviceClient", FakeClient), \
                mock.patch.object(telemetry.time, "monotonic", return_value=1000.0):
            for _ in range(6):
                client._connect()
                delays.append(client._next_attempt - 1000.0)
        self.assertEqual(delays, [60, 120, 300, 300, 300, 300])   # first failure (30s) happened in __init__

    def test_no_connection_string_never_tries(self):
        with mock.patch.dict(os.environ, {}, clear=True), \
                mock.patch.object(telemetry, "IoTHubDeviceClient", FakeClient):
            FakeClient.attempts = 0
            client = telemetry.TelemetryClient()
            client._retry_connection_if_due()
        self.assertEqual(FakeClient.attempts, 0)
        self.assertIsNone(client._client)


if __name__ == "__main__":
    unittest.main()
