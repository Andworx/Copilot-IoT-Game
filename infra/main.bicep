// Restore & Spin: the infrastructure this repo owns and may deploy from CI.
// Scope: resource group. Full rationale and the tiers: infra/README.md.
//
//   Tier 1/2 (in this file): Event Hub namespace/hub/consumer groups, SignalR service, and
//   read access for the game Function App's managed identity.
//   Tier 3 (NOT here, by design): IoT Hub, DPS, Function Apps, plans, storage, App Insights.
//   They are captured under infra/reference/ and only drift-checked.
//
// Deploy with an incremental deployment only. Preview first:
//   az deployment group what-if -g <rg> -f main.bicep -p main.prod.bicepparam

targetScope = 'resourceGroup'

param location string = resourceGroup().location
param tags object = {}

param eventHubNamespaceName string
param eventHubName string
param eventHubPartitionCount int
param eventHubRetentionDays int
param eventHubRetentionHours int

@description('Consumer groups on the hub. `funcapp` is the legacy copilot-iot-service app; `gamefunc` is this repo\'s Function App.')
param consumerGroups array

param signalRName string

@description('Principal ID of the game Function App system-assigned identity. Empty until `az functionapp identity assign` has run (the workflow does this); the role assignment is skipped while empty.')
param functionAppPrincipalId string = ''

module eventHub 'modules/eventhub.bicep' = {
  name: 'eventhub'
  params: {
    namespaceName: eventHubNamespaceName
    eventHubName: eventHubName
    location: location
    partitionCount: eventHubPartitionCount
    messageRetentionInDays: eventHubRetentionDays
    retentionTimeInHours: eventHubRetentionHours
    consumerGroups: consumerGroups
    tags: tags
  }
}

module signalR 'modules/signalr.bicep' = {
  name: 'signalr'
  params: {
    name: signalRName
    location: location
    tags: tags
  }
}

module receiver 'modules/eventhub-receiver.bicep' = if (!empty(functionAppPrincipalId)) {
  name: 'eventhub-receiver'
  dependsOn: [eventHub]
  params: {
    namespaceName: eventHubNamespaceName
    eventHubName: eventHubName
    principalId: functionAppPrincipalId
  }
}

// The Function App's settings are merged by infra/scripts/Set-FunctionAppSettings.ps1 from
// these outputs. They are never written by an ARM/Bicep resource: a Microsoft.Web/sites
// resource replaces the whole app-settings collection and would wipe the Dataverse secret.
output eventHubFullyQualifiedNamespace string = eventHub.outputs.fullyQualifiedNamespace
output eventHubName string = eventHub.outputs.eventHubName
output signalRName string = signalR.outputs.name
