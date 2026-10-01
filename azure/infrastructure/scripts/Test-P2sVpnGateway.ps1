<#
.SYNOPSIS
    Verifies the public IP and Point-to-Site VPN gateway contract used by the GL.iNet router.
#>
[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-aw-azcom-iot-copilot',
    [string]$PublicIpName = 'iot-demo-vpn-pip',
    [string]$GatewayName = 'iot-demo-vpn',
    [string]$ExpectedPublicIpAddress = '20.83.141.134',
    [string]$ExpectedRootCertificateName = 'IoTDemo-VPN-Root',
    [string]$ExpectedRootCertificateSha256 = 'E938743A23DCE67592C9DF8268AC7C413DC128029E2D06A4EB99C9F96B93B8A7'
)

$ErrorActionPreference = 'Stop'

function Invoke-AzJson([string[]]$Arguments) {
    $json = az @Arguments --only-show-errors --output json
    if ($LASTEXITCODE -ne 0) { throw "Azure CLI failed: az $($Arguments -join ' ')" }
    return $json | ConvertFrom-Json
}

function Assert-Equal($Actual, $Expected, [string]$Name) {
    if ($Actual -ne $Expected) { throw "$Name is '$Actual'; expected '$Expected'." }
}

$publicIp = Invoke-AzJson @('network', 'public-ip', 'show', '-g', $ResourceGroup, '-n', $PublicIpName)
Assert-Equal $publicIp.provisioningState 'Succeeded' 'Public IP provisioning state'
Assert-Equal $publicIp.publicIPAllocationMethod 'Static' 'Public IP allocation'
Assert-Equal $publicIp.publicIPAddressVersion 'IPv4' 'Public IP version'
Assert-Equal $publicIp.sku.name 'Standard' 'Public IP SKU'
Assert-Equal $publicIp.sku.tier 'Regional' 'Public IP tier'
Assert-Equal $publicIp.ipAddress $ExpectedPublicIpAddress 'Public IP address'
if ((@($publicIp.zones) -join ',') -ne '1,2,3') { throw "Public IP zones are '$(@($publicIp.zones) -join ',')'; expected '1,2,3'." }

$gateway = Invoke-AzJson @('network', 'vnet-gateway', 'show', '-g', $ResourceGroup, '-n', $GatewayName)
Assert-Equal $gateway.provisioningState 'Succeeded' 'Gateway provisioning state'
Assert-Equal $gateway.gatewayType 'Vpn' 'Gateway type'
Assert-Equal $gateway.vpnType 'RouteBased' 'VPN type'
Assert-Equal $gateway.vpnGatewayGeneration 'Generation2' 'VPN gateway generation'
Assert-Equal $gateway.sku.name 'VpnGw1AZ' 'Gateway SKU'
Assert-Equal $gateway.enableBgp $true 'BGP setting'
Assert-Equal $gateway.activeActive $false 'Active-active setting'

$client = $gateway.vpnClientConfiguration
if ((@($client.vpnClientAddressPool.addressPrefixes) -join ',') -ne '172.27.240.0/24') { throw 'VPN client address pool changed.' }
if ((@($client.vpnClientProtocols) -join ',') -ne 'OpenVPN') { throw 'VPN client protocol changed.' }
if ((@($client.vpnAuthenticationTypes) -join ',') -ne 'Certificate') { throw 'VPN authentication type changed.' }
if (@($client.vpnClientRevokedCertificates).Count -ne 0) { throw 'Unexpected revoked VPN client certificate entries.' }

$rootCertificates = @($client.vpnClientRootCertificates)
if ($rootCertificates.Count -ne 1) { throw "Expected one VPN root certificate; found $($rootCertificates.Count)." }
Assert-Equal $rootCertificates[0].name $ExpectedRootCertificateName 'VPN root certificate name'
$certificateHash = [Convert]::ToHexString(
    [Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($rootCertificates[0].publicCertData))
)
Assert-Equal $certificateHash $ExpectedRootCertificateSha256 'VPN root certificate SHA-256'

Write-Host "P2S VPN verified: $GatewayName ($ExpectedPublicIpAddress), OpenVPN/certificate, 172.27.240.0/24"
