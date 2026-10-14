# Contributing Guide

## 🛠️ Development Setup

1. Clone the repo and `cd visiq`
2. Run `npm install` to install dev tooling
3. Run `npm test` to verify Vitest passes (73 tests across 7 test files)
4. Run `npm run typecheck` to verify `tsc --noEmit` passes

## 📝 Conventional Commits

All commits must follow the [Conventional Commits](https://conventionalcommits.org/) format:

```
<type>(<scope>): <short imperative description>
```

**Valid types:** `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `test`, `perf`

**Examples:**
- `feat(black-hole): add photon sphere readout and time dilation readout`
- `fix(solar-system): correct Moon's exaggerated orbit from 1500× to realistic scale`
- `refactor(integrators): improve RK4 stability for long-term orbit integration`
- `docs(changelog): add changelog documenting session work`
- `test(seasons): add known-answer tests for declination and daylight hours`

The description line should be:
- Under 50-72 characters
- Lowercase
- Written in the imperative mood (e.g., "add feature", not "added feature")

## 🌿 Branching

- Use `feature/<feature-name>` for new simulations or features
- Use `bugfix/<issue-name>` for bug fixes
- Use `refactor/<module-name>` for refactoring work
- Branches should be short-lived and merged via pull request

## 🧪 Testing Requirements

Before a hero simulation is marked "shipped", all quality gates must pass:

1. **Tests pass** (`npm test`) and new physics tests assert real known answers
2. **Heap and renderer.info numbers** pasted from the 20-open-close leak test
3. **FPS measured** at 4× CPU throttle, target 60 or documented 30 for heaviest
4. **Screenshots** at 1440 and 375, light and dark, first frame and after 10 seconds
5. **Zero console errors and warnings**
6. **Honest "limits" line** written in the sim

## 📦 Pull Request Process

1. Make small, atomic commits (one change per commit)
2. Push feature branch to origin
3. Open a PR with:
   - Summary: 2-3 bullet points on what was changed and why
   - Key Changes: Technical breakdown of modified components
   - How to Test: Quick step-by-step instructions
4. Address reviewer feedback with additional commits
5. Maintainer merges and deletes the branch

## 📄 License

MIT — see [LICENSE](LICENSE).