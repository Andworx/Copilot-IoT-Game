<#
.SYNOPSIS
    Lower-level administrator setup for staff provisioning by the destination app identity.
.DESCRIPTION
    An Owner or appropriately authorized IAM administrator runs this explicitly.
    Creates/updates the reviewed custom role at the configured resource group and
    assigns it to the supplied production deployment principal. No application or
    network resources are created. -WhatIf makes no IAM changes.
.PARAMETER DeploymentPrincipalId
    Object (principal) ID of the production GitHub deployment identity, not its client ID.
.PARAMETER ConfigPath
    Non-secret staff deployment configuration.
.EXAMPLE
    ./azure/infrastructure/scripts/Initialize-StaffDeploymentAccess.ps1 -DeploymentPrincipalId <object-id> -WhatIf
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)][guid]$DeploymentPrincipalId,
    [string]$SubscriptionId = '9e8c862e-9bba-4363-a21b-c45cabe8b637',
    [string]$ConfigPath = (Join-Path $PSScriptRoot '../staff-api.prod.json')
)
$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$account = az account show --only-show-errors -o json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Select the intended Azure subscription first.' }
$subscription = $account.id
if ($subscription -ne $SubscriptionId) { throw "Select destination subscription $SubscriptionId before assigning staff deployment access." }
if ($account.tenantId -ne $config.tenantId) { throw 'Connected Azure tenant does not match the staff configuration.' }
$scope = "/subscriptions/$subscription/resourceGroups/$($config.resourceGroup)"
$role = Get-Content (Join-Path $PSScriptRoot '../roles/staff-provisioner.json') -Raw | ConvertFrom-Json
$role.AssignableScopes = @($scope)

if (-not $WhatIfPreference) {
    $assignee = az ad signed-in-user show --query id -o tsv 2>$null
    if (-not $assignee) { $assignee = $account.user.name }
    $adminRoles = @(az role assignment list --assignee $assignee --include-groups --include-inherited --scope $scope --query '[].roleDefinitionName' -o tsv 2>$null)
    if (-not ($adminRoles | Where-Object { $_ -in @('Owner', 'User Access Administrator') })) {
        throw 'Creating and assigning the staff provisioner role requires Owner or User Access Administrator on the destination resource group. Nothing was changed.'
    }
}

if (-not $PSCmdlet.ShouldProcess($scope, "Create/update $($role.Name) and assign it to $DeploymentPrincipalId")) { return }
$existing = az role definition list --name $role.Name --scope $scope --only-show-errors -o json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect IAM role definitions.' }
if ($existing.Count -gt 1) { throw 'Ambiguous existing role definitions.' }
$roleFile = [IO.Path]::GetTempFileName()
try {
    if ($existing.Count -eq 1) {
        if (@($existing[0].assignableScopes).Count -ne 1 -or $existing[0].assignableScopes[0] -ne $scope) {
            throw 'Existing role is assigned to another scope; refusing to alter it.'
        }
        $body = @{ name=$existing[0].name; roleName=$role.Name; description=$role.Description; assignableScopes=@($scope); permissions=@(@{actions=$role.Actions;notActions=$role.NotActions;dataActions=@();notDataActions=@()}) }
        [IO.File]::WriteAllText($roleFile, ($body | ConvertTo-Json -Depth 8))
        az role definition update --role-definition $roleFile --only-show-errors --output none
    } else {
        [IO.File]::WriteAllText($roleFile, ($role | ConvertTo-Json -Depth 8))
        az role definition create --role-definition $roleFile --only-show-errors --output none
    }
    if ($LASTEXITCODE -ne 0) { throw 'IAM role definition update failed; administrator permissions are required.' }
    $assignmentJson = az role assignment list --scope $scope --assignee-object-id $DeploymentPrincipalId --only-show-errors -o json
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect existing staff provisioner role assignments.' }
    $assignments = @($assignmentJson | ConvertFrom-Json | Where-Object { $_.scope -ieq $scope -and $_.roleDefinitionName -eq $role.Name })
    if ($assignments.Count -gt 1) { throw 'Multiple staff provisioner assignments exist at the destination scope.' }
    if ($assignments.Count -eq 1) {
        Write-Host '[IAM] Staff provisioner role is already assigned at the destination resource group.'
    } else {
        az role assignment create --assignee-object-id $DeploymentPrincipalId --assignee-principal-type ServicePrincipal --role $role.Name --scope $scope --only-show-errors --output none
        if ($LASTEXITCODE -ne 0) { throw 'IAM assignment failed; rerun after role propagation if needed.' }
    }
    Write-Host '[IAM] Production identity can provision the staff resources on the next main release.'
} finally {
    [IO.File]::Delete($roleFile)
}
