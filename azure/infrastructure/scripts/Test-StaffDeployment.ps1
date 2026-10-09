# Offline orchestration checks. The local az function prevents all cloud calls.
$ErrorActionPreference = 'Stop'
$config = Get-Content (Join-Path $PSScriptRoot '../staff-api.prod.json') -Raw | ConvertFrom-Json
$staffResourceNames = @($config.functionAppName, "$($config.functionAppName)-plan", $config.storageAccountName)
foreach ($file in @('../main.prod.bicepparam', '../reference/manifest.json')) {
    $content = Get-Content (Join-Path $PSScriptRoot $file) -Raw
    foreach ($name in $staffResourceNames) {
        if ($content -match [regex]::Escape($name)) { throw "Staff ownership conflict in ${file}: $name" }
    }
}
$staffTestState = @{ scenario=''; calls=[Collections.Generic.List[string]]::new() }
function az {
    $command = $args -join ' '
    $staffTestState.calls.Add($command)
    $global:LASTEXITCODE = 0
    switch -Wildcard ($command) {
        'account show*' {
            $tenant = if ($staffTestState.scenario -eq 'wrong-tenant') { 'wrong' } else { $config.tenantId }
            @{ id='test-subscription'; tenantId=$tenant } | ConvertTo-Json
        }
        'resource show*' {
            $delegation = if ($staffTestState.scenario -eq 'wrong-subnet') { 'other' } else { 'Microsoft.App/environments' }
            @{properties=@{delegations=@(@{properties=@{serviceName=$delegation}})}} | ConvertTo-Json -Depth 6
        }
        'resource list*' {
            $resources = @(@{type='Microsoft.Web/sites';name=$config.sourceFunctionAppName})
            if ($staffTestState.scenario -eq 'migration-owned') {
                $tags = @{application='CopilotIoTGame';purpose='subscription-migration';component='parallel-function-rebuild';'managed-by'='bicep'}
                $resources += @(
                    @{type='Microsoft.Web/sites';name=$config.functionAppName;tags=$tags},
                    @{type='Microsoft.Web/serverFarms';name="$($config.functionAppName)-plan";tags=$tags},
                    @{type='Microsoft.Storage/storageAccounts';name=$config.storageAccountName;tags=$tags}
                )
            }
            if ($staffTestState.scenario -eq 'collision') { $resources += @{type='Microsoft.Web/sites';name=$config.functionAppName;tags=@{}} }
            ConvertTo-Json -InputObject $resources -Depth 4
        }
        'deployment group validate*' { if ($staffTestState.scenario -eq 'validation-fails') { $global:LASTEXITCODE = 1 } }
        'deployment group what-if*' { if ($staffTestState.scenario -eq 'preview-fails') { $global:LASTEXITCODE = 1 } }
        'deployment group create*' { }
        'deployment group show*' { 'staff.example.invalid' }
        default { throw "Unexpected Azure call: $command" }
    }
}
foreach ($case in @('preview', 'deploy', 'migration-owned', 'wrong-tenant', 'wrong-subnet', 'collision', 'validation-fails', 'preview-fails')) {
    $staffTestState.scenario = $case
    $staffTestState.calls.Clear()
    $failed = $false
    $mode = if ($case -in @('preview', 'migration-owned')) { 'Preview' } else { 'Deploy' }
    try { & (Join-Path $PSScriptRoot 'Deploy-StaffApi.ps1') -Mode $mode } catch { $failed = $true }
    $expectedFailure = $case -notin @('preview', 'deploy', 'migration-owned')
    if ($failed -ne $expectedFailure) { throw "Unexpected outcome: $case" }
    $writes = @($staffTestState.calls | Where-Object { $_ -like 'deployment group create*' })
    if ($writes.Count -ne [int]($case -eq 'deploy')) { throw "Unexpected deployment attempt: $case" }
    if ($case -eq 'migration-owned' -and -not @($staffTestState.calls | Where-Object { $_ -like '*staffExists=true*' })) { throw 'Migration-owned staff app was not recognized as existing.' }
    Write-Host "PASS $case"
}
# The final case intentionally mocks a native exit code of 1. Do not leak that
# expected failure into GitHub's PowerShell step wrapper after assertions pass.
$global:LASTEXITCODE = 0
