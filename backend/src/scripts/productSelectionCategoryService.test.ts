import * as assert from 'node:assert/strict';
import { normalizeProductSelectionCategoryFields } from '../services/productSelectionCategoryService';

function run() {
  const headphone = normalizeProductSelectionCategoryFields({
    category: '耳机',
  });

  assert.equal(headphone.category, '电子产品 > 耳机和耳麦 > 耳机');
  assert.equal(headphone.categoryLeaf, '耳机');
  assert.equal(headphone.descriptionCategoryId, 17028929);
  assert.equal(headphone.typeId, 504866264);
  assert.equal(headphone.categoryVerified, true);

  const unknown = normalizeProductSelectionCategoryFields({
    category: '未知类型',
  });
  assert.equal(unknown.category, '未知类型');
  assert.equal(unknown.descriptionCategoryId, null);
  assert.equal(unknown.typeId, null);
  assert.equal(unknown.categoryVerified, false);
}

run();
console.log('productSelectionCategoryService tests passed');
