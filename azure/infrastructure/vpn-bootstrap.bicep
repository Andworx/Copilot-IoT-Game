targetScope = 'resourceGroup'

@allowed(['eastus'])
param location string = 'eastus'

@allowed(['Generation1'])
param gatewayGeneration string = 'Generation1'

var network = loadJsonContent('network/baseline.json', '$.vnet')
var publicIp = loadJsonContent('network/baseline.json', '$.publicIp')
var clients = loadJsonContent('network/baseline.json', '$.gateway.properties.vpnClientConfiguration')
var tags = {
  application: 'CopilotIoTGame'
  purpose: 'subscription-migration'
  'managed-by': 'bicep'
}

module vnet 'modules/vnet.bicep' = {
  name: 'destination-vnet'
  params: {
    name: network.name
    location: location
    addressPrefixes: network.properties.addressSpace.addressPrefixes
    subnets: [for subnet in network.properties.subnets: union(subnet.properties, {
      name: subnet.name
    })]
    tags: tags
  }
}

module vpn 'modules/p2s-vpn-gateway.bicep' = {
  name: 'destination-vpn'
  params: {
    location: location
    publicIpName: publicIp.name
    publicIpZones: publicIp.zones
    publicIpTags: tags
    gatewayName: 'iot-demo-vpn'
    gatewaySkuName: 'VpnGw1AZ'
    gatewayGeneration: gatewayGeneration
    gatewaySubnetId: '${vnet.outputs.id}/subnets/GatewaySubnet'
    gatewayTags: tags
    vpnClientAddressPrefixes: clients.vpnClientAddressPool.addressPrefixes
    vpnClientProtocols: clients.vpnClientProtocols
    vpnAuthenticationTypes: clients.vpnAuthenticationTypes
    vpnClientRootCertificates: clients.vpnClientRootCertificates
  }
}

output vnetId string = vnet.outputs.id
output gatewayName string = vpn.outputs.gatewayName
output publicIpName string = vpn.outputs.publicIpName
