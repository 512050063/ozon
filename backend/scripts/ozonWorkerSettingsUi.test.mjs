import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const viewPath = path.join(root, 'frontend/src/views/settings/api-config/Index.vue');
const view = fs.readFileSync(viewPath, 'utf8');

assert.match(view, /\.assistant-mini-btn\s*\{[\s\S]*?height:\s*24px/);
assert.match(view, /await Promise\.allSettled\(\[\s*loadOzonWorkers\(\),\s*checkLocalAssistant\(false\),?\s*\]\)/);
assert.match(view, /采集器状态已刷新/);
assert.match(view, /令牌已更新，采集器状态已刷新/);
assert.match(view, /更新令牌会刷新当前采集器，不会重复新增记录/);
