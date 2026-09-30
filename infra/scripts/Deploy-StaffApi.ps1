<#
.SYNOPSIS
    Preview or provision the dedicated staff Function App from the release workflow.
.DESCRIPTION
    Deploys only staff-api.bicep. Existing game settings are read server-side by ARM;
    their values are never returned here. What-if prints resource IDs only. Rejects
    name collisions with resources not owned by this template. Does not deploy code,
    alter public API routes, create Entra objects or modify network resources.
.PARAMETER ConfigPath
    Non-secret staff deployment JSON file.
.PARAMETER Mode
    Preview (default) validates and runs what-if. Deploy then applies incrementally.
.EXAMPLE
    ./infra/scripts/Deploy-StaffApi.ps1 -Mode Preview
#>
[CmdletBinding()]
param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot '../staff-api.prod.json'),
    [ValidateSet('Preview', 'Deploy')][string]$Mode = 'Preview'
)
$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
if ($config.functionAppName -eq $config.sourceFunctionAppName) { throw 'Staff and source apps must be distinct.' }
function Read-Az([string[]]$Arguments) {
    $result = & az @Arguments --only-show-errors -o json
    if ($LASTEXITCODE -ne 0) { throw 'Azure metadata read failed. Verify deployment permissions.' }
    return ($result | ConvertFrom-Json)
}
$account = Read-Az @('account', 'show')
if ($account.tenantId -ne $config.tenantId) { throw 'Connected Azure tenant does not match the staff configuration.' }
$rgId = "/subscriptions/$($account.id)/resourceGroups/$($config.resourceGroup)"
$subnetId = "$rgId/providers/Microsoft.Network/virtualNetworks/$($config.vnetName)/subnets/$($config.integrationSubnetName)"
$subnet = Read-Az @('resource', 'show', '--ids', $subnetId, '--api-version', '2024-05-01')
if ('Microsoft.App/environments' -notin @($subnet.properties.delegations.properties.serviceName)) {
    throw 'The existing integration subnet is not delegated for Flex Consumption.'
}
$resources = @(Read-Az @('resource', 'list', '--resource-group', $config.resourceGroup))
$source = $resources | Where-Object { $_.type -eq 'Microsoft.Web/sites' -and $_.name -eq $config.sourceFunctionAppName }
if (-not $source) { throw 'Source game Function App was not found in the configured resource group.' }
$ownedNames = @($config.functionAppName, "$($config.functionAppName)-plan", $config.storageAccountName)
foreach ($resource in $resources | Where-Object { $_.name -in $ownedNames }) {
    if ($resource.tags.component -ne 'staff-api' -or $resource.tags.managedBy -ne 'deploy-apps') {
        throw "Refusing to adopt existing unowned resource: $($resource.name). Review its ownership first."
    }
}
$staffExists = [bool]($resources | Where-Object { $_.type -eq 'Microsoft.Web/sites' -and $_.name -eq $config.functionAppName })
$parameters = @(
    "location=$($config.location)", "functionAppName=$($config.functionAppName)",
    "sourceFunctionAppName=$($config.sourceFunctionAppName)", "storageAccountName=$($config.storageAccountName)",
    "integrationSubnetId=$subnetId", "tenantId=$($config.tenantId)",
    "apiClientId=$($config.apiClientId)", "connectorClientId=$($config.connectorClientId)",
    "staffExists=$($staffExists.ToString().ToLowerInvariant())"
)
$template = Join-Path $PSScriptRoot '../staff-api.bicep'
# What-if alone missed the repeat-deployment circular dependency. Suppress the
# validation response because resolved app settings can contain credentials.
az deployment group validate --resource-group $config.resourceGroup --name staff-api --template-file $template --parameters @parameters --only-show-errors --output none
if ($LASTEXITCODE -ne 0) { throw 'Staff template validation failed; no deployment attempted.' }
Write-Host '[Infra] Previewing only the staff app, plan and dedicated storage.'
az deployment group what-if --resource-group $config.resourceGroup --name staff-api --template-file $template --parameters @parameters --result-format ResourceIdOnly --no-prompt --only-show-errors
if ($LASTEXITCODE -ne 0) { throw 'Staff what-if failed; no deployment attempted.' }
if ($Mode -eq 'Preview') { return }
az deployment group create --resource-group $config.resourceGroup --name staff-api --template-file $template --parameters @parameters --mode Incremental --only-show-errors --output none
if ($LASTEXITCODE -ne 0) { throw 'Staff infrastructure deployment failed; existing app release must stop.' }
$hostName = az deployment group show --resource-group $config.resourceGroup --name staff-api --query properties.outputs.hostName.value --only-show-errors -o tsv
if ($LASTEXITCODE -ne 0 -or -not $hostName) { throw 'Staff hostname output is unavailable.' }
Write-Host "[Infra] Staff API provisioned: https://$hostName"
if ($env:GITHUB_OUTPUT) { "hostName=$hostName" | Out-File -LiteralPath $env:GITHUB_OUTPUT -Encoding utf8 -Append }
