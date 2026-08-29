<#
.SYNOPSIS
    Interactive onboarding bootstrap with optional GitHub configuration sync.
.DESCRIPTION
    Captures onboarding inputs for the starter template, validates values
    against the onboarding contract, prints a preview summary, and can
    apply the captured values using the existing token/apply workflow.

    Users can keep onboarding local-only, or optionally mirror approved
    non-secret values to GitHub repository variables and the Dataverse
    client secret to a GitHub repository secret when GitHub-hosted
    automation is needed.

    Existing setup scripts remain the source of truth for apply/validation:
      - .\scripts\Apply-ProjectTokens.ps1
      - .\scripts\Validate-DeploymentSetup.ps1
.PARAMETER Environment
    Target environment for onboarding. Default: dev.
.PARAMETER NonInteractive
    Uses provided parameter values only and skips prompts.
.PARAMETER DryRun
    Shows preview output. No files are modified.
.PARAMETER Force
    Overwrites existing non-placeholder values without confirmation prompts.
.PARAMETER NoBackup
    Skips backup creation before writing changed files.
.PARAMETER PreflightOnly
    Runs prerequisite checks only and exits without prompting for onboarding inputs.
    In github-hosted mode, this enforces strict GitHub auth/scope checks.
.PARAMETER SkipPreflight
    Skips prerequisite checks. Intended for deterministic regression automation only.
.PARAMETER ProjectName
    Maps to YOUR_PROJECT_NAME.
.PARAMETER ProjectId
    Maps to YOUR_PROJECT_ID.
.PARAMETER GitHubOrg
    Maps to YOUR_GITHUB_ORG.
.PARAMETER SolutionName
    Maps to YOUR_SOLUTION_NAME.
.PARAMETER PublisherPrefix
    Maps to YOUR_PUBLISHER_PREFIX.
.PARAMETER EmailTemplatePrefix
    Maps to YOUR_EMAIL_TEMPLATE_PREFIX.
.PARAMETER OrgName
    Maps to YOUR_ORG_NAME.
.PARAMETER OrgUrl
    Maps to YOUR_ORG_URL (host only).
.PARAMETER TenantId
    Maps to YOUR_TENANT_ID.
.PARAMETER CloudEnvironment
    Maps to YOUR_CLOUD_ENV.
.PARAMETER ClientId
    Maps to YOUR_CLIENT_ID (optional).
.PARAMETER AgentAppId
    Maps to YOUR_AGENT_APP_ID (optional).
.PARAMETER PortalSlug
    Maps to YOUR_PORTAL_SLUG (optional).
.PARAMETER WebsiteId
    Maps to YOUR_WEBSITE_ID (optional).
.PARAMETER PortalFolder
    Maps to YOUR_PORTAL_FOLDER (optional).
.PARAMETER ProjectNumber
    Maps to YOUR_PROJECT_NUMBER (optional).
.PARAMETER ProjectLabel
    Maps to YOUR_PROJECT_LABEL (optional).
.PARAMETER ConfigurationMode
    Preferred onboarding storage path: local-only or github-hosted.
.PARAMETER GitHubRepository
    Target GitHub repository in owner/repo form when github-hosted mode is selected.
.PARAMETER DataverseClientSecretDev
    Secret follow-up value for DATAVERSE_CLIENT_SECRET_DEV. Written to .env and,
    in github-hosted mode, also mirrored to a GitHub repository secret when possible.
.EXAMPLE
    .\scripts\Start-Onboarding.ps1
    Starts interactive prompt, preview, and apply flow.
.EXAMPLE
    .\scripts\Start-Onboarding.ps1 -NonInteractive -DryRun -Environment dev -ProjectName "Contoso Service" -ProjectId contoso-service -GitHubOrg contoso -SolutionName contososervice -PublisherPrefix cso -EmailTemplatePrefix Contoso -OrgName Contoso -OrgUrl contoso-dev.crm.dynamics.com -TenantId 00000000-0000-0000-0000-000000000000 -CloudEnvironment commercial
    Runs non-interactive validation with preview output.
.EXAMPLE
    .\scripts\Start-Onboarding.ps1 -Environment dev -PreflightOnly
    Runs prerequisite checks and exits with a pass/fail summary.
.EXAMPLE
    .\scripts\Start-Onboarding.ps1 -Environment dev -ConfigurationMode github-hosted -GitHubRepository contoso/fairfax-311 -PreflightOnly
    Runs strict prerequisite checks for GitHub-hosted onboarding readiness.
.EXAMPLE
    .\scripts\Start-Onboarding.ps1 -Environment dev -ConfigurationMode github-hosted -GitHubRepository contoso/fairfax-311
    Runs onboarding and mirrors approved values to the specified GitHub repository.
#>
[CmdletBinding()]
param(
    [ValidateSet('dev', 'test', 'prod')]
    [string]$Environment = 'dev',
    [switch]$NonInteractive,
    [switch]$DryRun,
    [switch]$Force,
    [switch]$NoBackup,
    [switch]$PreflightOnly,
    [switch]$SkipPreflight,
    [string]$ProjectName,
    [string]$ProjectId,
    [string]$GitHubOrg,
    [string]$SolutionName,
    [string]$PublisherPrefix,
    [string]$EmailTemplatePrefix,
    [string]$OrgName,
    [string]$OrgUrl,
    [string]$TenantId,
    [ValidateSet('commercial', 'gcc', 'gcch', 'dod')]
    [string]$CloudEnvironment = 'commercial',
    [string]$ClientId,
    [string]$AgentAppId,
    [string]$PortalSlug,
    [string]$WebsiteId,
    [string]$PortalFolder,
    [string]$ProjectNumber,
    [string]$ProjectLabel,
    [ValidateSet('local-only', 'github-hosted')]
    [string]$ConfigurationMode,
    [string]$GitHubRepository,
    [string]$DataverseClientSecretDev
)

$ErrorActionPreference = 'Stop'

function Test-GuidValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $false
    }

    $guid = [Guid]::Empty
    return [Guid]::TryParse($Value, [ref]$guid)
}

function Normalize-NullableValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $null
    }

    return $Value.Trim()
}

function Get-PreviewNullableValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $null
    }

    return $Value.Trim()
}

function Read-ValidatedValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PromptText,
        [string]$HelpText,
        [string]$CurrentValue,
        [bool]$Required = $true,
        [scriptblock]$Validator,
        [string]$ValidationError = 'Invalid value.'
    )

    if ($NonInteractive) {
        return $CurrentValue
    }

    while ($true) {
        Write-Host $PromptText -ForegroundColor Cyan
        if ($HelpText) {
            Write-Host "  $HelpText" -ForegroundColor DarkGray
        }

        $raw = Read-Host '  Value'
        $value = if ([string]::IsNullOrWhiteSpace($raw)) { $CurrentValue } else { $raw.Trim() }

        if ([string]::IsNullOrWhiteSpace($value)) {
            if ($Required) {
                Write-Host "  [WARN] Value is required." -ForegroundColor Yellow
                continue
            }

            return $null
        }

        if ($null -ne $Validator -and -not (& $Validator $value)) {
            Write-Host "  [WARN] $ValidationError" -ForegroundColor Yellow
            continue
        }

        return $value
    }
}

function Read-ChoiceValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PromptText,
        [string]$HelpText,
        [Parameter(Mandatory = $true)]
        [hashtable]$Choices,
        [string]$CurrentValue
    )

    if ($NonInteractive) {
        return $CurrentValue
    }

    while ($true) {
        Write-Host $PromptText -ForegroundColor Cyan
        if ($HelpText) {
            Write-Host "  $HelpText" -ForegroundColor DarkGray
        }

        foreach ($entry in $Choices.GetEnumerator()) {
            Write-Host "  - $($entry.Key): $($entry.Value)" -ForegroundColor DarkGray
        }

        $raw = Read-Host '  Choice'
        $value = if ([string]::IsNullOrWhiteSpace($raw)) { $CurrentValue } else { $raw.Trim().ToLowerInvariant() }

        if (-not [string]::IsNullOrWhiteSpace($value) -and $Choices.ContainsKey($value)) {
            return $value
        }

        Write-Host "  [WARN] Choose one of: $($Choices.Keys -join ', ')." -ForegroundColor Yellow
    }
}

function Assert-RequiredValue {
    param(
        [string]$Name,
        [string]$Value,
        [scriptblock]$Validator,
        [string]$ValidationError
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "[Onboarding] Missing required value: $Name"
    }

    if ($null -ne $Validator -and -not (& $Validator $Value)) {
        throw "[Onboarding] Invalid $Name. $ValidationError"
    }
}

function Assert-OptionalValue {
    param(
        [string]$Name,
        [string]$Value,
        [scriptblock]$Validator,
        [string]$ValidationError
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return
    }

    if ($null -ne $Validator -and -not (& $Validator $Value)) {
        throw "[Onboarding] Invalid $Name. $ValidationError"
    }
}

function Confirm-Overwrite {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if ($Force) {
        return $true
    }

    if ($NonInteractive) {
        throw "[Onboarding] $Message Use -Force in non-interactive mode to allow overwrites."
    }

    while ($true) {
        $choice = Read-Host "$Message [Y/N]"
        if ($choice -match '^[Yy]') {
            return $true
        }
        if ($choice -match '^[Nn]') {
            return $false
        }
        Write-Host '  [WARN] Enter Y or N.' -ForegroundColor Yellow
    }
}

function Ensure-FileExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [string]$TemplatePath,
        [string]$DefaultContent = ''
    )

    if (Test-Path $Path) {
        return
    }

    if (Test-Path $TemplatePath) {
        Copy-Item -Path $TemplatePath -Destination $Path -Force
        Write-Host "[Onboarding] Created '$Path' from '$TemplatePath'." -ForegroundColor Green
        return
    }

    Set-Content -Path $Path -Value $DefaultContent -Encoding UTF8
    Write-Host "[Onboarding] Created '$Path' with default content." -ForegroundColor Green
}

function New-BackupIfNeeded {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if ($NoBackup -or -not (Test-Path $Path)) {
        return
    }

    $timestamp = Get-Date -Format 'yyyyMMddHHmmss'
    $backupPath = "$Path.bak.$timestamp"
    Copy-Item -Path $Path -Destination $backupPath -Force
    Write-Host "[Onboarding] Backup created: $backupPath" -ForegroundColor DarkGray
}

function Write-PreflightCheck {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [ValidateSet('pass', 'fail', 'warn')]
        [string]$Status,
        [string]$Detail,
        [string]$Remediation
    )

    switch ($Status) {
        'pass' {
            Write-Host "  [PASS] $Name" -ForegroundColor Green
            $script:preflightPassed++
        }
        'warn' {
            Write-Host "  [WARN] $Name" -ForegroundColor Yellow
            $script:preflightWarnings++
        }
        'fail' {
            Write-Host "  [FAIL] $Name" -ForegroundColor Red
            $script:preflightFailed++
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($Detail)) {
        Write-Host "         $Detail" -ForegroundColor DarkGray
    }
    if (($Status -eq 'fail' -or $Status -eq 'warn') -and -not [string]::IsNullOrWhiteSpace($Remediation)) {
        Write-Host "         Remediation: $Remediation" -ForegroundColor DarkGray
    }
}

function Test-WriteAccess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    try {
        if (Test-Path -LiteralPath $Path) {
            $item = Get-Item -LiteralPath $Path -ErrorAction Stop
            if ($item.PSIsContainer) {
                $probePath = Join-Path $item.FullName (".onboarding-write-probe-$([Guid]::NewGuid().ToString('N')).tmp")
                Set-Content -LiteralPath $probePath -Value 'probe' -Encoding UTF8 -ErrorAction Stop
                Remove-Item -LiteralPath $probePath -Force -ErrorAction Stop
                return [ordered]@{
                    ok = $true
                    detail = "Write probe succeeded at '$($item.FullName)'."
                }
            }

            if ($item.IsReadOnly) {
                return [ordered]@{
                    ok = $false
                    detail = "File '$($item.FullName)' is read-only."
                }
            }

            $fileStream = [System.IO.File]::Open($item.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
            $fileStream.Close()
            return [ordered]@{
                ok = $true
                detail = "File '$($item.FullName)' is writable."
            }
        }

        $parentPath = Split-Path -Parent $Path
        if ([string]::IsNullOrWhiteSpace($parentPath)) {
            $parentPath = $Path
        }

        if (-not (Test-Path -LiteralPath $parentPath)) {
            return [ordered]@{
                ok = $false
                detail = "Parent path '$parentPath' does not exist."
            }
        }

        $probePath = Join-Path $parentPath (".onboarding-write-probe-$([Guid]::NewGuid().ToString('N')).tmp")
        Set-Content -LiteralPath $probePath -Value 'probe' -Encoding UTF8 -ErrorAction Stop
        Remove-Item -LiteralPath $probePath -Force -ErrorAction Stop
        return [ordered]@{
            ok = $true
            detail = "Parent path '$parentPath' is writable."
        }
    }
    catch {
        return [ordered]@{
            ok = $false
            detail = $_.Exception.Message
        }
    }
}

function Test-OnboardingPrerequisites {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [Parameter(Mandatory = $true)]
        [string]$ScriptDir,
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        [ValidateSet('local-only', 'github-hosted')]
        [string]$ConfigurationMode = 'local-only',
        [string]$GitHubRepository,
        [switch]$StrictGitHubChecks
    )

    $script:preflightPassed = 0
    $script:preflightFailed = 0
    $script:preflightWarnings = 0

    Write-Host '[Onboarding] Running prerequisite checks...' -ForegroundColor Cyan
    if ($ConfigurationMode -eq 'github-hosted') {
        Write-Host '[Onboarding] GitHub-hosted mode preflight is in scope.' -ForegroundColor DarkGray
    }
    else {
        Write-Host '[Onboarding] Local-only mode preflight detected. GitHub checks are advisory only.' -ForegroundColor DarkGray
    }

    $minimumVersion = [Version]'5.1'
    $currentVersion = $PSVersionTable.PSVersion
    Write-PreflightCheck -Name 'PowerShell version is supported (5.1+)' -Status $(if ($currentVersion -ge $minimumVersion) { 'pass' } else { 'fail' }) -Detail "Current version: $currentVersion" -Remediation 'Install PowerShell 7+ and rerun onboarding.'

    $pacCommand = Get-Command pac -ErrorAction SilentlyContinue
    if ($null -eq $pacCommand) {
        Write-PreflightCheck -Name 'PAC CLI is installed' -Status 'fail' -Remediation 'Install PAC CLI: https://learn.microsoft.com/power-platform/developer/cli/introduction'
    }
    else {
        $pacHelpOutput = (& pac help 2>&1 | Out-String).Trim()
        $pacCliHealthy = $LASTEXITCODE -eq 0
        Write-PreflightCheck -Name 'PAC CLI is installed' -Status $(if ($pacCliHealthy) { 'pass' } else { 'fail' }) -Detail "Command path: $($pacCommand.Source)" -Remediation 'Reinstall or repair PAC CLI installation.'

        if ($pacCliHealthy) {
            $pacAuthOutput = (& pac auth who 2>&1 | Out-String).Trim()
            $pacAuthOk = $LASTEXITCODE -eq 0
            Write-PreflightCheck -Name 'PAC CLI authentication session is available' -Status $(if ($pacAuthOk) { 'pass' } else { 'fail' }) -Detail $(if ($pacAuthOutput) { $pacAuthOutput } else { $null }) -Remediation 'Run: pac auth create --environment https://<your-org>.crm.dynamics.com'
        }
        else {
            Write-PreflightCheck -Name 'PAC CLI can execute commands' -Status 'fail' -Detail $pacHelpOutput -Remediation 'Run "pac help" locally to troubleshoot CLI installation.'
        }
    }

    $ghCommand = Get-Command gh -ErrorAction SilentlyContinue
    $githubCheckFailureStatus = if ($StrictGitHubChecks) { 'fail' } else { 'warn' }
    if ($null -eq $ghCommand) {
        $ghInstallRemediation = if ($ConfigurationMode -eq 'github-hosted') {
            "Install GitHub CLI and rerun: .\scripts\Start-Onboarding.ps1 -Environment $Environment -ConfigurationMode github-hosted -PreflightOnly"
        }
        else {
            'Install GitHub CLI if you plan to use GitHub-hosted onboarding setup.'
        }
        Write-PreflightCheck -Name 'GitHub CLI (gh) is installed' -Status $githubCheckFailureStatus -Remediation $ghInstallRemediation
    }
    else {
        $ghVersionOutput = (& gh --version 2>&1 | Select-Object -First 1 | Out-String).Trim()
        Write-PreflightCheck -Name 'GitHub CLI (gh) is installed' -Status 'pass' -Detail $(if ($ghVersionOutput) { $ghVersionOutput } else { $null })

        $ghAuthOutput = (& gh auth status 2>&1 | Out-String).Trim()
        $ghAuthOk = $LASTEXITCODE -eq 0
        $ghAuthRemediation = if ($ConfigurationMode -eq 'github-hosted') {
            "Run: gh auth login ; then rerun: .\scripts\Start-Onboarding.ps1 -Environment $Environment -ConfigurationMode github-hosted -PreflightOnly"
        }
        else {
            'Run: gh auth login if you plan to use GitHub-hosted onboarding setup.'
        }
        Write-PreflightCheck -Name 'GitHub CLI authentication session is available' -Status $(if ($ghAuthOk) { 'pass' } else { $githubCheckFailureStatus }) -Detail $ghAuthOutput -Remediation $ghAuthRemediation

        if ($ghAuthOk) {
            $scopeMatch = [regex]::Match($ghAuthOutput, '(?im)token scopes:\s*(.+)$')
            if ($scopeMatch.Success) {
                $rawScopes = $scopeMatch.Groups[1].Value
                $detectedScopes = @()
                foreach ($scope in ($rawScopes -split ',')) {
                    $cleanScope = (($scope -replace "[`"']", '').Trim()).ToLowerInvariant()
                    if (-not [string]::IsNullOrWhiteSpace($cleanScope)) {
                        $detectedScopes += $cleanScope
                    }
                }

                $hasRepoScope = $detectedScopes -contains 'repo'
                $scopeDetail = if ($detectedScopes.Count -gt 0) {
                    "Detected scopes: $($detectedScopes -join ', ')"
                }
                else {
                    "Detected scopes: $rawScopes"
                }
                $scopeRemediation = 'Run: gh auth refresh -h github.com -s repo ; then verify with: gh auth status'

                Write-PreflightCheck -Name "GitHub token includes 'repo' scope for hosted sync" -Status $(if ($hasRepoScope) { 'pass' } else { $githubCheckFailureStatus }) -Detail $scopeDetail -Remediation $scopeRemediation
            }
            else {
                Write-PreflightCheck -Name 'GitHub token scopes are discoverable from gh auth status output' -Status 'warn' -Detail 'Could not parse token scopes from GitHub CLI output.' -Remediation 'Run: gh auth status ; if needed, refresh scopes with: gh auth refresh -h github.com -s repo'
            }

            if ($ConfigurationMode -eq 'github-hosted' -and -not [string]::IsNullOrWhiteSpace($GitHubRepository)) {
                $repoAccessOutput = (& gh repo view $GitHubRepository --json nameWithOwner --jq '.nameWithOwner' 2>&1 | Out-String).Trim()
                $repoAccessOk = $LASTEXITCODE -eq 0
                Write-PreflightCheck -Name "GitHub repo access is available for '$GitHubRepository'" -Status $(if ($repoAccessOk) { 'pass' } else { $githubCheckFailureStatus }) -Detail $repoAccessOutput -Remediation "Run: gh repo view $GitHubRepository ; request repository access if needed."
            }
            elseif ($ConfigurationMode -eq 'github-hosted') {
                Write-PreflightCheck -Name 'GitHub repository target provided for hosted preflight' -Status 'warn' -Detail 'No -GitHubRepository value was supplied.' -Remediation "Pass -GitHubRepository owner/repo for strict hosted preflight checks."
            }
        }
    }

    $requiredFiles = @(
        [ordered]@{
            name = 'project.tokens.example.json exists'
            path = Join-Path $RepoRoot 'project.tokens.example.json'
            remediation = "Restore '$((Join-Path $RepoRoot 'project.tokens.example.json'))' from the template baseline."
        },
        [ordered]@{
            name = "scripts/config-$Environment.example.json exists"
            path = Join-Path $ScriptDir "config-$Environment.example.json"
            remediation = "Add '$((Join-Path $ScriptDir "config-$Environment.example.json"))' before running onboarding."
        },
        [ordered]@{
            name = '.env.example exists'
            path = Join-Path $RepoRoot '.env.example'
            remediation = "Add '$((Join-Path $RepoRoot '.env.example'))' with placeholder values."
        },
        [ordered]@{
            name = 'Apply-ProjectTokens.ps1 exists'
            path = Join-Path $ScriptDir 'Apply-ProjectTokens.ps1'
            remediation = "Restore '$((Join-Path $ScriptDir 'Apply-ProjectTokens.ps1'))' from source control."
        }
    )

    foreach ($requiredFile in $requiredFiles) {
        $exists = Test-Path -LiteralPath $requiredFile.path
        Write-PreflightCheck -Name $requiredFile.name -Status $(if ($exists) { 'pass' } else { 'fail' }) -Detail $(if ($exists) { $requiredFile.path } else { $null }) -Remediation $requiredFile.remediation
    }

    $writeTargets = @(
        [ordered]@{
            name = 'Repository root is writable'
            path = $RepoRoot
            remediation = 'Grant write access to the repository root or move the repo to a writable location.'
        },
        [ordered]@{
            name = 'scripts folder is writable'
            path = $ScriptDir
            remediation = 'Grant write access to the scripts folder.'
        },
        [ordered]@{
            name = 'project.tokens.json path is writable'
            path = Join-Path $RepoRoot 'project.tokens.json'
            remediation = "Grant write access to '$((Join-Path $RepoRoot 'project.tokens.json'))' or its parent folder."
        },
        [ordered]@{
            name = "config-$Environment.json path is writable"
            path = Join-Path $ScriptDir "config-$Environment.json"
            remediation = "Grant write access to '$((Join-Path $ScriptDir "config-$Environment.json"))' or its parent folder."
        },
        [ordered]@{
            name = '.env path is writable'
            path = Join-Path $RepoRoot '.env'
            remediation = "Grant write access to '$((Join-Path $RepoRoot '.env'))' or its parent folder."
        }
    )

    foreach ($target in $writeTargets) {
        $writeAccess = Test-WriteAccess -Path $target.path
        Write-PreflightCheck -Name $target.name -Status $(if ($writeAccess.ok) { 'pass' } else { 'fail' }) -Detail $writeAccess.detail -Remediation $target.remediation
    }

    Write-Host ''
    Write-Host '[Onboarding] Preflight summary:' -ForegroundColor Cyan
    Write-Host "  [PASS] $script:preflightPassed checks"
    if ($script:preflightWarnings -gt 0) {
        Write-Host "  [WARN] $script:preflightWarnings checks" -ForegroundColor Yellow
    }
    if ($script:preflightFailed -gt 0) {
        Write-Host "  [FAIL] $script:preflightFailed checks" -ForegroundColor Red
        Write-Host '  Resolve failed checks and rerun: .\scripts\Start-Onboarding.ps1 -Environment dev -PreflightOnly' -ForegroundColor Red
        return $false
    }

    Write-Host '  [PASS] All prerequisite checks passed.' -ForegroundColor Green
    return $true
}

function Set-OrderedValue {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Map,
        [Parameter(Mandatory = $true)]
        [string]$Key,
        $Value
    )

    $Map[$Key] = $Value
}

function Get-GitHubRepositoryTarget {
    param(
        [string]$CurrentValue,
        [string]$FallbackRepository,
        [scriptblock]$Validator
    )

    $detectedRepository = $null
    $ghCommand = Get-Command gh -ErrorAction SilentlyContinue
    if ($null -ne $ghCommand) {
        $detectedOutput = (& gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>$null | Out-String).Trim()
        if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($detectedOutput)) {
            $detectedRepository = $detectedOutput
        }
    }

    $defaultRepository = if (-not [string]::IsNullOrWhiteSpace($CurrentValue)) {
        $CurrentValue
    }
    elseif (-not [string]::IsNullOrWhiteSpace($detectedRepository)) {
        $detectedRepository
    }
    else {
        $FallbackRepository
    }

    if ($NonInteractive) {
        return $defaultRepository
    }

    return Read-ValidatedValue `
        -PromptText 'Which GitHub repository should receive the hosted onboarding values?' `
        -HelpText 'Use owner/repo. Press Enter to accept the detected or inferred repository.' `
        -CurrentValue $defaultRepository `
        -Required $true `
        -Validator $Validator `
        -ValidationError 'Use owner/repo format.'
}

function Invoke-GitHubCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [string]$StdInText
    )

    $output = if ($PSBoundParameters.ContainsKey('StdInText')) {
        $StdInText | & gh @Arguments 2>&1
    }
    else {
        & gh @Arguments 2>&1
    }

    $exitCode = $LASTEXITCODE
    return [ordered]@{
        success = $exitCode -eq 0
        output = ($output | Out-String).Trim()
        exitCode = $exitCode
    }
}

function Sync-GitHubRepositoryConfig {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Repository,
        [Parameter(Mandatory = $true)]
        [hashtable]$VariableMap,
        [string]$DataverseClientSecretDev
    )

    $ghCommand = Get-Command gh -ErrorAction SilentlyContinue
    if ($null -eq $ghCommand) {
        Write-Host "[GitHub] GitHub CLI is not installed. Skipping GitHub-hosted setup for '$Repository'." -ForegroundColor Yellow
        Write-Host '         Install GitHub CLI and rerun onboarding, or manually create the repository variables/secrets.' -ForegroundColor DarkGray
        return
    }

    $authStatus = Invoke-GitHubCommand -Arguments @('auth', 'status')
    if (-not $authStatus.success) {
        Write-Host "[GitHub] GitHub CLI is not authenticated. Skipping GitHub-hosted setup for '$Repository'." -ForegroundColor Yellow
        if ($authStatus.output) {
            Write-Host "         $($authStatus.output -replace '\r?\n', ' ')" -ForegroundColor DarkGray
        }
        Write-Host '         Run: gh auth login' -ForegroundColor DarkGray
        return
    }

    $repoCheck = Invoke-GitHubCommand -Arguments @('repo', 'view', $Repository, '--json', 'nameWithOwner', '--jq', '.nameWithOwner')
    if (-not $repoCheck.success) {
        Write-Host "[GitHub] Could not access repository '$Repository'. Skipping GitHub-hosted setup." -ForegroundColor Yellow
        if ($repoCheck.output) {
            Write-Host "         $($repoCheck.output -replace '\r?\n', ' ')" -ForegroundColor DarkGray
        }
        Write-Host '         Verify repo access and rerun onboarding, or create the repository variables/secrets manually.' -ForegroundColor DarkGray
        return
    }

    Write-Host "[GitHub] Syncing onboarding values to '$Repository'..." -ForegroundColor Cyan

    $variableSuccessCount = 0
    $variableFailureCount = 0
    foreach ($entry in $VariableMap.GetEnumerator()) {
        $result = Invoke-GitHubCommand -Arguments @('variable', 'set', $entry.Key, '--repo', $Repository, '--body', [string]$entry.Value)
        if ($result.success) {
            $variableSuccessCount++
            Write-Host "[GitHub] Set repository variable '$($entry.Key)'." -ForegroundColor Green
            continue
        }

        $variableFailureCount++
        Write-Host "[GitHub] Failed to set repository variable '$($entry.Key)'." -ForegroundColor Yellow
        if ($result.output) {
            Write-Host "         $($result.output -replace '\r?\n', ' ')" -ForegroundColor DarkGray
        }
        Write-Host "         Fallback value: $($entry.Value)" -ForegroundColor DarkGray
        Write-Host "         Command: gh variable set $($entry.Key) --repo $Repository --body `"$([string]$entry.Value -replace '"', '\"')`"" -ForegroundColor DarkGray
    }

    if ($variableFailureCount -eq 0) {
        Write-Host "[GitHub] Repository variable sync completed ($variableSuccessCount variables)." -ForegroundColor Green
    }
    else {
        Write-Host "[GitHub] Repository variable sync completed with $variableFailureCount failure(s)." -ForegroundColor Yellow
    }

    if ([string]::IsNullOrWhiteSpace($DataverseClientSecretDev)) {
        Write-Host '[GitHub] DATAVERSE_CLIENT_SECRET_DEV was not provided. Repository secret setup was skipped.' -ForegroundColor Yellow
        Write-Host "         When ready, run: gh secret set DATAVERSE_CLIENT_SECRET_DEV --repo $Repository" -ForegroundColor DarkGray
        return
    }

    $secretResult = Invoke-GitHubCommand -Arguments @('secret', 'set', 'DATAVERSE_CLIENT_SECRET_DEV', '--repo', $Repository) -StdInText $DataverseClientSecretDev
    if ($secretResult.success) {
        Write-Host "[GitHub] Set repository secret 'DATAVERSE_CLIENT_SECRET_DEV'." -ForegroundColor Green
        return
    }

    Write-Host "[GitHub] Failed to set repository secret 'DATAVERSE_CLIENT_SECRET_DEV'." -ForegroundColor Yellow
    if ($secretResult.output) {
        Write-Host "         $($secretResult.output -replace '\r?\n', ' ')" -ForegroundColor DarkGray
    }
    Write-Host "         Rerun locally after fixing access: gh secret set DATAVERSE_CLIENT_SECRET_DEV --repo $Repository" -ForegroundColor DarkGray
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$tokensPath = Join-Path $repoRoot 'project.tokens.json'
$tokensExamplePath = Join-Path $repoRoot 'project.tokens.example.json'
$configPath = Join-Path $scriptDir "config-$Environment.json"
$configExamplePath = Join-Path $scriptDir "config-$Environment.example.json"
$envPath = Join-Path $repoRoot '.env'
$envExamplePath = Join-Path $repoRoot '.env.example'

if ([string]::IsNullOrWhiteSpace($ConfigurationMode)) {
    $ConfigurationMode = 'local-only'
}
else {
    $ConfigurationMode = $ConfigurationMode.Trim().ToLowerInvariant()
}

Write-Host ''
if (-not $SkipPreflight) {
    $strictGitHubPreflight = $PreflightOnly -and $ConfigurationMode -eq 'github-hosted'
    $preflightPassed = Test-OnboardingPrerequisites -RepoRoot $repoRoot -ScriptDir $scriptDir -Environment $Environment -ConfigurationMode $ConfigurationMode -GitHubRepository $GitHubRepository -StrictGitHubChecks:$strictGitHubPreflight
    if (-not $preflightPassed) {
        throw '[Onboarding] Prerequisite checks failed. Resolve the failures and rerun.'
    }
}
else {
    Write-Host '[Onboarding] SkipPreflight enabled. Prerequisite checks were skipped for automation.' -ForegroundColor Yellow
}

if ($PreflightOnly) {
    Write-Host '[Onboarding] Preflight-only mode complete.' -ForegroundColor Green
    return
}

$projectNameValidator = { param($v) $v.Length -ge 3 -and $v.Length -le 80 }
$projectIdValidator = { param($v) $v -match '^[a-z0-9]+(?:-[a-z0-9]+)*$' }
$githubOrgValidator = { param($v) $v -match '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$' }
$solutionNameValidator = { param($v) $v -notmatch '\s' }
$publisherPrefixValidator = { param($v) $v -match '^[a-z0-9]{2,8}$' }
$emailTemplatePrefixValidator = { param($v) $v -notmatch '\s' }
$orgUrlValidator = { param($v) $v -notmatch 'https?://' -and $v -notmatch '/' -and $v -notmatch '\s' }
$cloudValidator = { param($v) $v -in @('commercial', 'gcc', 'gcch', 'dod') }
$portalSlugValidator = { param($v) $v -match '^[a-z0-9]+(?:-[a-z0-9]+)*$' }
$projectNumberValidator = { param($v) $v -match '^[1-9]\d*$' }
$projectLabelValidator = { param($v) $v -match '^project:[a-z0-9]+(?:-[a-z0-9]+)*$' }
$githubRepositoryValidator = { param($v) $v -match '^[^/\s]+/[^/\s]+$' }

Write-Host '[Onboarding] Start-Onboarding prompt and validation phase.' -ForegroundColor Cyan
Write-Host '[Onboarding] Dry-run previews changes. Non-dry mode applies them.' -ForegroundColor Yellow
Write-Host ''

Write-Host '[Onboarding] Current file readiness:' -ForegroundColor Cyan
Write-Host "  project.tokens.json       : $(if (Test-Path $tokensPath) { 'present' } else { 'missing (copy from project.tokens.example.json)' })"
Write-Host "  project.tokens.example.json: $(if (Test-Path $tokensExamplePath) { 'present' } else { 'missing' })"
Write-Host "  scripts/config-$Environment.json: $(if (Test-Path $configPath) { 'present' } else { "missing (copy from config-$Environment.example.json)" })"
Write-Host "  scripts/config-$Environment.example.json: $(if (Test-Path $configExamplePath) { 'present' } else { 'missing' })"
Write-Host "  .env                      : $(if (Test-Path $envPath) { 'present' } else { 'missing (copy from .env.example)' })"
Write-Host "  .env.example              : $(if (Test-Path $envExamplePath) { 'present' } else { 'missing' })"
Write-Host ''

if (-not $NonInteractive) {
    Write-Host '[Onboarding] Project identity' -ForegroundColor Green
}
$ProjectName = Read-ValidatedValue -PromptText 'What is the human-readable name of this project?' -HelpText 'Use the name that should appear in documentation, UI copy, and issue templates.' -CurrentValue $ProjectName -Required $true -Validator $projectNameValidator -ValidationError 'Use 3-80 characters.'
$ProjectId = Read-ValidatedValue -PromptText 'What short lowercase slug should this repo use for IDs and folder names?' -HelpText 'Use lowercase kebab-case, for example fairfax-311.' -CurrentValue $ProjectId -Required $true -Validator $projectIdValidator -ValidationError 'Use lowercase kebab-case only.'
$GitHubOrg = Read-ValidatedValue -PromptText 'Which GitHub organization owns this repository?' -HelpText 'Enter only the organization slug, without @ or URL.' -CurrentValue $GitHubOrg -Required $true -Validator $githubOrgValidator -ValidationError 'Enter a valid GitHub org slug.'
$SolutionName = Read-ValidatedValue -PromptText 'What Dataverse solution unique name should this project use?' -HelpText 'Use the solution-level identifier with no spaces.' -CurrentValue $SolutionName -Required $true -Validator $solutionNameValidator -ValidationError 'Spaces are not allowed.'
$PublisherPrefix = Read-ValidatedValue -PromptText 'What Dataverse publisher prefix should be used for custom components?' -HelpText 'Use 2-8 lowercase letters or numbers, no underscore.' -CurrentValue $PublisherPrefix -Required $true -Validator $publisherPrefixValidator -ValidationError 'Use 2-8 lowercase letters/numbers.'
$EmailTemplatePrefix = Read-ValidatedValue -PromptText 'What prefix should managed email templates use?' -HelpText 'Press Enter to reuse the project ID.' -CurrentValue $EmailTemplatePrefix -Required $false -Validator $emailTemplatePrefixValidator -ValidationError 'Spaces are not allowed.'
if ([string]::IsNullOrWhiteSpace($EmailTemplatePrefix)) {
    $EmailTemplatePrefix = $ProjectId
}

if (-not $NonInteractive) {
    Write-Host ''
    Write-Host "[Onboarding] $Environment environment" -ForegroundColor Green
}
$OrgName = Read-ValidatedValue -PromptText "What is the Dataverse org or business name for the $Environment environment?" -HelpText 'This is the friendly environment/business name used across docs and templates.' -CurrentValue $OrgName -Required $true
$OrgUrl = Read-ValidatedValue -PromptText "What is the Dataverse host name for the $Environment environment?" -HelpText 'Enter host only, for example andworx-development.crm.dynamics.com.' -CurrentValue $OrgUrl -Required $true -Validator $orgUrlValidator -ValidationError 'Use host only; no protocol, path, or spaces.'
$TenantId = Read-ValidatedValue -PromptText 'What Microsoft Entra tenant ID should this project use?' -HelpText 'Enter the tenant GUID.' -CurrentValue $TenantId -Required $true -Validator { param($v) Test-GuidValue $v } -ValidationError 'Enter a valid GUID.'
$CloudEnvironment = Read-ValidatedValue -PromptText 'Which cloud environment does this Dataverse org use?' -HelpText 'Choose one: commercial, gcc, gcch, dod.' -CurrentValue $CloudEnvironment -Required $true -Validator $cloudValidator -ValidationError 'Choose commercial, gcc, gcch, or dod.'

if (-not $NonInteractive) {
    Write-Host ''
    Write-Host '[Onboarding] Optional feature inputs' -ForegroundColor Green
}
$ClientId = Read-ValidatedValue -PromptText 'Do you already have an app registration client ID for this project?' -HelpText 'Leave blank if not needed yet.' -CurrentValue $ClientId -Required $false -Validator { param($v) Test-GuidValue $v } -ValidationError 'Enter a valid GUID or leave blank.'
$AgentAppId = Read-ValidatedValue -PromptText 'Do you need a Copilot Studio app registration ID now?' -HelpText 'Leave blank unless needed for agent integration.' -CurrentValue $AgentAppId -Required $false -Validator { param($v) Test-GuidValue $v } -ValidationError 'Enter a valid GUID or leave blank.'
$PortalSlug = Read-ValidatedValue -PromptText 'Does this project include Power Pages, and if so what is the portal slug?' -HelpText 'Leave blank if there is no portal in scope.' -CurrentValue $PortalSlug -Required $false -Validator $portalSlugValidator -ValidationError 'Use lowercase kebab-case or leave blank.'
$WebsiteId = Read-ValidatedValue -PromptText 'What is the Power Pages website ID?' -HelpText 'Only needed when the project includes a portal.' -CurrentValue $WebsiteId -Required $false -Validator { param($v) Test-GuidValue $v } -ValidationError 'Enter a valid GUID or leave blank.'
$PortalFolder = Read-ValidatedValue -PromptText 'What parent folder name should PAC use for portal downloads?' -HelpText 'Only needed when the project includes a portal.' -CurrentValue $PortalFolder -Required $false
$ProjectNumber = Read-ValidatedValue -PromptText 'Will this repo use a GitHub Projects board, and if so what is the project number?' -HelpText 'Leave blank if board automation is out of scope.' -CurrentValue $ProjectNumber -Required $false -Validator $projectNumberValidator -ValidationError 'Use a positive integer or leave blank.'
$ProjectLabel = Read-ValidatedValue -PromptText 'What label should trigger project-board tracking?' -HelpText 'Use a value like project:fairfax-311, or leave blank.' -CurrentValue $ProjectLabel -Required $false -Validator $projectLabelValidator -ValidationError 'Use format project:my-project or leave blank.'

if (-not $NonInteractive) {
    Write-Host ''
    Write-Host '[Onboarding] Configuration path' -ForegroundColor Green
}
$ConfigurationMode = Read-ChoiceValue -PromptText 'Where should onboarding values be stored for ongoing setup?' -HelpText 'Local-only keeps setup in repo files and .env. GitHub-hosted also mirrors approved values into repository variables/secrets for hosted automation.' -Choices ([ordered]@{
    'local-only' = 'Write onboarding values to local repo files only.'
    'github-hosted' = 'Also mirror approved values to GitHub repository variables/secrets.'
}) -CurrentValue $ConfigurationMode

if ($ConfigurationMode -eq 'github-hosted') {
    $GitHubRepository = Get-GitHubRepositoryTarget -CurrentValue $GitHubRepository -FallbackRepository "$GitHubOrg/$ProjectId" -Validator $githubRepositoryValidator
}

if (-not $NonInteractive) {
    Write-Host ''
    Write-Host '[Onboarding] Secret capture' -ForegroundColor Green
}
$DataverseClientSecretDev = Read-ValidatedValue -PromptText 'What is the Dataverse client secret for the dev environment?' -HelpText 'Will be written to .env and, in github-hosted mode, mirrored to a repository secret when GitHub access is available. Leave blank for now if unknown.' -CurrentValue $DataverseClientSecretDev -Required $false

$ProjectName = Normalize-NullableValue $ProjectName
$ProjectId = Normalize-NullableValue $ProjectId
$GitHubOrg = Normalize-NullableValue $GitHubOrg
$SolutionName = Normalize-NullableValue $SolutionName
$PublisherPrefix = Normalize-NullableValue $PublisherPrefix
$EmailTemplatePrefix = Normalize-NullableValue $EmailTemplatePrefix
$OrgName = Normalize-NullableValue $OrgName
$OrgUrl = Normalize-NullableValue $OrgUrl
$TenantId = Normalize-NullableValue $TenantId
$CloudEnvironment = Normalize-NullableValue $CloudEnvironment
$ClientId = Normalize-NullableValue $ClientId
$AgentAppId = Normalize-NullableValue $AgentAppId
$PortalSlug = Normalize-NullableValue $PortalSlug
$WebsiteId = Normalize-NullableValue $WebsiteId
$PortalFolder = Normalize-NullableValue $PortalFolder
$ProjectNumber = Normalize-NullableValue $ProjectNumber
$ProjectLabel = Normalize-NullableValue $ProjectLabel
$ConfigurationMode = Normalize-NullableValue $ConfigurationMode
$GitHubRepository = Normalize-NullableValue $GitHubRepository
$DataverseClientSecretDev = Normalize-NullableValue $DataverseClientSecretDev

Assert-RequiredValue -Name 'YOUR_PROJECT_NAME' -Value $ProjectName -Validator $projectNameValidator -ValidationError 'Use 3-80 characters.'
Assert-RequiredValue -Name 'YOUR_PROJECT_ID' -Value $ProjectId -Validator $projectIdValidator -ValidationError 'Use lowercase kebab-case.'
Assert-RequiredValue -Name 'YOUR_GITHUB_ORG' -Value $GitHubOrg -Validator $githubOrgValidator -ValidationError 'Use a valid GitHub organization slug.'
Assert-RequiredValue -Name 'YOUR_SOLUTION_NAME' -Value $SolutionName -Validator $solutionNameValidator -ValidationError 'Spaces are not allowed.'
Assert-RequiredValue -Name 'YOUR_PUBLISHER_PREFIX' -Value $PublisherPrefix -Validator $publisherPrefixValidator -ValidationError 'Use 2-8 lowercase letters or numbers.'
Assert-RequiredValue -Name 'YOUR_EMAIL_TEMPLATE_PREFIX' -Value $EmailTemplatePrefix -Validator $emailTemplatePrefixValidator -ValidationError 'Spaces are not allowed.'
Assert-RequiredValue -Name 'YOUR_ORG_NAME' -Value $OrgName -ValidationError 'Value is required.'
Assert-RequiredValue -Name 'YOUR_ORG_URL' -Value $OrgUrl -Validator $orgUrlValidator -ValidationError 'Use host only with no protocol/path.'
Assert-RequiredValue -Name 'YOUR_TENANT_ID' -Value $TenantId -Validator { param($v) Test-GuidValue $v } -ValidationError 'Enter a valid GUID.'
Assert-RequiredValue -Name 'YOUR_CLOUD_ENV' -Value $CloudEnvironment -Validator $cloudValidator -ValidationError 'Use commercial, gcc, gcch, or dod.'

Assert-OptionalValue -Name 'YOUR_CLIENT_ID' -Value $ClientId -Validator { param($v) Test-GuidValue $v } -ValidationError 'Enter a valid GUID.'
Assert-OptionalValue -Name 'YOUR_AGENT_APP_ID' -Value $AgentAppId -Validator { param($v) Test-GuidValue $v } -ValidationError 'Enter a valid GUID.'
Assert-OptionalValue -Name 'YOUR_PORTAL_SLUG' -Value $PortalSlug -Validator $portalSlugValidator -ValidationError 'Use lowercase kebab-case.'
Assert-OptionalValue -Name 'YOUR_WEBSITE_ID' -Value $WebsiteId -Validator { param($v) Test-GuidValue $v } -ValidationError 'Enter a valid GUID.'
Assert-OptionalValue -Name 'YOUR_PROJECT_NUMBER' -Value $ProjectNumber -Validator $projectNumberValidator -ValidationError 'Use a positive integer.'
Assert-OptionalValue -Name 'YOUR_PROJECT_LABEL' -Value $ProjectLabel -Validator $projectLabelValidator -ValidationError 'Use project:my-project format.'
if ($ConfigurationMode -eq 'github-hosted') {
    Assert-RequiredValue -Name 'GitHub repository target' -Value $GitHubRepository -Validator $githubRepositoryValidator -ValidationError 'Use owner/repo format.'
}

$preview = [ordered]@{
    project = [ordered]@{
        'YOUR_PROJECT_NAME' = $ProjectName
        'YOUR_PROJECT_ID' = $ProjectId
        'YOUR_GITHUB_ORG' = $GitHubOrg
        'YOUR_SOLUTION_NAME' = $SolutionName
        'YOUR_PUBLISHER_PREFIX' = $PublisherPrefix
        'YOUR_EMAIL_TEMPLATE_PREFIX' = $EmailTemplatePrefix
    }
    environment = [ordered]@{
        name = $Environment
        required = [ordered]@{
            'YOUR_ORG_NAME' = $OrgName
            'YOUR_ORG_URL' = $OrgUrl
            'YOUR_TENANT_ID' = $TenantId
            'YOUR_CLOUD_ENV' = $CloudEnvironment
        }
        optional = [ordered]@{
            'YOUR_CLIENT_ID' = Get-PreviewNullableValue $ClientId
            'YOUR_AGENT_APP_ID' = Get-PreviewNullableValue $AgentAppId
            'YOUR_PORTAL_SLUG' = Get-PreviewNullableValue $PortalSlug
            'YOUR_WEBSITE_ID' = Get-PreviewNullableValue $WebsiteId
            'YOUR_PORTAL_FOLDER' = Get-PreviewNullableValue $PortalFolder
            'YOUR_PROJECT_NUMBER' = Get-PreviewNullableValue $ProjectNumber
            'YOUR_PROJECT_LABEL' = Get-PreviewNullableValue $ProjectLabel
        }
    }
    configuration = [ordered]@{
        mode = $ConfigurationMode
        githubRepository = if ($ConfigurationMode -eq 'github-hosted') { $GitHubRepository } else { $null }
    }
    secrets = [ordered]@{
        DATAVERSE_CLIENT_SECRET_DEV = if ([string]::IsNullOrWhiteSpace($DataverseClientSecretDev)) { '<not-provided>' } else { '<provided>' }
    }
}

Write-Host ''
Write-Host '[Onboarding] Preview of captured values (no writes):' -ForegroundColor Cyan
$preview | ConvertTo-Json -Depth 8 | Write-Host

$tokensAction = if (Test-Path $tokensPath) {
    'update-existing'
}
elseif (Test-Path $tokensExamplePath) {
    'create-from-example'
}
else {
    'create-new-file'
}

$configAction = if (Test-Path $configPath) {
    'update-existing'
}
elseif (Test-Path $configExamplePath) {
    'create-from-example'
}
else {
    'create-new-file'
}

$envAction = if (Test-Path $envPath) {
    'update-existing'
}
elseif (Test-Path $envExamplePath) {
    'create-from-example'
}
else {
    'create-new-file'
}

$writePlan = [ordered]@{
    mode = if ($DryRun) { 'preview-only' } else { 'preview-and-apply' }
    safety = [ordered]@{
        overwrite_confirmation_required = -not $Force
        backup_would_be_created = -not $NoBackup
    }
    github = [ordered]@{
        mode = $ConfigurationMode
        repository = if ($ConfigurationMode -eq 'github-hosted') { $GitHubRepository } else { $null }
        variable_updates = if ($ConfigurationMode -eq 'github-hosted') {
            @(
                'project.required.*'
                "$Environment.required.*"
                "$Environment.optional.* (non-null values only)"
            )
        }
        else {
            @('<none>')
        }
        secret_updates = if ($ConfigurationMode -eq 'github-hosted' -and -not [string]::IsNullOrWhiteSpace($DataverseClientSecretDev)) {
            @('DATAVERSE_CLIENT_SECRET_DEV')
        }
        else {
            @('<none>')
        }
    }
    files = @(
        [ordered]@{
            path = $tokensPath
            action = $tokensAction
            updates = @(
                'project.required.YOUR_PROJECT_NAME'
                'project.required.YOUR_PROJECT_ID'
                'project.required.YOUR_GITHUB_ORG'
                'project.required.YOUR_SOLUTION_NAME'
                'project.required.YOUR_PUBLISHER_PREFIX'
                'project.required.YOUR_EMAIL_TEMPLATE_PREFIX'
                "$Environment.required.YOUR_ORG_NAME"
                "$Environment.required.YOUR_ORG_URL"
                "$Environment.required.YOUR_TENANT_ID"
                "$Environment.required.YOUR_CLOUD_ENV"
                "$Environment.optional.YOUR_CLIENT_ID"
                "$Environment.optional.YOUR_AGENT_APP_ID"
                "$Environment.optional.YOUR_PORTAL_SLUG"
                "$Environment.optional.YOUR_WEBSITE_ID"
                "$Environment.optional.YOUR_PORTAL_FOLDER"
                "$Environment.optional.YOUR_PROJECT_NUMBER"
                "$Environment.optional.YOUR_PROJECT_LABEL"
            )
        }
        [ordered]@{
            path = $configPath
            action = $configAction
            updates = @(
                "Token-stamped values via .\scripts\Apply-ProjectTokens.ps1 -Environment $Environment"
            )
        }
        [ordered]@{
            path = $envPath
            action = $envAction
            updates = @(
                'DATAVERSE_CLIENT_SECRET_DEV'
            )
        }
    )
}

Write-Host ''
Write-Host '[Onboarding] Planned write actions (preview only):' -ForegroundColor Cyan
$writePlan | ConvertTo-Json -Depth 8 | Write-Host

Write-Host ''
if ($DryRun) {
    Write-Host '[Onboarding] Dry-run complete. No changes were made.' -ForegroundColor Green
    return
}

if (-not $NonInteractive -and -not $Force) {
    $proceedWithApply = Confirm-Overwrite -Message '[Onboarding] Proceed with applying the planned changes?'
    if (-not $proceedWithApply) {
        throw '[Onboarding] Apply cancelled by user.'
    }
}

Write-Host '[Onboarding] Applying onboarding changes...' -ForegroundColor Cyan

Ensure-FileExists -Path $tokensPath -TemplatePath $tokensExamplePath -DefaultContent '{}'
Ensure-FileExists -Path $configPath -TemplatePath $configExamplePath -DefaultContent '{}'
Ensure-FileExists -Path $envPath -TemplatePath $envExamplePath -DefaultContent ''

$tokenState = Get-Content -Path $tokensPath -Raw | ConvertFrom-Json -AsHashtable
if ($null -eq $tokenState) {
    $tokenState = @{}
}

if (-not $tokenState.ContainsKey('project') -or -not ($tokenState['project'] -is [hashtable])) {
    $tokenState['project'] = @{}
}
if (-not $tokenState['project'].ContainsKey('required') -or -not ($tokenState['project']['required'] -is [hashtable])) {
    $tokenState['project']['required'] = @{}
}
if (-not $tokenState.ContainsKey($Environment) -or -not ($tokenState[$Environment] -is [hashtable])) {
    $tokenState[$Environment] = @{}
}
if (-not $tokenState[$Environment].ContainsKey('required') -or -not ($tokenState[$Environment]['required'] -is [hashtable])) {
    $tokenState[$Environment]['required'] = @{}
}
if (-not $tokenState[$Environment].ContainsKey('optional') -or -not ($tokenState[$Environment]['optional'] -is [hashtable])) {
    $tokenState[$Environment]['optional'] = @{}
}

$projectRequiredUpdates = [ordered]@{
    'YOUR_PROJECT_NAME' = $ProjectName
    'YOUR_PROJECT_ID' = $ProjectId
    'YOUR_GITHUB_ORG' = $GitHubOrg
    'YOUR_SOLUTION_NAME' = $SolutionName
    'YOUR_PUBLISHER_PREFIX' = $PublisherPrefix
    'YOUR_EMAIL_TEMPLATE_PREFIX' = $EmailTemplatePrefix
}
$environmentRequiredUpdates = [ordered]@{
    'YOUR_ORG_NAME' = $OrgName
    'YOUR_ORG_URL' = $OrgUrl
    'YOUR_TENANT_ID' = $TenantId
    'YOUR_CLOUD_ENV' = $CloudEnvironment
}
$environmentOptionalUpdates = [ordered]@{
    'YOUR_CLIENT_ID' = Get-PreviewNullableValue $ClientId
    'YOUR_AGENT_APP_ID' = Get-PreviewNullableValue $AgentAppId
    'YOUR_PORTAL_SLUG' = Get-PreviewNullableValue $PortalSlug
    'YOUR_WEBSITE_ID' = Get-PreviewNullableValue $WebsiteId
    'YOUR_PORTAL_FOLDER' = Get-PreviewNullableValue $PortalFolder
    'YOUR_PROJECT_NUMBER' = Get-PreviewNullableValue $ProjectNumber
    'YOUR_PROJECT_LABEL' = Get-PreviewNullableValue $ProjectLabel
}
$githubVariableUpdates = [ordered]@{}
foreach ($entry in $projectRequiredUpdates.GetEnumerator()) {
    Set-OrderedValue -Map $githubVariableUpdates -Key $entry.Key -Value $entry.Value
}
foreach ($entry in $environmentRequiredUpdates.GetEnumerator()) {
    Set-OrderedValue -Map $githubVariableUpdates -Key $entry.Key -Value $entry.Value
}
foreach ($entry in $environmentOptionalUpdates.GetEnumerator()) {
    if ($null -eq $entry.Value) {
        continue
    }

    Set-OrderedValue -Map $githubVariableUpdates -Key $entry.Key -Value $entry.Value
}

$tokenOverwrites = [System.Collections.Generic.List[string]]::new()

foreach ($entry in $projectRequiredUpdates.GetEnumerator()) {
    $current = $tokenState['project']['required'][$entry.Key]
    if (-not [string]::IsNullOrWhiteSpace([string]$current) -and $current -ne $entry.Key -and $current -ne $entry.Value) {
        $tokenOverwrites.Add("project.required.$($entry.Key)")
    }
}
foreach ($entry in $environmentRequiredUpdates.GetEnumerator()) {
    $current = $tokenState[$Environment]['required'][$entry.Key]
    if (-not [string]::IsNullOrWhiteSpace([string]$current) -and $current -ne $entry.Key -and $current -ne $entry.Value) {
        $tokenOverwrites.Add("$Environment.required.$($entry.Key)")
    }
}
foreach ($entry in $environmentOptionalUpdates.GetEnumerator()) {
    if ($null -eq $entry.Value) {
        continue
    }

    $current = $tokenState[$Environment]['optional'][$entry.Key]
    if (-not [string]::IsNullOrWhiteSpace([string]$current) -and $current -ne $entry.Value) {
        $tokenOverwrites.Add("$Environment.optional.$($entry.Key)")
    }
}

if ($tokenOverwrites.Count -gt 0) {
    $proceed = Confirm-Overwrite -Message "[Onboarding] Existing token values will be overwritten: $($tokenOverwrites -join ', '). Continue?"
    if (-not $proceed) {
        throw '[Onboarding] Apply cancelled by user.'
    }
}

foreach ($entry in $projectRequiredUpdates.GetEnumerator()) {
    Set-OrderedValue -Map $tokenState['project']['required'] -Key $entry.Key -Value $entry.Value
}
foreach ($entry in $environmentRequiredUpdates.GetEnumerator()) {
    Set-OrderedValue -Map $tokenState[$Environment]['required'] -Key $entry.Key -Value $entry.Value
}
foreach ($entry in $environmentOptionalUpdates.GetEnumerator()) {
    $hasExisting = $tokenState[$Environment]['optional'].ContainsKey($entry.Key)
    if ($null -eq $entry.Value -and $hasExisting) {
        continue
    }

    Set-OrderedValue -Map $tokenState[$Environment]['optional'] -Key $entry.Key -Value $entry.Value
}

$tokenJson = $tokenState | ConvertTo-Json -Depth 8
$tokenCurrent = Get-Content -Path $tokensPath -Raw
if ($tokenCurrent -ne $tokenJson) {
    New-BackupIfNeeded -Path $tokensPath
    Set-Content -Path $tokensPath -Value $tokenJson -Encoding UTF8
    Write-Host "[Onboarding] Updated '$tokensPath'." -ForegroundColor Green
}

$envCurrent = Get-Content -Path $envPath -Raw
$envLines = [System.Collections.Generic.List[string]]::new()
if ($envCurrent.Length -gt 0) {
    foreach ($line in ($envCurrent -split "`r?`n")) {
        $envLines.Add($line)
    }
}

if (-not [string]::IsNullOrWhiteSpace($DataverseClientSecretDev)) {
    $secretKey = 'DATAVERSE_CLIENT_SECRET_DEV'
    $secretLineIndex = -1
    $existingSecret = $null
    for ($i = 0; $i -lt $envLines.Count; $i++) {
        if ($envLines[$i] -match '^DATAVERSE_CLIENT_SECRET_DEV\s*=') {
            $secretLineIndex = $i
            $existingSecret = ($envLines[$i] -replace '^DATAVERSE_CLIENT_SECRET_DEV\s*=\s*', '').Trim()
            break
        }
    }

    if ($secretLineIndex -ge 0 -and -not [string]::IsNullOrWhiteSpace($existingSecret) -and $existingSecret -ne 'your-dev-secret-here' -and $existingSecret -ne $DataverseClientSecretDev) {
        $proceed = Confirm-Overwrite -Message '[Onboarding] Existing DATAVERSE_CLIENT_SECRET_DEV value will be overwritten. Continue?'
        if (-not $proceed) {
            throw '[Onboarding] Apply cancelled by user.'
        }
    }

    if ($secretLineIndex -ge 0) {
        $envLines[$secretLineIndex] = "$secretKey=$DataverseClientSecretDev"
    }
    else {
        if ($envLines.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($envLines[$envLines.Count - 1])) {
            $envLines.Add('')
        }
        $envLines.Add("$secretKey=$DataverseClientSecretDev")
    }
}
else {
    Write-Host '[Onboarding] DATAVERSE_CLIENT_SECRET_DEV was not provided. Existing .env value was left unchanged.' -ForegroundColor Yellow
}

$envUpdated = ($envLines -join "`r`n").TrimEnd()
if ($envCurrent.TrimEnd() -ne $envUpdated) {
    New-BackupIfNeeded -Path $envPath
    Set-Content -Path $envPath -Value $envUpdated -Encoding UTF8
    Write-Host "[Onboarding] Updated '$envPath'." -ForegroundColor Green
}

$applyScript = Join-Path $scriptDir 'Apply-ProjectTokens.ps1'
if (-not (Test-Path $applyScript)) {
    throw "[Onboarding] Apply-ProjectTokens.ps1 not found at '$applyScript'."
}

Write-Host ''
Write-Host '[Onboarding] Running Apply-ProjectTokens.ps1...' -ForegroundColor Cyan
& $applyScript -Environment $Environment -SkipRemoteSync

if ($ConfigurationMode -eq 'github-hosted') {
    Write-Host ''
    Sync-GitHubRepositoryConfig -Repository $GitHubRepository -VariableMap $githubVariableUpdates -DataverseClientSecretDev $DataverseClientSecretDev
}
else {
    Write-Host ''
    Write-Host '[GitHub] Local-only mode selected. Skipping GitHub repository variable/secret setup.' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host '[Onboarding] Onboarding apply phase completed.' -ForegroundColor Green
Write-Host "[Onboarding] Next: run .\scripts\Validate-DeploymentSetup.ps1 -Environment $Environment" -ForegroundColor Green
Write-Host "[Onboarding] Then confirm status: .\scripts\Test-OnboardingCompletion.ps1 -Environment $Environment" -ForegroundColor Green
Write-Host ''
return
