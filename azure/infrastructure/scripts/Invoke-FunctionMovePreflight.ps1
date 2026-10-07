<#
.SYNOPSIS
    Temporarily detach the two source Functions, validate the service move, and restore integration.
.DESCRIPTION
    GitHub main-only transaction. Saves non-secret integration metadata before mutation,
    patches only virtualNetworkSubnetId, and restores every attempted app in finally.
.PARAMETER OutputDirectory
    Runner artifact directory for snapshots, request and provider diagnostics.
.PARAMETER Confirmation
    Exact interruption acknowledgement required by the workflow.
.PARAMETER RestoreOnly
    Restore the two original integrations from the validated runner snapshot without detaching.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][string]$Confirmation,
    [switch]$RestoreOnly
)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:GITHUB_REF -cne 'refs/heads/main' -or $env:GITHUB_REPOSITORY -cne 'Andworx/Copilot-IoT-Game') {
    throw 'Function move preflight is restricted to this repository GitHub workflow on main.'
}
if ($Confirmation -cne 'DETACH REVALIDATE RESTORE SOURCE FUNCTIONS') { throw 'Explicit source interruption acknowledgement is required.' }

$sourceSubscription = '2e291b4a-5f03-4dcd-bb56-09643c729adc'
$destinationSubscription = '9e8c862e-9bba-4363-a21b-c45cabe8b637'
$resourceGroup = 'rg-aw-azcom-iot-copilot'
$sourceScope = "/subscriptions/$sourceSubscription/resourceGroups/$resourceGroup"
$destinationScope = "/subscriptions/$destinationSubscription/resourceGroups/$resourceGroup"
$expectedSubnet = "$sourceScope/providers/Microsoft.Network/virtualNetworks/iot-demo-vnet/subnets/function-integration"
$apiVersion = '2024-04-01'
$appNames = @('func-aw-azcom-iot-game', 'func-aw-azcom-iot-staff')
$manifest = Get-Content (Join-Path $PSScriptRoot '../service-move.json') -Raw | ConvertFrom-Json
if ($manifest.sourceSubscriptionId -ne $sourceSubscription -or $manifest.destinationSubscriptionId -ne $destinationSubscription -or $manifest.resourceGroup -ne $resourceGroup -or @($manifest.resources).Count -ne 13) {
    throw 'Unexpected service move manifest scope.'
}

function Read-AzJson([string[]]$Arguments) {
    $json = & az @Arguments --only-show-errors -o json
    if ($LASTEXITCODE -ne 0) { throw "Azure metadata read failed: $($Arguments[0..1] -join ' ')." }
    return (($json -join "`n") | ConvertFrom-Json)
}

function Assert-ActionPermission([string]$Scope, [string]$Action) {
    $permissions = Read-AzJson @('rest', '--method', 'get', '--url', "https://management.azure.com$Scope/providers/Microsoft.Authorization/permissions?api-version=2022-04-01")
    foreach ($permission in $permissions.value) {
        $allowed = @($permission.actions | Where-Object { $Action -like $_ }).Count -gt 0
        $excluded = @($permission.notActions | Where-Object { $Action -like $_ }).Count -gt 0
        if ($allowed -and -not $excluded) { return }
    }
    throw "Missing $Action on $Scope; no Functions have been detached."
}

function Read-App([string]$ResourceId) {
    return (Read-AzJson @('resource', 'show', '--subscription', $sourceSubscription, '--ids', $ResourceId, '--api-version', $apiVersion))
}

function Set-Integration($Snapshot, $SubnetId) {
    $bodyPath = Join-Path $OutputDirectory "integration-patch-$($Snapshot.name).json"
    @{properties = @{virtualNetworkSubnetId = $SubnetId}} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $bodyPath -Encoding utf8
    & az rest --method patch --url "https://management.azure.com$($Snapshot.id)?api-version=$apiVersion" --body "@$bodyPath" --only-show-errors -o none
    if ($LASTEXITCODE -ne 0) { throw "Integration update failed for $($Snapshot.name)." }
    $condition = if ($null -eq $SubnetId) { "properties.virtualNetworkSubnetId == null || properties.virtualNetworkSubnetId == ''" } else { "properties.virtualNetworkSubnetId == '$SubnetId'" }
    & az resource wait --subscription $sourceSubscription --ids $Snapshot.id --api-version $apiVersion --custom $condition --interval 10 --timeout 300 --only-show-errors
    if ($LASTEXITCODE -ne 0) { throw "Integration state did not converge for $($Snapshot.name)." }
}

function Restore-Integrations([object[]]$Snapshots) {
    $restoredApps = [System.Collections.Generic.List[string]]::new()
    $errors = [System.Collections.Generic.List[string]]::new()
    for ($index = $Snapshots.Count - 1; $index -ge 0; $index--) {
        $snapshot = $Snapshots[$index]
        try {
            $current = Read-App $snapshot.id
            if (-not [string]::IsNullOrEmpty($current.properties.virtualNetworkSubnetId) -and $current.properties.virtualNetworkSubnetId -ine $snapshot.subnetId) {
                throw "Unexpected concurrent subnet on $($snapshot.name); refusing to overwrite it."
            }
            if ($current.properties.virtualNetworkSubnetId -ine $snapshot.subnetId) { Set-Integration $snapshot $snapshot.subnetId }
            $current = Read-App $snapshot.id
            if ($current.properties.virtualNetworkSubnetId -ine $snapshot.subnetId) { throw "Restoration not verified for $($snapshot.name)." }
            $restoredApps.Add($snapshot.name)
            Write-Host "[Rollback] Restored and verified $($snapshot.name)."
        } catch {
            $errors.Add("$($snapshot.name): $($_.Exception.Message)")
            Write-Warning "[Rollback] Restoration needs intervention for $($snapshot.name)."
        }
    }
    return [pscustomobject]@{restoredApps = @($restoredApps.ToArray()); restoreErrors = @($errors.ToArray())}
}

$account = Read-AzJson @('account', 'show')
if ($account.id -ne $sourceSubscription) { throw 'Azure login must target the pinned source subscription.' }
$snapshotPath = Join-Path $OutputDirectory 'function-integration-snapshot.json'
if ($RestoreOnly) {
    if (-not (Test-Path -LiteralPath $snapshotPath)) { Write-Host '[Rollback] No integration snapshot exists; transaction did not start.'; return }
    $saved = Get-Content -LiteralPath $snapshotPath -Raw | ConvertFrom-Json
    if ($saved.sourceScope -ine $sourceScope -or @($saved.apps).Count -ne 2 -or @($saved.apps.name | Sort-Object -Unique).Count -ne 2) { throw 'Recovery snapshot has unexpected scope or app count.' }
    foreach ($snapshot in $saved.apps) {
        if ($snapshot.name -notin $appNames -or $snapshot.id -ine "$sourceScope/providers/Microsoft.Web/sites/$($snapshot.name)" -or $snapshot.subnetId -ine $expectedSubnet) { throw 'Recovery snapshot contains an unexpected app or subnet.' }
    }
    $recovery = Restore-Integrations -Snapshots $saved.apps
    $recovery | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $OutputDirectory 'function-recovery-result.json') -Encoding utf8
    if ($recovery.restoreErrors.Count) { throw "Source recovery incomplete: $($recovery.restoreErrors -join '; ')" }
    Write-Host '[Rollback] Restore-only cleanup verified both original integrations.'
    return
}
Assert-ActionPermission $sourceScope 'Microsoft.Resources/subscriptions/resourceGroups/validateMoveResources/action'
Assert-ActionPermission $destinationScope 'Microsoft.Resources/subscriptions/resourceGroups/write'
Assert-ActionPermission $expectedSubnet 'Microsoft.Network/virtualNetworks/subnets/join/action'

$snapshots = [System.Collections.Generic.List[object]]::new()
foreach ($name in $appNames) {
    $appId = "$sourceScope/providers/Microsoft.Web/sites/$name"
    Assert-ActionPermission $appId 'Microsoft.Web/sites/write'
    $app = Read-App $appId
    if ($app.id -ine $appId -or $app.properties.virtualNetworkSubnetId -ine $expectedSubnet -or $app.properties.state -ne 'Running') {
        throw "Unexpected initial source state for $name; nothing detached."
    }
    $snapshots.Add([pscustomobject]@{name = $name; id = $app.id; subnetId = $app.properties.virtualNetworkSubnetId})
}

$source = @(Read-AzJson @('resource', 'list', '--subscription', $sourceSubscription, '--resource-group', $resourceGroup, '--query', '[].{id:id,name:name,type:type}'))
$destination = @(Read-AzJson @('resource', 'list', '--subscription', $destinationSubscription, '--resource-group', $resourceGroup, '--query', '[].{id:id,name:name,type:type}'))
$resourceIds = @()
foreach ($candidate in $manifest.resources) {
    $matches = @($source | Where-Object { $_.name -eq $candidate.name -and $_.type -eq $candidate.type })
    if ($matches.Count -ne 1 -or -not $matches[0].id.StartsWith("$sourceScope/providers/", [System.StringComparison]::OrdinalIgnoreCase)) { throw "Unexpected source move candidate: $($candidate.name)." }
    if (@($destination | Where-Object { $_.name -eq $candidate.name -and $_.type -eq $candidate.type }).Count) { throw "Destination collision for $($candidate.name)." }
    $resourceIds += $matches[0].id
}
[System.IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
@{sourceScope = $sourceScope; apps = @($snapshots.ToArray())} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $snapshotPath -Encoding utf8
$requestPath = Join-Path $OutputDirectory 'move-request.json'
@{resources = $resourceIds; targetResourceGroup = $destinationScope} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $requestPath -Encoding utf8
$attempted = [System.Collections.Generic.List[object]]::new()
$validationPassed = $false

try {
    foreach ($snapshot in $snapshots) {
        $current = Read-App $snapshot.id
        if ($current.properties.virtualNetworkSubnetId -ine $snapshot.subnetId) { throw "Source integration changed concurrently for $($snapshot.name)." }
        $attempted.Add($snapshot)
        Set-Integration $snapshot $null
        $detached = Read-App $snapshot.id
        if (-not [string]::IsNullOrEmpty($detached.properties.virtualNetworkSubnetId)) { throw "Detachment not confirmed for $($snapshot.name)." }
        Write-Host "[Preflight] Temporarily detached $($snapshot.name)."
    }
    $validationLog = Join-Path $OutputDirectory 'move-validation.txt'
    & az resource invoke-action --subscription $sourceSubscription --ids $sourceScope --action validateMoveResources --request-body "@$requestPath" --only-show-errors -o json 2>&1 | Tee-Object -FilePath $validationLog
    if ($LASTEXITCODE -ne 0) { throw 'ARM move validation failed; provider diagnostics are retained and source integration will be restored.' }
    $validationPassed = $true
} finally {
    $restoration = Restore-Integrations -Snapshots $attempted.ToArray()
    $resultPath = Join-Path $OutputDirectory 'function-preflight-result.json'
    @{validationPassed = $validationPassed; attemptedApps = @($attempted.ToArray().name); restoredApps = $restoration.restoredApps; restoreErrors = $restoration.restoreErrors; sourceServicesMoved = $false} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $resultPath -Encoding utf8
    if ($env:GITHUB_STEP_SUMMARY) {
        "Function preflight: validationPassed=$validationPassed; restored=$($restoration.restoredApps -join ', '); restoreErrors=$($restoration.restoreErrors.Count). No resources moved or deleted." >> $env:GITHUB_STEP_SUMMARY
    }
    if ($restoration.restoreErrors.Count) { throw "Source restoration incomplete. Stop migration and restore from $snapshotPath. $($restoration.restoreErrors -join '; ')" }
}
Write-Host '[Preflight] ARM validation passed; both source integrations are restored. No resources moved.'