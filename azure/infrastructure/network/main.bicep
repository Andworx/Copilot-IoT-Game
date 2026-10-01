// Adoption baseline: preserve the current network, not the earlier proposed design.
targetScope = 'resourceGroup'
var baseline = loadJsonContent('baseline.json')

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: baseline.vnet.name
  location: baseline.vnet.location
  tags: baseline.vnet.tags
  properties: baseline.vnet.properties
}
resource publicIp 'Microsoft.Network/publicIPAddresses@2024-05-01' = {
  name: baseline.publicIp.name
  location: baseline.publicIp.location
  tags: baseline.publicIp.tags
  sku: baseline.publicIp.sku
  zones: baseline.publicIp.zones
  properties: baseline.publicIp.properties
}
resource gateway 'Microsoft.Network/virtualNetworkGateways@2024-05-01' = {
  name: baseline.gateway.name
  location: baseline.gateway.location
  tags: baseline.gateway.tags
  properties: baseline.gateway.properties
  dependsOn: [vnet, publicIp]
}
resource resolver 'Microsoft.Network/dnsResolvers@2022-07-01' = {
  name: baseline.resolver.name
  location: baseline.resolver.location
  tags: baseline.resolver.tags
  properties: baseline.resolver.properties
  dependsOn: [vnet]
}
resource inbound 'Microsoft.Network/dnsResolvers/inboundEndpoints@2022-07-01' = {
  parent: resolver
  name: baseline.inbound.name
  location: baseline.inbound.location
  tags: baseline.inbound.tags
  properties: baseline.inbound.properties
}
resource zones 'Microsoft.Network/privateDnsZones@2020-06-01' = [for zone in baseline.zones: {
  name: zone.name
  location: zone.location
  tags: zone.tags
  properties: {}
}]
resource links 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = [for link in baseline.links: {
  name: link.name
  location: link.location
  tags: link.tags
  properties: link.properties
  dependsOn: [zones, vnet]
}]
resource endpoints 'Microsoft.Network/privateEndpoints@2024-05-01' = [for endpoint in baseline.endpoints: {
  name: endpoint.name
  location: endpoint.location
  tags: endpoint.tags
  properties: endpoint.properties
  dependsOn: [vnet]
}]
resource zoneGroups 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = [for group in baseline.zoneGroups: {
  name: group.name
  properties: group.properties
  dependsOn: [endpoints, zones]
}]
