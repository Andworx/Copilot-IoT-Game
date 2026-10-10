<#
.SYNOPSIS
    Verifies the game Function hosting plan, storage account, package container, and non-secret host settings.
#>
[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-aw-azcom-iot-copilot',
    [string]$PlanName = 'func-aw-iot-game-v2-plan',
    [string]$StorageAccountName = 'stawazcomiotgamev2',
    [string]$PackageContainerName = 'function-packages',
    [string]$FunctionAppName = 'func-aw-iot-game-v2',
    [string]$VirtualNetworkName = 'iot-demo-vnet',
    [string]$IntegrationSubnetName = 'function-integration',
    [string]$PackageContainerUrl = 'https://stawazcomiotgamev2.blob.core.windows.net/function-packages'
)

$ErrorActionPreference = 'Stop'

function Invoke-AzJson([string[]]$Arguments) {
    $json = & az @Arguments --only-show-errors -o json
    if ($LASTEXITCODE -ne 0) { throw "Azure CLI failed: az $($Arguments -join ' ')" }
    return $json | ConvertFrom-Json
}

function Assert-Equal($Name, $Actual, $Expected) {
    if ($Actual -ne $Expected) { throw "$Name is '$Actual', expected '$Expected'." }
}

function Assert-ContainsAll($Name, [string[]]$Actual, [string[]]$Expected) {
    $missing = @($Expected | Where-Object { $Actual -notcontains $_ })
    if ($missing.Count -gt 0) { throw "$Name is missing: $($missing -join ', ')." }
}

$sub = az account show --query id -o tsv
if ($LASTEXITCODE -ne 0 -or -not $sub) { throw 'Azure CLI is not authenticated.' }
$rgScope = "/subscriptions/$sub/resourceGroups/$ResourceGroup"
$planId = "$rgScope/providers/Microsoft.Web/serverfarms/$PlanName"
$storageId = "$rgScope/providers/Microsoft.Storage/storageAccounts/$StorageAccountName"
$appId = "$rgScope/providers/Microsoft.Web/sites/$FunctionAppName"
$expectedSubnetSuffix = "/virtualNetworks/$VirtualNetworkName/subnets/$IntegrationSubnetName"

$plan = Invoke-AzJson @('resource', 'show', '--ids', $planId, '--api-version', '2024-04-01')
Assert-Equal 'Game Function plan kind' $plan.kind 'functionapp'
Assert-Equal 'Game Function plan SKU' $plan.sku.name 'FC1'
Assert-Equal 'Game Function plan tier' $plan.sku.tier 'FlexConsumption'
Assert-Equal 'Game Function plan reserved flag' $plan.properties.reserved $true

$storage = Invoke-AzJson @('storage', 'account', 'show', '-g', $ResourceGroup, '-n', $StorageAccountName)
Assert-Equal 'Game Function storage kind' $storage.kind 'StorageV2'
Assert-Equal 'Game Function storage SKU' $storage.sku.name 'Standard_LRS'
Assert-Equal 'Game Function storage HTTPS-only flag' $storage.enableHttpsTrafficOnly $true
Assert-Equal 'Game Function storage blob public access flag' $storage.allowBlobPublicAccess $false
Assert-Equal 'Game Function storage minimum TLS' $storage.minimumTlsVersion 'TLS1_2'
Assert-Equal 'Game Function storage shared key access' $storage.allowSharedKeyAccess $true
Assert-Equal 'Game Function storage public network access' $storage.publicNetworkAccess 'Enabled'
Assert-Equal 'Game Function storage network default action' $storage.networkRuleSet.defaultAction 'Allow'

$blobService = Invoke-AzJson @('resource', 'show', '--ids', "$storageId/blobServices/default", '--api-version', '2023-05-01')
Assert-Equal 'Game Function blob soft delete flag' $blobService.properties.deleteRetentionPolicy.enabled $false
Assert-Equal 'Game Function blob permanent delete flag' $blobService.properties.deleteRetentionPolicy.allowPermanentDelete $false

$container = Invoke-AzJson @('resource', 'show', '--ids', "$storageId/blobServices/default/containers/$PackageContainerName", '--api-version', '2023-05-01')
Assert-Equal 'Game Function package container public access' $container.properties.publicAccess 'None'
Assert-Equal 'Game Function package container encryption scope' $container.properties.defaultEncryptionScope '$account-encryption-key'
Assert-Equal 'Game Function package container encryption override flag' $container.properties.denyEncryptionScopeOverride $false

$app = Invoke-AzJson @('resource', 'show', '--ids', $appId, '--api-version', '2024-04-01')
Assert-Equal 'Game Function app kind' $app.kind 'functionapp,linux'
Assert-Equal 'Game Function app identity type' $app.identity.type 'SystemAssigned'
Assert-Equal 'Game Function app HTTPS-only flag' $app.properties.httpsOnly $true
Assert-Equal 'Game Function app public network access' $app.properties.publicNetworkAccess 'Enabled'
if ($app.properties.serverFarmId -ne $planId) { throw "Game Function app plan is '$($app.properties.serverFarmId)', expected '$planId'." }
if ($app.properties.virtualNetworkSubnetId -notlike "*$expectedSubnetSuffix") {
    throw "Game Function app integration subnet is '$($app.properties.virtualNetworkSubnetId)', expected suffix '$expectedSubnetSuffix'."
}
Assert-Equal 'Game Function app runtime name' $app.properties.functionAppConfig.runtime.name 'node'
Assert-Equal 'Game Function app runtime version' $app.properties.functionAppConfig.runtime.version '22'
Assert-Equal 'Game Function app deployment storage type' $app.properties.functionAppConfig.deployment.storage.type 'blobContainer'
Assert-Equal 'Game Function app deployment storage value' $app.properties.functionAppConfig.deployment.storage.value $PackageContainerUrl
Assert-Equal 'Game Function app deployment storage auth type' $app.properties.functionAppConfig.deployment.storage.authentication.type 'StorageAccountConnectionString'
Assert-Equal 'Game Function app deployment storage setting name' $app.properties.functionAppConfig.deployment.storage.authentication.storageAccountConnectionStringName 'DEPLOYMENT_STORAGE_CONNECTION_STRING'
Assert-Equal 'Game Function app instance memory' $app.properties.functionAppConfig.scaleAndConcurrency.instanceMemoryMB 2048
Assert-Equal 'Game Function app maximum instances' $app.properties.functionAppConfig.scaleAndConcurrency.maximumInstanceCount 100

$config = Invoke-AzJson @('functionapp', 'config', 'show', '-g', $ResourceGroup, '-n', $FunctionAppName)
Assert-Equal 'Game Function app FTPS state' $config.ftpsState 'Disabled'
Assert-Equal 'Game Function app minimum TLS' $config.minTlsVersion '1.2'
Assert-Equal 'Game Function app SCM minimum TLS' $config.scmMinTlsVersion '1.2'
Assert-Equal 'Game Function app HTTP/2 flag' $config.http20Enabled $false
Assert-Equal 'Game Function app VNet route-all flag' $config.vnetRouteAllEnabled $false
Assert-Equal 'Game Function app always-on flag' $config.alwaysOn $false
Assert-Equal 'Game Function app scale limit' $config.functionAppScaleLimit 100

$cors = Invoke-AzJson @('functionapp', 'cors', 'show', '-g', $ResourceGroup, '-n', $FunctionAppName)
Assert-Equal 'Game Function app CORS credentials flag' $cors.supportCredentials $false
Assert-ContainsAll 'Game Function app CORS origins' @($cors.allowedOrigins) @(
    'http://localhost:5173',
    'http://localhost:5174',
    'https://andworxprizewheel.powerappsportals.com',
    'https://copilotiotgame.powerappsportals.com',
    'https://plinko.powerappsportals.com',
    'https://dd045fe36b47e5bd87e6680b3cfd3a.09.environment.api.powerplatformusercontent.com'
)

$settingNames = @(Invoke-AzJson @('functionapp', 'config', 'appsettings', 'list', '-g', $ResourceGroup, '-n', $FunctionAppName) | ForEach-Object { $_.name })
Assert-ContainsAll 'Game Function app settings' $settingNames @(
    'AzureWebJobsStorage',
    'DEPLOYMENT_STORAGE_CONNECTION_STRING',
    'APPLICATIONINSIGHTS_CONNECTION_STRING',
    'DATAVERSE_URL',
    'DATAVERSE_TENANT_ID',
    'DATAVERSE_CLIENT_ID',
    'DATAVERSE_CLIENT_SECRET',
    'AzureSignalRConnectionString',
    'DIRECTLINE_SECRET',
    'IoTHubEventHubConnectionString__fullyQualifiedNamespace',
    'IOT_EVENTHUB_NAME',
    'IOT_EVENTHUB_CONSUMER_GROUP',
    'GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID',
    'API_SURFACE',
    'MIGRATION_STAGING'
)

Write-Host "Game Function hosting resources are configured for $FunctionAppName on $PlanName with package container $PackageContainerName."