param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^RP\d+$')]
    [string]$Revision,

    [Parameter(Mandatory = $true)]
    [string]$SourceTag,

    [switch]$SetCurrent
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$releasesRoot = Join-Path $PSScriptRoot 'apache case\releases'
$releaseDir = Join-Path $releasesRoot $Revision
$resolvedReleases = [IO.Path]::GetFullPath($releasesRoot)
$resolvedRelease = [IO.Path]::GetFullPath($releaseDir)

if (-not $resolvedRelease.StartsWith(
        $resolvedReleases + [IO.Path]::DirectorySeparatorChar,
        [StringComparison]::OrdinalIgnoreCase)) {
    throw "Release path escaped the releases directory: $resolvedRelease"
}

if (-not (Test-Path -LiteralPath $resolvedRelease -PathType Container)) {
    throw "Release directory does not exist: $resolvedRelease"
}

$sourceCommit = (& git -C $repoRoot rev-list -n 1 $SourceTag).Trim()
if ($LASTEXITCODE -ne 0 -or -not $sourceCommit) {
    throw "Unable to resolve source tag: $SourceTag"
}

$createdUtc = (Get-Date).ToUniversalTime().ToString('o')
$releaseTag = 'model-' + $Revision.ToLowerInvariant()
$manifestPath = Join-Path $resolvedRelease 'manifest.json'

$files = Get-ChildItem -LiteralPath $resolvedRelease -Recurse -File |
    Where-Object { $_.FullName -ne $manifestPath } |
    Sort-Object FullName |
    ForEach-Object {
        [ordered]@{
            path = [IO.Path]::GetRelativePath($resolvedRelease, $_.FullName).Replace('\', '/')
            size_bytes = $_.Length
            sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    }

$manifest = [ordered]@{
    schema_version = 1
    revision = $Revision
    status = if ($SetCurrent) { 'current' } else { 'superseded' }
    source_tag = $SourceTag
    source_commit = $sourceCommit
    release_tag = $releaseTag
    created_utc = $createdUtc
    known_validation_notes = @(
        'Rear carrier and paper drill guide retain an outstanding physical case dry-fit note.'
    )
    files = @($files)
}

$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding utf8

if ($SetCurrent) {
    $current = [ordered]@{
        schema_version = 1
        revision = $Revision
        release_path = $Revision
        source_tag = $SourceTag
        source_commit = $sourceCommit
        release_tag = $releaseTag
        updated_utc = $createdUtc
    }
    $current | ConvertTo-Json -Depth 3 |
        Set-Content -LiteralPath (Join-Path $releasesRoot 'current.json') -Encoding utf8
}

Write-Output "Manifested $($files.Count) release files for $Revision from $SourceTag ($sourceCommit)."

