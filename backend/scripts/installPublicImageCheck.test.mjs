import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');
const installService = fs.readFileSync(path.join(root, 'backend/src/install/installEnvironmentService.ts'), 'utf8');
const nginx = fs.readFileSync(path.join(root, 'deploy/nginx/ozon.conf.example'), 'utf8');
const app = fs.readFileSync(path.join(root, 'backend/src/app.ts'), 'utf8');

assert.match(installService, /PUBLIC_BASE_URL/, 'install checks should validate PUBLIC_BASE_URL');
assert.match(installService, /uploads\/images/, 'install checks should validate public upload images');
assert.match(installService, /getImageUploadDir/, 'install checks should write the probe image to the managed upload dir');
assert.match(app, /getUploadRoot\(\)/, 'express should expose the managed upload root');
assert.match(nginx, /location \/uploads\//, 'nginx config should expose uploads');
assert.match(nginx, /alias .*uploads/, 'nginx config should use alias for persistent uploads');

console.log('installPublicImageCheck test passed');
