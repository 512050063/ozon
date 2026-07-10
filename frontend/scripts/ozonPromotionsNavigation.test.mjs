import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

const router = fs.readFileSync(path.join(root, 'frontend/src/router/index.ts'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'frontend/src/components/MainLayout.vue'), 'utf8');
const roleManagement = fs.readFileSync(path.join(root, 'frontend/src/views/settings/role-management/Index.vue'), 'utf8');
const installTypes = fs.readFileSync(path.join(root, 'backend/src/install/installTypes.ts'), 'utf8');
const installSeed = fs.readFileSync(path.join(root, 'backend/src/install/installSeedService.ts'), 'utf8');
const initDatabase = fs.readFileSync(path.join(root, 'backend/src/scripts/initDatabase.ts'), 'utf8');

assert.match(router, /path:\s*'\/ozon\/promotions'/, 'router should define Ozon promotions route');
assert.match(router, /menuKey:\s*'ozon\/promotions'/, 'promotions route should use ozon/promotions menu key');
assert.match(
  router,
  /!permissions\.includes\(menuKey\)/,
  'router should require direct menu permission by default',
);
assert.doesNotMatch(
  router,
  /menuKey\s*===\s*'ozon\/promotions'[\s\S]*permissions\.includes\('ozon\/order-management'\)/,
  'promotions route must not inherit order management permission',
);

assert.match(layout, /hasPermission\('ozon\/promotions'\)/, 'main layout should check promotions permission');
assert.match(layout, /navigateTo\('\/ozon\/promotions'\)/, 'main layout should navigate to promotions page');
assert.match(layout, /促销活动/, 'main layout should label the promotions submenu');
assert.match(
  layout,
  /return permissions\.includes\(menuKey\);/,
  'main layout should require direct leaf permission by default',
);
assert.doesNotMatch(
  layout,
  /menuKey\s*===\s*'ozon\/promotions'[\s\S]*permissions\.includes\('ozon\/order-management'\)/,
  'promotions menu must not inherit order management permission',
);

const orderIndex = layout.indexOf("navigateTo('/ozon/order-management')");
const promotionsIndex = layout.indexOf("navigateTo('/ozon/promotions')");
const financeIndex = layout.indexOf("navigateTo('/ozon/finance-report')");
assert.ok(orderIndex > -1, 'order submenu should exist');
assert.ok(promotionsIndex > -1, 'promotions submenu should exist');
assert.ok(financeIndex > -1, 'finance submenu should exist');
assert.ok(orderIndex < promotionsIndex && promotionsIndex < financeIndex, 'promotions submenu should be between order management and finance report');

assert.match(roleManagement, /code:\s*'ozon\/promotions'[\s\S]*label:\s*'促销活动'/, 'role permission tree should expose promotions leaf');
assert.match(installTypes, /'ozon\/promotions'/, 'install permission constants should include promotions');
assert.match(installSeed, /'ozon\/promotions'/, 'production seed roles should include promotions');
assert.match(initDatabase, /'ozon\/promotions'/, 'development init roles should include promotions');

console.log('ozonPromotionsNavigation.test passed');
