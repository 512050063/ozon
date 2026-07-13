import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const searchScript = fs.readFileSync(path.join(root, 'backend/scripts/ozon/ozon_search.py'), 'utf8');

assert.match(searchScript, /except Exception as exc:/);
assert.match(searchScript, /分页补量失败，保留已获取商品/);
assert.match(searchScript, /if products:[\s\S]*?分页补量失败，保留已获取商品[\s\S]*?break/);
