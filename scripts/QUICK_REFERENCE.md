# YOUR_PROJECT_NAME — Quick Reference

## Baseline Template Sync (Downstream Repos)

```powershell
# Standardized template update flow (old tag + new tag + branch name)
.\scripts\Sync-BaselineUpdate.ps1 -OldTag v1.1.0 -NewTag v1.2.0 -BranchName baseline-v1.2.0

# Preview only
.\scripts\Sync-BaselineUpdate.ps1 -OldTag v1.1.0 -NewTag v1.2.0 -BranchName baseline-v1.2.0 -DryRun
```

## 30-Second Setup

Power Pages and Power Apps code assets use PAC CLI directly. Authenticate with
`pac auth list` / `pac auth create`, then follow `PAC_COMMANDS.md`.

## Common Commands

```powershell
# Interactive mode (menus)
.\scripts\Deploy-Project.ps1

# Export everything
.\scripts\Deploy-Project.ps1 -Job Export-All -Environment dev

# Export specific components
.\scripts\Deploy-Project.ps1 -Job Export-Tables -Environment dev
.\scripts\Deploy-Project.ps1 -Job Export-Flows -Environment dev
.\scripts\Deploy-Project.ps1 -Job Export-Relationships -Environment dev
.\scripts\Deploy-Project.ps1 -Job Export-Forms -Environment dev
.\scripts\Deploy-Project.ps1 -Job Export-Views -Environment dev
.\scripts\Deploy-Project.ps1 -Job Export-WebResources -Environment dev
.\scripts\Deploy-Project.ps1 -Job Export-SecurityRoles -Environment dev
.\scripts\Deploy-Project.ps1 -Job Export-CanvasApps -Environment dev
.\scripts\Deploy-Project.ps1 -Job Export-EnvironmentVariables -Environment dev

# Import (full bootstrap sequence)
.\scripts\Deploy-Project.ps1 -Job Import-All -Environment dev

# Import specific components
.\scripts\Deploy-Project.ps1 -Job Import-Choices -Environment dev
.\scripts\Deploy-Project.ps1 -Job Import-Tables -Environment dev
.\scripts\Deploy-Project.ps1 -Job Import-Relationships -Environment dev
.\scripts\Deploy-Project.ps1 -Job Import-Flows -Environment dev

# Production (requires YES confirmation)
.\scripts\Deploy-Project.ps1 -Job Export-All -Environment prod
```

## Secrets Setup

| Variable | Purpose |
|----------|---------|
| `DATAVERSE_CLIENT_SECRET_DEV` | Dev environment secret |
| `DATAVERSE_CLIENT_SECRET_STAGING` | Staging secret |
| `DATAVERSE_CLIENT_SECRET_PROD` | Production secret |

## Jobs Reference

| # | Job | What it does |
|---|-----|-----------------|
| 1 | `Export-All` | Everything below |
| 2 | `Export-Tables` | Tables, columns, keys |
| 3 | `Export-Flows` | Cloud flow definitions |
| 4 | `Export-Relationships` | 1:N, N:1, N:N relationships |
| 5 | `Export-Forms` | Model-driven forms (XML) |
| 6 | `Export-Views` | Views (FetchXML) |
| 7 | `Export-WebResources` | JS, CSS, HTML, images |
| 8 | `Export-SecurityRoles` | Roles + privileges |
| 9 | `Export-CanvasApps` | Canvas app metadata |
| 10 | `Export-EnvironmentVariables` | Env variable defs + values |
| 11 | `Import-All` | Choices → Tables → Email Templates → Relationships → Flows |
| 12 | `Import-Choices` | Global option sets |
| 13 | `Import-Tables` | Tables + columns |
| 14 | `Import-EmailTemplates` | Managed email templates |
| 15 | `Import-Relationships` | Cross-table relationships |
| 16 | `Import-Flows` | Cloud flow definitions |

## Output

All exports → `scripts/exports/YOUR_SOLUTION_NAME/{component-type}/`

Each run generates an HTML report that auto-opens in your browser.

## Project Tokens (Environment-Scoped)

Project tokens support dev, test, and prod environments with environment-specific values.

```powershell
# Edit project.tokens.json in repo root, fill in values for dev/test/prod sections
# Then apply tokens:

# Apply dev tokens interactively
.\scripts\Apply-ProjectTokens.ps1

# Apply specific environment
.\scripts\Apply-ProjectTokens.ps1 -Environment dev
.\scripts\Apply-ProjectTokens.ps1 -Environment test
.\scripts\Apply-ProjectTokens.ps1 -Environment prod

# Apply single token for specific environment
.\scripts\Apply-ProjectTokens.ps1 -Environment prod -Token YOUR_ORG_URL

# Preview without writing files
.\scripts\Apply-ProjectTokens.ps1 -Environment prod -WhatIf

# Skip remote Copilot asset sync (no prompts)
.\scripts\Apply-ProjectTokens.ps1 -Environment dev -SkipRemoteSync

# Apply tokens and sync all remote Copilot assets without prompting
.\scripts\Apply-ProjectTokens.ps1 -Environment dev -RemoteSync

# Apply tokens and sync specific source(s) only
.\scripts\Apply-ProjectTokens.ps1 -Environment dev -RemoteSyncSourceKeys awesome-copilot

```

## Remote Copilot Asset Sync

Downloads curated Copilot instructions, agents, and skills from upstream GitHub repos into `.github/**/upstream/`.

```powershell
# Interactive (prompts which sources to sync)
.\scripts\Sync-RemoteCopilotAssets.ps1

# Sync all enabled sources without prompting
.\scripts\Sync-RemoteCopilotAssets.ps1 -AllSources -NoPrompt

# Sync a specific source key
.\scripts\Sync-RemoteCopilotAssets.ps1 -SourceKeys awesome-copilot -NoPrompt

# Preview without writing files
.\scripts\Sync-RemoteCopilotAssets.ps1 -AllSources -WhatIf
```

**Where files land:**

| Kind | Destination |
|------|-------------|
| Instructions | `.github/instructions/upstream/<sourceKey>/<remotePath>` |
| Agents | `.github/agents/upstream/<sourceKey>/<remotePath>` |
| Skills | `.github/skills/upstream/<sourceKey>/<remotePath>` |

Sync state recorded in `.github/upstream/<sourceKey>/SYNC_STATE.json`.

To add more files or sources, edit `scripts/remote-content.sources.json`.

> Do not edit files under `upstream/` directly — they are overwritten on next sync. Create local copies elsewhere.

**Supported tokens per environment:**

| Token | Example | Environment | Scope |
|-------|---------|-------------|-------|
| `YOUR_PROJECT_NAME` | My Project | All | Project identifier |
| `YOUR_PROJECT_ID` | proj-001 | All | Unique project ID |
| `YOUR_GITHUB_ORG` | andworx | All | GitHub organization slug (for GitHub handles/URLs) |
| `YOUR_ORG_NAME` | Andworx | All | Dataverse/business organization name |
| `YOUR_SOLUTION_NAME` | my_solution | All | Dataverse solution name |
| `YOUR_PUBLISHER_PREFIX` | andworx | All | Publisher prefix |
| `YOUR_ORG_URL` | https://org.crm.dynamics.com | Env-specific | Dataverse instance |
| `YOUR_TENANT_ID` | {guid} | Env-specific | Azure tenant |
| `YOUR_CLOUD_ENV` | commercial | Env-specific | Cloud authority host selector (`commercial`, `gcc`, `gcch`, `dod`) |
| `YOUR_CLIENT_ID` | {guid} | Optional | Service principal |
| `YOUR_PORTAL_SLUG` | my-portal | Optional | Power Pages URL slug |
| `YOUR_WEBSITE_ID` | {guid} | Optional | Power Pages website ID |
| `YOUR_PORTAL_FOLDER` | power pages | Optional | Portal source folder |

Each run generates an HTML report that auto-opens in your browser.

## power pages (Code Site — restore-and-spin)

```powershell
cd "power pages\restore-and-spin"
npm run build
pac pages upload-code-site --rootPath "."
```

Not the classic `pac pages upload`/`pac pages download` — see `PAC_COMMANDS.md`.

## Flow Import Modes

```powershell
# Normal: update existing flow records in place (preserves history and auth)
.\scripts\Deploy-Project.ps1 -Job Import-Flows -Environment dev

# Recovery only: delete and recreate matching flows
.\scripts\Deploy-Project.ps1 -Job Import-Flows -Environment dev -ReplaceExistingFlows
```
