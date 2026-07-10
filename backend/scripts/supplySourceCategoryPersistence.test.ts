import assert from 'assert';
import { buildSupplySourceData } from '../src/services/supplySourceService';

const data = buildSupplySourceData(1, {
  alibabaOfferId: '123456',
  subject: '测试货源',
  category: '电子产品 > 耳机和耳麦 > 耳机',
  brand: '',
  descriptionCategoryId: 17028929,
  typeId: 504866264,
});

assert.equal(data.category, '电子产品 > 耳机和耳麦 > 耳机');
assert.equal(data.brand, '无品牌');
assert.equal(data.descriptionCategoryId, 17028929);
assert.equal(data.typeId, 504866264);

console.log('supplySourceCategoryPersistence.test passed');
