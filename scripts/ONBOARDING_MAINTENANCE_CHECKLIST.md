# Onboarding maintenance checklist

Use this checklist whenever onboarding scripts, token templates, or onboarding docs are changed.

## 1. Script-level regression pass

```powershell
.\scripts\Test-OnboardingRegression.ps1 -Environment dev
```

Pass criteria:
- Smoke dry-run of `Start-Onboarding.ps1` succeeds.
- Artifact contract checks pass for `project.tokens.example.json`, `scripts/config-dev.example.json`, and `.env.example`.
- Existing onboarding workflow entry points remain present and parse cleanly.

## 2. Completion signal contract

```powershell
.\scripts\Test-OnboardingCompletion.ps1 -Environment dev -Json
```

Confirm the payload still includes:
- `isComplete`
- `failedCheckCount`
- `checks[]`
- `remediation.onboarding`
- `remediation.validation`

## 3. Human-run onboarding path

Validate docs and command path alignment:
1. `.\scripts\Start-Onboarding.ps1 -Environment dev`
2. `.\scripts\Validate-DeploymentSetup.ps1 -Environment dev`
3. `.\scripts\Test-OnboardingCompletion.ps1 -Environment dev`

## 4. Backward compatibility review

Confirm these existing flags still work as documented:
- `Start-Onboarding.ps1 -PreflightOnly`
- `Start-Onboarding.ps1 -DryRun`
- `Validate-DeploymentSetup.ps1 -TestConnection`
- `Test-OnboardingCompletion.ps1 -Json`

## 5. Documentation sync

If onboarding behavior changed, update all relevant docs in the same change set:
- `README.md` (first-run path)
- `scripts/DEPLOYMENT_GUIDE.md`
- `scripts/QUICK_REFERENCE.md`
- `scripts/README.md`
- `requirements/PLAN.md` status row
