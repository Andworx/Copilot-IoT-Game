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
- `upload-code-site` has no website-ID option: it updates the site its
  `.powerpages-site/` folder describes and **creates a new website** if nothing
  matches. CI pins the live site (`POWER_PAGES_WEBSITE_ID`), downloads its metadata
  with `pac pages download-code-site --webSiteId`, uploads, then verifies the ID. Never
  upload from the checked-in `.powerpages-site/` snapshot; it is stale and creates
  duplicate "CopilotIoTGame" websites. Only the site bound to
  `copilotiotgame.powerappsportals.com` is live (`pac pages list` shows the rest).
- Browser console CSP errors about blocked inline scripts on the portal (for example
  `(index):30`) come from Power Pages' own private-site banner and page wrapper, not
  from this repo's build output. Do not chase them in source; see `docs/CI_CD.md`.
- Keep Node 22, locked dependencies, the runtime-only Function package, and the
  backend-before-frontend deployment order.
- Never commit secrets or put secrets in Vite variables. Report the run URL and
  commit SHA; mark plan items Verify until live validation passes.

Other Power Platform components continue to use the documented PAC solution/Code
App workflows. Consult the area-specific `AGENTS.md` (for example
`power pages/AGENTS.md`), `CLAUDE.md`, and `.github/instructions/` files for
component conventions.
