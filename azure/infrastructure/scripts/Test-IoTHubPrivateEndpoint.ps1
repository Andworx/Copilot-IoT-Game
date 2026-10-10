<#
.SYNOPSIS
    Verifies the IoT Hub private endpoint, NIC addresses, and dual private DNS zone group.
#>
[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-aw-azcom-iot-copilot',
    [string]$PrivateEndpointName = 'iot-migration-iothub-pe',
    [string]$ExpectedNicName = 'iot-migration-iothub-pe-nic',
    [string]$VirtualNetworkName = 'iot-demo-vnet',
    [string]$SubnetName = 'private-endpoint',
    [string]$IoTHubName = 'iothub-aw-iot-copilot',
    [string]$ExpectedPrimaryIpAddress = '10.20.1.5',
    [hashtable]$ExpectedAuxiliaryIpAddresses = @{
        eventHub = '10.20.1.6'
        iotHubService = '10.20.1.7'
        iotHubDevice = '10.20.1.8'
    },
    [string]$DnsZoneGroupName = 'default',
    [string]$AzureDevicesDnsZoneConfigName = 'privatelink-azure-devices-net',
    [string]$AzureDevicesDnsZoneName = 'privatelink.azure-devices.net',
    [string]$ServiceBusDnsZoneConfigName = 'privatelink-servicebus-windows-net',
    [string]$ServiceBusDnsZoneName = 'privatelink.servicebus.windows.net',
    [string]$ServiceBusRecordName = 'iothub-ns-iothub-aw-71786961-f691b3a2a6'
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
    throw "IoT Hub private endpoint NIC is '$($endpoint.customNetworkInterfaceName)', expected '$ExpectedNicName'."
}
if ($endpoint.subnet.id -notlike "*$expectedSubnetSuffix") {
    throw "IoT Hub private endpoint subnet is '$($endpoint.subnet.id)', expected suffix '$expectedSubnetSuffix'."
}

$connection = @($endpoint.privateLinkServiceConnections | Where-Object {
    $_.name -eq $PrivateEndpointName -and
    $_.privateLinkServiceId -like "*/providers/Microsoft.Devices/IotHubs/$IoTHubName" -and
    @($_.groupIds) -contains 'iotHub' -and
    $_.privateLinkServiceConnectionState.status -eq 'Approved'
})
if ($connection.Count -ne 1) { throw 'IoT Hub private endpoint connection is not approved with groupId iotHub.' }

$nicId = $endpoint.networkInterfaces[0].id
if (-not $nicId) { throw 'IoT Hub private endpoint has no network interface.' }
$nic = Invoke-AzJson @('resource', 'show', '--ids', $nicId, '--api-version', '2024-05-01')
$ipConfigurations = @($nic.properties.ipConfigurations)
$primaryIpConfig = @($ipConfigurations | Where-Object { $_.properties.primary -eq $true })
if ($primaryIpConfig.Count -ne 1) { throw "IoT Hub private endpoint has $($primaryIpConfig.Count) primary NIC IP configurations, expected 1." }
if ($primaryIpConfig[0].properties.privateIPAddress -ne $ExpectedPrimaryIpAddress) {
    throw "IoT Hub private endpoint primary IP is '$($primaryIpConfig[0].properties.privateIPAddress)', expected '$ExpectedPrimaryIpAddress'."
}

foreach ($memberName in $ExpectedAuxiliaryIpAddresses.Keys) {
    $expectedIpAddress = $ExpectedAuxiliaryIpAddresses[$memberName]
    $ipConfig = @($ipConfigurations | Where-Object {
        $_.properties.privateLinkConnectionProperties.groupId -eq 'iotHub' -and
        $_.properties.privateLinkConnectionProperties.requiredMemberName -eq $memberName
    })
    if ($ipConfig.Count -ne 1) { throw "IoT Hub private endpoint missing NIC IP configuration for member '$memberName'." }
    if ($ipConfig[0].properties.privateIPAddress -ne $expectedIpAddress) {
        throw "IoT Hub private endpoint member '$memberName' IP is '$($ipConfig[0].properties.privateIPAddress)', expected '$expectedIpAddress'."
    }
}

$zoneGroup = Invoke-AzJson @('network', 'private-endpoint', 'dns-zone-group', 'show', '-g', $ResourceGroup, '--endpoint-name', $PrivateEndpointName, '-n', $DnsZoneGroupName)
$azureDevicesZoneConfig = @($zoneGroup.privateDnsZoneConfigs | Where-Object {
    $_.name -eq $AzureDevicesDnsZoneConfigName -and $_.privateDnsZoneId -like "*/privateDnsZones/$AzureDevicesDnsZoneName"
})
if ($azureDevicesZoneConfig.Count -ne 1) { throw 'IoT Hub private DNS zone group does not point to the expected Azure Devices zone.' }

$serviceBusZoneConfig = @($zoneGroup.privateDnsZoneConfigs | Where-Object {
    $_.name -eq $ServiceBusDnsZoneConfigName -and $_.privateDnsZoneId -like "*/privateDnsZones/$ServiceBusDnsZoneName"
})
if ($serviceBusZoneConfig.Count -ne 1) { throw 'IoT Hub private DNS zone group does not point to the expected Service Bus zone.' }

$expectedAzureDevicesRecords = @{
    $IoTHubName = $ExpectedPrimaryIpAddress
    "$IoTHubName.service" = $ExpectedAuxiliaryIpAddresses.iotHubService
    "$IoTHubName.device" = $ExpectedAuxiliaryIpAddresses.iotHubDevice
}
foreach ($recordName in $expectedAzureDevicesRecords.Keys) {
    $recordSet = Invoke-AzJson @('network', 'private-dns', 'record-set', 'a', 'show', '-g', $ResourceGroup, '-z', $AzureDevicesDnsZoneName, '-n', $recordName)
    $privateDnsAddresses = @($recordSet.aRecords | ForEach-Object { $_.ipv4Address })
    if ($privateDnsAddresses -notcontains $expectedAzureDevicesRecords[$recordName]) {
        throw "IoT Hub private DNS A record '$recordName.$AzureDevicesDnsZoneName' is '$($privateDnsAddresses -join ', ')', expected '$($expectedAzureDevicesRecords[$recordName])'."
    }
}

$serviceBusRecordSet = Invoke-AzJson @('network', 'private-dns', 'record-set', 'a', 'show', '-g', $ResourceGroup, '-z', $ServiceBusDnsZoneName, '-n', $ServiceBusRecordName)
$serviceBusPrivateDnsAddresses = @($serviceBusRecordSet.aRecords | ForEach-Object { $_.ipv4Address })
if ($serviceBusPrivateDnsAddresses -notcontains $ExpectedAuxiliaryIpAddresses.eventHub) {
    throw "IoT Hub private DNS A record '$ServiceBusRecordName.$ServiceBusDnsZoneName' is '$($serviceBusPrivateDnsAddresses -join ', ')', expected '$($ExpectedAuxiliaryIpAddresses.eventHub)'."
}

Write-Host "IoT Hub private endpoint $PrivateEndpointName is approved at $ExpectedPrimaryIpAddress with auxiliary addresses $($ExpectedAuxiliaryIpAddresses.Values -join ', ') and dual DNS zones."