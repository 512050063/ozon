import * as assert from 'node:assert/strict';
import {
  extractCategoryLeaf,
  normalizePersistedCategory,
} from '../utils/productCategory';

function run() {
  assert.equal(extractCategoryLeaf('电子产品 > 耳机和耳麦 > 耳机'), '耳机');
  assert.equal(extractCategoryLeaf('电子产品/电脑配件/鼠标'), '鼠标');
  assert.equal(extractCategoryLeaf('耳机'), '耳机');
  assert.equal(extractCategoryLeaf(''), '');

  assert.deepEqual(
    normalizePersistedCategory({
      category: '电子产品 > 耳机和耳麦 > 耳机',
    }),
    {
      category: '电子产品 > 耳机和耳麦 > 耳机',
      categoryLeaf: '耳机',
    },
  );

  assert.deepEqual(
    normalizePersistedCategory({
      category: '电子产品 > 耳机和耳麦 > 耳机',
      categoryLeaf: '入耳式耳机',
    }),
    {
      category: '电子产品 > 耳机和耳麦 > 耳机',
      categoryLeaf: '入耳式耳机',
    },
  );
}

run();
console.log('productCategory tests passed');
