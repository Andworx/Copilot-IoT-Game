<#
.SYNOPSIS
    Smoke-tests the Foundry / Azure OpenAI Responses endpoint MCP Quest will use to generate games.
.DESCRIPTION
    Run this from a machine whose public IP is allowed by the resource's network rules (or that is
    inside the VNet). It signs in with the Azure CLI, requests a token, and calls
    POST {Endpoint}/responses with strict structured output, then reports exactly what came back.

    Step 1 sends a tiny JSON schema. This proves the URL, the token audience, your role and the
    network rule.
    Step 2 (-FullSchema) sends the real MCP Quest GameSpec schema, which proves the service accepts
    it in strict mode. It needs PowerShell 7+, Node and the game Function App built:
        cd azure\functions\game; npm ci; npm run build

    No keys are used or stored. The token is never printed.
.PARAMETER Endpoint
    OpenAI-style endpoint ending in /openai/v1, for example
    https://<resource>.openai.azure.com/openai/v1
    Defaults to $env:FOUNDRY_ENDPOINT.
.PARAMETER Model
    The deployment name (not the model family). Defaults to $env:FOUNDRY_MODEL.
.PARAMETER Audience
    Token audience. Default https://cognitiveservices.azure.com (right for *.openai.azure.com).
    Use https://ai.azure.com for a services.ai.azure.com project endpoint.
.PARAMETER FullSchema
    Also send the real GameSpec schema (strict structured output).
.PARAMETER TimeoutSeconds
    Per-request timeout. Default 120.
.EXAMPLE
    .\Test-FoundryEndpoint.ps1 -Endpoint https://foundry-aw--ed-azcomm-eastus2.openai.azure.com/openai/v1 -Model gpt-6-sol
    # Smoke test only
.EXAMPLE
    .\Test-FoundryEndpoint.ps1 -FullSchema
    # Uses FOUNDRY_ENDPOINT / FOUNDRY_MODEL and also tests the real schema
#>
[CmdletBinding()]
param(
    [string]$Endpoint = $env:FOUNDRY_ENDPOINT,
    [string]$Model = $env:FOUNDRY_MODEL,
    [string]$Audience = 'https://cognitiveservices.azure.com',
    [switch]$FullSchema,
    [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = 'Continue'

if (-not $Endpoint) { throw 'Pass -Endpoint or set FOUNDRY_ENDPOINT (https://<resource>.openai.azure.com/openai/v1).' }
if (-not $Model) { throw 'Pass -Model or set FOUNDRY_MODEL (the deployment name).' }
$Endpoint = $Endpoint.TrimEnd('/')
if ($Endpoint -notmatch '^https://[a-z0-9-]+\.(openai|cognitiveservices)\.azure\.com/openai/v1$') {
    Write-Host "[Setup] Endpoint does not look like https://<resource>.openai.azure.com/openai/v1 - continuing anyway." -ForegroundColor Yellow
}
if (-not (Get-Command az -ErrorAction SilentlyContinue)) { throw 'Azure CLI (az) is required. Install it and run az login.' }

# ---- token -------------------------------------------------------------------------------
Write-Host "[Auth] Requesting a token for $Audience ..." -ForegroundColor Cyan
$token = az account get-access-token --resource $Audience --query accessToken -o tsv 2>$null
if (-not $token) { throw "No token. Run 'az login' (and 'az account set --subscription <id>'), then retry." }
Write-Host "[Auth] Token acquired." -ForegroundColor Green

# ---- request helper ------------------------------------------------------------------------
function Invoke-Responses {
    param([hashtable]$Body)

    $uri = "$Endpoint/responses"
    $json = $Body | ConvertTo-Json -Depth 50 -Compress
    $headers = @{ Authorization = "Bearer $token" }
    $started = Get-Date
    $status = 0
    $content = ''
    try {
        $response = Invoke-WebRequest -Uri $uri -Method Post -Headers $headers -ContentType 'application/json' `
            -Body $json -TimeoutSec $TimeoutSeconds -UseBasicParsing
        $status = [int]$response.StatusCode
        $content = $response.Content
    }
    catch {
        $ex = $_.Exception
        if ($ex.Response) {
            $status = [int]$ex.Response.StatusCode
            if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
                $content = $_.ErrorDetails.Message
            }
            else {
                try {
                    $reader = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
                    $content = $reader.ReadToEnd()
                }
                catch { $content = $ex.Message }
            }
        }
        else {
            $content = $ex.Message
        }
    }
    [pscustomobject]@{
        Uri     = $uri
        Status  = $status
        Seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)
        Content = $content
    }
}

function Get-OutputText {
    param([string]$Content)
    try { $obj = $Content | ConvertFrom-Json } catch { return $null }
    if ($obj.output_text) { return [string]$obj.output_text }
    foreach ($item in @($obj.output)) {
        if ($item.type -eq 'message') {
            foreach ($part in @($item.content)) {
                if ($part.type -eq 'output_text' -and $part.text) { return [string]$part.text }
            }
        }
    }
    return $null
}

function Show-Hint {
    param([int]$Status, [string]$Content)
    if ($Content -match 'Virtual Network is configured') {
        Write-Host '  Hint: network rule. Your current public IP is not allowed on the resource (Networking > Selected networks).' -ForegroundColor Yellow
    }
    elseif ($Content -match 'lacks the required data action|does not have access to API') {
        Write-Host '  Hint: role. Assign "Foundry User" on the resource and wait a few minutes, then fetch a new token.' -ForegroundColor Yellow
    }
    elseif ($Status -eq 401) {
        Write-Host '  Hint: token. Check -Audience and that az is signed in to the right tenant.' -ForegroundColor Yellow
    }
    elseif ($Status -eq 404) {
        Write-Host '  Hint: path or deployment. The endpoint must already end in /openai/v1, and -Model must be the deployment name.' -ForegroundColor Yellow
    }
    elseif ($Status -eq 400 -and $Content -match 'schema|strict|json_schema') {
        Write-Host '  Hint: the service rejected the structured-output schema. Send this message back so the schema can be adjusted.' -ForegroundColor Yellow
    }
}

function Write-Result {
    param([string]$Name, $Result, [switch]$ShowJson)

    Write-Host "[$Name] POST $($Result.Uri)" -ForegroundColor Cyan
    Write-Host "[$Name] HTTP $($Result.Status) in $($Result.Seconds)s"
    if ($Result.Status -ge 200 -and $Result.Status -lt 300) {
        $text = Get-OutputText -Content $Result.Content
        if (-not $text) {
            Write-Host "  [FAIL] 2xx but no output text found." -ForegroundColor Red
            $Result.Content.Substring(0, [math]::Min(1500, $Result.Content.Length))
            return $false
        }
        try {
            $parsed = $text | ConvertFrom-Json
            Write-Host "  [PASS] Structured JSON returned." -ForegroundColor Green
            if ($ShowJson) { $parsed | ConvertTo-Json -Depth 6 }
            else { Write-Host "  $text" }
            return $true
        }
        catch {
            Write-Host "  [FAIL] Output was not valid JSON:" -ForegroundColor Red
            Write-Host "  $($text.Substring(0, [math]::Min(500, $text.Length)))"
            return $false
        }
    }
    Write-Host "  [FAIL] $($Result.Content.Substring(0, [math]::Min(1500, $Result.Content.Length)))" -ForegroundColor Red
    Show-Hint -Status $Result.Status -Content $Result.Content
    return $false
}

# ---- step 1: tiny schema -----------------------------------------------------------------
$smoke = @{
    model = $Model
    input = 'Return ok true'
    store = $false
    text  = @{
        format = @{
            type   = 'json_schema'
            name   = 'smoke'
            strict = $true
            schema = @{
                type                 = 'object'
                additionalProperties = $false
                required             = @('ok')
                properties           = @{ ok = @{ type = 'boolean' } }
            }
        }
    }
}
$passedSmoke = Write-Result -Name 'Smoke' -Result (Invoke-Responses -Body $smoke)

# ---- step 2: the real GameSpec schema -----------------------------------------------------
if ($FullSchema) {
    if (-not $passedSmoke) {
        Write-Host '[Schema] Skipped: fix the smoke test first.' -ForegroundColor Yellow
    }
    else {
        $gameDir = Join-Path $PSScriptRoot '..\azure\functions\game'
        $schemaModule = Join-Path $gameDir 'dist\src\mcpquest\gamespecSchema.js'
        if (-not (Test-Path $schemaModule)) {
            throw "Build the Function App first: cd '$gameDir'; npm ci; npm run build"
        }
        Push-Location $gameDir
        try {
            $schemaJson = & node -e "process.stdout.write(JSON.stringify(require('./dist/src/mcpquest/gamespecSchema').GAME_SPEC_JSON_SCHEMA))"
        }
        finally { Pop-Location }
        if (-not $schemaJson) { throw 'Could not read the GameSpec schema with Node.' }
        $schema = $schemaJson | ConvertFrom-Json -AsHashtable -ErrorAction SilentlyContinue
        if (-not $schema) {
            throw 'ConvertFrom-Json -AsHashtable needs PowerShell 7+. Install it (winget install Microsoft.PowerShell) and run with pwsh.'
        }
        $full = @{
            model        = $Model
            instructions = 'You design short games for a kiosk where a player solves a business problem with an MCP server. Return only JSON matching the schema.'
            input        = 'Server "demo" with tools list_items (read-only, argument limit) and update_item (argument item_id, state in New or Done). Set server.id to "demo", server.name to "Demo", server.toolsHash to "0123456789abcdef", version 1. Make one flow case with one scenario and one requirement.'
            store        = $false
            text         = @{
                format = @{ type = 'json_schema'; name = 'mcpquest_gamespec'; strict = $true; schema = $schema }
            }
        }
        $result = Invoke-Responses -Body $full
        [void](Write-Result -Name 'Schema' -Result $result -ShowJson)
        Write-Host '[Schema] The content only needs to be accepted and parse as JSON here; it is not validated against a real server.' -ForegroundColor DarkGray
    }
}
