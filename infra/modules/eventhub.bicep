// Event Hub namespace + hub + consumer groups for panel telemetry.
//
// Values are set to match what is live (see infra/README.md): Standard, zone-redundant,
// 2 partitions, 1-day retention. Partition count cannot be changed on an existing hub, so a
// mismatch fails the deployment instead of recreating it. IoT Hub's catch-all route already
// delivers device messages here; nothing in this module touches the IoT Hub.

param namespaceName string
param eventHubName string
param location string = resourceGroup().location

@allowed(['Standard', 'Premium'])
param skuName string = 'Standard'
param capacity int = 1
param zoneRedundant bool = true

param partitionCount int

@description('Mirrors the live hub, which reports messageRetentionInDays 1 and retentionTimeInHours 1. Azure returns both; set both so the template matches exactly.')
param messageRetentionInDays int
param retentionTimeInHours int

@allowed([
  'Enabled'
  'Disabled'
])
param publicNetworkAccess string

@description('Allows the identity-based IoT Hub route through the Event Hubs firewall.')
param trustedServiceAccessEnabled bool

@description('One consumer group per independent reader. A group must never be shared between apps: two readers in one group split the partition leases and each misses events.')
param consumerGroups array

param tags object = {}

resource namespace 'Microsoft.EventHub/namespaces@2024-05-01-preview' = {
  name: namespaceName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuName
    capacity: capacity
  }
  properties: {
    zoneRedundant: zoneRedundant
    isAutoInflateEnabled: false
    kafkaEnabled: true
    minimumTlsVersion: '1.2'
    publicNetworkAccess: publicNetworkAccess
    disableLocalAuth: false
    geoDataReplication: {
      maxReplicationLagDurationInSeconds: 0
      locations: [
        {
          locationName: location
          roleType: 'Primary'
        }
      ]
    }
  }
}

resource networkRules 'Microsoft.EventHub/namespaces/networkRuleSets@2024-05-01-preview' = {
  parent: namespace
  name: 'default'
  properties: {
    publicNetworkAccess: publicNetworkAccess
    defaultAction: 'Deny'
    trustedServiceAccessEnabled: trustedServiceAccessEnabled
    ipRules: []
    virtualNetworkRules: []
  }
}

resource hub 'Microsoft.EventHub/namespaces/eventhubs@2024-01-01' = {
  parent: namespace
  name: eventHubName
  properties: {
    partitionCount: partitionCount
    messageRetentionInDays: messageRetentionInDays
    retentionDescription: {
      cleanupPolicy: 'Delete'
      retentionTimeInHours: retentionTimeInHours
    }
  }
}

resource groups 'Microsoft.EventHub/namespaces/eventhubs/consumergroups@2024-01-01' = [for name in consumerGroups: {
  parent: hub
  name: name
}]

output namespaceName string = namespace.name
output fullyQualifiedNamespace string = '${namespace.name}.servicebus.windows.net'
output eventHubName string = hub.name
output hubId string = hub.id
