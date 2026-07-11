import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const srcRoot = path.resolve(path.dirname(__filename), '..');

const offenders = [];

walk(srcRoot);

assert.deepEqual(
  offenders,
  [],
  'Image assets must be imported through assetUrls instead of using /src/assets/images paths'
);

const assetSource = fs.readFileSync(path.join(srcRoot, 'utils', 'assetUrls.ts'), 'utf8');
const commonSource = fs.readFileSync(path.join(srcRoot, 'utils', 'common.ts'), 'utf8');

assert.match(assetSource, /resolveLegacyAssetUrl/, 'Legacy stored system avatar paths should be mapped to bundled assets');
assert.match(assetSource, /\/src\/assets\/images\/avatars\/t\$\{index\}\.png/, 'Legacy avatar path map should preserve old database values');
assert.match(commonSource, /resolveLegacyAssetUrl/, 'getFullImageUrl should resolve legacy asset paths before backend URL prefixing');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist'].includes(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!/\.(vue|ts|js)$/.test(entry.name)) continue;
    if (fullPath.endsWith(path.join('utils', 'assetUrls.ts'))) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('/src/assets/images/')) {
      offenders.push(path.relative(srcRoot, fullPath).replace(/\\/g, '/'));
    }
  }
}
