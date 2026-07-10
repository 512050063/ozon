import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');
const service = fs.readFileSync(path.join(root, 'backend/src/services/ozonProductService.ts'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'backend/src/controllers/ozonStoreController.ts'), 'utf8');

assert.doesNotMatch(service, /uploadLocalImageToImageHost/, 'Ozon service should not upload local images to imagehost');
assert.doesNotMatch(service, /getImageHostConfig/, 'Ozon service should not require imagehost config');
assert.match(service, /resolveProductImagesForOzon/, 'Ozon service should expose public image URL resolver');
assert.match(service, /resolvePublicAssetUrl/, 'Ozon service should use public asset URL resolver');
assert.doesNotMatch(controller, /convertProductImagesToImageHost/, 'Ozon controller should not call imagehost conversion');

console.log('ozonProductImageResolution test passed');
