# Ozon Local Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal cloud task queue and local Ozon worker so Ozon front-end scraping runs from the user's real local Chrome/network instead of the cloud host IP.

**Architecture:** The backend stores worker registrations and browser tasks in MySQL. A command-line local worker authenticates with a worker token, polls tasks, executes local Ozon browser scripts, and posts task results back to the cloud API.

**Tech Stack:** Express, TypeScript, Prisma/MySQL, Node script tests, Python Playwright worker scripts.

---

## File Structure

- Modify `backend/prisma/schema.prisma`
  - Add `OzonBrowserWorker` and `OzonBrowserTask` models.
- Create `backend/src/services/ozonBrowserTaskService.ts`
  - Own worker token generation, token hashing, task creation, worker claim/start/complete/fail logic.
- Create `backend/src/controllers/ozonBrowserTaskController.ts`
  - User-facing worker/task APIs and worker-facing polling APIs.
- Create `backend/src/routes/ozonBrowserTaskRoutes.ts`
  - Authenticated user routes.
- Create `backend/src/routes/workerRoutes.ts`
  - Worker token routes, excluded from normal JWT auth but authenticated inside the controller.
- Modify `backend/src/app.ts`
  - Mount `/api/ozon/browser` and `/api/worker`.
- Create `backend/scripts/ozonBrowserTaskService.test.mjs`
  - Static/service-behavior tests for token hashing, ownership checks, and route mounting.
- Create `worker/ozon-worker.py`
  - Minimal local worker loop.
- Create `worker/README.md`
  - Local worker setup and run instructions.

## Task 1: Add Prisma Models

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Test: `backend/scripts/ozonBrowserTaskService.test.mjs`

- [ ] **Step 1: Write the failing schema test**

Create `backend/scripts/ozonBrowserTaskService.test.mjs` with assertions that the schema contains the two worker models and key ownership fields.

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const schema = fs.readFileSync(path.join(root, 'backend/prisma/schema.prisma'), 'utf8');

assert.match(schema, /model OzonBrowserWorker \{/);
assert.match(schema, /model OzonBrowserTask \{/);
assert.match(schema, /userId\s+Int/);
assert.match(schema, /tokenHash\s+String/);
assert.match(schema, /payload\s+Json/);
assert.match(schema, /result\s+Json\?/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm run test:scripts -- ozonBrowserTaskService.test.mjs`

Expected: FAIL because the models do not exist.

- [ ] **Step 3: Add Prisma models**

Add models near the other Ozon models:

```prisma
model OzonBrowserWorker {
  /// 本机采集器ID
  id           Int      @id @default(autoincrement())
  /// 用户ID
  userId       Int
  /// 采集器名称
  name         String
  /// 采集器令牌哈希
  tokenHash    String
  /// 状态：online/offline/disabled
  status       String   @default("offline")
  /// 能力列表
  capabilities Json?
  /// 最后心跳时间
  lastSeenAt   DateTime?
  /// 创建时间
  createdAt    DateTime @default(now())
  /// 更新时间
  updatedAt    DateTime @updatedAt

  user  User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks OzonBrowserTask[]

  @@index([userId])
  @@map("ozon_browser_workers")
}

model OzonBrowserTask {
  /// Ozon浏览器任务ID
  id           Int      @id @default(autoincrement())
  /// 用户ID
  userId       Int
  /// 店铺ID
  storeId      Int?
  /// 任务类型
  type         String
  /// 任务状态：pending/claimed/running/success/failed/cancelled/expired
  status       String   @default("pending")
  /// 优先级
  priority     Int      @default(0)
  /// 任务入参
  payload      Json
  /// 任务结果
  result       Json?
  /// 错误编码
  errorCode    String?
  /// 错误消息
  errorMessage String?
  /// 采集器ID
  workerId     Int?
  /// 领取时间
  claimedAt    DateTime?
  /// 开始时间
  startedAt    DateTime?
  /// 完成时间
  finishedAt   DateTime?
  /// 过期时间
  expiresAt    DateTime?
  /// 创建时间
  createdAt    DateTime @default(now())
  /// 更新时间
  updatedAt    DateTime @updatedAt

  user   User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  worker OzonBrowserWorker? @relation(fields: [workerId], references: [id], onDelete: SetNull)

  @@index([userId, status, priority])
  @@index([workerId])
  @@map("ozon_browser_tasks")
}
```

Also add relations to `User`:

```prisma
ozonBrowserWorkers OzonBrowserWorker[]
ozonBrowserTasks   OzonBrowserTask[]
```

- [ ] **Step 4: Verify schema test passes**

Run: `cd backend && npm run test:scripts -- ozonBrowserTaskService.test.mjs`

Expected: PASS.

## Task 2: Implement Backend Service

**Files:**
- Create: `backend/src/services/ozonBrowserTaskService.ts`
- Extend: `backend/scripts/ozonBrowserTaskService.test.mjs`

- [ ] **Step 1: Add failing service source tests**

Extend the test file with source-level checks:

```js
const service = fs.readFileSync(path.join(root, 'backend/src/services/ozonBrowserTaskService.ts'), 'utf8');
assert.match(service, /createWorkerRegistration/);
assert.match(service, /hashWorkerToken/);
assert.match(service, /authenticateWorkerToken/);
assert.match(service, /claimNextTask/);
assert.match(service, /completeTask/);
assert.match(service, /failTask/);
assert.match(service, /userId:\s*worker\.userId/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm run test:scripts -- ozonBrowserTaskService.test.mjs`

Expected: FAIL because the service file does not exist.

- [ ] **Step 3: Implement service**

Implement:

- `createWorkerRegistration(userId, name)`
  - Generate token using `crypto.randomBytes(32).toString('hex')`.
  - Store SHA-256 hash, return raw token once.
- `authenticateWorkerToken(rawToken)`
  - Hash token and find enabled worker.
- `createBrowserTask(userId, input)`
  - Store pending task with default expiry.
- `getUserWorkers(userId)`
  - Return workers without token hash.
- `getTaskForUser(userId, taskId)`
  - Ownership-safe task lookup.
- `heartbeat(worker, capabilities)`
  - Mark online and update lastSeenAt.
- `claimNextTask(worker)`
  - Claim highest priority pending/expired task for the same user.
- `startTask(worker, taskId)`
  - Only worker owning the claim can mark running.
- `completeTask(worker, taskId, result)`
  - Save result and mark success.
- `failTask(worker, taskId, errorCode, errorMessage)`
  - Save error and mark failed.

- [ ] **Step 4: Verify service source test passes**

Run: `cd backend && npm run test:scripts -- ozonBrowserTaskService.test.mjs`

Expected: PASS.

## Task 3: Add API Routes

**Files:**
- Create: `backend/src/controllers/ozonBrowserTaskController.ts`
- Create: `backend/src/routes/ozonBrowserTaskRoutes.ts`
- Create: `backend/src/routes/workerRoutes.ts`
- Modify: `backend/src/app.ts`
- Extend: `backend/scripts/ozonBrowserTaskService.test.mjs`

- [ ] **Step 1: Add failing route tests**

Extend the test:

```js
const app = fs.readFileSync(path.join(root, 'backend/src/app.ts'), 'utf8');
assert.match(app, /ozonBrowserTaskRoutes/);
assert.match(app, /workerRoutes/);
assert.match(app, /app\.use\('\/api\/ozon\/browser'/);
assert.match(app, /app\.use\('\/api\/worker'/);
assert.match(app, /req\.path\.startsWith\('\/worker'\)/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm run test:scripts -- ozonBrowserTaskService.test.mjs`

Expected: FAIL because routes are not mounted.

- [ ] **Step 3: Implement controllers/routes**

User routes:

- `POST /api/ozon/browser/workers`
- `GET /api/ozon/browser/workers`
- `POST /api/ozon/browser/tasks`
- `GET /api/ozon/browser/tasks/:id`

Worker routes:

- `POST /api/worker/heartbeat`
- `POST /api/worker/tasks/claim`
- `POST /api/worker/tasks/:id/start`
- `POST /api/worker/tasks/:id/complete`
- `POST /api/worker/tasks/:id/fail`

Worker auth reads `Authorization: Bearer <worker-token>` and calls `authenticateWorkerToken`.

- [ ] **Step 4: Mount routes and auth bypass**

In `backend/src/app.ts`:

- Import both route modules.
- Let `/api/worker` bypass normal JWT auth because it uses worker token auth.
- Mount routes.

- [ ] **Step 5: Verify route tests pass**

Run: `cd backend && npm run test:scripts -- ozonBrowserTaskService.test.mjs`

Expected: PASS.

## Task 4: Add Local Worker CLI

**Files:**
- Create: `worker/ozon-worker.py`
- Create: `worker/README.md`
- Create: `backend/scripts/ozonLocalWorkerCli.test.mjs`

- [ ] **Step 1: Write failing worker CLI tests**

Create `backend/scripts/ozonLocalWorkerCli.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const worker = fs.readFileSync(path.join(root, 'worker/ozon-worker.py'), 'utf8');

assert.match(worker, /def load_config/);
assert.match(worker, /def claim_task/);
assert.match(worker, /def complete_task/);
assert.match(worker, /def fail_task/);
assert.match(worker, /preference_search/);
assert.match(worker, /product_by_url/);
assert.match(worker, /type_extract_batch/);
assert.match(worker, /Authorization/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm run test:scripts -- ozonLocalWorkerCli.test.mjs`

Expected: FAIL because worker file does not exist.

- [ ] **Step 3: Implement `worker/ozon-worker.py`**

The first CLI supports:

- `--config worker.config.json`
- `--once` to claim and execute one task.
- `--loop` to poll continuously.

Task execution:

- `preference_search`: call `backend/scripts/ozon/ozon_search.py`.
- `product_by_url`: call `backend/scripts/ozon/ozon_product_by_url.py`.
- `type_extract_batch`: call `backend/scripts/ozon/ozon_extract_type_batch.py` through stdin.

For the first implementation, the CLI may shell out to the existing scripts using the local repository paths. It must report script stdout JSON to cloud task result, and script failures to `fail_task`.

- [ ] **Step 4: Add worker README**

Document:

```powershell
py worker/ozon-worker.py --config worker/worker.config.json --once
py worker/ozon-worker.py --config worker/worker.config.json --loop
```

- [ ] **Step 5: Verify worker CLI tests pass**

Run: `cd backend && npm run test:scripts -- ozonLocalWorkerCli.test.mjs`

Expected: PASS.

## Task 5: Build and Smoke Test

**Files:**
- Existing files only.

- [ ] **Step 1: Generate Prisma client**

Run: `cd backend && npx prisma generate`

Expected: generated Prisma client succeeds.

- [ ] **Step 2: Run focused script tests**

Run:

```powershell
cd backend
npm run test:scripts -- ozonBrowserTaskService.test.mjs
npm run test:scripts -- ozonLocalWorkerCli.test.mjs
```

Expected: both PASS.

- [ ] **Step 3: Run backend build**

Run: `cd backend && npm run build`

Expected: TypeScript build succeeds.

- [ ] **Step 4: Do local worker dry run**

Create a temporary config pointing to the local or cloud API only after a worker token exists. Run:

```powershell
py worker/ozon-worker.py --config worker/worker.config.json --once
```

Expected:

- If no task exists, worker prints "no task".
- If a task exists, worker marks it running and completes/fails it with a stable code.

## Task 6: Follow-up Integration

This task starts only after Tasks 1-5 are verified.

**Files:**
- Modify `backend/src/services/ozonSearchService.ts`
- Modify `backend/src/services/ozonProductLinkService.ts`
- Modify `backend/src/services/ozonTypeService.ts`
- Add focused tests around worker fallback.

Implementation rule:

- Keep current direct script path available for local development.
- In production/cloud mode, create worker tasks instead of running Ozon front-end scripts on the cloud host.
- Do not alter official Seller API sync modules.

