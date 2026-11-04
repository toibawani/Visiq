#!/usr/bin/env node
// Quick lint check for JS entry points
const fs = require('node:fs');
const path = require('node:path');

const entryPoints = [
  'sw.js',
  'gallery.js',
  'assets/integrators.js',
  'assets/stats-tracker.js',
  'assets/favorites-filter.js',
  'assets/sorting-system.js',
  'assets/theme-toggle.js',
];

let allPassed = true;
for (const f of entryPoints) {
  const fullPath = path.join(process.cwd(), 'assets', f);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing: ${f}`);
    allPassed = false;
    continue;
  }
  const code = fs.readFileSync(fullPath, 'utf8');
  // Basic syntax check: count braces
  const open = (code.match(/{/g) || []).length;
  const close = (code.match(/}/g) || []).length;
  if (open !== close) {
    console.error(`⚠️  brace mismatch in ${f}: ${open} open, ${close} close`);
    allPassed = false;
  } else {
    console.log(`✓ ${f}: braces balanced`);
  }
}

process.exit(allPassed ? 0 : 1);
