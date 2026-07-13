import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const productList = fs.readFileSync(
  path.join(root, 'frontend/src/views/product-analysis/ozon-preference/components/ProductList.vue'),
  'utf8',
);
const controller = fs.readFileSync(
  path.join(root, 'backend/src/controllers/productSelectionController.ts'),
  'utf8',
);

assert.match(productList, /类型获取中/, 'Ozon preference list should call detail-page extraction a type lookup');
assert.match(productList, /类型获取失败/, 'Ozon preference list should call detail-page extraction a type failure');
assert.doesNotMatch(productList, /类目获取中|类目获取失败/, 'Ozon preference list should not label product type extraction as category extraction');

assert.doesNotMatch(controller, /类目未匹配到数据库/, 'product selection save response should not warn when an Ozon type name is not an exact local category match');
assert.match(
  controller,
  /Boolean\(resolvedDescriptionCategoryId \|\| resolvedTypeId\)/,
  'product selection category verification should trust explicit category/type ids when present',
);
