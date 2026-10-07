<#
.SYNOPSIS
    Administrator handoff for the source move and destination Event Hubs role restoration.
.DESCRIPTION
    Grants no source Contributor, deletion, config-write or secret-read permission.
    Destination RBAC administration is conditioned to Event Hubs Sender/Receiver only.
.EXAMPLE
    ./azure/infrastructure/scripts/Grant-StatefulMoveAccess.ps1 -WhatIf
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param()
$ErrorActionPreference = 'Stop'
$source = '2e291b4a-5f03-4dcd-bb56-09643c729adc'
$destination = '9e8c862e-9bba-4363-a21b-c45cabe8b637'
$group = 'rg-aw-azcom-iot-copilot'
$sourceScope = "/subscriptions/$source/resourceGroups/$group"
$destinationScope = "/subscriptions/$destination/resourceGroups/$group"
$principal = '7377b3c8-b72c-4fd0-bf5e-204f07923d60'
$rbacAdmin = 'f58310d9-a9f6-439a-9e8d-f62e7b41a168'
$dataRoles = 'a638d3c7-ab3a-418d-83e6-5f17a39d4fde, 2b629674-e913-4c01-ae53-ef4638d8f975'
$condition = "((!(ActionMatches{'Microsoft.Authorization/roleAssignments/write'})) OR (@Request[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {$dataRoles})) AND " +
    "((!(ActionMatches{'Microsoft.Authorization/roleAssignments/delete'})) OR (@Resource[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {$dataRoles}))"
$rolePath = Join-Path $PSScriptRoot '../roles/stateful-mover.json'
$expected = Get-Content -LiteralPath $rolePath -Raw | ConvertFrom-Json

function Read-AzJson([string[]]$Arguments) {
    $json = & az @Arguments --only-show-errors -o json
    if ($LASTEXITCODE -ne 0) { throw "Azure IAM read failed: $($Arguments[0..1] -join ' ')." }
    return (($json -join "`n") | ConvertFrom-Json)
}

$identity = Read-AzJson @('identity', 'show', '--subscription', $source, '--resource-group', $group, '--name', 'id-gha-infra-deployer', '--query', '{principalId:principalId,clientId:clientId}')
if ($identity.principalId -ne $principal -or $identity.clientId -ne '74d02027-db4d-4128-a46c-184cd9399f9c') { throw 'Unexpected infrastructure identity; no IAM changes made.' }
$role = Read-AzJson @('role', 'definition', 'list', '--subscription', $source, '--name', $expected.Name, '--query', '[0]')
if ($role) {
    $actions = @($role.permissions | ForEach-Object { $_.actions })
    $dataActions = @($role.permissions | ForEach-Object { $_.dataActions })
    if ($actions.Count -ne 3 -or @($actions | Where-Object { $_ -notin $expected.Actions }).Count -or $dataActions.Count -or @($role.assignableScopes).Count -ne 1 -or $role.assignableScopes[0] -ine $sourceScope) {
        throw 'An existing mover role differs from the reviewed definition; refusing to overwrite or grant it.'
    }
} elseif ($PSCmdlet.ShouldProcess($sourceScope, 'Create the read/validate/move-only custom role')) {
    & az role definition create --subscription $source --role-definition $rolePath --only-show-errors -o none
    if ($LASTEXITCODE -ne 0) { throw 'Mover role creation failed. Run as an IAM administrator.' }
}

if ($PSCmdlet.ShouldProcess($sourceScope, "Assign $($expected.Name) to the existing infrastructure identity")) {
    & az role assignment create --subscription $source --scope $sourceScope --assignee-object-id $principal --assignee-principal-type ServicePrincipal --role $expected.Name --only-show-errors -o none
    if ($LASTEXITCODE -ne 0) { throw 'Source mover role assignment failed.' }
}
$assignments = @(Read-AzJson @('role', 'assignment', 'list', '--subscription', $destination, '--scope', $destinationScope, '--fill-principal-name', 'false'))
$existing = @($assignments | Where-Object { $_.principalId -eq $principal -and $_.roleDefinitionId.EndsWith($rbacAdmin) -and $_.scope -ieq $destinationScope })
if ($existing.Count) {
    if ($existing.Count -ne 1 -or $existing[0].condition -cne $condition -or $existing[0].conditionVersion -ne '2.0') { throw 'Existing destination RBAC administration differs; review it instead of silently broadening access.' }
    Write-Host '[IAM] Exact destination Sender/Receiver restoration grant already exists.'
} elseif ($PSCmdlet.ShouldProcess($destinationScope, 'Grant RBAC administration restricted to Event Hubs Sender/Receiver roles')) {
    & az role assignment create --subscription $destination --scope $destinationScope --assignee-object-id $principal --assignee-principal-type ServicePrincipal --role $rbacAdmin --condition $condition --condition-version 2.0 --only-show-errors -o none
    if ($LASTEXITCODE -ne 0) { throw 'Condition-limited destination RBAC grant failed.' }
}
Write-Host '[IAM] Handoff finished. No resources were moved or deleted; -WhatIf does not apply grants.'