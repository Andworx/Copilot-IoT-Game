targetScope = 'resourceGroup'

// The private endpoint that lets the game Function App reach the Foundry (Azure AI Services)
// resource over the VNet, plus the one role the Function App's identity needs on it.
//
// Deploy to rg-aw-ed-azcom-foundry, where the Foundry account and the endpoint already are.
// The endpoint was created by hand and this describes it as it is: a `what-if` against the live
// group should report no change for the endpoint and its DNS zone group, and one new role
// assignment when a principal id is supplied.
//
// An owner runs this, not CI: the infra deploy identity is deliberately limited to
// rg-aw-azcom-iot-copilot and cannot write here or assign this role (see README, "Foundry
// private endpoint and MCP Quest access").

@description('Region of the VNet. The endpoint sits with the VNet, not with the Foundry account.')
param location string = 'eastus'

@description('Name of the Foundry / Azure AI Services account.')
param foundryAccountName string

param privateEndpointName string
param customNetworkInterfaceName string

@description('Resource id of the private-endpoint subnet in iot-demo-vnet.')
param subnetId string

@description('Resource group that holds the three privatelink zones (the IoT group).')
param privateDnsZoneResourceGroup string

param privateDnsZoneGroupName string = 'default'

@description('Zone configs of the endpoint, as they exist: config name and zone name.')
param privateDnsZoneConfigs array

param tags object = {}

@description('Principal id of the game Function App managed identity. Empty skips the role assignment.')
param functionAppPrincipalId string = ''

@description('Built-in role "Foundry User", which lets the identity call models on the account.')
param foundryUserRoleDefinitionId string = '53ca6127-db72-4b80-b1b0-d745d6d5456d'

resource account 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: foundryAccountName
}

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
          privateLinkServiceId: account.id
          groupIds: [
            'account'
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
    privateDnsZoneConfigs: [for config in privateDnsZoneConfigs: {
      name: config.configName
      properties: {
        privateDnsZoneId: resourceId(subscription().subscriptionId, privateDnsZoneResourceGroup, 'Microsoft.Network/privateDnsZones', config.zoneName)
      }
    }]
  }
}

resource foundryUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(functionAppPrincipalId)) {
  scope: account
  name: guid(account.id, functionAppPrincipalId, foundryUserRoleDefinitionId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', foundryUserRoleDefinitionId)
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output privateEndpointName string = endpoint.name
output privateDnsZoneGroupName string = zoneGroup.name
