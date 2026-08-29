<#
.SYNOPSIS
    Runs repeatable onboarding regression checks for the template baseline.
.DESCRIPTION
    Verifies onboarding behavior and generated artifact contracts without
    requiring live environment credentials.

    Coverage:
    - Happy-path onboarding smoke test via Start-Onboarding.ps1 dry-run
    - Generated artifact contract checks for project tokens, config template, and .env template
    - Compatibility checks for existing setup workflow entry points

    Exit code:
    - 0 when all checks pass
    - 1 when one or more checks fail
.PARAMETER Environment
    Target environment for smoke/compatibility checks. Default: dev.
.PARAMETER Quiet
    Suppress per-check pass output and print failures + summary only.
.EXAMPLE
    .\scripts\Test-OnboardingRegression.ps1 -Environment dev
    Runs onboarding regression checks for the dev workflow.
#>
[CmdletBinding()]
param(
    [ValidateSet('dev', 'test', 'prod')]
    [string]$Environment = 'dev',
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

$passed = 0
$failed = 0

function Write-Check {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [bool]$Ok,
        [string]$Detail
    )

    if ($Ok) {
        $script:passed++
        if (-not $Quiet) {
            Write-Host "  [PASS] $Name" -ForegroundColor Green
        }
        return
    }

    $script:failed++
    Write-Host "  [FAIL] $Name" -ForegroundColor Red
    if (-not [string]::IsNullOrWhiteSpace($Detail)) {
        Write-Host "         $Detail" -ForegroundColor DarkGray
    }
}

function Test-JsonFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "File not found: $Path"
    }

    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Test-PropertyPath {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Object,
        [Parameter(Mandatory = $true)]
        [string[]]$Path
    )

    $current = $Object
    foreach ($segment in $Path) {
        if ($null -eq $current) {
            return $false
        }

        $property = $current.PSObject.Properties[$segment]
        if ($null -eq $property) {
            return $false
        }

        $current = $property.Value
    }

    return $true
}

function Get-DeclaredParameterNames {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $tokens = $null
    $parseErrors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$tokens, [ref]$parseErrors)
    if ($parseErrors.Count -gt 0) {
        throw "PowerShell parse errors in '$Path': $($parseErrors[0].Message)"
    }

    if ($null -eq $ast.ParamBlock) {
        return @()
    }

    return @($ast.ParamBlock.Parameters | ForEach-Object { $_.Name.VariablePath.UserPath })
}

Write-Host "`n===== Onboarding Regression Checks =====" -ForegroundColor Cyan

# 1) Repeatable happy-path smoke check
Write-Host "`n--- Smoke Test ---" -ForegroundColor Yellow
$startScript = Join-Path $scriptDir 'Start-Onboarding.ps1'
Write-Check -Name 'Start-Onboarding.ps1 exists' -Ok (Test-Path -LiteralPath $startScript)

if (Test-Path -LiteralPath $startScript) {
    $smokeArgs = @{
        Environment = $Environment
        NonInteractive = $true
        DryRun = $true
        SkipPreflight = $true
        ProjectName = 'Onboarding Smoke Test'
        ProjectId = 'onboarding-smoke'
        GitHubOrg = 'andworx'
        SolutionName = 'onboardingsmoke'
        PublisherPrefix = 'obs'
        EmailTemplatePrefix = 'OnboardingSmoke'
        OrgName = 'andworx'
        OrgUrl = 'andworx-dev.crm.dynamics.com'
        TenantId = '00000000-0000-0000-0000-000000000001'
        CloudEnvironment = 'commercial'
        ConfigurationMode = 'local-only'
        DataverseClientSecretDev = 'smoke-secret-value'
    }

    $smokeOutput = (& $startScript @smokeArgs 2>&1 | Out-String).Trim()
    $smokeSucceeded = $LASTEXITCODE -eq 0
    Write-Check -Name 'Happy-path dry-run smoke completes' -Ok $smokeSucceeded -Detail $smokeOutput
}

# 2) Generated artifact shape checks
Write-Host "`n--- Generated Artifact Contract ---" -ForegroundColor Yellow

$tokensExamplePath = Join-Path $repoRoot 'project.tokens.example.json'
$tokensExample = $null
try {
    $tokensExample = Test-JsonFile -Path $tokensExamplePath
    Write-Check -Name 'project.tokens.example.json is valid JSON' -Ok $true
}
catch {
    Write-Check -Name 'project.tokens.example.json is valid JSON' -Ok $false -Detail $_.Exception.Message
}

if ($null -ne $tokensExample) {
    $requiredProjectKeys = @(
        'YOUR_PROJECT_NAME',
        'YOUR_PROJECT_ID',
        'YOUR_GITHUB_ORG',
        'YOUR_SOLUTION_NAME',
        'YOUR_PUBLISHER_PREFIX',
        'YOUR_EMAIL_TEMPLATE_PREFIX'
    )
    foreach ($key in $requiredProjectKeys) {
        Write-Check `
            -Name "project.required.$key exists" `
            -Ok (Test-PropertyPath -Object $tokensExample -Path @('project', 'required', $key))
    }

    $requiredEnvironmentKeys = @('YOUR_ORG_NAME', 'YOUR_ORG_URL', 'YOUR_TENANT_ID', 'YOUR_CLOUD_ENV')
    foreach ($key in $requiredEnvironmentKeys) {
        Write-Check `
            -Name "root required token list contains $key" `
            -Ok ($tokensExample.required -contains $key)
    }

    foreach ($envName in @('dev', 'test', 'prod')) {
        Write-Check -Name "$envName.required block exists" -Ok (Test-PropertyPath -Object $tokensExample -Path @($envName, 'required'))
        Write-Check -Name "$envName.optional block exists" -Ok (Test-PropertyPath -Object $tokensExample -Path @($envName, 'optional'))
    }
}

$configExamplePath = Join-Path $scriptDir 'config-dev.example.json'
$configExample = $null
try {
    $configExample = Test-JsonFile -Path $configExamplePath
    Write-Check -Name 'scripts\config-dev.example.json is valid JSON' -Ok $true
}
catch {
    Write-Check -Name 'scripts\config-dev.example.json is valid JSON' -Ok $false -Detail $_.Exception.Message
}

if ($null -ne $configExample) {
    foreach ($key in @('environmentUrl', 'apiVersion', 'tenantId', 'clientId', 'cloudEnvironment', 'publisherPrefix', 'solutionUniqueName')) {
        Write-Check -Name "config-dev.example.json contains '$key'" -Ok (Test-PropertyPath -Object $configExample -Path @($key))
    }
    Write-Check -Name 'config-dev.example.json apiVersion is v9.2' -Ok ($configExample.apiVersion -eq 'v9.2')
}

$envExamplePath = Join-Path $repoRoot '.env.example'
if (Test-Path -LiteralPath $envExamplePath) {
    $envExampleContent = Get-Content -LiteralPath $envExamplePath -Raw
    Write-Check -Name '.env.example contains DATAVERSE_CLIENT_SECRET_DEV entry' -Ok ($envExampleContent -match '(?m)^DATAVERSE_CLIENT_SECRET_DEV=')
    Write-Check -Name '.env.example uses non-empty placeholder for DATAVERSE_CLIENT_SECRET_DEV' -Ok ($envExampleContent -match '(?m)^DATAVERSE_CLIENT_SECRET_DEV=.+$')
}
else {
    Write-Check -Name '.env.example exists' -Ok $false
}

# 3) Backward compatibility checks
Write-Host "`n--- Existing Workflow Compatibility ---" -ForegroundColor Yellow
$scriptParameterChecks = @{
    'Start-Onboarding.ps1' = @('Environment', 'NonInteractive', 'DryRun', 'Force', 'NoBackup', 'PreflightOnly')
    'Validate-DeploymentSetup.ps1' = @('Environment', 'TestConnection')
    'Test-OnboardingCompletion.ps1' = @('Environment', 'Json', 'Quiet')
}

foreach ($entry in $scriptParameterChecks.GetEnumerator()) {
    $targetPath = Join-Path $scriptDir $entry.Key
    if (-not (Test-Path -LiteralPath $targetPath)) {
        Write-Check -Name "$($entry.Key) exists" -Ok $false
        continue
    }

    Write-Check -Name "$($entry.Key) exists" -Ok $true
    $declaredParameters = @()
    try {
        $declaredParameters = Get-DeclaredParameterNames -Path $targetPath
        Write-Check -Name "$($entry.Key) parses without errors" -Ok $true
    }
    catch {
        Write-Check -Name "$($entry.Key) parses without errors" -Ok $false -Detail $_.Exception.Message
    }

    foreach ($parameterName in $entry.Value) {
        Write-Check `
            -Name "$($entry.Key) retains parameter -$parameterName" `
            -Ok ($declaredParameters -contains $parameterName)
    }
}

$completionScript = Join-Path $scriptDir 'Test-OnboardingCompletion.ps1'
if (Test-Path -LiteralPath $completionScript) {
    $completionOutput = (& $completionScript -Environment $Environment -Json 2>&1 | Out-String).Trim()
    $completionExitCode = $LASTEXITCODE
    $completionJsonOk = $false
    try {
        $completionPayload = $completionOutput | ConvertFrom-Json
        $completionJsonOk = $null -ne $completionPayload.isComplete -and $null -ne $completionPayload.remediation
    }
    catch { }

    Write-Check -Name 'Test-OnboardingCompletion.ps1 emits JSON payload' -Ok $completionJsonOk -Detail $completionOutput
    Write-Check -Name 'Test-OnboardingCompletion.ps1 exit contract is stable (0 or 2)' -Ok ($completionExitCode -in @(0, 2)) -Detail "Exit code: $completionExitCode"
}

# 4) Token-stamp parse-safety regression
# Verifies that Start-Onboarding.ps1 and Validate-DeploymentSetup.ps1 remain parseable
# after Apply-ProjectTokens.ps1 stamps them with values that are not legal PowerShell
# bare identifiers (spaces, GUIDs with hyphens, colons, numeric strings, etc.).
# Keys are built at runtime from parts to avoid this file itself being stamped.
Write-Host "`n--- Token-Stamp Parse Safety ---" -ForegroundColor Yellow

$tokenPrefix = 'YOUR' + '_'
$simulatedStampMap = @{
    ($tokenPrefix + 'PROJECT_NAME')          = 'Grants Management'
    ($tokenPrefix + 'PROJECT_ID')            = 'grants-management'
    ($tokenPrefix + 'GITHUB_ORG')            = 'andworx'
    ($tokenPrefix + 'SOLUTION_NAME')         = 'grantsmanagement'
    ($tokenPrefix + 'PUBLISHER_PREFIX')      = 'gm'
    ($tokenPrefix + 'EMAIL_TEMPLATE_PREFIX') = 'Grants'
    ($tokenPrefix + 'ORG_NAME')              = 'andworx'
    ($tokenPrefix + 'ORG_URL')               = 'andworx-dev.crm.dynamics.com'
    ($tokenPrefix + 'TENANT_ID')             = '00000000-0000-0000-0000-000000000001'
    ($tokenPrefix + 'CLOUD_ENV')             = 'commercial'
    ($tokenPrefix + 'CLIENT_ID')             = '347aeaed-0000-0000-0000-000000000000'
    ($tokenPrefix + 'AGENT_APP_ID')          = '7cea0515-0000-0000-0000-000000000000'
    ($tokenPrefix + 'PORTAL_SLUG')           = 'my-portal'
    ($tokenPrefix + 'WEBSITE_ID')            = '5ae8f94a-0000-0000-0000-000000000000'
    ($tokenPrefix + 'PORTAL_FOLDER')         = 'portal folder'
    ($tokenPrefix + 'PROJECT_NUMBER')        = '42'
    ($tokenPrefix + 'PROJECT_LABEL')         = 'project:grants-management'
}

$stampSafetyScripts = @('Start-Onboarding.ps1', 'Validate-DeploymentSetup.ps1')
foreach ($stampScriptFile in $stampSafetyScripts) {
    $stampTestPath = Join-Path $scriptDir $stampScriptFile
    if (-not (Test-Path -LiteralPath $stampTestPath)) {
        Write-Check -Name "$stampScriptFile present for stamp-safety check" -Ok $false
        continue
    }

    $stampedContent = Get-Content -LiteralPath $stampTestPath -Raw
    foreach ($stampEntry in $simulatedStampMap.GetEnumerator()) {
        $stampedContent = $stampedContent -replace [regex]::Escape($stampEntry.Key), $stampEntry.Value
    }

    $tmpStampPath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "sor-stamp-$stampScriptFile")
    try {
        Set-Content -Path $tmpStampPath -Value $stampedContent -Encoding UTF8 -NoNewline
        $stampParseErrors = $null
        $null = [System.Management.Automation.Language.Parser]::ParseFile($tmpStampPath, [ref]$null, [ref]$stampParseErrors)
        Write-Check `
            -Name "$stampScriptFile remains parseable after token stamping" `
            -Ok ($stampParseErrors.Count -eq 0) `
            -Detail $(if ($stampParseErrors.Count -gt 0) { $stampParseErrors[0].Message } else { '' })
    }
    finally {
        if (Test-Path -LiteralPath $tmpStampPath) {
            Remove-Item -LiteralPath $tmpStampPath -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "`n===== Regression Summary =====" -ForegroundColor Cyan
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'Green' })

if ($failed -gt 0) {
    exit 1
}

exit 0
