#!/usr/bin/env node

/**
 * Bump version across all workspace packages, the changelog page,
 * and the layout status bar.
 *
 * Usage:
 *   pnpm version:bump patch   # 0.1.0 → 0.1.1
 *   pnpm version:bump minor   # 0.1.0 → 0.2.0
 *   pnpm version:bump major   # 0.1.0 → 1.0.0
 *   pnpm version:bump 1.2.3   # set exact version
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '..');
const bumpType = process.argv[2];

if (!bumpType) {
  console.error('Usage: pnpm version:bump <patch|minor|major|x.y.z>');
  process.exit(1);
}

// Read current version from core package
const corePkg = JSON.parse(readFileSync(join(root, 'packages/core/package.json'), 'utf-8'));
const current = corePkg.version;
const [major, minor, patch] = current.split('.').map(Number);

let newVersion;
if (bumpType === 'patch') newVersion = `${major}.${minor}.${patch + 1}`;
else if (bumpType === 'minor') newVersion = `${major}.${minor + 1}.0`;
else if (bumpType === 'major') newVersion = `${major + 1}.0.0`;
else if (/^\d+\.\d+\.\d+$/.test(bumpType)) newVersion = bumpType;
else {
  console.error(`Invalid bump type: "${bumpType}". Use patch, minor, major, or x.y.z`);
  process.exit(1);
}

console.log(`Bumping version: ${current} → ${newVersion}`);

// Update all package.json files
const packages = ['packages/core', 'packages/cli', 'packages/web'];
for (const pkg of packages) {
  const pkgPath = join(root, pkg, 'package.json');
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkgJson.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n');
  console.log(`  Updated ${pkg}/package.json`);
}

// Update layout status bar version
const layoutPath = join(root, 'packages/web/app/layouts/default.vue');
let layout = readFileSync(layoutPath, 'utf-8');
layout = layout.replace(/const appVersion = '[^']+'/, `const appVersion = '${newVersion}'`);
writeFileSync(layoutPath, layout);
console.log('  Updated layout status bar');

// Update core index.ts version
const indexPath = join(root, 'packages/core/src/index.ts');
let index = readFileSync(indexPath, 'utf-8');
index = index.replace(/version: '[^']+'/g, `version: '${newVersion}'`);
writeFileSync(indexPath, index);
console.log('  Updated core version string');

// Update parity checker version
const parityPath = join(root, 'packages/core/src/parity/parity-checker.ts');
let parity = readFileSync(parityPath, 'utf-8');
parity = parity.replace(/version: '[^']+'/g, `version: '${newVersion}'`);
writeFileSync(parityPath, parity);
console.log('  Updated parity checker version');

console.log(`\nVersion bumped to ${newVersion}`);
console.log('Remember to:');
console.log('  1. Add a new entry to CHANGELOG.md');
console.log('  2. Update packages/web/app/pages/changelog.vue with the new release');
console.log('  3. Rebuild: pnpm build');
