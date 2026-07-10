import assert from 'assert';
import {
  resolveOzonProductCategoryDisplayName,
} from '../src/services/ozonProductService';

const categories = {
  '17028929': '15621042/17028929/耳机和耳麦',
  '504866264': '17028929/504866264/耳机',
};

assert.strictEqual(
  resolveOzonProductCategoryDisplayName({
    ozonCategoryId: BigInt(17028929),
    ozonOriginalData: {
      description_category_id: 17028929,
      type_id: 504866264,
    },
  }, categories),
  '17028929/504866264/耳机',
  '商品管理列表应优先显示 Ozon type_id 对应的商品类型',
);

assert.strictEqual(
  resolveOzonProductCategoryDisplayName({
    ozonCategoryId: BigInt(17028929),
    ozonOriginalData: {
      description_category_id: 17028929,
    },
  }, categories),
  '15621042/17028929/耳机和耳麦',
  '没有 type_id 时再回退到 description category',
);

console.log('ozonProductService.categoryDisplay.test passed');
