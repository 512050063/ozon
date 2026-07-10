import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');
const controller = fs.readFileSync(path.join(root, 'backend/src/controllers/imageController.ts'), 'utf8');

assert.doesNotMatch(controller, /DEFAULT_IMAGE_HOST_URL/, 'image controller should not keep a default third-party image host');
assert.doesNotMatch(controller, /axios\.post\(`\$\{baseUrl\}upload`/, 'image upload should not call imagehost upload API');
assert.doesNotMatch(controller, /axios\.delete\(`\$\{baseUrl\}images/, 'image delete should not call imagehost delete API');
assert.match(controller, /getImageUploadDir\(\)/, 'local uploads should use persistent upload directory helper');
assert.match(controller, /fileUrl:\s*`\/uploads\/images\/\$\{fileName\}`/, 'local uploads should store /uploads/images URLs');

console.log('imageControllerNoImageHost test passed');
