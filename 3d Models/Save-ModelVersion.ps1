param(
    [string]$ModelsRoot = $PSScriptRoot,
    [Parameter(Mandatory=$true)][string]$Tag
)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path -LiteralPath $ModelsRoot).Path.TrimEnd('\')
if ($Tag -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_-]*$') { throw 'Use a short alphanumeric tag with hyphens.' }
$VersionRoot = Join-Path $Root 'versions'
$Id = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ') + '-' + $Tag + '-' + [guid]::NewGuid().ToString('N').Substring(0,8)
$Snapshot = Join-Path $VersionRoot $Id
$FilesRoot = Join-Path $Snapshot 'files'
# Enumerate before creating the snapshot; never follow reparse points or recurse into versions.
function Get-VersionFiles([string]$Directory) {
    foreach ($Item in Get-ChildItem -LiteralPath $Directory -Force) {
        if ($Item.LinkType) { throw "Cannot snapshot filesystem link: $($Item.FullName)" }
        if ($Item.PSIsContainer) {
            if ($Item.FullName -eq $VersionRoot) { continue }
            Get-VersionFiles $Item.FullName
        } else { $Item }
    }
}
$Files = @(Get-VersionFiles $Root)
New-Item -ItemType Directory -Path $FilesRoot -Force | Out-Null
try {
    $Entries = @(foreach ($File in $Files) {
        $Relative = $File.FullName.Substring($Root.Length + 1)
        $Target = Join-Path $FilesRoot $Relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $Target) -Force | Out-Null
        $Before = (Get-FileHash -LiteralPath $File.FullName -Algorithm SHA256).Hash
        Copy-Item -LiteralPath $File.FullName -Destination $Target
        $Copied = (Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash
        $After = (Get-FileHash -LiteralPath $File.FullName -Algorithm SHA256).Hash
        if ($Before -ne $Copied -or $Before -ne $After) { throw "File changed during snapshot: $Relative" }
        [ordered]@{ path=$Relative.Replace('\','/'); bytes=$File.Length; sha256=$Copied }
    })
    [ordered]@{
        version=$Id; createdUtc=[DateTime]::UtcNow.ToString('o'); tag=$Tag
        status='Archived working files; not physical-fit or print approval'
        files=$Entries
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Snapshot 'manifest.json') -Encoding UTF8
} catch {
    # Keep partial evidence, but never write a success manifest.
    $_ | Out-String | Set-Content -LiteralPath (Join-Path $Snapshot 'INCOMPLETE.txt')
    throw
}
Write-Host "Version saved: $Snapshot"
