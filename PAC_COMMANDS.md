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
pac solution pack --zipfile "solutions\CopilotIoTGame.zip" --folder "solutions\CopilotIoTGame"
```

## Solution — Import

```powershell
pac solution import --path "solutions\CopilotIoTGame.zip"
```

## Power Pages Code Site — Build & Upload

> `pac pages upload` / `pac pages download` are classic-portal commands — do not use them
> on these sites, they will corrupt code-site metadata. Always use `upload-code-site`.

### restore-and-spin

```powershell
cd "power pages\restore-and-spin"
npm install
npm run build
pac pages upload-code-site --rootPath "."
```

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
