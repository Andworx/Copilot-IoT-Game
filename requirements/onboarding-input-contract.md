# Onboarding input contract

This document defines the canonical first-run setup UX for repos created from this template.

It is the source of truth for:

- the minimum path from a clean clone to a successful validation run
- the required and optional onboarding inputs
- prompt order and help text
- validation rules and defaults
- how each input maps to files in the repo

## Happy-path journey

The shortest supported journey to a first successful validation is:

1. Create a new repository from the template and clone it locally.
2. Open the repo in VS Code.
3. (Optional) Run `.\scripts\Start-Onboarding.ps1 -Environment dev -PreflightOnly` to validate prerequisites before entering onboarding inputs.
4. Run `.\scripts\Start-Onboarding.ps1 -Environment dev`.
5. Choose either the local-only path or the optional GitHub-hosted path for repository variables/secrets.
6. Review the preview and confirm apply when prompted.
7. If needed, re-run in preview mode only with `.\scripts\Start-Onboarding.ps1 -Environment dev -DryRun`.
8. Run `.\scripts\Validate-DeploymentSetup.ps1 -Environment dev`.

The bootstrap experience should optimize for `dev` first. `test` and `prod` can remain at placeholder values until the user is ready.

## Canonical input model

### Project-level required inputs

| Field | Token key | Required for first validation | Validation | Default | Example |
|---|---|---|---|---|---|
| Project display name | `YOUR_PROJECT_NAME` | Yes | 3-80 chars; plain-language product or solution name | None | `Fairfax County 311` |
| Project ID | `YOUR_PROJECT_ID` | Yes | lowercase kebab-case slug | None | `fairfax-311` |
| GitHub organization | `YOUR_GITHUB_ORG` | Yes | GitHub org slug; no `@` | None | `andworx` |
| Solution unique name | `YOUR_SOLUTION_NAME` | Yes | Dataverse solution-friendly identifier; no spaces | None | `fairfax311` |
| Publisher prefix | `YOUR_PUBLISHER_PREFIX` | Yes | 2-8 lowercase letters/numbers; no trailing underscore | None | `ffx` |
| Email template prefix | `YOUR_EMAIL_TEMPLATE_PREFIX` | Yes | short identifier with no spaces | `YOUR_PROJECT_ID` | `Fairfax311` |

### Environment required inputs (`dev` first)

| Field | Token key | Required for first validation | Validation | Default | Example |
|---|---|---|---|---|---|
| Environment org name | `YOUR_ORG_NAME` | Yes | business/environment display name | None | `andworx` |
| Environment org host | `YOUR_ORG_URL` | Yes | Dataverse host only; no protocol, path, or trailing slash | None | `andworx-development.crm.dynamics.com` |
| Tenant ID | `YOUR_TENANT_ID` | Yes | GUID | None | `7cea0515-0000-0000-0000-000000000000` |
| Cloud environment | `YOUR_CLOUD_ENV` | Yes | one of `commercial`, `gcc`, `gcch`, `dod` | `commercial` | `commercial` |

### Optional inputs

| Field | Token key | When needed | Validation | Default | Example |
|---|---|---|---|---|---|
| Client ID | `YOUR_CLIENT_ID` | Required for Power Automate and Dataverse app auth workflows | GUID | `null` | `347aeaed-0000-0000-0000-000000000000` |
| Agent app ID | `YOUR_AGENT_APP_ID` | Only if Copilot Studio assets need an app registration token | GUID | `null` | `5e75b5d1-0000-0000-0000-000000000000` |
| Portal slug | `YOUR_PORTAL_SLUG` | Only for Power Pages projects | lowercase slug | `null` | `fairfax-county-311` |
| Website ID | `YOUR_WEBSITE_ID` | Only for Power Pages projects | GUID | `null` | `5ae8f94a-0000-0000-0000-000000000000` |
| Portal folder | `YOUR_PORTAL_FOLDER` | Only for Power Pages projects | folder-safe string | `null` | `andworx-311-portal---311andworx` |
| GitHub project number | `YOUR_PROJECT_NUMBER` | Only if using the project board automation | positive integer | `null` | `12` |
| GitHub project label | `YOUR_PROJECT_LABEL` | Only if using the project board automation | label format such as `project:my-project` | `null` | `project:fairfax-311` |

### Non-token follow-up input

| Field | Target | Required for first validation | Validation | Example |
|---|---|---|---|---|
| Dataverse client secret for `dev` | `.env` -> `DATAVERSE_CLIENT_SECRET_DEV` | Yes | non-placeholder secret value | `abc123...` |

### Non-token onboarding choices

| Field | Required for first validation | Allowed values | Default | Notes |
|---|---|---|---|---|
| Configuration storage mode | No | `local-only`, `github-hosted` | `local-only` | `github-hosted` mirrors approved values into GitHub repository variables and secrets where access is available. |
| GitHub repository target | Only when `github-hosted` is selected | `owner/repo` | inferred from current repo, otherwise `YOUR_GITHUB_ORG/YOUR_PROJECT_ID` | Used as the destination for repository variable/secret automation. |

## Storage destination strategy

Use this matrix as the canonical source for where onboarding values live.

| Input key | Destination | Secret class | Rationale |
|---|---|---|---|
| `YOUR_PROJECT_NAME` | `project.tokens.json` (`project.required`) | Non-secret | Project metadata used for template stamping across docs and config. |
| `YOUR_PROJECT_ID` | `project.tokens.json` (`project.required`) | Non-secret | Stable repo identifier used in folder names and generated text. |
| `YOUR_GITHUB_ORG` | `project.tokens.json` (`project.required`) | Non-secret | Required for repository/org URL and handle stamping. |
| `YOUR_SOLUTION_NAME` | `project.tokens.json` (`project.required`) | Non-secret | Dataverse solution identifier consumed by scripts/config. |
| `YOUR_PUBLISHER_PREFIX` | `project.tokens.json` (`project.required`) | Non-secret | Required for Dataverse component naming conventions. |
| `YOUR_EMAIL_TEMPLATE_PREFIX` | `project.tokens.json` (`project.required`) | Non-secret | Required for managed email template namespacing. |
| `YOUR_ORG_NAME` | `project.tokens.json` (`dev.required`) | Non-secret | Environment metadata used in docs and setup config. |
| `YOUR_ORG_URL` | `project.tokens.json` (`dev.required`) | Non-secret | Host value stamped into environment config files. |
| `YOUR_TENANT_ID` | `project.tokens.json` (`dev.required`) | Non-secret | Tenant identifier needed by local deployment scripts. |
| `YOUR_CLOUD_ENV` | `project.tokens.json` (`dev.required`) | Non-secret | Cloud selector used by scripts and docs. |
| `YOUR_CLIENT_ID` | `project.tokens.json` (`dev.optional`) | Non-secret | App identifier (not a credential) used when app auth is enabled. |
| `YOUR_AGENT_APP_ID` | `project.tokens.json` (`dev.optional`) | Non-secret | Agent app identifier (not a credential) for Copilot integration. |
| `YOUR_PORTAL_SLUG` | `project.tokens.json` (`dev.optional`) | Non-secret | Needed only for Power Pages path and command generation. |
| `YOUR_WEBSITE_ID` | `project.tokens.json` (`dev.optional`) | Non-secret | Power Pages site identifier used for portal configuration. |
| `YOUR_PORTAL_FOLDER` | `project.tokens.json` (`dev.optional`) | Non-secret | Portal filesystem mapping value used by PAC workflows. |
| `YOUR_PROJECT_NUMBER` | `project.tokens.json` (`dev.optional`) | Non-secret | Project automation metadata for board workflows. |
| `YOUR_PROJECT_LABEL` | `project.tokens.json` (`dev.optional`) | Non-secret | Label metadata used by issue/project automation workflows. |
| `DATAVERSE_CLIENT_SECRET_DEV` | `.env` (`DATAVERSE_CLIENT_SECRET_DEV`) | Secret | Credential material; must remain local and out of tracked files. |

### Generated configuration files

| Generated file | Source of values | Commit policy | Notes |
|---|---|---|---|
| `scripts/config-dev.json` | `project.tokens.json` + template defaults | Commit if placeholders remain; otherwise treat as environment-specific and review carefully | Generated during onboarding from `scripts/config-dev.example.json`. |
| `project.tokens.applied.json` | `Apply-ProjectTokens.ps1` output | Never commit | Local artifact used to track applied token values. |

### GitHub repository variables and secrets (CI/CD only)

GitHub repository variables and secrets are optional for local onboarding, but recommended once workflows must run in GitHub-hosted automation.

When the user chooses the `github-hosted` onboarding path, `Start-Onboarding.ps1` should:

1. Mirror approved non-secret onboarding values to GitHub repository variables.
2. Mirror `DATAVERSE_CLIENT_SECRET_DEV` to a repository secret when the secret value is available.
3. Continue local onboarding even if GitHub auth or permission checks fail, then print clear manual fallback steps.

| Use case | Destination | Example names | Why |
|---|---|---|---|
| Non-secret runtime metadata for workflows | Repository variables | `YOUR_ORG_URL`, `YOUR_TENANT_ID`, `YOUR_PROJECT_NUMBER`, `YOUR_PROJECT_LABEL` | Keeps CI configuration centralized without exposing credentials. |
| Credentials or private keys required in workflows | Repository secrets | `DATAVERSE_CLIENT_SECRET_DEV` | Prevents plaintext credential storage in git-tracked files or workflow YAML. |

Minimum access requirements:

- Repository write/maintain access where values are being set.
- Authenticated GitHub CLI session with access to the target repo (`gh auth status`).

Canonical commands:

```powershell
# Set non-secret values (repository variables)
gh variable set YOUR_ORG_URL --repo YOUR_ORG_NAME/YOUR_PROJECT_ID --body "andworx-development.crm.dynamics.com"
gh variable set YOUR_TENANT_ID --repo YOUR_ORG_NAME/YOUR_PROJECT_ID --body "00000000-0000-0000-0000-000000000000"

# Set secrets (repository secrets) without printing the value
$env:DATAVERSE_CLIENT_SECRET_DEV | gh secret set DATAVERSE_CLIENT_SECRET_DEV --repo YOUR_ORG_NAME/YOUR_PROJECT_ID
```

## Required vs optional capture rules

Use these rules in any future bootstrap script or interactive setup:

1. Always capture all project-level required inputs.
2. Always capture the `dev` environment required inputs.
3. Offer optional inputs only when their feature area is in use:
   - `YOUR_CLIENT_ID` for Dataverse app auth and Power Automate automation
   - `YOUR_AGENT_APP_ID` for Copilot Studio app integration
   - Power Pages fields only if the project includes a portal
   - GitHub project board fields only if the repo will use the board workflows
4. Do not block first-run completion on `test` or `prod` values.
5. Leave unknown optional values as `null`.
6. Leave unknown future-environment required values at their placeholder token until the user is ready.
7. Treat `DATAVERSE_CLIENT_SECRET_DEV` as a secret in all contexts:
   - write it only to `.env` for local onboarding
   - use GitHub repository secrets for hosted workflow execution
   - never write it to `project.tokens.json`, `scripts/config-*.json`, logs, or markdown docs
8. Treat IDs, slugs, and labels as non-secrets unless organization policy says otherwise; keep these in `project.tokens.json` and/or GitHub repository variables.
9. If GitHub-hosted onboarding cannot authenticate or lacks repo permissions, complete the local writes anyway and print rerun/manual commands for GitHub setup.

## Prompt order and prompt text

Prompts should be shown in this order.

### 1. Project identity

| Order | Field | Prompt text | Help text |
|---|---|---|---|
| 1 | `YOUR_PROJECT_NAME` | `What is the human-readable name of this project?` | `Use the name that should appear in documentation, UI copy, and issue templates.` |
| 2 | `YOUR_PROJECT_ID` | `What short lowercase slug should this repo use for IDs and folder names?` | `Use lowercase kebab-case, for example fairfax-311.` |
| 3 | `YOUR_GITHUB_ORG` | `Which GitHub organization owns this repository?` | `Enter only the organization slug, without @ or a URL.` |
| 4 | `YOUR_SOLUTION_NAME` | `What Dataverse solution unique name should this project use?` | `Use the solution-level identifier with no spaces.` |
| 5 | `YOUR_PUBLISHER_PREFIX` | `What Dataverse publisher prefix should be used for custom components?` | `Use a short prefix with no trailing underscore.` |
| 6 | `YOUR_EMAIL_TEMPLATE_PREFIX` | `What prefix should managed email templates use?` | `Press Enter to reuse the project ID.` |

### 2. Dev environment

| Order | Field | Prompt text | Help text |
|---|---|---|---|
| 7 | `YOUR_ORG_NAME` | `What is the Dataverse org or business name for the dev environment?` | `This is the friendly environment/business name used across docs and templates.` |
| 8 | `YOUR_ORG_URL` | `What is the Dataverse host name for the dev environment?` | `Enter only the host, for example andworx-development.crm.dynamics.com.` |
| 9 | `YOUR_TENANT_ID` | `What Microsoft Entra tenant ID should this project use?` | `Enter the tenant GUID.` |
| 10 | `YOUR_CLOUD_ENV` | `Which cloud environment does this Dataverse org use?` | `Choose one: commercial, gcc, gcch, dod.` |

### 3. Optional feature inputs

| Order | Field | Prompt text | Help text |
|---|---|---|---|
| 11 | `YOUR_CLIENT_ID` | `Do you already have an app registration client ID for this project?` | `Leave blank for now if you do not need Power Automate or app-based Dataverse auth yet.` |
| 12 | `YOUR_AGENT_APP_ID` | `Do you need a Copilot Studio app registration ID now?` | `Leave blank unless you know the agent integration requires it.` |
| 13 | `YOUR_PORTAL_SLUG` | `Does this project include Power Pages, and if so what is the portal slug?` | `Leave blank if there is no portal in scope.` |
| 14 | `YOUR_WEBSITE_ID` | `What is the Power Pages website ID?` | `Only needed when the project includes a portal.` |
| 15 | `YOUR_PORTAL_FOLDER` | `What parent folder name should PAC use for portal downloads?` | `Only needed when the project includes a portal.` |
| 16 | `YOUR_PROJECT_NUMBER` | `Will this repo use a GitHub Projects board, and if so what is the project number?` | `Leave blank if project board automation is out of scope.` |
| 17 | `YOUR_PROJECT_LABEL` | `What label should trigger project-board tracking?` | `Use a label such as project:fairfax-311.` |

### 4. Configuration path

| Order | Field | Prompt text | Help text |
|---|---|---|---|
| 18 | Configuration storage mode | `Where should onboarding values be stored for ongoing setup?` | `Choose local-only to keep setup in repo files and .env, or github-hosted to also mirror approved values into GitHub repository variables/secrets.` |
| 19 | GitHub repository target | `Which GitHub repository should receive the hosted onboarding values?` | `Only asked when github-hosted is selected. Use owner/repo.` |

### 5. Secret capture

| Order | Field | Prompt text | Help text |
|---|---|---|---|
| 20 | `DATAVERSE_CLIENT_SECRET_DEV` | `What is the Dataverse client secret for the dev environment?` | `Write this to .env. In github-hosted mode, also mirror it to a repository secret when GitHub access is available.` |

## Output mapping

### Direct writes during onboarding

| Input | Primary target | Notes |
|---|---|---|
| Project-level required inputs | `project.tokens.json` -> `project.required.*` | Written once and reused across all environments |
| Dev required inputs | `project.tokens.json` -> `dev.required.*` | Minimum set required for first validation |
| Optional inputs | `project.tokens.json` -> `dev.optional.*` | Leave as `null` when unknown |
| Dev client secret | `.env` -> `DATAVERSE_CLIENT_SECRET_DEV` | Never write to tracked JSON files |
| GitHub-hosted non-secret mirror | Repository variables | Optional; mirrors approved non-secret values for hosted automation |
| GitHub-hosted secret mirror | Repository secret `DATAVERSE_CLIENT_SECRET_DEV` | Optional; do not log or print the secret value |

### Files affected after `Apply-ProjectTokens.ps1`

| Token source | Files stamped |
|---|---|
| `project.required.*` | `README.md`, `PROJECT.md`, `.github` templates and guides, scripts, docs, and any other scanned template files containing matching placeholders |
| `dev.required.*` | `scripts/config-dev.json` plus any other repo files containing those placeholders |
| `dev.optional.*` | `scripts/config-dev.json`, `PAC_COMMANDS.md`, Power Pages paths, GitHub project docs, and any other repo files containing those placeholders once values are known |

### Files that must exist before token stamping

These files should be created before running `Apply-ProjectTokens.ps1`, otherwise they will not be stamped on the first run:

- `project.tokens.json`
- `scripts/config-dev.json`

`.env` does not need token stamping, but it does need to exist before the first validation run.

## Validation rules summary

The onboarding experience should reject or re-prompt on:

- blank required values
- `YOUR_ORG_URL` values that include `https://`, `/`, or trailing slash characters
- non-GUID values for tenant ID, client ID, agent app ID, and website ID
- cloud values outside `commercial`, `gcc`, `gcch`, `dod`
- `YOUR_PROJECT_ID` values that are not lowercase kebab-case
- `YOUR_PUBLISHER_PREFIX` values that include an underscore or spaces
- `YOUR_PROJECT_NUMBER` values that are not positive integers
- presence of `DATAVERSE_CLIENT_SECRET_DEV` anywhere outside `.env`, process environment variables, or GitHub repository secrets

The onboarding experience should warn, but allow progress, when:

- optional values are blank
- `test` and `prod` environment sections remain untouched
- GitHub project board values are omitted
- Power Pages values are omitted because the project has no portal
- GitHub repository variables/secrets are not set yet for CI/CD (local-first setup still succeeds)
- GitHub-hosted sync cannot run because `gh` is unauthenticated or the repo is inaccessible; local onboarding still succeeds with manual fallback steps

The onboarding experience should fail preflight checks when:

- `-PreflightOnly -ConfigurationMode github-hosted` is used and GitHub CLI is missing
- `-PreflightOnly -ConfigurationMode github-hosted` is used and `gh auth status` is unauthenticated
- `-PreflightOnly -ConfigurationMode github-hosted` is used and token scopes do not include `repo`

## Local `.env` guardrails

To reduce leakage risk, `.env` handling must follow all of these rules:

1. `.env` must be gitignored (`.gitignore` includes `.env` and `.env.*` with explicit example-file allowlist).
2. `.env.example` must contain placeholders only; never real secrets.
3. Scripts and docs must reference secret variable names, never secret values.
4. Any onboarding validation should fail if `.env` still contains `your-dev-secret-here`.

## Completion criteria for first-run setup

The first-run experience is complete when all of the following are true:

1. `project.tokens.json` exists and contains project-level required values plus `dev.required`.
2. `scripts/config-dev.json` exists and no longer contains unresolved placeholders for the chosen `dev` inputs.
3. `.env` exists and contains a non-placeholder `DATAVERSE_CLIENT_SECRET_DEV`.
4. `.\scripts\Apply-ProjectTokens.ps1 -Environment dev` completes successfully.
5. `.\scripts\Validate-DeploymentSetup.ps1 -Environment dev` reports the required onboarding checks as passing.

## Canonical onboarding-complete signal

The deterministic onboarding-complete signal for coding guardrails is:

```powershell
.\scripts\Test-OnboardingCompletion.ps1 -Environment dev -Json
```

Onboarding is considered complete only when the command returns:

- Exit code `0`
- JSON payload with `"isComplete": true`

If the command returns a non-zero exit code or `"isComplete": false`, onboarding is incomplete and coding guardrails should warn before code changes proceed.

## Copilot and Claude startup warning behavior

On the first coding interaction of a session:

1. Run `.\scripts\Test-OnboardingCompletion.ps1 -Environment dev -Json`.
2. If onboarding is incomplete, show a warning listing failed checks plus exact remediation:
   - `.\scripts\Start-Onboarding.ps1 -Environment dev`
   - `.\scripts\Validate-DeploymentSetup.ps1 -Environment dev`
3. Do not proceed with coding until onboarding is complete, unless bypass is explicitly acknowledged.

### Bypass behavior

- Bypass is allowed once per session for advanced users.
- Required acknowledgement string:
  - `I acknowledge onboarding is incomplete and want to bypass for this session.`
- Bypass must be auditable in assistant output with:
  - `[Onboarding Bypass] User acknowledged incomplete onboarding for this session.`

## Verification checklist for guardrail behavior

- [ ] `Test-OnboardingCompletion.ps1` returns `isComplete=false` when required onboarding files/values are missing.
- [ ] Guardrail warning appears before coding workflow proceeds when onboarding is incomplete.
- [ ] Warning includes actionable remediation commands for onboarding and validation.
- [ ] `Test-OnboardingCompletion.ps1` returns `isComplete=true` after onboarding + validation are complete.
- [ ] Guardrail allows one explicit per-session bypass with the required acknowledgement string and audit note.

## Onboarding success metrics and feedback loop

### Time-to-first-success metric definition

Use **time-to-first-success (TTFS)** as the primary onboarding effectiveness metric.

- **Start timestamp:** when `.\scripts\Start-Onboarding.ps1 -Environment dev` first runs in a new repo clone (`-PreflightOnly` and `-DryRun` do not start TTFS).
- **End timestamp:** when both conditions are first true in the same onboarding attempt:
  1. `.\scripts\Validate-DeploymentSetup.ps1 -Environment dev` succeeds
  2. `.\scripts\Test-OnboardingCompletion.ps1 -Environment dev -Json` returns `"isComplete": true`
- **Metric value:** elapsed minutes between start and end timestamps.
- **Capture fields:** `startedAt`, `completedAt`, `elapsedMinutes`, `storageMode` (`local-only` or `github-hosted`), `bypassUsed` (`true` or `false`).

### Standard failure categories for triage

Use exactly one primary category for each failed onboarding attempt or feedback issue.

| Category | Use when the failure is primarily caused by |
|---|---|
| `prerequisites` | Missing local tools, authentication, permissions, or machine setup needed before onboarding can run |
| `input-validation` | Prompt validation failures (format errors, required fields, re-prompt loops) |
| `token-stamping` | `Apply-ProjectTokens.ps1` failures or unresolved placeholder/token mapping problems |
| `config-generation` | `config-dev.json` creation/output mismatch or invalid generated config |
| `secret-setup` | `.env` creation, secret placeholder handling, or secret guardrail failures |
| `github-hosted-sync` | GitHub variable/secret mirroring failures in `github-hosted` mode |
| `documentation-gap` | Setup docs missing, inaccurate, or ordered incorrectly |
| `guardrail-ux` | Startup guardrail behavior that blocks or confuses users unexpectedly |

### Feedback collection mechanism

Use GitHub issues as the canonical feedback intake path:

1. Create a new issue from **Tracked Work Item**.
2. Prefix title with `[Onboarding Feedback]`.
3. Add required labels: `YOUR_PROJECT_LABEL`, one `type:*`, and relevant `area:*` labels.
4. In the issue body, include:
   - onboarding path (`local-only` or `github-hosted`)
   - TTFS fields (or reason TTFS could not be completed)
   - one primary failure category from the table above
   - reproduction steps and command output excerpts (redacted for secrets)

For early ideation or qualitative observations, open a GitHub Discussion first; convert actionable items to tracked issues using the same category model.

### Review cadence and ownership

- **Weekly triage:** template maintainers review new `[Onboarding Feedback]` issues, normalize labels/categories, and set priority.
- **Monthly review:** template maintainers review TTFS trends and failure-category distribution to identify top friction points.
- **Execution rule:** any improvement selected for implementation must be tracked as a new issue and linked to the source feedback issue.
