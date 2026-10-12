param location string

param planName string
param storageAccountName string
param packageContainerName string
param packageContainerUrl string
// MCP Quest generated games: specs, plus short-lived job status, locks and rate-limit counters.
param specContainerName string = 'mcpquest-specs'
param functionAppName string
param resourceTags object
param functionAppTags object = {}
param corsOrigins array
@secure()
param existingSettings object
param integrationSubnetId string

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: resourceTags
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowSharedKeyAccess: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      allowPermanentDelete: false
      enabled: false
    }
  }
}

resource packageContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: packageContainerName
  properties: {
    defaultEncryptionScope: '$account-encryption-key'
    denyEncryptionScopeOverride: false
    publicAccess: 'None'
  }
}

// Holds `by-id/` and `by-hash/` (the generated specs, kept) and `jobs/`, `limits/` and `locks/`
// (state that only matters for minutes). Private: no public access, reached by the Function
// App's managed identity over the storage private endpoint.
resource specContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: specContainerName
  properties: {
    defaultEncryptionScope: '$account-encryption-key'
    denyEncryptionScopeOverride: false
    publicAccess: 'None'
  }
}

// Lifecycle rules run about once a day, so state expires within one to two days. The account had
// no management policy when this was written; this rule only touches the three state prefixes.
resource lifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          enabled: true
          name: 'expire-mcpquest-state'
          type: 'Lifecycle'
          definition: {
            actions: {
              baseBlob: {
                delete: {
                  daysAfterModificationGreaterThan: 1
                }
              }
            }
            filters: {
              blobTypes: [
                'blockBlob'
              ]
              prefixMatch: [
                '${specContainerName}/jobs/'
                '${specContainerName}/limits/'
                '${specContainerName}/locks/'
              ]
            }
          }
        }
      ]
    }
  }
  dependsOn: [specContainer]
}

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: planName
  location: location
  tags: resourceTags
  kind: 'functionapp'
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true
  }
}

resource app 'Microsoft.Web/sites@2024-04-01' = {
  name: functionAppName
  location: location
  tags: union(resourceTags, functionAppTags)
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    virtualNetworkSubnetId: integrationSubnetId
    functionAppConfig: {
      runtime: {
        name: 'node'
        version: '22'
      }
      deployment: {
        storage: {
          type: 'blobContainer'
          value: packageContainerUrl
          authentication: {
            type: 'StorageAccountConnectionString'
            storageAccountConnectionStringName: 'DEPLOYMENT_STORAGE_CONNECTION_STRING'
          }
        }
      }
      scaleAndConcurrency: {
        instanceMemoryMB: 2048
        maximumInstanceCount: 100
        alwaysReady: []
      }
    }
    siteConfig: {
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: false
      vnetRouteAllEnabled: false
      cors: {
        allowedOrigins: corsOrigins
        supportCredentials: false
      }
      appSettings: map(items(existingSettings), setting => {
        name: setting.key
        value: string(setting.value)
      })
    }
  }
}

// Entra/RBAC-only management plane: deploys use OIDC (azure/login + Azure/functions-action), so SCM and
// FTP password authentication are not needed. Issue #115.
resource scmBasicAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-04-01' = {
  parent: app
  name: 'scm'
  properties: { allow: false }
}

resource ftpBasicAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-04-01' = {
  parent: app
  name: 'ftp'
  properties: { allow: false }
}

output functionAppId string = app.id
output functionAppName string = app.name
output planId string = plan.id
output storageAccountId string = storage.id
output storageAccountName string = storage.name
output specContainerName string = specContainer.name
output specContainerUrl string = '${storage.properties.primaryEndpoints.blob}${specContainer.name}'
