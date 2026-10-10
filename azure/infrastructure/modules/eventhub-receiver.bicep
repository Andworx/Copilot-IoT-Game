// Lets a Function App's managed identity read from one event hub (identity-based Event Hub
// trigger: no connection string in app settings). Scoped to the hub, not the namespace.

param namespaceName string
param eventHubName string

@description('Object (principal) ID of the Function App system-assigned identity.')
param principalId string

@description('Existing role assignment resource name to adopt after a resource move. Empty creates the deterministic default.')
param roleAssignmentName string = ''

// Azure Event Hubs Data Receiver
var receiverRoleId = 'a638d3c7-ab3a-418d-83e6-5f17a39d4fde'

resource namespace 'Microsoft.EventHub/namespaces@2024-01-01' existing = {
  name: namespaceName
}

resource hub 'Microsoft.EventHub/namespaces/eventhubs@2024-01-01' existing = {
  parent: namespace
  name: eventHubName
}

resource receiver 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: hub
  name: empty(roleAssignmentName) ? guid(hub.id, principalId, receiverRoleId) : roleAssignmentName
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', receiverRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
