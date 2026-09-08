param(
    [string]$OpenScad = "C:\Program Files\OpenSCAD\openscad.com"
)

$ErrorActionPreference = "Stop"
$VersionHelper = Join-Path $PSScriptRoot '../../Save-ModelVersion.ps1'
& $VersionHelper -Tag 'before-export_equipment_tray'
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Source = Join-Path $ProjectDir "equipment_tray.scad"
$StlDir = Join-Path $ProjectDir "exports\stl"
$PreviewDir = Join-Path $ProjectDir "exports\preview"
$TempTag = "codex-equipment-tray-" + [guid]::NewGuid().ToString("N")
$Generated = @()

New-Item -ItemType Directory -Force -Path $StlDir,$PreviewDir | Out-Null

$RetiredClip = Join-Path $StlDir "hold_down_clip.stl"
if (Test-Path -LiteralPath $RetiredClip) { Remove-Item -LiteralPath $RetiredClip -Force }

try {
    foreach ($Part in @("tray_left","tray_right","tray_cross_joiner","fit_coupon")) {
        $Temp = Join-Path "C:\tmp" "$TempTag-$Part.stl"
        $Generated += $Temp
        & $OpenScad -D ('part="' + $Part + '"') -o $Temp $Source
        if ($LASTEXITCODE -ne 0) { throw "OpenSCAD failed: $Part" }
        Copy-Item -LiteralPath $Temp -Destination (Join-Path $StlDir "$Part.stl") -Force
    }

    $TempPreview = Join-Path "C:\tmp" "$TempTag-assembly_preview.png"
    $Generated += $TempPreview
    & $OpenScad --imgsize=1600,1000 --viewall --autocenter --projection=p `
        --camera="45,0,58,60,0,28,560" -D 'part="assembly_preview"' `
        -o $TempPreview $Source
    if ($LASTEXITCODE -ne 0) { throw "OpenSCAD preview failed" }
    Copy-Item -LiteralPath $TempPreview `
        -Destination (Join-Path $PreviewDir "assembly_preview.png") -Force
}
finally {
    foreach ($Path in $Generated) {
        if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Force }
    }
}

& $VersionHelper -Tag 'after-export_equipment_tray'
Write-Host "Equipment-tray exports written to $ProjectDir\exports"
