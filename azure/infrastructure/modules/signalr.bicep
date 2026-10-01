// Azure SignalR Service in Serverless mode, matching what is live.
//
// Standard_S1 supports the existing private endpoint. CORS `*` mirrors the live setting; the browser negotiates
// through the Function App, whose own CORS list is the real gate.

param name string
param location string = resourceGroup().location

@allowed(['Free_F1', 'Standard_S1'])
param skuName string = 'Standard_S1'
param capacity int = 1

param tags object = {}

var tier = skuName == 'Free_F1' ? 'Free' : 'Standard'

resource signalr 'Microsoft.SignalRService/signalR@2024-03-01' = {
  name: name
  location: location
  tags: tags
  kind: 'SignalR'
  sku: {
    name: skuName
    tier: tier
    capacity: capacity
  }
  properties: {
    features: [
      { flag: 'ServiceMode', value: 'Serverless' }
      { flag: 'EnableConnectivityLogs', value: 'False' }
      { flag: 'EnableMessagingLogs', value: 'False' }
      { flag: 'EnableLiveTrace', value: 'False' }
    ]
    cors: {
      allowedOrigins: ['*']
    }
    tls: {
      clientCertEnabled: false
    }
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
    disableAadAuth: false
  }
}

output name string = signalr.name
