import assert from 'assert';
import {
  assertCancelPostingAllowed,
  assertPreparePostingAllowed,
  buildPreparePostingPayload,
  normalizeCancelReasons,
} from '../src/services/ozonOrderService';

assert.deepEqual(buildPreparePostingPayload('0114645726-1000-1', [
  { product_id: 12345, quantity: 2 },
  { product_id: 67890, quantity: 1 },
]), {
  posting_number: '0114645726-1000-1',
  packages: [
    {
      products: [
        { product_id: 12345, quantity: 2 },
        { product_id: 67890, quantity: 1 },
      ],
    },
  ],
  with: {
    additional_data: true,
  },
});

assert.throws(
  () => buildPreparePostingPayload('0114645726-1000-1', []),
  /商品明细为空/,
);

assert.doesNotThrow(() => assertPreparePostingAllowed({ status: 'awaiting_packaging' }));
assert.throws(
  () => assertPreparePostingAllowed({ status: 'awaiting_deliver' }),
  /等待备货/,
);

assert.doesNotThrow(() => assertCancelPostingAllowed({ status: 'awaiting_packaging' }));
assert.doesNotThrow(() => assertCancelPostingAllowed({ status: 'awaiting_deliver' }));
assert.doesNotThrow(() => assertCancelPostingAllowed({ status: 'delivering' }));
assert.doesNotThrow(() => assertCancelPostingAllowed({ status: 'dispute' }));
assert.throws(() => assertCancelPostingAllowed({ status: 'delivered' }), /不能取消/);
assert.throws(() => assertCancelPostingAllowed({ status: 'cancelled' }), /不能取消/);

assert.deepEqual(
  normalizeCancelReasons({
    result: [
      { id: 352, name: '商品缺货' },
      { cancel_reason_id: 401, cancel_reason: '买家要求取消' },
    ],
  }),
  [
    { id: 352, name: '商品缺货' },
    { id: 401, name: '买家要求取消' },
  ],
);

console.log('ozonOrderOperationService.test passed');
