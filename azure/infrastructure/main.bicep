// Restore & Spin: the infrastructure this repo owns and may deploy from CI.
// Scope: resource group. Full rationale and the tiers: azure/infrastructure/README.md.
//
//   Tier 1/2 (in this file): VNet/subnets, private DNS and resolver, Event Hub
//   namespace/hub/consumer groups, SignalR service, and read access for the game Function
//   App's managed identity.
//   Tier 3 (NOT here, by design): IoT Hub, DPS, Function Apps, plans, storage, App Insights.
//   They are captured under azure/infrastructure/reference/ and only drift-checked.
//
// Deploy with an incremental deployment only. Preview first:
//   az deployment group what-if -g <rg> -f main.bicep -p main.prod.bicepparam

targetScope = 'resourceGroup'

param location string = resourceGroup().location
param tags object = {}

param eventHubNamespaceName string
param eventHubName string
param eventHubPartitionCount int
param eventHubRetentionDays int
param eventHubRetentionHours int
param eventHubPublicNetworkAccess string
param eventHubTrustedServiceAccessEnabled bool

@description('Consumer groups on the hub. `gamefunc` is this repo\'s Function App; the retired legacy `funcapp` reader is intentionally omitted.')
param consumerGroups array

param signalRName string
param signalRSkuName string

param vnetName string
param vnetAddressPrefixes array
param vnetSubnets array
param vnetTags object = {}

param privateDnsZoneNames array
param privateDnsLinkName string
param privateDnsTags object = {}

param dnsResolverName string
param dnsResolverInboundEndpointName string
param dnsResolverInboundSubnetName string
param dnsResolverInboundPrivateIpAddress string
param dnsResolverTags object = {}

param vpnPublicIpName string
param vpnPublicIpZones array
param vpnPublicIpTags object = {}
param vpnGatewayName string
param vpnGatewaySkuName string
param vpnGatewayGeneration string
param vpnGatewaySubnetName string
param vpnGatewayTags object = {}
param vpnClientAddressPrefixes array
param vpnClientProtocols array
param vpnAuthenticationTypes array
param vpnClientRootCertificates array

param eventHubPrivateEndpointName string
param eventHubPrivateEndpointNicName string
param privateEndpointSubnetName string
param eventHubPrivateDnsZoneGroupName string
param eventHubPrivateDnsZoneConfigName string
param eventHubPrivateDnsZoneName string

@description('Principal ID of the game Function App system-assigned identity. Empty until `az functionapp identity assign` has run (the workflow does this); the role assignment is skipped while empty.')
param functionAppPrincipalId string = ''

module eventHub 'modules/eventhub.bicep' = {
  name: 'eventhub'
  params: {
    namespaceName: eventHubNamespaceName
    eventHubName: eventHubName
    location: location
    partitionCount: eventHubPartitionCount
    messageRetentionInDays: eventHubRetentionDays
    retentionTimeInHours: eventHubRetentionHours
    publicNetworkAccess: eventHubPublicNetworkAccess
    trustedServiceAccessEnabled: eventHubTrustedServiceAccessEnabled
    consumerGroups: consumerGroups
    tags: tags
  }
}

module signalR 'modules/signalr.bicep' = {
  name: 'signalr'
  params: {
    name: signalRName
    location: location
    skuName: signalRSkuName
    tags: tags
  }
}

module vnet 'modules/vnet.bicep' = {
  name: 'vnet'
  params: {
    name: vnetName
    location: location
    addressPrefixes: vnetAddressPrefixes
    subnets: vnetSubnets
    tags: vnetTags
  }
}

module privateDns 'modules/private-dns.bicep' = {
  name: 'private-dns'
  params: {
    zoneNames: privateDnsZoneNames
    linkName: privateDnsLinkName
    virtualNetworkId: vnet.outputs.id
    tags: privateDnsTags
  }
}

module dnsResolver 'modules/dns-private-resolver.bicep' = {
  name: 'dns-private-resolver'
  params: {
    resolverName: dnsResolverName
    inboundEndpointName: dnsResolverInboundEndpointName
    location: location
    virtualNetworkId: vnet.outputs.id
    inboundSubnetId: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, dnsResolverInboundSubnetName)
    inboundPrivateIpAddress: dnsResolverInboundPrivateIpAddress
    tags: dnsResolverTags
  }
}

module vpnGateway 'modules/p2s-vpn-gateway.bicep' = {
  name: 'p2s-vpn-gateway'
  params: {
    location: location
    publicIpName: vpnPublicIpName
    publicIpZones: vpnPublicIpZones
    publicIpTags: vpnPublicIpTags
    gatewayName: vpnGatewayName
    gatewaySkuName: vpnGatewaySkuName
    gatewayGeneration: vpnGatewayGeneration
    gatewaySubnetId: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, vpnGatewaySubnetName)
    gatewayTags: vpnGatewayTags
    vpnClientAddressPrefixes: vpnClientAddressPrefixes
    vpnClientProtocols: vpnClientProtocols
    vpnAuthenticationTypes: vpnAuthenticationTypes
    vpnClientRootCertificates: vpnClientRootCertificates
  }
  dependsOn: [vnet]
}

module eventHubPrivateEndpoint 'modules/eventhub-private-endpoint.bicep' = {
  name: 'eventhub-private-endpoint'
  params: {
    location: location
    privateEndpointName: eventHubPrivateEndpointName
    customNetworkInterfaceName: eventHubPrivateEndpointNicName
    subnetId: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, privateEndpointSubnetName)
    eventHubNamespaceId: resourceId('Microsoft.EventHub/namespaces', eventHubNamespaceName)
    privateDnsZoneGroupName: eventHubPrivateDnsZoneGroupName
    privateDnsZoneConfigName: eventHubPrivateDnsZoneConfigName
    privateDnsZoneId: resourceId('Microsoft.Network/privateDnsZones', eventHubPrivateDnsZoneName)
    tags: {}
  }
  dependsOn: [eventHub, vnet, privateDns]
}

module receiver 'modules/eventhub-receiver.bicep' = if (!empty(functionAppPrincipalId)) {
  name: 'eventhub-receiver'
  dependsOn: [eventHub]
  params: {
    namespaceName: eventHubNamespaceName
    eventHubName: eventHubName
    principalId: functionAppPrincipalId
  }
}

// The Function App's settings are merged by azure/infrastructure/scripts/Set-FunctionAppSettings.ps1 from
// these outputs. They are never written by an ARM/Bicep resource: a Microsoft.Web/sites
// resource replaces the whole app-settings collection and would wipe the Dataverse secret.
output eventHubFullyQualifiedNamespace string = eventHub.outputs.fullyQualifiedNamespace
output eventHubName string = eventHub.outputs.eventHubName
output signalRName string = signalR.outputs.name
output vnetName string = vnet.outputs.name
output dnsResolverName string = dnsResolver.outputs.resolverName
output dnsResolverInboundEndpointName string = dnsResolver.outputs.inboundEndpointName
output dnsResolverInboundPrivateIpAddress string = dnsResolver.outputs.inboundPrivateIpAddress
output vpnPublicIpName string = vpnGateway.outputs.publicIpName
output vpnGatewayName string = vpnGateway.outputs.gatewayName
output eventHubPrivateEndpointName string = eventHubPrivateEndpoint.outputs.privateEndpointName
