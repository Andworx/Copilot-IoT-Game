#Requires -Version 7.0
<#
.SYNOPSIS
    Captures (-Mode Export) or verifies (-Mode Check) the Tier 3 reference snapshots.

.DESCRIPTION
    infra/reference/manifest.json lists resources this repo deliberately does not deploy
    (IoT Hub, DPS, Function Apps, plans, storage, App Insights) and the stable, non-secret
    properties to record for each. Export writes infra/reference/snapshots/<name>.json from
    the live resource. Check re-reads the live resource and fails (exit 1) if it differs
    from the committed snapshot, which is how an out-of-band change to the IoT Hub is
    noticed. Check only reads, so a Reader role is enough.

    Requires PowerShell 7 (pwsh): Windows PowerShell 5.1 formats JSON differently and would
    report every resource as drifted.

    Snapshots contain no keys or connection strings: only the JMESPath projections in the
    manifest, plus a scan that aborts if anything secret-looking slips in.

.PARAMETER Mode
    Export | Check

.EXAMPLE
    .\Invoke-ReferenceSnapshot.ps1 -Mode Check
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Export', 'Check')]
    [string]$Mode
)

$ErrorActionPreference = 'Stop'

$referenceDir = Join-Path $PSScriptRoot '..\reference' | Resolve-Path
$snapshotDir = Join-Path $referenceDir 'snapshots'
$manifest = Get-Content (Join-Path $referenceDir 'manifest.json') -Raw | ConvertFrom-Json
$resourceGroup = $manifest.resourceGroup

# Guard: fail if a snapshot contains an actual secret. Two shapes: a secret-bearing key with
# a non-empty value, or a secret-looking value (connection strings, keys, SAS tokens). Names of
# settings that merely mention "connection string" (Flex records one) are fine.
$secretKeyPattern = '(?i)"(connectionString|primaryKey|secondaryKey|accessKey|sharedAccessKey|sasToken|password|clientSecret)"\s*:\s*"[^"]+"'
$secretValuePattern = '(?i)(AccountKey=|SharedAccessKey=|SharedAccessSignature=|Endpoint=sb://|;Password=|sig=[A-Za-z0-9%+/=]{20,})'

function Sort-Keys($value) {
    # Stable key order so text comparison is meaningful.
    if ($value -is [System.Management.Automation.PSCustomObject]) {
        $ordered = [ordered]@{}
        foreach ($name in ($value.PSObject.Properties.Name | Sort-Object)) {
            $ordered[$name] = Sort-Keys $value.$name
        }
        return $ordered
    }
    if ($value -is [System.Collections.IEnumerable] -and $value -isnot [string]) {
        return , @($value | ForEach-Object { Sort-Keys $_ })
    }
    return $value
}

function Get-LiveSnapshot($entry) {
    $json = az resource show -g $resourceGroup -n $entry.resource --resource-type $entry.type `
        --query $entry.query -o json --only-show-errors
    if ($LASTEXITCODE -ne 0) { throw "az resource show failed for $($entry.name)" }
    if (($json -match $secretKeyPattern) -or ($json -match $secretValuePattern)) { throw "Snapshot for $($entry.name) contains a secret-looking property; fix its query in manifest.json" }
    return (Sort-Keys ($json | ConvertFrom-Json) | ConvertTo-Json -Depth 20)
}

$drift = @()
foreach ($entry in $manifest.resources) {
    $path = Join-Path $snapshotDir "$($entry.name).json"
    $live = (Get-LiveSnapshot $entry) -replace "`r`n", "`n"

    if ($Mode -eq 'Export') {
        New-Item -ItemType Directory -Force $snapshotDir | Out-Null
        [System.IO.File]::WriteAllText($path, $live + "`n", [System.Text.UTF8Encoding]::new($false))
        Write-Host "exported $($entry.name)"
        continue
    }

    if (-not (Test-Path $path)) { $drift += "$($entry.name): no committed snapshot (run -Mode Export)"; continue }
    $committed = ([System.IO.File]::ReadAllText($path) -replace "`r`n", "`n").TrimEnd()
    if ($committed -ne $live.TrimEnd()) {
        $drift += $entry.name
        Write-Host "DRIFT in $($entry.name) ($($entry.type)/$($entry.resource))" -ForegroundColor Red
        $tmp = New-TemporaryFile
        Set-Content $tmp $live
        git --no-pager diff --no-index --no-color -- $path $tmp | Select-Object -Skip 4
        Remove-Item $tmp
    } else {
        Write-Host "ok    $($entry.name)"
    }
}

if ($Mode -eq 'Check' -and $drift.Count -gt 0) {
    Write-Host "`nDrift found: $($drift -join ', '). If intended, re-run with -Mode Export and commit the snapshots." -ForegroundColor Red
    exit 1
}
