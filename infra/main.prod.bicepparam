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

// The deploy workflow assigns the Function App's managed identity, then exports its
// principal ID here. Empty (the default, and what `what-if` runs use) skips the role assignment.
param functionAppPrincipalId = readEnvironmentVariable('FUNCTION_APP_PRINCIPAL_ID', '')
