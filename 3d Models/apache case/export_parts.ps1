param(
    [string]$OpenScad = "C:\Program Files\OpenSCAD\openscad.com"
)

$ErrorActionPreference = "Stop"
$VersionHelper = Join-Path $PSScriptRoot '../Save-ModelVersion.ps1'
& $VersionHelper -Tag 'before-export_parts'
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Source = Join-Path $ProjectDir "apache_2800_chassis.scad"
$StlDir = Join-Path $ProjectDir "exports\stl"
$PreviewDir = Join-Path $ProjectDir "exports\preview"
$TempExportTag = "codex-apache-" + [guid]::NewGuid().ToString("N")
$GeneratedTempFiles = @()

New-Item -ItemType Directory -Force -Path $StlDir | Out-Null
New-Item -ItemType Directory -Force -Path $PreviewDir | Out-Null

# Remove generated artifacts from the retired moving-panel architecture so the
# export directory contains only parts that belong to the current assembly.
$RetiredGeneratedParts = @(
    "bezel_joiner.stl",
    "front_bezel_left.stl",
    "front_bezel_right.stl",
    "hinge_insert_coupon.stl",
    "panel_joiner.stl"
)
foreach ($RetiredPart in $RetiredGeneratedParts) {
    $RetiredPath = Join-Path $StlDir $RetiredPart
    if (Test-Path -LiteralPath $RetiredPath) {
        Remove-Item -LiteralPath $RetiredPath -Force
    }
}

$PrintableParts = @(
    "chassis_front_left",
    "chassis_front_right",
    "chassis_rear_left",
    "chassis_rear_right",
    "panel_left",
    "panel_right",
    "screen_module_provisional",
    "rotary_module_provisional",
    "switch_module_provisional",
    "utility_module_provisional",
    "chassis_joiner_x",
    "chassis_joiner_y",
    "fit_test_front_left",
    "fit_test_front_right",
    "fit_test_rear_left",
    "fit_test_rear_right",
    "upper_fit_front_left",
    "upper_fit_front_right",
    "upper_fit_rear_left",
    "upper_fit_rear_right",
    "fit_test_pin_joiner_x",
    "fit_test_pin_joiner_y"
)

try {
    foreach ($Part in $PrintableParts) {
        $Define = 'part="' + $Part + '"'
        $TempFile = Join-Path "C:\tmp" "$TempExportTag-$Part.stl"
        $GeneratedTempFiles += $TempFile
        & $OpenScad -D $Define -o $TempFile $Source
        if ($LASTEXITCODE -ne 0) { throw "OpenSCAD failed while exporting $Part" }
        Copy-Item -LiteralPath $TempFile -Destination (Join-Path $StlDir "$Part.stl") -Force
    }

$Views = @{
    "assembly_closed"   = "56,0,28,58,0,25,540"
    "assembly_exploded" = "55,0,62,62,0,25,620"
    "panel_layout"      = "0,112,72,0,0,0,430"
    "fit_test_frame"    = "55,0,12,58,0,25,530"
    "upper_fit_frame"   = "55,0,10,58,0,25,530"
}

    foreach ($View in $Views.Keys) {
        $Selector = if ($View -eq "fit_test_frame") { "fit_test_frame_complete" }
                    elseif ($View -eq "upper_fit_frame") { "upper_fit_frame_complete" }
                    else { $View }
        $Define = 'part="' + $Selector + '"'
        $TempFile = Join-Path "C:\tmp" "$TempExportTag-$View.png"
        $GeneratedTempFiles += $TempFile
        & $OpenScad --imgsize=1400,900 --viewall --autocenter --projection=p `
            --camera=$($Views[$View]) -D $Define -o $TempFile $Source
        if ($LASTEXITCODE -ne 0) { throw "OpenSCAD failed while rendering $View" }
        Copy-Item -LiteralPath $TempFile -Destination (Join-Path $PreviewDir "$View.png") -Force
    }
}
finally {
    foreach ($TempFile in $GeneratedTempFiles) {
        if (Test-Path -LiteralPath $TempFile) {
            Remove-Item -LiteralPath $TempFile -Force
        }
    }
}

& $VersionHelper -Tag 'after-export_parts'
Write-Host "Exports written to $($ProjectDir)\exports"
