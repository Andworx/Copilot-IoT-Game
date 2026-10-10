<#
.SYNOPSIS
    One-time bootstrap: the two GitHub OIDC identities the infra workflow uses, with least
    privilege. Run by a human with Owner (or User Access Administrator) on the resource group.

.DESCRIPTION
    Creates, in the resource group:

      id-gha-infra-reader    Reader on the resource group. Used only by the drift job that compares
                             the reference snapshots (GitHub environment `infra-readonly`). Cannot
                             change anything. It cannot run what-if: ARM checks that the caller could
                             write each resource in the template, so what-if runs as the deployer.

      id-gha-infra-deployer  Used by the deploy job (GitHub environment `infra-deploy`, which
                             should only allow the `main` branch, and require a reviewer where the
                             plan supports it). It can:
                               - create deployments in the resource group (custom role
                                 "Infra Deployment Operator": deployments/* only),
                                                             - Contributor on the Event Hub namespace, SignalR service, destination
                                                                 game Function, plan, storage, Application Insights, failure alert,
                                                                 VNet, DNS resolver, VPN public IP and gateway,
                               - a resource-group-scoped Network Private Endpoint Operator role (private endpoint and DNS zone-group read/write only),
                                                             - create and manage action groups in the resource group,
                                                             - approve the IoT Hub private endpoint connection on the existing
                                                                 IoT Hub, without general IoT Hub write access,
                               - Private DNS Zone Contributor on the resource group,
                                                            - assign ONLY the "Azure Event Hubs Data Receiver" role on the telemetry event hub
                                                                and "Azure Event Hubs Data Sender" on the Event Hub namespace (ABAC-conditioned).
                             It has no write access to the IoT Hub, DPS, source Function Apps,
                             unrelated storage, or anything else, so a bad template or workflow
                             physically cannot change them.

    It does not create the GitHub environments or variables; the output lists them. Supports
    -WhatIf to print each step without changing anything, and -PreflightOnly to just check
    that the signed-in account may create roles and role assignments (Owner or User Access
    Administrator on the resource group). Without that it stops before changing anything:
    Contributor can create the identities but not the roles, which would leave a half-done setup.
    Safe to re-run.

.PARAMETER SubjectPrefix
    The OIDC subject prefix your org uses. This repo's existing deployment credential uses the
    id-qualified form (see docs/CI_CD.md); confirm it before running.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$ResourceGroup = 'rg-aw-azcom-iot-copilot',
    [string]$Location = 'eastus',
    [string]$SubscriptionId = '9e8c862e-9bba-4363-a21b-c45cabe8b637',
    [string]$TenantId = '7cea0515-a5e4-4e8a-8f2a-6d1ad5d6b9f8',
    [string]$SubjectPrefix = 'repo:Andworx@226577816/Copilot-IoT-Game@1350685991',
    [string]$EventHubNamespace = 'evhns-aw-iot-copilot',
    [string]$EventHubName = 'iot-telemetry',
    [string]$SignalRName = 'signalr-aw-iot-copilot',
    [string]$GameFunctionApp = 'func-aw-iot-game-v2',
    [string]$GameFunctionPlanName = 'func-aw-iot-game-v2-plan',
    [string]$GameFunctionStorageAccountName = 'stawazcomiotgamev2',
    [string]$GameAppInsightsName = 'func-aw-azcom-iot-game',
    [string]$GameFailureAnomaliesAlertName = 'Failure Anomalies - func-aw-azcom-iot-game',
    [string]$SmartDetectionActionGroupName = 'application insights smart detection',
    [string]$IoTHubName = 'iothub-aw-iot-copilot',
    [string]$VirtualNetworkName = 'iot-demo-vnet',
    [string]$DnsResolverName = 'iot-demo-dns-resolver',
    [string]$VpnPublicIpName = 'iot-demo-vpn-pip',
    [string]$VpnGatewayName = 'iot-demo-vpn',
    [switch]$PreflightOnly
)

$ErrorActionPreference = 'Stop'
$readerName = 'id-gha-infra-reader'
$deployerName = 'id-gha-infra-deployer'
$receiverRoleId = 'a638d3c7-ab3a-418d-83e6-5f17a39d4fde'          # Azure Event Hubs Data Receiver
$senderRoleId = '2b629674-e913-4c01-ae53-ef4638d8f975'            # Azure Event Hubs Data Sender
$rbacAdminRoleId = 'f58310d9-a9f6-439a-9e8d-f62e7b41a168'          # Role Based Access Control Administrator
$deployRoleName = 'Infra Deployment Operator'
$actionGroupRoleName = 'Action Group Operator'
$iotHubPrivateEndpointApproverRoleName = 'IoT Hub Private Endpoint Connection Approver'
$privateEndpointRoleName = 'Network Private Endpoint Operator'

function Invoke-Step {
    param($description, [scriptblock]$action)

    if ($WhatIfPreference) {
        Write-Host "WhatIf: $description"
        return
    }

    & $action
    if ($LASTEXITCODE -ne 0) { throw "Failed: $description" }
}

$sub = az account show --query id -o tsv
if ($LASTEXITCODE -ne 0 -or $sub -ne $SubscriptionId) { throw "Select destination subscription $SubscriptionId before initializing deployment identities." }
$tenant = az account show --query tenantId -o tsv
if ($LASTEXITCODE -ne 0 -or $tenant -ne $TenantId) { throw "Select destination tenant $TenantId before initializing deployment identities." }
$rgScope = "/subscriptions/$sub/resourceGroups/$ResourceGroup"
$nsScope = "$rgScope/providers/Microsoft.EventHub/namespaces/$EventHubNamespace"
$hubScope = "$nsScope/eventhubs/$EventHubName"
$signalrScope = "$rgScope/providers/Microsoft.SignalRService/SignalR/$SignalRName"
$appScope = "$rgScope/providers/Microsoft.Web/sites/$GameFunctionApp"
$gameFunctionPlanScope = "$rgScope/providers/Microsoft.Web/serverfarms/$GameFunctionPlanName"
$gameFunctionStorageScope = "$rgScope/providers/Microsoft.Storage/storageAccounts/$GameFunctionStorageAccountName"
$gameAppInsightsScope = "$rgScope/providers/Microsoft.Insights/components/$GameAppInsightsName"
$gameFailureAnomaliesAlertScope = "$rgScope/providers/Microsoft.AlertsManagement/smartDetectorAlertRules/$GameFailureAnomaliesAlertName"
$iotHubScope = "$rgScope/providers/Microsoft.Devices/IotHubs/$IoTHubName"
$vnetScope = "$rgScope/providers/Microsoft.Network/virtualNetworks/$VirtualNetworkName"
$dnsResolverScope = "$rgScope/providers/Microsoft.Network/dnsResolvers/$DnsResolverName"
$vpnPublicIpScope = "$rgScope/providers/Microsoft.Network/publicIPAddresses/$VpnPublicIpName"
$vpnGatewayScope = "$rgScope/providers/Microsoft.Network/virtualNetworkGateways/$VpnGatewayName"

# --- preflight: fail before creating anything ---
function Assert-CanAdministerRoles($scope, $displayName) {
    $assignee = az ad signed-in-user show --query id -o tsv 2>$null
    if (-not $assignee) { $assignee = az account show --query user.name -o tsv }   # service principal
    $roles = @(az role assignment list --assignee $assignee --include-groups --include-inherited `
            --scope $scope --query '[].roleDefinitionName' -o tsv 2>$null)
    if (-not ($roles | Where-Object { $_ -in @('Owner', 'User Access Administrator') })) {
        $who = az account show --query user.name -o tsv
        throw ("$who has [$($roles -join ', ')] on $displayName. Creating custom roles and role assignments needs " +
               "Owner or User Access Administrator (activate it in PIM if it is an eligible role), or ask an Owner to run this. Nothing was changed.")
    }
    Write-Host "Preflight ok: $($roles -join ', ') on $displayName"
}
if ($WhatIfPreference) {
    Write-Host 'WhatIf: skipping the permission preflight.'
} else {
    Assert-CanAdministerRoles $rgScope $ResourceGroup
}
if ($PreflightOnly) { exit 0 }

# --- identities + federated credentials ---
foreach ($item in @(
        @{ Name = $readerName; Environment = 'infra-readonly' },
        @{ Name = $deployerName; Environment = 'infra-deploy' })) {
    Invoke-Step "create identity $($item.Name)" {
        az identity create -g $ResourceGroup -n $item.Name -l $Location --only-show-errors --output none
    }
    $credName = "github-$($item.Environment)"
    $existing = az identity federated-credential list -g $ResourceGroup --identity-name $item.Name --query "[?name=='$credName'].name" -o tsv 2>$null
    if ($existing) { Write-Host "federated credential $credName already exists on $($item.Name)"; continue }
    Invoke-Step "federate $($item.Name) to GitHub environment $($item.Environment)" {
        az identity federated-credential create -g $ResourceGroup --identity-name $item.Name `
            --name "github-$($item.Environment)" `
            --issuer 'https://token.actions.githubusercontent.com' `
            --subject "$SubjectPrefix`:environment:$($item.Environment)" `
            --audiences 'api://AzureADTokenExchange' --only-show-errors --output none
    }
}

# --- custom roles ---
# Plain .NET file calls: -WhatIf would suppress the cmdlet equivalents and break the dry run.
function New-CustomRole($name, $description, $actions) {
    # Creates the role. If it exists: does nothing when it already matches, otherwise updates it,
    # so re-running applies permission changes. `az role definition update` needs the same shape
    # `az role definition list` returns (roleName/permissions), not the create-only shape.
    $existing = az role definition list --name $name -o json | ConvertFrom-Json | Where-Object { $_.roleName -eq $name } | Select-Object -First 1
    $roleFile = [System.IO.Path]::GetTempFileName()
    try {
        if ($existing) {
            $current = @($existing.permissions[0].actions) | Sort-Object
            $wanted = @($actions) | Sort-Object
            if (-not (Compare-Object $current $wanted) -and $existing.description -eq $description) {
                Write-Host "custom role '$name' is already up to date"
                return
            }
            $existing.description = $description
            $existing.permissions = @(@{ actions = @($actions); notActions = @(); dataActions = @(); notDataActions = @() })
            [System.IO.File]::WriteAllText($roleFile, ($existing | ConvertTo-Json -Depth 10))
            Invoke-Step "update custom role '$name'" {
                az role definition update --role-definition $roleFile --only-show-errors --output none
            }
        } else {
            [System.IO.File]::WriteAllText($roleFile, (@{
                Name = $name
                Description = $description
                Actions = $actions
                NotActions = @()
                AssignableScopes = @($rgScope)
            } | ConvertTo-Json))
            Invoke-Step "create custom role '$name'" {
                az role definition create --role-definition $roleFile --only-show-errors --output none
            }
        }
    } finally {
        [System.IO.File]::Delete($roleFile)
    }
}

New-CustomRole $deployRoleName 'Create and read resource group deployments (what-if/deploy). No resource write access by itself.' @(
    'Microsoft.Resources/deployments/*', 'Microsoft.Resources/subscriptions/resourceGroups/read')

New-CustomRole $actionGroupRoleName 'Create, update and read action groups in the infrastructure resource group.' @(
    'Microsoft.Insights/actionGroups/*', 'Microsoft.Resources/subscriptions/resourceGroups/read')

New-CustomRole $iotHubPrivateEndpointApproverRoleName 'Approve private endpoint connections for the existing IoT Hub. No IoT Hub write access.' @(
    'Microsoft.Devices/IotHubs/read', 'Microsoft.Devices/IotHubs/PrivateEndpointConnectionsApproval/action')

New-CustomRole $privateEndpointRoleName 'Read and create private endpoints and their private DNS zone groups. No endpoint, NIC, VNet, or DNS deletion access.' @(
    'Microsoft.Network/privateEndpoints/read',
    'Microsoft.Network/privateEndpoints/write',
    'Microsoft.Network/privateEndpoints/privateDnsZoneGroups/read',
    'Microsoft.Network/privateEndpoints/privateDnsZoneGroups/write')

function New-Assignment($identityName, $role, $scope, $extra = @()) {
    if ($WhatIfPreference) {
        Write-Host "WhatIf: assign '$role' to $identityName on $($scope.Split('/')[-1])"
        return
    }

    $principal = az identity show -g $ResourceGroup -n $identityName --query principalId -o tsv 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $principal) { throw "identity $identityName not found" }
    $roleArgument = $role
    if ($role -in @($deployRoleName, $actionGroupRoleName, $iotHubPrivateEndpointApproverRoleName)) {
        $roleArgument = az role definition list --name $role --query "[?roleName=='$role'].id | [0]" -o tsv
        if ($LASTEXITCODE -ne 0 -or -not $roleArgument) { throw "custom role $role not found" }
    }

    $roleId = if ($roleArgument -match '^/.*roleDefinitions/' -or $roleArgument -match '^[0-9a-fA-F-]{36}$') {
        $roleArgument
    } else {
        az role definition list --name $roleArgument --query '[0].id' -o tsv
    }
    if ($LASTEXITCODE -ne 0 -or -not $roleId) { throw "Could not resolve role definition for '$role'." }
    $roleGuid = $roleId.Split('/')[-1]

    $assignmentJson = az role assignment list --assignee-object-id $principal --all --only-show-errors -o json
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect existing '$role' assignments for $identityName." }
    $assignments = @($assignmentJson | ConvertFrom-Json)
    $matching = @($assignments | Where-Object {
        $_.scope -ieq $scope -and $_.roleDefinitionId.Split('/')[-1] -ieq $roleGuid
    })
    $expectedCondition = $null
    $expectedConditionVersion = $null
    for ($argumentIndex = 0; $argumentIndex -lt $extra.Count; $argumentIndex++) {
        if ($extra[$argumentIndex] -eq '--condition') { $expectedCondition = $extra[$argumentIndex + 1] }
        if ($extra[$argumentIndex] -eq '--condition-version') { $expectedConditionVersion = $extra[$argumentIndex + 1] }
    }
    if ($matching.Count -gt 1) { throw "Multiple '$role' assignments already exist for $identityName at $scope." }
    if ($matching.Count -eq 1) {
        $current = $matching[0]
        if ($current.condition -ne $expectedCondition -or [string]$current.conditionVersion -ne [string]$expectedConditionVersion) {
            throw "Existing '$role' assignment for $identityName has a different condition; review it manually before rerunning."
        }
        Write-Host "role '$role' is already assigned to $identityName on $($scope.Split('/')[-1])"
        return
    }

    Invoke-Step "assign '$role' to $identityName on $($scope.Split('/')[-1])" {
        az role assignment create --assignee-object-id $principal --assignee-principal-type ServicePrincipal `
            --role $roleArgument --scope $scope @extra --only-show-errors --output none
    }
}

# --- reader ---
New-Assignment $readerName 'Reader' $rgScope

# --- deployer ---
New-Assignment $deployerName 'Reader' $rgScope
New-Assignment $deployerName $deployRoleName $rgScope
New-Assignment $deployerName 'Contributor' $nsScope
New-Assignment $deployerName 'Contributor' $signalrScope
New-Assignment $deployerName 'Contributor' $appScope
New-Assignment $deployerName 'Contributor' $gameFunctionPlanScope
New-Assignment $deployerName 'Contributor' $gameFunctionStorageScope
New-Assignment $deployerName 'Contributor' $gameAppInsightsScope
New-Assignment $deployerName 'Contributor' $gameFailureAnomaliesAlertScope
New-Assignment $deployerName $actionGroupRoleName $rgScope
New-Assignment $deployerName $iotHubPrivateEndpointApproverRoleName $iotHubScope
New-Assignment $deployerName 'Contributor' $vnetScope
New-Assignment $deployerName 'Contributor' $dnsResolverScope
New-Assignment $deployerName 'Contributor' $vpnPublicIpScope
New-Assignment $deployerName 'Contributor' $vpnGatewayScope
New-Assignment $deployerName $privateEndpointRoleName $rgScope
New-Assignment $deployerName 'Private DNS Zone Contributor' $rgScope

# May assign/remove only Event Hubs Data Sender/Receiver roles, and only within the Event Hub namespace.
$eventHubsDataRoleIds = "$receiverRoleId, $senderRoleId"
$condition = "((!(ActionMatches{'Microsoft.Authorization/roleAssignments/write'})) OR (@Request[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {$eventHubsDataRoleIds})) AND " +
             "((!(ActionMatches{'Microsoft.Authorization/roleAssignments/delete'})) OR (@Resource[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {$eventHubsDataRoleIds}))"
New-Assignment $deployerName $rbacAdminRoleId $nsScope @('--condition', $condition, '--condition-version', '2.0')
New-Assignment $deployerName $rbacAdminRoleId $hubScope @('--condition', $condition, '--condition-version', '2.0')

Write-Host @"

Done. Now, by hand:
  1. GitHub > Settings > Environments: create 'infra-readonly' (no protection) and
     'infra-deploy' (deployment branches: main only; a required reviewer if your plan allows).
  2. GitHub > Settings > Secrets and variables > Actions > Variables:
       AZURE_INFRA_READER_CLIENT_ID   = $(if ($WhatIfPreference) { '<client id of ' + $readerName + '>' } else { az identity show -g $ResourceGroup -n $readerName --query clientId -o tsv })
       AZURE_INFRA_DEPLOYER_CLIENT_ID = $(if ($WhatIfPreference) { '<client id of ' + $deployerName + '>' } else { az identity show -g $ResourceGroup -n $deployerName --query clientId -o tsv })
    Set AZURE_TENANT_ID for the deployment tenant. Workflows pin the destination subscription.
"@

exit 0
