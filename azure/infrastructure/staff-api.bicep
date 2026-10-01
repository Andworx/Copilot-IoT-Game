// Additive staff backend only. Never deploy main.bicep as part of app releases.
targetScope = 'resourceGroup'

param location string = 'eastus'
param functionAppName string
param sourceFunctionAppName string
param storageAccountName string
param integrationSubnetId string
param tenantId string
param apiClientId string
param connectorClientId string
param staffExists bool = false

// Read before entering the deployment that writes this site. Reading and writing
// the same site in one template creates a circular dependency on repeat releases.
var previousSettings = staffExists
  ? list(resourceId('Microsoft.Web/sites/config', functionAppName, 'appsettings'), '2024-04-01').properties
  : {}

module resources 'modules/staff-resources.bicep' = {
  name: '${deployment().name}-resources'
  params: {
    location: location
    functionAppName: functionAppName
    sourceFunctionAppName: sourceFunctionAppName
    storageAccountName: storageAccountName
    integrationSubnetId: integrationSubnetId
    tenantId: tenantId
    apiClientId: apiClientId
    connectorClientId: connectorClientId
    previousSettings: previousSettings
  }
}

output functionAppName string = resources.outputs.functionAppName
output hostName string = resources.outputs.hostName
output functionAppId string = resources.outputs.functionAppId