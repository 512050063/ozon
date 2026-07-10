import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const requestSource = fs.readFileSync(path.join(root, 'frontend/src/api/request.ts'), 'utf8');
const commonSource = fs.readFileSync(path.join(root, 'frontend/src/utils/common.ts'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'backend/src/app.ts'), 'utf8');

assert.match(requestSource, /DEV\s*\?\s*'http:\/\/localhost:3000\/api'\s*:\s*'\/api'/, 'request API default should be same-origin in production');
assert.match(commonSource, /DEV\s*\?\s*'http:\/\/localhost:3000\/api'\s*:\s*'\/api'/, 'asset helper API default should be same-origin in production');
assert.match(appSource, /process\.env\.CORS_ORIGIN/, 'backend CORS should read CORS_ORIGIN');
assert.doesNotMatch(appSource, /origin:\s*process\.env\.NODE_ENV[\s\S]*\['https:\/\/58\.87\.104\.60'\]/, 'backend CORS should not use a hard-coded production origin');

console.log('apiBaseUrl.test passed');
