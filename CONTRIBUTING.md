# Contributing to VISIQ

## Development Workflow

1. **Branch**: Create a feature branch from `cline/91b41`
2. **Commit**: Use Conventional Commits (`feat`, `fix`, `docs`, `test`, `refactor`, `perf`)
3. **Tests**: Add/expand Vitest specs; run `npm test` to verify
4. **Lint**: Run `npm run lint` — fixes auto with `npm run lint:fix`
5. **Push**: Push to `cline/91b41`; CI runs automatically
6. **Pull Request**: Target `main`; reviewers from `@toibawani`

## Conventional Commits

Commit messages follow [Conventional Commits](https://conventionalcommits.org/):
- `feat`: New feature or file
- `fix`: Bug repair
- `docs`: Documentation changes
- `test`: Adding or fixing tests
- `refactor`: Code restructure without behavior change
- `perf`: Performance improvement

## Code Ownership

`@toibawani` owns all paths per `CODEOWNERS`.

## Local Setup

```bash
git clone https://github.com/toibawani/visiq.git
cd visiq
npm install
npm test       # runs 150+ Vitest specs
npm run typecheck  # tsc --noEmit
npm run lint   # ESLint clean
```
