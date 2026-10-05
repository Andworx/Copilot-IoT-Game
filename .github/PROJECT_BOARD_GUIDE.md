# Copilot IoT Game Project Board Guide

This guide explains how to use the GitHub Project Board to track work on the Copilot IoT Game solution.

## Quick Start

### Adding Work to the Project Board

1. **Create an issue** using the "Tracked Work Item" template (in Issues → New Issue)
2. **Add the label** `project:copilot-iot-game` to the issue
3. **The issue automatically appears** on the project board in the "Backlog" column

### Reporting Template-Origin Defects From Downstream Repos

If a user hits a problem in a repo generated from this template, report it **here** only when the defect is template-origin.

1. Use the **"Template-Origin Defect"** issue template.
2. Include evidence that the defect maps to template-owned assets.
3. If the defect is in consumer app/business logic, file it in the consumer repo instead.

#### Decision rule: template-origin vs consumer-code-origin

Classify as **template-origin** only if all are true:

1. Reproduces from baseline behavior in a generated repo.
2. Root cause maps to template-owned assets (scripts/docs/folder mapping/conventions/starter automation).
3. Not introduced by consumer-specific code customization.

Otherwise classify as **consumer-code-origin** and track it in the consumer repository.

#### Example scenarios (template-origin)

| Area | Example that belongs in this template repo |
|---|---|
| Scripts | `scripts/Deploy-Project.ps1` fails with default template inputs before consumer code changes. |
| Documentation | README deployment steps reference an outdated command or missing prerequisite causing setup failure. |
| Folder mapping | Baseline paths in docs/scripts disagree (for example, expected folder names do not match generated structure). |

### Moving Work Through the Workflow

**Backlog → In Progress → In Review → Done**

| Status | Trigger | Meaning |
|--------|---------|---------|
| **Backlog** | Issue created with `project:copilot-iot-game` label | Ready to start, not yet assigned |
| **In Progress** | You start working on the issue | You've claimed the work and begun implementation |
| **In Review** | Open a PR linked to the issue | Waiting for code review and approval |
| **Done** | PR is merged | Work is complete, issue auto-closes |

---

## Detailed Workflow

### 1. Create an Issue

Use the **"Tracked Work Item"** template when creating issues. This template:
- Pre-fills relevant area labels (`area:dataverse`, `area:flows`, etc.)
- Reminds you to add the `project:copilot-iot-game` label
- References branch naming and commit conventions from [CONTRIBUTING.md](../CONTRIBUTING.md)
- Includes placeholders for acceptance criteria

**Steps:**
1. Go to **Issues → New Issue**
2. Choose **"Tracked Work Item"** template
3. Fill in the description and acceptance criteria
4. When creating the issue, add labels:
   - `project:copilot-iot-game` (required — enables project board tracking)
   - One or more `area:*` labels (e.g., `area:flows`, `area:dataverse`)

**Result:** Issue appears in **Backlog** column on project board (auto-added by `project-auto-add.yml` workflow)

---

### 2. Claim the Work & Start In Progress

Once you're ready to work on an issue:

1. **Assign yourself** to the issue (or have the issue assigned to you)
2. **Create a feature branch** following naming convention:
   - `feat/brief-description` (for new features)
   - `fix/brief-description` (for bug fixes)
   - See [CONTRIBUTING.md](../CONTRIBUTING.md#branch-naming) for full details
3. **Manually move the issue** to **In Progress** column (or use a label if configured)

---

### 3. Create a Pull Request & Move to In Review

When your work is ready for review:

1. **Create a conventional commit** on your feature branch:
   ```
   feat(component): description of change
   ```

2. **Open a pull request** with:
   - Title: Same as commit message
   - **Link the issue** in the PR body using one of these formats:
     - `Fixes #123` (auto-closes issue when merged)
     - `Closes #123`
     - `Resolves #123`
   - Fill out the PR template checklist

3. **Submit for review** — the issue **automatically moves** to **In Review** column (via `project-auto-move.yml` workflow)

**Result:** Linked issue moves to **In Review** column automatically

---

### 4. Merge & Complete

Once your PR is approved and merged:

1. **Squash and merge** to `main` (see [CONTRIBUTING.md](../CONTRIBUTING.md#merge-strategy) for details)
2. The linked issue **automatically**:
   - Moves to **Done** column
   - Closes (status changed to "Closed")

**Result:** Issue is complete, work is tracked as done on the project board

---

## Key Automations

### Workflow: `label-sync.yml`
- **Trigger:** Manual run (`workflow_dispatch`) or updates to `.github/labels.json`
- **Action:** Creates/updates repository labels from the canonical taxonomy file
- **Files:** `.github/workflows/label-sync.yml`, `.github/labels.json`

### Workflow: `project-auto-add.yml`
- **Trigger:** Issue labeled with `project:copilot-iot-game`
- **Action:** Adds issue to project board, normalizes status labels to `status:backlog`
- **File:** `.github/workflows/project-auto-add.yml`

### Workflow: `project-auto-move.yml`
- **Trigger:** PR opened/closed
- **Actions:**
   - PR opened/reopened/edited/sync → linked issue moves to "In Review" and label `status:in-review`
   - PR merged → linked issue moves to "Done", label `status:done`, and closes
   - PR closed (unmerged) → linked issue moves to "In Progress" and label `status:in-progress`
- **File:** `.github/workflows/project-auto-move.yml`

### Workflow: `project-sync.yml`
- **Trigger:** PR opened
- **Action:** If linked issue missing `project:copilot-iot-game` label, auto-adds it
- **File:** `.github/workflows/project-sync.yml`

---

## Labels Reference

### Project Label
| Label | Usage | Color |
|-------|-------|-------|
| `project:copilot-iot-game` | Issues tracked on this project board | 🔵 Blue |

### Status Labels (for filtering)
| Label | Meaning | Color |
|-------|---------|-------|
| `status:backlog` | Item in backlog, not yet started | 🟣 Purple |
| `status:in-progress` | Currently being worked on | 🟡 Yellow |
| `status:in-review` | In code review (PR open) | 🟡 Gold |
| `status:done` | Completed and merged | 🟢 Green |

### Area Labels (for filtering by component)
| Label | Usage | Color |
|-------|-------|-------|
| `area:dataverse` | Dataverse table/schema changes | 🩷 Pink |
| `area:flows` | Power Automate workflows | 💚 Green |
| `area:agents` | Copilot Studio agents | 💙 Light Blue |
| `area:plugins` | Dataverse plugins | 🟠 Orange |
| `area:pages` | Power Pages and model-driven UI | 💜 Purple |
| `area:reporting` | Power BI reports | 🟡 Yellow |

### Type Labels (for scope and reporting)
| Label | Usage | Color |
|-------|-------|-------|
| `type:epic` | Large initiative | 🔴 Dark Red |
| `type:feature` | New capability | 🔵 Blue |
| `type:task` | Implementation task | 🔹 Light Blue |
| `type:bug` | Defect or regression | 🔴 Red |
| `type:chore` | Maintenance work | ⚪ Gray |
| `type:docs` | Documentation updates | 🔵 Blue |
| `type:refactor` | Internal restructuring | 🟣 Purple |
| `type:security` | Security-focused work | 🔴 Dark Red |
| `type:test` | Test automation and quality | 🔵 Blue |

---

## Setup Requirements

### 1. Create the GitHub Projects v2 Board

1. Go to your organisation on GitHub
2. Click **Projects** → **New project**
3. Choose **Board** layout
4. Name it (e.g., `Copilot IoT Game`)
5. Note the project number from the URL (e.g., `https://github.com/orgs/Andworx/projects/2` → number is `2`)
6. Set repository variable `COPILOT_IOT_GAME_PROJECT_NUMBER` to the GitHub Projects v2 number

### 2. Create Required Labels

Labels are sourced from `.github/labels.json`. Use one of these options:

1. Trigger workflow **Label Sync** from Actions, or
2. Push a change to `.github/labels.json` (the workflow runs automatically)

If you need to create labels manually, use this baseline:

**Project label** (required for board automation):
- `project:copilot-iot-game` (e.g., `project:my-project`) — Blue `#0075ca`

**Status labels:**
- `status:backlog` — Purple `#7057ff`
- `status:in-progress` — Yellow `#fbca04`
- `status:in-review` — Gold `#e4a015`
- `status:done` — Green `#0e8a16`

**Type labels:**
- `type:epic` — Dark red `#b60205`
- `type:feature` — Blue `#0052cc`
- `type:task` — Light blue `#bfd4f2`
- `type:bug` — Red `#d73a4a`
- `type:chore` — Gray `#cfd3d7`
- `type:docs` — Blue `#0075ca`
- `type:refactor` — Purple `#5319e7`
- `type:security` — Dark red `#b60205`
- `type:test` — Blue `#1d76db`

**Area labels:**
- `area:dataverse` — Pink `#f9d0c4`
- `area:flows` — Green `#c2e0c6`
- `area:agents` — Light blue `#c5def5`
- `area:plugins` — Orange `#e99695`
- `area:pages` — Purple `#d4c5f9`
- `area:reporting` — Yellow `#fef2c0`

**Planning labels:**
- `priority:high` — Red `#d93f0b`
- `priority:medium` — Yellow `#fbca04`
- `priority:low` — Green `#0e8a16`
- `blocked` — Red `#ee0701`

### 3. Configure `PAT_PROJECT` Secret

The workflows use `PAT_PROJECT` for org-level project access (org projects require elevated scopes that `GITHUB_TOKEN` doesn't provide).

1. Create a Personal Access Token (PAT) with scopes: `repo`, `read:project`, `write:project`
2. Authorize the PAT for your organisation (SSO → Authorize)
3. Go to **Repository Settings → Secrets and variables → Actions**
4. Add secret: `PAT_PROJECT` = your PAT value

> **Tip:** Without `PAT_PROJECT`, issue creation still works but project board automation will fail gracefully with a logged warning.

---

## Common Tasks

### Reopen a Closed Issue
If a linked PR is reverted or closed without merging, the issue moves back to **In Progress** automatically.

To manually reopen:
1. Go to the issue
2. Click **"Reopen issue"** button
3. Move it back to appropriate column on project board

### Link an Issue to an Existing PR
If you forgot to link an issue in your PR, you can edit the PR body:
1. Open the PR
2. Click the three-dot menu (⋯) → **Edit**
3. Add `Fixes #123` to the PR body
4. Save — the automation will trigger

### Move Work Manually (if automation fails)
If an issue doesn't move automatically:
1. Go to the project board
2. Click the issue card
3. Change the "Status" field in the sidebar
4. Or drag the card between columns

---

## Best Practices

✅ **DO:**
- Use the "Tracked Work Item" template for all project work
- Always link issues to PRs (use `Fixes #123` in PR body)
- Add `project:copilot-iot-game` label when creating issues
- Keep issue descriptions clear and include acceptance criteria
- Reference related issues if applicable

❌ **DON'T:**
- Create issues without labeling them `project:copilot-iot-game` (they won't appear on the board)
- Open PRs without linking to an issue (manual board management required)
- Manually close issues before merging the PR (let automation handle it)
- Move items backwards in the workflow (use PR revert/close instead)

---

## Troubleshooting

### Issue not appearing on project board
**Cause:** Missing `project:copilot-iot-game` label
**Fix:** Add the label to the issue

### PR opened but issue didn't move to "In Review"
**Cause:** Issue not linked in PR body  
**Fix:** Edit PR body to include `Fixes #123` (or similar)

### Issue not auto-closing when PR merged
**Cause:** PR body doesn't include issue link  
**Fix:** Re-merge PR with proper issue link, or manually close issue

### Workflows not triggering
**Cause:** GitHub Actions may be disabled or token lacks permissions  
**Fix:** Check repository settings → Actions → General → "All actions and reusable workflows" is enabled

---

## Project Board Configuration

### Columns
- **Backlog:** Issues ready to start (default for new tracked issues)
- **In Progress:** Issues being actively worked on
- **In Review:** Issues with open PRs waiting for approval
- **Done:** Issues completed and merged

### Custom Fields
None required by default, but can be added:
- "Priority" (High/Medium/Low)
- "Assignee"
- "Target Release" (vX.X.X)

---

## References

- **Branch & Commit Conventions:** See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Component Guidelines:** See [.github/instructions/](./instructions/)
- **Project Status Tracker:** See [requirements/PLAN.md](../requirements/PLAN.md)
- **GitHub Projects v2 Docs:** https://docs.github.com/en/issues/planning-and-tracking-with-projects/
