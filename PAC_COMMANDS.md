# PAC CLI Commands

Two different PAC CLI command families in this repo, for two different Power Platform
products — don't cross them:

- **Power Pages Code Site** (`power pages/restore-and-spin`) — `pac pages` commands, below.
- **Power Apps Code App** (`power apps/game-box-control`) — `pac code` commands, further
  down.

## Power Pages Code Site

`power pages/restore-and-spin` is a **Power Pages Code Site** (React 19 + Vite SPA), not a
classic Liquid portal. Code sites use a different PAC CLI command family — mixing in
classic-portal commands (`pac pages upload` / `pac pages download`) will corrupt the site's
metadata. See `power pages/restore-and-spin/powerpages.config.json` for the site name and
build-output path PAC reads for these commands.

## Authentication

```powershell
# List current auth profiles
pac auth list

# Create a new auth profile (interactive login)
pac auth create --environment "https://YOUR_ORG_URL"

# Or non-interactive, e.g. for CI (service principal)
pac auth create `
  --tenant "<TENANT_ID>" `
  --applicationId "<CLIENT_ID>" `
  --clientSecret "<CLIENT_SECRET>" `
  --environment "https://YOUR_ORG_URL"

# Select an existing auth profile by index
pac auth select --index 1
```

## Build

Always build before uploading — PAC uploads the compiled `dist/` output, not the source:

```powershell
cd "power pages\restore-and-spin"
npm install   # first time only
npm run build
```

## Upload

```powershell
# Run from inside power pages\restore-and-spin — reads powerpages.config.json
pac pages upload-code-site --rootPath "."
```

**Never use `pac pages upload`** on this site — that command targets classic portal-studio
sites and will corrupt code site metadata.

## First deployment to a new environment

A code site needs to be activated once it has a live website record before it's reachable:

```powershell
pac pages activate --webSiteId <WEBSITE_GUID>
```

Or activate via the [Power Pages admin center](https://make.powerpages.microsoft.com).

## Troubleshooting

### Upload fails — `.js` attachments blocked

```
Error: Unable to upload webfile ... as '.js' type attachments are currently blocked
```

Remove `js` from the environment's blocked attachment extensions list:

```powershell
pac env list-settings | Select-String "blockedattachments"
pac env update-settings --name blockedattachments --value "<current-list-without-js>"
```

### Upload fails — stale manifest (misleading `.html` error)

If the error mentions `.html` being blocked, the real cause is usually a stale manifest
file left over from a previous build — delete `dist/` and re-run `npm run build` before
retrying the upload.

## Power Apps Code App

`power apps/game-box-control` is a **Power Apps Code App** — the staff control device that
sets which kiosk mode is live (`power pages/GAME_MODE_PLAN.md` §4a). It's a plain
Vite/React/TS app on purpose (see that folder's `README.md`); `pac code` adds whatever
Power Platform-specific config and Entra ID auth wrapping is needed on top, so there's
nothing hand-written to match here.

Make sure the right auth profile is selected first (`pac auth list` / `pac auth select`,
same as the Power Pages section above — this needs to target the same environment as the
`CopilotIoTGame` solution and Dataverse tables).

```powershell
cd "power apps\game-box-control"
npm install
```

**First-time setup** — turns this plain Vite app into a Code App project:

```powershell
pac code init
```

This is expected to add its own config/auth files to the folder (do **not** hand-author
anything that looks like what it generates — let it own that). Re-run `npm install` if it
adds new dependencies.

**Push to the environment** (first push and every update after):

```powershell
npm run build
pac code push
```

If either command's exact flags differ from what's above (this is a newer, still-evolving
PAC CLI feature), `pac code init --help` / `pac code push --help` are the source of truth —
update this doc once confirmed.

## Reference

| Parameter | Value |
|---|---|
| Site | `power pages/restore-and-spin` (config: `powerpages.config.json`) |
| Build output | `dist/` (Vite default) |
| Environment | `YOUR_ORG_URL` |
| Code App | `power apps/game-box-control` |
| Website ID (for `pac pages activate`) | `YOUR_WEBSITE_ID` |
