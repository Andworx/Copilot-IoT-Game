param([string]$OpenScad = 'C:\Program Files\OpenSCAD\openscad.com')
$ErrorActionPreference = 'Stop'

$helper = Join-Path $PSScriptRoot '../../Save-ModelVersion.ps1'
& $helper -Tag before-export-RP05-shell-pocket-coupons

$out = Join-Path $PSScriptRoot 'exports\panel-shell-coupons'
New-Item -ItemType Directory -Path $out -Force | Out-Null
$src = Join-Path $PSScriptRoot 'shell_pocket_coupons.scad'
$parts = @('coupon_front', 'coupon_rear', 'coupon_corner')

$done = $parts | ForEach-Object -Parallel {
    $ErrorActionPreference = 'Stop'
    $part = $_
    $out = $using:out
    $src = $using:src
    $scad = $using:OpenScad
    $temp = Join-Path 'C:\tmp' ('rp05-coupon-' + [guid]::NewGuid().ToString('N') + '.stl')
    $log = & $scad -D ('part="' + $part + '"') -o $temp $src 2>&1
    if ($LASTEXITCODE -ne 0 -or ($log -match 'WARNING:|ERROR:') -or
        -not ($log -match 'Simple:\s+yes')) {
        throw "Invalid RP05 coupon $part : $log"
    }
    Copy-Item -LiteralPath $temp -Destination (Join-Path $out ($part + '.stl')) -Force
    $log | Set-Content (Join-Path $out ($part + '.log'))
    Remove-Item -LiteralPath $temp
    Write-Host "Exported $part"
    $part
} -ThrottleLimit 2

if (@($done).Count -ne $parts.Count) { throw 'Incomplete RP05 coupon export' }

& $OpenScad --imgsize=1400,650 --projection=o `
    --camera='63,12,0,0,0,0,150' -o (Join-Path $out 'coupon_layout.png') $src
if ($LASTEXITCODE -ne 0) { throw 'Coupon preview failed' }

& python (Join-Path $PSScriptRoot 'validate_shell_pocket_coupons.py')
if ($LASTEXITCODE -ne 0) { throw 'Coupon validation failed' }

& $helper -Tag after-export-RP05-shell-pocket-coupons
