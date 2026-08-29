<#
.SYNOPSIS
    Evaluates whether onboarding is complete for a target environment.
.DESCRIPTION
    Performs deterministic checks for the onboarding completion contract and
    reports any gaps before coding or deployment work begins.

    Completion requires all of the following:
    - project.tokens.json includes stamped project.required values
    - project.tokens.json includes stamped <environment>.required values
    - scripts/config-<environment>.json exists and has no YOUR_* placeholders
    - .env contains DATAVERSE_CLIENT_SECRET_<ENV> with a non-placeholder value

    Exit code:
    - 0 when onboarding is complete
    - 2 when onboarding is incomplete
    - 1 for script/runtime errors
.PARAMETER Environment
    Target environment to evaluate. Default: dev.
.PARAMETER Json
    Emit machine-readable JSON output.
.PARAMETER Quiet
    Suppress line-by-line status output and print summary only.
.EXAMPLE
    .\scripts\Test-OnboardingCompletion.ps1 -Environment dev
    Runs onboarding completion checks and prints human-readable results.
.EXAMPLE
    .\scripts\Test-OnboardingCompletion.ps1 -Environment dev -Json
    Emits a JSON payload with check details and remediation guidance.
#>
[CmdletBinding()]
param(
    [ValidateSet('dev', 'test', 'prod')]
    [string]$Environment = 'dev',
    [switch]$Json,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

$results = [System.Collections.Generic.List[object]]::new()
$requiredProjectTokenKeys = @(
    'YOUR_PROJECT_NAME',
    'YOUR_PROJECT_ID',
    'YOUR_GITHUB_ORG',
    'YOUR_SOLUTION_NAME',
    'YOUR_PUBLISHER_PREFIX',
    'YOUR_EMAIL_TEMPLATE_PREFIX'
)

function Add-CheckResult {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [bool]$Passed,
        [string]$Detail,
        [string]$Remediation
    )

    $results.Add([ordered]@{
            name = $Name
            passed = $Passed
            detail = $Detail
            remediation = $Remediation
        })
}

function Test-StampedValue {
    param(
        [string]$Value,
        [string]$TokenName
    )

    if ([string]::IsNullOrWhiteSpace([string]$Value)) {
        return $false
    }

    $normalized = [string]$Value
    if ($normalized -eq $TokenName) {
        return $false
    }

    return $normalized -notmatch '^YOUR_[A-Z0-9_]+$'
}

$tokensPath = Join-Path $repoRoot 'project.tokens.json'
$configPath = Join-Path $scriptDir "config-$Environment.json"
$envPath = Join-Path $repoRoot '.env'

Add-CheckResult `
    -Name 'project.tokens.json exists' `
    -Passed (Test-Path -LiteralPath $tokensPath) `
    -Detail $tokensPath `
    -Remediation 'Run .\scripts\Start-Onboarding.ps1 -Environment dev to generate onboarding files.'

$tokenDef = $null
if (Test-Path -LiteralPath $tokensPath) {
    try {
        $tokenDef = Get-Content -LiteralPath $tokensPath -Raw | ConvertFrom-Json
        Add-CheckResult -Name 'project.tokens.json is valid JSON' -Passed $true -Detail $null -Remediation $null
    }
    catch {
        Add-CheckResult -Name 'project.tokens.json is valid JSON' -Passed $false -Detail $_.Exception.Message -Remediation 'Fix project.tokens.json formatting or rerun Start-Onboarding.'
    }
}

if ($null -ne $tokenDef) {
    $hasProjectRequired = $null -ne $tokenDef.project -and $null -ne $tokenDef.project.required
    Add-CheckResult `
        -Name 'project.required block exists' `
        -Passed $hasProjectRequired `
        -Detail $(if ($hasProjectRequired) { 'project.required found.' } else { 'Missing project.required block.' }) `
        -Remediation 'Run .\scripts\Start-Onboarding.ps1 -Environment dev and complete project identity prompts.'

    $hasEnvironment = $null -ne $tokenDef.$Environment -and $null -ne $tokenDef.$Environment.required
    Add-CheckResult `
        -Name "$Environment.required block exists" `
        -Passed $hasEnvironment `
        -Detail $(if ($hasEnvironment) { "$Environment.required found." } else { "Missing $Environment.required block." }) `
        -Remediation "Run .\scripts\Start-Onboarding.ps1 -Environment $Environment and complete required environment prompts."

    $projectMissing = [System.Collections.Generic.List[string]]::new()
    if ($hasProjectRequired) {
        foreach ($tokenName in $requiredProjectTokenKeys) {
            $value = $tokenDef.project.required.$tokenName
            if (-not (Test-StampedValue -Value $value -TokenName $tokenName)) {
                $projectMissing.Add($tokenName)
            }
        }
    }
    else {
        foreach ($tokenName in $requiredProjectTokenKeys) {
            $projectMissing.Add($tokenName)
        }
    }

    Add-CheckResult `
        -Name 'project.required values are stamped' `
        -Passed ($projectMissing.Count -eq 0) `
        -Detail $(if ($projectMissing.Count -eq 0) { 'All required project tokens are stamped.' } else { "Missing or placeholder values: $($projectMissing -join ', ')." }) `
        -Remediation 'Fill missing values in project.tokens.json and run .\scripts\Apply-ProjectTokens.ps1 -Environment dev.'

    $environmentTokenNames = @()
    if ($null -ne $tokenDef.required) {
        $environmentTokenNames = @($tokenDef.required)
    }

    $envMissing = [System.Collections.Generic.List[string]]::new()
    if ($hasEnvironment) {
        foreach ($tokenName in $environmentTokenNames) {
            $value = $tokenDef.$Environment.required.$tokenName
            if (-not (Test-StampedValue -Value $value -TokenName $tokenName)) {
                $envMissing.Add($tokenName)
            }
        }
    }
    else {
        foreach ($tokenName in $environmentTokenNames) {
            $envMissing.Add($tokenName)
        }
    }

    Add-CheckResult `
        -Name "$Environment.required values are stamped" `
        -Passed ($envMissing.Count -eq 0) `
        -Detail $(if ($envMissing.Count -eq 0) { "All required $Environment tokens are stamped." } else { "Missing or placeholder values: $($envMissing -join ', ')." }) `
        -Remediation "Fill missing values in project.tokens.json and run .\scripts\Apply-ProjectTokens.ps1 -Environment $Environment."
}

Add-CheckResult `
    -Name "config-$Environment.json exists" `
    -Passed (Test-Path -LiteralPath $configPath) `
    -Detail $configPath `
    -Remediation "Run .\scripts\Start-Onboarding.ps1 -Environment $Environment to generate config-$Environment.json."

if (Test-Path -LiteralPath $configPath) {
    $configRaw = Get-Content -LiteralPath $configPath -Raw
    Add-CheckResult `
        -Name "config-$Environment.json has no YOUR_* placeholders" `
        -Passed ($configRaw -notmatch 'YOUR_[A-Z0-9_]+') `
        -Detail $(if ($configRaw -match 'YOUR_[A-Z0-9_]+') { "config-$Environment.json still contains placeholder tokens." } else { "config-$Environment.json contains resolved values." }) `
        -Remediation "Run .\scripts\Apply-ProjectTokens.ps1 -Environment $Environment after setting required token values."
}

Add-CheckResult `
    -Name '.env exists' `
    -Passed (Test-Path -LiteralPath $envPath) `
    -Detail $envPath `
    -Remediation 'Copy .env.example to .env and set DATAVERSE_CLIENT_SECRET_DEV.'

if (Test-Path -LiteralPath $envPath) {
    $envContent = Get-Content -LiteralPath $envPath -Raw
    $envUpper = $Environment.ToUpperInvariant()
    $secretPattern = "DATAVERSE_CLIENT_SECRET_$envUpper\s*=\s*(.+)"
    $secretMatch = [regex]::Match($envContent, $secretPattern)
    $hasEnvironmentSecret = $secretMatch.Success
    Add-CheckResult `
        -Name "DATAVERSE_CLIENT_SECRET_$envUpper is set" `
        -Passed $hasEnvironmentSecret `
        -Detail $(if ($hasEnvironmentSecret) { "DATAVERSE_CLIENT_SECRET_$envUpper entry found." } else { "DATAVERSE_CLIENT_SECRET_$envUpper entry not found." }) `
        -Remediation "Set DATAVERSE_CLIENT_SECRET_$envUpper in .env."

    if ($hasEnvironmentSecret) {
        $secretValue = $secretMatch.Groups[1].Value.Trim()
        $hasPlaceholderSecret = [string]::IsNullOrWhiteSpace($secretValue) -or $secretValue -match '^your-.*-secret-here$'
        Add-CheckResult `
            -Name "DATAVERSE_CLIENT_SECRET_$envUpper is not a placeholder" `
            -Passed (-not $hasPlaceholderSecret) `
            -Detail $(if ($hasPlaceholderSecret) { 'Secret value is blank or placeholder.' } else { 'Secret value appears configured.' }) `
            -Remediation "Replace DATAVERSE_CLIENT_SECRET_$envUpper with a real secret value."
    }
}

$failedChecks = @($results | Where-Object { -not $_.passed })
$isComplete = $failedChecks.Count -eq 0

$summary = [ordered]@{
    environment = $Environment
    checkedAt = (Get-Date).ToString('o')
    isComplete = $isComplete
    failedCheckCount = $failedChecks.Count
    checks = $results
    remediation = [ordered]@{
        onboarding = ".\scripts\Start-Onboarding.ps1 -Environment $Environment"
        validation = ".\scripts\Validate-DeploymentSetup.ps1 -Environment $Environment"
    }
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 8 | Write-Output
}
else {
    foreach ($check in $results) {
        if ($Quiet -and $check.passed) {
            continue
        }

        $prefix = if ($check.passed) { '[PASS]' } else { '[FAIL]' }
        $color = if ($check.passed) { 'Green' } else { 'Red' }
        Write-Host "$prefix $($check.name)" -ForegroundColor $color
        if (-not [string]::IsNullOrWhiteSpace($check.detail)) {
            Write-Host "       $($check.detail)" -ForegroundColor DarkGray
        }
        if (-not $check.passed -and -not [string]::IsNullOrWhiteSpace($check.remediation)) {
            Write-Host "       Remediation: $($check.remediation)" -ForegroundColor Yellow
        }
    }

    Write-Host ''
    if ($isComplete) {
        Write-Host "[Onboarding] Completion status: COMPLETE for '$Environment'." -ForegroundColor Green
    }
    else {
        Write-Host "[Onboarding] Completion status: INCOMPLETE for '$Environment'." -ForegroundColor Yellow
        Write-Host "[Onboarding] Next steps:" -ForegroundColor Yellow
        Write-Host "  1. .\scripts\Start-Onboarding.ps1 -Environment $Environment" -ForegroundColor DarkGray
        Write-Host "  2. .\scripts\Validate-DeploymentSetup.ps1 -Environment $Environment" -ForegroundColor DarkGray
    }
}

if ($isComplete) {
    exit 0
}

exit 2
