# Internal Image Assets for Ozon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove third-party image-host dependency and make the deployed app itself provide public HTTPS product image URLs for Ozon listing.

**Architecture:** Keep the image asset module, but make `local` the only write path. Store uploaded images under a persistent upload root, expose them through `/uploads/images/...`, and resolve relative image paths to `PUBLIC_BASE_URL` before Ozon import/update calls. Preserve read compatibility for old imagehost and legacy local paths until migration is run.

**Tech Stack:** Node.js, Express, TypeScript, Prisma, Vue 3, Element Plus, Nginx, existing script-based tests.

---

## File Map

- Modify `backend/src/services/publicAssetUrlService.ts`: new focused helper for upload paths and public URL resolution.
- Modify `backend/src/controllers/imageController.ts`: remove third-party imagehost write/list/delete branches and write local uploads to persistent `/uploads/images`.
- Modify `backend/src/services/imageAssetService.ts`: stop treating `imagehost` as a selectable write provider; update image reference lookup to local/public URLs.
- Modify `backend/src/services/ozonProductService.ts`: replace `convertProductImagesToImageHost()` behavior with public URL resolution; keep exported compatibility wrapper if needed by controllers.
- Modify `backend/src/controllers/ozonStoreController.ts`: rename imports/calls after service refactor.
- Modify `backend/src/controllers/apiConfigController.ts`: remove `platform === 'image-host'` test branch.
- Modify `frontend/src/views/settings/api-config/Index.vue`: remove “图片托管” tab and config metadata.
- Modify `frontend/src/views/warehouse/material-library/Index.vue`: remove imagehost source option and use local image assets only.
- Modify `frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue`: remove imagehost source option.
- Modify product image picker call sites such as `frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue`: stop passing `image-source="imagehost"`.
- Modify `backend/src/install/installEnvironmentService.ts` and install page API response types if present: add public image URL checks.
- Modify `deploy/nginx/ozon.conf.example`: make `/uploads/` an alias to persistent upload data.
- Add tests under `backend/scripts/` for public URL resolution and imagehost removal.

## Task 1: Public Asset URL Service

**Files:**
- Create: `backend/src/services/publicAssetUrlService.ts`
- Test: `backend/scripts/publicAssetUrlService.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/publicAssetUrlService.test.mjs`:

```js
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

process.env.PUBLIC_BASE_URL = 'https://example.com/app/';
process.env.NODE_ENV = 'production';

const moduleUrl = pathToFileURL(path.resolve('backend/dist/services/publicAssetUrlService.js')).href;
const service = await import(moduleUrl);

assert.equal(
  service.resolvePublicAssetUrl('/uploads/images/a.jpg'),
  'https://example.com/uploads/images/a.jpg',
);
assert.equal(
  service.resolvePublicAssetUrl('/images/old.jpg'),
  'https://example.com/images/old.jpg',
);
assert.equal(
  service.resolvePublicAssetUrl('https://cdn.example.com/x.jpg'),
  'https://cdn.example.com/x.jpg',
);
assert.throws(
  () => service.resolvePublicAssetUrl('/uploads/images/a.jpg', { publicBaseUrl: '' }),
  /PUBLIC_BASE_URL 未配置/,
);
assert.throws(
  () => service.resolvePublicAssetUrl('/uploads/images/a.jpg', { publicBaseUrl: 'http://example.com', requireHttps: true }),
  /HTTPS/,
);

console.log('publicAssetUrlService tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend
npm run build
cd ..
node backend\scripts\publicAssetUrlService.test.mjs
```

Expected: build or import fails because `publicAssetUrlService` does not exist.

- [ ] **Step 3: Create the service**

Create `backend/src/services/publicAssetUrlService.ts`:

```ts
import path from 'path';

const DEFAULT_UPLOAD_ROOT = path.resolve(__dirname, '../../data/uploads');

export type ResolvePublicAssetUrlOptions = {
  publicBaseUrl?: string;
  requireHttps?: boolean;
};

export function getUploadRoot(): string {
  return process.env.UPLOAD_ROOT
    ? path.resolve(process.env.UPLOAD_ROOT)
    : DEFAULT_UPLOAD_ROOT;
}

export function getImageUploadDir(): string {
  return path.join(getUploadRoot(), 'images');
}

export function normalizePublicBaseUrl(value = process.env.PUBLIC_BASE_URL || ''): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    throw new Error('PUBLIC_BASE_URL 未配置，无法生成 Ozon 图片公网地址');
  }
  return trimmed.replace(/\/+$/, '');
}

export function resolvePublicAssetUrl(value: string, options: ResolvePublicAssetUrlOptions = {}): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    if (options.requireHttps && !raw.toLowerCase().startsWith('https://')) {
      throw new Error(`生产环境要求 HTTPS 图片地址：${raw}`);
    }
    return raw;
  }

  const publicBaseUrl = normalizePublicBaseUrl(options.publicBaseUrl);
  if (options.requireHttps && !publicBaseUrl.toLowerCase().startsWith('https://')) {
    throw new Error('生产环境要求 PUBLIC_BASE_URL 使用 HTTPS');
  }

  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
  return `${publicBaseUrl}${normalizedPath}`;
}

export function isManagedImagePath(value: string): boolean {
  return /^\/(uploads\/images|images|assets\/images\/product-images)\//.test(String(value || '').trim());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
cd backend
npm run build
cd ..
node backend\scripts\publicAssetUrlService.test.mjs
```

Expected: `publicAssetUrlService tests passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/publicAssetUrlService.ts backend/scripts/publicAssetUrlService.test.mjs
git commit -m "feat: add public asset URL resolution"
```

## Task 2: Local Image Upload Path

**Files:**
- Modify: `backend/src/controllers/imageController.ts`
- Test: `backend/scripts/imageControllerNoImageHost.test.mjs`

- [ ] **Step 1: Write static regression test**

Create `backend/scripts/imageControllerNoImageHost.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const controller = fs.readFileSync('backend/src/controllers/imageController.ts', 'utf8');

assert.doesNotMatch(controller, /DEFAULT_IMAGE_HOST_URL/, 'image controller should not keep a default third-party image host');
assert.doesNotMatch(controller, /axios\.post\(`\$\{baseUrl\}upload`/, 'image upload should not call imagehost upload API');
assert.doesNotMatch(controller, /axios\.delete\(`\$\{baseUrl\}images/, 'image delete should not call imagehost delete API');
assert.match(controller, /getImageUploadDir\(\)/, 'local uploads should use persistent upload directory helper');
assert.match(controller, /fileUrl:\s*`\/uploads\/images\/\$\{fileName\}`/, 'local uploads should store /uploads/images URLs');

console.log('imageControllerNoImageHost test passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node backend\scripts\imageControllerNoImageHost.test.mjs
```

Expected: FAIL because imagehost constants and upload calls still exist.

- [ ] **Step 3: Refactor imageController**

In `backend/src/controllers/imageController.ts`:

- Remove `axios`, `FormData`, `Readable`, token cache, `DEFAULT_IMAGE_HOST_URL`, and `getImageHostConfig`.
- Import:

```ts
import { getImageUploadDir } from '../services/publicAssetUrlService';
```

- Replace:

```ts
const UPLOAD_DIR = path.join(WORKSPACE_ROOT, 'frontend', 'public', 'images');
```

with:

```ts
const UPLOAD_DIR = getImageUploadDir();
```

- In `getImages`, ignore `source=imagehost` and query `provider: 'local'` unless reading old records is explicitly requested by an admin migration endpoint.
- In `uploadImage`, reject imagehost source:

```ts
if (source === 'imagehost') {
  return res.status(410).json({
    success: false,
    message: '第三方图床已移除，请使用系统内置图片库',
  });
}
```

- In local upload create data, change:

```ts
fileUrl: `/images/${fileName}`,
```

to:

```ts
fileUrl: `/uploads/images/${fileName}`,
```

- In delete and batch delete, only delete files when `image.provider === 'local'` and the path starts with `/uploads/images/` or legacy `/images/`.

- [ ] **Step 4: Run backend tests**

Run:

```powershell
node backend\scripts\imageControllerNoImageHost.test.mjs
cd backend
npm run build
```

Expected: static test passes and TypeScript builds.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/imageController.ts backend/scripts/imageControllerNoImageHost.test.mjs
git commit -m "refactor: use internal image uploads"
```

## Task 3: Ozon Image Resolution

**Files:**
- Modify: `backend/src/services/ozonProductService.ts`
- Modify: `backend/src/controllers/ozonStoreController.ts`
- Test: `backend/scripts/ozonProductImageResolution.test.mjs`

- [ ] **Step 1: Write regression test**

Create `backend/scripts/ozonProductImageResolution.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync('backend/src/services/ozonProductService.ts', 'utf8');
const controller = fs.readFileSync('backend/src/controllers/ozonStoreController.ts', 'utf8');

assert.doesNotMatch(service, /uploadLocalImageToImageHost/, 'Ozon service should not upload local images to imagehost');
assert.doesNotMatch(service, /getImageHostConfig/, 'Ozon service should not require imagehost config');
assert.match(service, /resolveProductImagesForOzon/, 'Ozon service should expose public image URL resolver');
assert.match(service, /resolvePublicAssetUrl/, 'Ozon service should use public asset URL resolver');
assert.doesNotMatch(controller, /convertProductImagesToImageHost/, 'Ozon controller should not call imagehost conversion');

console.log('ozonProductImageResolution test passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node backend\scripts\ozonProductImageResolution.test.mjs
```

Expected: FAIL because current service still has imagehost upload logic.

- [ ] **Step 3: Refactor Ozon image functions**

In `backend/src/services/ozonProductService.ts`:

- Remove imports that are only needed by imagehost upload: `FormData`, `Readable`, imagehost config helper if present.
- Import:

```ts
import { isManagedImagePath, resolvePublicAssetUrl } from './publicAssetUrlService';
```

- Replace `uploadLocalImageToImageHost()` with no-op removal.
- Replace `buildOzonImageUrls()` body with:

```ts
async function buildOzonImageUrls(productData: any): Promise<string[]> {
  const rawImages = [
    productData.imageUrl,
    ...(Array.isArray(productData.images) ? productData.images : []),
  ];
  const normalizedUrls = rawImages.map(normalizeOzonImageUrlForImport).filter(Boolean);
  const requireHttps = process.env.NODE_ENV === 'production';

  const urls = normalizedUrls.map(url => {
    if (/^https?:\/\//i.test(url)) {
      return resolvePublicAssetUrl(url, { requireHttps });
    }
    if (isManagedImagePath(url)) {
      return resolvePublicAssetUrl(url, { requireHttps });
    }
    throw new Error(`商品图片必须是系统可管理路径或公网地址，当前图片地址无效：${url}`);
  });

  return Array.from(new Set(urls));
}
```

- Rename exported function:

```ts
export async function resolveProductImagesForOzon(productData: any): Promise<{ imageUrls: string[]; imageIds: number[] }> {
  const imageUrls = await buildOzonImageUrls(productData);
  const imageIds = await getProductImageIdsByUrls(Number(productData.userId), imageUrls);
  return { imageUrls, imageIds };
}
```

- Keep a compatibility export during transition:

```ts
export const convertProductImagesToImageHost = resolveProductImagesForOzon;
```

Only keep the compatibility export until all controller imports are renamed.

- In `backend/src/controllers/ozonStoreController.ts`, replace imports and calls with `resolveProductImagesForOzon`.

- [ ] **Step 4: Run tests and build**

Run:

```powershell
node backend\scripts\ozonProductImageResolution.test.mjs
node backend\scripts\ozonProductService.importPayload.test.mjs
node backend\scripts\ozonProductService.fbsPayload.test.mjs
cd backend
npm run build
```

Expected: all listed tests pass and TypeScript builds.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/ozonProductService.ts backend/src/controllers/ozonStoreController.ts backend/scripts/ozonProductImageResolution.test.mjs
git commit -m "refactor: resolve Ozon product images from public site URLs"
```

## Task 4: Remove Image Host API Config UI

**Files:**
- Modify: `backend/src/controllers/apiConfigController.ts`
- Modify: `frontend/src/views/settings/api-config/Index.vue`
- Test: `backend/scripts/imageHostApiConfigRemoval.test.mjs`

- [ ] **Step 1: Write static test**

Create `backend/scripts/imageHostApiConfigRemoval.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const apiController = fs.readFileSync('backend/src/controllers/apiConfigController.ts', 'utf8');
const apiPage = fs.readFileSync('frontend/src/views/settings/api-config/Index.vue', 'utf8');

assert.doesNotMatch(apiController, /platform === 'image-host'/, 'backend should not test image-host API config');
assert.doesNotMatch(apiPage, /name="image-host"/, 'API config page should not show image-host tab');
assert.doesNotMatch(apiPage, /图片托管/, 'API config page should not show image hosting text');

console.log('imageHostApiConfigRemoval test passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node backend\scripts\imageHostApiConfigRemoval.test.mjs
```

Expected: FAIL because UI and backend still reference image-host.

- [ ] **Step 3: Remove backend test branch**

In `backend/src/controllers/apiConfigController.ts`, delete the `else if (platform === 'image-host')` branch entirely.

- [ ] **Step 4: Remove frontend tab and config metadata**

In `frontend/src/views/settings/api-config/Index.vue`:

- Delete the `<el-tab-pane name="image-host">...</el-tab-pane>` block.
- Delete `platformConfigs['image-host']`.
- Remove any image-host-specific edit/test state assumptions if they exist.

- [ ] **Step 5: Verify**

Run:

```powershell
node backend\scripts\imageHostApiConfigRemoval.test.mjs
cd backend
npm run build
cd ..\frontend
npm run build
```

Expected: test passes and both builds pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/apiConfigController.ts frontend/src/views/settings/api-config/Index.vue backend/scripts/imageHostApiConfigRemoval.test.mjs
git commit -m "refactor: remove image host API configuration"
```

## Task 5: Frontend Material Library Source Cleanup

**Files:**
- Modify: `frontend/src/views/warehouse/material-library/Index.vue`
- Modify: `frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue`
- Modify: product image picker call sites
- Test: `backend/scripts/frontendImageHostRemoval.test.mjs`

- [ ] **Step 1: Write static test**

Create `backend/scripts/frontendImageHostRemoval.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'frontend/src/views/warehouse/material-library/Index.vue',
  'frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue',
  'frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue',
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(content, /imagehost/, `${file} should not expose imagehost source`);
  assert.doesNotMatch(content, /图床/, `${file} should not show imagehost wording`);
}

console.log('frontendImageHostRemoval test passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node backend\scripts\frontendImageHostRemoval.test.mjs
```

Expected: FAIL because imagehost is still exposed.

- [ ] **Step 3: Remove source switching**

In material library and picker components:

- Remove `imagehost` option values.
- Use local image list API only.
- Keep `bizType=product` filtering for product pickers.
- Change user-facing labels from “图床” to “图片库” or “素材库”.

- [ ] **Step 4: Verify frontend**

Run:

```powershell
node backend\scripts\frontendImageHostRemoval.test.mjs
cd frontend
npm run build
```

Expected: test passes and frontend builds.

- [ ] **Step 5: Browser verification**

Open:

```text
http://localhost:5173/settings/api-config
http://localhost:5173/warehouse/material-library
http://localhost:5173/warehouse/product-library
```

Expected:

- API config page has no “图片托管”.
- Material library has no imagehost/source switch.
- Product image picker opens and lists system images.
- No new blocking console errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/warehouse/material-library frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue backend/scripts/frontendImageHostRemoval.test.mjs
git commit -m "refactor: remove imagehost from frontend image flows"
```

## Task 6: Install and Deployment Checks

**Files:**
- Modify: `backend/src/install/installEnvironmentService.ts`
- Modify: `frontend/src/views/install/Index.vue`
- Modify: `deploy/nginx/ozon.conf.example`
- Modify: `.env.example` if present, otherwise deployment docs
- Test: `backend/scripts/installPublicImageCheck.test.mjs`

- [ ] **Step 1: Write static test**

Create `backend/scripts/installPublicImageCheck.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const installService = fs.readFileSync('backend/src/install/installEnvironmentService.ts', 'utf8');
const nginx = fs.readFileSync('deploy/nginx/ozon.conf.example', 'utf8');

assert.match(installService, /PUBLIC_BASE_URL/, 'install checks should validate PUBLIC_BASE_URL');
assert.match(installService, /uploads\/images/, 'install checks should validate public upload images');
assert.match(nginx, /location \/uploads\//, 'nginx config should expose uploads');
assert.match(nginx, /alias .*uploads/, 'nginx config should use alias for persistent uploads');

console.log('installPublicImageCheck test passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node backend\scripts\installPublicImageCheck.test.mjs
```

Expected: FAIL because install checks do not validate public image access yet.

- [ ] **Step 3: Add backend install check**

In `backend/src/install/installEnvironmentService.ts`, add a check that:

- Reads `PUBLIC_BASE_URL`.
- Writes a small test file under `getImageUploadDir()`.
- Requests `${PUBLIC_BASE_URL}/uploads/images/<test-file>`.
- Returns failure when response is not 200 or content type is not image-compatible.

Use Node `fetch` if the project already targets a Node version with global fetch; otherwise use existing HTTP client style used in install service.

- [ ] **Step 4: Update Nginx example**

Change `deploy/nginx/ozon.conf.example`:

```nginx
location /uploads/ {
    alias /opt/ozon/data/uploads/;
    access_log off;
    expires 30d;
}
```

Keep `/images/` and `/assets/images/product-images/` only as legacy compatibility if current data still needs them.

- [ ] **Step 5: Verify**

Run:

```powershell
node backend\scripts\installPublicImageCheck.test.mjs
cd backend
npm run build
```

Expected: test passes and backend builds.

- [ ] **Step 6: Commit**

```bash
git add backend/src/install/installEnvironmentService.ts frontend/src/views/install/Index.vue deploy/nginx/ozon.conf.example backend/scripts/installPublicImageCheck.test.mjs
git commit -m "feat: validate public image access during install"
```

## Task 7: End-to-End Verification

**Files:**
- No new source files unless fixing failures.

- [ ] **Step 1: Run backend regression tests**

Run:

```powershell
node backend\scripts\publicAssetUrlService.test.mjs
node backend\scripts\imageControllerNoImageHost.test.mjs
node backend\scripts\ozonProductImageResolution.test.mjs
node backend\scripts\imageHostApiConfigRemoval.test.mjs
node backend\scripts\frontendImageHostRemoval.test.mjs
node backend\scripts\installPublicImageCheck.test.mjs
node backend\scripts\ozonProductService.importPayload.test.mjs
node backend\scripts\ozonProductService.fbsPayload.test.mjs
```

Expected: all scripts print their pass messages.

- [ ] **Step 2: Run builds**

Run:

```powershell
cd backend
npm run build
cd ..\frontend
npm run build
```

Expected: both builds complete successfully.

- [ ] **Step 3: Browser test**

Start the existing dev servers and verify:

```text
http://localhost:5173/settings/api-config
http://localhost:5173/warehouse/material-library
http://localhost:5173/warehouse/product-library
```

Expected:

- No image-host config tab.
- Upload image stores `/uploads/images/...`.
- Product picker selects a product image.
- Product listing precheck accepts selected image.
- No new blocking console errors.

- [ ] **Step 4: Commit final fixes**

```bash
git status --short
git add <changed-files>
git commit -m "test: verify internal image asset flow"
```

## Self-Review

- Spec coverage: third-party image host removal is covered by Tasks 2, 4, and 5. Public URL generation and Ozon import/update usage are covered by Tasks 1 and 3. Deployment validation is covered by Task 6. Regression and browser verification are covered by Task 7.
- Placeholder scan: no TODO/TBD placeholders remain; each task has exact files, commands, and expected outputs.
- Type consistency: public URL helper names are consistent across tasks: `getImageUploadDir`, `resolvePublicAssetUrl`, `isManagedImagePath`, `resolveProductImagesForOzon`.
