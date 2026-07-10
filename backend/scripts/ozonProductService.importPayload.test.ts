import assert from 'assert';
import {
  buildOzonProductImportItem,
  buildOzonImportUpdateItem,
  validateOzonImportUpdateItem,
} from '../src/services/ozonProductService';

const validLocalRaw = {
  description_category_id: 17027937,
  type_id: 970896147,
  name: 'Existing product',
  description: 'Existing description',
  primary_image: 'https://example.com/1.jpg',
  images: ['https://example.com/1.jpg'],
  attributes: [{ id: 85, values: [{ dictionary_value_id: 1, value: 'Brand' }] }],
  offer_id: 'HB3060',
  price: 25,
  currency_code: 'RUB',
  vat: '0',
  depth: 100,
  width: 100,
  height: 100,
  weight: 100,
};

const item = buildOzonImportUpdateItem(
  {
    productId: '5245372197',
    name: 'Updated product',
    price: 22,
    currencyCode: '',
  },
  validLocalRaw
);

assert.strictEqual(item.product_id, 5245372197);
assert.strictEqual(item.price, '22');
assert.strictEqual(item.currency_code, 'RUB');
assert.deepStrictEqual(validateOzonImportUpdateItem(item), []);

const invalidItem = buildOzonImportUpdateItem(
  {
    productId: '5245372197',
    name: 'Updated product',
    price: 22,
    images: ['https://example.com/1.jpg'],
    attributes: [{ id: 85, values: [{ value: 'Brand' }] }],
    packageLength: 100,
    packageWidth: 100,
    packageHeight: 100,
    grossWeight: 100,
  },
  {}
);

const validationErrors = validateOzonImportUpdateItem(invalidItem);
assert(validationErrors.includes('description_category_id 必须大于 0'));
assert(validationErrors.includes('type_id 必须大于 0'));
assert(validationErrors.includes('offer_id 不能为空'));

const listingItem = buildOzonProductImportItem({
  descriptionCategoryId: 17028929,
  typeId: 504866264,
  name: '中文商品名',
  description: 'Listing description',
  offerId: 'OZ-MAN-001',
  price: 88,
  packageLength: 100,
  packageWidth: 80,
  packageHeight: 40,
  grossWeight: 320,
}, ['https://example.com/main.jpg'], [], 'CNY');

assert.strictEqual(
  listingItem.name,
  '',
  '商品库上架时商品名称应空白提交，由 Ozon 根据类目、品牌、型号和特征自动生成',
);

console.log('ozonProductService.importPayload.test passed');
