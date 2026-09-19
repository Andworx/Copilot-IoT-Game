<#
.SYNOPSIS
    Merges the telemetry-trigger settings into the game Function App. Never replaces.

.DESCRIPTION
    `az functionapp config appsettings set` adds or updates only the settings named, so
    existing settings (the Dataverse secret, SignalR connection string, ...) are untouched.
    That is why these settings are not written by a Bicep Microsoft.Web/sites resource, which
    replaces the whole collection.

    The Event Hub connection is identity-based: only the namespace host name is set, under the
    `IoTHubEventHubConnectionString__` prefix the trigger in azure/src/functions/telemetry.ts
    reads. No key or connection string is stored. The Function App's managed identity needs
    the "Azure Event Hubs Data Receiver" role on the hub (infra/main.bicep grants it).

    Secrets are never set here. DIRECTLINE_SECRET stays a manual/protected setting.

.PARAMETER EventHubFullyQualifiedNamespace
    e.g. evhns-aw-iot-copilot.servicebus.windows.net (Bicep output eventHubFullyQualifiedNamespace)

.PARAMETER EventHubName
    Bicep output eventHubName.

.PARAMETER ConsumerGroup
    The consumer group dedicated to this app. Must not be `funcapp` (the legacy app's) or $Default.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)][string]$ResourceGroup,
    [Parameter(Mandatory = $true)][string]$FunctionAppName,
    [Parameter(Mandatory = $true)][string]$EventHubFullyQualifiedNamespace,
    [Parameter(Mandatory = $true)][string]$EventHubName,
    [string]$ConsumerGroup = 'gamefunc'
)

$ErrorActionPreference = 'Stop'

if ($ConsumerGroup -in @('funcapp', '$Default')) {
    throw "Consumer group '$ConsumerGroup' belongs to another reader. Use a group dedicated to this app."
}

$settings = @(
    "IoTHubEventHubConnectionString__fullyQualifiedNamespace=$EventHubFullyQualifiedNamespace",
    "IOT_EVENTHUB_NAME=$EventHubName",
    "IOT_EVENTHUB_CONSUMER_GROUP=$ConsumerGroup"
)

if ($PSCmdlet.ShouldProcess("$FunctionAppName in $ResourceGroup", "merge app settings: $($settings -join ', ')")) {
    # Output is discarded on purpose: `set` echoes every setting value, secrets included.
    az functionapp config appsettings set -g $ResourceGroup -n $FunctionAppName --settings @settings --only-show-errors --output none
    if ($LASTEXITCODE -ne 0) { throw 'az functionapp config appsettings set failed' }
    Write-Host "Merged $($settings.Count) settings into $FunctionAppName (existing settings untouched)."
}
