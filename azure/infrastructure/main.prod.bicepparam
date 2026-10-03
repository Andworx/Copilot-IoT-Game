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

param gameFunctionPlanName = 'ASP-rgawazcomiotcopilot-ec55'
param gameFunctionAppName = 'func-aw-azcom-iot-game'
param gameFunctionAppTags = {
  'hidden-link: /app-insights-resource-id': '/subscriptions/2e291b4a-5f03-4dcd-bb56-09643c729adc/resourceGroups/rg-aw-azcom-iot-copilot/providers/microsoft.insights/components/func-aw-azcom-iot-game'
}
param gameStorageAccountName = 'stawazcomiotgamefn'
param gameStoragePackageContainerName = 'app-package-funcawazcomiotgame-0968767'
param gameStoragePackageContainerUrl = 'https://stawazcomiotgamefn.blob.core.windows.net/app-package-funcawazcomiotgame-0968767'

param vnetName = 'iot-demo-vnet'
param vnetTags = {
  'managed-by': 'bicep'
}
param vnetAddressPrefixes = [
  '10.20.0.0/16'
]
param vnetSubnets = [
  {
    name: 'GatewaySubnet'
    addressPrefixes: [
      '10.20.0.0/27'
    ]
    defaultOutboundAccess: false
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
    delegations: []
    serviceEndpoints: []
  }
  {
    name: 'private-endpoint'
    addressPrefixes: [
      '10.20.1.0/24'
    ]
    defaultOutboundAccess: false
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
    delegations: []
    serviceEndpoints: []
  }
  {
    name: 'dns-inbound'
    addressPrefixes: [
      '10.20.3.0/28'
    ]
    defaultOutboundAccess: false
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
    delegations: [
      {
        name: 'Microsoft.Network/dnsResolvers'
        properties: {
          serviceName: 'Microsoft.Network/dnsResolvers'
        }
      }
    ]
    serviceEndpoints: []
  }
  {
    name: 'function-integration'
    addressPrefixes: [
      '10.20.2.0/26'
    ]
    defaultOutboundAccess: false
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
    delegations: [
      {
        name: 'Microsoft.App/environments'
        properties: {
          serviceName: 'Microsoft.App/environments'
        }
      }
    ]
    serviceEndpoints: []
  }
]

param privateDnsZoneNames = [
  'privatelink.azure-devices.net'
  'privatelink.azurewebsites.net'
  'privatelink.blob.core.windows.net'
  'privatelink.service.signalr.net'
  'privatelink.servicebus.windows.net'
]
param privateDnsLinkName = '7jkty3vvfilac'
param privateDnsTags = {
  'managed-by': 'bicep'
}

param dnsResolverName = 'iot-demo-dns-resolver'
param dnsResolverInboundEndpointName = 'iot-demo-dns-inbound'
param dnsResolverInboundSubnetName = 'dns-inbound'
param dnsResolverInboundPrivateIpAddress = '10.20.3.4'
param dnsResolverTags = {}

param vpnPublicIpName = 'iot-demo-vpn-pip'
param vpnPublicIpZones = [
  '1'
  '2'
  '3'
]
param vpnPublicIpTags = {}
param vpnGatewayName = 'iot-demo-vpn'
param vpnGatewaySkuName = 'VpnGw1AZ'
param vpnGatewayGeneration = 'Generation2'
param vpnGatewaySubnetName = 'GatewaySubnet'
param vpnGatewayTags = {}
param vpnClientAddressPrefixes = [
  '172.27.240.0/24'
]
param vpnClientProtocols = [
  'OpenVPN'
]
param vpnAuthenticationTypes = [
  'Certificate'
]
param vpnClientRootCertificates = [
  {
    name: 'IoTDemo-VPN-Root'
    properties: {
      // Public certificate only. The router's client certificate and private key stay off-repo.
      publicCertData: 'MIIC8TCCAdmgAwIBAgIQFgDHjOqI6qlM47pk4DvfkzANBgkqhkiG9w0BAQsFADAbMRkwFwYDVQQDDBBJb1REZW1vLVZQTi1Sb290MB4XDTI2MDkyMjE4MjE0NloXDTI4MDkyMjE4MzE0NVowGzEZMBcGA1UEAwwQSW9URGVtby1WUE4tUm9vdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAOMcZL7mymyBS7W7w+8bJhbnZiBnvxZhrgB3F1wUopyNu0w+4iA25N35vPnUqqgFqd62kDp4d3syv6K32yw2H4aqmTOrTpY44fTbTShA1CtKJXsYczAdSWGI2dd8vTpeW41iarfZU8atS7vGvZqeKzCY78tPRXN4MGd89xjgbAX5c81ukiRrhhPl3Juy2lHQskIMhT2zPyVvOgLVtJidT7lSss+bUFGRgv3ZpUbVks9n2lSuHmqyFLtUii638JdDtNHGEr6SRBzu102sL0GkbNDSrwSnjVgNmfo+i393zJqQhg/bThynUjJzJcLQyCi6VjLiV2dEadKLOR1LGlwQtkECAwEAAaMxMC8wDgYDVR0PAQH/BAQDAgIEMB0GA1UdDgQWBBT67VNoll2GjnH0gQZWXom8opC0wjANBgkqhkiG9w0BAQsFAAOCAQEAjtgZ015K50iCb/dBWkzTcKKKfscrW3Mo+4sYSpYrfDcJW0lL458DbwGTE2UvZI6Slg/3aud3N8ImiONAfW3GqpjI05G/O5wziwoqJvPxgs966Viu3cuGarVAvjMSNFsZQ3z/z8Z+OrDYd/OES/MnP4Hs/QhWpXAgw5k7GacoJOukXsM+EBFxLXYKImB4GE2Q19qS50oTW/gbsYtspAjBlV6mT0QGtcJj1KY35nuVr8tAkDoymjvrn1QRIJ6zrIzzoi8xUi864oxrSTlBjfIixI+SIiO96VJRNz+jZaVphZ9fNUynRYW0xyva+CbJtssZ6MKj6k4TKOH8Zmok3wlKLg=='
    }
  }
]

param signalRPrivateEndpointName = 'iot-demo-signalr-pe'
param signalRPrivateEndpointNicName = 'iot-demo-signalr-pe-nic'
param privateEndpointSubnetName = 'private-endpoint'
param signalRPrivateDnsZoneGroupName = 'default'
param signalRPrivateDnsZoneConfigName = 'privatelink-service-signalr-net'
param signalRPrivateDnsZoneName = 'privatelink.service.signalr.net'

param gameFunctionPrivateEndpointName = 'iot-demo-game-function-pe'
param gameFunctionPrivateEndpointNicName = 'iot-demo-game-function-pe-nic'
param gameFunctionPrivateDnsZoneGroupName = 'default'
param gameFunctionPrivateDnsZoneConfigName = 'privatelink-azurewebsites-net'
param gameFunctionPrivateDnsZoneName = 'privatelink.azurewebsites.net'

param gameStorageBlobPrivateEndpointName = 'iot-demo-game-storage-blob-pe'
param gameStorageBlobPrivateEndpointNicName = 'iot-demo-game-storage-blob-pe-nic'
param gameStorageBlobPrivateDnsZoneGroupName = 'default'
param gameStorageBlobPrivateDnsZoneConfigName = 'privatelink-blob-core-windows-net'
param gameStorageBlobPrivateDnsZoneName = 'privatelink.blob.core.windows.net'

param iotHubName = 'iothub-aw-iot-copilot'
param iotHubPrivateEndpointName = 'iot-demo-iothub-pe'
param iotHubPrivateEndpointNicName = 'iot-demo-iothub-pe-nic'
param iotHubPrivateDnsZoneGroupName = 'default'
param iotHubPrivateDnsZoneConfigNames = [
  {
    configName: 'privatelink-azure-devices-net'
    zoneName: 'privatelink.azure-devices.net'
  }
  {
    configName: 'privatelink-servicebus-windows-net'
    zoneName: 'privatelink.servicebus.windows.net'
  }
]

// The deploy workflow assigns the Function App's managed identity, then exports its
// principal ID here. Empty (the default, and what `what-if` runs use) skips the role assignment.
param functionAppPrincipalId = readEnvironmentVariable('FUNCTION_APP_PRINCIPAL_ID', '')
