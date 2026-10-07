targetScope = 'resourceGroup'

@allowed(['eastus'])
param location string = 'eastus'

@allowed(['2e291b4a-5f03-4dcd-bb56-09643c729adc'])
param sourceSubscriptionId string = '2e291b4a-5f03-4dcd-bb56-09643c729adc'

var sourceGroupName = 'rg-aw-azcom-iot-copilot'
var sourceAppName = 'func-aw-azcom-iot-game'
var publicAppName = 'func-aw-iot-game-v2'
var staffAppName = 'func-aw-iot-staff-v2'
var staffConfig = loadJsonContent('staff-api.prod.json')
var runtimeNames = [
  'DATAVERSE_URL'
  'DATAVERSE_TENANT_ID'
  'DATAVERSE_CLIENT_ID'
  'DATAVERSE_CLIENT_SECRET'
  'AzureSignalRConnectionString'
  'DIRECTLINE_SECRET'
  'GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID'
  'PREFERENCE_TOKEN_SECRET'
  'MARKETING_SENDER_ADDRESS'
  'FOLLOW_UP_MARKETING_HTML'
  'APPLICATIONINSIGHTS_CONNECTION_STRING'
  'IoTHubEventHubConnectionString__fullyQualifiedNamespace'
  'IOT_EVENTHUB_NAME'
  'IOT_EVENTHUB_CONSUMER_GROUP'
]

resource sourceSettings 'Microsoft.Web/sites/config@2024-04-01' existing = {
  name: '${sourceAppName}/appsettings'
  scope: resourceGroup(sourceSubscriptionId, sourceGroupName)
}

resource sourceWeb 'Microsoft.Web/sites/config@2024-04-01' existing = {
  name: '${sourceAppName}/web'
  scope: resourceGroup(sourceSubscriptionId, sourceGroupName)
}

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' existing = {
  name: 'iot-demo-vnet'
}

var sourceRuntime = sourceSettings.list().properties
var copiedRuntime = toObject(filter(runtimeNames, name => contains(sourceRuntime, name)), name => name, name => sourceRuntime[name])
var corsOrigins = sourceWeb.properties.?cors.?allowedOrigins ?? []
var integrationSubnetId = '${vnet.id}/subnets/function-integration'

module publicApp 'modules/rebuild-function.bicep' = {
  name: 'rebuild-public-function'
  params: {
    location: location
    functionAppName: publicAppName
    storageAccountName: 'stawazcomiotgamev2'
    integrationSubnetId: integrationSubnetId
    apiSurface: 'public'
    maximumInstanceCount: 100
    corsOrigins: corsOrigins
    runtimeSettings: copiedRuntime
  }
}

module staffApp 'modules/rebuild-function.bicep' = {
  name: 'rebuild-staff-function'
  params: {
    location: location
    functionAppName: staffAppName
    storageAccountName: 'stawazcomiotstaffv2'
    integrationSubnetId: integrationSubnetId
    apiSurface: 'staff'
    maximumInstanceCount: 40
    corsOrigins: corsOrigins
    runtimeSettings: copiedRuntime
    staffAuthSettings: {
      STAFF_AUTH_TENANT_ID: staffConfig.tenantId
      STAFF_AUTH_AUDIENCE: staffConfig.apiClientId
      STAFF_AUTH_CLIENT_ID: staffConfig.connectorClientId
    }
  }
}

module signalRBridge 'modules/signalr-private-endpoint.bicep' = {
  name: 'rebuild-signalr-bridge'
  params: {
    location: location
    privateEndpointName: 'iot-rebuild-signalr-pe'
    customNetworkInterfaceName: 'iot-rebuild-signalr-pe-nic'
    subnetId: '${vnet.id}/subnets/private-endpoint'
    signalRId: resourceId('Microsoft.SignalRService/SignalR', 'signalr-aw-iot-copilot')
    privateDnsZoneGroupName: 'default'
    privateDnsZoneConfigName: 'privatelink-service-signalr-net'
    privateDnsZoneId: resourceId('Microsoft.Network/privateDnsZones', 'privatelink.service.signalr.net')
    tags: { purpose: 'subscription-migration' }
  }
}

output publicFunctionAppName string = publicApp.outputs.functionAppName
output staffFunctionAppName string = staffApp.outputs.functionAppName
output signalRBridgeName string = signalRBridge.outputs.privateEndpointName
