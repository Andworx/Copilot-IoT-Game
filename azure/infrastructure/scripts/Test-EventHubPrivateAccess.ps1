[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-aw-azcom-iot-copilot',
    [string]$NamespaceName = 'evhns-aw-iot-copilot',
    [string]$EventHubName = 'iot-telemetry',
    [string]$GameFunctionApp = 'func-aw-azcom-iot-game',
    [string]$IoTHubName = 'iothub-aw-iot-copilot'
)

$ErrorActionPreference = 'Stop'

function Invoke-AzJson([string[]]$Arguments) {
    $json = & az @Arguments --only-show-errors -o json
    if ($LASTEXITCODE -ne 0) { throw "Azure CLI failed: az $($Arguments -join ' ')" }
    return $json | ConvertFrom-Json
}

$namespace = Invoke-AzJson @('eventhubs', 'namespace', 'show', '-g', $ResourceGroup, '-n', $NamespaceName)
if ($namespace.publicNetworkAccess -ne 'Disabled') { throw 'Event Hub public network access is not disabled.' }

$rules = Invoke-AzJson @('eventhubs', 'namespace', 'network-rule-set', 'show', '-g', $ResourceGroup, '--namespace-name', $NamespaceName)
if ($rules.publicNetworkAccess -ne 'Disabled' -or -not $rules.trustedServiceAccessEnabled) {
    throw 'Event Hub network rules are not private-only with trusted services enabled.'
}

$approvedEndpoint = @($namespace.privateEndpointConnections | Where-Object {
    $_.privateLinkServiceConnectionState.status -eq 'Approved' -and $_.provisioningState -eq 'Succeeded'
})
if ($approvedEndpoint.Count -lt 1) { throw 'No approved Event Hub private endpoint was found.' }

$game = Invoke-AzJson @('resource', 'show', '-g', $ResourceGroup, '-n', $GameFunctionApp, '--resource-type', 'Microsoft.Web/sites', '--api-version', '2024-04-01')
if ($game.properties.virtualNetworkSubnetId -notlike '*/subnets/function-integration') {
    throw 'The game Function App is not integrated with function-integration.'
}

$iot = Invoke-AzJson @('iot', 'hub', 'show', '-g', $ResourceGroup, '-n', $IoTHubName)
$routeEndpoint = @($iot.properties.routing.endpoints.eventHubs | Where-Object {
    $_.name -eq 'endpoint-iotpanel' -and $_.authenticationType -eq 'identityBased'
})
if ($routeEndpoint.Count -ne 1) { throw 'The IoT Hub Event Hub endpoint is not using managed identity.' }

$namespaceScope = $namespace.id
$hubScope = "$namespaceScope/eventhubs/$EventHubName"
$sender = Invoke-AzJson @('role', 'assignment', 'list', '--scope', $namespaceScope)
$receiver = Invoke-AzJson @('role', 'assignment', 'list', '--scope', $hubScope)
if (-not @($sender | Where-Object { $_.principalId -eq $iot.identity.principalId -and $_.roleDefinitionName -eq 'Azure Event Hubs Data Sender' })) {
    throw 'IoT Hub is missing Azure Event Hubs Data Sender.'
}
if (-not @($receiver | Where-Object { $_.principalId -eq $game.identity.principalId -and $_.roleDefinitionName -eq 'Azure Event Hubs Data Receiver' })) {
    throw 'The game Function App is missing Azure Event Hubs Data Receiver.'
}

Write-Host 'Event Hub is private-only; the approved private endpoint, trusted IoT Hub route, and game receiver identity are configured.'
