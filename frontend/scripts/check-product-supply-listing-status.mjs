import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const backendSource = fs.readFileSync(
  path.resolve('../backend/src/controllers/productSupplyController.ts'),
  'utf8',
);

const listSource = fs.readFileSync(
  path.resolve('src/views/warehouse/product-library/components/ProductLibraryList.vue'),
  'utf8',
);

assert.match(backendSource, /const failedImportStatuses = new Set\(\['failed', 'not_imported', 'skipped'\]\);/, 'Ozon skipped 导入任务应归为错误，不能长期停留在上架中');
assert.match(backendSource, /statusText === 'skipped' \? 'Ozon 跳过了该商品导入任务，商品未创建'/, 'skipped 任务应给出明确中文错误信息');
assert.doesNotMatch(backendSource, /已成功上架商品禁止编辑货源绑定/, '货源绑定接口不应限制已上架商品');

const sourceCellSource = listSource.match(/<template #cell-source="\{ row \}">[\s\S]*?<\/template>/)?.[0] || '';
assert.doesNotMatch(sourceCellSource, /:disabled="isActionLocked\(row\)"/, '货源按钮不应被状态锁定');
assert.doesNotMatch(sourceCellSource, /getActionLockedTitle/, '货源按钮不应显示状态锁定文案');

console.log('check-product-supply-listing-status passed');
