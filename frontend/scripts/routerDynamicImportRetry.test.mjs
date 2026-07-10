import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const routerSource = fs.readFileSync(path.join(root, 'frontend/src/router/index.ts'), 'utf8');

assert.match(
  routerSource,
  /MODULE_RELOAD_KEY_PREFIX/,
  'router should track one dynamic-import reload attempt per target route',
);
assert.match(
  routerSource,
  /sessionStorage\.getItem/,
  'router should avoid infinite reload loops with sessionStorage',
);
assert.match(
  routerSource,
  /window\.location\.(reload|assign)/,
  'router should hard reload once before showing the 502 module load page',
);
assert.match(
  routerSource,
  /router\.replace\(\{\s*path:\s*'\/502'/,
  'router should still show /502 when a retried module load continues to fail',
);

console.log('routerDynamicImportRetry.test passed');
