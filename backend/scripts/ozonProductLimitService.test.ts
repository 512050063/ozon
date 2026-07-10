import assert from 'assert';
import {
  assertOzonProductOperationLimit,
  normalizeOzonProductLimits,
} from '../src/services/ozonProductService';

const normalized = normalizeOzonProductLimits({
  result: {
    total: { limit: 1000, usage: 201 },
    daily_create: { limit: 100, usage: 3 },
    daily_update: { limit: 2000, usage: 2 },
    operation_limits: [
      { operation_type: 'import', limit: 100, usage: 3, left: 97 },
      { operation_type: 'update', limit: 2000, usage: 2, left: 1998, reset_at: '2026-07-03T00:00:00Z' },
    ],
  },
});

assert.deepEqual(normalized.total, {
  limit: 1000,
  used: 201,
  remaining: 799,
  resetAt: null,
});
assert.deepEqual(normalized.dailyCreate, {
  limit: 100,
  used: 3,
  remaining: 97,
  resetAt: null,
});
assert.deepEqual(normalized.dailyUpdate, {
  limit: 2000,
  used: 2,
  remaining: 1998,
  resetAt: null,
});
assert.equal(normalized.operationLimits.length, 2);

const camelCaseNormalized = normalizeOzonProductLimits({
  totalLimit: { max: 50, current: 5, available: 45 },
  dailyCreateLimit: { max: 10, current: 10 },
  dailyUpdateLimit: { max: 20, current: 0 },
});
assert.equal(camelCaseNormalized.dailyCreate.remaining, 0);
assert.equal(camelCaseNormalized.dailyUpdate.remaining, 20);

assert.doesNotThrow(() => assertOzonProductOperationLimit(normalized, 'create'));
assert.throws(
  () => assertOzonProductOperationLimit(camelCaseNormalized, 'create'),
  /今日 Ozon 商品创建额度已用完/,
);

console.log('ozonProductLimitService.test passed');
