import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = [
  'src/views/ozon/finance-report/Index.vue',
  'src/views/ozon/finance-report/components/FinanceSummarySection.vue',
].map(file => fs.readFileSync(file, 'utf8')).join('\n');

assert.match(
  source,
  /const\s+salesAndReturns\s*=\s*computed\(\(\)\s*=>\s*\{[\s\S]*accruals_for_sale[\s\S]*refunds_and_cancellations[\s\S]*\}\);/,
  'finance report should calculate sales and returns as one displayed net value',
);
assert.match(
  source,
  /return\s+roundSignedDisplayValue\(salesAndReturns\.value\)[\s\S]*\+\s*roundSignedDisplayValue\(totalExpense\.value\)[\s\S]*\+\s*roundSignedDisplayValue\(totals\.value\.opening_debt\)/,
  'finance report total should use signed rounded values displayed in summary cards',
);
assert.match(
  source,
  /function\s+roundSignedDisplayValue/,
  'finance report should have one helper for signed displayed integer values',
);
assert.match(
  source,
  /signedAmt\(salesAndReturns\)/,
  'sales and returns card should display the same value used in total calculation',
);
assert.doesNotMatch(
  source,
  /const\s+val\s*=\s*safeNum\(totals\.value\.accruals_for_sale\)\s*-\s*totalExpense\.value\s*\+\s*safeNum\(totals\.value\.opening_debt\)/,
  'finance report total must not ignore refunds and cancellations',
);

console.log('financeReportTotalsConsistency.test passed');
