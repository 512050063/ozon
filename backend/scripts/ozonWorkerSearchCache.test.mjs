import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const taskService = fs.readFileSync(path.join(root, 'backend/src/services/ozonBrowserTaskService.ts'), 'utf8');
const searchService = fs.readFileSync(path.join(root, 'backend/src/services/ozonSearchService.ts'), 'utf8');

assert.match(
  taskService,
  /import \{ saveOzonSearchCacheFromWorkerResult \} from '\.\/ozonSearchService'/,
  'worker task service should import the search-cache writer',
);
assert.match(
  taskService,
  /task\?\.type === 'preference_search'[\s\S]*saveOzonSearchCacheFromWorkerResult\(keyword, result\)/,
  'completed preference_search worker tasks should persist keyword search cache',
);
assert.match(
  searchService,
  /export function saveOzonSearchCacheFromWorkerResult\(keyword: string, result: any\): number/,
  'search service should expose a cache writer for worker results',
);
assert.match(
  searchService,
  /const products = json\?\.products \|\| json\?\.data \|\| \[\]/,
  'worker result cache writer should accept script json.products and API-shaped json.data results',
);
assert.match(
  searchService,
  /saveCache\(keyword, normalized\)/,
  'worker result cache writer should use the same keyword cache as normal search',
);
