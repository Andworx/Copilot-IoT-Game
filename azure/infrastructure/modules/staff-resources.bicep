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
@secure()
param previousSettings object

var apiVersion = '2024-04-01'
var ownerTags = { application: 'CopilotIoTGame', component: 'staff-api', managedBy: 'deploy-apps' }
// Evaluated within ARM, never exported to a runner file, command argument or output.
var sourceSettings = list(resourceId('Microsoft.Web/sites/config', sourceFunctionAppName, 'appsettings'), apiVersion).properties
var runtimeNames = [
  'DATAVERSE_URL'
  'DATAVERSE_TENANT_ID'
  'DATAVERSE_CLIENT_ID'
  'DATAVERSE_CLIENT_SECRET'
  'AzureSignalRConnectionString'
  'GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID'
  'PREFERENCE_TOKEN_SECRET'
  'MARKETING_SENDER_ADDRESS'
  'FOLLOW_UP_MARKETING_HTML'
  'APPLICATIONINSIGHTS_CONNECTION_STRING'
]
var inheritedSettings = toObject(filter(runtimeNames, name => contains(sourceSettings, name)), name => name, name => sourceSettings[name])

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: ownerTags
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    // Matches the existing Flex deployment model; never exposed to the frontend.
    allowSharedKeyAccess: true
    publicNetworkAccess: 'Enabled'
  }
}
resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}
resource packageContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: 'staff-function-package'
  properties: { publicAccess: 'None' }
}
resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${functionAppName}-plan'
  location: location
  tags: ownerTags
  kind: 'functionapp'
  sku: { name: 'FC1', tier: 'FlexConsumption' }
  properties: { reserved: true }
}

var storageConnection = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
var managedSettings = {
  AzureWebJobsStorage: storageConnection
  DEPLOYMENT_STORAGE_CONNECTION_STRING: storageConnection
  API_SURFACE: 'staff'
  STAFF_AUTH_TENANT_ID: tenantId
  STAFF_AUTH_AUDIENCE: apiClientId
  STAFF_AUTH_CLIENT_ID: connectorClientId
}

resource staff 'Microsoft.Web/sites@2024-04-01' = {
  name: functionAppName
  location: location
  tags: ownerTags
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    virtualNetworkSubnetId: integrationSubnetId
    functionAppConfig: {
      runtime: { name: 'node', version: '22' }
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}${packageContainer.name}'
          authentication: {
            type: 'StorageAccountConnectionString'
            storageAccountConnectionStringName: 'DEPLOYMENT_STORAGE_CONNECTION_STRING'
          }
        }
      }
      scaleAndConcurrency: {
        instanceMemoryMB: 2048
        maximumInstanceCount: 40
        alwaysReady: []
      }
    }
    siteConfig: {
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: map(items(union(previousSettings, inheritedSettings, managedSettings)), setting => {
        name: setting.key
        value: string(setting.value)
      })
    }
  }
}

// Entra/RBAC-only management plane: deploys use OIDC (azure/login + Azure/functions-action), so SCM and
// FTP password authentication are not needed. Issue #115.
resource scmBasicAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-04-01' = {
  parent: staff
  name: 'scm'
  properties: { allow: false }
}

resource ftpBasicAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-04-01' = {
  parent: staff
  name: 'ftp'
  properties: { allow: false }
}

// Only non-secret outputs. Never output app settings or a storage connection string.
output functionAppName string = staff.name
output hostName string = staff.properties.defaultHostName
output functionAppId string = staff.id
