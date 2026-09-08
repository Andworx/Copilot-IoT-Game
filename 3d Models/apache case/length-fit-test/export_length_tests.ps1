param(
    [string]$OpenScad = "C:\Program Files\OpenSCAD\openscad.com"
)

$ErrorActionPreference = "Stop"
$VersionHelper = Join-Path $PSScriptRoot '../../Save-ModelVersion.ps1'
& $VersionHelper -Tag 'before-export_length_tests'
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Source = Join-Path $ProjectDir "length_fit_gauge.scad"
$ExportDir = Join-Path $ProjectDir "exports"
$Depths = @(232.95, 230.95, 228.95)

New-Item -ItemType Directory -Force -Path $ExportDir | Out-Null

foreach ($Depth in $Depths) {
    $Tag = $Depth.ToString("0.00", [Globalization.CultureInfo]::InvariantCulture).Replace(".", "_")
    $TargetDir = Join-Path $ExportDir "depth_$Tag"
    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

    foreach ($Part in @("front", "rear")) {
        $TempFile = Join-Path "C:\tmp" "codex-length-$Tag-$Part.stl"
        $PartDefine = 'part="' + $Part + '"'
        & $OpenScad -D $PartDefine -D "test_depth=$Depth" -o $TempFile $Source
        if ($LASTEXITCODE -ne 0) { throw "OpenSCAD failed: $Tag $Part" }
        Copy-Item -LiteralPath $TempFile -Destination (Join-Path $TargetDir "$Part.stl") -Force
    }
}

$JoinerTemp = "C:\tmp\codex-length-pin-joiner.stl"
& $OpenScad -D 'part="pin_joiner"' -o $JoinerTemp $Source
if ($LASTEXITCODE -ne 0) { throw "OpenSCAD failed: pin_joiner" }
Copy-Item -LiteralPath $JoinerTemp -Destination (Join-Path $ExportDir "pin_joiner.stl") -Force

$PreviewTemp = "C:\tmp\codex-length-preview.png"
& $OpenScad --imgsize=1400,700 --viewall --autocenter --projection=p `
    --camera=-120,115,60,58,0,25,420 -D 'part="assembled"' `
    -D 'test_depth=230.95' -o $PreviewTemp $Source
if ($LASTEXITCODE -ne 0) { throw "OpenSCAD failed: preview" }
Copy-Item -LiteralPath $PreviewTemp -Destination (Join-Path $ExportDir "depth_230_95_preview.png") -Force

& $VersionHelper -Tag 'after-export_length_tests'
Write-Host "Standalone length gauges written to $ExportDir"

