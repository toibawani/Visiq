#!/usr/bin/env node
// Simple version bump script
const pkg = require('./package.json');
const fs = require('node:fs');
const args = process.argv.slice(2);
const bump = args[1] || 'patch'; // major|minor|patch

const [major, minor, patch] = pkg.version.split('.').map(Number);
let newVersion;
switch (bump) {
  case 'major': newVersion = `${major + 1}.0.0`; break;
  case 'minor': newVersion = `${major}.${minor + 1}.0`; break;
  case 'patch': newVersion = `${major}.${minor}.${patch + 1}`; break;
  default: console.error(`Unknown bump: ${bump}`); process.exit(1);
}

pkg.version = newVersion;
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log(`Bumped version from ${pkg.version} to ${newVersion}`);
EOF