import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

const files = [
  'frontend/src/views/warehouse/material-library/Index.vue',
  'frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue',
  'frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue',
];

for (const file of files) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  assert.doesNotMatch(content, /imagehost/, `${file} should not expose imagehost source`);
  assert.doesNotMatch(content, /图床/, `${file} should not show imagehost wording`);
}

console.log('frontendImageHostRemoval test passed');
