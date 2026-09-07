<#
.SYNOPSIS
    Pushes hardware/raspberry-pi to the panel Pi over scp.

.DESCRIPTION
    Copies this folder to the Pi via SSH, skipping .env, .git, __pycache__,
    and .venv so a redeploy never overwrites the Pi's real IoT Hub connection
    string or leaves stale bytecode around. Only transfers files -- it does
    not create the remote venv, install requirements, or touch the systemd
    service. See README.md's "Deploying from a dev machine" and "Run on
    boot" sections for the one-time remote setup.

.PARAMETER PiHost
    SSH target, e.g. "pi@raspberrypi.local" or "pi@192.168.1.42".

.PARAMETER RemotePath
    Destination directory on the Pi. Must match the systemd unit's
    WorkingDirectory if you're using restore-and-spin-panel.service.

.PARAMETER RestartService
    If set, restarts restore-and-spin-panel.service on the Pi after copying
    (requires the unit to already be installed -- see README.md).

.EXAMPLE
    .\deploy.ps1 -PiHost pi@raspberrypi.local

.EXAMPLE
    .\deploy.ps1 -PiHost pi@192.168.1.42 -RestartService
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$PiHost,

    [string]$RemotePath = "/home/pi/restore-and-spin/hardware/raspberry-pi",

    [switch]$RestartService
)

$ErrorActionPreference = "Stop"

$sourceDir = $PSScriptRoot
$staging = Join-Path $env:TEMP ("panel-pi-deploy-" + [guid]::NewGuid())

Write-Host "Staging a clean copy (excluding .env, .git, __pycache__, .venv)..."
robocopy $sourceDir $staging /E /XD __pycache__ .venv .git /XF .env | Out-Null

try {
    Write-Host "Ensuring remote directory exists: $RemotePath"
    ssh $PiHost "mkdir -p '$RemotePath'"
    if ($LASTEXITCODE -ne 0) { throw "ssh mkdir failed (exit $LASTEXITCODE)" }

    Write-Host "Copying files to ${PiHost}:${RemotePath} ..."
    Get-ChildItem -Path $staging | ForEach-Object {
        scp -r $_.FullName "${PiHost}:${RemotePath}/"
        if ($LASTEXITCODE -ne 0) { throw "scp failed on $($_.Name) (exit $LASTEXITCODE)" }
    }
}
finally {
    Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
}

Write-Host "Deploy complete. .env on the Pi was not touched."

if ($RestartService) {
    Write-Host "Restarting restore-and-spin-panel.service on the Pi..."
    ssh $PiHost "sudo systemctl restart restore-and-spin-panel.service"
    if ($LASTEXITCODE -ne 0) { throw "Remote service restart failed (exit $LASTEXITCODE)" }
    Write-Host "Restarted. Tail logs with:"
    Write-Host "  ssh $PiHost journalctl -u restore-and-spin-panel.service -f"
}
