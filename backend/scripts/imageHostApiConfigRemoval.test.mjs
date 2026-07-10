import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');
const apiController = fs.readFileSync(path.join(root, 'backend/src/controllers/apiConfigController.ts'), 'utf8');
const apiPage = fs.readFileSync(path.join(root, 'frontend/src/views/settings/api-config/Index.vue'), 'utf8');

assert.doesNotMatch(apiController, /platform === 'image-host'/, 'backend should not test image-host API config');
assert.doesNotMatch(apiPage, /name="image-host"/, 'API config page should not show image-host tab');
assert.doesNotMatch(apiPage, /图片托管/, 'API config page should not show image hosting text');

console.log('imageHostApiConfigRemoval test passed');
