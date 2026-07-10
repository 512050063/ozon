import assert from 'node:assert/strict';
import { mergeOzonProductDetails } from '../services/ozonProductService';

const listProduct = {
  product_id: 123,
  offer_id: 'OFFER-1',
  sku: 456,
  name: 'List name',
  images: ['list-image.jpg'],
  price: '100.00',
  stocks: { stocks: [] },
};

const detailProduct = {
  name: 'Detail name',
  images: ['detail-image.jpg'],
  attributes: [{ id: 85, name: 'Brand', values: [{ value: 'Acme' }] }],
  dimensions: { length: 100, width: 80, height: 30 },
  weight: 250,
  price: '',
};

const merged = mergeOzonProductDetails(listProduct, detailProduct);

assert.equal(merged.product_id, 123);
assert.equal(merged.offer_id, 'OFFER-1');
assert.equal(merged.name, 'Detail name');
assert.deepEqual(merged.images, ['detail-image.jpg']);
assert.deepEqual(merged.attributes, detailProduct.attributes);
assert.deepEqual(merged.dimensions, detailProduct.dimensions);
assert.equal(merged.weight, 250);
assert.equal(merged.price, '100.00');

console.log('mergeOzonProductDetails ok');
