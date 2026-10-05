// Lets IoT Hub route device telemetry to the Event Hub with managed identity.
// Scoped to the namespace because IoT Hub custom endpoints target the namespace URI.

param namespaceName string

@description('Object (principal) ID of the IoT Hub system-assigned identity.')
param principalId string

// Azure Event Hubs Data Sender
var senderRoleId = '2b629674-e913-4c01-ae53-ef4638d8f975'

resource namespace 'Microsoft.EventHub/namespaces@2024-01-01' existing = {
  name: namespaceName
}

resource sender 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: namespace
  name: guid(namespace.id, principalId, senderRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', senderRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}