# YOUR_PROJECT_NAME — Claude Code Instructions

## Project Identity

- **Project name:** YOUR_PROJECT_NAME
- **Solution unique name:** YOUR_SOLUTION_NAME
- **Publisher prefix:** YOUR_PUBLISHER_PREFIX
- **Organisation URL:** YOUR_ORG_URL
- **Org / tenant:** YOUR_ORG_NAME
- **Cloud environment:** YOUR_CLOUD_ENV (commercial | gcc | gcch | dod)

Fill in `project.tokens.json` and run `.\scripts\Apply-ProjectTokens.ps1 -Environment dev` to stamp these values across the repo.

## Function App and Power Pages CI/CD

Follow [docs/CI_CD.md](docs/CI_CD.md) and `.github/workflows/deploy-apps.yml`.
Run both local builds, open a PR, and use the GitHub Actions deployment after
merging relevant changes to `main`. For a requested redeploy, dispatch
`deploy-apps.yml` on `main` and inspect the run. Do not publish these apps locally
unless explicitly asked for recovery/bootstrap. PRs build only; production deploys
use the `production` environment, Azure OIDC, and a Power Platform deployment
secret. Deploy the backend before the Code Site. Report the run URL and commit SHA;
keep plan items at Verify until live checks pass. The PAC commands below are
manual recovery/bootstrap references for these two apps.

## Azure infrastructure

Event Hub, consumer groups, SignalR, and the Function App's Event Hub access are defined in
`azure/infrastructure/` and released by `.github/workflows/deploy-infra.yml`, documented in
[docs/CI_CD.md](docs/CI_CD.md#infrastructure-workflow-deploy-infrayml). The owner-authorized exception is `azure/infrastructure/staff-api.bicep`, provisioned by the app release workflow as documented in `docs/STAFF_API_WIRING.md`. Shared infrastructure does not deploy on
merge: use `gh workflow run deploy-infra.yml --ref main -f action=what-if|drift|deploy`, show the
`what-if` first, and run `deploy` only when explicitly asked (it is main-only; there is no reviewer gate). Do not
run infra deployments or `azure/infrastructure/scripts/Initialize-InfraIdentities.ps1` locally. Never change
the IoT Hub or DPS from this repo: they are drift-checked snapshots only, and shared with other
devices.

## Deployment Workflow

Power Platform changes ship via the `pac` CLI directly — build tables/choices/relationships
manually in the maker portal (or via whatever surface fits: canvas app, Copilot Studio,
etc.), then `pac solution export` + `pac solution unpack` to bring them into source control
under `solutions/`, and `pac solution pack` + `pac solution import` to move a solution
between environments. Table
`definition.json`/`README.md` files under `tables/` still document schema for reference,
independent of which mechanism actually created the table.

## Solution & Publisher

- Solution unique name: `YOUR_SOLUTION_NAME`
- Publisher prefix: `YOUR_PUBLISHER_PREFIX` — all custom entities, columns, choices, and relationships use this prefix; no exceptions
- Target environment: `YOUR_ORG_URL`

## PAC CLI

`power pages/copilotiotgame` is a **Power Pages Code Site** (React + Vite SPA), not a
classic Liquid portal — it uses a different PAC CLI command family entirely:

- Build first: `npm run build` (from inside `power pages/copilotiotgame`)
- Upload: `pac pages upload-code-site --rootPath "."` (run from inside that folder — reads `powerpages.config.json` for the site name and build output path)
- **Never** use `pac pages upload` / `pac pages download` on it — those target classic portal-studio sites and will corrupt code site metadata
- First deploy to a new environment also needs: `pac pages activate --webSiteId <WEBSITE_GUID>`
- Full reference: `PAC_COMMANDS.md`

## File Organisation

```
YOUR_PROJECT_ID/
├── automations/         # Non-flow automation assets
│   └── emails/          # Managed email templates (templates.json + HTML body files)
├── power pages/         # Power Pages Code Site (React + Vite SPA) — see copilotiotgame/
├── scripts/             # PowerShell deployment & export scripts
├── tables/              # Dataverse table definitions (JSON)
│   ├── choices/         # Global option sets
│   └── relationships/   # Relationship definitions (definitions.json + individual files)
├── flows/               # Power Automate flow definitions
├── copilot agents/      # Copilot Studio agent assets
├── reports/             # Power BI PBIP report templates and model assets
├── plugins/             # Dataverse plugin projects
├── tests/e2e/           # Playwright E2E tests
└── PAC_COMMANDS.md      # PAC CLI reference
```

## JSON Files

- 2-space indentation
- Include `description` fields on tables, columns, choices, and relationships
- Each table gets its own folder under `tables/` with `definition.json` and `README.md`

## Configuration & Secrets

- Environment configs: `scripts/config-{env}.json`
- Secrets via environment variables only — never in config files
- Secret variable names: `DATAVERSE_CLIENT_SECRET_DEV`, `DATAVERSE_CLIENT_SECRET_PROD`
- API version: `v9.2`

## Export Output

Exports go to `scripts/exports/YOUR_SOLUTION_NAME/` organised by component type, each with a `_summary.json`.

## Project Plan

Maintain `requirements/PLAN.md`. Track status with: `✅ Done`, `⬜ Verify`, `⬜ TODO`, `Future`.

- After deployment, set related plan items to `⬜ Verify` until post-deployment validation passes
- Keep summary scorecard totals in sync

## Token System

`Apply-ProjectTokens.ps1` scans all `*.md`, `*.ps1`, `*.json`, `*.ts`, `*.yml`, `*.yaml`, `*.html`, `*.txt` files recursively. `YOUR_*` placeholders in this file and all subdirectory `CLAUDE.md` files are stamped automatically.

### Project-level tokens (set once in `project.tokens.json > project.required`)

| Token | Purpose |
|---|---|
| `YOUR_PROJECT_NAME` | Human-readable project name used in UI labels and documentation |
| `YOUR_PROJECT_ID` | Short identifier used in folder names and prefixes |
| `YOUR_SOLUTION_NAME` | Dataverse solution unique name |
| `YOUR_PUBLISHER_PREFIX` | Publisher prefix for all custom Dataverse components |
| `YOUR_EMAIL_TEMPLATE_PREFIX` | Prefix for all managed email templates (e.g. `MyProject`). Used by `Import-EmailTemplates.ps1` to validate template names. Set to a short identifier with no spaces. |

### Optional tokens (set in `project.tokens.json > optional` and each env's `optional`)

| Token | Purpose |
|---|---|
| `YOUR_PROJECT_NUMBER` | GitHub Projects v2 project number — enables project board automation workflows |
| `YOUR_PROJECT_LABEL` | Label that triggers board tracking (e.g. `project:my-project`) — used by issue template and workflows |

## Git Workflow

**Never commit or push directly to `main`.** See `CONTRIBUTING.md` for the full contributor guide.

- Branch naming: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `release/vx.x.x`
- Commits: Conventional Commits format (`feat(scope): description`)
- PRs: squash-merge to `main`; link to issue with `Fixes #N`

## Area-Specific Instructions

Each subdirectory has its own `CLAUDE.md` loaded automatically when working in that area:

| Directory | Instructions cover |
|---|---|
| [scripts/](scripts/CLAUDE.md) | PowerShell conventions, Dataverse API patterns, error handling |
| [tables/](tables/CLAUDE.md) | Dataverse schema, column types, deployment order |
| [plugins/](plugins/CLAUDE.md) | C# plugin architecture, registration docs, ALM |
| [flows/](flows/CLAUDE.md) | Power Automate ALM, payload contract, change checklist |
| [power pages/](power%20pages/CLAUDE.md) | Power Pages Code Site (React SPA) conventions, `pac pages upload-code-site` |
| [copilot agents/](copilot%20agents/CLAUDE.md) | Topic authoring, agent guardrails, pull/push workflow |
| [reports/](reports/CLAUDE.md) | Power BI PBIP structure, DAX/M organization, and review checklist |

## Git Tags

- All tags must use the format `vx.x.x` — lowercase `v` followed by three dot-separated integers (e.g. `v1.0.0`, `v2.3.14`)
- No `V` (uppercase), no `release/`, no `-beta`, no other prefixes, suffixes, or qualifiers
- Example: `git tag v1.2.3`

## Custom Slash Commands

| Command | Purpose |
|---|---|
| `/deploy` | Guided deployment workflow |
| `/export` | Guided component export |
| `/copilot-studio-edit` | Copilot Studio editing workflow with guardrails |
| `/sync-baseline` | Cherry-pick baseline updates from template |
