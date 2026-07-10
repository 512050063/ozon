import assert from 'assert';
import {
  buildProductOfferId,
  buildProductSku,
  fillProductOfferIds,
  fillProductIdentifiers,
} from '../src/utils/productIdentifier';

const fixedDate = new Date('2026-06-30T08:00:00.000Z');

assert.equal(
  buildProductOfferId({
    source: 'SRC',
    sourceOfferId: '1688123456789012',
    index: 0,
    now: fixedDate,
  }),
  'OZ-SRC-260630-56789012-01',
);

assert.match(
  buildProductOfferId({
    source: 'MAN',
    name: '蓝牙耳机',
    modelName: 'lyej_20260630',
    index: 1,
    now: fixedDate,
  }),
  /^OZ-MAN-260630-[A-Z0-9]{5,8}-02$/,
);

const filled = fillProductOfferIds([
  { offerId: '', name: '商品A' },
  { offerId: 'CUSTOM-1', name: '商品B' },
  { offerId: '', name: '商品C' },
], {
  source: 'MAN',
  name: '手动商品',
  now: fixedDate,
  existingOfferIds: ['OZ-MAN-260630-ABCDE-01'],
});

assert.equal(filled[0].offerId.startsWith('OZ-MAN-260630-'), true);
assert.equal(filled[0].offerId.endsWith('-01'), true);
assert.equal(filled[1].offerId, 'CUSTOM-1');
assert.equal(filled[2].offerId.endsWith('-03'), true);
assert.equal(new Set(filled.map(item => item.offerId)).size, 3);

const deduped = fillProductOfferIds([
  { offerId: 'DUP', name: '商品A' },
  { offerId: 'DUP', name: '商品B' },
], {
  source: 'MAN',
  name: '手动商品',
  now: fixedDate,
});

assert.equal(deduped[0].offerId, 'DUP');
assert.notEqual(deduped[1].offerId, 'DUP');
assert.equal(deduped[1].offerId.endsWith('-02'), true);

assert.equal(
  buildProductSku({
    source: 'SRC',
    sourceOfferId: '1688123456789012',
    index: 0,
    now: fixedDate,
  }),
  'SKU-SRC-260630-56789012-01',
);

const identified = fillProductIdentifiers([
  { offerId: '', sku: '', name: '商品A' },
  { offerId: 'CUSTOM-OFFER', sku: 'CUSTOM-SKU', name: '商品B' },
  { offerId: '', sku: 'CUSTOM-SKU', name: '商品C' },
], {
  source: 'MAN',
  name: '手动商品',
  now: fixedDate,
});

assert.equal(identified[0].offerId.startsWith('OZ-MAN-260630-'), true);
assert.equal(identified[0].sku.startsWith('SKU-MAN-260630-'), true);
assert.equal(identified[1].offerId, 'CUSTOM-OFFER');
assert.equal(identified[1].sku, 'CUSTOM-SKU');
assert.notEqual(identified[2].offerId, identified[2].sku);
assert.notEqual(identified[2].sku, 'CUSTOM-SKU');
assert.equal(new Set(identified.map(item => item.offerId)).size, 3);
assert.equal(new Set(identified.map(item => item.sku)).size, 3);

console.log('productIdentifier.test passed');
