import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

const schema = fs.readFileSync(path.join(root, 'backend/prisma/schema.prisma'), 'utf8');
const app = fs.readFileSync(path.join(root, 'backend/src/app.ts'), 'utf8');
const pushRoutes = fs.readFileSync(path.join(root, 'backend/src/routes/ozonPushRoutes.ts'), 'utf8');
const pushController = fs.readFileSync(path.join(root, 'backend/src/controllers/ozonPushController.ts'), 'utf8');
const storeController = fs.readFileSync(path.join(root, 'backend/src/controllers/ozonStoreController.ts'), 'utf8');
const storeRoutes = fs.readFileSync(path.join(root, 'backend/src/routes/ozonStoreRoutes.ts'), 'utf8');
const storeApi = fs.readFileSync(path.join(root, 'frontend/src/api/ozonStoreAPI.ts'), 'utf8');
const storePage = [
  'frontend/src/views/ozon/store-management/Index.vue',
  'frontend/src/views/ozon/store-management/components/StoreDetailDrawer.vue',
].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const types = fs.readFileSync(path.join(root, 'frontend/src/types/index.ts'), 'utf8');

assert.match(schema, /pushSecret\s+String\?\s+@unique/, 'OzonStore should store a unique push secret');
assert.match(schema, /pushEnabled\s+Boolean\s+@default\(true\)/, 'OzonStore should store whether push is enabled');
assert.match(schema, /model OzonPushEvent[\s\S]*@@map\("ozon_push_events"\)/, 'Schema should persist raw Ozon push events');
assert.match(schema, /@@unique\(\[ozonStoreId, eventKey\]\)/, 'Push events should be idempotent by event key per store');

assert.match(app, /req\.path\.startsWith\('\/ozon\/push'\)/, 'Ozon push route should bypass global auth');
assert.match(app, /app\.use\('\/api\/ozon\/push',\s*ozonPushRoutes\)/, 'App should mount public Ozon push routes');
assert.match(pushRoutes, /router\.post\('\/receive\/:storeId\/:secret'/, 'Push route should include store id and secret');
assert.match(pushController, /receiveOzonPush/, 'Push controller should expose receiveOzonPush');
assert.match(pushController, /pushSecret:\s*secret/, 'Push receiver should verify the store secret');
assert.match(pushController, /ozonPushEvent\.upsert/, 'Push receiver should upsert events for idempotency');
assert.match(pushController, /res\.status\(200\)\.json\(\{\s*success:\s*true/, 'Push receiver should quickly return 200');

assert.match(storeController, /getOzonPushUrl/, 'Store controller should generate a push URL');
assert.match(storeController, /resetOzonPushSecret/, 'Store controller should reset a push secret');
assert.match(storeRoutes, /:id\/push-config/, 'Store routes should expose push config endpoint');
assert.match(storeRoutes, /:id\/push-secret\/reset/, 'Store routes should expose reset push secret endpoint');

assert.match(storeApi, /getPushConfig/, 'Frontend API should fetch store push config');
assert.match(storeApi, /resetPushSecret/, 'Frontend API should reset store push secret');
assert.match(types, /pushUrl\?:\s*string/, 'OzonStore type should include pushUrl');
assert.match(storePage, /复制推送地址/, 'Store management page should expose copy push URL action');

console.log('ozonPushIntegration.test passed');
