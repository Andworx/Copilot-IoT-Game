<#
.SYNOPSIS
    Creates destination GitHub OIDC identities and applies the reviewed Azure role grants.
.DESCRIPTION
    Run from an interactive Azure CLI session selected to the destination subscription.
    Requires Owner or User Access Administrator on the destination resource group.
    Creates the production app identity and its production federation, grants Website
    Contributor only on the destination public/staff Function Apps, then invokes the
    existing staff and infrastructure least-privilege bootstraps. Safe to rerun.

    -WhatIf previews the identity/federation plan and delegates dry-run previews to the
    existing IAM bootstraps. It does not create Azure resources or role assignments.
    It does not change GitHub variables, clear AZURE_MIGRATION_FREEZE, or remove the
    stale assignment left by the deleted source identity.
.PARAMETER ConfigPath
    Non-secret staff configuration containing the destination resource group and tenant.
.PARAMETER SubjectPrefix
    GitHub OIDC subject prefix for this repository. Environment suffixes are appended.
.PARAMETER ProductionIdentityName
    User-assigned managed identity used by the production app release workflow.
.PARAMETER PreflightOnly
    Verify the active subscription, tenant, resources, and administrator role without changes.
.EXAMPLE
    ./azure/infrastructure/scripts/Initialize-DestinationDeploymentIdentities.ps1 -WhatIf
.EXAMPLE
    ./azure/infrastructure/scripts/Initialize-DestinationDeploymentIdentities.ps1 -PreflightOnly
.EXAMPLE
    ./azure/infrastructure/scripts/Initialize-DestinationDeploymentIdentities.ps1
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot '../staff-api.prod.json'),
    [string]$SubscriptionId = '9e8c862e-9bba-4363-a21b-c45cabe8b637',
    [string]$SubjectPrefix = 'repo:Andworx@226577816/Copilot-IoT-Game@1350685991',
    [string]$ProductionIdentityName = 'id-gha-copilot-iot-game-deploy',
    [switch]$PreflightOnly
)

$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$resourceGroup = $config.resourceGroup
$tenantId = $config.tenantId
$productionEnvironment = 'production'
$productionFederationName = 'github-production'
$federationIssuer = 'https://token.actions.githubusercontent.com'
$federationAudience = 'api://AzureADTokenExchange'
$infraScript = Join-Path $PSScriptRoot 'Initialize-InfraIdentities.ps1'
$staffScript = Join-Path $PSScriptRoot 'Initialize-StaffDeploymentAccess.ps1'

function Read-AzJson([string[]]$Arguments) {
    $json = & az @Arguments --only-show-errors -o json
    if ($LASTEXITCODE -ne 0) { throw "Azure metadata read failed: az $($Arguments -join ' ')" }
    return $json | ConvertFrom-Json
}

function Invoke-Az([string[]]$Arguments) {
    & az @Arguments --only-show-errors -o none
    if ($LASTEXITCODE -ne 0) { throw "Azure operation failed: az $($Arguments -join ' ')" }
}

$account = Read-AzJson @('account', 'show')
if ($account.id -ne $SubscriptionId) { throw "Select destination subscription $SubscriptionId before running this script." }
if ($account.tenantId -ne $tenantId) { throw "Connected tenant does not match staff configuration tenant $tenantId." }

$resourceGroupScope = "/subscriptions/$SubscriptionId/resourceGroups/$resourceGroup"
$group = Read-AzJson @('group', 'show', '--name', $resourceGroup, '--subscription', $SubscriptionId)
if ($group.id -ine $resourceGroupScope) { throw 'Destination resource group ID did not match the configured scope.' }

foreach ($appName in @('func-aw-iot-game-v2', 'func-aw-iot-staff-v2')) {
    $app = Read-AzJson @('functionapp', 'show', '--subscription', $SubscriptionId, '--resource-group', $resourceGroup, '--name', $appName)
    if ($app.name -ne $appName -or $app.kind -notlike '*functionapp*') { throw "Unexpected destination app metadata for $appName." }
}

if (-not $WhatIfPreference) {
    $caller = az ad signed-in-user show --query id -o tsv 2>$null
    if (-not $caller) { $caller = $account.user.name }
    $adminRoles = @(az role assignment list --assignee $caller --include-groups --include-inherited --scope $resourceGroupScope --query '[].roleDefinitionName' -o tsv 2>$null)
    if ($LASTEXITCODE -ne 0 -or -not ($adminRoles | Where-Object { $_ -in @('Owner', 'User Access Administrator') })) {
        throw 'Creating user-assigned identities, custom roles, and role assignments requires Owner or User Access Administrator on the destination resource group. Nothing was changed.'
    }
}

if ($PreflightOnly) {
    Write-Host '[IAM] Destination subscription, tenant, resource group, Function Apps, and administrator access verified.' -ForegroundColor Green
    return
}

if (-not (Test-Path -LiteralPath $infraScript) -or -not (Test-Path -LiteralPath $staffScript)) {
    throw 'Required reviewed IAM helper scripts were not found beside this script.'
}

if ($WhatIfPreference) {
    Write-Host "WhatIf: ensure production identity '$ProductionIdentityName' and federation '$productionFederationName'."
    Write-Host "WhatIf: assign Website Contributor to '$ProductionIdentityName' on func-aw-iot-game-v2 and func-aw-iot-staff-v2 only."
    Write-Host '[IAM] Previewing infra-reader/deployer identities and least-privilege grants:'
    & $infraScript -ResourceGroup $resourceGroup -Location $config.location -SubscriptionId $SubscriptionId -TenantId $tenantId -SubjectPrefix $SubjectPrefix -WhatIf
    Write-Host '[IAM] Previewing staff provisioner role assignment at the destination resource-group scope:'
    & $staffScript -DeploymentPrincipalId ([guid]::Empty) -SubscriptionId $SubscriptionId -ConfigPath $ConfigPath -WhatIf
    return
}

Write-Host '[IAM] Creating/reconciling infra reader and deployer identities first.' -ForegroundColor Cyan
& $infraScript -ResourceGroup $resourceGroup -Location $config.location -SubscriptionId $SubscriptionId -TenantId $tenantId -SubjectPrefix $SubjectPrefix
if ($LASTEXITCODE -ne 0) { throw 'Infrastructure identity bootstrap failed.' }

$identityNames = @(Read-AzJson @('identity', 'list', '--resource-group', $resourceGroup, '--query', '[].name'))
if ($ProductionIdentityName -notin $identityNames) {
    if ($PSCmdlet.ShouldProcess($resourceGroupScope, "Create user-assigned identity $ProductionIdentityName")) {
        Invoke-Az @('identity', 'create', '--subscription', $SubscriptionId, '--resource-group', $resourceGroup, '--name', $ProductionIdentityName, '--location', $config.location)
    }
}

$productionIdentity = Read-AzJson @('identity', 'show', '--subscription', $SubscriptionId, '--resource-group', $resourceGroup, '--name', $ProductionIdentityName)
if (-not $productionIdentity.principalId -or -not $productionIdentity.clientId) { throw 'Production deployment identity has no principal/client ID.' }

$federatedCredentials = @(Read-AzJson @('identity', 'federated-credential', 'list', '--subscription', $SubscriptionId, '--resource-group', $resourceGroup, '--identity-name', $ProductionIdentityName))
$productionSubject = "$SubjectPrefix`:environment:$productionEnvironment"
$productionFederation = @($federatedCredentials | Where-Object name -eq $productionFederationName)
if ($productionFederation.Count -gt 1) { throw "Multiple '$productionFederationName' federated credentials exist; review them manually." }
if ($productionFederation.Count -eq 1) {
    $credential = $productionFederation[0]
    if ($credential.issuer -ne $federationIssuer -or $credential.subject -ne $productionSubject -or $federationAudience -notin @($credential.audiences)) {
        throw "Existing '$productionFederationName' federation does not match the expected repository/environment subject; refusing to overwrite it."
    }
    Write-Host "[IAM] Federated credential '$productionFederationName' already matches." -ForegroundColor Green
} elseif ($PSCmdlet.ShouldProcess($ProductionIdentityName, "Federate GitHub environment $productionEnvironment")) {
    Invoke-Az @('identity', 'federated-credential', 'create', '--subscription', $SubscriptionId, '--resource-group', $resourceGroup, '--identity-name', $ProductionIdentityName, '--name', $productionFederationName, '--issuer', $federationIssuer, '--subject', $productionSubject, '--audiences', $federationAudience)
}

$websiteRole = 'Website Contributor'
$publicAppScope = "$resourceGroupScope/providers/Microsoft.Web/sites/func-aw-iot-game-v2"
$staffAppScope = "$resourceGroupScope/providers/Microsoft.Web/sites/func-aw-iot-staff-v2"
foreach ($appScope in @($publicAppScope, $staffAppScope)) {
    $assignments = @(Read-AzJson @('role', 'assignment', 'list', '--scope', $appScope, '--assignee-object-id', $productionIdentity.principalId))
    $matching = @($assignments | Where-Object { $_.scope -ieq $appScope -and $_.roleDefinitionName -eq $websiteRole })
    if ($matching.Count -gt 1) { throw "Multiple $websiteRole assignments exist on $appScope." }
    if ($matching.Count -eq 1) {
        if ($matching[0].condition) { throw "Existing $websiteRole assignment on $appScope has an unexpected condition; review it manually." }
        Write-Host "[IAM] $websiteRole already assigned on $appScope." -ForegroundColor Green
    } elseif ($PSCmdlet.ShouldProcess($appScope, "Assign $websiteRole to $ProductionIdentityName")) {
        Invoke-Az @('role', 'assignment', 'create', '--assignee-object-id', $productionIdentity.principalId, '--assignee-principal-type', 'ServicePrincipal', '--role', $websiteRole, '--scope', $appScope)
    }
}

Write-Host '[IAM] Ensuring the staff resource provisioner role at destination resource-group scope.' -ForegroundColor Cyan
& $staffScript -DeploymentPrincipalId ([guid]$productionIdentity.principalId) -SubscriptionId $SubscriptionId -ConfigPath $ConfigPath
if ($LASTEXITCODE -ne 0) { throw 'Staff provisioner role bootstrap failed.' }

$infraReader = Read-AzJson @('identity', 'show', '--subscription', $SubscriptionId, '--resource-group', $resourceGroup, '--name', 'id-gha-infra-reader')
$infraDeployer = Read-AzJson @('identity', 'show', '--subscription', $SubscriptionId, '--resource-group', $resourceGroup, '--name', 'id-gha-infra-deployer')
Write-Host ''
Write-Host '[IAM] Bootstrap complete. Set these GitHub Actions variables manually:' -ForegroundColor Green
Write-Host "AZURE_CLIENT_ID=$($productionIdentity.clientId)"
Write-Host "AZURE_INFRA_READER_CLIENT_ID=$($infraReader.clientId)"
Write-Host "AZURE_INFRA_DEPLOYER_CLIENT_ID=$($infraDeployer.clientId)"
Write-Host "AZURE_TENANT_ID=$tenantId"
Write-Host '[IAM] Workflow subscription IDs are pinned to the destination; no AZURE_SUBSCRIPTION_ID variable is required.'
Write-Host '[IAM] This script does not remove the stale source principal assignments or change AZURE_MIGRATION_FREEZE.'