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
                               - Contributor on the Event Hub namespace, the SignalR service,
                                 the game Function App, the demo VNet, and the DNS Private
                                                                 Resolver, VPN public IP, VPN gateway, SignalR private
                                                                 endpoint, game Function private endpoint, and game storage blob private endpoint only,
                               - Private DNS Zone Contributor on the resource group,
                               - assign ONLY the "Azure Event Hubs Data Receiver" role, and
                                 only on the telemetry event hub (ABAC-conditioned).
                             It has no write access to the IoT Hub, DPS, the legacy Function
                             App, storage, or anything else, so a bad template or workflow
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
    [string]$SubjectPrefix = 'repo:Andworx@226577816/Copilot-IoT-Game@1350685991',
    [string]$EventHubNamespace = 'evhns-aw-iot-copilot',
    [string]$EventHubName = 'iot-telemetry',
    [string]$SignalRName = 'signalr-aw-iot-copilot',
    [string]$GameFunctionApp = 'func-aw-azcom-iot-game',
    [string]$VirtualNetworkName = 'iot-demo-vnet',
    [string]$DnsResolverName = 'iot-demo-dns-resolver',
    [string]$VpnPublicIpName = 'iot-demo-vpn-pip',
    [string]$VpnGatewayName = 'iot-demo-vpn',
    [string]$SignalRPrivateEndpointName = 'iot-demo-signalr-pe',
    [string]$GameFunctionPrivateEndpointName = 'iot-demo-game-function-pe',
    [string]$GameStorageBlobPrivateEndpointName = 'iot-demo-game-storage-blob-pe',
    [switch]$PreflightOnly
)

$ErrorActionPreference = 'Stop'
$readerName = 'id-gha-infra-reader'
$deployerName = 'id-gha-infra-deployer'
$receiverRoleId = 'a638d3c7-ab3a-418d-83e6-5f17a39d4fde'          # Azure Event Hubs Data Receiver
$rbacAdminRoleId = 'f58310d9-a9f6-439a-9e8d-f62e7b41a168'          # Role Based Access Control Administrator
$deployRoleName = 'Infra Deployment Operator'

function Invoke-Step($description, [scriptblock]$action) {
    if ($PSCmdlet.ShouldProcess($ResourceGroup, $description)) {
        & $action
        if ($LASTEXITCODE -ne 0) { throw "Failed: $description" }
    }
}

$sub = az account show --query id -o tsv
$rgScope = "/subscriptions/$sub/resourceGroups/$ResourceGroup"
$nsScope = "$rgScope/providers/Microsoft.EventHub/namespaces/$EventHubNamespace"
$hubScope = "$nsScope/eventhubs/$EventHubName"
$signalrScope = "$rgScope/providers/Microsoft.SignalRService/SignalR/$SignalRName"
$appScope = "$rgScope/providers/Microsoft.Web/sites/$GameFunctionApp"
$vnetScope = "$rgScope/providers/Microsoft.Network/virtualNetworks/$VirtualNetworkName"
$dnsResolverScope = "$rgScope/providers/Microsoft.Network/dnsResolvers/$DnsResolverName"
$vpnPublicIpScope = "$rgScope/providers/Microsoft.Network/publicIPAddresses/$VpnPublicIpName"
$vpnGatewayScope = "$rgScope/providers/Microsoft.Network/virtualNetworkGateways/$VpnGatewayName"
$signalRPrivateEndpointScope = "$rgScope/providers/Microsoft.Network/privateEndpoints/$SignalRPrivateEndpointName"
$gameFunctionPrivateEndpointScope = "$rgScope/providers/Microsoft.Network/privateEndpoints/$GameFunctionPrivateEndpointName"
$gameStorageBlobPrivateEndpointScope = "$rgScope/providers/Microsoft.Network/privateEndpoints/$GameStorageBlobPrivateEndpointName"

# --- preflight: fail before creating anything ---
function Assert-CanAdministerRoles {
    $assignee = az ad signed-in-user show --query id -o tsv 2>$null
    if (-not $assignee) { $assignee = az account show --query user.name -o tsv }   # service principal
    $roles = @(az role assignment list --assignee $assignee --include-groups --include-inherited `
            --scope $rgScope --query '[].roleDefinitionName' -o tsv 2>$null)
    if (-not ($roles | Where-Object { $_ -in @('Owner', 'User Access Administrator') })) {
        $who = az account show --query user.name -o tsv
        throw ("$who has [$($roles -join ', ')] on $ResourceGroup. Creating custom roles and role assignments needs " +
               "Owner or User Access Administrator (activate it in PIM if it is an eligible role), or ask an Owner to run this. Nothing was changed.")
    }
    Write-Host "Preflight ok: $($roles -join ', ') on $ResourceGroup"
}
if ($WhatIfPreference) { Write-Host 'WhatIf: skipping the permission preflight.' } else { Assert-CanAdministerRoles }
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
    $existing = az role definition list --name $name --scope $rgScope -o json | ConvertFrom-Json | Select-Object -First 1
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

function New-Assignment($identityName, $role, $scope, $extra = @()) {
    $principal = az identity show -g $ResourceGroup -n $identityName --query principalId -o tsv 2>$null
    if (-not $principal -and -not $WhatIfPreference) { throw "identity $identityName not found" }
    Invoke-Step "assign '$role' to $identityName on $($scope.Split('/')[-1])" {
        az role assignment create --assignee-object-id $principal --assignee-principal-type ServicePrincipal `
            --role $role --scope $scope @extra --only-show-errors --output none
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
New-Assignment $deployerName 'Contributor' $vnetScope
New-Assignment $deployerName 'Contributor' $dnsResolverScope
New-Assignment $deployerName 'Contributor' $vpnPublicIpScope
New-Assignment $deployerName 'Contributor' $vpnGatewayScope
New-Assignment $deployerName 'Contributor' $signalRPrivateEndpointScope
New-Assignment $deployerName 'Contributor' $gameFunctionPrivateEndpointScope
New-Assignment $deployerName 'Contributor' $gameStorageBlobPrivateEndpointScope
New-Assignment $deployerName 'Private DNS Zone Contributor' $rgScope

# May assign/remove only Event Hubs Data Receiver, and only at the hub.
$condition = "((!(ActionMatches{'Microsoft.Authorization/roleAssignments/write'})) OR (@Request[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {$receiverRoleId})) AND " +
             "((!(ActionMatches{'Microsoft.Authorization/roleAssignments/delete'})) OR (@Resource[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {$receiverRoleId}))"
New-Assignment $deployerName $rbacAdminRoleId $hubScope @('--condition', $condition, '--condition-version', '2.0')

Write-Host @"

Done. Now, by hand:
  1. GitHub > Settings > Environments: create 'infra-readonly' (no protection) and
     'infra-deploy' (deployment branches: main only; a required reviewer if your plan allows).
  2. GitHub > Settings > Secrets and variables > Actions > Variables:
       AZURE_INFRA_READER_CLIENT_ID   = $(if ($WhatIfPreference) { '<client id of ' + $readerName + '>' } else { az identity show -g $ResourceGroup -n $readerName --query clientId -o tsv })
       AZURE_INFRA_DEPLOYER_CLIENT_ID = $(if ($WhatIfPreference) { '<client id of ' + $deployerName + '>' } else { az identity show -g $ResourceGroup -n $deployerName --query clientId -o tsv })
     (AZURE_TENANT_ID and AZURE_SUBSCRIPTION_ID are already set for the app deployment.)
"@

exit 0
