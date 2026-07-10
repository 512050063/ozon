# CentOS Deployment Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CentOS-ready deployment package and locked install wizard that initializes the system safely and optionally imports slow-changing Ozon baseline data.

**Architecture:** Add a backend install module with explicit unauthenticated routes, dual lock checks, environment/database checks, system seed, and baseline-data import whitelist. Add a frontend `/install` wizard that calls these APIs. Add deploy packaging checks so local cookies, browser profiles, caches, and test/demo data cannot enter the production package.

**Tech Stack:** Express + TypeScript + Prisma + MySQL backend; Vue 3 + Vite + Element Plus frontend; Node deployment scripts; Python/Playwright/Chrome checks for Ozon crawler scripts.

---

## File Structure

- Create `backend/src/install/installTypes.ts`
  - Shared install DTOs and table whitelist constants.
- Create `backend/src/install/installLock.ts`
  - File lock checks and lock creation.
- Create `backend/src/install/installEnvironmentService.ts`
  - Runtime, writable directory, Python, Playwright, and browser detection.
- Create `backend/src/install/installSeedService.ts`
  - Production system seed for roles, admin, and Ozon config.
- Create `backend/src/install/baselineDataService.ts`
  - Import/export support for slow-changing baseline tables only.
- Create `backend/src/controllers/installController.ts`
  - Install status/check/database/baseline/admin/finalize endpoints.
- Create `backend/src/routes/installRoutes.ts`
  - Public installer routes.
- Modify `backend/src/app.ts`
  - Register `/api/install` before auth middleware exclusion blocks authenticated APIs.
- Create `frontend/src/api/installAPI.ts`
  - Frontend API wrapper for installer.
- Create `frontend/src/views/install/Index.vue`
  - Step-based install page.
- Modify `frontend/src/router/index.ts`
  - Add `/install` route with `requiresAuth: false`.
- Create `scripts/audit-deploy-package.mjs`
  - Static deploy package safety audit.
- Create `backend/scripts/installSeedService.test.ts`
  - Production seed behavior tests.
- Create `backend/scripts/baselineDataService.test.ts`
  - Baseline whitelist tests.
- Create `backend/scripts/installLock.test.ts`
  - Lock status tests.
- Create `frontend/scripts/installRoute.test.mjs`
  - Install route/static UI checks.
- Create `deploy/centos/install-system-deps.sh`
  - CentOS dependency installation helper.
- Create `deploy/centos/ozon-backend.service.example`
  - systemd service template.
- Create `deploy/nginx/ozon.conf.example`
  - Nginx template.
- Create `deploy/README-centos.md`
  - Deployment instructions.

---

## Task 1: Deployment Package Audit

**Files:**
- Create: `scripts/audit-deploy-package.mjs`
- Modify: `backend/package.json`
- Modify: `frontend/package.json`

- [ ] **Step 1: Write failing audit test**

Create `scripts/audit-deploy-package.mjs` that scans the workspace and fails when deploy-forbidden files exist outside ignored development locations. The initial forbidden patterns:

```js
const forbiddenPatterns = [
  /^backend\/data\/ozon_cookies\.json$/,
  /^backend\/scripts\/data\/ozon_cookies\.json$/,
  /^backend\/scripts\/data\/ozon_type_cache\.json$/,
  /^backend\/scripts\/data\/cache\//,
  /^backend\/scripts\/data\/_chrome_profile/,
  /^backend\/scripts\/data\/_ozon_.*_result\.json$/,
  /^backend\/scripts\/ozon\/_chrome_profile/,
  /^backend\/scripts\/ozon\/__pycache__/,
  /^backend\/scripts\/data\/_debug_.*\.png$/,
  /^backend\/scripts\/data\/_diag_.*\.png$/,
  /^backend\/\.env$/,
  /^frontend\/\.env$/,
];
```

The script should print every finding and exit 1 if any are present. It should support `--package-root <dir>` later, but default to the repo root.

- [ ] **Step 2: Run and verify it fails on current local residue**

Run:

```bash
node scripts/audit-deploy-package.mjs
```

Expected: fails because local `backend/scripts/data/_chrome_profile*`, cookies, and debug artifacts exist.

- [ ] **Step 3: Add package-mode allowlist**

Update the script so normal workspace audit reports findings but does not require deleting local runtime files. Add `--strict` for CI/package mode:

```bash
node scripts/audit-deploy-package.mjs --strict
```

Default output should classify findings as `local-runtime`.

- [ ] **Step 4: Add package scripts**

Add to both package files:

```json
"audit:deploy": "node ../scripts/audit-deploy-package.mjs"
```

Use `node scripts/audit-deploy-package.mjs` from repo root in docs.

---

## Task 2: Production Seed Without Demo Data

**Files:**
- Create: `backend/src/install/installTypes.ts`
- Create: `backend/src/install/installSeedService.ts`
- Create: `backend/scripts/installSeedService.test.ts`

- [ ] **Step 1: Write failing test**

Test that production seed definitions contain roles and admin creation data but do not contain `test_seller`, `seller123`, sample products, Ozon stores, orders, or cookies.

- [ ] **Step 2: Implement seed service**

Create:

```ts
export const SYSTEM_PERMISSIONS = [...];
export const SYSTEM_ROLES = [...];

export async function ensureSystemRoles(prismaClient = prisma) {}
export async function ensureOzonConfig(prismaClient = prisma) {}
export async function ensureAdminUser(input: { username: string; password: string; nickname?: string }, prismaClient = prisma) {}
export async function runProductionSeed(input: { admin: { username: string; password: string; nickname?: string } }, prismaClient = prisma) {}
```

Use the current role permissions from `backend/prisma/seed.ts`, but remove demo seller and product creation.

- [ ] **Step 3: Verify**

Run:

```bash
node scripts/run-script-tests.mjs backend/scripts/installSeedService.test.ts
```

Expected: pass.

---

## Task 3: Baseline Data Bundle Importer

**Files:**
- Create: `backend/src/install/baselineDataService.ts`
- Create: `backend/scripts/baselineDataService.test.ts`
- Create: `deploy/seed-bundles/.gitkeep`

- [ ] **Step 1: Write failing whitelist test**

Test allowed tables:

```ts
[
  'ozon_categories',
  'ozon_product_templates',
  'ozon_category_attributes',
  'ozon_attribute_values',
  'ozon_error_codes',
]
```

Test rejected tables:

```ts
[
  'users',
  'ozon_stores',
  'user_tokens',
  'api_configs',
  'products',
  'ozon_orders',
  'finance_accruals',
  'product_selection',
]
```

- [ ] **Step 2: Implement bundle validation**

Bundle shape:

```json
{
  "version": "2026-07-04",
  "createdAt": "2026-07-04T00:00:00.000Z",
  "tables": {
    "ozon_error_codes": []
  }
}
```

Reject unknown or private tables before writing anything.

- [ ] **Step 3: Implement import**

Use Prisma upsert where unique keys exist:

- `ozon_error_codes`: `code`
- `ozon_categories`: `[ozonId, ozonParentId]`
- `ozon_product_templates`: `[descriptionCategoryId, typeId, language]`
- `ozon_category_attributes`: `[ozonAttributeId, descriptionCategoryId, typeId]`
- `ozon_attribute_values`: `[attributeId, valueId]`

Return per-table counts.

- [ ] **Step 4: Verify**

Run:

```bash
node scripts/run-script-tests.mjs backend/scripts/baselineDataService.test.ts
```

Expected: pass.

---

## Task 4: Install Lock And Environment Checks

**Files:**
- Create: `backend/src/install/installLock.ts`
- Create: `backend/src/install/installEnvironmentService.ts`
- Create: `backend/scripts/installLock.test.ts`

- [ ] **Step 1: Write lock tests**

Cover:

- no lock means `installed: false`
- file lock means `installed: true`
- creating a lock writes JSON with timestamp

- [ ] **Step 2: Implement lock service**

Use `backend/data/install.lock` by default, and support injectable paths in tests.

- [ ] **Step 3: Implement environment checks**

Checks:

- Node major version >= 20
- required writable dirs can be created
- Python command exists
- `python -c "import playwright"` works
- Chrome lookup includes Linux paths and `CHROME_PATH`

- [ ] **Step 4: Verify**

Run:

```bash
node scripts/run-script-tests.mjs backend/scripts/installLock.test.ts
```

Expected: pass.

---

## Task 5: Installer Backend API

**Files:**
- Create: `backend/src/controllers/installController.ts`
- Create: `backend/src/routes/installRoutes.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Add routes before authenticated API block**

Register:

```ts
app.use('/api/install', installRoutes);
```

Make `/api/install` exempt from global auth.

- [ ] **Step 2: Implement endpoints**

Endpoints:

- `GET /api/install/status`
- `POST /api/install/check`
- `POST /api/install/database`
- `POST /api/install/baseline-data`
- `POST /api/install/admin`
- `POST /api/install/finalize`

Mutating endpoints must reject when locked.

- [ ] **Step 3: Verify build**

Run:

```bash
cd backend
npm run build
```

Expected: pass.

---

## Task 6: Installer Frontend UI

**Files:**
- Create: `frontend/src/api/installAPI.ts`
- Create: `frontend/src/views/install/Index.vue`
- Modify: `frontend/src/router/index.ts`
- Create: `frontend/scripts/installRoute.test.mjs`

- [ ] **Step 1: Write route/static test**

Assert `/install` route exists, does not require auth, and imports `@/views/install/Index.vue`.

- [ ] **Step 2: Add API wrapper**

Expose:

```ts
getInstallStatus()
runInstallCheck()
configureDatabase(payload)
importBaselineData(payload)
createAdmin(payload)
finalizeInstall()
```

- [ ] **Step 3: Add page**

Step UI:

1. 环境检测
2. 数据库配置
3. 数据库创建
4. 基础数据导入
5. 管理员账号
6. 完成安装

- [ ] **Step 4: Verify**

Run:

```bash
node scripts/run-script-tests.mjs frontend/scripts/installRoute.test.mjs
cd frontend
npm run lint:check
npm run build
```

Expected: pass.

---

## Task 7: CentOS Deployment Artifacts

**Files:**
- Create: `deploy/centos/install-system-deps.sh`
- Create: `deploy/centos/ozon-backend.service.example`
- Create: `deploy/nginx/ozon.conf.example`
- Create: `deploy/README-centos.md`

- [ ] **Step 1: Add CentOS dependency script**

Install:

- Node.js 20
- MySQL client tools
- Python 3 and pip
- Playwright Python package
- Chrome/Chromium and required libraries
- Nginx

- [ ] **Step 2: Add systemd service template**

Service runs:

```bash
node /opt/ozon/backend/dist/entry.js
```

- [ ] **Step 3: Add Nginx template**

Serve frontend dist and proxy `/api` to `127.0.0.1:3000`.

- [ ] **Step 4: Add deployment README**

Document:

- build locally
- upload package
- install dependencies
- configure service
- open `/install`
- import optional baseline data
- lock installation

---

## Task 8: Final Verification

**Files:**
- Update: `docs/test-reports/2026-07-03-2235-global-test.md`

- [ ] **Step 1: Run backend build**

```bash
cd backend
npm run build
```

- [ ] **Step 2: Run frontend lint and build**

```bash
cd frontend
npm run lint:check
npm run build
```

- [ ] **Step 3: Run unified tests**

```bash
node scripts/run-script-tests.mjs
```

- [ ] **Step 4: Run deploy audit**

```bash
node scripts/audit-deploy-package.mjs
```

- [ ] **Step 5: Run project health**

```bash
node scripts/audit-project-health.mjs
```

- [ ] **Step 6: Browser verify**

Open:

```text
http://localhost:5173/install
```

Verify the install wizard renders and no blocking console errors appear.

