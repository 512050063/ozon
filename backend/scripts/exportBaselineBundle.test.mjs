import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'backend/scripts/exportBaselineBundle.mjs'), 'utf8');

for (const table of [
  'ozon_error_codes',
  'ozon_categories',
  'ozon_product_templates',
  'ozon_category_attributes',
  'ozon_attribute_values',
  'translation_cache',
]) {
  assert.match(source, new RegExp(`'${table}'`), `export should include ${table}`);
}

for (const table of [
  'users',
  'ozon_stores',
  'products_selection',
  'ozon_orders',
  'finance_accruals',
  'api_configs',
]) {
  assert.doesNotMatch(source, new RegExp(`'${table}'`), `export should not include private table ${table}`);
}

console.log('exportBaselineBundle.test passed');
