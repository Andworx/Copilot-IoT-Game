param(
    [string]$OpenScad = "C:\Program Files\OpenSCAD\openscad.com",
    [string[]]$Logos,             # default: every logo in logos/generated/logos.json
    [ValidateSet("inlay", "cutout")][string]$LogoStyle = "inlay",
    [ValidateRange(1, 6)][int]$Slot = 4,   # bucket the covers and previews are built for (widths differ per bucket)
    [switch]$SkipCovers,
    [switch]$SkipSnapshot
)

$ErrorActionPreference = "Stop"
$VersionHelper = Join-Path $PSScriptRoot '../Save-ModelVersion.ps1'
if (-not $SkipSnapshot) { & $VersionHelper -Tag 'before-plinko-export' }

$Source = Join-Path $PSScriptRoot "plinko_bucket_sensor.scad"
$StlDir = Join-Path $PSScriptRoot "exports\stl"
$CoverDir = Join-Path $PSScriptRoot "exports\covers"
$PreviewDir = Join-Path $PSScriptRoot "exports\preview"
New-Item -ItemType Directory -Force -Path $StlDir, $CoverDir, $PreviewDir | Out-Null

# Split the logo SVGs into colour layers first so the SCAD include is current.
& python (Join-Path $PSScriptRoot "logos\build_logo_layers.py")
if ($LASTEXITCODE -ne 0) { throw "build_logo_layers.py failed" }
$LogoTable = Get-Content (Join-Path $PSScriptRoot "logos\generated\logos.json") -Raw | ConvertFrom-Json
if ($Logos) { $LogoTable = $LogoTable | Where-Object { $Logos -contains $_.name } }

$Previews = @(
    @{ Part = "assembly"; Camera = "50,0,25,70,0,20,260" },
    @{ Part = "exploded"; Camera = "50,0,25,60,0,25,280" },
    @{ Part = "section"; Camera = "50,6,28,90,0,180,200"; Ortho = $true; Fit = $true },
    @{ Part = "cover_set"; Camera = "0,0,0,90,0,0,500"; Ortho = $true; Fit = $true; Size = "1400,1000" },
    @{ Part = "body"; Camera = "27,10,15,55,0,330,160" }
)

function Invoke-OpenScad([string[]]$Arguments, [switch]$ShowEcho, [switch]$AllowEmpty) {
    # Windows PowerShell 5.1 and PowerShell 7 before 7.3 drop the quotes in -D part="body", so OpenSCAD
    # sees an undefined variable and silently exports the assembly. Escape them in that legacy mode.
    if ($PSVersionTable.PSVersion -lt [version]'7.3' -or $PSNativeCommandArgumentPassing -eq 'Legacy') {
        $Arguments = $Arguments | ForEach-Object { $_ -replace '"', '\"' }
    }
    $Output = & $OpenScad @Arguments 2>&1 | ForEach-Object { "$_" }
    if ($LASTEXITCODE -ne 0 -and $AllowEmpty -and ($Output -match 'top level object is empty')) { return $false }
    if ($LASTEXITCODE -ne 0) { $Output | Write-Host; throw "OpenSCAD failed: $($Arguments -join ' ')" }
    $Pattern = if ($ShowEcho) { 'ECHO|WARNING|Simple:' } else { 'WARNING|Simple:' }
    $Output | Where-Object { $_ -match $Pattern } | Sort-Object -Unique | Write-Host
}

# One body per bucket: the dividers are different distances apart (slot_widths in the SCAD).
foreach ($SlotNumber in 1..6) {
    Write-Host "== body slot $SlotNumber"
    Invoke-OpenScad @("-o", (Join-Path $StlDir "body_slot$SlotNumber.stl"), "-D", "part=`"body`"", "-D", "slot=$SlotNumber", $Source) -ShowEcho
}
foreach ($SlotNumber in 1..6) {
    Write-Host "== drill guide slot $SlotNumber"
    Invoke-OpenScad @("-o", (Join-Path $StlDir "guide_slot$SlotNumber.stl"), "-D", "part=`"guide`"", "-D", "slot=$SlotNumber", $Source)
}
Write-Host "== puck"
Invoke-OpenScad @("-o", (Join-Path $StlDir "puck.stl"), "-D", "part=`"puck`"", $Source)
Write-Host "== fit test (receiver end only)"
Invoke-OpenScad @("-o", (Join-Path $StlDir "fit_test.stl"), "-D", "part=`"fit_test`"", $Source)

# Each cover gets its own folder: the base plus one STL per logo colour. Load them
# together in Bambu Studio as one object with multiple parts and assign a filament
# to each; the file names carry the colour to match.
if (-not $SkipCovers) {
    # Logo-free reference cover: validate_covers.py checks each set adds up to it.
    Invoke-OpenScad @("-o", (Join-Path $CoverDir "_plain_cover.stl"), "-D", "part=`"cover`"", "-D", "logo=`"none`"", "-D", "slot=$Slot", $Source)
    foreach ($Logo in $LogoTable) {
        $Folder = Join-Path $CoverDir $Logo.name
        if (Test-Path $Folder) { Remove-Item -Recurse -Force $Folder }
        New-Item -ItemType Directory -Path $Folder | Out-Null
        $Common = @("-D", "logo=`"$($Logo.name)`"", "-D", "logo_style=`"$LogoStyle`"", "-D", "slot=$Slot")
        Write-Host "== cover $($Logo.name)"
        Invoke-OpenScad (@("-o", (Join-Path $Folder "$($Logo.name)_cover_base.stl"), "-D", "part=`"cover`"") + $Common + $Source)
        if ($LogoStyle -eq "inlay") {
            for ($k = 0; $k -lt $Logo.colours.Count; $k++) {
                $Hex = $Logo.colours[$k].TrimStart('#')
                $Out = Join-Path $Folder ("{0}_colour{1}_{2}.stl" -f $Logo.name, ($k + 1), $Hex)
                # A colour painted over entirely by later shapes has nothing to print.
                $Result = Invoke-OpenScad (@("-o", $Out, "-D", "part=`"cover_colour`"", "-D", "logo_colour=$k") + $Common + $Source) -AllowEmpty
                if ($Result -eq $false) { Write-Host "   colour $($k + 1) #$Hex is fully covered - skipped" }
            }
        }
    }
    & python (Join-Path $PSScriptRoot "validate_covers.py") @($LogoTable.name)
    if ($LASTEXITCODE -ne 0) { throw "Cover validation failed" }
}

foreach ($View in $Previews) {
    $Size = if ($View.Size) { $View.Size } else { "1000,800" }
    $Arguments = @("-o", (Join-Path $PreviewDir "$($View.Part).png"), "-D", "part=`"$($View.Part)`"",
        "-D", "slot=$Slot", "--camera=$($View.Camera)", "--imgsize=$Size", "--colorscheme=Tomorrow")
    if ($View.Ortho) { $Arguments += "--projection=o" }
    if (-not $View.Ortho -or $View.Fit) { $Arguments += @("--autocenter", "--viewall") }
    Invoke-OpenScad ($Arguments + $Source)
}

if (-not $SkipSnapshot) { & $VersionHelper -Tag 'after-plinko-export' }
