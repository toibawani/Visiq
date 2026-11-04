#!/usr/bin/env node
// Quick test entrypoint validator
const { run } = require('node:test');
const { join } = require('node:path');

const testFiles = [
  'tests/scenario-validator.test.js',
  'tests/integrators-extended.test.js',
  'tests/wave-superposition.test.js',
  'tests/config.test.js',
  'tests/search-matching.test.js',
  'tests/simulation-math.test.js',
  'tests/favorites-filter.test.js',
  'tests/keyboard-shortcuts.test.js',
  'tests/sorting-system.test.js',
  'tests/theme-system.test.js',
  'tests/simulations-data.test.js',
];

console.log('Validating test entry points...');
for (const tf of testFiles) {
  const fullPath = join(process.cwd(), tf);
  const exists = require('node:fs').existsSync(fullPath);
  console.log(exists ? `✓ ${tf}` : `❌ Missing: ${tf}`);
}
console.log('Done.');
