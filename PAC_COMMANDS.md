# PAC CLI Commands — YOUR_PROJECT_NAME Portal

## Authentication

```powershell
# List current auth profiles
pac auth list

# Create a new auth profile (interactive login)
pac auth create --environment "https://YOUR_ORG_URL"

# Select an existing auth profile by index
pac auth select --index 1
```

## Pages Download

```powershell
# Download portal files (overwrites local changes)
# NOTE: PAC creates a subfolder named after the portal. Download into the parent folder;
# the actual content lands in YOUR_PORTAL_SLUG\ inside it.
pac pages download --overwrite `
  --path "power pages\\\YOUR_PORTAL_FOLDER" `
  --webSiteId YOUR_WEBSITE_ID `
  --modelVersion "2" `
  --overwrite true
```

## Pages Upload

```powershell
# Upload portal files to Dataverse
pac pages upload `
  --path "power pages\\\YOUR_PORTAL_FOLDER\YOUR_PORTAL_SLUG" `
  --modelVersion "2"
```

## restore-and-spin Portal

Commands scoped to the **restore-and-spin** portal (`power pages\restore-and-spin\`).

```powershell
# Download restore-and-spin portal (overwrites local files)
pac pages download --overwrite `
  --path "power pages\restore-and-spin" `
  --webSiteId YOUR_WEBSITE_ID `
  --modelVersion "2"

# Upload restore-and-spin portal to Dataverse
pac pages upload `
  --path "power pages\restore-and-spin\restore-and-spin" `
  --modelVersion "2"
```

> **Portal folder:** `power pages\restore-and-spin\`  
> **Site content folder (upload path):** `power pages\restore-and-spin\restore-and-spin\`  
> PAC CLI appends the site slug automatically on download; point upload at the site content subfolder where `website.yml` lives.

## Reference

| Parameter | Value |
|-----------|-------|
| Website ID | `YOUR_WEBSITE_ID` |
| Model Version | `2` |
| Environment | `YOUR_ORG_URL` |
| Upload Path | `power pages\\\YOUR_PORTAL_FOLDER\YOUR_PORTAL_SLUG` |
| Download Path | `power pages\\\YOUR_PORTAL_FOLDER` (PAC appends `YOUR_PORTAL_SLUG\` automatically) |

Upload must point to the `YOUR_PORTAL_SLUG\` subfolder — that is where the manifest lives.
Download should target the parent folder; PAC will create/update `YOUR_PORTAL_SLUG\` inside it.
