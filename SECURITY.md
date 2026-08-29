# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| Latest `main` branch commit | :white_check_mark: |
| Most recent tagged release | :white_check_mark: |
| Older releases | :x: |

## Reporting a Vulnerability (Private)

Please do **not** open public issues for suspected vulnerabilities.

Use GitHub Security Advisories private reporting for `YOUR_ORG_NAME/YOUR_PROJECT_NAME`:

1. Open the repository on GitHub.
2. Go to **Security** -> **Advisories** -> **Report a vulnerability**.
3. Share reproduction steps, impact, and any known mitigations.

If GitHub private reporting is unavailable, contact the maintainers through your internal security contact channel and include the same details.

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

This template uses GitHub Dependabot for automated dependency update pull requests:

- GitHub Actions dependencies
- Root-level npm dependencies

Configuration lives in `.github/dependabot.yml`.

Baseline tracking reference: [Andworx/andworx-power-platform-starter-template#5](https://github.com/Andworx/andworx-power-platform-starter-template/issues/5).

## Dependency and Dependabot Guidance

- Keep Dependabot (or equivalent dependency update automation) enabled for this repository.
- Treat security update PRs as high priority and validate quickly.
- If a dependency cannot be updated immediately, document compensating controls and planned remediation timeline.
