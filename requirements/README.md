# Requirements Planning Conventions

Use `requirements/PLAN.md` as the working plan for `YOUR_PROJECT_NAME`.

Use `requirements/onboarding-input-contract.md` as the canonical source for
first-run setup prompts, required inputs, defaults, validation rules, and file
mapping.

## Status Legend

- `✅ Done` — implemented and verified
- `⬜ Verify` — deployed or changed and waiting for validation
- `⬜ TODO` — planned work in the current scope
- `Future` — intentionally out of scope for now

## How to Maintain the Plan

1. Keep the **Summary Scorecard** totals in sync with the detailed sections.
2. Update `requirements/PLAN.md` in the same change set whenever scope or implementation status changes.
3. Keep items grouped under the standard sections:
   - Dataverse
   - Flows
   - Agents
   - Power Pages
   - Plugins
   - Reports
4. When work is deployed but not yet validated, move it to `⬜ Verify`.
5. After validation passes, move it to `✅ Done` and add a brief note if helpful.

## Starter Usage

Replace the `YOUR_*_ITEM` placeholders in `PLAN.md` with your real deliverables as the project is defined.
