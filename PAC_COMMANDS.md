# PAC CLI Commands

## GitHub Actions releases

Use [the CI/CD workflow](docs/CI_CD.md) for routine Function App and
`copilotiotgame` releases: PR build checks, then automatic deployment after
relevant changes merge to `main`. Workflow: `.github/workflows/deploy-apps.yml`.
Local publishing commands are for explicitly requested recovery/bootstrap work.
Other Power Platform components retain their existing PAC workflows.

## CopilotIoTGame Solution

### CopilotIoTGame Solution — Export

```powershell
pac solution export --name CopilotIoTGame --path "solutions" -ow
```

### CopilotIoTGame Solution — Unpack

```powershell
pac solution unpack --zipfile "solutions\CopilotIoTGame.zip" --folder "solutions\CopilotIoTGame" --allowWrite -ad
```

### CopilotIoTGame Solution — Pack

```powershell
pac solution pack -z solutions\CopilotIoTGame.zip -f solutions\CopilotIoTGame -aw
```

### CopilotIoTGame Solution — Import

```powershell
pac solution import --path "solutions\CopilotIoTGame.zip" -pc
```

## MCPQuest Solution

Owns the MCP Quest play table. Depends on `andy_PrizeEngine`, so import PrizeEngine first.

### MCPQuest Solution — Export

```powershell
pac solution export --name MCPQuest --path "solutions" -ow
```

### MCPQuest Solution — Unpack

```powershell
pac solution unpack --zipfile "solutions\MCPQuest.zip" --folder "solutions\MCPQuest" --allowWrite -ad
```

### MCPQuest Solution — Pack

```powershell
pac solution pack -z solutions\MCPQuest.zip -f solutions\MCPQuest -aw
```

### MCPQuest Solution — Import

```powershell
pac solution import --path "solutions\MCPQuest.zip" -pc
```

## PrizeEngine Solution

### PrizeEngine Solution — Export

```powershell
pac solution export --name andy_PrizeEngine --path "solutions" -ow
```

### PrizeEngine Solution — Unpack

```powershell
pac solution unpack --zipfile "solutions\andy_PrizeEngine.zip" --folder "solutions\PrizeEngine" --allowWrite -ad
```

### PrizeEngine Solution — Pack

```powershell
pac solution pack -z solutions\andy_PrizeEngine.zip -f solutions\PrizeEngine -aw
```

### PrizeEngine Solution — Import

```powershell
pac solution import --path "solutions\andy_PrizeEngine.zip" -pc
```

## Power Apps Code App — Build & Push

> Code Apps use `pac code push`, not `pac pages upload-code-site` (that command is for
> Power Pages Code Sites only — see below). First-time setup on a new environment also
> needs `pac code init` before the first push; see `power apps/<app>/README.md`.

### game-box-control

```powershell
cd "power apps\game-box-control"
npm install
npm run build
pac code push
```

## Power Pages Code Site — Build & Upload

> `pac pages upload` / `pac pages download` are classic-portal commands — do not use them
> on these sites, they will corrupt code-site metadata. Always use `upload-code-site`.

### copilotiotgame (active CI/CD site)

Routine releases use `deploy-apps.yml`, which pins the live site and downloads its
metadata before uploading (see `docs/CI_CD.md`). For explicit manual recovery, do the
same: `upload-code-site` has no website-ID option and creates a **new website** when
its `.powerpages-site/` folder does not match one. That folder is generated, git-ignored
state owned by the live site (it is not in the repo): download it fresh, upload right
away, and never commit, hand-edit, or reuse it.

```powershell
cd "power pages\copilotiotgame"
npm install
npm run build
# Live site = the one bound to copilotiotgame.powerappsportals.com
pac pages list
pac pages download-code-site --path "$env:TEMP\live-site" --webSiteId 4938f099-b8dd-485f-a5c2-3c4ad4b7e02a --overwrite
Remove-Item ".powerpages-site" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item (Get-ChildItem "$env:TEMP\live-site" -Recurse -Directory -Force -Filter ".powerpages-site" | Select-Object -First 1).FullName ".powerpages-site" -Recurse
pac pages upload-code-site --rootPath "."
```

### prize wheel

```powershell
cd "power pages\prize wheel"
npm install
npm run build
pac pages upload-code-site --rootPath "."
```

### plinko

```powershell
cd "power pages\plinko"
npm install
npm run build
pac pages upload-code-site --rootPath "."
```

### mcpquest

Routine releases use `deploy-apps.yml` (`build-mcpquest`, then the pinned upload). The site
ID is `4fb95e05-e635-4f0c-a0e3-4065f5dfb72a`; override it with the `POWER_MCPQUEST_WEBSITE_ID` repository variable.

For explicit manual recovery, build as CI does (`VITE_MCPQUEST_API=live` ships no case logic)
and upload against the live site's metadata, as for `copilotiotgame`:

```powershell
cd "power pages\mcpquest"
npm ci
$env:VITE_MCPQUEST_API = "live"
npm run build
pac pages download-code-site --path "$env:TEMP\live-mcpquest" --webSiteId 4fb95e05-e635-4f0c-a0e3-4065f5dfb72a --overwrite
Remove-Item ".powerpages-site" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item (Get-ChildItem "$env:TEMP\live-mcpquest" -Recurse -Directory -Force -Filter ".powerpages-site" | Select-Object -First 1).FullName ".powerpages-site" -Recurse
pac pages upload-code-site --rootPath "."
```

The build also needs `azure/functions/game/src/mcpquest/`, which holds the shared contract.

Authenticate to the intended Dataverse environment first. Activate an initial
inactive site through Power Pages, then verify the public site.
