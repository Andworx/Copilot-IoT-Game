# /deploy — Guided Deployment Workflow

Guide the user through deploying Power Platform components to the target environment.

## Function App and Power Pages

For `azure/` and `power pages/copilotiotgame/`, follow `docs/CI_CD.md`.
Run both local builds and use a PR to `main`; relevant merged changes trigger
`.github/workflows/deploy-apps.yml`. For a requested redeploy of current main:

```powershell
gh workflow run deploy-apps.yml --ref main
gh run list --workflow deploy-apps.yml --limit 5
gh run watch <run-id> --exit-status
```

Inspect the run and report its URL/SHA. Validate the live kiosk/API before marking
plan items Done. Do not run local cloud publishing unless explicitly asked for
recovery/bootstrap. If configuration is missing, use the exact settings in
`docs/CI_CD.md`; never print secrets. PRs and non-main dispatches do not deploy.

## Other components or explicitly requested manual recovery

The following steps apply to Power Apps/solutions and manual recovery/bootstrap.

## Steps

1. **Confirm environment** — ask which environment to deploy to (dev / test / prod) if not provided as `$ARGUMENTS`.
2. **Confirm PAC authentication** — run `pac auth list` and select or create the profile for the target environment.
3. **Select the PAC workflow**:
   - Power Pages Code Site: build in `power pages\copilotiotgame`, then run `pac pages upload-code-site --rootPath "."`.
   - Power Apps Code App: build in `power apps\game-box-control`, then run `pac code push`.
4. **Run the relevant build and upload commands** from `PAC_COMMANDS.md`.
5. **Post-deployment** — activate the Power Pages site on its first deployment if needed, then validate both apps against the target environment.

## Notes

- Do not use the obsolete onboarding or deployment-validation scripts.
- See `PAC_COMMANDS.md` for the complete PAC CLI reference.
