<#
.SYNOPSIS
    Move the nine validated stateful/monitoring resources and preserve Event Hubs access.
.DESCRIPTION
    GitHub main-only. Captures inventory/RBAC, proves destination role restoration access,
    validates again, moves only the exact allowlist and verifies destination scopes.
    No resource/config deletion, Function activation or RG retirement is performed.
.PARAMETER OutputDirectory
    Runner directory for non-secret inventory, RBAC and move journal artifacts.
.PARAMETER Confirmation
    Exact resource-move acknowledgement.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][string]$Confirmation
)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:GITHUB_REF -cne 'refs/heads/main' -or $env:GITHUB_REPOSITORY -cne 'Andworx/Copilot-IoT-Game' -or $env:AZURE_MIGRATION_FREEZE -cne 'true') {
    throw 'Stateful move requires this GitHub repository on main with the production release freeze enabled.'
}
if ($Confirmation -cne 'MOVE VALIDATED STATEFUL RESOURCES') { throw 'Explicit stateful move acknowledgement required.' }
$source = '2e291b4a-5f03-4dcd-bb56-09643c729adc'
$destination = '9e8c862e-9bba-4363-a21b-c45cabe8b637'
$group = 'rg-aw-azcom-iot-copilot'
$sourceScope = "/subscriptions/$source/resourceGroups/$group"
$destinationScope = "/subscriptions/$destination/resourceGroups/$group"
$sourceNamespace = "$sourceScope/providers/Microsoft.EventHub/namespaces/evhns-aw-iot-copilot"
$destinationNamespace = "$destinationScope/providers/Microsoft.EventHub/namespaces/evhns-aw-iot-copilot"
$receiverRole = 'a638d3c7-ab3a-418d-83e6-5f17a39d4fde'
$senderRole = '2b629674-e913-4c01-ae53-ef4638d8f975'
$allowed = @(
    'Microsoft.Devices/IotHubs/iothub-aw-iot-copilot',
    'Microsoft.Devices/ProvisioningServices/dps-aw-iot-copilot',
    'Microsoft.EventHub/namespaces/evhns-aw-iot-copilot',
    'Microsoft.SignalRService/SignalR/signalr-aw-iot-copilot',
    'Microsoft.Storage/storageAccounts/stawazcomiotgamefn',
    'Microsoft.Storage/storageAccounts/stawazcomiotstafffn',
    'Microsoft.Insights/components/func-aw-azcom-iot-game',
    'Microsoft.Insights/actionGroups/application insights smart detection',
    'Microsoft.AlertsManagement/smartDetectorAlertRules/Failure Anomalies - func-aw-azcom-iot-game'
)
function Read-AzJson([string[]]$Arguments) {
    $json = & az @Arguments --only-show-errors -o json
    if ($LASTEXITCODE -ne 0) { throw "Azure read failed: $($Arguments[0..1] -join ' ')." }
    return (($json -join "`n") | ConvertFrom-Json)
}
function Assert-Permission([string]$Scope, [string]$Action) {
    $permissions = Read-AzJson @('rest', '--method', 'get', '--url', "https://management.azure.com$Scope/providers/Microsoft.Authorization/permissions?api-version=2022-04-01")
    foreach ($permission in $permissions.value) {
        if (@($permission.actions | Where-Object { $Action -like $_ }).Count -and -not @($permission.notActions | Where-Object { $Action -like $_ }).Count) { return }
    }
    throw "Missing $Action on $Scope; no move requested."
}
function Ensure-DataRole($Assignment, [string]$Scope) {
    if ($Assignment.roleId -notin @($receiverRole, $senderRole) -or $Scope -notlike "$destinationScope*") { throw 'Unexpected data-role grant.' }
    $current = @(Read-AzJson @('role', 'assignment', 'list', '--subscription', $destination, '--all', '--fill-principal-name', 'false', '--query', '[].{id:id,principalId:principalId,roleDefinitionId:roleDefinitionId,scope:scope}'))
    $existing = @($current | Where-Object { $_.principalId -eq $Assignment.principalId -and $_.roleDefinitionId.EndsWith($Assignment.roleId) -and $_.scope -ieq $Scope })
    if ($existing.Count) { return [pscustomobject]@{id = $existing[0].id; created = $false} }
    $created = Read-AzJson @('role', 'assignment', 'create', '--subscription', $destination, '--scope', $Scope, '--assignee-object-id', $Assignment.principalId, '--assignee-principal-type', $Assignment.principalType, '--role', $Assignment.roleId, '--query', '{id:id}')
    if (-not $created.id) { throw 'Data-role grant did not return an assignment ID.' }
    return [pscustomobject]@{id = $created.id; created = $true}
}
$account = Read-AzJson @('account', 'show')
if ($account.id -ne $source) { throw 'Move login must target the pinned source subscription.' }
Assert-Permission $sourceScope 'Microsoft.Resources/subscriptions/resourceGroups/moveResources/action'
Assert-Permission $sourceScope 'Microsoft.Resources/subscriptions/resourceGroups/validateMoveResources/action'
Assert-Permission $destinationScope 'Microsoft.Resources/subscriptions/resourceGroups/write'
Assert-Permission $destinationScope 'Microsoft.Authorization/roleAssignments/write'
Assert-Permission $destinationScope 'Microsoft.Authorization/roleAssignments/delete'
$manifest = Get-Content (Join-Path $PSScriptRoot '../service-move.json') -Raw | ConvertFrom-Json
$candidates = @($manifest.resources | Where-Object { $_.type -notlike 'Microsoft.Web/*' })
if ($manifest.sourceSubscriptionId -ne $source -or $manifest.destinationSubscriptionId -ne $destination -or $manifest.resourceGroup -ne $group -or $candidates.Count -ne 9) { throw 'Unexpected move manifest scope.' }
$keys = @($candidates | ForEach-Object { "$($_.type)/$($_.name)" } | Sort-Object -Unique)
if ($keys.Count -ne 9 -or @($keys | Where-Object { $_ -notin $allowed }).Count) { throw 'Move candidates differ from the nine-resource allowlist.' }
$sourceInventory = @(Read-AzJson @('resource', 'list', '--subscription', $source, '--resource-group', $group, '--query', '[].{id:id,name:name,type:type}'))
$destinationInventory = @(Read-AzJson @('resource', 'list', '--subscription', $destination, '--resource-group', $group, '--query', '[].{id:id,name:name,type:type}'))
$ids = @()
foreach ($candidate in $candidates) {
    $match = @($sourceInventory | Where-Object { $_.type -eq $candidate.type -and $_.name -eq $candidate.name })
    if ($match.Count -ne 1 -or $match[0].id -ine "$sourceScope/providers/$($candidate.type)/$($candidate.name)") { throw "Unexpected source resource: $($candidate.name)." }
    if (@($destinationInventory | Where-Object { $_.type -eq $candidate.type -and $_.name -eq $candidate.name }).Count) { throw "Destination collision: $($candidate.name). Do not repeat an uncertain move." }
    $ids += $match[0].id
}
foreach ($appName in @('func-aw-iot-game-v2', 'func-aw-iot-staff-v2')) {
    $staging = Read-AzJson @('functionapp', 'config', 'appsettings', 'list', '--subscription', $destination, '--resource-group', $group, '--name', $appName, '--query', "[?name=='MIGRATION_STAGING'].value | [0]")
    if ($staging -cne 'true') { throw "Destination app $appName must remain staged during the move." }
}
$newIdentity = Read-AzJson @('functionapp', 'identity', 'show', '--subscription', $destination, '--resource-group', $group, '--name', 'func-aw-iot-game-v2', '--query', '{principalId:principalId}')
if (-not $newIdentity.principalId) { throw 'Destination telemetry identity missing.' }
$hubIdentity = Read-AzJson @('resource', 'show', '--subscription', $source, '--ids', "$sourceScope/providers/Microsoft.Devices/IotHubs/iothub-aw-iot-copilot", '--query', '{principalId:identity.principalId}')
$assignments = @(Read-AzJson @('role', 'assignment', 'list', '--subscription', $source, '--all', '--fill-principal-name', 'false', '--query', '[].{id:id,roleDefinitionId:roleDefinitionId,principalId:principalId,principalType:principalType,scope:scope}'))
$dataAssignments = @($assignments | Where-Object {
    ($_.scope -ieq $sourceNamespace -or $_.scope.StartsWith("$sourceNamespace/", [System.StringComparison]::OrdinalIgnoreCase)) -and
    ($_.roleDefinitionId.EndsWith($senderRole) -or $_.roleDefinitionId.EndsWith($receiverRole))
} | ForEach-Object { [pscustomobject]@{principalId = $_.principalId; principalType = $_.principalType; roleId = ($_.roleDefinitionId -split '/')[-1]; originalScope = $_.scope; destinationScope = $destinationScope + $_.scope.Substring($sourceScope.Length)} })
if (-not $hubIdentity.principalId -or -not @($dataAssignments | Where-Object { $_.principalId -eq $hubIdentity.principalId -and $_.roleId -eq $senderRole }).Count -or -not @($dataAssignments | Where-Object roleId -eq $receiverRole).Count) {
    throw 'Expected IoT Hub Sender and existing Function Receiver assignments are missing; move withheld.'
}
[System.IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
$snapshotPath = Join-Path $OutputDirectory 'stateful-move-snapshot.json'
@{sourceScope = $sourceScope; destinationScope = $destinationScope; resourceIds = $ids; eventHubDataAssignments = $dataAssignments; sourceHubPrincipalId = $hubIdentity.principalId; stagedFunctionPrincipalId = $newIdentity.principalId} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $snapshotPath -Encoding utf8
$requestPath = Join-Path $OutputDirectory 'stateful-move-request.json'
@{resources = $ids; targetResourceGroup = $destinationScope} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $requestPath -Encoding utf8
$temporaryAssignments = [System.Collections.Generic.List[string]]::new()
$scopedAssignments = [System.Collections.Generic.List[string]]::new()
$moveRequested = $false
$moveVerified = $false
$rbacRestored = $false
try {
    $pregrants = @($dataAssignments | Sort-Object principalId, roleId -Unique)
    $pregrants += [pscustomobject]@{principalId = $newIdentity.principalId; principalType = 'ServicePrincipal'; roleId = $receiverRole}
    foreach ($assignment in $pregrants) {
        $grant = Ensure-DataRole $assignment $destinationScope
        if ($grant.created) { $temporaryAssignments.Add($grant.id) }
    }
    & az resource invoke-action --subscription $source --ids $sourceScope --action validateMoveResources --request-body "@$requestPath" --only-show-errors -o json 2>&1 | Tee-Object -FilePath (Join-Path $OutputDirectory 'stateful-move-validation.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Stateful move validation failed; no move requested.' }
    $moveRequested = $true
    @{moveRequested = $true; resourceIds = $ids; destinationScope = $destinationScope} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutputDirectory 'stateful-move-started.json') -Encoding utf8
    & az resource move --subscription $source --ids $ids --destination-subscription-id $destination --destination-group $group --only-show-errors -o none
    if ($LASTEXITCODE -ne 0) { throw 'ARM move did not confirm completion. Do not retry or delete anything; inspect both inventories and the recorded request.' }
    $after = @(Read-AzJson @('resource', 'list', '--subscription', $destination, '--resource-group', $group, '--query', '[].{id:id,name:name,type:type}'))
    $remaining = @(Read-AzJson @('resource', 'list', '--subscription', $source, '--resource-group', $group, '--query', '[].{id:id,name:name,type:type}'))
    foreach ($candidate in $candidates) {
        $found = @($after | Where-Object { $_.type -eq $candidate.type -and $_.name -eq $candidate.name })
        if ($found.Count -ne 1 -or $found[0].id -ine "$destinationScope/providers/$($candidate.type)/$($candidate.name)" -or @($remaining | Where-Object { $_.type -eq $candidate.type -and $_.name -eq $candidate.name }).Count) {
            throw "Move inventory verification failed for $($candidate.name); no cutover or deletion is permitted."
        }
    }
    $moveVerified = $true
    $movedHub = Read-AzJson @('resource', 'show', '--subscription', $destination, '--ids', "$destinationScope/providers/Microsoft.Devices/IotHubs/iothub-aw-iot-copilot", '--query', '{principalId:identity.principalId}')
    if (-not $movedHub.principalId) { throw 'Moved IoT Hub identity missing; retain temporary grants and investigate.' }
    foreach ($assignment in $dataAssignments) {
        if ($assignment.principalId -eq $hubIdentity.principalId) { $assignment.principalId = $movedHub.principalId }
        $grant = Ensure-DataRole $assignment $assignment.destinationScope
        $scopedAssignments.Add($grant.id)
    }
    $newReceiver = [pscustomobject]@{principalId = $newIdentity.principalId; principalType = 'ServicePrincipal'; roleId = $receiverRole}
    $grant = Ensure-DataRole $newReceiver "$destinationNamespace/eventhubs/iot-telemetry"
    $scopedAssignments.Add($grant.id)
    $rbacRestored = $true
} finally {
    $cleanupErrors = [System.Collections.Generic.List[string]]::new()
    if (-not $moveRequested -or $rbacRestored) {
        foreach ($assignmentId in $temporaryAssignments) {
            & az role assignment delete --subscription $destination --ids $assignmentId --only-show-errors -o none
            if ($LASTEXITCODE -ne 0) { $cleanupErrors.Add($assignmentId) }
        }
    }
    @{moveRequested = $moveRequested; moveVerified = $moveVerified; eventHubRbacRestored = $rbacRestored; sourceScope = $sourceScope; destinationScope = $destinationScope; resourceIds = $ids; scopedAssignments = @($scopedAssignments.ToArray()); temporaryAssignments = @($temporaryAssignments.ToArray()); temporaryCleanupErrors = @($cleanupErrors.ToArray()); sourceGroupDeleted = $false; functionsActivated = $false} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $OutputDirectory 'stateful-move-result.json') -Encoding utf8
    if ($env:GITHUB_STEP_SUMMARY) { "Stateful move: requested=$moveRequested; nine verified=$moveVerified; Event Hubs RBAC restored=$rbacRestored. Source RG retained; Functions remain staged." >> $env:GITHUB_STEP_SUMMARY }
    if ($cleanupErrors.Count) { throw 'Temporary Event Hubs role cleanup incomplete; inspect result artifact before continuing.' }
}
Write-Host '[Move] Nine destination resources verified and scoped Event Hubs access restored. Cutover and source retirement are not complete.'