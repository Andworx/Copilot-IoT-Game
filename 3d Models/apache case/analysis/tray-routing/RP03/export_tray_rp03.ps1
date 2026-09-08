param([string]$OpenScad = 'C:\Program Files\OpenSCAD\openscad.com')
$ErrorActionPreference = 'Stop'

$VersionHelper = Join-Path $PSScriptRoot '../../../../Save-ModelVersion.ps1'
& $VersionHelper -Tag before-export-RP03-tray-routing

$out = Join-Path $PSScriptRoot 'exports'
New-Item -ItemType Directory -Path $out -Force | Out-Null
$src = Join-Path $PSScriptRoot 'tray_routing_rp03.scad'
$temp = Join-Path 'C:\tmp' ('rp03-tray-' + [guid]::NewGuid().ToString('N') + '.stl')

$log = & $OpenScad -D 'part="tray_L_RP03"' -o $temp $src 2>&1
$log | ForEach-Object { Write-Host "$_" }
if ($LASTEXITCODE -ne 0 -or ($log -match 'WARNING:|ERROR:') -or -not ($log -match 'Simple:\s+yes')) {
    throw 'Invalid tray_L_RP03 export'
}

Copy-Item -LiteralPath $temp -Destination (Join-Path $out 'tray_L_RP03.stl') -Force
$log | Set-Content (Join-Path $out 'tray_L_RP03.log')
Remove-Item -LiteralPath $temp

& $OpenScad --imgsize=1400,1000 --viewall --autocenter --projection=p `
    --camera='0,0,12,0,0,0,430' -o (Join-Path $out 'tray_L_RP03.png') $src
if ($LASTEXITCODE -ne 0) { throw 'Preview failed' }

& python (Join-Path $PSScriptRoot 'validate_tray_rp03.py')
if ($LASTEXITCODE -ne 0) { throw 'Mesh validation failed' }

& $VersionHelper -Tag after-export-RP03-tray-routing
