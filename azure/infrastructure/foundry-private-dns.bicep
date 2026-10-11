targetScope = 'resourceGroup'

// The three private DNS zones that Azure AI / Foundry private endpoints use, linked to the
// game VNet. They were created by hand alongside the Foundry private endpoint; this describes
// them as they are so they can be reproduced and drift-checked.
//
// Deploy to rg-aw-azcom-iot-copilot (the same group as the other privatelink zones). A
// `what-if` against the live group should report no changes. The zone records themselves are
// written by the private endpoint's DNS zone group (foundry-private-endpoint.bicep), not here.
//
// This is not part of main.bicep: the Foundry resources sit in another resource group, and
// the CI deploy identity is deliberately scoped to the IoT group only (see README).

@description('Resource id of iot-demo-vnet.')
param virtualNetworkId string

@description('Name of the virtual network link, as it exists today (the portal generated it).')
param linkName string = 'jmbxp6fctsap2'

param tags object = {
  purpose: 'iot demo build out'
}

module foundryZones 'modules/private-dns.bicep' = {
  name: 'foundry-private-dns'
  params: {
    zoneNames: [
      'privatelink.cognitiveservices.azure.com'
      'privatelink.openai.azure.com'
      'privatelink.services.ai.azure.com'
    ]
    linkName: linkName
    virtualNetworkId: virtualNetworkId
    tags: tags
  }
}

output zoneIds array = foundryZones.outputs.zoneIds
