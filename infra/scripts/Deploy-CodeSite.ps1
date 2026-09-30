[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$ArtifactPath,
    [Parameter(Mandatory)] [string]$WebsiteId,
    [Parameter(Mandatory)] [string]$SiteLabel
)

$ErrorActionPreference = 'Stop'
$download = Join-Path $env:RUNNER_TEMP "live-$SiteLabel-site"

pac pages download-code-site --path $download --webSiteId $WebsiteId --overwrite
if ($LASTEXITCODE -ne 0) { throw "Could not download $SiteLabel website $WebsiteId. Refusing to upload, which would create a new site." }

$metadata = Get-ChildItem $download -Recurse -Directory -Force -Filter '.powerpages-site' | Select-Object -First 1
if (-not $metadata) { throw "Downloaded $SiteLabel site has no .powerpages-site folder." }
$downloadedId = (Select-String -Path (Join-Path $metadata.FullName 'website.yml') -Pattern '^id:\s*(\S+)').Matches[0].Groups[1].Value
if ($downloadedId -ne $WebsiteId) { throw "Downloaded $SiteLabel website id $downloadedId does not match $WebsiteId." }

$targetMetadata = Join-Path $ArtifactPath '.powerpages-site'
Remove-Item $targetMetadata -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item $metadata.FullName $targetMetadata -Recurse

Push-Location $ArtifactPath
try {
    pac pages upload-code-site --rootPath '.'
    if ($LASTEXITCODE -ne 0) { throw "$SiteLabel Power Pages Code Site upload failed." }
    $uploadedId = (Select-String -Path '.powerpages-site/website.yml' -Pattern '^id:\s*(\S+)').Matches[0].Groups[1].Value
    if ($uploadedId -ne $WebsiteId) { throw "$SiteLabel upload used website $uploadedId instead of $WebsiteId; a duplicate site was created and must be deleted." }
    Write-Host "$SiteLabel upload targeted website $uploadedId."
} finally {
    Pop-Location
}
