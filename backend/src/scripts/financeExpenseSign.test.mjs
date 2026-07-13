import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serviceSource = readFileSync('src/services/ozonFinanceService.ts', 'utf8');
const frontendSource = [
  '../frontend/src/views/ozon/finance-report/Index.vue',
  '../frontend/src/views/ozon/finance-report/components/FinanceSummarySection.vue',
].map(file => readFileSync(file, 'utf8')).join('\n');

assert.match(
  serviceSource,
  /value: signedExpenseValue\(totals\.partner_services \|\| 0\)/,
  'partner services expense row should preserve signed value'
);

assert.doesNotMatch(
  serviceSource,
  /key: 'partner_services'[\s\S]*?value: Math\.abs\(totals\.partner_services \|\| 0\)/,
  'partner services must not be converted to an absolute negative expense'
);

assert.match(
  serviceSource,
  /return roundSignedDisplayValue\(salesAndReturns \+ expense \+ safeAmount\(totals\.opening_debt\)\)/,
  'displayed finance total should round the exact signed total once'
);

assert.match(
  frontendSource,
  /roundSignedDisplayValue\(\s*salesAndReturns\.value \+ totalExpense\.value \+ safeNum\(totals\.value\.opening_debt\)\s*\)/,
  'frontend finance total should round the exact signed total once'
);

assert.ok(
  frontendSource.includes('formatExpenseAmount(row.value)'),
  'frontend should format signed expense rows without forcing a negative sign'
);

console.log('financeExpenseSign.test passed');
