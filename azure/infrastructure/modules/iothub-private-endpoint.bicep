param location string

param privateEndpointName string
param customNetworkInterfaceName string
param subnetId string
param iotHubId string
param privateDnsZoneGroupName string
param privateDnsZoneConfigs array
param tags object = {}

resource endpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = {
  name: privateEndpointName
  location: location
  tags: tags
  properties: {
    customNetworkInterfaceName: customNetworkInterfaceName
    ipConfigurations: []
    subnet: {
      id: subnetId
    }
    privateLinkServiceConnections: [
      {
        name: privateEndpointName
        properties: {
          privateLinkServiceId: iotHubId
          groupIds: [
            'iotHub'
          ]
        }
      }
    ]
  }
}

resource zoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = {
  parent: endpoint
  name: privateDnsZoneGroupName
  properties: {
    privateDnsZoneConfigs: privateDnsZoneConfigs
  }
}

output privateEndpointName string = endpoint.name
output privateDnsZoneGroupName string = zoneGroup.name