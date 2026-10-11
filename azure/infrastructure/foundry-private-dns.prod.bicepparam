using 'foundry-private-dns.bicep'

// Reproduces what is live in rg-aw-azcom-iot-copilot (verified with `what-if`: no changes).
param virtualNetworkId = '/subscriptions/9e8c862e-9bba-4363-a21b-c45cabe8b637/resourceGroups/rg-aw-azcom-iot-copilot/providers/Microsoft.Network/virtualNetworks/iot-demo-vnet'
param linkName = 'jmbxp6fctsap2'
param tags = {
  purpose: 'iot demo build out'
}
