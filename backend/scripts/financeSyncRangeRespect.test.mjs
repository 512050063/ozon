import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/services/ozonFinanceService.ts', 'utf8');

assert.match(
  source,
  /const\s+requestedStart\s*=\s*dateFrom\.slice\(0,\s*10\)/,
  'finance sync should calculate the user requested start date',
);
assert.match(
  source,
  /if\s*\(\s*requestedStart\s*<\s*lastMonthStart\s*\)\s*\{[\s\S]*syncFrom\s*=\s*requestedStart[\s\S]*mode\s*=\s*'range_refresh'/,
  'finance sync should refresh historical ranges when requested start is before the latest local month',
);
assert.doesNotMatch(
  source,
  /if\s*\(latest\?\.operationDate\)\s*\{[\s\S]{0,300}syncFrom\s*=\s*lastMonthStart;\s*mode\s*=\s*'incremental';\s*logger\.info\(`/,
  'finance sync must not always force incremental mode when local rows already exist',
);

console.log('financeSyncRangeRespect.test passed');
