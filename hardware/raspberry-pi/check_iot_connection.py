#!/usr/bin/env python3
"""Checks that the panel Pi can authenticate to Azure IoT Hub, without printing keys.

Run on the Pi from this folder, using the same venv and .env as the service:
    .venv/bin/python3 check_iot_connection.py

Prints the selected auth path and non-secret identifiers, then connects once and disconnects.
Exit code 0 means DPS and/or IoT Hub accepted the credential. "Connection Refused: not
authorised" means the key in .env doesn't match the active enrollment group/device.

IoT Hub allows one connection per device id, so run this while the panel service is not
connected (for example, right after it failed to connect at startup, or with it stopped).
"""
import sys

from dotenv import load_dotenv

load_dotenv()

import os  # noqa: E402

try:
    from azure.iot.device import IoTHubDeviceClient, ProvisioningDeviceClient
except ImportError:
    print("FAIL: azure-iot-device is not installed in this environment")
    sys.exit(2)

conn_str = os.environ.get("AZURE_IOT_CONNECTION_STRING", "")
dps_id_scope = os.environ.get("AZURE_IOT_DPS_ID_SCOPE", "")
dps_registration_id = os.environ.get("AZURE_IOT_DPS_REGISTRATION_ID", "")
dps_symmetric_key = os.environ.get("AZURE_IOT_DPS_SYMMETRIC_KEY", "")
dps_group_id = os.environ.get("AZURE_IOT_DPS_ENROLLMENT_GROUP_ID", "")

if conn_str:
    parts = dict(p.split("=", 1) for p in conn_str.split(";") if "=" in p)
    print("auth:  connection-string")
    print("host:  ", parts.get("HostName", "?"))
    print("device:", parts.get("DeviceId", "?"))
    client = IoTHubDeviceClient.create_from_connection_string(conn_str)
elif dps_id_scope and dps_registration_id and dps_symmetric_key:
    print("auth:  dps")
    print("scope: ", dps_id_scope)
    print("group: ", dps_group_id or "?")
    print("device:", dps_registration_id)
    provisioning_client = ProvisioningDeviceClient.create_from_symmetric_key(
        provisioning_host="global.azure-devices-provisioning.net",
        registration_id=dps_registration_id,
        id_scope=dps_id_scope,
        symmetric_key=dps_symmetric_key,
    )
    result = provisioning_client.register()
    if result.status != "assigned":
        print("FAIL: DPS registration returned", repr(result.status))
        sys.exit(1)
    print("hub:   ", result.registration_state.assigned_hub)
    client = IoTHubDeviceClient.create_from_symmetric_key(
        symmetric_key=dps_symmetric_key,
        hostname=result.registration_state.assigned_hub,
        device_id=result.registration_state.device_id or dps_registration_id,
    )
else:
    print("FAIL: set either AZURE_IOT_CONNECTION_STRING or all AZURE_IOT_DPS_* values in .env")
    sys.exit(2)

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
