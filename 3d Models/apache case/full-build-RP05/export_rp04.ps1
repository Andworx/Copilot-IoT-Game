param([string]$OpenScad = 'C:\Program Files\OpenSCAD\openscad.com')
$ErrorActionPreference = 'Stop'

$helper = Join-Path $PSScriptRoot '../../Save-ModelVersion.ps1'
& $helper -Tag before-export-RP04

$out = Join-Path $PSScriptRoot 'exports'
$rp02 = Join-Path $PSScriptRoot '../full-build-RP02/exports'
$rp03 = Join-Path $PSScriptRoot '../tray-routing-RP03/exports'
New-Item -ItemType Directory -Path $out -Force | Out-Null

# Assemble a complete revision without altering or re-exporting proven parts.
Get-ChildItem -LiteralPath $rp02 -File | ForEach-Object {
    if ($_.Name -notin @('safety_face.stl', 'safety_face.log',
                         'switch_face.stl', 'switch_face.log',
                         'activity_face.stl', 'activity_face.log',
                         'tray_L.stl', 'tray_L.log', 'validation.json')) {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $out $_.Name) -Force
    }
}
Copy-Item -LiteralPath (Join-Path $rp03 'tray_L_RP03.stl') `
    -Destination (Join-Path $out 'tray_L.stl') -Force
Copy-Item -LiteralPath (Join-Path $rp03 'tray_L_RP03.log') `
    -Destination (Join-Path $out 'tray_L.log') -Force

$src = Join-Path $PSScriptRoot 'faceplates_rp04.scad'
$parts = @('safety_face', 'switch_face', 'activity_face')
$done = $parts | ForEach-Object -Parallel {
    $ErrorActionPreference = 'Stop'
    $part = $_
    $out = $using:out
    $src = $using:src
    $scad = $using:OpenScad
    $temp = Join-Path 'C:\tmp' ('rp04-' + [guid]::NewGuid().ToString('N') + '.stl')
    $log = & $scad -D ('part="' + $part + '"') -o $temp $src 2>&1
    if ($LASTEXITCODE -ne 0 -or ($log -match 'WARNING:|ERROR:') -or
        -not ($log -match 'Simple:\s+yes')) {
        throw "Failed $part : $log"
    }
    Copy-Item -LiteralPath $temp -Destination (Join-Path $out ($part + '.stl')) -Force
    $log | Set-Content (Join-Path $out ($part + '.log'))
    Remove-Item -LiteralPath $temp
    Write-Host "Exported $part"
    $part
} -ThrottleLimit 2
if (@($done).Count -ne $parts.Count) { throw 'Incomplete RP04 faceplate export' }

& $OpenScad --imgsize=1400,700 --viewall --autocenter --projection=o `
    --camera='0,0,0,0,0,0,220' -o (Join-Path $out 'rp04_faceplates.png') $src
if ($LASTEXITCODE -ne 0) { throw 'RP04 faceplate preview failed' }

& python (Join-Path $PSScriptRoot 'validate_rp04.py')
if ($LASTEXITCODE -ne 0) { throw 'RP04 validation failed' }

& $helper -Tag after-export-RP04

