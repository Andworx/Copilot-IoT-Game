targetScope = 'resourceGroup'

@allowed(['eastus'])
param location string = 'eastus'

var zones = loadJsonContent('network/baseline.json', '$.zones')
var tags = {
  application: 'CopilotIoTGame'
  purpose: 'subscription-migration'
  'managed-by': 'bicep'
}

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' existing = {
  name: 'iot-demo-vnet'
}

module privateDns 'modules/private-dns.bicep' = {
  name: 'destination-private-dns'
  params: {
    zoneNames: [for zone in zones: zone.name]
    linkName: '7jkty3vvfilac'
    virtualNetworkId: vnet.id
    tags: tags
  }
}

module resolver 'modules/dns-private-resolver.bicep' = {
  name: 'destination-dns-resolver'
  params: {
    resolverName: 'iot-demo-dns-resolver'
    inboundEndpointName: 'iot-demo-dns-inbound'
    location: location
    virtualNetworkId: vnet.id
    inboundSubnetId: '${vnet.id}/subnets/dns-inbound'
    inboundPrivateIpAddress: '10.20.3.4'
    tags: tags
  }
}

output resolverName string = resolver.outputs.resolverName
output inboundEndpointName string = resolver.outputs.inboundEndpointName
output inboundPrivateIpAddress string = resolver.outputs.inboundPrivateIpAddress
output privateDnsZoneIds array = privateDns.outputs.zoneIds