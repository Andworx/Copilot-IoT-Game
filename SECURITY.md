# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| Latest `main` branch commit | :white_check_mark: |
| Most recent tagged release | :white_check_mark: |
| Older releases | :x: |

## Reporting a Vulnerability (Private)

Please do **not** open public issues for suspected vulnerabilities.

This is a private repository (`Andworx/Copilot-IoT-Game`). Report suspected vulnerabilities directly to the repository owners (Andworx maintainers) through your internal security contact channel, not through issues, pull requests, or discussions.

Include:

- Affected path(s) and commit SHA, where known
- Reproduction steps and observed impact
- Any known mitigations

If GitHub private vulnerability reporting is enabled for the repository in future, prefer it: **Security** -> **Advisories** -> **Report a vulnerability**.

## Response SLA

- **Acknowledgement target:** within 2 business days
- **Initial triage target:** within 5 business days
- **Status updates:** at least every 5 business days until resolution or accepted risk decision

## Scope

### In Scope

- Source code, scripts, and configuration in this repository
- Build and CI/CD workflow definitions in this repository
- Dependency vulnerabilities in packages declared by this repository
- Secret or credential exposure that is currently accessible from this repository

### Out of Scope

- Vulnerabilities in forks or private deployments not maintained by this repository's owners
- Social engineering, phishing, or physical security testing
- Third-party service outages or misconfiguration outside this repository's control
- Issues that require privileged access you do not already have (unless explicitly authorized)

## Secrets and Credentials Policy

If you discover exposed secrets, keys, tokens, or credentials:

1. Report privately through the process above.
2. **Do not** disclose the secret value in public issues, PRs, or discussions.
3. Provide commit SHA/path references where exposure exists.
4. Repository maintainers should rotate/revoke credentials and remove exposed values from active code.
5. If exposure exists in Git history, maintainers should coordinate history remediation and force credential rotation.

## Dependency Updates

GitHub Dependabot opens weekly update pull requests (configuration: `.github/dependabot.yml`) for:

- GitHub Actions workflows
- Root-level npm dependencies (Playwright)
- The Function App (`azure/functions/game`), Code Site (`power pages/copilotiotgame`), and both Power Apps (`power apps/*`), with minor and patch updates grouped per project
- Python requirements for the Raspberry Pi projects (`hardware/plinko-pi`, `hardware/raspberry-pi`)
- The Dataverse plugin template (NuGet)

When adding a new package root, add a matching entry to `.github/dependabot.yml`.

## Dependency and Dependabot Guidance

- Keep Dependabot (or equivalent dependency update automation) enabled for this repository.
- Treat security update PRs as high priority and validate quickly.
- If a dependency cannot be updated immediately, document compensating controls and planned remediation timeline.
