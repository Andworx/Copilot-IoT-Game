param([string]$OpenScad = 'C:\Program Files\OpenSCAD\openscad.com')
$ErrorActionPreference = 'Stop'

$source = Join-Path $PSScriptRoot 'front_faces_rp09.scad'
$output = Join-Path $PSScriptRoot 'exports'
$snapshot = Join-Path $PSScriptRoot '../../../Save-ModelVersion.ps1'
$calibrationRoot = Join-Path $PSScriptRoot '../../calibration/m4-keystone/RP09'
$calibrationSource = Join-Path $calibrationRoot 'm4_keystone_fit_coupon_rp09.scad'
$calibrationOutput = Join-Path $calibrationRoot 'exports'
New-Item -ItemType Directory -Path $output -Force | Out-Null
New-Item -ItemType Directory -Path $calibrationOutput -Force | Out-Null

& $snapshot -Tag 'before-export-RP09-M4-keystone'

foreach ($part in @('activity_face_base', 'activity_face_text',
                     'activity_face_layer_swap')) {
    $temp = Join-Path 'C:\tmp' ('rp09-m4-' + [guid]::NewGuid().ToString('N') + '.stl')
    $log = & $OpenScad -D ('part="' + $part + '"') -o $temp $source 2>&1
    $isTextOnly = $part.EndsWith('_text')
    if ($LASTEXITCODE -ne 0 -or ($log -match 'WARNING:|ERROR:') -or
        (-not $isTextOnly -and -not ($log -match 'Simple:\s+yes')) -or
        -not (Test-Path -LiteralPath $temp)) {
        throw "Failed $part : $log"
    }
    Copy-Item -LiteralPath $temp -Destination (Join-Path $output ($part + '.stl')) -Force
    $log | Set-Content (Join-Path $output ($part + '.log'))
    Remove-Item -LiteralPath $temp
    Write-Host "Exported $part"
}

$couponTemp = Join-Path 'C:\tmp' ('rp09-m4-coupon-' + [guid]::NewGuid().ToString('N') + '.stl')
$couponLog = & $OpenScad -D 'part="coupon"' -o $couponTemp $calibrationSource 2>&1
if ($LASTEXITCODE -ne 0 -or ($couponLog -match 'WARNING:|ERROR:') -or
    -not ($couponLog -match 'Simple:\s+yes') -or
    -not (Test-Path -LiteralPath $couponTemp)) {
    throw "Failed M4 keystone coupon : $couponLog"
}
Copy-Item -LiteralPath $couponTemp -Destination `
    (Join-Path $calibrationOutput 'm4_keystone_fit_coupon.stl') -Force
$couponLog | Set-Content (Join-Path $calibrationOutput 'm4_keystone_fit_coupon.log')
Remove-Item -LiteralPath $couponTemp

& $OpenScad --imgsize=1000,800 --viewall --autocenter --projection=o `
    --camera='0,0,15,0,0,0,120' -D 'part="activity_face_preview"' `
    -o (Join-Path $output 'rp09_m4_keystone.png') $source
if ($LASTEXITCODE -ne 0) { throw 'RP09 M4 preview failed' }

& $OpenScad --imgsize=1200,500 --viewall --autocenter --projection=o `
    --camera='0,0,10,0,0,0,120' -D 'part="coupon"' `
    -o (Join-Path $calibrationOutput 'm4_keystone_fit_coupon.png') $calibrationSource
if ($LASTEXITCODE -ne 0) { throw 'RP09 M4 coupon preview failed' }

& 'C:\Users\edrft\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
    (Join-Path $PSScriptRoot 'validate_m4_keystone.py')
if ($LASTEXITCODE -ne 0) { throw 'RP09 M4 keystone validation failed' }

& $snapshot -Tag 'after-validated-RP09-M4-keystone'
