param(
    [string]$OpenScad = "C:\Program Files\OpenSCAD\openscad.com"
)

$ErrorActionPreference = "Stop"
$VersionHelper = Join-Path $PSScriptRoot '../../Save-ModelVersion.ps1'
& $VersionHelper -Tag 'before-export_front_correction'
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Source = Join-Path $ProjectDir "final_fit_frame.scad"
$ExportDir = Join-Path $ProjectDir "exports"
$TempTag = "codex-front-correction-" + [guid]::NewGuid().ToString("N")

New-Item -ItemType Directory -Force -Path $ExportDir | Out-Null

foreach ($Part in @("front_left", "front_right")) {
    $Define = 'part="' + $Part + '"'
    $TempFile = Join-Path "C:\tmp" "$TempTag-$Part.stl"
    & $OpenScad -D $Define -o $TempFile $Source
    if ($LASTEXITCODE -ne 0) { throw "OpenSCAD failed: $Part" }
    Copy-Item -LiteralPath $TempFile -Destination (Join-Path $ExportDir "$Part.stl") -Force
}

$PreviewTemp = Join-Path "C:\tmp" "$TempTag-preview.png"
& $OpenScad --imgsize=1400,900 --viewall --autocenter --projection=p `
    --camera=55,0,20,60,0,25,500 -D 'part="assembly"' `
    -o $PreviewTemp $Source
if ($LASTEXITCODE -ne 0) { throw "OpenSCAD failed: preview" }
Copy-Item -LiteralPath $PreviewTemp -Destination (Join-Path $ExportDir "final_fit_preview.png") -Force

& $VersionHelper -Tag 'after-export_front_correction'
Write-Host "Corrected front quadrants and preview written to $ExportDir"
