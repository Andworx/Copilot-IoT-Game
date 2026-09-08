param([string]$OpenScad = 'C:\Program Files\OpenSCAD\openscad.com')
$ErrorActionPreference = 'Stop'

$helper = Join-Path $PSScriptRoot '../../Save-ModelVersion.ps1'
& $helper -Tag before-export-RP06

$out = Join-Path $PSScriptRoot 'exports'
$src = Join-Path $PSScriptRoot 'rp06_updates.scad'
New-Item -ItemType Directory -Path $out -Force | Out-Null

$parts = @('shell_FL', 'shell_FR', 'rear_L', 'rear_R',
           'safety_face', 'led_clip_coupon')
foreach ($part in $parts) {
    $temp = Join-Path 'C:\tmp' ('rp06-' + [guid]::NewGuid().ToString('N') + '.stl')
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

& $OpenScad --imgsize=1600,1000 --viewall --autocenter --projection=o `
    --camera='0,0,42,0,0,0,520' -D 'part="shell_layout"' `
    -o (Join-Path $out 'rp06_shell_pockets.png') $src
if ($LASTEXITCODE -ne 0) { throw 'RP06 shell preview failed' }

& $OpenScad --imgsize=1400,900 --viewall --autocenter --projection=o `
    --camera='0,0,0,0,0,0,130' -D 'part="layout"' `
    -o (Join-Path $out 'rp06_safety_face.png') $src
if ($LASTEXITCODE -ne 0) { throw 'RP06 safety preview failed' }

& $OpenScad --imgsize=1400,900 --viewall --autocenter --projection=o `
    --camera='0,0,0,65,0,180,130' -D 'part="safety_face"' `
    -o (Join-Path $out 'rp06_safety_face_rear.png') $src
if ($LASTEXITCODE -ne 0) { throw 'RP06 rear safety preview failed' }

& python (Join-Path $PSScriptRoot 'validate_rp06.py')
if ($LASTEXITCODE -ne 0) { throw 'RP06 validation failed' }

& $helper -Tag after-export-RP06
