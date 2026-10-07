targetScope = 'resourceGroup'

@allowed(['eastus'])
param location string = 'eastus'

var tags = {
  application: 'CopilotIoTGame'
  purpose: 'subscription-migration'
  'managed-by': 'bicep'
}

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' existing = {
  name: 'iot-demo-vnet'
}

resource eventHub 'Microsoft.EventHub/namespaces@2024-01-01' existing = {
  name: 'evhns-aw-iot-copilot'
}

resource iotHub 'Microsoft.Devices/IotHubs@2023-06-30' existing = {
  name: 'iothub-aw-iot-copilot'
}

module eventHubEndpoint 'modules/eventhub-private-endpoint.bicep' = {
  name: 'destination-eventhub-pe'
  params: {
    location: location
    privateEndpointName: 'iot-migration-eventhub-pe'
    customNetworkInterfaceName: 'iot-migration-eventhub-pe-nic'
    subnetId: '${vnet.id}/subnets/private-endpoint'
    eventHubNamespaceId: eventHub.id
    privateDnsZoneGroupName: 'default'
    privateDnsZoneConfigName: 'privatelink-servicebus-windows-net'
    privateDnsZoneId: resourceId('Microsoft.Network/privateDnsZones', 'privatelink.servicebus.windows.net')
    tags: tags
  }
}

module iotHubEndpoint 'modules/iothub-private-endpoint.bicep' = {
  name: 'destination-iothub-pe'
  params: {
    location: location
    privateEndpointName: 'iot-migration-iothub-pe'
    customNetworkInterfaceName: 'iot-migration-iothub-pe-nic'
    subnetId: '${vnet.id}/subnets/private-endpoint'
    iotHubId: iotHub.id
    privateDnsZoneGroupName: 'default'
    privateDnsZoneConfigs: [
      {
        name: 'privatelink-azure-devices-net'
        properties: {
          privateDnsZoneId: resourceId('Microsoft.Network/privateDnsZones', 'privatelink.azure-devices.net')
        }
      }
      {
        name: 'privatelink-servicebus-windows-net'
        properties: {
          privateDnsZoneId: resourceId('Microsoft.Network/privateDnsZones', 'privatelink.servicebus.windows.net')
        }
      }
    ]
    tags: tags
  }
}

output eventHubPrivateEndpointName string = eventHubEndpoint.outputs.privateEndpointName
output iotHubPrivateEndpointName string = iotHubEndpoint.outputs.privateEndpointName