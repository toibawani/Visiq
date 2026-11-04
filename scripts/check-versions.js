#!/usr/bin/env node
// Check Node and package versions for CI compatibility
const pkg = require('./package.json');

console.log('📦 Package:', pkg.name);
console.log('📦 Version:', pkg.version);
console.log('🟢 Node would need >=', pkg.engines.node || '>=18');
console.log('🟢 Dev dependencies:', Object.keys(pkg.devDependencies).slice(0, 5).join(', '));
console.log('🟢 Test count from package.json scripts: vitest run');
