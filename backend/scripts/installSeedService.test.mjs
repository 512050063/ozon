import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const seedService = fs.readFileSync(
  path.join(root, 'backend/src/install/installSeedService.ts'),
  'utf8',
);
const installTypes = fs.readFileSync(
  path.join(root, 'backend/src/install/installTypes.ts'),
  'utf8',
);

assert.match(seedService, /ensureSystemRoles/, 'production seed should initialize system roles');
assert.match(seedService, /ensureAdminUser/, 'production seed should initialize first admin user');
assert.match(seedService, /ensureOzonConfig/, 'production seed should initialize Ozon config');
assert.match(seedService, /code:\s*'super_admin'[\s\S]*name:\s*'超管'[\s\S]*permissions:\s*\[\.\.\.SYSTEM_PERMISSIONS\]/, 'production seed should include super admin role with full permissions');
assert.match(seedService, /code:\s*'admin'[\s\S]*name:\s*'管理员'[\s\S]*permissions:\s*\[\.\.\.SYSTEM_PERMISSIONS\]/, 'production seed should include admin role with full permissions');
assert.match(seedService, /where:\s*\{\s*code:\s*'super_admin'\s*\}/, 'first admin user should use super admin role');
assert.match(seedService, /memberLevel:\s*'professional'/, 'first admin should receive professional member level');

for (const permission of [
  'dashboard',
  'product-analysis',
  'price-management',
  'source-collection/product-collection',
  'source-collection/supply-management',
  'ozon/store-management',
  'ozon/product-management',
  'ozon/order-management',
  'ozon/promotions',
  'ozon/finance-report',
  'settings/api-config',
]) {
  assert.match(installTypes, new RegExp(`'${permission.replace(/[/-]/g, match => `\\${match}`)}'`), `permission ${permission} should be part of production install permissions`);
}

for (const forbidden of [
  'test_seller',
  'seller123',
  '智能手表',
  '无线耳机',
  'exampleProducts',
  'ozon_cookies',
]) {
  assert.doesNotMatch(seedService, new RegExp(forbidden), `production seed must not include ${forbidden}`);
}

console.log('installSeedService.test passed');
