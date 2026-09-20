param([string]$OpenScad = 'C:\Program Files\OpenSCAD\openscad.com')
$ErrorActionPreference = 'Stop'

$source = Join-Path $PSScriptRoot 'front_faces_rp09.scad'
$chassisSource = Join-Path $PSScriptRoot '../../apache_2800_chassis.scad'
$output = Join-Path $PSScriptRoot 'exports'
$snapshot = Join-Path $PSScriptRoot '../../../Save-ModelVersion.ps1'
$calibration = Join-Path $PSScriptRoot '../../calibration/face-text/RP09/exports'
New-Item -ItemType Directory -Path $output -Force | Out-Null
New-Item -ItemType Directory -Path $calibration -Force | Out-Null
& $snapshot -Tag 'before-export-RP09-screen-seat'
foreach ($name in @('text_coupon_base.stl', 'text_coupon_text.stl',
                     'text_coupon_layer_swap.stl')) {
    $stale = Join-Path $output $name
    if (Test-Path -LiteralPath $stale) { Remove-Item -LiteralPath $stale }
}

foreach ($panel in @(
    @{ Part = 'panel_left'; File = 'panel_L.stl' },
    @{ Part = 'panel_right'; File = 'panel_R.stl' }
)) {
    $temp = Join-Path 'C:\tmp' ('rp09-' + [guid]::NewGuid().ToString('N') + '.stl')
    $log = & $OpenScad -D ('part="' + $panel.Part + '"') -o $temp $chassisSource 2>&1
    if ($LASTEXITCODE -ne 0 -or ($log -match 'WARNING:|ERROR:') -or
        -not ($log -match 'Simple:\s+yes') -or -not (Test-Path -LiteralPath $temp)) {
        throw "Failed $($panel.Part) : $log"
    }
    Copy-Item -LiteralPath $temp -Destination (Join-Path $output $panel.File) -Force
    $log | Set-Content (Join-Path $output ($panel.Part + '.log'))
    Remove-Item -LiteralPath $temp
    Write-Host "Exported $($panel.File)"
}

$parts = @(
    'screen_face_base', 'screen_face_text', 'screen_face_layer_swap',
    'safety_face_base', 'safety_face_text', 'safety_face_layer_swap',
    'switch_face_base', 'switch_face_text', 'switch_face_layer_swap',
    'activity_face_base', 'activity_face_text', 'activity_face_layer_swap'
)

foreach ($part in $parts) {
    $temp = Join-Path 'C:\tmp' ('rp09-' + [guid]::NewGuid().ToString('N') + '.stl')
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

foreach ($part in @('text_coupon_base', 'text_coupon_text',
                     'text_coupon_layer_swap')) {
    $temp = Join-Path 'C:\tmp' ('rp09-' + [guid]::NewGuid().ToString('N') + '.stl')
    $log = & $OpenScad -D ('part="' + $part + '"') -o $temp $source 2>&1
    $isTextOnly = $part.EndsWith('_text')
    if ($LASTEXITCODE -ne 0 -or ($log -match 'WARNING:|ERROR:') -or
        (-not $isTextOnly -and -not ($log -match 'Simple:\s+yes')) -or
        -not (Test-Path -LiteralPath $temp)) {
        throw "Failed $part : $log"
    }
    Copy-Item -LiteralPath $temp -Destination (Join-Path $calibration ($part + '.stl')) -Force
    $log | Set-Content (Join-Path $calibration ($part + '.log'))
    Remove-Item -LiteralPath $temp
    Write-Host "Exported calibration/$part"
}

& $OpenScad --imgsize=1800,1100 --viewall --autocenter --projection=o `
    --camera='0,0,20,0,0,0,430' -D 'part="layout"' `
    -o (Join-Path $output 'rp09_multicolor_faces.png') $source
if ($LASTEXITCODE -ne 0) { throw 'RP09 preview failed' }

& $OpenScad --imgsize=1600,1100 --viewall --autocenter --projection=o `
    --camera='0,0,20,0,0,0,300' -D 'part="screen_alignment_preview"' `
    -o (Join-Path $output 'rp09_screen_cover_alignment.png') $source
if ($LASTEXITCODE -ne 0) { throw 'RP09 screen-cover preview failed' }

& $OpenScad --imgsize=1400,500 --viewall --autocenter --projection=o `
    --camera='0,0,10,0,0,0,150' -D 'part="text_coupon_preview"' `
    -o (Join-Path $calibration 'rp09_text_coupon.png') $source
if ($LASTEXITCODE -ne 0) { throw 'RP09 text coupon preview failed' }

& 'C:\Users\edrft\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
    (Join-Path $PSScriptRoot 'validate_rp09.py')
if ($LASTEXITCODE -ne 0) { throw 'RP09 validation failed' }
& $snapshot -Tag 'after-validated-RP09-screen-seat'
