<#
.SYNOPSIS
    Verifies the game storage blob private endpoint, NIC address, and private DNS zone group.
#>
[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-aw-azcom-iot-copilot',
    [string]$PrivateEndpointName = 'iot-demo-game-storage-blob-pe',
    [string]$ExpectedNicName = 'iot-demo-game-storage-blob-pe-nic',
    [string]$VirtualNetworkName = 'iot-demo-vnet',
    [string]$SubnetName = 'private-endpoint',
    [string]$StorageAccountName = 'stawazcomiotgamefn',
    [string]$ExpectedPrivateIpAddress = '10.20.1.11',
    [string]$DnsZoneGroupName = 'default',
    [string]$DnsZoneConfigName = 'privatelink-blob-core-windows-net',
    [string]$DnsZoneName = 'privatelink.blob.core.windows.net'
)

$ErrorActionPreference = 'Stop'

function Invoke-AzJson([string[]]$Arguments) {
    $json = & az @Arguments --only-show-errors -o json
    if ($LASTEXITCODE -ne 0) { throw "Azure CLI failed: az $($Arguments -join ' ')" }
    return $json | ConvertFrom-Json
}

$endpoint = Invoke-AzJson @('network', 'private-endpoint', 'show', '-g', $ResourceGroup, '-n', $PrivateEndpointName)
$expectedSubnetSuffix = "/virtualNetworks/$VirtualNetworkName/subnets/$SubnetName"
if ($endpoint.customNetworkInterfaceName -ne $ExpectedNicName) {
    throw "Game storage blob private endpoint NIC is '$($endpoint.customNetworkInterfaceName)', expected '$ExpectedNicName'."
}
if ($endpoint.subnet.id -notlike "*$expectedSubnetSuffix") {
    throw "Game storage blob private endpoint subnet is '$($endpoint.subnet.id)', expected suffix '$expectedSubnetSuffix'."
}

$connection = @($endpoint.privateLinkServiceConnections | Where-Object {
    $_.name -eq $PrivateEndpointName -and
    $_.privateLinkServiceId -like "*/providers/Microsoft.Storage/storageAccounts/$StorageAccountName" -and
    @($_.groupIds) -contains 'blob' -and
    $_.privateLinkServiceConnectionState.status -eq 'Approved'
})
if ($connection.Count -ne 1) { throw 'Game storage blob private endpoint connection is not approved with groupId blob.' }

$nicId = $endpoint.networkInterfaces[0].id
if (-not $nicId) { throw 'Game storage blob private endpoint has no network interface.' }
$nic = Invoke-AzJson @('resource', 'show', '--ids', $nicId, '--api-version', '2024-05-01')
$privateIpAddress = $nic.properties.ipConfigurations[0].properties.privateIPAddress
if ($privateIpAddress -ne $ExpectedPrivateIpAddress) {
    throw "Game storage blob private endpoint private IP is '$privateIpAddress', expected '$ExpectedPrivateIpAddress'."
}

$zoneGroup = Invoke-AzJson @('network', 'private-endpoint', 'dns-zone-group', 'show', '-g', $ResourceGroup, '--endpoint-name', $PrivateEndpointName, '-n', $DnsZoneGroupName)
$zoneConfig = @($zoneGroup.privateDnsZoneConfigs | Where-Object {
    $_.name -eq $DnsZoneConfigName -and $_.privateDnsZoneId -like "*/privateDnsZones/$DnsZoneName"
})
if ($zoneConfig.Count -ne 1) { throw 'Game storage blob private DNS zone group does not point to the expected zone.' }

$recordSet = Invoke-AzJson @('network', 'private-dns', 'record-set', 'a', 'show', '-g', $ResourceGroup, '-z', $DnsZoneName, '-n', $StorageAccountName)
$privateDnsAddresses = @($recordSet.aRecords | ForEach-Object { $_.ipv4Address })
if ($privateDnsAddresses -notcontains $ExpectedPrivateIpAddress) {
    throw "Game storage blob private DNS A record is '$($privateDnsAddresses -join ', ')', expected '$ExpectedPrivateIpAddress'."
}

Write-Host "Game storage blob private endpoint $PrivateEndpointName is approved at $ExpectedPrivateIpAddress with DNS zone $DnsZoneName."