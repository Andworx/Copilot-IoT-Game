param zoneNames array
param linkName string
param virtualNetworkId string
param tags object = {}

resource zones 'Microsoft.Network/privateDnsZones@2020-06-01' = [for zoneName in zoneNames: {
  name: zoneName
  location: 'global'
  tags: tags
  properties: {}
}]

resource links 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = [for (zoneName, index) in zoneNames: {
  name: '${zoneName}/${linkName}'
  location: 'global'
  tags: {}
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: virtualNetworkId
    }
  }
  dependsOn: [zones[index]]
}]

output zoneIds array = [for (zoneName, index) in zoneNames: zones[index].id]
