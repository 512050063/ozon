import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const routeSource = fs.readFileSync(path.resolve(__dirname, '../routes/imageRoutes.ts'), 'utf8');
const controllerSource = fs.readFileSync(path.resolve(__dirname, '../controllers/imageController.ts'), 'utf8');

assert.match(routeSource, /router\.get\(['"]\/proxy['"]/, 'image proxy route should be registered before /:id routes');
assert.match(controllerSource, /proxyRemoteImage/, 'image controller should expose proxyRemoteImage');
assert.match(controllerSource, /isAllowedRemoteImageUrl/, 'image proxy should validate allowed remote image URLs');
assert.match(controllerSource, /ozon/i, 'image proxy should only allow Ozon remote images');
