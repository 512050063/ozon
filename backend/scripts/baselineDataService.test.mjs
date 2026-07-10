import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const installTypes = fs.readFileSync(
  path.join(root, 'backend/src/install/installTypes.ts'),
  'utf8',
);
const baselineService = fs.readFileSync(
  path.join(root, 'backend/src/install/baselineDataService.ts'),
  'utf8',
);

for (const allowed of [
  'ozon_categories',
  'ozon_product_templates',
  'ozon_category_attributes',
  'ozon_attribute_values',
  'ozon_error_codes',
  'translation_cache',
]) {
  assert.match(installTypes, new RegExp(`'${allowed}'`), `${allowed} should be in baseline allowlist`);
}

for (const forbidden of [
  'users',
  'ozon_stores',
  'user_tokens',
  'api_configs',
  'products',
  'ozon_orders',
  'finance_accruals',
  'product_selection',
]) {
  assert.match(installTypes, new RegExp(`'${forbidden}'`), `${forbidden} should be explicitly classified as private runtime data`);
}

assert.match(baselineService, /validateBaselineBundle/, 'baseline importer should validate bundles before importing');
assert.match(baselineService, /不允许导入表/, 'baseline importer should reject non-whitelisted tables');
assert.match(baselineService, /ozonErrorCode\.upsert/, 'baseline importer should upsert error translations');
assert.match(baselineService, /ozonCategory\.upsert/, 'baseline importer should upsert categories');
assert.match(baselineService, /ozonProductTemplate\.upsert/, 'baseline importer should upsert product templates');
assert.match(baselineService, /ozonCategoryAttribute\.upsert/, 'baseline importer should upsert category attributes');
assert.match(baselineService, /ozonAttributeValue\.upsert/, 'baseline importer should upsert attribute values');
assert.match(baselineService, /translationCache\.upsert/, 'baseline importer should upsert translation cache');

for (const forbiddenWrite of [
  'prismaClient.user.',
  'prismaClient.ozonStore.',
  'prismaClient.userToken.',
  'prismaClient.apiConfig.',
  'prismaClient.product.',
  'prismaClient.ozonOrder.',
  'prismaClient.financeAccrual.',
]) {
  assert.doesNotMatch(baselineService, new RegExp(forbiddenWrite.replace(/[.]/g, '\\.')), `baseline importer must not write ${forbiddenWrite}`);
}

console.log('baselineDataService.test passed');
