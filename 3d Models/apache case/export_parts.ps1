param(
    [string]$OpenScad = "C:\Program Files\OpenSCAD\openscad.com"
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Source = Join-Path $ProjectDir "apache_3800_chassis.scad"
$StlDir = Join-Path $ProjectDir "exports\stl"
$PreviewDir = Join-Path $ProjectDir "exports\preview"
$TempExportTag = "codex-apache-" + [guid]::NewGuid().ToString("N")
$GeneratedTempFiles = @()

New-Item -ItemType Directory -Force -Path $StlDir | Out-Null
New-Item -ItemType Directory -Force -Path $PreviewDir | Out-Null

$PrintableParts = @(
    "chassis_front_left",
    "chassis_front_right",
    "chassis_rear_left",
    "chassis_rear_right",
    "panel_left",
    "panel_right",
    "front_bezel_left",
    "front_bezel_right",
    "chassis_joiner_x",
    "chassis_joiner_y",
    "panel_joiner",
    "bezel_joiner",
    "fit_test_front_left",
    "fit_test_front_right",
    "fit_test_rear_left",
    "fit_test_rear_right",
    "fit_test_pin_joiner_x",
    "fit_test_pin_joiner_y",
    "hinge_insert_coupon"
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
    "assembly_open_30"  = "56,0,45,62,0,26,560"
    "assembly_exploded" = "55,0,62,62,0,25,620"
    "fit_test_frame"    = "55,0,12,58,0,25,530"
}

    foreach ($View in $Views.Keys) {
        $Selector = if ($View -eq "assembly_open_30") { "assembly_open" }
                    elseif ($View -eq "fit_test_frame") { "fit_test_frame_complete" }
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

Write-Host "Exports written to $($ProjectDir)\exports"
