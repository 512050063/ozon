import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const controller = fs.readFileSync(path.join(root, 'backend/src/controllers/ozonSearchController.ts'), 'utf8');

assert.match(controller, /hasActiveWorkerForUser/);
assert.match(controller, /LOCAL_WORKER_OFFLINE/);
assert.match(controller, /本机采集器未在线，请先到 API 配置中更新令牌并启动采集器/);
assert.match(controller, /res\.status\(409\)/);

