import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const workerPath = path.join(root, 'worker/ozon-worker.py');

assert.ok(fs.existsSync(workerPath), 'local Ozon worker CLI should exist');
const worker = fs.readFileSync(workerPath, 'utf8');

assert.match(worker, /def load_config/);
assert.match(worker, /def claim_task/);
assert.match(worker, /def complete_task/);
assert.match(worker, /def fail_task/);
assert.match(worker, /preference_search/);
assert.match(worker, /product_by_url/);
assert.match(worker, /type_extract_batch/);
assert.match(worker, /Authorization/);
