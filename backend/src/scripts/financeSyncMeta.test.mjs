import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serviceSource = readFileSync('src/services/ozonFinanceService.ts', 'utf8');
const apiSource = readFileSync('../frontend/src/api/ozonFinanceAPI.ts', 'utf8');

assert.match(serviceSource, /firstRecordDate/, 'finance sync meta should expose the first local finance record date');
assert.match(serviceSource, /orderBy:\s*\{\s*operationDate:\s*'asc'\s*\}/, 'finance sync meta should query the earliest finance accrual date');
assert.match(apiSource, /firstRecordDate:\s*string\s*\|\s*null/, 'frontend SyncMeta should type the first finance record date');

console.log('financeSyncMeta.test passed');
