<#
.SYNOPSIS
    Verifies the Event Hub private endpoint, NIC address, and private DNS zone group.
#>
[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-aw-azcom-iot-copilot',
    [string]$PrivateEndpointName = 'iot-demo-eventhub-pe',
    [string]$ExpectedNicName = 'iot-demo-eventhub-pe-nic',
    [string]$VirtualNetworkName = 'iot-demo-vnet',
    [string]$SubnetName = 'private-endpoint',
    [string]$EventHubNamespaceName = 'evhns-aw-iot-copilot',
    [string]$ExpectedPrivateIpAddress = '10.20.1.8',
    [string]$DnsZoneGroupName = 'default',
    [string]$DnsZoneConfigName = 'privatelink-servicebus-windows-net',
    [string]$DnsZoneName = 'privatelink.servicebus.windows.net'
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

$subscriptionId = az account show --query id --output tsv
if ($LASTEXITCODE -ne 0 -or -not $subscriptionId) { throw 'Unable to read the active Azure subscription.' }
$resourceGroupId = "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup"
$expectedSubnetId = "$resourceGroupId/providers/Microsoft.Network/virtualNetworks/$VirtualNetworkName/subnets/$SubnetName"
$expectedNamespaceId = "$resourceGroupId/providers/Microsoft.EventHub/namespaces/$EventHubNamespaceName"
$expectedDnsZoneId = "$resourceGroupId/providers/Microsoft.Network/privateDnsZones/$DnsZoneName"

$endpoint = Invoke-AzJson @('network', 'private-endpoint', 'show', '-g', $ResourceGroup, '-n', $PrivateEndpointName)
Assert-Equal $endpoint.provisioningState 'Succeeded' 'Private endpoint provisioning state'
Assert-Equal $endpoint.customNetworkInterfaceName $ExpectedNicName 'Private endpoint NIC name'
Assert-Equal $endpoint.subnet.id $expectedSubnetId 'Private endpoint subnet'
if (@($endpoint.ipConfigurations).Count -ne 0) { throw 'Expected Azure-managed dynamic private endpoint IP configuration.' }

$connections = @($endpoint.privateLinkServiceConnections)
if ($connections.Count -ne 1) { throw "Expected one private-link connection; found $($connections.Count)." }
Assert-Equal $connections[0].name $PrivateEndpointName 'Private-link connection name'
Assert-Equal $connections[0].privateLinkServiceId $expectedNamespaceId 'Private-link service ID'
if ((@($connections[0].groupIds) -join ',') -ne 'namespace') { throw 'Private-link group ID changed.' }
Assert-Equal $connections[0].privateLinkServiceConnectionState.status 'Approved' 'Private-link connection status'

$nic = Invoke-AzJson @('network', 'nic', 'show', '--ids', $endpoint.networkInterfaces[0].id)
$ipConfigurations = @($nic.ipConfigurations)
if ($ipConfigurations.Count -ne 1) { throw "Expected one NIC IP configuration; found $($ipConfigurations.Count)." }
Assert-Equal $nic.name $ExpectedNicName 'NIC name'
Assert-Equal $ipConfigurations[0].privateIPAddress $ExpectedPrivateIpAddress 'Private endpoint address'
Assert-Equal $ipConfigurations[0].privateIPAllocationMethod 'Dynamic' 'Private endpoint address allocation'

$zoneGroups = @(Invoke-AzJson @('network', 'private-endpoint', 'dns-zone-group', 'list', '-g', $ResourceGroup, '--endpoint-name', $PrivateEndpointName))
$zoneGroup = @($zoneGroups | Where-Object name -eq $DnsZoneGroupName)
if ($zoneGroup.Count -ne 1) { throw "Expected one '$DnsZoneGroupName' DNS zone group; found $($zoneGroup.Count)." }
$configs = @($zoneGroup[0].privateDnsZoneConfigs)
if ($configs.Count -ne 1) { throw "Expected one private DNS zone configuration; found $($configs.Count)." }
Assert-Equal $configs[0].name $DnsZoneConfigName 'Private DNS zone configuration name'
Assert-Equal $configs[0].privateDnsZoneId $expectedDnsZoneId 'Private DNS zone ID'
if (-not (@($configs[0].recordSets).ipAddresses -contains $ExpectedPrivateIpAddress)) {
    throw "Private DNS record set does not contain $ExpectedPrivateIpAddress."
}
$dnsRecord = Invoke-AzJson @('network', 'private-dns', 'record-set', 'a', 'show', '-g', $ResourceGroup, '-z', $DnsZoneName, '-n', $EventHubNamespaceName)
if (-not (@($dnsRecord.aRecords).ipv4Address -contains $ExpectedPrivateIpAddress)) {
    throw "Private DNS A record for $EventHubNamespaceName does not contain $ExpectedPrivateIpAddress."
}

Write-Host "Event Hub private endpoint verified: $PrivateEndpointName -> $ExpectedPrivateIpAddress"
