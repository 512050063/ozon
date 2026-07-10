import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serviceSource = readFileSync('src/services/ozonFinanceService.ts', 'utf8');

assert.match(
  serviceSource,
  /async function applyOrderFinancialDataToTotals/,
  'finance totals should use Ozon order financial_data for sales income breakdown'
);

assert.match(
  serviceSource,
  /financial_data\?\.products/,
  'sales income should read raw.financial_data.products from Ozon orders'
);

assert.match(
  serviceSource,
  /customer_price/,
  'sales income should use customer_price, matching Ozon finance UI income'
);

assert.match(
  serviceSource,
  /summary\.discount_points = roundMoney\(Math\.max\(0, summary\.accruals_for_sale - orderSalesIncome\)\)/,
  'discount points should be derived as accruals_for_sale minus order customer_price income'
);

console.log('financeSalesBreakdown.test passed');
