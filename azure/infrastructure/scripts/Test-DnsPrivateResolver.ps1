<#
.SYNOPSIS
    Verifies the deployed DNS Private Resolver contract used by the VPN and travel router.
#>
[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-aw-azcom-iot-copilot',
    [string]$ResolverName = 'iot-demo-dns-resolver',
    [string]$InboundEndpointName = 'iot-demo-dns-inbound',
    [string]$VirtualNetworkName = 'iot-demo-vnet',
    [string]$InboundSubnetName = 'dns-inbound',
    [string]$ExpectedPrivateIpAddress = '10.20.3.4'
)

$ErrorActionPreference = 'Stop'

function Invoke-AzJson([string[]]$Arguments) {
    $json = az @Arguments --only-show-errors --output json
    if ($LASTEXITCODE -ne 0) { throw "Azure CLI failed: az $($Arguments -join ' ')" }
    return $json | ConvertFrom-Json
}

$subscriptionId = az account show --query id --output tsv
if ($LASTEXITCODE -ne 0 -or -not $subscriptionId) { throw 'Unable to read the active Azure subscription.' }

$resolverResourceId = "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.Network/dnsResolvers/$ResolverName"
$resolver = Invoke-AzJson @('resource', 'show', '--ids', $resolverResourceId, '--api-version', '2022-07-01')
$expectedVnetId = "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.Network/virtualNetworks/$VirtualNetworkName"
if ($resolver.properties.virtualNetwork.id -ne $expectedVnetId) {
    throw "Resolver VNet is '$($resolver.properties.virtualNetwork.id)'; expected '$expectedVnetId'."
}

$inboundResourceId = "$resolverResourceId/inboundEndpoints/$InboundEndpointName"
$inbound = Invoke-AzJson @('resource', 'show', '--ids', $inboundResourceId, '--api-version', '2022-07-01')
$configuration = @($inbound.properties.ipConfigurations)
if ($configuration.Count -ne 1) { throw "Expected one inbound IP configuration; found $($configuration.Count)." }

$expectedSubnetId = "$expectedVnetId/subnets/$InboundSubnetName"
if ($configuration[0].privateIpAllocationMethod -ne 'Static') { throw 'Resolver inbound address is not static.' }
if ($configuration[0].privateIpAddress -ne $ExpectedPrivateIpAddress) {
    throw "Resolver inbound address is '$($configuration[0].privateIpAddress)'; expected '$ExpectedPrivateIpAddress'."
}
if ($configuration[0].subnet.id -ne $expectedSubnetId) {
    throw "Resolver inbound subnet is '$($configuration[0].subnet.id)'; expected '$expectedSubnetId'."
}

Write-Host "DNS Private Resolver verified: $ResolverName/$InboundEndpointName -> $ExpectedPrivateIpAddress"
