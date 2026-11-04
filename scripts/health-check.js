#!/usr/bin/env node
// Health check for CI
const fs = require('node:fs');
const path = require('node:path');

const checks = [
  { name: 'package.json exists', path: 'package.json' },
  { name: 'vitest config exists', path: 'vitest.config.mjs' },
  { name: 'tsconfig.json exists', path: 'tsconfig.json' },
  { name: 'eslint config exists', path: 'eslint.config.mjs' },
  { name: 'GitHub Actions dir exists', path: '.github/workflows' },
  { name: 'CHANGELOG.md exists', path: 'CHANGELOG.md' },
  { name: 'SECURITY.md exists', path: 'SECURITY.md' },
  { name: 'CODEOWNERS exists', path: 'CODEOWNERS' },
  { name: '.prettierrc exists', path: '.prettierrc' },
];

let allPass = true;
for (const check of checks) {
  const exists = fs.existsSync(path.join(process.cwd(), check.path));
  console.log(`${exists ? '✓' : '❌'} ${check.name}`);
  if (!exists) allPass = false;
}
console.log(allPass ? 'All checks passed!' : 'Some checks failed!');
process.exit(allPass ? 0 : 1);
