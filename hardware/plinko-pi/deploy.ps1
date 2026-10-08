<#
.SYNOPSIS
    Pushes hardware/plinko-pi to the Plinko Pi over scp.

.PARAMETER PiHost
    SSH target, for example "pi@iotplinko".

.PARAMETER RemotePath
    Destination directory on the Pi.
#>
param(
    [string]$PiHost = "pi@iotplinko",
    [string]$RemotePath = "/home/pi/plinko-pi"
)

$ErrorActionPreference = "Stop"

$sourceDir = $PSScriptRoot
$staging = Join-Path $env:TEMP ("plinko-pi-deploy-" + [guid]::NewGuid())

Write-Host "Staging a clean copy (excluding .env, .git, __pycache__, .venv)..."
robocopy $sourceDir $staging /E /XD __pycache__ .venv .git /XF .env | Out-Null

try {
    Write-Host "Ensuring remote directory exists: $RemotePath"
    ssh $PiHost "mkdir -p '$RemotePath'"
    if ($LASTEXITCODE -ne 0) { throw "ssh mkdir failed (exit $LASTEXITCODE)" }

    Write-Host "Copying files to ${PiHost}:${RemotePath} ..."
    Get-ChildItem -LiteralPath $staging | ForEach-Object {
        scp -r $_.FullName "${PiHost}:${RemotePath}/"
        if ($LASTEXITCODE -ne 0) { throw "scp failed on $($_.Name) (exit $LASTEXITCODE)" }
    }
}
finally {
    Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
}

Write-Host "Deploy complete. .env on the Pi was not touched."
Write-Host "Run a smoke test with:"
Write-Host "  ssh $PiHost 'cd $RemotePath && python3 plinko_trigger.py --pin 17 --bucket 1 --lit-bucket 1 --bucket-count 5'"