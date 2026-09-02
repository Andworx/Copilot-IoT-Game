# PAC CLI Commands — Power Pages Code Site

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

## Reference

| Parameter | Value |
|---|---|
| Site | `power pages/restore-and-spin` (config: `powerpages.config.json`) |
| Build output | `dist/` (Vite default) |
| Environment | `YOUR_ORG_URL` |
| Website ID (for `pac pages activate`) | `YOUR_WEBSITE_ID` |
