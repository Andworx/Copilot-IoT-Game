targetScope = 'resourceGroup'

// Lets the game Function App's managed identity read and write the MCP Quest container
// (generated specs, job status, locks and rate-limit counters) and nothing else in the account.
//
// Deploy to rg-aw-azcom-iot-copilot, after main.bicep has created the container. An owner runs
// this, not CI: the infra deploy identity may assign only the Event Hubs Data Receiver role, so
// it cannot assign this one (see README, "Foundry private endpoint and MCP Quest access").

param storageAccountName string = 'stawazcomiotgamev2'
param specContainerName string = 'mcpquest-specs'

@description('Principal id of the game Function App managed identity.')
param functionAppPrincipalId string

@description('Built-in role "Storage Blob Data Contributor".')
param storageBlobDataContributorRoleDefinitionId string = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' existing = {
  parent: storage
  name: 'default'
}

resource specContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' existing = {
  parent: blobs
  name: specContainerName
}

// Scoped to the container, not the account: the identity gets no access to the Function
// package container or the host's own containers through this grant.
resource blobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: specContainer
  name: guid(specContainer.id, functionAppPrincipalId, storageBlobDataContributorRoleDefinitionId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleDefinitionId)
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
  }
}
