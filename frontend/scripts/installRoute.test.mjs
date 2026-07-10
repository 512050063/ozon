import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const routerSource = fs.readFileSync(path.join(root, 'frontend/src/router/index.ts'), 'utf8');
const installPage = fs.readFileSync(path.join(root, 'frontend/src/views/install/Index.vue'), 'utf8');
const installApi = fs.readFileSync(path.join(root, 'frontend/src/api/installAPI.ts'), 'utf8');

assert.match(routerSource, /path:\s*'\/install'/, 'router should expose /install');
assert.match(routerSource, /component:\s*\(\)\s*=>\s*import\('@\/views\/install\/Index\.vue'\)/, '/install should load install page');
assert.match(routerSource, /path:\s*'\/install'[\s\S]*?meta:\s*\{\s*requiresAuth:\s*false\s*\}/, '/install should not require auth');

for (const text of ['环境检测', '数据库配置', '基础数据导入', '管理员账号', '锁定安装']) {
  assert.match(installPage, new RegExp(text), `install page should include ${text}`);
}

for (const endpoint of ['/install/status', '/install/check', '/install/database', '/install/baseline-data', '/install/admin', '/install/finalize']) {
  assert.match(installApi, new RegExp(endpoint.replace(/[/-]/g, match => `\\${match}`)), `install API should call ${endpoint}`);
}

console.log('installRoute.test passed');
