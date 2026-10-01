# Azure

All Azure-hosted application and infrastructure source lives under this directory.

| Directory | Owner | Purpose |
|---|---|---|
| [`functions/game`](functions/game/README.md) | Application workflow | Node 22 Azure Functions source shared by the public game API and Entra-protected staff API deployments |
| [`infrastructure`](infrastructure/README.md) | Infrastructure workflow | Bicep, production parameters, IAM bootstrap scripts, network baseline and reference snapshots |

The workflows intentionally remain separate:

- `.github/workflows/deploy-apps.yml` builds application artifacts, deploys the backends, then deploys independent frontends in parallel.
- `.github/workflows/deploy-infra.yml` previews Bicep on every relevant merge and applies changes only through an explicit `deploy` dispatch from `main`.

See [`docs/CI_CD.md`](../docs/CI_CD.md) for release order, credentials and validation requirements.
