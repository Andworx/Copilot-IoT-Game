param location string

param publicIpName string
param publicIpZones array
param publicIpTags object = {}

param gatewayName string
param gatewaySkuName string
param gatewayGeneration string
param gatewaySubnetId string
param gatewayTags object = {}

param vpnClientAddressPrefixes array
param vpnClientProtocols array
param vpnAuthenticationTypes array

@description('Public root certificates only. Client certificates and private keys must never be supplied here.')
param vpnClientRootCertificates array

resource publicIp 'Microsoft.Network/publicIPAddresses@2024-05-01' = {
  name: publicIpName
  location: location
  tags: publicIpTags
  sku: {
    name: 'Standard'
    tier: 'Regional'
  }
  zones: publicIpZones
  properties: {
    idleTimeoutInMinutes: 4
    publicIPAddressVersion: 'IPv4'
    publicIPAllocationMethod: 'Static'
    ipTags: []
  }
}

resource gateway 'Microsoft.Network/virtualNetworkGateways@2024-05-01' = {
  name: gatewayName
  location: location
  tags: gatewayTags
  properties: {
    activeActive: false
    enableBgp: true
    gatewayType: 'Vpn'
    vpnType: 'RouteBased'
    vpnGatewayGeneration: gatewayGeneration
    enablePrivateIpAddress: false
    disableIPSecReplayProtection: false
    customRoutes: {
      addressPrefixes: []
    }
    sku: {
      name: gatewaySkuName
      tier: gatewaySkuName
    }
    bgpSettings: {
      asn: 65515
      peerWeight: 0
    }
    ipConfigurations: [
      {
        name: 'default'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          publicIPAddress: {
            id: publicIp.id
          }
          subnet: {
            id: gatewaySubnetId
          }
        }
      }
    ]
    vpnClientConfiguration: {
      vpnAuthenticationTypes: vpnAuthenticationTypes
      vpnClientAddressPool: {
        addressPrefixes: vpnClientAddressPrefixes
      }
      vpnClientProtocols: vpnClientProtocols
      vpnClientIpsecPolicies: []
      vpnClientRootCertificates: vpnClientRootCertificates
      vpnClientRevokedCertificates: []
    }
    allowRemoteVnetTraffic: false
    allowVirtualWanTraffic: false
  }
}

output publicIpName string = publicIp.name
output gatewayName string = gateway.name
