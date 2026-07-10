import assert from 'assert';
import { buildFbsStocksByWarehouseRequest } from '../src/services/ozonProductService';

const invalidSkuRequest = buildFbsStocksByWarehouseRequest([
  { productId: 'p1', sku: '0', offerId: '' },
  { productId: 'p2', sku: '', offerId: '  ' },
  { productId: 'p3', sku: 'abc', offerId: undefined },
  { productId: 'p4', sku: '12.5', offerId: undefined },
]);

assert.strictEqual(invalidSkuRequest.payload, null);

const offerIdFallbackRequest = buildFbsStocksByWarehouseRequest([
  { productId: 'p1', sku: '0', offerId: 'SKU-A' },
  { productId: 'p2', sku: undefined, offerId: 'SKU-A' },
  { productId: 'p3', sku: undefined, offerId: 'SKU-B' },
]);

assert.deepStrictEqual(offerIdFallbackRequest.payload, {
  limit: 2,
  offer_id: ['SKU-A', 'SKU-B'],
});
assert.strictEqual(offerIdFallbackRequest.productIdByOfferId.get('SKU-B'), 'p3');

const skuRequest = buildFbsStocksByWarehouseRequest([
  { productId: 'p1', sku: '4675655502', offerId: 'ignored-when-sku-valid' },
  { productId: 'p2', sku: '4675655502', offerId: 'duplicate' },
  { productId: 'p3', sku: ' 4675655503 ', offerId: undefined },
]);

assert.deepStrictEqual(skuRequest.payload, {
  limit: 2,
  sku: [4675655502, 4675655503],
});
assert.strictEqual(skuRequest.productIdBySku.get('4675655503'), 'p3');

console.log('ozonProductService.fbsPayload.test passed');
