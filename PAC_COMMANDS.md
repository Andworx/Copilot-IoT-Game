# PAC CLI Commands

## Solution — Export

```powershell
pac solution export --name CopilotIoTGame --path "solutions" -ow
```

## Solution — Unpack

```powershell
pac solution unpack --zipfile "solutions\CopilotIoTGame.zip" --folder "solutions\CopilotIoTGame" --allowWrite
```

## Solution — Pack

```powershell
pac solution pack -z solutions\CopilotIoTGame.zip -f solutions\CopilotIoTGame -aw
```

## Solution — Import

```powershell
pac solution import --path "solutions\CopilotIoTGame.zip" -pc
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

### copilotiotgame

```powershell
cd "power pages\copilotiotgame"
npm install
npm run build
pac pages upload-code-site --rootPath "."
```

### prize wheel

```powershell
cd "power pages\prize wheel"
npm install
npm run build
pac pages upload-code-site --rootPath "."
```
