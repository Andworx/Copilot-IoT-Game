param(
    [string]$OpenScad = "C:\Program Files\OpenSCAD\openscad.com",
    [switch]$SkipSnapshot
)

$ErrorActionPreference = "Stop"
$VersionHelper = Join-Path $PSScriptRoot '../Save-ModelVersion.ps1'
if (-not $SkipSnapshot) { & $VersionHelper -Tag 'before-plinko-pi-case-export' }

$Source = Join-Path $PSScriptRoot "plinko_pi_case.scad"
$StlDir = Join-Path $PSScriptRoot "exports\stl"
$PreviewDir = Join-Path $PSScriptRoot "exports\preview"
New-Item -ItemType Directory -Force -Path $StlDir, $PreviewDir | Out-Null

function Invoke-OpenScad([string[]]$Arguments, [switch]$ShowEcho) {
    # Windows PowerShell 5.1 (and PowerShell 7 before 7.3) drops the quotes in -D part="base", so OpenSCAD
    # sees an undefined variable and exports the assembly. Escape them in that legacy mode.
    if ($PSVersionTable.PSVersion -lt [version]'7.3' -or $PSNativeCommandArgumentPassing -eq 'Legacy') {
        $Arguments = $Arguments | ForEach-Object { $_ -replace '"', '\"' }
    }
    $Output = & $OpenScad @Arguments 2>&1 | ForEach-Object { "$_" }
    if ($LASTEXITCODE -ne 0) { $Output | Write-Host; throw "OpenSCAD failed: $($Arguments -join ' ')" }
    $Pattern = if ($ShowEcho) { 'ECHO|WARNING|Simple:' } else { 'WARNING|Simple:' }
    $Output | Where-Object { $_ -match $Pattern } | Sort-Object -Unique | Write-Host
}

foreach ($Part in "base", "lid", "fit_tray", "wing_test") {
    Write-Host "== $Part"
    Invoke-OpenScad @("-o", (Join-Path $StlDir "plinko_pi_$Part.stl"), "-D", "part=`"$Part`"", $Source) -ShowEcho
}

Invoke-OpenScad @("-o", (Join-Path $PreviewDir "assembly.png"), "-D", "part=`"assembly`"",
    "--camera=40,25,20,60,0,25,330", "--imgsize=1200,800", "--colorscheme=Tomorrow", "--autocenter", "--viewall", $Source)

& python (Join-Path $PSScriptRoot "validate_parts.py")
if ($LASTEXITCODE -ne 0) { throw "Part validation failed" }

if (-not $SkipSnapshot) { & $VersionHelper -Tag 'after-plinko-pi-case-export' }
