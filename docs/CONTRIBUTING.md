# Contributing to VISIQ

Thanks for your interest in improving **VISIQ**! This repository is a static
gallery of interactive p5.js science simulations built with vanilla HTML, CSS,
and ES modules (no framework, no build step). It is early-stage and
solo-maintained, so **small, focused changes are the easiest to review and
merge.**

## Code of Conduct

By participating you agree to abide by our
[Code of Conduct](../CODE_OF_CONDUCT.md). Be kind, be constructive, and assume
good faith.

## Before you start

- Check the [README](../README.md) and [NOT-IMPLEMENTED.md](../NOT-IMPLEMENTED.md)
  so you don't re-plan something already done (or already declared out of scope).
- For non-trivial changes, open an **issue first** so we can agree on the
  approach before you write code.

## Local setup

```bash
git clone https://github.com/<you>/Visiq.git
cd Visiq
npm install
npm start          # live-server (default http://localhost:8000)
```

Then open the printed URL in your browser.

## Branching model

**Never commit directly to `main`.** Create a descriptive branch off `main` with
a type prefix:

| Prefix | Use for |
| --- | --- |
| `feature/` | A new simulation or capability |
| `fix/` | A bug fix |
| `docs/` | Documentation only |
| `test/` | Tests only |
| `chore/` | Tooling, config, dependencies, CI |
| `refactor/` | Behavior-preserving cleanup |

Examples: `feature/lotka-volterra`, `fix/theme-toggle-aria`, `chore/update-ci`.

```bash
git switch -c feature/my-change
```

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <imperative summary, <=72 chars>
```

Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `style`,
`build`, `ci`.

**Good:**
- `feat(pendulum): add RK4 integrator option`
- `fix(theme): persist toggle via localStorage`
- `docs: add CONTRIBUTING and Code of Conduct`

**Avoid:** `update`, `fix stuff`, `asdf`, `WIP` in merged history.

## Tests & checks

Every PR must keep CI green. Locally:

```bash
npm test            # Vitest
npm run typecheck   # tsc --noEmit
```

CI (`.github/workflows/ci.yml`) runs: install, typecheck, unit tests, JSON
validation (`vercel.json`, `manifest.webmanifest`, `package.json`), JS syntax
checks on entry points, and font-glyph coverage.

New physics or numeric code **must** ship with a test that states its tolerance
(see `tests/integrators.test.js` and `tests/orbit-drift.test.js`).

## Adding or changing a simulation

- Each sketch lives in `sketches/`.
- Register metadata + description in `assets/simulations-data.js` — this file is
  the **single source of truth** (it feeds the gallery, search, and README).
- Reuse the shared layer (`assets/integrators.js`, `assets/sim-base.js`,
  `assets/visual-kit.js`) instead of duplicating logic.

## Pull requests & review

1. Keep PRs **small and single-purpose**.
2. Fill in the PR template completely, including the testing checklist.
3. Link the issue this closes (e.g. `Closes #12`).
4. Push follow-up commits to the **same branch** during review; do not
   force-push mid-review.
5. Address review feedback with new commits (or a squash), then re-request
   review.
6. A PR is merged once CI is green, it has been reviewed, and feedback is
   addressed.

## Reporting bugs / requesting features

Use the issue templates. For bugs include steps to reproduce, expected vs.
actual behavior, and your OS + browser. For features, describe the problem and
the proposed behavior.

## Questions

Open an issue or email **toibawani14@gmail.com**. Thanks for contributing!
