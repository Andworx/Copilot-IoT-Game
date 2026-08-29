# scripts

## Purpose

This folder contains PowerShell automation for onboarding, validation, deployment orchestration, and Dataverse component import/export workflows.

## Structure

- `Start-Onboarding.ps1`: guided first-run setup (interactive/non-interactive).
- `Test-OnboardingCompletion.ps1`: deterministic completion signal for coding/deployment guardrails.
- `Test-OnboardingRegression.ps1`: repeatable onboarding smoke + contract + compatibility checks.
- `Validate-DeploymentSetup.ps1`: environment readiness validation.
- `Deploy-Project.ps1`: orchestrated import/export job runner.
- `DEPLOYMENT_GUIDE.md` and `QUICK_REFERENCE.md`: operator documentation.
- `ONBOARDING_MAINTENANCE_CHECKLIST.md`: checklist to run when onboarding assets/scripts change.

## Usage workflow

Run from repo root:

```powershell
.\scripts\Start-Onboarding.ps1 -Environment dev
.\scripts\Start-Onboarding.ps1 -Environment dev -ConfigurationMode github-hosted -GitHubRepository YOUR_ORG_NAME/YOUR_PROJECT_ID -PreflightOnly
.\scripts\Validate-DeploymentSetup.ps1 -Environment dev
.\scripts\Test-OnboardingCompletion.ps1 -Environment dev
.\scripts\Test-OnboardingRegression.ps1 -Environment dev
```

## Updating this README

Update this file whenever scripts are added/removed/renamed, onboarding commands change, or script workflow guidance changes.
