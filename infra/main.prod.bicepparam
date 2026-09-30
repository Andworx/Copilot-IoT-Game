using 'main.bicep'

// These reproduce what is live in rg-aw-azcom-iot-copilot (verified with `what-if`).
param eventHubNamespaceName = 'evhns-aw-iot-copilot'
param eventHubName = 'iot-telemetry'
param eventHubPartitionCount = 2
param eventHubRetentionDays = 1
param eventHubRetentionHours = 1
param eventHubPublicNetworkAccess = 'Disabled'
param eventHubTrustedServiceAccessEnabled = true
param consumerGroups = [
  '$Default'
  'gamefunc'
]

param signalRName = 'signalr-aw-iot-copilot'
param signalRSkuName = 'Standard_S1'

param vnetName = 'iot-demo-vnet'
param vnetTags = {
  'managed-by': 'bicep'
}
param vnetAddressPrefixes = [
  '10.20.0.0/16'
]
param vnetSubnets = [
  {
    name: 'GatewaySubnet'
    addressPrefixes: [
      '10.20.0.0/27'
    ]
    defaultOutboundAccess: false
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
    delegations: []
    serviceEndpoints: []
  }
  {
    name: 'private-endpoint'
    addressPrefixes: [
      '10.20.1.0/24'
    ]
    defaultOutboundAccess: false
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
    delegations: []
    serviceEndpoints: []
  }
  {
    name: 'dns-inbound'
    addressPrefixes: [
      '10.20.3.0/28'
    ]
    defaultOutboundAccess: false
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
    delegations: [
      {
        name: 'Microsoft.Network/dnsResolvers'
        properties: {
          serviceName: 'Microsoft.Network/dnsResolvers'
        }
      }
    ]
    serviceEndpoints: []
  }
  {
    name: 'function-integration'
    addressPrefixes: [
      '10.20.2.0/26'
    ]
    defaultOutboundAccess: false
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
    delegations: [
      {
        name: 'Microsoft.App/environments'
        properties: {
          serviceName: 'Microsoft.App/environments'
        }
      }
    ]
    serviceEndpoints: []
  }
]

param privateDnsZoneNames = [
  'privatelink.azure-devices.net'
  'privatelink.azurewebsites.net'
  'privatelink.blob.core.windows.net'
  'privatelink.service.signalr.net'
  'privatelink.servicebus.windows.net'
]
param privateDnsLinkName = '7jkty3vvfilac'
param privateDnsTags = {
  'managed-by': 'bicep'
}

// The deploy workflow assigns the Function App's managed identity, then exports its
// principal ID here. Empty (the default, and what `what-if` runs use) skips the role assignment.
param functionAppPrincipalId = readEnvironmentVariable('FUNCTION_APP_PRINCIPAL_ID', '')
