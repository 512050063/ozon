# Global Project Test Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一套可重复运行的全局测试、代码规范和问题修复流程，覆盖黑盒、白盒、构建、日志清理和回归验证。

**Architecture:** 先做测试入口和基线报告，不急着大面积改业务代码；所有修复都先有失败证据，再做最小改动。黑盒用浏览器真实路由验证核心流程，白盒用现有脚本测试和新增单元测试覆盖服务、缓存、状态机、数据映射。

**Tech Stack:** Vue 3 + Vite + Element Plus 前端；Express + TypeScript + Prisma 后端；现有测试以 `node`、`ts-node`、`.mjs/.ts` 脚本为主；浏览器验证使用 in-app Browser / Playwright。

---

## Scope

本计划覆盖整个项目，但按风险分阶段执行：

1. 测试基线：统一现有测试入口，建立可重复命令。
2. 白盒测试：服务层、API 合约、缓存、状态机、数据转换、保存入库。
3. 黑盒测试：登录、店铺上下文、Ozon 优选、货源采集、商品库、订单、财务、消息中心、系统设置。
4. 代码规范：构建、lint、类型、死代码、控制台输出。
5. 日志治理：前端删除无用 `console.*`，后端保留结构化 `logger`，脚本输出分类为 stdout JSON / stderr 诊断。
6. 修复闭环：每个 bug 必须有复现、测试、修复、复测记录。

不在本轮深挖：短信验证码、微信扫码登录、会员支付模拟逻辑，按用户之前要求暂不处理。

---

## Files And Ownership

- Modify: `backend/package.json`
  - 增加 `test`、`test:unit`、`test:scripts`、`check` 脚本。
- Modify: `frontend/package.json`
  - 增加 `test`、`test:scripts`、`check`、`lint:check` 脚本；避免默认 `lint` 自动 `--fix` 掩盖问题。
- Create: `scripts/run-script-tests.mjs`
  - 统一发现并运行 `backend/scripts/**/*.test.*`、`backend/src/scripts/**/*.test.*`、`frontend/scripts/**/*.test.*`、`frontend/src/**/*.test.*`。
- Create: `scripts/audit-console-output.mjs`
  - 扫描前端 `console.*`、`debugger`、后端裸 `console.log`，输出文件、行号、建议处理方式。
- Create: `scripts/audit-project-health.mjs`
  - 汇总构建、测试、lint、console 扫描结果，生成本地报告。
- Create: `docs/test-reports/`
  - 存放每次全局测试报告，文件名格式 `YYYY-MM-DD-HHmm-global-test.md`。
- Create: `frontend/scripts/blackbox-smoke.test.mjs`
  - 浏览器黑盒核心流程测试，优先覆盖不会写库或只读页面。
- Modify: `frontend/src/**`
  - 删除无用 `console.log/debug`；保留必要错误通过统一工具。
- Modify: `backend/src/**`
  - 删除裸 `console.log`，改用 `logger`；服务层补白盒测试。
- Modify: `backend/scripts/ozon/**`
  - 保持脚本 stdout 输出机器可读 JSON，stderr 输出诊断；避免前端显示底层命令输出。

---

## Task 1: Establish Baseline Without Changing Behavior

**Files:**
- Create: `docs/test-reports/2026-07-03-baseline.md`

- [ ] **Step 1: Run current backend build**

Run:

```bash
cd D:\project\ozon\backend
npm run build
```

Expected:

```text
> ozon-crawler-backend@1.0.0 build
> tsc
```

If it fails, copy the exact TypeScript error into `docs/test-reports/2026-07-03-baseline.md`.

- [ ] **Step 2: Run current frontend build**

Run:

```bash
cd D:\project\ozon\frontend
npm run build
```

Expected:

```text
✓ built
```

Known acceptable warnings:

```text
VIP.vue is dynamically imported ... but also statically imported
Some chunks are larger than 500 kB after minification
```

- [ ] **Step 3: Record current test inventory**

Run:

```bash
cd D:\project\ozon
rg --files -g "*.test.*" -g "*.spec.*" > docs/test-reports/2026-07-03-test-inventory.txt
```

Expected: file contains backend and frontend script tests, including:

```text
backend/scripts/ozonSearchParsing.test.mjs
backend/scripts/ozonScriptErrorHandling.test.mjs
frontend/scripts/apiConfigFormStyle.test.mjs
frontend/src/views/product-analysis/ozon-preference/searchProgressState.test.ts
```

- [ ] **Step 4: Capture current console/log audit**

Run:

```bash
cd D:\project\ozon
rg -n "console\.(log|debug|warn|error)|debugger|print\(" frontend/src backend/src backend/scripts -S --glob "!**/node_modules/**" > docs/test-reports/2026-07-03-console-inventory.txt
```

Expected: report exists. Do not delete anything yet.

---

## Task 2: Add Unified Script Test Runner

**Files:**
- Create: `scripts/run-script-tests.mjs`
- Modify: `backend/package.json`
- Modify: `frontend/package.json`

- [ ] **Step 1: Create runner skeleton**

Create `scripts/run-script-tests.mjs` with this behavior:

```js
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const targets = [
  'backend/scripts',
  'backend/src/scripts',
  'frontend/scripts',
  'frontend/src',
];

const files = [];
for (const target of targets) {
  const dir = path.join(root, target);
  if (!fs.existsSync(dir)) continue;
  walk(dir, files);
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    if (entry.isFile() && /\.(test|spec)\.(mjs|cjs|js|ts)$/.test(entry.name)) out.push(full);
  }
}

function commandFor(file) {
  if (file.endsWith('.ts')) {
    return {
      cmd: process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args: ['ts-node', '--transpile-only', file],
    };
  }
  return { cmd: process.execPath, args: [file] };
}

let failed = 0;
for (const file of files.sort()) {
  const relative = path.relative(root, file);
  const { cmd, args } = commandFor(file);
  process.stdout.write(`\n[TEST] ${relative}\n`);
  const code = await run(cmd, args, root);
  if (code !== 0) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} script test(s) failed`);
  process.exit(1);
}
console.log(`\n${files.length} script test(s) passed`);

function run(cmd, args, cwd) {
  return new Promise(resolve => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: false });
    child.on('close', resolve);
  });
}
```

- [ ] **Step 2: Add root-independent scripts**

Modify `backend/package.json`:

```json
{
  "scripts": {
    "test": "node ../scripts/run-script-tests.mjs",
    "check": "npm run build && npm run test"
  }
}
```

Keep existing scripts; only add keys.

Modify `frontend/package.json`:

```json
{
  "scripts": {
    "lint:check": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs --ignore-path .gitignore",
    "test": "node ../scripts/run-script-tests.mjs",
    "check": "npm run lint:check && npm run build && npm run test"
  }
}
```

Keep existing `lint` with `--fix` for manual cleanup, but use `lint:check` in CI-style verification.

- [ ] **Step 3: Run unified tests**

Run:

```bash
cd D:\project\ozon
node scripts/run-script-tests.mjs
```

Expected: either all pass or a concrete list of failing files. Each failure becomes a Task 5 bug ticket.

---

## Task 3: Add Console Output Audit

**Files:**
- Create: `scripts/audit-console-output.mjs`
- Modify: `frontend/package.json`
- Modify: `backend/package.json`

- [ ] **Step 1: Create scanner**

Create `scripts/audit-console-output.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const includeDirs = ['frontend/src', 'backend/src', 'backend/scripts'];
const allowPatterns = [
  /backend[\\/](src[\\/]config[\\/]logger|scripts[\\/].*\.test\.)/,
  /frontend[\\/]scripts[\\/].*\.test\./,
];
const deny = /\b(console\.(log|debug|warn|error)|debugger)\b/g;

const findings = [];
for (const dir of includeDirs) walk(path.join(root, dir));

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && /\.(vue|ts|js|mjs|cjs|py)$/.test(entry.name)) scan(full);
  }
}

function scan(file) {
  const rel = path.relative(root, file);
  if (allowPatterns.some(pattern => pattern.test(rel))) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (deny.test(line)) findings.push(`${rel}:${index + 1}: ${line.trim()}`);
    deny.lastIndex = 0;
  });
}

if (findings.length) {
  console.error(findings.join('\n'));
  console.error(`\n${findings.length} console/debug finding(s)`);
  process.exit(1);
}
console.log('console output audit passed');
```

- [ ] **Step 2: Add audit scripts**

Modify `backend/package.json`:

```json
{
  "scripts": {
    "audit:console": "node ../scripts/audit-console-output.mjs"
  }
}
```

Modify `frontend/package.json`:

```json
{
  "scripts": {
    "audit:console": "node ../scripts/audit-console-output.mjs"
  }
}
```

- [ ] **Step 3: Run audit**

Run:

```bash
cd D:\project\ozon
node scripts/audit-console-output.mjs
```

Expected initially: FAIL with a concrete list. Do not mass-delete yet; classify each finding:

- Frontend debug output: remove.
- Frontend user-visible error path: replace with `ElMessage` or existing UI state.
- Backend operational logs: replace bare `console.*` with `logger`.
- Python crawler diagnostics: keep diagnostics on `stderr`; keep result JSON on `stdout`.

---

## Task 4: Black-Box Smoke Test Matrix

**Files:**
- Create: `docs/test-reports/blackbox-matrix.md`
- Create: `frontend/scripts/blackbox-smoke.test.mjs`

- [ ] **Step 1: Define route matrix**

Create `docs/test-reports/blackbox-matrix.md`:

```markdown
# Black-Box Smoke Matrix

## Auth
- `/auth`: login form renders; `admin/admin123` logs in; redirects away from `/auth`.

## Dashboard
- `/dashboard`: summary cards render; no blocking console errors.

## Ozon 优选
- `/product-analysis/ozon-preference`: empty state fills results area; search disabled when keyword/category empty; manual add opens only when Cookie state passes.

## 竞价监控
- `/product-analysis/bidding-monitor`: strategy tabs render; empty states do not overlap.

## 货源采集
- `/source-collection/product-collection`: product supply list renders real DB data.
- `/source-collection/supply-management`: source split/list actions render.

## 本地仓库
- `/warehouse/product-library`: table renders; listing actions visible.
- `/warehouse/material-library`: images render or fallback state renders.

## Ozon 店铺
- `/ozon/store-management`: global current-store selector is available in header; no page-level store dropdown.
- `/ozon/product-management`: uses current operation store; no page-level store dropdown.
- `/ozon/order-management`: uses current operation store; no page-level store dropdown.
- `/ozon/finance-report`: uses current operation store; empty rows do not collapse.

## 智能客服
- `/customer-service/messages`: buyer/service tabs distinguish data; notification mock data is clearly mock.
- `/customer-service`: auto reply page renders.

## 系统设置
- `/settings/account-info`: profile form renders.
- `/settings/api-config`: cookie/API config panels render.
- `/settings/user-management`: user table renders.
- `/settings/role-management`: role table renders.
- `/settings/payment-records`: payment table renders.
```

- [ ] **Step 2: Implement first smoke test**

Create `frontend/scripts/blackbox-smoke.test.mjs`:

```js
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
const consoleErrors = [];

page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

await page.goto(`${baseURL}/auth`, { waitUntil: 'networkidle' });
await page.getByPlaceholder('请输入用户名').fill('admin');
await page.getByPlaceholder('请输入密码').fill('admin123');
await page.getByRole('button', { name: '登录', exact: true }).click();
await page.waitForURL(url => !String(url).includes('/auth'), { timeout: 20000 });

await page.goto(`${baseURL}/product-analysis/ozon-preference`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
const ozonPreferenceState = await page.evaluate(() => {
  const wrapper = document.querySelector('.preference-product-table');
  const resultArea = document.querySelector('.preference-results-area');
  const searchButton = [...document.querySelectorAll('button')].find(button => button.innerText.trim() === '搜索');
  const rect = el => {
    const box = el.getBoundingClientRect();
    return { height: Math.round(box.height), width: Math.round(box.width) };
  };
  return {
    searchDisabled: searchButton?.disabled,
    hasFillEmptyClass: wrapper?.classList.contains('app-table-wrapper--fill-empty'),
    wrapper: wrapper ? rect(wrapper) : null,
    resultArea: resultArea ? rect(resultArea) : null,
  };
});

assert.equal(ozonPreferenceState.searchDisabled, true, 'Ozon preference search should be disabled when keyword/category are empty');
assert.equal(ozonPreferenceState.hasFillEmptyClass, true, 'Ozon preference empty table should call global fill-empty style');
assert.ok(ozonPreferenceState.wrapper.height >= ozonPreferenceState.resultArea.height - 2, 'empty table should fill result area');
assert.deepEqual(consoleErrors, [], 'black-box smoke should not produce blocking console errors');

await browser.close();
console.log('blackbox smoke tests passed');
```

- [ ] **Step 3: Run smoke test**

Prerequisite: frontend and backend dev servers are running.

Run:

```bash
cd D:\project\ozon\frontend
node scripts/blackbox-smoke.test.mjs
```

Expected:

```text
blackbox smoke tests passed
```

If Playwright browser is missing, use the installed system Chrome channel as shown above; do not install new browsers unless explicitly approved.

---

## Task 5: White-Box Test And Fix Loop

**Files:**
- Modify or create focused tests under `backend/scripts/*.test.ts`, `backend/scripts/*.test.mjs`, `frontend/scripts/*.test.mjs`, or colocated `*.test.ts`.

- [ ] **Step 1: For each failing behavior, write one failing test**

Pattern for backend service test:

```ts
import assert from 'assert';
import { targetFunction } from '../src/services/targetService';

const result = targetFunction({
  input: 'known input',
});

assert.deepStrictEqual(result, {
  expected: 'known output',
});

console.log('targetService regression test passed');
```

Run:

```bash
cd D:\project\ozon\backend
npx ts-node --transpile-only scripts/<new-test>.test.ts
```

Expected before fix: FAIL with the actual incorrect value.

- [ ] **Step 2: Implement minimal fix**

Rules:

- Fix source of bad data, not only display symptom.
- Do not refactor unrelated files.
- Do not touch mock-only modules unless they block real flows.
- Preserve existing database data and user changes.

- [ ] **Step 3: Run focused test**

Run:

```bash
cd D:\project\ozon\backend
npx ts-node --transpile-only scripts/<new-test>.test.ts
```

Expected after fix:

```text
<test name> passed
```

- [ ] **Step 4: Run module-adjacent tests**

Examples:

```bash
cd D:\project\ozon
node backend/scripts/ozonPreferenceSearchFlow.test.mjs
node backend/scripts/ozonSearchParsing.test.mjs
node backend/scripts/ozonScriptErrorHandling.test.mjs
node frontend/scripts/messageCenterDataSource.test.mjs
node frontend/scripts/apiConfigFormStyle.test.mjs
```

Expected: all selected adjacent tests pass.

---

## Task 6: Console And Logging Cleanup

**Files:**
- Modify: `frontend/src/**/*.vue`
- Modify: `frontend/src/**/*.ts`
- Modify: `backend/src/**/*.ts`
- Modify: `backend/scripts/ozon/*.py`

- [ ] **Step 1: Run console audit**

Run:

```bash
cd D:\project\ozon
node scripts/audit-console-output.mjs
```

Expected initially: list of findings.

- [ ] **Step 2: Remove frontend debug output**

For frontend `console.log` / `console.debug`, remove when only diagnostic.

Before:

```ts
console.log('响应数据:', response);
```

After:

```ts
// removed: debug-only output
```

- [ ] **Step 3: Preserve actionable frontend errors through UI state**

Before:

```ts
console.error('后台类型提取失败:', extractError);
ElMessage.warning(extractError.message || '类型后台提取失败，稍后可重新搜索');
```

After:

```ts
ElMessage.warning(extractError.message || '类型后台提取失败，稍后可重新搜索');
```

- [ ] **Step 4: Convert backend console to logger**

Before:

```ts
console.error('搜索商品失败:', error);
```

After:

```ts
logger.error('搜索商品失败:', error);
```

Also add import if missing:

```ts
import logger from '../config/logger';
```

- [ ] **Step 5: Keep crawler script output contract**

Python crawler scripts must follow:

```py
print(json.dumps({'success': True, 'data': data}, ensure_ascii=False))
print('[WARN] diagnostic message', file=sys.stderr)
```

Do not print diagnostics to stdout when the Node service parses stdout for JSON.

- [ ] **Step 6: Re-run audit**

Run:

```bash
cd D:\project\ozon
node scripts/audit-console-output.mjs
```

Expected:

```text
console output audit passed
```

---

## Task 7: Full Verification Gate

**Files:**
- Create: `docs/test-reports/<timestamp>-global-test.md`

- [ ] **Step 1: Run backend check**

Run:

```bash
cd D:\project\ozon\backend
npm run check
```

Expected: build and script tests pass.

- [ ] **Step 2: Run frontend check**

Run:

```bash
cd D:\project\ozon\frontend
npm run check
```

Expected: lint check, build, and script tests pass.

- [ ] **Step 3: Run black-box smoke**

Run:

```bash
cd D:\project\ozon\frontend
node scripts/blackbox-smoke.test.mjs
```

Expected:

```text
blackbox smoke tests passed
```

- [ ] **Step 4: Browser manual verification**

Use in-app Browser for:

```text
http://localhost:5173/product-analysis/ozon-preference
http://localhost:5173/source-collection/product-collection
http://localhost:5173/customer-service/messages
http://localhost:5173/settings/api-config
```

For each page record:

```markdown
## <route>
- Render: pass/fail
- Main data source: real/mock
- Console errors: none/list
- Network failures: none/list
- Visual overlap: none/list
```

- [ ] **Step 5: Produce final report**

Create `docs/test-reports/<timestamp>-global-test.md`:

```markdown
# Global Test Report

## Summary
- Backend build:
- Frontend build:
- Script tests:
- Console audit:
- Black-box smoke:

## Fixed Issues
- <file>: <issue> -> <fix>

## Remaining Risks
- <risk>

## Deferred By Request
- SMS verification mock
- WeChat scan login mock
- Membership payment mock
```

---

## Execution Rules

- Never batch unrelated fixes in one patch.
- Every bug fix starts with a failing test or a browser reproduction.
- Every UI change must be browser-retested on the affected route.
- Do not delete real data from the database during tests.
- Do not click final save buttons in destructive flows unless the test case explicitly requires it.
- Keep screenshots only when they prove a visual fix or regression.
- Any `COOKIE_EXPIRED` or Ozon anti-bot result is reported as environment/auth state, not as product parsing success.

---

## Recommended Execution Order

1. Task 1: Baseline.
2. Task 2: Unified test runner.
3. Task 3: Console audit.
4. Task 4: First black-box smoke.
5. Task 6: Logging cleanup.
6. Task 5: Fix failures found by the previous tasks.
7. Task 7: Full verification gate.

This order prevents cleanup from hiding real bugs and gives every later fix a measurable before/after result.
