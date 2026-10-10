param location string

param privateEndpointName string
param customNetworkInterfaceName string
param subnetId string
param eventHubNamespaceId string
param privateDnsZoneGroupName string
param privateDnsZoneConfigName string
param privateDnsZoneId string
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
          privateLinkServiceId: eventHubNamespaceId
          groupIds: [
            'namespace'
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
    privateDnsZoneConfigs: [
      {
        name: privateDnsZoneConfigName
        properties: {
          privateDnsZoneId: privateDnsZoneId
        }
      }
    ]
  }
}

output privateEndpointName string = endpoint.name
output privateDnsZoneGroupName string = zoneGroup.name
