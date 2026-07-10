require('ts-node/register/transpile-only');

const assert = require('assert');
const { normalizeTypeExtractionResult } = require('../src/services/ozonTypeService');

const emptySuccess = normalizeTypeExtractionResult({
  url: 'https://www.ozon.ru/product/example',
  success: true,
  type: '',
  source: 'title',
  title: '',
});

assert.strictEqual(emptySuccess.status, 'error');
assert.strictEqual(emptySuccess.type, '');
assert.match(emptySuccess.message || '', /未获取到商品类型|类型为空/);

const typedSuccess = normalizeTypeExtractionResult({
  url: 'https://www.ozon.ru/product/example',
  success: true,
  type: '无线耳机',
  source: 'type_field',
  title: '商品标题',
});

assert.deepStrictEqual(typedSuccess, {
  type: '无线耳机',
  source: 'type_field',
  title: '商品标题',
  status: 'done',
  message: undefined,
});

console.log('ozonTypeServiceResultHandling ok');
