<!--
Thanks for contributing to VISIQ!
Please fill this out completely. Keep the change small and single-purpose.
See docs/CONTRIBUTING.md for the branching, commit, and review process.
-->

## What does this PR do?

<!-- A short description of the change and why it's needed. -->

Closes #<!-- issue number, if any -->

## Type of change

- [ ] Bug fix (`fix:` — non-breaking change that fixes an issue)
- [ ] New feature (`feat:` — non-breaking change that adds functionality)
- [ ] Breaking change (would cause existing functionality to change)
- [ ] Documentation only (`docs:`)
- [ ] Tests only (`test:`)
- [ ] Tooling / config / CI (`chore:` / `ci:`)
- [ ] Refactor (`refactor:` — no behavior change)

## Branch & commit hygiene

- [ ] My branch is named with a type prefix (`feature/`, `fix/`, `docs/`, `chore/`, …).
- [ ] My commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- [ ] I did **not** commit directly to `main`.
- [ ] I rebased on / merged the latest `main` and resolved conflicts.

## Testing checklist

- [ ] `npm test` passes (Vitest).
- [ ] `npm run typecheck` passes (`tsc --noEmit`).
- [ ] I added a test for any new physics / numeric behavior, with a stated tolerance.
- [ ] If this touches a simulation, I manually opened it in the browser and verified the behavior.
- [ ] If this changes `assets/simulations-data.js`, the README simulation table stays accurate.

## Screenshots / notes (if applicable)

<!-- Add screenshots for UI changes, or notes on anything reviewers should watch for. -->
