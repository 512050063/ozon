import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const cookieScript = fs.readFileSync(path.join(root, 'backend/scripts/ozon/ozon_cookie.py'), 'utf8');
const cookieService = fs.readFileSync(path.join(root, 'backend/src/services/ozonCookieService.ts'), 'utf8');
const searchService = fs.readFileSync(path.join(root, 'backend/src/services/ozonSearchService.ts'), 'utf8');

assert.match(
  cookieScript,
  /def is_ozon_access_blocked\(page\):/,
  'cookie script should detect Ozon access/network block pages before opening settings',
);
assert.match(
  cookieScript,
  /ozon_access_blocked/,
  'cookie script should return a specific access-blocked reason',
);
assert.match(
  cookieScript,
  /Ozon访问异常页/,
  'cookie script should return a Chinese access-blocked message',
);
assert.doesNotMatch(
  cookieScript,
  /url\.includes\('__rr=1'\)\s*\|\|/,
  'cookie script should not treat __rr query alone as an access block because Ozon can still render product cards',
);
assert.match(
  cookieService,
  /parsed\?\.message[\s\S]*parsed\?\.reason/,
  'cookie service should prefer user-facing script message over machine reason',
);
assert.doesNotMatch(
  cookieService,
  /message:\s*result\.reason\s*\|\|/,
  'cookie fetch failure should not expose raw machine reason before message',
);
assert.doesNotMatch(
  searchService,
  /搜索失败时标记 Cookie 可能失效/,
  'search failures caused by Ozon blocking/network should not always mark Cookie as invalid',
);

console.log('ozonCookieAccessBlocked.test passed');
