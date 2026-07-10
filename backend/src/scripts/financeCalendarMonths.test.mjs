import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serviceSource = readFileSync('src/services/ozonFinanceService.ts', 'utf8');

assert.match(
  serviceSource,
  /const start = parseLocalDateBoundary\(from\.slice\(0,\s*7\) \+ '-01', 'start'\)/,
  'finance month slicing should start from a local date boundary'
);

assert.match(
  serviceSource,
  /const mTo = formatDateOnly\(lastDay > end \? end : lastDay\)/,
  'finance month slicing should format month end as local date, not UTC ISO date'
);

assert.doesNotMatch(
  serviceSource,
  /const mTo = \(lastDay > end \? end : lastDay\)\.toISOString\(\)\.slice\(0,\s*10\)/,
  'finance month slicing must not use UTC ISO dates for month end'
);

console.log('financeCalendarMonths.test passed');
