#!/usr/bin/env python3
"""Checks that the panel Pi can authenticate to Azure IoT Hub, without printing the key.

Run on the Pi from this folder, using the same venv and .env as the service:
    .venv/bin/python3 check_iot_connection.py

Prints the hub host name and device id from AZURE_IOT_CONNECTION_STRING (never the shared
access key), then connects once and disconnects. Exit code 0 means the hub accepted the
credential. "Connection Refused: not authorised" means the key in .env doesn't match the
device's key in the hub (rotated, or copied from another device).

IoT Hub allows one connection per device id, so run this while the panel service is not
connected (for example, right after it failed to connect at startup, or with it stopped).
"""
import sys

from dotenv import load_dotenv

load_dotenv()

import os  # noqa: E402

conn_str = os.environ.get("AZURE_IOT_CONNECTION_STRING", "")
if not conn_str:
    print("FAIL: AZURE_IOT_CONNECTION_STRING is not set in .env")
    sys.exit(2)

parts = dict(p.split("=", 1) for p in conn_str.split(";") if "=" in p)
print("host:  ", parts.get("HostName", "?"))
print("device:", parts.get("DeviceId", "?"))

try:
    from azure.iot.device import IoTHubDeviceClient
except ImportError:
    print("FAIL: azure-iot-device is not installed in this environment")
    sys.exit(2)

client = IoTHubDeviceClient.create_from_connection_string(conn_str)
try:
    client.connect()
except Exception as exc:  # the SDK raises several transport exception types
    print("FAIL:", type(exc).__name__ + ":", exc)
    sys.exit(1)
finally:
    try:
        client.shutdown()
    except Exception:
        pass

print("OK: the hub accepted the credential")
