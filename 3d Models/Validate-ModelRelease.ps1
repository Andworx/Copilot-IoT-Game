param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^RP\d+$')]
    [string]$Revision
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$releasesRoot = Join-Path $PSScriptRoot 'apache case\releases'
$releaseDir = Join-Path $releasesRoot $Revision
$manifestPath = Join-Path $releaseDir 'manifest.json'
$currentPath = Join-Path $releasesRoot 'current.json'
$validationPath = Join-Path $releaseDir ('validation\validation_' + $Revision.ToLowerInvariant() + '.json')
$errors = [Collections.Generic.List[string]]::new()

function Add-ValidationError {
    param([string]$Message)
    $script:errors.Add($Message)
}

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Missing release manifest: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.revision -ne $Revision) {
    Add-ValidationError "Manifest revision is $($manifest.revision), expected $Revision."
}

$actualFiles = Get-ChildItem -LiteralPath $releaseDir -Recurse -File |
    Where-Object { $_.FullName -ne $manifestPath }
$listedFiles = @($manifest.files)

if ($actualFiles.Count -ne $listedFiles.Count) {
    Add-ValidationError "Manifest lists $($listedFiles.Count) files, but release contains $($actualFiles.Count)."
}

foreach ($entry in $listedFiles) {
    $filePath = Join-Path $releaseDir ($entry.path.Replace('/', '\'))
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        Add-ValidationError "Missing manifested file: $($entry.path)"
        continue
    }

    $item = Get-Item -LiteralPath $filePath
    if ($item.Length -ne $entry.size_bytes) {
        Add-ValidationError "Size mismatch: $($entry.path)"
    }

    $hash = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne $entry.sha256) {
        Add-ValidationError "SHA-256 mismatch: $($entry.path)"
    }
}

$listedPathSet = @{}
foreach ($entry in $listedFiles) { $listedPathSet[$entry.path.ToLowerInvariant()] = $true }
foreach ($file in $actualFiles) {
    $relativePath = [IO.Path]::GetRelativePath($releaseDir, $file.FullName).Replace('\', '/').ToLowerInvariant()
    if (-not $listedPathSet.ContainsKey($relativePath)) {
        Add-ValidationError "Unmanifested release file: $relativePath"
    }
}

$forbiddenExtensions = @('.scad', '.py', '.ps1', '.log', '.gcode')
$forbiddenFiles = $actualFiles | Where-Object { $forbiddenExtensions -contains $_.Extension.ToLowerInvariant() }
foreach ($file in $forbiddenFiles) {
    Add-ValidationError "Working-source file is not allowed in a curated release: $($file.Name)"
}

$requiredMeshes = @(
    'activity_face.stl',
    'carrier.stl',
    'lower_joiner.stl',
    'panel_L.stl',
    'panel_R.stl',
    'rear_L.stl',
    'rear_R.stl',
    'safety_face.stl',
    'screen_face.stl',
    'shell_FL.stl',
    'shell_FR.stl',
    'shell_joiner_x.stl',
    'shell_joiner_y.stl',
    'switch_face.stl',
    'tray_L.stl',
    'tray_R.stl',
    'tray_joiner.stl'
)

$actualMeshNames = @(Get-ChildItem -LiteralPath (Join-Path $releaseDir 'stl') -File -Filter '*.stl' |
    ForEach-Object { $_.Name } | Sort-Object)
$missingMeshes = @($requiredMeshes | Where-Object { $_ -notin $actualMeshNames })
$extraMeshes = @($actualMeshNames | Where-Object { $_ -notin $requiredMeshes })
foreach ($name in $missingMeshes) { Add-ValidationError "Missing production STL: $name" }
foreach ($name in $extraMeshes) { Add-ValidationError "Unexpected production STL: $name" }

if (-not (Test-Path -LiteralPath $validationPath -PathType Leaf)) {
    Add-ValidationError "Missing mesh validation report: $validationPath"
}
else {
    $validation = Get-Content -LiteralPath $validationPath -Raw | ConvertFrom-Json
    if ($validation.revision -ne $Revision) {
        Add-ValidationError "Mesh report revision is $($validation.revision), expected $Revision."
    }
    foreach ($name in $requiredMeshes) {
        $mesh = $validation.meshes.PSObject.Properties[$name].Value
        if ($null -eq $mesh) {
            Add-ValidationError "Production STL absent from mesh report: $name"
            continue
        }
        if (-not $mesh.closed_edges) { Add-ValidationError "$name has open edges." }
        if (-not $mesh.winding_consistent) { Add-ValidationError "$name has inconsistent winding." }
        if ($mesh.connected_bodies -ne 1) { Add-ValidationError "$name is not a single body." }
        if (-not $mesh.fits_256mm_bed) { Add-ValidationError "$name exceeds the 256 mm print envelope." }
    }
}

if (Test-Path -LiteralPath $currentPath -PathType Leaf) {
    $current = Get-Content -LiteralPath $currentPath -Raw | ConvertFrom-Json
    if ($manifest.status -eq 'current' -and $current.revision -ne $Revision) {
        Add-ValidationError "current.json points to $($current.revision), not $Revision."
    }
}
elseif ($manifest.status -eq 'current') {
    Add-ValidationError 'Current release is missing releases/current.json.'
}

$resolvedSourceCommit = (& git -C $repoRoot rev-list -n 1 $manifest.source_tag).Trim()
if ($LASTEXITCODE -ne 0 -or -not $resolvedSourceCommit) {
    Add-ValidationError "Unable to resolve source tag: $($manifest.source_tag)"
}
elseif ($resolvedSourceCommit -ne $manifest.source_commit) {
    Add-ValidationError "Source tag does not resolve to the manifested source commit."
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ }
    throw "Release validation failed with $($errors.Count) error(s)."
}

Write-Output "PASS: $Revision contains $($listedFiles.Count) manifested payload files and $($requiredMeshes.Count) validated production STLs."
