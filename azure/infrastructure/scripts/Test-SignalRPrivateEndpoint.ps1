<#
.SYNOPSIS
    Verifies the SignalR private endpoint, NIC address, and private DNS zone group.
#>
[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-aw-azcom-iot-copilot',
    [string]$PrivateEndpointName = 'iot-rebuild-signalr-pe',
    [string]$ExpectedNicName = 'iot-rebuild-signalr-pe-nic',
    [string]$VirtualNetworkName = 'iot-demo-vnet',
    [string]$SubnetName = 'private-endpoint',
    [string]$SignalRName = 'signalr-aw-iot-copilot',
    [string]$DnsZoneGroupName = 'default',
    [string]$DnsZoneConfigName = 'privatelink-service-signalr-net',
    [string]$DnsZoneName = 'privatelink.service.signalr.net'
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
    throw "SignalR private endpoint NIC is '$($endpoint.customNetworkInterfaceName)', expected '$ExpectedNicName'."
}
if ($endpoint.subnet.id -notlike "*$expectedSubnetSuffix") {
    throw "SignalR private endpoint subnet is '$($endpoint.subnet.id)', expected suffix '$expectedSubnetSuffix'."
}

$connection = @($endpoint.privateLinkServiceConnections | Where-Object {
    $_.name -eq $PrivateEndpointName -and
    $_.privateLinkServiceId -like "*/providers/Microsoft.SignalRService/SignalR/$SignalRName" -and
    @($_.groupIds) -contains 'signalr' -and
    $_.privateLinkServiceConnectionState.status -eq 'Approved'
})
if ($connection.Count -ne 1) { throw 'SignalR private endpoint connection is not approved with groupId signalr.' }

$nicId = $endpoint.networkInterfaces[0].id
if (-not $nicId) { throw 'SignalR private endpoint has no network interface.' }
$nic = Invoke-AzJson @('resource', 'show', '--ids', $nicId, '--api-version', '2024-05-01')
$privateIpAddress = $nic.properties.ipConfigurations[0].properties.privateIPAddress
if ([string]::IsNullOrWhiteSpace($privateIpAddress)) { throw 'SignalR private endpoint NIC has no private IP address.' }

$zoneGroup = Invoke-AzJson @('network', 'private-endpoint', 'dns-zone-group', 'show', '-g', $ResourceGroup, '--endpoint-name', $PrivateEndpointName, '-n', $DnsZoneGroupName)
$zoneConfig = @($zoneGroup.privateDnsZoneConfigs | Where-Object {
    $_.name -eq $DnsZoneConfigName -and $_.privateDnsZoneId -like "*/privateDnsZones/$DnsZoneName"
})
if ($zoneConfig.Count -ne 1) { throw 'SignalR private DNS zone group does not point to the expected zone.' }

$recordSet = Invoke-AzJson @('network', 'private-dns', 'record-set', 'a', 'show', '-g', $ResourceGroup, '-z', $DnsZoneName, '-n', $SignalRName)
$privateDnsAddresses = @($recordSet.aRecords | ForEach-Object { $_.ipv4Address })
if ($privateDnsAddresses -notcontains $privateIpAddress) {
    throw "SignalR private DNS A record is '$($privateDnsAddresses -join ', ')', expected '$privateIpAddress'."
}

Write-Host "SignalR private endpoint $PrivateEndpointName is approved at $privateIpAddress with DNS zone $DnsZoneName."