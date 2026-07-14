import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');
const preference = fs.readFileSync(path.join(root, 'frontend/src/views/product-analysis/ozon-preference/Index.vue'), 'utf8');

assert.match(
  preference,
  /products\.value = products\.value\.map\(/,
  'type result application should replace the products array so ProductList refreshes without a page reload',
);
assert.match(
  preference,
  /typeErrorMessage: ''/,
  'successful type results should clear the previous inline failure message',
);

console.log('ozonTypeFrontendRefresh tests passed');
