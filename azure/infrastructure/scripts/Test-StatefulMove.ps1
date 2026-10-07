<#
.SYNOPSIS
    Verify the stateful move and RBAC transaction with a simulated Azure CLI only.
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$source = '2e291b4a-5f03-4dcd-bb56-09643c729adc'
$destination = '9e8c862e-9bba-4363-a21b-c45cabe8b637'
$sourceScope = "/subscriptions/$source/resourceGroups/rg-aw-azcom-iot-copilot"
$destinationScope = "/subscriptions/$destination/resourceGroups/rg-aw-azcom-iot-copilot"
$receiver = 'a638d3c7-ab3a-418d-83e6-5f17a39d4fde'
$sender = '2b629674-e913-4c01-ae53-ef4638d8f975'
$hubPrincipal = '02dd68e9-a5b3-4fae-b802-3618e9e7e5d1'
$oldPrincipal = 'f051298c-f2dc-4d7f-b46e-6f2e7b5f541a'
$newPrincipal = '59f427a0-7ad9-4594-915e-e975352b62f1'
$manifest = Get-Content (Join-Path $PSScriptRoot '../service-move.json') -Raw | ConvertFrom-Json
$candidates = @($manifest.resources | Where-Object { $_.type -notlike 'Microsoft.Web/*' })
$originalRoles = @(
    @{id = 'old-sender'; roleDefinitionId = "/providers/Microsoft.Authorization/roleDefinitions/$sender"; principalId = $hubPrincipal; principalType = 'ServicePrincipal'; scope = "$sourceScope/providers/Microsoft.EventHub/namespaces/evhns-aw-iot-copilot"},
    @{id = 'old-receiver'; roleDefinitionId = "/providers/Microsoft.Authorization/roleDefinitions/$receiver"; principalId = $oldPrincipal; principalType = 'ServicePrincipal'; scope = "$sourceScope/providers/Microsoft.EventHub/namespaces/evhns-aw-iot-copilot/eventhubs/iot-telemetry"}
)
$previousFixture = Get-Variable -Name IoTStatefulMoveFixture -Scope Global -ErrorAction SilentlyContinue
$global:IoTStatefulMoveFixture = @{}
$environment = @{}
foreach ($name in @('GITHUB_ACTIONS','GITHUB_REF','GITHUB_REPOSITORY','AZURE_MIGRATION_FREEZE','GITHUB_STEP_SUMMARY')) { $environment[$name] = [Environment]::GetEnvironmentVariable($name) }
$testDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "stateful-move-tests-$([guid]::NewGuid())"
[System.IO.Directory]::CreateDirectory($testDirectory) | Out-Null

function az {
    $args = @($args | ForEach-Object { $_ })
    $global:LASTEXITCODE = 0
    if ($args[0] -eq 'account') { return (@{id = $source} | ConvertTo-Json) }
    if ($args[0] -eq 'rest') {
        if ($args -notcontains 'get') { throw 'Unexpected REST configuration mutation.' }
        $actions = if ($global:IoTStatefulMoveFixture.scenario -eq 'missing-move-permission') { @('*/read') } else { @('*') }
        return (@{value = @(@{actions = $actions; notActions = @()})} | ConvertTo-Json -Depth 5)
    }
    if ($args[0] -eq 'functionapp') {
        if ($args[1] -eq 'config' -and $args[2] -eq 'appsettings' -and $args[3] -eq 'list' -and ($args -join ' ') -like '*MIGRATION_STAGING*') { return (ConvertTo-Json -InputObject 'true') }
        if ($args[1] -eq 'identity' -and $args[2] -eq 'show') { return (@{principalId = $newPrincipal} | ConvertTo-Json) }
        throw 'Unexpected Function configuration command.'
    }
    if ($args[0] -eq 'resource' -and $args[1] -eq 'show') { return (@{principalId = $hubPrincipal} | ConvertTo-Json) }
    if ($args[0] -eq 'resource' -and $args[1] -eq 'list') {
        $items = if ($args -contains $source) { $global:IoTStatefulMoveFixture.sourceInventory } else { $global:IoTStatefulMoveFixture.destinationInventory }
        return (ConvertTo-Json -InputObject @($items) -Depth 5)
    }
    if ($args[0] -eq 'role' -and $args[1] -eq 'assignment') {
        if ($args[2] -eq 'list') {
            $items = if ($args -contains $source) { $originalRoles } else { @($global:IoTStatefulMoveFixture.destinationRoles.ToArray()) }
            return (ConvertTo-Json -InputObject @($items) -Depth 6)
        }
        if ($args[2] -eq 'create') {
            if ($global:IoTStatefulMoveFixture.scenario -eq 'rbac-denied') { $global:LASTEXITCODE = 1; return }
            $scope = $args[([array]::IndexOf($args,'--scope') + 1)]
            $roleId = $args[([array]::IndexOf($args,'--role') + 1)]
            $principal = $args[([array]::IndexOf($args,'--assignee-object-id') + 1)]
            if ($args -notcontains $destination -or $roleId -notin @($sender,$receiver) -or -not $scope.StartsWith($destinationScope)) { throw 'Unexpected role grant.' }
            $global:IoTStatefulMoveFixture.roleCounter++
            $id = "$destinationScope/providers/Microsoft.Authorization/roleAssignments/test-$($global:IoTStatefulMoveFixture.roleCounter)"
            $global:IoTStatefulMoveFixture.destinationRoles.Add([pscustomobject]@{id = $id; scope = $scope; roleDefinitionId = "/providers/Microsoft.Authorization/roleDefinitions/$roleId"; principalId = $principal})
            return (@{id = $id} | ConvertTo-Json)
        }
        if ($args[2] -eq 'delete') {
            if ($global:IoTStatefulMoveFixture.scenario -eq 'cleanup-failure') { $global:LASTEXITCODE = 1; return }
            $id = $args[([array]::IndexOf($args,'--ids') + 1)]
            $match = @($global:IoTStatefulMoveFixture.destinationRoles | Where-Object id -eq $id)
            if ($match.Count -ne 1 -or $match[0].scope -ne $destinationScope) { throw 'Deletion was not a temporary role assignment.' }
            [void]$global:IoTStatefulMoveFixture.destinationRoles.Remove($match[0])
            return
        }
    }
    if ($args[0] -eq 'resource' -and $args[1] -eq 'invoke-action') {
        if ($args -notcontains 'validateMoveResources' -or $global:IoTStatefulMoveFixture.destinationRoles.Count -ne 3) { throw 'Move validation lacks pre-proven RBAC or uses a different action.' }
        $requestArgument = $args[([array]::IndexOf($args,'--request-body') + 1)]
        $request = Get-Content $requestArgument.Substring(1) -Raw | ConvertFrom-Json
        if (@($request.resources).Count -ne 9 -or $request.targetResourceGroup -ne $destinationScope -or @($request.resources | Where-Object { $_ -like '*/Microsoft.Web/*' }).Count) { throw 'Unexpected move request.' }
        $global:IoTStatefulMoveFixture.validationCalls++
        if ($global:IoTStatefulMoveFixture.scenario -eq 'validation-failure') { $global:LASTEXITCODE = 1; return '{"error":"simulated validation blocker"}' }
        return '{}'
    }
    if ($args[0] -eq 'resource' -and $args[1] -eq 'move') {
        if ($global:IoTStatefulMoveFixture.validationCalls -ne 1 -or $args -notcontains $source -or $args -notcontains $destination) { throw 'Unvalidated or wrongly scoped move.' }
        $first = [array]::IndexOf($args,'--ids') + 1
        $last = [array]::IndexOf($args,'--destination-subscription-id') - 1
        $ids = @($args[$first..$last])
        if ($ids.Count -ne 9 -or @($ids | Where-Object { $_ -like '*/Microsoft.Web/*' }).Count) { throw 'Unexpected actual move set.' }
        $global:IoTStatefulMoveFixture.moveCalls++
        $moving = if ($global:IoTStatefulMoveFixture.scenario -eq 'uncertain-move') { @($global:IoTStatefulMoveFixture.sourceInventory | Select-Object -First 3) } else { @($global:IoTStatefulMoveFixture.sourceInventory) }
        foreach ($item in $moving) {
            $global:IoTStatefulMoveFixture.destinationInventory += @{name = $item.name; type = $item.type; id = $destinationScope + $item.id.Substring($sourceScope.Length)}
        }
        $global:IoTStatefulMoveFixture.sourceInventory = @($global:IoTStatefulMoveFixture.sourceInventory | Where-Object { $_.id -notin $moving.id })
        if ($global:IoTStatefulMoveFixture.scenario -eq 'uncertain-move') { $global:LASTEXITCODE = 1 }
        return
    }
    throw "Unexpected simulated Azure operation: $($args -join ' ')."
}

try {
    $env:GITHUB_ACTIONS = 'true'
    $env:GITHUB_REF = 'refs/heads/main'
    $env:GITHUB_REPOSITORY = 'Andworx/Copilot-IoT-Game'
    $env:AZURE_MIGRATION_FREEZE = 'true'
    $env:GITHUB_STEP_SUMMARY = Join-Path $testDirectory 'summary.md'
    foreach ($scenario in @('success','missing-move-permission','rbac-denied','validation-failure','uncertain-move','cleanup-failure')) {
        $global:IoTStatefulMoveFixture = @{scenario = $scenario; sourceInventory = @($candidates | ForEach-Object { @{name = $_.name; type = $_.type; id = "$sourceScope/providers/$($_.type)/$($_.name)"} }); destinationInventory = @(); destinationRoles = [System.Collections.Generic.List[object]]::new(); roleCounter = 0; validationCalls = 0; moveCalls = 0; deviceEnrollmentStorageState = 'preserved-sentinel'}
        $output = Join-Path $testDirectory $scenario
        $failure = $null
        try { & (Join-Path $PSScriptRoot 'Move-StatefulResources.ps1') -OutputDirectory $output -Confirmation 'MOVE VALIDATED STATEFUL RESOURCES' } catch { $failure = $_.Exception.Message }
        if (($scenario -eq 'success') -ne ($null -eq $failure)) { throw "Unexpected ${scenario} outcome: $failure" }
        if ($global:IoTStatefulMoveFixture.deviceEnrollmentStorageState -ne 'preserved-sentinel') { throw 'Stored state changed.' }
        if ($scenario -eq 'missing-move-permission') {
            if ($global:IoTStatefulMoveFixture.moveCalls -or $global:IoTStatefulMoveFixture.destinationRoles.Count) { throw 'Missing move permission caused mutation.' }
        } else {
            $result = Get-Content (Join-Path $output 'stateful-move-result.json') -Raw | ConvertFrom-Json
            if ($result.sourceGroupDeleted -ne $false -or $result.functionsActivated -ne $false) { throw 'Move included unapproved retirement/activation.' }
            if ($scenario -eq 'success' -or $scenario -eq 'cleanup-failure') {
                if (-not $result.moveVerified -or -not $result.eventHubRbacRestored -or $global:IoTStatefulMoveFixture.sourceInventory.Count -ne 0 -or $global:IoTStatefulMoveFixture.destinationInventory.Count -ne 9) { throw 'Successful move verification/RBAC failed.' }
                if (@($global:IoTStatefulMoveFixture.destinationRoles | Where-Object { $_.scope -ne $destinationScope }).Count -ne 3) { throw 'Expected three destination-scoped data assignments.' }
            }
            if ($scenario -in @('rbac-denied','validation-failure') -and ($global:IoTStatefulMoveFixture.moveCalls -or $global:IoTStatefulMoveFixture.destinationRoles.Count)) { throw 'Pre-move failure leaked grants or requested a move.' }
            if ($scenario -eq 'uncertain-move' -and (-not $result.moveRequested -or $result.moveVerified -or $global:IoTStatefulMoveFixture.moveCalls -ne 1 -or $global:IoTStatefulMoveFixture.destinationRoles.Count -ne 3)) { throw 'Uncertain move was retried or access removed.' }
            if ($scenario -eq 'cleanup-failure' -and @($result.temporaryCleanupErrors).Count -ne 3) { throw 'Cleanup failure not surfaced.' }
        }
        Write-Host "PASS: $scenario"
    }
} finally {
    foreach ($name in $environment.Keys) { [Environment]::SetEnvironmentVariable($name,$environment[$name]) }
    if ($previousFixture) { $global:IoTStatefulMoveFixture = $previousFixture.Value } else { Remove-Variable -Name IoTStatefulMoveFixture -Scope Global -ErrorAction SilentlyContinue }
}
$global:LASTEXITCODE = 0