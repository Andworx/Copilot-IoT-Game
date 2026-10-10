# DPS enrollment migration and device registration

Issue #214 covers the Device Provisioning Service (DPS) adoption boundary for the
portable Azure infrastructure epic. DPS has two kinds of state:

- service configuration that can be drift-checked and, later, represented in Bicep
- enrollment and device credential state that must stay outside git

The live DPS instance is `dps-aw-iot-copilot` in `rg-aw-azcom-iot-copilot`.

## Current live configuration

| Setting | Value |
|---|---|
| Resource group | `rg-aw-azcom-iot-copilot` |
| DPS name | `dps-aw-iot-copilot` |
| Location | `eastus` |
| SKU | `S1` / Standard, capacity `1` |
| State | `Active` |
| Allocation policy | `Hashed` |
| ID scope | `0ne011EB47B` |
| Linked IoT Hub | `iothub-aw-iot-copilot.azure-devices.net` in `eastus` |
| Public network access | unset in the live resource |
| IP filters | none in the live resource |

Current non-secret enrollment inventory:

| Enrollment type | Name | Attestation | Status | Notes |
|---|---|---|---|---|
| Enrollment group | `iot-game-fleet` | Symmetric key | Enabled | Preferred group for IoT game panel devices. Hashed allocation policy, reprovision policy migrates device data and updates hub assignment |
| Enrollment group | `iotpanel-fleet` | Symmetric key | Enabled | Legacy-named group for panel-style devices. Empty initial twin, IoT Edge disabled, reprovision policy migrates device data and updates hub assignment |
| Individual enrollment | none | n/a | n/a | No individual enrollments were found during the #214 review |

`iotpanel` is a device name/prefix, not the conceptual group boundary. Use
`iot-game-fleet` for new panel registrations and keep `iotpanel-fleet` only as a legacy
rollback/migration source until no devices depend on it. The `iotdisplay` Pi is a kiosk
display only and does not need a DPS or IoT Hub registration.

## What is safe to commit

Safe to commit:

- DPS name, resource group, location, SKU and allocation policy
- ID scope
- linked IoT Hub host name, location and allocation weight
- enrollment group names, attestation type, status, capabilities, initial twin shape and reprovision policy
- individual enrollment names and non-secret metadata

Never commit:

- DPS enrollment group primary or secondary keys
- derived device keys
- IoT Hub owner connection strings
- SAS tokens or registration result credentials
- exported JSON that contains `primaryKey`, `secondaryKey`, `connectionString`, `SharedAccessKey`, `sas`, `token`, `password` or equivalent credential material

Store temporary secret exports only in an ignored local path such as `.notes/dps/` or an approved secret store.

## Enrollment group naming

Creating a new DPS enrollment group is technically easy: it is one Azure CLI or portal
operation, then one test registration. The operational work is deciding the lifecycle and
credential boundary for the group and updating every device that should use it.

Use an enrollment group for a shared lifecycle, credential rotation boundary, owner or
attestation method. Do not create a new group just because there is a new physical panel.
Use unique registration IDs for individual devices within the group.

Recommended group names should describe the fleet or operating context, not a single
device. The approved group for this project is `iot-game-fleet`.

Use individual enrollments instead of a group when a device needs isolated credentials,
independent revocation, or a one-off attestation path.

## Create a new enrollment group

Create the group with generated symmetric keys and no key material in source files,
issues, PRs or chat. Keep the generated keys in process memory only:

```powershell
$primaryBytes = New-Object byte[] 32
$secondaryBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($primaryBytes)
[Security.Cryptography.RandomNumberGenerator]::Fill($secondaryBytes)
$primaryKey = [Convert]::ToBase64String($primaryBytes)
$secondaryKey = [Convert]::ToBase64String($secondaryBytes)

az iot dps enrollment-group create `
   --dps-name dps-aw-iot-copilot `
   --resource-group rg-aw-azcom-iot-copilot `
   --enrollment-id iot-game-fleet `
   --primary-key $primaryKey `
   --secondary-key $secondaryKey `
   --provisioning-status enabled `
   --reprovision-policy reprovisionandmigratedata `
   --allocation-policy hashed `
   -o none
```

After creation, retrieve a group key only into a local-only secret variable, derive a test
device key, and prove one registration before moving more devices. The sensitive command is
`az iot dps enrollment-group show --show-keys`; do not paste its output into files,
issues, PRs or chat.

Existing devices can remain on `iotpanel-fleet` while new devices use `iot-game-fleet`.
Moving an existing device to the new group requires deriving a new device key from the new
group key and reconfiguring the device before it reprovisions.

## Register another device in the current group

Use `iot-game-fleet` for new IoT game panel devices. This keeps the registration path
simple: one DPS group, one ID scope, and one per-device registration ID.

1. Choose a stable lowercase registration ID for the physical device. Recommended format:
   `iotpanel-<short-location-or-kit>-<number>`, for example `iotpanel-demo-02`.
2. Retrieve the enrollment group key into a local-only secret variable. Do not paste it into
   markdown, source files or shell history that will be committed.
3. Derive the device key from the registration ID using the DPS symmetric-key derivation process.
4. Configure the device with:
   - DPS global endpoint: `global.azure-devices-provisioning.net`
   - ID scope: `0ne011EB47B`
   - registration ID: the chosen device ID
   - derived device key: local secret only
   - existing non-secret runtime settings such as `MODE_STATE_URL`
5. Boot the device and confirm provisioning assigns it to `iothub-aw-iot-copilot.azure-devices.net`.
6. Confirm the Pi reads the same active `deviceSlug` as `GET /api/kiosk-state`. If `MODE_STATE_URL`
   is missing, the Pi falls back to `thermostat` and the kiosk filters out live telemetry for other modes.
7. Confirm telemetry reaches Event Hub, the game Function App, SignalR and the kiosk.

Do not create a new enrollment group for each panel unless the device needs a separate
credential rotation boundary, owner, lifecycle or attestation method. For ordinary demo panels,
use `iot-game-fleet` and unique registration IDs.

Use the local helper to derive a device key without adding secrets to the repo:

```powershell
$env:DPS_ENROLLMENT_GROUP_KEY = '<paste group key for this shell only>'
.\azure\infrastructure\scripts\New-DpsDeviceRegistration.ps1 `
   -EnrollmentGroupId iot-game-fleet `
   -RegistrationId copilotiotpanel `
   -OutputPath .notes/dps/copilotiotpanel.json
Remove-Item Env:\DPS_ENROLLMENT_GROUP_KEY
```

`.notes/` is ignored by git. Treat the generated JSON as a device secret because it contains
the derived symmetric key.

## Secret-safe inventory commands

These commands intentionally omit key material.

```powershell
az iot dps enrollment-group list `
  --dps-name dps-aw-iot-copilot `
  --resource-group rg-aw-azcom-iot-copilot `
  --query "[].{enrollmentGroupId:enrollmentGroupId,attestationType:attestation.type,allocationPolicy:allocationPolicy,iotHubs:iotHubs,provisioningStatus:provisioningStatus,initialTwin:initialTwin,capabilities:capabilities,reprovisionPolicy:reprovisionPolicy}" `
  -o json

az iot dps enrollment list `
  --dps-name dps-aw-iot-copilot `
  --resource-group rg-aw-azcom-iot-copilot `
  --query "[].{registrationId:registrationId,attestationType:attestation.type,allocationPolicy:allocationPolicy,iotHubHostName:iotHubHostName,provisioningStatus:provisioningStatus,initialTwin:initialTwin,capabilities:capabilities,reprovisionPolicy:reprovisionPolicy}" `
  -o json
```

If a full export is needed for migration, write it to `.notes/dps/` and scan it before use.
Remove or redact every credential field before copying any sample into docs.

## Destination subscription migration sequence

1. Create or deploy the destination IoT Hub and DPS service with the same SKU, location choice,
   allocation policy and linked-hub intent.
2. Supply the linked IoT Hub connection string through an approved secret path only. ARM/Bicep
   requires the linked-hub value as a connection string; it must not be committed.
3. Recreate `iot-game-fleet` in the destination DPS. Preserve `iotpanel-fleet` only if
   rollback or legacy devices still depend on that group; otherwise migrate devices in batches.
4. Choose whether to preserve the enrollment group key or intentionally rotate it:
   - preserve: devices can keep their derived keys if the DPS ID scope and group key are unchanged
   - rotate: every device must receive a newly derived device key
5. Provision one test device against the destination DPS and confirm the assigned hub.
6. Validate telemetry end to end before moving additional devices.
7. Move devices in small batches. Keep the source DPS and IoT Hub unchanged until the batch passes.

## Rollback

Rollback is device-side until the source DPS is retired:

1. Reconfigure the test device with the source DPS ID scope and source-derived device key.
2. Reboot/restart provisioning on the device.
3. Confirm it returns to `iothub-aw-iot-copilot.azure-devices.net`.
4. Confirm telemetry reaches Event Hub, the game Function App, SignalR and the kiosk.

Do not delete or rotate the source group key until all devices have been validated in the
destination and rollback is no longer required.

## Validation checklist

- `Invoke-ReferenceSnapshot.ps1 -Mode Check` passes for `dps`.
- Non-secret enrollment inventory shows every approved source or destination enrollment group enabled.
- A test device provisions successfully through DPS.
- The assigned hub is the expected IoT Hub.
- The device sends telemetry visible in Event Hub and the kiosk path.
- No derived keys, group keys, connection strings or SAS tokens are committed.