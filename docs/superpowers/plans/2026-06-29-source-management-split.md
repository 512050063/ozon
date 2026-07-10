# Source Management Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current source collection menu into product collection and 1688 supply source management while keeping the existing same/similar source collection behavior unchanged.

**Architecture:** Reuse the current `ProductSelection` page as product collection, add a dedicated `SupplySource` management page and API, and extract shared supply-source persistence into a backend service. Route and permission logic will preserve the legacy `source-collection` permission as a compatibility fallback.

**Tech Stack:** Vue 3, Vue Router, Element Plus, Pinia auth store, Express, Prisma, TypeScript, existing static Node test scripts, Vite.

---

## Current Workspace Note

`D:\project\ozon\.git` is currently an empty directory, so `git status` returns `fatal: not a git repository`. Commit steps below are included for normal repo operation, but in this workspace they must be skipped until Git metadata is restored.

## File Structure

- Create `backend/src/services/supplySourceService.ts`
  - Owns `SupplySource` query, payload normalization, upsert, update, delete, and URL import helpers.
- Create `backend/src/controllers/supplySourceController.ts`
  - Owns `/api/supply-sources` request/response handling.
- Create `backend/src/routes/supplySourceRoutes.ts`
  - Registers dedicated supply-source management endpoints.
- Modify `backend/src/controllers/productSupplyController.ts`
  - Reuses `supplySourceService.ts` for product-library source binding without changing product-library route behavior.
- Modify `backend/src/app.ts`
  - Registers `/api/supply-sources`.
- Create `frontend/src/api/supplySourceAPI.ts`
  - Dedicated frontend API client for supply-source management.
- Modify `frontend/src/api/productSupplyAPI.ts`
  - Re-export shared types or keep type compatibility with the new API client.
- Modify `frontend/src/router/index.ts`
  - Add `/source-collection/product-collection` and `/source-collection/supply-management`; redirect old `/source-collection`.
- Modify `frontend/src/components/MainLayout.vue`
  - Convert `货源采集` from single item to parent menu with two children.
- Modify `frontend/src/views/settings/role-management/Index.vue`
  - Add new leaf permissions under `货源采集`; keep legacy permission compatibility.
- Create `frontend/src/views/source-collection/supply-management/Index.vue`
  - New 1688 supply-source management page.
- Create or update static test scripts:
  - `backend/scripts/sourceManagementSplit.test.mjs`
  - `backend/scripts/supplySourceApiContracts.test.mjs`

---

### Task 1: Add Backend SupplySource Service

**Files:**
- Create: `backend/src/services/supplySourceService.ts`
- Modify: `backend/src/controllers/productSupplyController.ts`
- Test: `backend/scripts/supplySourceApiContracts.test.mjs`

- [ ] **Step 1: Write the failing static contract test**

Create `backend/scripts/supplySourceApiContracts.test.mjs`:

```js
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const servicePath = path.join(root, 'backend/src/services/supplySourceService.ts')
const productSupplyControllerPath = path.join(root, 'backend/src/controllers/productSupplyController.ts')

assert.ok(fs.existsSync(servicePath), 'supplySourceService.ts should exist')

const service = fs.readFileSync(servicePath, 'utf8')
const controller = fs.readFileSync(productSupplyControllerPath, 'utf8')

assert.match(service, /export function buildSupplySourceData/, 'service should export buildSupplySourceData')
assert.match(service, /export async function upsertSupplySource/, 'service should export upsertSupplySource')
assert.match(service, /export async function listSupplySources/, 'service should export listSupplySources')
assert.match(service, /export async function previewSupplySourceFromUrl/, 'service should export previewSupplySourceFromUrl')
assert.match(service, /export async function importSupplySourceFromUrl/, 'service should export importSupplySourceFromUrl')
assert.match(service, /export async function updateSupplySource/, 'service should export updateSupplySource')
assert.match(service, /export async function deleteSupplySource/, 'service should export deleteSupplySource')
assert.match(service, /@@unique|alibabaOfferId/, 'service should preserve offerId-based reuse semantics')
assert.match(service, /resolveProductSupplySourceFromUrl/, 'service should reuse existing 1688 URL resolver')
assert.match(service, /findFirst[\s\S]*userId[\s\S]*alibabaOfferId/, 'upsert should find existing source by userId and alibabaOfferId')

assert.match(controller, /from '..\/services\/supplySourceService'/, 'productSupplyController should import shared supply source service')
assert.doesNotMatch(controller, /function buildSupplySourceData/, 'productSupplyController should not keep local buildSupplySourceData')
assert.doesNotMatch(controller, /async function findReusableSupplySource/, 'productSupplyController should not keep local findReusableSupplySource')
assert.doesNotMatch(controller, /async function upsertSupplySourceForBinding/, 'productSupplyController should not keep local upsert helper')

console.log('supplySourceApiContracts tests passed')
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node backend/scripts/supplySourceApiContracts.test.mjs
```

Expected: FAIL because `backend/src/services/supplySourceService.ts` does not exist.

- [ ] **Step 3: Implement `supplySourceService.ts`**

Create `backend/src/services/supplySourceService.ts` with:

```ts
import prisma from '../config/database';
import {
  extractProductSupplySourceOfferId,
  resolveProductSupplySourceFromUrl,
  type ProductSupplySourcePreview,
} from './productSupplySourceResolver';

export interface SupplySourceListOptions {
  page?: any;
  limit?: any;
  keyword?: any;
}

export function buildSupplySourceData(userId: number, source: any, fallbackName = '') {
  return {
    userId,
    alibabaOfferId: (source.alibabaOfferId || '').toString().trim(),
    subject: source.subject || fallbackName,
    price: source.price !== undefined ? parseFloat(source.price.toString()) : 0,
    consignPrice: source.consignPrice !== undefined ? parseFloat(source.consignPrice.toString()) : 0,
    image: source.image || '',
    images: source.images || null,
    detailUrl: source.detailUrl || '',
    supplierName: source.supplierName || '',
    city: source.city || '',
    province: source.province || '',
    qualityScore: source.qualityScore !== undefined ? parseFloat(source.qualityScore.toString()) : 0,
    qualityDetail: source.qualityDetail || null,
    yxScoreLevel: source.yxScoreLevel || '',
    tradeServices: source.tradeServices || null,
    moq: source.moq !== undefined ? parseInt(source.moq.toString(), 10) || 1 : 1,
  };
}

export async function findReusableSupplySource(client: any, userId: number, alibabaOfferId: string) {
  return client.supplySource.findFirst({
    where: { userId, alibabaOfferId },
    orderBy: { id: 'asc' },
  });
}

export async function upsertSupplySource(userId: number, source: any, fallbackName = '', client: any = prisma) {
  const sourceData = buildSupplySourceData(userId, source, fallbackName);
  if (!sourceData.alibabaOfferId) {
    throw new Error('缺少1688货源ID');
  }

  const existingSource = await findReusableSupplySource(client, userId, sourceData.alibabaOfferId);
  if (existingSource) {
    return client.supplySource.update({
      where: { id: existingSource.id },
      data: sourceData,
    });
  }

  return client.supplySource.create({ data: sourceData });
}

export async function listSupplySources(userId: number, options: SupplySourceListOptions = {}) {
  const pageNumber = Math.max(1, Number(options.page) || 1);
  const limitNumber = Math.min(50, Math.max(1, Number(options.limit) || 20));
  const where: any = { userId };

  if (options.keyword) {
    const text = String(options.keyword);
    where.OR = [
      { alibabaOfferId: { contains: text } },
      { subject: { contains: text } },
      { supplierName: { contains: text } },
    ];
  }

  const [sources, groupedSources] = await Promise.all([
    prisma.supplySource.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      distinct: ['alibabaOfferId'],
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
    }),
    prisma.supplySource.groupBy({
      by: ['alibabaOfferId'],
      where,
    }),
  ]);

  return {
    data: sources,
    total: groupedSources.length,
    page: pageNumber,
    limit: limitNumber,
  };
}

export function assertValidSupplySourceInput(inputUrl: string) {
  const offerId = extractProductSupplySourceOfferId(inputUrl);
  if (!offerId) {
    throw new Error('请输入有效的1688商品链接或商品ID');
  }
  return offerId;
}

export async function previewSupplySourceFromUrl(userId: number, inputUrl: string): Promise<ProductSupplySourcePreview> {
  assertValidSupplySourceInput(inputUrl);
  return resolveProductSupplySourceFromUrl(userId, inputUrl);
}

export async function importSupplySourceFromUrl(userId: number, inputUrl: string) {
  const source = await previewSupplySourceFromUrl(userId, inputUrl);
  return upsertSupplySource(userId, source, source.subject);
}

export async function updateSupplySource(userId: number, sourceId: number, source: any) {
  const existingSource = await prisma.supplySource.findFirst({
    where: { id: sourceId, userId },
  });
  if (!existingSource) {
    throw new Error('货源不存在');
  }

  const mergedSource = {
    ...existingSource,
    ...source,
    alibabaOfferId: source.alibabaOfferId || existingSource.alibabaOfferId,
  };

  const sourceData = buildSupplySourceData(userId, mergedSource, existingSource.subject);
  return prisma.supplySource.update({
    where: { id: sourceId },
    data: sourceData,
  });
}

export async function deleteSupplySource(userId: number, sourceId: number) {
  const existingSource = await prisma.supplySource.findFirst({
    where: { id: sourceId, userId },
  });
  if (!existingSource) {
    throw new Error('货源不存在');
  }

  await prisma.productSupply.updateMany({
    where: { userId, supplySourceId: sourceId },
    data: { supplySourceId: null },
  });

  await prisma.supplySource.delete({
    where: { id: sourceId },
  });
}
```

- [ ] **Step 4: Refactor `productSupplyController.ts` to use the service**

Modify imports in `backend/src/controllers/productSupplyController.ts`:

```ts
import {
  listSupplySources,
  previewSupplySourceFromUrl,
  upsertSupplySource,
} from '../services/supplySourceService';
```

Delete local helper functions:

```ts
function buildSupplySourceData(...)
async function findReusableSupplySource(...)
async function upsertSupplySourceForBinding(...)
function normalizeAlibabaDetailToSupplySource(...)
```

Replace calls:

```ts
const supplySource = await upsertSupplySource(userId, source, name || base?.name || '');
```

```ts
const reusableSource = await upsertSupplySource(userId, source, existingItem.name, tx);
```

Replace `getSupplySources` body with:

```ts
export const getSupplySources = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await listSupplySources(userId, req.query);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.error('查询1688货源库失败:', error);
    res.status(500).json({
      success: false,
      message: `查询货源失败: ${error.message}`,
    });
  }
};
```

Replace source preview resolution:

```ts
const source = await previewSupplySourceFromUrl(userId, inputUrl);
```

- [ ] **Step 5: Run contract and build checks**

Run:

```powershell
node backend/scripts/supplySourceApiContracts.test.mjs
cd backend; npm run build
```

Expected: test passes and backend TypeScript build succeeds.

- [ ] **Step 6: Commit if Git is available**

Run only after `git status` works:

```powershell
git add backend/src/services/supplySourceService.ts backend/src/controllers/productSupplyController.ts backend/scripts/supplySourceApiContracts.test.mjs
git commit -m "refactor: extract supply source service"
```

---

### Task 2: Add Dedicated Supply Source API

**Files:**
- Create: `backend/src/controllers/supplySourceController.ts`
- Create: `backend/src/routes/supplySourceRoutes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/scripts/supplySourceApiContracts.test.mjs`

- [ ] **Step 1: Extend the contract test**

Append to `backend/scripts/supplySourceApiContracts.test.mjs`:

```js
const supplyControllerPath = path.join(root, 'backend/src/controllers/supplySourceController.ts')
const supplyRoutesPath = path.join(root, 'backend/src/routes/supplySourceRoutes.ts')
const appPath = path.join(root, 'backend/src/app.ts')

assert.ok(fs.existsSync(supplyControllerPath), 'supplySourceController.ts should exist')
assert.ok(fs.existsSync(supplyRoutesPath), 'supplySourceRoutes.ts should exist')

const supplyController = fs.readFileSync(supplyControllerPath, 'utf8')
const supplyRoutes = fs.readFileSync(supplyRoutesPath, 'utf8')
const app = fs.readFileSync(appPath, 'utf8')

assert.match(supplyController, /export const getSupplySourceItems/, 'controller should expose list action')
assert.match(supplyController, /export const previewSupplySourceUrl/, 'controller should expose URL preview action')
assert.match(supplyController, /export const importSupplySourceUrl/, 'controller should expose URL import action')
assert.match(supplyController, /export const updateSupplySourceItem/, 'controller should expose update action')
assert.match(supplyController, /export const deleteSupplySourceItem/, 'controller should expose delete action')
assert.match(supplyController, /listSupplySources/, 'controller should use shared list service')
assert.match(supplyController, /previewSupplySourceFromUrl/, 'controller should use shared preview service')
assert.match(supplyController, /importSupplySourceFromUrl/, 'controller should use shared import service')
assert.match(supplyController, /updateSupplySource/, 'controller should use shared update service')
assert.match(supplyController, /deleteSupplySource/, 'controller should use shared delete service')

assert.match(supplyRoutes, /router\.get\('\/'/, 'routes should list supply sources')
assert.match(supplyRoutes, /router\.post\('\/preview-url'/, 'routes should preview URL')
assert.match(supplyRoutes, /router\.post\('\/from-url'/, 'routes should import URL')
assert.match(supplyRoutes, /router\.put\('\/:id'/, 'routes should update source')
assert.match(supplyRoutes, /router\.delete\('\/:id'/, 'routes should delete source')
assert.match(app, /supplySourceRoutes/, 'app should import supply source routes')
assert.match(app, /app\.use\('\/api\/supply-sources', supplySourceRoutes\)/, 'app should mount /api/supply-sources')
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node backend/scripts/supplySourceApiContracts.test.mjs
```

Expected: FAIL because controller and routes do not exist.

- [ ] **Step 3: Create `supplySourceController.ts`**

Create `backend/src/controllers/supplySourceController.ts`:

```ts
import { Request, Response } from 'express';
import logger from '../config/logger';
import {
  deleteSupplySource,
  importSupplySourceFromUrl,
  listSupplySources,
  previewSupplySourceFromUrl,
  updateSupplySource,
  upsertSupplySource,
} from '../services/supplySourceService';

function getUserId(req: Request): number {
  return (req as any).user.id;
}

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('货源ID无效');
  }
  return id;
}

export const getSupplySourceItems = async (req: Request, res: Response) => {
  try {
    const result = await listSupplySources(getUserId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.error('查询货源管理列表失败:', error);
    res.status(500).json({ success: false, message: error.message || '查询货源失败' });
  }
};

export const previewSupplySourceUrl = async (req: Request, res: Response) => {
  try {
    const source = await previewSupplySourceFromUrl(getUserId(req), String(req.body?.url || '').trim());
    res.json({ success: true, data: source, message: '1688货源解析成功' });
  } catch (error: any) {
    logger.error('货源管理解析1688链接失败:', error);
    res.status(400).json({ success: false, message: error.message || '解析货源失败' });
  }
};

export const importSupplySourceUrl = async (req: Request, res: Response) => {
  try {
    const source = await importSupplySourceFromUrl(getUserId(req), String(req.body?.url || '').trim());
    res.status(201).json({ success: true, data: source, message: '货源已保存' });
  } catch (error: any) {
    logger.error('货源管理导入1688链接失败:', error);
    res.status(400).json({ success: false, message: error.message || '保存货源失败' });
  }
};

export const createSupplySourceItem = async (req: Request, res: Response) => {
  try {
    const source = await upsertSupplySource(getUserId(req), req.body?.source || req.body, req.body?.subject || '');
    res.status(201).json({ success: true, data: source, message: '货源已保存' });
  } catch (error: any) {
    logger.error('货源管理保存货源失败:', error);
    res.status(400).json({ success: false, message: error.message || '保存货源失败' });
  }
};

export const updateSupplySourceItem = async (req: Request, res: Response) => {
  try {
    const source = await updateSupplySource(getUserId(req), parseId(req.params.id), req.body?.source || req.body);
    res.json({ success: true, data: source, message: '货源已更新' });
  } catch (error: any) {
    logger.error('货源管理更新货源失败:', error);
    res.status(error.message === '货源不存在' ? 404 : 400).json({
      success: false,
      message: error.message || '更新货源失败',
    });
  }
};

export const deleteSupplySourceItem = async (req: Request, res: Response) => {
  try {
    await deleteSupplySource(getUserId(req), parseId(req.params.id));
    res.json({ success: true, message: '货源已删除' });
  } catch (error: any) {
    logger.error('货源管理删除货源失败:', error);
    res.status(error.message === '货源不存在' ? 404 : 400).json({
      success: false,
      message: error.message || '删除货源失败',
    });
  }
};
```

- [ ] **Step 4: Create `supplySourceRoutes.ts`**

Create `backend/src/routes/supplySourceRoutes.ts`:

```ts
import express from 'express';
import {
  createSupplySourceItem,
  deleteSupplySourceItem,
  getSupplySourceItems,
  importSupplySourceUrl,
  previewSupplySourceUrl,
  updateSupplySourceItem,
} from '../controllers/supplySourceController';

const router = express.Router();

router.get('/', getSupplySourceItems);
router.post('/', createSupplySourceItem);
router.post('/preview-url', previewSupplySourceUrl);
router.post('/from-url', importSupplySourceUrl);
router.put('/:id', updateSupplySourceItem);
router.delete('/:id', deleteSupplySourceItem);

export default router;
```

- [ ] **Step 5: Mount routes in `app.ts`**

Add import:

```ts
import supplySourceRoutes from './routes/supplySourceRoutes';
```

Add route registration after `productSupplyRoutes` import section and before health:

```ts
app.use('/api/supply-sources', supplySourceRoutes);
```

- [ ] **Step 6: Run backend checks**

Run:

```powershell
node backend/scripts/supplySourceApiContracts.test.mjs
cd backend; npm run build
```

Expected: test passes and backend build succeeds.

- [ ] **Step 7: Commit if Git is available**

```powershell
git add backend/src/controllers/supplySourceController.ts backend/src/routes/supplySourceRoutes.ts backend/src/app.ts backend/scripts/supplySourceApiContracts.test.mjs
git commit -m "feat: add supply source management api"
```

---

### Task 3: Add Frontend Supply Source API Client

**Files:**
- Create: `frontend/src/api/supplySourceAPI.ts`
- Test: `backend/scripts/sourceManagementSplit.test.mjs`

- [ ] **Step 1: Write the failing frontend contract test**

Create `backend/scripts/sourceManagementSplit.test.mjs`:

```js
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const supplyApiPath = path.join(root, 'frontend/src/api/supplySourceAPI.ts')

assert.ok(fs.existsSync(supplyApiPath), 'supplySourceAPI.ts should exist')

const supplyApi = fs.readFileSync(supplyApiPath, 'utf8')

assert.match(supplyApi, /export interface SupplySource/, 'frontend supply API should expose SupplySource type')
assert.match(supplyApi, /getSupplySourceItems/, 'frontend supply API should list supply sources')
assert.match(supplyApi, /previewSupplySourceUrl/, 'frontend supply API should preview URL')
assert.match(supplyApi, /importSupplySourceUrl/, 'frontend supply API should import URL')
assert.match(supplyApi, /updateSupplySourceItem/, 'frontend supply API should update source')
assert.match(supplyApi, /deleteSupplySourceItem/, 'frontend supply API should delete source')
assert.match(supplyApi, /\/supply-sources/, 'frontend supply API should call dedicated supply-sources endpoint')
assert.doesNotMatch(supplyApi, /\/product-supply\/sources/, 'supply management page should not use product-library source endpoint')

console.log('sourceManagementSplit tests passed')
```

- [ ] **Step 2: Run the test and confirm it fails**

```powershell
node backend/scripts/sourceManagementSplit.test.mjs
```

Expected: FAIL because `frontend/src/api/supplySourceAPI.ts` does not exist.

- [ ] **Step 3: Create frontend API client**

Create `frontend/src/api/supplySourceAPI.ts`:

```ts
import request from './request';
import type { ApiResponse } from '@/types';
import { getFullImageUrl } from '@/utils/common';

export interface SupplySource {
  id: number;
  userId: number;
  alibabaOfferId: string;
  subject: string;
  price: number;
  consignPrice: number;
  image: string;
  images: string[] | null;
  detailUrl: string;
  supplierName: string;
  city: string;
  province: string;
  qualityScore: number;
  qualityDetail: any;
  yxScoreLevel: string;
  tradeServices: string[] | null;
  moq: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplySourcePayload {
  alibabaOfferId: string;
  subject?: string;
  price?: number;
  consignPrice?: number;
  image?: string;
  images?: string[];
  detailUrl?: string;
  supplierName?: string;
  city?: string;
  province?: string;
  qualityScore?: number;
  qualityDetail?: any;
  yxScoreLevel?: string;
  tradeServices?: string[];
  moq?: number;
}

export interface SupplySourceListResponse {
  success: boolean;
  data: SupplySource[];
  total: number;
  page: number;
  limit: number;
  message?: string;
}

const normalizeSupplySource = (source: SupplySource | null): SupplySource | null => {
  if (!source) return source;
  return {
    ...source,
    image: getFullImageUrl(source.image) || source.image,
    images: Array.isArray(source.images)
      ? source.images.map(image => getFullImageUrl(image) || image)
      : source.images,
  };
};

export async function getSupplySourceItems(params?: {
  page?: number;
  limit?: number;
  keyword?: string;
}): Promise<SupplySourceListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.keyword) queryParams.set('keyword', params.keyword);

  const response = await request.get(`/supply-sources?${queryParams.toString()}`);
  if (Array.isArray(response.data)) {
    response.data = response.data.map(normalizeSupplySource);
  }
  return response as SupplySourceListResponse;
}

export async function previewSupplySourceUrl(url: string): Promise<ApiResponse<SupplySource>> {
  const response = await request.post('/supply-sources/preview-url', { url });
  if (response.success && response.data) {
    response.data = normalizeSupplySource(response.data);
  }
  return response;
}

export async function importSupplySourceUrl(url: string): Promise<ApiResponse<SupplySource>> {
  const response = await request.post('/supply-sources/from-url', { url });
  if (response.success && response.data) {
    response.data = normalizeSupplySource(response.data);
  }
  return response;
}

export async function createSupplySourceItem(source: SupplySourcePayload): Promise<ApiResponse<SupplySource>> {
  const response = await request.post('/supply-sources', { source });
  if (response.success && response.data) {
    response.data = normalizeSupplySource(response.data);
  }
  return response;
}

export async function updateSupplySourceItem(
  id: number,
  source: Partial<SupplySourcePayload>
): Promise<ApiResponse<SupplySource>> {
  const response = await request.put(`/supply-sources/${id}`, { source });
  if (response.success && response.data) {
    response.data = normalizeSupplySource(response.data);
  }
  return response;
}

export async function deleteSupplySourceItem(id: number): Promise<ApiResponse<void>> {
  return request.delete(`/supply-sources/${id}`);
}

export const supplySourceAPI = {
  getSupplySourceItems,
  previewSupplySourceUrl,
  importSupplySourceUrl,
  createSupplySourceItem,
  updateSupplySourceItem,
  deleteSupplySourceItem,
};
```

- [ ] **Step 4: Run API test and frontend build**

```powershell
node backend/scripts/sourceManagementSplit.test.mjs
cd frontend; npm run build
```

Expected: static test passes and Vite build succeeds.

- [ ] **Step 5: Commit if Git is available**

```powershell
git add frontend/src/api/supplySourceAPI.ts backend/scripts/sourceManagementSplit.test.mjs
git commit -m "feat: add frontend supply source api"
```

---

### Task 4: Update Routes, Menu, and Permission Tree

**Files:**
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/components/MainLayout.vue`
- Modify: `frontend/src/views/settings/role-management/Index.vue`
- Test: `backend/scripts/sourceManagementSplit.test.mjs`

- [ ] **Step 1: Extend static test for route/menu/permission contracts**

Append to `backend/scripts/sourceManagementSplit.test.mjs`:

```js
const routerPath = path.join(root, 'frontend/src/router/index.ts')
const layoutPath = path.join(root, 'frontend/src/components/MainLayout.vue')
const rolePath = path.join(root, 'frontend/src/views/settings/role-management/Index.vue')
const sourceCollectionPath = path.join(root, 'frontend/src/views/source-collection/Index.vue')

const router = fs.readFileSync(routerPath, 'utf8')
const layout = fs.readFileSync(layoutPath, 'utf8')
const role = fs.readFileSync(rolePath, 'utf8')
const sourceCollection = fs.readFileSync(sourceCollectionPath, 'utf8')

assert.match(router, /redirect:\s*'\/source-collection\/product-collection'/, 'legacy source route should redirect to product collection')
assert.match(router, /path:\s*'\/source-collection\/product-collection'/, 'router should expose product collection route')
assert.match(router, /path:\s*'\/source-collection\/supply-management'/, 'router should expose supply management route')
assert.match(router, /menuKey:\s*'source-collection\/product-collection'/, 'product collection route should use leaf permission')
assert.match(router, /menuKey:\s*'source-collection\/supply-management'/, 'supply management route should use leaf permission')
assert.match(router, /hasLegacySourceCollectionAccess/, 'router guard should support legacy source-collection permission')

assert.match(layout, /sourceCollectionSubmenuOpen/, 'layout should track source collection submenu state')
assert.match(layout, /toggleSourceCollectionSubmenu/, 'layout should toggle source collection submenu')
assert.match(layout, /商品采集/, 'layout should show product collection submenu')
assert.match(layout, /货源管理/, 'layout should show supply management submenu')
assert.match(layout, /source-collection\/product-collection/, 'layout should navigate to product collection')
assert.match(layout, /source-collection\/supply-management/, 'layout should navigate to supply management')
assert.match(layout, /permissions\.includes\('source-collection\/product-collection'\)/, 'layout permission should include product collection')
assert.match(layout, /permissions\.includes\('source-collection\/supply-management'\)/, 'layout permission should include supply management')

assert.match(role, /source-collection\/product-collection/, 'role tree should include product collection permission')
assert.match(role, /source-collection\/supply-management/, 'role tree should include supply management permission')
assert.match(role, /normalizeLegacySourceCollectionPermissions/, 'role page should normalize legacy source collection permission')

assert.match(sourceCollection, /createProductSupplyItem/, 'product collection should keep product-library create behavior')
assert.match(sourceCollection, /alibabaAPI\.searchSimilar/, 'product collection should keep same-category search')
assert.match(sourceCollection, /alibabaAPI\.searchByImage/, 'product collection should keep same-product image search')
```

- [ ] **Step 2: Run the test and confirm it fails**

```powershell
node backend/scripts/sourceManagementSplit.test.mjs
```

Expected: FAIL because the routes/menu are still in the old single-route shape.

- [ ] **Step 3: Update router**

Modify `frontend/src/router/index.ts` source collection route:

```ts
{
  path: '/source-collection',
  name: 'SourceCollection',
  redirect: '/source-collection/product-collection',
  meta: { requiresAuth: true, menuKey: 'source-collection' },
},
{
  path: '/source-collection/product-collection',
  name: 'SourceProductCollection',
  component: () => import('@/views/source-collection/Index.vue'),
  meta: { requiresAuth: true, menuKey: 'source-collection/product-collection' },
},
{
  path: '/source-collection/supply-management',
  name: 'SourceSupplyManagement',
  component: () => import('@/views/source-collection/supply-management/Index.vue'),
  meta: { requiresAuth: true, menuKey: 'source-collection/supply-management' },
},
```

Add legacy guard before the permission rejection:

```ts
const hasLegacySourceCollectionAccess =
  menuKey.startsWith('source-collection/') && permissions.includes('source-collection');

if (
  !permissions.includes(menuKey) &&
  !hasLegacyOzonOrderAccess &&
  !hasLegacyCustomerServiceAccess &&
  !hasLegacyFinanceAccess &&
  !hasLegacySourceCollectionAccess
) {
  console.warn(`用户无权限访问菜单: ${to.meta.menuKey}`);
  next('/dashboard');
  return;
}
```

- [ ] **Step 4: Update `MainLayout.vue` menu**

Replace the single `货源采集` button with a parent submenu modeled after `选品分析`:

```vue
<div class="space-y-1" v-if="hasPermission('source-collection')">
  <button
    @click="toggleSourceCollectionSubmenu"
    :class="[
      'w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
      currentPath.startsWith('/source-collection')
        ? 'bg-blue-50 text-blue-600 font-medium'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
    ]"
  >
    <div class="flex items-center">
      <svg class="w-5 h-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
      货源采集
    </div>
    <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-90': sourceCollectionSubmenuOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>
  <div v-if="sourceCollectionSubmenuOpen" class="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-4">
    <button
      v-if="hasPermission('source-collection/product-collection')"
      @click.stop="navigateTo('/source-collection/product-collection')"
      :class="[
        'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
        currentPath === '/source-collection/product-collection'
          ? 'bg-blue-50 text-blue-600 font-medium'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
      ]"
    >
      商品采集
    </button>
    <button
      v-if="hasPermission('source-collection/supply-management')"
      @click.stop="navigateTo('/source-collection/supply-management')"
      :class="[
        'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
        currentPath === '/source-collection/supply-management'
          ? 'bg-blue-50 text-blue-600 font-medium'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
      ]"
    >
      货源管理
    </button>
  </div>
</div>
```

Add permission logic:

```ts
if (menuKey === 'source-collection') {
  return (
    permissions.includes('source-collection') ||
    permissions.includes('source-collection/product-collection') ||
    permissions.includes('source-collection/supply-management')
  );
}
if (
  menuKey === 'source-collection/product-collection' ||
  menuKey === 'source-collection/supply-management'
) {
  return permissions.includes('source-collection') || permissions.includes(menuKey);
}
```

Add submenu state and route expansion:

```ts
const sourceCollectionSubmenuOpen = ref(false);
```

```ts
if (route.path.startsWith('/source-collection')) {
  sourceCollectionSubmenuOpen.value = true;
}
```

```ts
const toggleSourceCollectionSubmenu = () => {
  sourceCollectionSubmenuOpen.value = !sourceCollectionSubmenuOpen.value;
};
```

Update title map:

```ts
'/source-collection/product-collection': '货源采集 > 商品采集',
'/source-collection/supply-management': '货源采集 > 货源管理',
```

- [ ] **Step 5: Update role permission tree**

Modify the `source-collection` node in `frontend/src/views/settings/role-management/Index.vue`:

```ts
{
  code: 'source-collection',
  label: '货源采集',
  children: [
    { code: 'source-collection/product-collection', label: '商品采集' },
    { code: 'source-collection/supply-management', label: '货源管理' }
  ]
},
```

Add normalization helper near `filterValidPermissions`:

```ts
const normalizeLegacySourceCollectionPermissions = (permissions: string[]): string[] => {
  const normalized = [...permissions];
  if (normalized.includes('source-collection')) {
    if (!normalized.includes('source-collection/product-collection')) {
      normalized.push('source-collection/product-collection');
    }
    if (!normalized.includes('source-collection/supply-management')) {
      normalized.push('source-collection/supply-management');
    }
  }
  return normalized;
};
```

Use it at the start of `filterValidPermissions`:

```ts
const normalizedPermissions = normalizeLegacySourceCollectionPermissions([...permissions]);
```

- [ ] **Step 6: Run route/menu checks**

```powershell
node backend/scripts/sourceManagementSplit.test.mjs
cd frontend; npm run build
```

Expected: static test passes for route/menu assertions; frontend build may still fail until Task 5 creates the new page.

- [ ] **Step 7: Commit if Git is available**

```powershell
git add frontend/src/router/index.ts frontend/src/components/MainLayout.vue frontend/src/views/settings/role-management/Index.vue backend/scripts/sourceManagementSplit.test.mjs
git commit -m "feat: split source collection menu"
```

---

### Task 5: Build Supply Management Page

**Files:**
- Create: `frontend/src/views/source-collection/supply-management/Index.vue`
- Test: `backend/scripts/sourceManagementSplit.test.mjs`

- [ ] **Step 1: Extend static test for the new page**

Append to `backend/scripts/sourceManagementSplit.test.mjs`:

```js
const supplyPagePath = path.join(root, 'frontend/src/views/source-collection/supply-management/Index.vue')
assert.ok(fs.existsSync(supplyPagePath), 'supply management page should exist')

const supplyPage = fs.readFileSync(supplyPagePath, 'utf8')
assert.match(supplyPage, /AppPageHeader/, 'supply page should use shared page header')
assert.match(supplyPage, /getSupplySourceItems/, 'supply page should load saved sources')
assert.match(supplyPage, /previewSupplySourceUrl/, 'supply page should preview 1688 URL before saving')
assert.match(supplyPage, /importSupplySourceUrl/, 'supply page should save parsed 1688 URL')
assert.match(supplyPage, /updateSupplySourceItem/, 'supply page should edit saved source fields')
assert.match(supplyPage, /deleteSupplySourceItem/, 'supply page should delete saved sources')
assert.match(supplyPage, /openSourceDetailUrl/, 'supply page should open 1688 detail URL')
assert.match(supplyPage, /source-action-button/, 'supply page should use compact colored action buttons')
assert.match(supplyPage, /btn-cancel/, 'supply page should use shared cancel button style')
assert.match(supplyPage, /btn-confirm/, 'supply page should use shared confirm button style')
assert.match(supplyPage, /v-loading="urlPreviewLoading"/, 'URL dialog should show loading state after opening')
assert.doesNotMatch(supplyPage, /alibabaAPI\.searchSimilar|alibabaAPI\.searchByImage/, 'supply management should not call source-collection same/similar APIs')
```

- [ ] **Step 2: Run the test and confirm it fails**

```powershell
node backend/scripts/sourceManagementSplit.test.mjs
```

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Create page script and template**

Create `frontend/src/views/source-collection/supply-management/Index.vue` with this structure:

```vue
<template>
  <MainLayout>
    <div class="p-6">
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <AppPageHeader title="货源管理" subtitle="管理已保存的1688货源商品">
          <template #extra>
            <el-button type="primary" class="btn-create" @click="openAddDialog">
              <el-icon class="mr-1"><Plus /></el-icon>
              添加货源
            </el-button>
          </template>
        </AppPageHeader>

        <div class="h-[100px] border-b border-slate-100 flex items-center px-6 gap-3">
          <el-input
            v-model="keyword"
            placeholder="搜索1688货源标题、供应商或商品ID"
            clearable
            class="input-search"
            @keyup.enter="loadSources"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" class="btn-search" :loading="loading" @click="loadSources">
            <el-icon class="mr-1"><Search /></el-icon>
            搜索
          </el-button>
        </div>

        <div v-loading="loading" class="supply-source-body">
          <div v-if="sources.length > 0" class="supply-source-grid">
            <button
              v-for="source in sources"
              :key="source.id"
              type="button"
              class="supply-source-card"
              @click="openSourceDetailUrl(source)"
            >
              <img v-if="source.image" :src="source.image" class="supply-source-image" />
              <div v-else class="supply-source-placeholder">1688</div>
              <div class="supply-source-info">
                <div class="supply-source-title" :title="source.subject">{{ source.subject || '未命名货源' }}</div>
                <div class="supply-source-price">¥{{ formatMoney(source.price) }}</div>
                <div class="supply-source-meta">
                  <span>{{ source.supplierName || '未知供应商' }}</span>
                  <span>{{ [source.province, source.city].filter(Boolean).join(' ') || '未知地区' }}</span>
                  <span>起订 {{ source.moq || 1 }}</span>
                </div>
                <div class="supply-source-id">{{ source.alibabaOfferId }}</div>
              </div>
              <div class="supply-source-actions" @click.stop>
                <AppTableButton name="edit" @click="openEditDialog(source)" />
                <el-popconfirm title="删除后，已绑定商品会变为无货源，确定删除吗？" confirm-button-text="确定" cancel-button-text="取消" @confirm="handleDelete(source)">
                  <template #reference>
                    <AppTableButton name="delete" />
                  </template>
                </el-popconfirm>
              </div>
            </button>
          </div>
          <AppEmpty v-else title="暂无货源" description="可以通过1688链接添加货源" />
        </div>

        <AppPagination :model-value="currentPage" :total="total" :page-size="pageSize" @change="handlePageChange" />
      </div>
    </div>

    <AppDialog
      v-model="sourceDialogVisible"
      :title="dialogMode === 'add' ? '添加货源' : '编辑货源'"
      subtitle="维护1688货源基础信息"
      :icon="Goods"
      content-class="supply-source-dialog"
      :confirm-loading="submitting"
      :confirm-disabled="dialogMode === 'add' && !previewSource"
      @confirm="handleDialogConfirm"
    >
      <div class="source-dialog-form">
        <template v-if="dialogMode === 'add'">
          <div class="source-form-row">
            <el-input
              v-model="urlInput"
              placeholder="粘贴1688商品详情链接，或直接输入1688商品ID"
              clearable
              @keyup.enter="handlePreviewUrl"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button class="source-action-button" :loading="urlPreviewLoading" @click="handlePreviewUrl">解析</el-button>
          </div>
          <div v-loading="urlPreviewLoading" class="source-preview-box">
            <button v-if="previewSource" type="button" class="source-preview-card" @click="openSourceDetailUrl(previewSource)">
              <img v-if="previewSource.image" :src="previewSource.image" class="source-preview-image" />
              <div v-else class="source-preview-placeholder">1688</div>
              <div class="source-preview-main">
                <div class="source-preview-title" :title="previewSource.subject">{{ previewSource.subject || '未命名货源' }}</div>
                <div class="source-preview-meta">
                  <span>{{ previewSource.supplierName || '未知供应商' }}</span>
                  <span>¥{{ formatMoney(previewSource.price) }}</span>
                  <span>{{ previewSource.alibabaOfferId }}</span>
                </div>
              </div>
            </button>
            <div v-else class="source-empty-state">输入链接后点击解析，解析结果会显示在这里</div>
          </div>
        </template>

        <template v-else>
          <div class="edit-grid">
            <label>商品标题<el-input v-model="editForm.subject" placeholder="商品标题" /></label>
            <label>商品ID<el-input v-model="editForm.alibabaOfferId" placeholder="1688商品ID" disabled /></label>
            <label>价格<el-input v-model="editForm.price" placeholder="价格" /></label>
            <label>代发价<el-input v-model="editForm.consignPrice" placeholder="代发价" /></label>
            <label>供应商<el-input v-model="editForm.supplierName" placeholder="供应商" /></label>
            <label>省份<el-input v-model="editForm.province" placeholder="省份" /></label>
            <label>城市<el-input v-model="editForm.city" placeholder="城市" /></label>
            <label>起订量<el-input v-model="editForm.moq" placeholder="起订量" /></label>
            <label class="edit-grid-full">详情链接<el-input v-model="editForm.detailUrl" placeholder="1688详情链接" /></label>
            <label class="edit-grid-full">主图URL<el-input v-model="editForm.image" placeholder="主图URL" /></label>
          </div>
        </template>
      </div>
    </AppDialog>
  </MainLayout>
</template>
```

- [ ] **Step 4: Add script**

Add script to the same file:

```ts
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Goods, Plus, Search } from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
import { AppDialog, AppEmpty, AppPageHeader, AppPagination, AppTableButton } from '@/components/ui';
import {
  deleteSupplySourceItem,
  getSupplySourceItems,
  importSupplySourceUrl,
  previewSupplySourceUrl,
  updateSupplySourceItem,
  type SupplySource,
  type SupplySourcePayload,
} from '@/api/supplySourceAPI';

const keyword = ref('');
const sources = ref<SupplySource[]>([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = 20;
const total = ref(0);

const sourceDialogVisible = ref(false);
const dialogMode = ref<'add' | 'edit'>('add');
const submitting = ref(false);
const urlPreviewLoading = ref(false);
const urlInput = ref('');
const previewSource = ref<SupplySource | null>(null);
const editingSourceId = ref<number | null>(null);
const editForm = reactive<Partial<SupplySourcePayload>>({});

const formatMoney = (value: number | string | null | undefined) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const getSourceDetailUrl = (source: Partial<SupplySource | SupplySourcePayload>) => {
  if (source.detailUrl) return source.detailUrl;
  if (source.alibabaOfferId) return `https://detail.1688.com/offer/${source.alibabaOfferId}.html`;
  return '';
};

const openSourceDetailUrl = (source: Partial<SupplySource | SupplySourcePayload>) => {
  const url = getSourceDetailUrl(source);
  if (!url) return;
  window.open(url, '_blank');
};

const loadSources = async () => {
  loading.value = true;
  try {
    const result = await getSupplySourceItems({
      page: currentPage.value,
      limit: pageSize,
      keyword: keyword.value.trim(),
    });
    if (!result.success) {
      ElMessage.error(result.message || '获取货源失败');
      return;
    }
    sources.value = result.data || [];
    total.value = result.total || 0;
  } catch (error: any) {
    ElMessage.error(error.message || '获取货源失败');
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  loadSources();
};

const openAddDialog = () => {
  dialogMode.value = 'add';
  urlInput.value = '';
  previewSource.value = null;
  sourceDialogVisible.value = true;
};

const openEditDialog = (source: SupplySource) => {
  dialogMode.value = 'edit';
  editingSourceId.value = source.id;
  Object.assign(editForm, {
    alibabaOfferId: source.alibabaOfferId,
    subject: source.subject,
    price: source.price,
    consignPrice: source.consignPrice,
    image: source.image,
    detailUrl: source.detailUrl,
    supplierName: source.supplierName,
    city: source.city,
    province: source.province,
    moq: source.moq,
  });
  sourceDialogVisible.value = true;
};

const handlePreviewUrl = async () => {
  const url = urlInput.value.trim();
  if (!url) {
    ElMessage.warning('请输入1688商品链接或商品ID');
    return;
  }
  urlPreviewLoading.value = true;
  try {
    const result = await previewSupplySourceUrl(url);
    if (!result.success || !result.data) {
      ElMessage.error(result.message || '解析失败');
      return;
    }
    previewSource.value = result.data;
  } catch (error: any) {
    ElMessage.error(error.message || '解析失败');
  } finally {
    urlPreviewLoading.value = false;
  }
};

const handleDialogConfirm = async () => {
  submitting.value = true;
  try {
    if (dialogMode.value === 'add') {
      const url = urlInput.value.trim();
      if (!previewSource.value || !url) {
        ElMessage.warning('请先解析1688货源');
        return;
      }
      const result = await importSupplySourceUrl(url);
      if (!result.success) {
        ElMessage.error(result.message || '保存失败');
        return;
      }
      ElMessage.success('货源已保存');
    } else if (editingSourceId.value) {
      const result = await updateSupplySourceItem(editingSourceId.value, editForm);
      if (!result.success) {
        ElMessage.error(result.message || '更新失败');
        return;
      }
      ElMessage.success('货源已更新');
    }
    sourceDialogVisible.value = false;
    await loadSources();
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (source: SupplySource) => {
  try {
    const result = await deleteSupplySourceItem(source.id);
    if (!result.success) {
      ElMessage.error(result.message || '删除失败');
      return;
    }
    ElMessage.success('货源已删除');
    await loadSources();
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败');
  }
};

onMounted(() => {
  loadSources();
});
</script>
```

- [ ] **Step 5: Add scoped CSS**

Add CSS in the same file. Keep cards at `8px` radius and avoid nested cards:

```css
<style scoped>
.supply-source-body {
  min-height: 420px;
  padding: 24px;
}

.supply-source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.supply-source-card {
  position: relative;
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 12px;
  min-height: 128px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.supply-source-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.supply-source-image,
.supply-source-placeholder {
  width: 92px;
  height: 92px;
  border-radius: 8px;
  object-fit: cover;
  background: #f1f5f9;
}

.supply-source-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  font-weight: 700;
}

.supply-source-info {
  min-width: 0;
  padding-right: 64px;
}

.supply-source-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.supply-source-price {
  margin-top: 8px;
  color: #e6521d;
  font-size: 18px;
  font-weight: 700;
}

.supply-source-meta,
.supply-source-id {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
}

.supply-source-id {
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.supply-source-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
}

:deep(.supply-source-dialog) {
  width: 680px;
  max-width: calc(100vw - 32px);
}

.source-dialog-form {
  min-height: 320px;
}

.source-form-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.source-action-button {
  min-width: 72px;
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: #ffffff;
  font-size: 12px;
}

.source-preview-box {
  min-height: 180px;
  margin-top: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.source-preview-card {
  width: 100%;
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
}

.source-preview-image,
.source-preview-placeholder {
  width: 76px;
  height: 76px;
  border-radius: 8px;
  object-fit: cover;
  background: #f1f5f9;
}

.source-preview-placeholder,
.source-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 12px;
}

.source-preview-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
}

.source-preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  color: #64748b;
  font-size: 12px;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.edit-grid label {
  display: grid;
  gap: 6px;
  color: #475569;
  font-size: 12px;
  text-align: left;
}

.edit-grid-full {
  grid-column: 1 / -1;
}
</style>
```

- [ ] **Step 6: Run frontend checks**

```powershell
node backend/scripts/sourceManagementSplit.test.mjs
cd frontend; npm run build
```

Expected: static test passes and frontend build succeeds.

- [ ] **Step 7: Commit if Git is available**

```powershell
git add frontend/src/views/source-collection/supply-management/Index.vue backend/scripts/sourceManagementSplit.test.mjs
git commit -m "feat: add supply source management page"
```

---

### Task 6: Verify Product Collection Behavior Remains Unchanged

**Files:**
- Test: `backend/scripts/sourceManagementSplit.test.mjs`
- Existing: `frontend/src/views/source-collection/Index.vue`

- [ ] **Step 1: Run source collection static guard**

Run:

```powershell
node backend/scripts/sourceManagementSplit.test.mjs
```

Expected: PASS and confirms:

```text
createProductSupplyItem
alibabaAPI.searchSimilar
alibabaAPI.searchByImage
```

remain in `frontend/src/views/source-collection/Index.vue`.

- [ ] **Step 2: Run existing product-library source tests**

Run:

```powershell
node backend/scripts/productLibrarySourceBinding.test.mjs
node backend/scripts/productLibrarySourceParsing.test.mjs
node backend/scripts/productLibraryListActions.test.mjs
node backend/scripts/productLibraryDialogLatency.test.mjs
```

Expected: all pass. These protect prior product-library source binding work.

- [ ] **Step 3: Run full builds**

Run:

```powershell
cd backend; npm run build
cd ../frontend; npm run build
```

Expected: both builds complete without TypeScript or Vite errors.

- [ ] **Step 4: Commit if Git is available**

```powershell
git add backend/scripts/sourceManagementSplit.test.mjs
git commit -m "test: guard source management split behavior"
```

---

### Task 7: Browser Verification

**Files:**
- No code files unless verification exposes a bug.

- [ ] **Step 1: Verify dev servers**

Run:

```powershell
netstat -ano | Select-String -Pattern ':5173|:3000'
```

Expected: backend on `3000`, frontend on `5173`.

If a server is missing:

```powershell
cd backend; npm run dev
cd frontend; npm run dev
```

- [ ] **Step 2: Verify legacy redirect**

Open:

```text
http://localhost:5173/source-collection
```

Expected: the browser lands on:

```text
http://localhost:5173/source-collection/product-collection
```

and the page content is the existing product-card collection page.

- [ ] **Step 3: Verify product collection route**

Open:

```text
http://localhost:5173/source-collection/product-collection
```

Expected:

- Left nav shows `货源采集` expanded.
- `商品采集` is active.
- Existing Ozon product cards load.
- The visible actions still include `搜同类` and `搜同款`.

- [ ] **Step 4: Verify supply management route**

Open:

```text
http://localhost:5173/source-collection/supply-management
```

Expected:

- Left nav shows `货源采集` expanded.
- `货源管理` is active.
- Page header says `货源管理`.
- Search box and `添加货源` button render.
- Existing `SupplySource` rows render or empty state appears.

- [ ] **Step 5: Verify URL add flow**

In `货源管理`, click `添加货源`, paste:

```text
https://detail.1688.com/offer/850153922606.html?offerId=850153922606&hotSaleSkuId=5927015738603&spm=a260k.home2025.recommendpart.2
```

Expected:

- Dialog appears before parsing begins.
- Loading state appears inside the dialog.
- Preview card displays a title, price, supplier when API returns data.
- Clicking confirm saves or updates the existing `alibabaOfferId`.
- Running the same link twice does not create duplicate rows.

- [ ] **Step 6: Verify edit/delete**

On an existing source:

- Click edit.
- Change `供应商` to a visible temporary value.
- Confirm and verify the card updates.
- Restore the original supplier value.
- For delete, use a disposable source only. Confirm deletion and verify the list reloads.

- [ ] **Step 7: Check console**

Use browser dev logs for the tested tab.

Expected:

- No new blocking console errors from the source-management change.
- Network calls hit `/api/supply-sources` on the new page.
- Product collection same/similar calls still hit existing `/api/alibaba/...` and product-library create API when used.

- [ ] **Step 8: Commit verification fixes if needed**

If browser verification required code changes, run:

```powershell
cd backend; npm run build
cd ../frontend; npm run build
node backend/scripts/sourceManagementSplit.test.mjs
```

Then commit only if Git is available:

```powershell
git add <changed-files>
git commit -m "fix: polish source management split"
```

---

## Self-Review Checklist

- [ ] Spec coverage: menu split, new page, permissions, legacy compatibility, API split, and no changes to same/similar collection are covered.
- [ ] Placeholder scan: no placeholder markers or vague implementation-only instructions remain.
- [ ] Type consistency: `SupplySource`, `SupplySourcePayload`, and endpoint names match across service, controller, routes, and frontend API.
- [ ] Verification: static tests, backend build, frontend build, and browser checks are all specified.
