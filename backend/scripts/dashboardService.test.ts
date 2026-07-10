import assert from 'assert';
import {
  buildLastSevenDaysOrderTrend,
  classifyDashboardProductStatus,
  summarizeProductStatuses,
} from '../src/services/dashboardService';

const trend = buildLastSevenDaysOrderTrend(new Date('2026-06-23T10:00:00Z'), [
  { orderCreatedAt: new Date('2026-06-17T08:00:00Z'), inProcessAt: null, totalPrice: 10 },
  { orderCreatedAt: null, inProcessAt: new Date('2026-06-17T12:00:00Z'), totalPrice: 20 },
  { orderCreatedAt: new Date('2026-06-22T18:00:00Z'), inProcessAt: null, totalPrice: 30 },
]);

assert.deepStrictEqual(
  trend.map(item => item.date),
  ['2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23']
);
assert.deepStrictEqual(
  trend.map(item => item.orderCount),
  [2, 0, 0, 0, 0, 0, 1]
);
assert.deepStrictEqual(
  trend.map(item => item.salesAmount),
  [30, 0, 0, 0, 0, 0, 30]
);

assert.strictEqual(classifyDashboardProductStatus({ isAutoArchived: true }), 'autoArchived');
assert.strictEqual(classifyDashboardProductStatus({ isArchived: true }), 'archived');
assert.strictEqual(classifyDashboardProductStatus({ ozonSku: null }), 'error');
assert.strictEqual(classifyDashboardProductStatus({ ozonSku: '0' }), 'error');
assert.strictEqual(classifyDashboardProductStatus({ ozonSku: '123', hasErrors: true }), 'error');
assert.strictEqual(classifyDashboardProductStatus({ ozonSku: '123', statusName: 'Не продается' }), 'error');
assert.strictEqual(classifyDashboardProductStatus({ ozonSku: '123', statusName: 'Продается' }), 'selling');
assert.strictEqual(classifyDashboardProductStatus({ ozonSku: '123', statusName: 'Готов к продаже' }), 'pending');
assert.strictEqual(classifyDashboardProductStatus({ ozonSku: '123', totalStock: 0 }), 'pending');
assert.strictEqual(classifyDashboardProductStatus({ ozonSku: '123', totalStock: 5 }), 'selling');

assert.deepStrictEqual(summarizeProductStatuses([
  { ozonSku: '1', statusName: 'Продается' },
  { ozonSku: '2', totalStock: 0 },
  { ozonSku: null },
  { isArchived: true },
  { isAutoArchived: true },
]), {
  selling: 1,
  pending: 1,
  error: 1,
  archived: 1,
  autoArchived: 1,
});

console.log('dashboardService tests passed');
