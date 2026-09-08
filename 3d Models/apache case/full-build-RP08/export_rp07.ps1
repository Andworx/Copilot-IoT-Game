param([string]$OpenScad = 'C:\Program Files\OpenSCAD\openscad.com')
$ErrorActionPreference = 'Stop'

$helper = Join-Path $PSScriptRoot '../../Save-ModelVersion.ps1'
& $helper -Tag before-export-RP07

$out = Join-Path $PSScriptRoot 'exports'
$traySrc = Join-Path $PSScriptRoot 'tray_routing_rp07.scad'
$frontSrc = Join-Path $PSScriptRoot 'front_controls_rp07.scad'
New-Item -ItemType Directory -Path $out -Force | Out-Null

foreach ($part in @('tray_L', 'converter_bay_coupon')) {
    $temp = Join-Path 'C:\tmp' ('rp07-' + [guid]::NewGuid().ToString('N') + '.stl')
    $log = & $OpenScad -D ('part="' + $part + '"') -o $temp $traySrc 2>&1
    if ($LASTEXITCODE -ne 0 -or ($log -match 'WARNING:|ERROR:') -or
        -not ($log -match 'Simple:\s+yes')) {
        throw "Failed $part : $log"
    }
    Copy-Item -LiteralPath $temp -Destination (Join-Path $out ($part + '.stl')) -Force
    $log | Set-Content (Join-Path $out ($part + '.log'))
    Remove-Item -LiteralPath $temp
    Write-Host "Exported $part"
}

foreach ($part in @('screen_face', 'safety_face', 'switch_face',
                     'activity_face', 'panel_R')) {
    $temp = Join-Path 'C:\tmp' ('rp07-' + [guid]::NewGuid().ToString('N') + '.stl')
    $log = & $OpenScad -D ('part="' + $part + '"') -o $temp $frontSrc 2>&1
    if ($LASTEXITCODE -ne 0 -or ($log -match 'WARNING:|ERROR:') -or
        -not ($log -match 'Simple:\s+yes')) {
        throw "Failed $part : $log"
    }
    Copy-Item -LiteralPath $temp -Destination (Join-Path $out ($part + '.stl')) -Force
    $log | Set-Content (Join-Path $out ($part + '.log'))
    Remove-Item -LiteralPath $temp
    Write-Host "Exported $part"
}

& $OpenScad --imgsize=1400,1100 --viewall --autocenter --projection=o `
    --camera='0,0,10,0,0,0,340' -D 'part="assembly"' `
    -o (Join-Path $out 'rp07_tray_top.png') $traySrc
if ($LASTEXITCODE -ne 0) { throw 'RP07 top preview failed' }

& $OpenScad --imgsize=1400,1100 --viewall --autocenter --projection=o `
    --camera='0,0,-10,0,0,0,340' -D 'part="underside"' `
    -o (Join-Path $out 'rp07_tray_underside.png') $traySrc
if ($LASTEXITCODE -ne 0) { throw 'RP07 underside preview failed' }

& $OpenScad --imgsize=1400,900 --viewall --autocenter --projection=o `
    --camera='0,0,0,0,0,0,190' -D 'part="converter_bay_coupon"' `
    -o (Join-Path $out 'rp07_converter_bay_coupon.png') $traySrc
if ($LASTEXITCODE -ne 0) { throw 'RP07 coupon preview failed' }

& $OpenScad --imgsize=1600,1000 --viewall --autocenter --projection=o `
    --camera='0,0,25,0,0,0,430' -D 'part="layout"' `
    -o (Join-Path $out 'rp07_front_controls.png') $frontSrc
if ($LASTEXITCODE -ne 0) { throw 'RP07 front-control preview failed' }

& $OpenScad --imgsize=1400,1100 --viewall --autocenter --projection=o `
    --camera='0,0,25,0,0,0,340' -D 'part="panel_R"' `
    -o (Join-Path $out 'rp07_panel_R.png') $frontSrc
if ($LASTEXITCODE -ne 0) { throw 'RP07 right-panel preview failed' }

& python (Join-Path $PSScriptRoot 'validate_rp07.py')
if ($LASTEXITCODE -ne 0) { throw 'RP07 validation failed' }

& $helper -Tag after-export-RP07
