$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$models = Resolve-Path (Join-Path $root '..\..\..\..')
$openscad = 'C:\Program Files\OpenSCAD\openscad.com'
$python = 'C:\Users\edrft\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$source = Join-Path $root 'lid_storage_calibration_rp09.scad'
$exports = Join-Path $root 'exports'
$tempRoot = 'C:\tmp\apache-2800-lid-storage-RP09'

& (Join-Path $models 'Save-ModelVersion.ps1') -Tag 'before-export-RP09-lid-storage-calibration'
New-Item -ItemType Directory -Path $exports -Force | Out-Null
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

# RP09 deep carrier integrates these compartments directly.  Remove obsolete
# separate-insert exports so the printable set cannot be confused with the
# current assembly.
foreach ($legacy in @('lid_storage_cable_insert.stl',
                       'lid_storage_accessory_key_insert.stl')) {
    $legacyPath = Join-Path $exports $legacy
    if (Test-Path -LiteralPath $legacyPath) {
        Remove-Item -LiteralPath $legacyPath -Force
    }
}

$parts = @{
    'frame_left' = 'lid_fit_frame_L.stl'
    'frame_right' = 'lid_fit_frame_R.stl'
    'locator_tile' = 'switch_locator_tile.stl'
    'branding_base' = 'andworx_field_kit_base.stl'
    'branding_insert' = 'andworx_field_kit_logo.stl'
    'storage_carrier_right' = 'lid_storage_carrier_R.stl'
    'storage_frame_left' = 'lid_storage_frame_L.stl'
    'storage_cover_base' = 'lid_storage_cover_base.stl'
    'storage_cover_blank' = 'lid_storage_cover_blank.stl'
    'storage_cover_logo' = 'lid_storage_cover_logo.stl'
    'left_design_plate_blank' = 'lid_storage_left_design_plate_blank.stl'
}

foreach ($entry in $parts.GetEnumerator()) {
    $tempStl = Join-Path $tempRoot $entry.Value
    $log = Join-Path $exports ($entry.Key + '.log')
    & $openscad -D ('part="' + $entry.Key + '"') -o $tempStl $source 2>&1 |
        Tee-Object -FilePath $log
    if ($LASTEXITCODE -ne 0) { throw "OpenSCAD failed for $($entry.Key)" }
    $logText = Get-Content -LiteralPath $log -Raw
    if ($logText -match 'WARNING|ERROR' -or $logText -notmatch 'Simple:\s+yes') {
        throw "OpenSCAD manifold check failed for $($entry.Key)"
    }
    Copy-Item -LiteralPath $tempStl -Destination (Join-Path $exports $entry.Value) -Force
    Write-Host "Exported $($entry.Key)"
}

$preview = Join-Path $exports 'lid_storage_concept.png'
& $openscad --imgsize=1800,1300 --viewall --autocenter --projection=p `
    --camera='0,-310,340,58,0,0,550' -D 'part="layout"' -o $preview $source
if ($LASTEXITCODE -ne 0) { throw 'Lid-storage preview render failed' }

$assemblyPreview = Join-Path $exports 'lid_storage_printable_assembly.png'
& $openscad --imgsize=1800,1300 --viewall --autocenter --projection=p `
    --camera='0,-330,320,58,0,0,560' -D 'part="storage_assembly_preview"' `
    -o $assemblyPreview $source
if ($LASTEXITCODE -ne 0) { throw 'Lid-storage assembly preview render failed' }

& $python (Join-Path $root 'validate_lid_storage_calibration.py')
if ($LASTEXITCODE -ne 0) { throw 'Lid-storage calibration validation failed' }

& (Join-Path $models 'Save-ModelVersion.ps1') -Tag 'after-validated-RP09-lid-storage-calibration'
