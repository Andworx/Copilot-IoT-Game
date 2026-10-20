<#
.SYNOPSIS
  Creates or updates the IoT Game Staff API custom connector in the Power Platform environment.

.DESCRIPTION
  Renders connectors/iot-game-staff/openapi.json and apiProperties.json with the staff host and the
  non-secret Entra IDs from azure/infrastructure/staff-api.prod.json, then runs `pac connector create`
  (first run, adds it to the solution) or `pac connector update` (every later run). Requires an
  authenticated PAC profile for the target environment. The OAuth client secret is optional input
  (STAFF_CONNECTOR_CLIENT_SECRET) and is only written to a temp file that is deleted on exit.

  Connections and the Code App binding are not touched: operators keep their per-user OAuth
  connections. Run `pac code add-data-source` only when the connector itself is replaced.
#>
[CmdletBinding()]
param(
  [string]$StaffHost,
  [string]$SolutionName = 'CopilotIoTGame',
  [string]$ConnectorDisplayName = 'IoT Game Staff API',
  [string]$ClientSecret = $env:STAFF_CONNECTOR_CLIENT_SECRET,
  [switch]$RenderOnly
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
$config = Get-Content (Join-Path $root 'azure/infrastructure/staff-api.prod.json') -Raw | ConvertFrom-Json
if (-not $StaffHost) { $StaffHost = "$($config.functionAppName).azurewebsites.net" }

$work = Join-Path ([IO.Path]::GetTempPath()) "staff-connector-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $work | Out-Null
try {
  function Render([string]$source, [string]$target) {
    $text = Get-Content $source -Raw
    # Longest tokens first: API_CLIENT_ID is contained in the others' replacement text.
    $text = $text.Replace('staff-api.example.invalid', $StaffHost).
      Replace('__CONNECTOR_CLIENT_ID__', $config.connectorClientId).
      Replace('__API_CLIENT_ID__', $config.apiClientId).
      Replace('__TENANT_ID__', $config.tenantId).
      Replace('TENANT_ID', $config.tenantId).
      Replace('API_CLIENT_ID', $config.apiClientId)
    if ($text -match 'example\.invalid|__[A-Z_]+__') { throw "Unrendered placeholder left in $source" }
    Set-Content -Path $target -Value $text -Encoding utf8
  }

  $definition = Join-Path $work 'apiDefinition.swagger.json'
  $properties = Join-Path $work 'apiProperties.json'
  Render (Join-Path $root 'connectors/iot-game-staff/openapi.json') $definition
  Render (Join-Path $root 'connectors/iot-game-staff/apiProperties.json') $properties
  if ($ClientSecret) {
    $json = Get-Content $properties -Raw | ConvertFrom-Json
    $json.properties.connectionParameters.token.oAuthSettings | Add-Member -NotePropertyName clientSecret -NotePropertyValue $ClientSecret -Force
    $json | ConvertTo-Json -Depth 20 | Set-Content -Path $properties -Encoding utf8
  }
  # Fail on malformed JSON before touching the environment.
  Get-Content $definition -Raw | ConvertFrom-Json | Out-Null
  if ($RenderOnly) { Write-Host "Rendered to $work"; $keep = $true; return }

  # `pac connector list` rows: <guid> <name> <display name> CustomConnector
  $existing = pac connector list | ForEach-Object {
    if ($_ -match '^([0-9a-f]{8}-[0-9a-f-]{27})\s+(\S+)\s+(.+?)\s+CustomConnector\s*$' -and $Matches[3].Trim() -eq $ConnectorDisplayName) { $Matches[1] }
  } | Select-Object -First 1

  if ($existing) {
    Write-Host "Updating connector $existing"
    pac connector update --connector-id $existing --api-definition-file $definition --api-properties-file $properties --solution-unique-name $SolutionName
  } else {
    Write-Host "Creating connector '$ConnectorDisplayName' in solution $SolutionName"
    pac connector create --api-definition-file $definition --api-properties-file $properties --solution-unique-name $SolutionName
  }
  if ($LASTEXITCODE -ne 0) { throw 'pac connector create/update failed.' }
} finally {
  if (-not $keep) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
}
