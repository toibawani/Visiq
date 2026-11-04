#!/usr/bin/env node
// Auto-fix simple ESLint issues: trailing commas, semi-statements, quotes
const fs = require('node:fs');
const path = require('node:path');

const files = [
  'assets/integrators.js',
  'assets/stats-tracker.js',
  'assets/theme-toggle.js',
  'assets/error-boundary.js',
];

for (const f of files) {
  const fullPath = path.join(process.cwd(), 'assets', f);
  if (!fs.existsSync(fullPath)) continue;
  let code = fs.readFileSync(fullPath, 'utf8');
  // Simple fixes
  code = code.replace(/,\s*}/g, '}'); // trailing commas before }
  code = code.replace(/;\s*$/gm, ''); // trailing semicolons at EOF per-file
  code = code.replace(/'([^']+)'/g, '"$1"'); // single to double quotes (limited)
  fs.writeFileSync(fullPath, code);
  console.log(`Fixed: ${f}`);
}
console.log('Lint-fix complete.');
