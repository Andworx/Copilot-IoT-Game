<#
.SYNOPSIS
    Compares the game Function App's live site config with the Bicep (read-only).
.DESCRIPTION
    ARM what-if does not read Microsoft.Web/sites/config, so it reports cors, ftpsState,
    minTlsVersion, scmMinTlsVersion and vnetRouteAllEnabled as "null -> value" even when
    Azure already matches. deploy-infra.yml ignores those preview paths and this script
    keeps real drift detectable by reading the live values and comparing them with
    modules/game-function-hosting.bicep and main.prod.bicepparam.
#>
[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-aw-azcom-iot-copilot',
    [string]$FunctionAppName = 'func-aw-iot-game-v2'
)

$ErrorActionPreference = 'Stop'
$infra = Join-Path $PSScriptRoot '..'
$module = Get-Content (Join-Path $infra 'modules/game-function-hosting.bicep') -Raw
$params = Get-Content (Join-Path $infra 'main.prod.bicepparam') -Raw

function Get-BicepSetting([string]$Name) {
    $m = [regex]::Match($module, "(?m)^\s*${Name}:\s*'?([^'\r\n]+?)'?\s*$")
    if (-not $m.Success) { throw "Could not find $Name in game-function-hosting.bicep." }
    return $m.Groups[1].Value
}

$expected = [ordered]@{
    minTlsVersion       = Get-BicepSetting 'minTlsVersion'
    scmMinTlsVersion    = Get-BicepSetting 'scmMinTlsVersion'
    ftpsState           = Get-BicepSetting 'ftpsState'
    vnetRouteAllEnabled = [bool]::Parse((Get-BicepSetting 'vnetRouteAllEnabled'))
}
$originsBlock = [regex]::Match($params, "(?s)param gameFunctionCorsOrigins = \[(.*?)\]").Groups[1].Value
$expectedOrigins = @([regex]::Matches($originsBlock, "'([^']+)'") | ForEach-Object { $_.Groups[1].Value } | Sort-Object)
if ($expectedOrigins.Count -eq 0) { throw 'No CORS origins found in main.prod.bicepparam.' }

$json = az functionapp config show -g $ResourceGroup -n $FunctionAppName --only-show-errors -o json
if ($LASTEXITCODE -ne 0) { throw 'Could not read the game Function App site config.' }
$live = $json | ConvertFrom-Json

$problems = @()
foreach ($key in $expected.Keys) {
    if ($live.$key -ne $expected[$key]) { $problems += "$key is '$($live.$key)', Bicep says '$($expected[$key])'" }
}
$liveOrigins = @($live.cors.allowedOrigins | Sort-Object)
if (($liveOrigins -join '|') -ne ($expectedOrigins -join '|')) {
    $problems += "CORS origins differ. Live: $($liveOrigins -join ', '). Bicep: $($expectedOrigins -join ', ')"
}

if ($problems) { $problems | ForEach-Object { Write-Host "::error::$_" }; throw "Game Function site config drifted from the Bicep." }
Write-Host "Game Function site config matches the Bicep: TLS $($expected.minTlsVersion)/$($expected.scmMinTlsVersion), FTPS $($expected.ftpsState), route-all $($expected.vnetRouteAllEnabled), $($expectedOrigins.Count) CORS origins."
