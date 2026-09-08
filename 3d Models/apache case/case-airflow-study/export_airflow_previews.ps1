param(
    [string]$OpenScad = "C:\Program Files\OpenSCAD\openscad.com"
)

$ErrorActionPreference = "Stop"
$VersionHelper = Join-Path $PSScriptRoot '../../Save-ModelVersion.ps1'
& $VersionHelper -Tag 'before-export_airflow_previews'
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Source = Join-Path $ProjectDir "apache_2800_airflow_study.scad"
$ExportDir = Join-Path $ProjectDir "exports"
$TempTag = "codex-airflow-" + [guid]::NewGuid().ToString("N")

New-Item -ItemType Directory -Force -Path $ExportDir | Out-Null

$Views = @{
    "assembly_open"   = "58,0,54,62,0,25,700"
    "assembly_closed" = "58,0,54,62,0,25,720"
    "airflow_section" = "52,0,74,68,0,28,620"
    "electronics_layout" = "0,0,42,0,0,0,520"
    "port_layout"     = "72,0,42,66,0,24,690"
    "rear_port_layout"= "72,0,42,66,0,204,690"
}

foreach ($View in $Views.Keys) {
    $Define = 'part="' + $View + '"'
    $TempFile = Join-Path "C:\tmp" "$TempTag-$View.png"
    & $OpenScad --imgsize=1600,1000 --viewall --autocenter --projection=p `
        --camera=$($Views[$View]) -D $Define -o $TempFile $Source
    if ($LASTEXITCODE -ne 0) { throw "OpenSCAD preview failed: $View" }
    Copy-Item -LiteralPath $TempFile -Destination (Join-Path $ExportDir "$View.png") -Force
}

$References = @{
    "apache_2800_lower_REFERENCE_DO_NOT_PRINT" = "case_lower_reference"
    "apache_2800_lid_REFERENCE_DO_NOT_PRINT"   = "case_lid_reference"
}

foreach ($Name in $References.Keys) {
    $Define = 'part="' + $References[$Name] + '"'
    $TempFile = Join-Path "C:\tmp" "$TempTag-$Name.stl"
    & $OpenScad -D $Define -o $TempFile $Source
    if ($LASTEXITCODE -ne 0) { throw "OpenSCAD reference export failed: $Name" }
    Copy-Item -LiteralPath $TempFile -Destination (Join-Path $ExportDir "$Name.stl") -Force
}

& $VersionHelper -Tag 'after-export_airflow_previews'
Write-Host "Airflow-study previews and reference envelopes written to $ExportDir"
