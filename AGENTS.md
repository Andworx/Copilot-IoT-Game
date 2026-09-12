# Repository instructions for Codex

Read `CONTRIBUTING.md` and the relevant area documentation before changing code.
Preserve unrelated local edits. Use a feature branch and a PR; never commit or push
directly to `main`.

## CI/CD

Follow [docs/CI_CD.md](docs/CI_CD.md) for Function App and Power Pages releases.
The authoritative workflow is `.github/workflows/deploy-apps.yml`.

- Run `npm ci` and `npm run build` in `azure` and `power pages/copilotiotgame`.
- PRs run `Build apps` without deployment credentials. Merging relevant changes to
  `main` builds and deploys both apps through the `production` GitHub environment.
- For a requested redeploy, dispatch `deploy-apps.yml` on `main` and inspect its run.
- Do not replace this pipeline with local `func ... publish` or PAC uploads unless
  the user explicitly requests a manual recovery or first-time bootstrap.
- Power Pages is a Code Site: use `pac pages upload-code-site`, never classic
  `pac pages upload`, `upload-paportal`, or GitHub Pages hosting actions.
- Keep Node 22, locked dependencies, the runtime-only Function package, and the
  backend-before-frontend deployment order.
- Never commit secrets or put secrets in Vite variables. Report the run URL and
  commit SHA; mark plan items Verify until live validation passes.

Other Power Platform components continue to use the documented PAC solution/Code
App workflows. Consult area-specific `CLAUDE.md` and `.github/instructions/` files
for component conventions.
