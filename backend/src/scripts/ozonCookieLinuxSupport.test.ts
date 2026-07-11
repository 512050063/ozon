import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const scriptPath = path.resolve(__dirname, '../../scripts/ozon/ozon_cookie.py');
const source = fs.readFileSync(scriptPath, 'utf8');

assert.match(source, /os\.environ\.get\(['"]CHROME_PATH['"]\)/, 'Cookie script should honor CHROME_PATH');
assert.match(source, /chromium-browser/, 'Cookie script should search chromium-browser on Linux');
assert.match(source, /google-chrome/, 'Cookie script should search google-chrome on Linux');
assert.match(source, /command -v/, 'Cookie script should use POSIX command lookup on Linux');
