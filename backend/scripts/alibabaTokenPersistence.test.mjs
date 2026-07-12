import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const servicePath = path.join(root, 'backend/src/services/alibabaService.ts');
const source = fs.readFileSync(servicePath, 'utf8');

const start = source.indexOf('export async function saveToken');
const end = source.indexOf('export async function generateAuthUrl');
assert.ok(start >= 0 && end > start, 'saveToken function should exist');

const saveTokenSource = source.slice(start, end);
assert.match(
  saveTokenSource,
  /catch\s*\([^)]*\)\s*{[\s\S]*throw\s+error\s*;/,
  'saveToken must rethrow persistence errors so 1688 authorization cannot report success when token was not saved',
);
