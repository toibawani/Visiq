# Security Policy

## Supported Versions

VISIQ is a static, client-side science visualization platform. There are no
server components, no database, and no user credentials stored by the application.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security issue, please email **toibawani14@gmail.com**
with details. We do not operate a bug-bounty program, but we will acknowledge
and address valid reports promptly.

## Security Notes

- **No secrets or credentials** are committed to project files.
- The Content Security Policy (CSP) is declared via `<meta>` in `index.html`
  and reinforced in `_headers` for GitHub Pages.
- Error telemetry is stored **locally in `localStorage`** only; nothing is
  transmitted to a remote server (`assets/error-boundary.js`).
- Third-party scripts are limited to p5.js (via cdnjs) and self-hosted fonts.

## Dependency Scanning

This repository uses [Dependabot](.github/dependabot.yml) for weekly npm and
GitHub Actions dependency updates, and [GitHub Code Scanning] runs on push and
pull requests.
