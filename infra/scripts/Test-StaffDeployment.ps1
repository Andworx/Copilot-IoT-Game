# Offline orchestration checks. The local az function prevents all cloud calls.
$ErrorActionPreference = 'Stop'
$config = Get-Content (Join-Path $PSScriptRoot '../staff-api.prod.json') -Raw | ConvertFrom-Json
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
            if ($staffTestState.scenario -eq 'collision') { $resources += @{type='Microsoft.Web/sites';name=$config.functionAppName;tags=@{}} }
            ConvertTo-Json -InputObject $resources -Depth 4
        }
        'deployment group what-if*' { if ($staffTestState.scenario -eq 'preview-fails') { $global:LASTEXITCODE = 1 } }
        'deployment group create*' { }
        'deployment group show*' { 'staff.example.invalid' }
        default { throw "Unexpected Azure call: $command" }
    }
}
foreach ($case in @('preview', 'deploy', 'wrong-tenant', 'wrong-subnet', 'collision', 'preview-fails')) {
    $staffTestState.scenario = $case
    $staffTestState.calls.Clear()
    $failed = $false
    $mode = if ($case -eq 'preview') { 'Preview' } else { 'Deploy' }
    try { & (Join-Path $PSScriptRoot 'Deploy-StaffApi.ps1') -Mode $mode } catch { $failed = $true }
    $expectedFailure = $case -notin @('preview', 'deploy')
    if ($failed -ne $expectedFailure) { throw "Unexpected outcome: $case" }
    $writes = @($staffTestState.calls | Where-Object { $_ -like 'deployment group create*' })
    if ($writes.Count -ne [int]($case -eq 'deploy')) { throw "Unexpected deployment attempt: $case" }
    Write-Host "PASS $case"
}
