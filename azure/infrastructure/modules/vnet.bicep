param name string
param location string = resourceGroup().location
param addressPrefixes array
param subnets array
param tags object = {}

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: addressPrefixes
    }
    enableDdosProtection: false
    encryption: {
      enabled: false
      enforcement: 'AllowUnencrypted'
    }
    privateEndpointVNetPolicies: 'Disabled'
    subnets: [for subnet in subnets: {
      name: subnet.name
      properties: {
        addressPrefixes: subnet.addressPrefixes
        defaultOutboundAccess: subnet.defaultOutboundAccess
        privateEndpointNetworkPolicies: subnet.privateEndpointNetworkPolicies
        privateLinkServiceNetworkPolicies: subnet.privateLinkServiceNetworkPolicies
        delegations: subnet.delegations
        serviceEndpoints: subnet.serviceEndpoints
      }
    }]
  }
}

output id string = vnet.id
output name string = vnet.name
