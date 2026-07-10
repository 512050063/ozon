import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

const service = fs.readFileSync(path.join(root, 'backend/src/services/ozonPromotionService.ts'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'backend/src/controllers/ozonPromotionController.ts'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'backend/src/routes/ozonPromotionRoutes.ts'), 'utf8');
const api = fs.readFileSync(path.join(root, 'frontend/src/api/ozonPromotionAPI.ts'), 'utf8');
const page = fs.readFileSync(path.join(root, 'frontend/src/views/ozon/promotions/Index.vue'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'frontend/src/components/MainLayout.vue'), 'utf8');

assert.match(
  service,
  /prisma\.syncLog\.create[\s\S]*syncType:\s*'promotion'/,
  'promotion update should write a persistent sync_logs row'
);
assert.match(
  service,
  /getPromotionSyncLogs/,
  'promotion service should expose persistent sync log query'
);
assert.match(
  controller,
  /getPromotionSyncLogs/,
  'promotion controller should expose sync log handler'
);
assert.match(
  routes,
  /router\.get\('\/:storeId\/sync-logs'/,
  'promotion routes should register sync log endpoint before generic store route'
);
assert.match(
  api,
  /getPromotions:[\s\S]*params:\s*\{\s*sync/,
  'promotion API should support explicit sync flag for update button requests'
);
assert.match(
  api,
  /getSyncLogs:[\s\S]*\/ozon\/promotions\/\$\{storeId\}\/sync-logs/,
  'promotion API should expose persistent sync log query'
);
assert.doesNotMatch(
  page,
  /addUpdateDetailRow/,
  'promotion page should not fake update logs in component memory'
);
assert.match(
  page,
  /ozonPromotionAPI\.getSyncLogs/,
  'promotion page should read sync logs from backend'
);
assert.doesNotMatch(
  layout,
  /getActiveGlobalUpdates\(\)\[0\]\s*\|\|\s*null/,
  'layout should not show updates from unrelated route modules'
);
assert.match(
  layout,
  /currentPageUpdating[\s\S]*currentUpdateModule[\s\S]*getModuleMeta\(module\)\.updating/,
  'layout should only mask the current page for updates scoped to the current route module'
);

console.log('ozonPromotionSyncLog.test passed');
