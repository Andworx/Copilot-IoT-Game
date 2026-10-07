<#
.SYNOPSIS
    Exercise the Function preflight transaction using a simulated Azure CLI only.
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$sourceSubscription = '2e291b4a-5f03-4dcd-bb56-09643c729adc'
$sourceScope = "/subscriptions/$sourceSubscription/resourceGroups/rg-aw-azcom-iot-copilot"
$originalSubnet = "$sourceScope/providers/Microsoft.Network/virtualNetworks/iot-demo-vnet/subnets/function-integration"
$appNames = @('func-aw-azcom-iot-game', 'func-aw-azcom-iot-staff')
$manifest = Get-Content (Join-Path $PSScriptRoot '../service-move.json') -Raw | ConvertFrom-Json
$fixtureResources = @($manifest.resources | ForEach-Object { @{name = $_.name; type = $_.type; id = "$sourceScope/providers/$($_.type)/$($_.name)"} })
$environment = @{}
foreach ($name in @('GITHUB_ACTIONS', 'GITHUB_REF', 'GITHUB_REPOSITORY', 'GITHUB_STEP_SUMMARY')) { $environment[$name] = [Environment]::GetEnvironmentVariable($name) }
$testDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "function-preflight-tests-$([guid]::NewGuid())"
[System.IO.Directory]::CreateDirectory($testDirectory) | Out-Null
$previousFixture = Get-Variable -Name IoTFunctionPreflightFixture -Scope Global -ErrorAction SilentlyContinue
$global:IoTFunctionPreflightFixture = @{}

function az {
    $global:LASTEXITCODE = 0
    if ($args[0] -eq 'account') { return (@{id = $sourceSubscription} | ConvertTo-Json) }
    if ($args[0] -eq 'rest') {
        $method = $args[([array]::IndexOf($args, '--method') + 1)]
        $url = $args[([array]::IndexOf($args, '--url') + 1)]
        if ($method -eq 'get') {
            $actions = if ($global:IoTFunctionPreflightFixture.scenario -eq 'missing-staff-permission' -and $url.Contains('/sites/func-aw-azcom-iot-staff/')) { @('*/read') } else { @('*') }
            return (@{value = @(@{actions = $actions; notActions = @()})} | ConvertTo-Json -Depth 5)
        }
        if ($method -ne 'patch' -or $url -notmatch '/sites/(func-aw-azcom-iot-(?:game|staff))\?api-version=2024-04-01$') { throw 'Unexpected simulated REST mutation.' }
        $appName = $Matches[1]
        $bodyArgument = $args[([array]::IndexOf($args, '--body') + 1)]
        $body = Get-Content $bodyArgument.Substring(1) -Raw | ConvertFrom-Json -AsHashtable
        if ($body.Keys.Count -ne 1 -or $body.properties.Keys.Count -ne 1 -or -not $body.properties.ContainsKey('virtualNetworkSubnetId')) { throw 'PATCH body contains more than the integration field.' }
        $subnet = $body.properties.virtualNetworkSubnetId
        $global:IoTFunctionPreflightFixture.patches.Add([pscustomobject]@{name = $appName; subnet = $subnet})
        if ($null -ne $subnet -and $global:IoTFunctionPreflightFixture.scenario -eq 'rollback-failure' -and $appName -eq 'func-aw-azcom-iot-game') { $global:LASTEXITCODE = 1; return }
        $global:IoTFunctionPreflightFixture.state[$appName] = $subnet
        if ($null -eq $subnet -and $global:IoTFunctionPreflightFixture.scenario -eq 'second-detach-failure' -and $appName -eq 'func-aw-azcom-iot-staff') { $global:LASTEXITCODE = 1 }
        return
    }
    if ($args[0] -eq 'resource' -and $args[1] -eq 'show') {
        $id = $args[([array]::IndexOf($args, '--ids') + 1)]
        $appName = ($id -split '/')[-1]
        if ($appName -notin $appNames) { throw 'Unexpected app metadata request.' }
        return (@{id = $id; properties = @{state = 'Running'; virtualNetworkSubnetId = $global:IoTFunctionPreflightFixture.state[$appName]}} | ConvertTo-Json -Depth 5)
    }
    if ($args[0] -eq 'resource' -and $args[1] -eq 'list') {
        if ($args -contains $sourceSubscription) { return (ConvertTo-Json -InputObject $fixtureResources -Depth 5) }
        return '[]'
    }
    if ($args[0] -eq 'resource' -and $args[1] -eq 'wait') { return }
    if ($args[0] -eq 'resource' -and $args[1] -eq 'invoke-action') {
        if ($args -notcontains 'validateMoveResources' -or @($appNames | Where-Object { $null -ne $global:IoTFunctionPreflightFixture.state[$_] }).Count) { throw 'Validation occurred without detaching both apps or used an unapproved action.' }
        $global:IoTFunctionPreflightFixture.validations++
        if ($global:IoTFunctionPreflightFixture.scenario -in @('validation-failure', 'rollback-failure')) { $global:LASTEXITCODE = 1; return '{"error":"simulated provider blocker"}' }
        return '{}'
    }
    throw "Unexpected simulated Azure command: $($args -join ' ')."
}

try {
    $env:GITHUB_ACTIONS = 'true'
    $env:GITHUB_REF = 'refs/heads/main'
    $env:GITHUB_REPOSITORY = 'Andworx/Copilot-IoT-Game'
    $env:GITHUB_STEP_SUMMARY = Join-Path $testDirectory 'summary.md'
    foreach ($scenarioName in @('success', 'validation-failure', 'missing-staff-permission', 'second-detach-failure', 'rollback-failure')) {
        $global:IoTFunctionPreflightFixture.scenario = $scenarioName
        $global:IoTFunctionPreflightFixture.state = @{}
        foreach ($appName in $appNames) { $global:IoTFunctionPreflightFixture.state[$appName] = $originalSubnet }
        $global:IoTFunctionPreflightFixture.patches = [System.Collections.Generic.List[object]]::new()
        $global:IoTFunctionPreflightFixture.validations = 0
        $output = Join-Path $testDirectory $scenarioName
        $failure = $null
        try {
            & (Join-Path $PSScriptRoot 'Invoke-FunctionMovePreflight.ps1') -OutputDirectory $output -Confirmation 'DETACH REVALIDATE RESTORE SOURCE FUNCTIONS'
        } catch { $failure = $_.Exception.Message }
        if (($scenarioName -eq 'success') -ne ($null -eq $failure)) { throw "Unexpected outcome for ${scenarioName}: $failure" }
        if ($scenarioName -eq 'missing-staff-permission') {
            if ($global:IoTFunctionPreflightFixture.patches.Count -ne 0 -or $global:IoTFunctionPreflightFixture.validations -ne 0) { throw 'Permission failure mutated a source app.' }
        } else {
            $result = Get-Content (Join-Path $output 'function-preflight-result.json') -Raw | ConvertFrom-Json
            if ($result.sourceServicesMoved -ne $false) { throw 'Preflight claimed a resource move.' }
            if ($scenarioName -eq 'rollback-failure') {
                if (@($result.restoreErrors).Count -ne 1 -or $failure -notlike '*Source restoration incomplete*' -or $global:IoTFunctionPreflightFixture.state['func-aw-azcom-iot-staff'] -ne $originalSubnet) { throw 'Rollback failure was not surfaced while restoring the other app.' }
            } elseif (@($appNames | Where-Object { $global:IoTFunctionPreflightFixture.state[$_] -ne $originalSubnet }).Count -or @($result.restoredApps).Count -ne 2) {
                throw "Original integrations were not restored for $scenarioName."
            }
            if ($scenarioName -eq 'second-detach-failure' -and $global:IoTFunctionPreflightFixture.validations -ne 0) { throw 'Partial detachment invoked validation.' }
            $snapshot = Get-Content (Join-Path $output 'function-integration-snapshot.json') -Raw | ConvertFrom-Json
            if (@($snapshot.apps).Count -ne 2 -or @($snapshot.apps | Where-Object { $_.subnetId -ne $originalSubnet }).Count) { throw 'Original integration snapshot is incomplete.' }
        }
        Write-Host "PASS: $scenarioName"
    }
    $global:IoTFunctionPreflightFixture.scenario = 'recovery-success'
    $validationCount = $global:IoTFunctionPreflightFixture.validations
    $recoveryOutput = Join-Path $testDirectory 'rollback-failure'
    & (Join-Path $PSScriptRoot 'Invoke-FunctionMovePreflight.ps1') -OutputDirectory $recoveryOutput -Confirmation 'DETACH REVALIDATE RESTORE SOURCE FUNCTIONS' -RestoreOnly
    if (@($appNames | Where-Object { $global:IoTFunctionPreflightFixture.state[$_] -ne $originalSubnet }).Count -or $global:IoTFunctionPreflightFixture.validations -ne $validationCount) { throw 'Restore-only recovery did not restore integrations without validation.' }
    Write-Host 'PASS: restore-only recovery after failed rollback'
    $patchCount = $global:IoTFunctionPreflightFixture.patches.Count
    $invalidOutput = Join-Path $testDirectory 'invalid-recovery'
    [System.IO.Directory]::CreateDirectory($invalidOutput) | Out-Null
    $invalidSnapshot = Get-Content (Join-Path $recoveryOutput 'function-integration-snapshot.json') -Raw | ConvertFrom-Json
    $invalidSnapshot.apps[0].subnetId = '/subscriptions/unexpected/resourceGroups/unexpected/providers/Microsoft.Network/virtualNetworks/unexpected/subnets/unexpected'
    $invalidSnapshot | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $invalidOutput 'function-integration-snapshot.json') -Encoding utf8
    $rejected = $false
    try { & (Join-Path $PSScriptRoot 'Invoke-FunctionMovePreflight.ps1') -OutputDirectory $invalidOutput -Confirmation 'DETACH REVALIDATE RESTORE SOURCE FUNCTIONS' -RestoreOnly } catch { $rejected = $true }
    if (-not $rejected -or $global:IoTFunctionPreflightFixture.patches.Count -ne $patchCount) { throw 'Invalid recovery snapshot was not rejected before mutation.' }
    Write-Host 'PASS: invalid recovery subnet rejected'
    & (Join-Path $PSScriptRoot 'Invoke-FunctionMovePreflight.ps1') -OutputDirectory (Join-Path $testDirectory 'not-started') -Confirmation 'DETACH REVALIDATE RESTORE SOURCE FUNCTIONS' -RestoreOnly
    if ($global:IoTFunctionPreflightFixture.patches.Count -ne $patchCount) { throw 'Recovery without a snapshot mutated an app.' }
    Write-Host 'PASS: missing recovery snapshot causes no mutation'
    $global:IoTFunctionPreflightFixture.patches.Clear()
    $rejected = $false
    try { & (Join-Path $PSScriptRoot 'Invoke-FunctionMovePreflight.ps1') -OutputDirectory $testDirectory -Confirmation 'yes' } catch { $rejected = $true }
    if (-not $rejected -or $global:IoTFunctionPreflightFixture.patches.Count) { throw 'Missing acknowledgement was not rejected before mutation.' }
    Write-Host 'PASS: exact interruption acknowledgement required'
} finally {
    foreach ($name in $environment.Keys) { [Environment]::SetEnvironmentVariable($name, $environment[$name]) }
    if ($previousFixture) { $global:IoTFunctionPreflightFixture = $previousFixture.Value } else { Remove-Variable -Name IoTFunctionPreflightFixture -Scope Global -ErrorAction SilentlyContinue }
}
$global:LASTEXITCODE = 0