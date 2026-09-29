# scripts

## Purpose

This folder contains PowerShell automation for deployment orchestration and Dataverse component import/export workflows.

## Structure

- `Deploy-Project.ps1`: orchestrated import/export job runner.
- `Test-DemoNetwork.ps1`: read-only Windows DNS and TCP diagnostics for the [browser API/private network plan](../docs/CONTROL_API_NETWORK_PLAN.md).
- `DEPLOYMENT_GUIDE.md` and `QUICK_REFERENCE.md`: operator documentation.

## Usage workflow

Run deployment commands from the repo root. Power Pages and Power Apps code
assets are deployed with PAC CLI; see `PAC_COMMANDS.md`.

For network diagnosis, supply a service hostname and optional resolver/expected
addresses. Pipe the result to `ConvertTo-Json -Depth 5` to retain all fields:

```powershell
.\scripts\Test-DemoNetwork.ps1 -ServiceName 'example.azurewebsites.net' -RouterDns '192.168.8.1' -AzureDns '10.20.3.4' | ConvertTo-Json -Depth 5
```

The check reports A/AAAA answers and TCP reachability separately. It does not
test browser permission, authentication or application behavior. Keep operational
output local; review it before sharing.

## Updating this README

Update this file whenever scripts are added, removed, or renamed.
