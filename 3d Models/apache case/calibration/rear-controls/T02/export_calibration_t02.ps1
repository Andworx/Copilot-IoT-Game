$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$models = Resolve-Path (Join-Path $root '..\..\..\..')
$openscad = 'C:\Program Files\OpenSCAD\openscad.com'
$python = 'C:\Users\edrft\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$source = Join-Path $root 'rear_control_calibration_t02.scad'
$exports = Join-Path $root 'exports'
$tempRoot = 'C:\tmp\rear-control-calibration-T02'

& (Join-Path $models 'Save-ModelVersion.ps1') -Tag 'before-export-rear-control-calibration-T02'
New-Item -ItemType Directory -Path $exports -Force | Out-Null
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

$parts = @{
    'switch_coupon' = 'switch_coupon.stl'
    'dial_shoulder_coupon' = 'dial_shoulder_coupon.stl'
}
foreach ($entry in $parts.GetEnumerator()) {
    $tempStl = Join-Path $tempRoot $entry.Value
    $log = Join-Path $exports ($entry.Key + '.log')
    & $openscad -D ('part="' + $entry.Key + '"') -o $tempStl $source 2>&1 | Tee-Object -FilePath $log
    if ($LASTEXITCODE -ne 0) { throw "OpenSCAD failed for $($entry.Key)" }
    $logText = Get-Content -LiteralPath $log -Raw
    if ($logText -match 'WARNING|ERROR' -or $logText -notmatch 'Simple:\s+yes') {
        throw "OpenSCAD validation log failed for $($entry.Key)"
    }
    Copy-Item -LiteralPath $tempStl -Destination (Join-Path $exports $entry.Value) -Force
    Write-Host "Exported $($entry.Key)"
}

$preview = Join-Path $exports 'calibration_t02.png'
& $openscad --imgsize=1600,1000 --viewall --autocenter --projection=p `
    --camera='0,0,145,0,0,0,520' -D 'part="layout"' -o $preview $source
if ($LASTEXITCODE -ne 0) { throw 'T02 preview render failed' }

& $python (Join-Path $root 'validate_calibration_t02.py')
if ($LASTEXITCODE -ne 0) { throw 'T02 validation failed' }

& (Join-Path $models 'Save-ModelVersion.ps1') -Tag 'after-export-rear-control-calibration-T02'
