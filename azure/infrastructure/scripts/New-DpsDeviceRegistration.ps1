<#
.SYNOPSIS
    Derives a DPS symmetric-key device registration from an enrollment group key.
.DESCRIPTION
    Generates the per-device symmetric key used by Azure IoT Device Provisioning Service
    enrollment groups. The enrollment group key is accepted at runtime from either the
    -EnrollmentGroupKey parameter, the DPS_ENROLLMENT_GROUP_KEY environment variable, or
    a secure prompt. The group key is never written to disk.

    The derived device key is a device credential. Keep it out of git and store it only
    in an approved local secret location or device configuration store.
.PARAMETER RegistrationId
    Stable DPS registration ID for the physical device. Use lowercase letters, numbers,
    and hyphens.
.PARAMETER EnrollmentGroupId
    Optional DPS enrollment group ID. Included in output so local device config records
    which group key was used to derive the device key.
.PARAMETER IdScope
    DPS ID scope. Defaults to the current production DPS scope.
.PARAMETER EnrollmentGroupKey
    Enrollment group primary or secondary key. If omitted, the script checks the
    DPS_ENROLLMENT_GROUP_KEY environment variable, then prompts securely.
.PARAMETER OutputPath
    Optional local path for a generated JSON device configuration. Use an ignored path
    such as .notes/dps/<registration-id>.json.
.EXAMPLE
    $env:DPS_ENROLLMENT_GROUP_KEY = '<group-key-from-portal-or-az-cli>'
    .\New-DpsDeviceRegistration.ps1 -RegistrationId iotpanel-demo-02

    Derives and prints the device registration details for one device.
.EXAMPLE
    .\New-DpsDeviceRegistration.ps1 -RegistrationId iotpanel-demo-02 -OutputPath .notes/dps/iotpanel-demo-02.json

    Derives the device key and writes a local ignored JSON config file.
#>

[CmdletBinding()]
param(
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$EnrollmentGroupId = 'iot-game-fleet',

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$RegistrationId,

    [string]$IdScope = '0ne011EB47B',

    [string]$EnrollmentGroupKey = $env:DPS_ENROLLMENT_GROUP_KEY,

    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

function ConvertFrom-SecureStringToPlainText {
    param(
        [Parameter(Mandatory = $true)]
        [securestring]$SecureValue
    )

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        if ($bstr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
}

if ([string]::IsNullOrWhiteSpace($EnrollmentGroupKey)) {
    $secureKey = Read-Host -Prompt 'DPS enrollment group key' -AsSecureString
    $EnrollmentGroupKey = ConvertFrom-SecureStringToPlainText -SecureValue $secureKey
}

try {
    $groupKeyBytes = [Convert]::FromBase64String($EnrollmentGroupKey)
}
catch {
    throw 'Enrollment group key must be a base64-encoded DPS symmetric key.'
}

$registrationBytes = [Text.Encoding]::UTF8.GetBytes($RegistrationId)
$hmac = [Security.Cryptography.HMACSHA256]::new($groupKeyBytes)
try {
    $deviceKey = [Convert]::ToBase64String($hmac.ComputeHash($registrationBytes))
}
finally {
    $hmac.Dispose()
}

$result = [ordered]@{
    provisioningHost = 'global.azure-devices-provisioning.net'
    idScope = $IdScope
    enrollmentGroupId = $EnrollmentGroupId
    registrationId = $RegistrationId
    symmetricKey = $deviceKey
}

if ($OutputPath) {
    $resolvedOutputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
    $parent = Split-Path -Parent $resolvedOutputPath
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $result | ConvertTo-Json -Depth 5 | Set-Content -Path $resolvedOutputPath -Encoding utf8NoBOM
    Write-Host "[DPS] Wrote device registration config to $resolvedOutputPath" -ForegroundColor Green
    Write-Host '[DPS] Treat this file as a secret; do not commit it.' -ForegroundColor Yellow
}
else {
    $result | ConvertTo-Json -Depth 5
    Write-Host '[DPS] The symmetricKey value is a device secret; do not commit it.' -ForegroundColor Yellow
}