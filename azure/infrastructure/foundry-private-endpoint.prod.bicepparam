using 'foundry-private-endpoint.bicep'

// Reproduces what is live in rg-aw-ed-azcom-foundry (verified with `what-if`).
param location = 'eastus'
param foundryAccountName = 'foundry-aw--ed-azcomm-eastus2'
param privateEndpointName = 'iot-copilot-pe'
param customNetworkInterfaceName = 'iot-copilot-pe-nic'
param subnetId = '/subscriptions/9e8c862e-9bba-4363-a21b-c45cabe8b637/resourceGroups/rg-aw-azcom-iot-copilot/providers/Microsoft.Network/virtualNetworks/iot-demo-vnet/subnets/private-endpoint'
param privateDnsZoneResourceGroup = 'rg-aw-azcom-iot-copilot'
param privateDnsZoneGroupName = 'default'
param privateDnsZoneConfigs = [
  {
    configName: 'privatelink-cognitiveservices-azure-com'
    zoneName: 'privatelink.cognitiveservices.azure.com'
  }
  {
    configName: 'privatelink-openai-azure-com'
    zoneName: 'privatelink.openai.azure.com'
  }
  {
    configName: 'privatelink-services-ai-azure-com'
    zoneName: 'privatelink.services.ai.azure.com'
  }
]
param tags = {
  'created by': 'Ed Williams'
  purpose: 'iot demo build out'
}

// The Function App's system-assigned identity (func-aw-iot-game-v2). Empty skips the role
// assignment, which is what a plain `what-if` of the endpoint uses.
param functionAppPrincipalId = readEnvironmentVariable('FUNCTION_APP_PRINCIPAL_ID', '')
