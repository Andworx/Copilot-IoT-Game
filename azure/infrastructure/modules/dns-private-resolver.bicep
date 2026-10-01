@description('Name of the existing Azure DNS Private Resolver.')
param resolverName string

@description('Name of the resolver inbound endpoint.')
param inboundEndpointName string

param location string

@description('Resource ID of the virtual network that owns the resolver.')
param virtualNetworkId string

@description('Resource ID of the subnet delegated to Microsoft.Network/dnsResolvers.')
param inboundSubnetId string

@description('Static IPv4 address exposed to VPN clients and the travel router.')
param inboundPrivateIpAddress string

param tags object = {}

resource resolver 'Microsoft.Network/dnsResolvers@2022-07-01' = {
  name: resolverName
  location: location
  tags: tags
  properties: {
    virtualNetwork: {
      id: virtualNetworkId
    }
  }
}

resource inbound 'Microsoft.Network/dnsResolvers/inboundEndpoints@2022-07-01' = {
  parent: resolver
  name: inboundEndpointName
  location: location
  tags: tags
  properties: {
    ipConfigurations: [
      {
        privateIpAllocationMethod: 'Static'
        privateIpAddress: inboundPrivateIpAddress
        subnet: {
          id: inboundSubnetId
        }
      }
    ]
  }
}

output resolverName string = resolver.name
output inboundEndpointName string = inbound.name
output inboundPrivateIpAddress string = inbound.properties.ipConfigurations[0].privateIpAddress
