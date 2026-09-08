param([string]$OpenScad = 'C:\Program Files\OpenSCAD\openscad.com')
$ErrorActionPreference = 'Stop'

$helper = Join-Path $PSScriptRoot '../../../../Save-ModelVersion.ps1'
& $helper -Tag before-export-rear-control-calibration-T01

$out = Join-Path $PSScriptRoot 'exports'
$src = Join-Path $PSScriptRoot 'rear_control_calibration_t01.scad'
New-Item -ItemType Directory -Path $out -Force | Out-Null

foreach ($part in @('switch_coupon', 'dial_coupon')) {
    $temp = Join-Path 'C:\tmp' ('rear-control-t01-' + [guid]::NewGuid().ToString('N') + '.stl')
    $log = & $OpenScad -D ('part="' + $part + '"') -o $temp $src 2>&1
    if ($LASTEXITCODE -ne 0 -or ($log -match 'WARNING:|ERROR:') -or
        -not ($log -match 'Simple:\s+yes')) {
        throw "Failed $part : $log"
    }
    Copy-Item -LiteralPath $temp -Destination (Join-Path $out ($part + '.stl')) -Force
    $log | Set-Content (Join-Path $out ($part + '.log'))
    Remove-Item -LiteralPath $temp
    Write-Host "Exported $part"
}

& $OpenScad --imgsize=1500,1000 --viewall --autocenter --projection=o `
    --camera='0,0,0,0,0,0,220' -o (Join-Path $out 'calibration_t01.png') $src
if ($LASTEXITCODE -ne 0) { throw 'T01 preview failed' }

& python (Join-Path $PSScriptRoot 'validate_calibration_t01.py')
if ($LASTEXITCODE -ne 0) { throw 'T01 validation failed' }

& $helper -Tag after-export-rear-control-calibration-T01
