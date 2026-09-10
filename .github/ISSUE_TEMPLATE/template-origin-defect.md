---
name: Template-Origin Defect
about: Report a defect that originates from this template baseline (not consumer code)
title: "[TEMPLATE DEFECT] "
labels: ["YOUR_PROJECT_LABEL", "type:bug", "area:automation", "status:backlog"]
---

## Summary
<!-- Briefly describe the defect and why it appears to come from the template baseline -->

## Classification (required)

Mark all items that are true:

- [ ] Reproduces in a fresh repo generated from this template (or clearly maps to unchanged baseline files)
- [ ] Root cause is in template-owned assets (onboarding, scripts, documentation, folder mapping, conventions, or starter automation)
- [ ] Not caused by consumer business logic or app code added after template creation

If you cannot mark all three, file the issue in the consumer repo instead.

## Decision Rule Evidence (required)

Provide at least one concrete pointer to the template-owned source of the issue:

- Script path:
- Documentation path/section:
- Folder mapping/convention path:

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

## Actual Behavior

## Consumer Repo Context

| Field | Value |
|---|---|
| Consumer repo URL | |
| Consumer branch/commit | |
| Was baseline file modified in consumer repo? | Yes / No |
| If modified, what changed? | |

## Logs / Screenshots
<!-- Paste relevant output and screenshots -->

## Scope Confirmation
- [ ] I confirm this issue is for template-origin defects only
- [ ] I confirm consumer code defects will be tracked in the consumer repo
