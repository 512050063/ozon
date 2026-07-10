# Image Asset Typing And Usage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immutable image business typing, unified usage references, delete protection, and business-specific filtering so avatar images and product images are fully isolated and manageable.

**Architecture:** Extend the existing `Image` asset model with `bizType` and `provider`, then introduce a dedicated `ImageReference` table to represent active bindings. Backend controllers and services own reference maintenance and delete protection; frontend modules consume typed image lists and never infer business usage themselves.

**Tech Stack:** Express + TypeScript + Prisma + MySQL backend, Vue 3 + Element Plus frontend, ts-node assertion tests, Vite build verification.

---

## File Map

- `backend/prisma/schema.prisma`: add image enums/fields and the `ImageReference` model.
- `backend/src/services/imageAssetService.ts`: centralize image typing validation, reference upsert/delete, usage queries, and delete guard logic.
- `backend/src/controllers/imageController.ts`: accept `bizType` on upload/list queries, persist imagehost uploads locally, return `isUsed`, and enforce delete restrictions through the service.
- `backend/src/controllers/authController.ts`: mark avatar uploads as `avatar`, maintain the single active `user_avatar` reference, and enforce avatar-history deletion rules.
- `backend/src/controllers/collectionController.ts`: maintain product image references for collection items and product-item conversion flows.
- `backend/src/controllers/productSupplyController.ts`: maintain product image references for product library create/update flows that currently store `imageUrl` and `images` JSON.
- `backend/src/routes/imageRoutes.ts`: no new route required, but upload/list/delete contract changes are consumed here.
- `backend/src/scripts/imageAssetService.test.ts`: assertion tests for typing, references, deletion rules, and normalization helpers.
- `backend/src/scripts/backfillImageAssets.ts`: one-off migration script to backfill `bizType` and `ImageReference` from existing data.
- `frontend/src/api/imageAPI.ts`: add `bizType`, `usedStatus`, and typed response fields; upload calls pass `bizType`.
- `frontend/src/api/authAPI.ts`: no route changes, but avatar-related response typing may need updating.
- `frontend/src/store/authStore.ts`: consume richer avatar payloads and keep local user state aligned after avatar/history changes.
- `frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue`: add `bizType` filtering and pass the selected business type into uploads.
- `frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue`: request only `product` images from the picker.
- `frontend/src/views/ozon/product-management/components/ProductEditDrawer.vue`: request only `product` images from the picker.
- `frontend/src/views/settings/account-info/components/AvatarEditor.vue`: show only current-user avatar assets, keep current avatar undeletable, and render empty history slots as `无`.
- `frontend/src/views/warehouse/material-library/index.vue`: expose type/status filtering and render `使用中` state from backend data.

## Tasks

### Task 1: Define Prisma Model Changes

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Test: `backend/src/scripts/imageAssetService.test.ts`

- [ ] **Step 1: Write the failing model-shape test**

```ts
import assert from 'assert';
import fs from 'fs';
import path from 'path';

const schema = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8');

assert(schema.includes('enum ImageBizType'));
assert(schema.includes('enum ImageProvider'));
assert(schema.includes('model ImageReference'));
assert(schema.includes('bizType        ImageBizType'));
assert(schema.includes('provider       ImageProvider'));

console.log('schema model shape check passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: FAIL with missing `ImageBizType` / `ImageReference`

- [ ] **Step 3: Add Prisma fields and model**

```prisma
enum ImageBizType {
  avatar
  product
}

enum ImageProvider {
  local
  imagehost
}

model Image {
  id              Int                   @id @default(autoincrement())
  userId          Int
  fileName        String
  fileUrl         String                @db.Text
  fileSize        Int
  fileType        String
  width           Int?
  height          Int?
  thumbnailUrl    String?               @db.Text
  bizType         ImageBizType
  provider        ImageProvider         @default(local)
  isDeleted       Boolean               @default(false)
  deletedAt       DateTime?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
  user            User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  collectionItems CollectionItemImage[]
  productItems    ProductItemImage[]
  references      ImageReference[]

  @@index([userId, bizType, provider])
  @@index([isDeleted])
  @@map("images")
}

model ImageReference {
  id        Int      @id @default(autoincrement())
  imageId    Int
  userId     Int
  refType    String   @db.VarChar(50)
  refId      Int
  refKey     String?  @db.VarChar(100)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  image      Image    @relation(fields: [imageId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([imageId])
  @@index([userId, refType])
  @@unique([imageId, refType, refId, refKey])
  @@map("image_references")
}
```

- [ ] **Step 4: Add reverse relation on `User`**

```prisma
model User {
  id              Int              @id @default(autoincrement())
  // ...
  images          Image[]
  imageReferences ImageReference[]
  syncLogs        SyncLog[]
}
```

- [ ] **Step 5: Run Prisma generation and the test**

Run: `npm run db:generate`  
Expected: Prisma client generated successfully

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: PASS for schema shape check

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/src/scripts/imageAssetService.test.ts
git commit -m "feat: add image asset typing schema"
```

### Task 2: Build Image Asset Service Helpers

**Files:**
- Create: `backend/src/services/imageAssetService.ts`
- Modify: `backend/src/scripts/imageAssetService.test.ts`

- [ ] **Step 1: Extend the failing service test**

```ts
import {
  IMAGE_BIZ_TYPES,
  IMAGE_PROVIDERS,
  assertImageBizType,
  buildImageUsageSummary,
  dedupeImageUrls,
  normalizeRefKey,
} from '../services/imageAssetService';

assert.deepEqual(IMAGE_BIZ_TYPES, ['avatar', 'product']);
assert.deepEqual(IMAGE_PROVIDERS, ['local', 'imagehost']);
assert.equal(assertImageBizType('avatar'), 'avatar');
assert.throws(() => assertImageBizType('other'));
assert.deepEqual(dedupeImageUrls(['a', ' ', 'a', 'b']), ['a', 'b']);
assert.equal(normalizeRefKey(undefined), null);
assert.equal(normalizeRefKey(' main '), 'main');
assert.deepEqual(
  buildImageUsageSummary([
    { refType: 'user_avatar' },
    { refType: 'product_supply_gallery' },
    { refType: 'product_supply_gallery' },
  ] as any),
  {
    isUsed: true,
    usedRefCount: 3,
    usedRefTypes: ['product_supply_gallery', 'user_avatar'],
  },
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: FAIL with `Cannot find module '../services/imageAssetService'`

- [ ] **Step 3: Implement the helper service**

```ts
import prisma from '../config/database';

export const IMAGE_BIZ_TYPES = ['avatar', 'product'] as const;
export const IMAGE_PROVIDERS = ['local', 'imagehost'] as const;

export type ImageBizTypeValue = typeof IMAGE_BIZ_TYPES[number];
export type ImageProviderValue = typeof IMAGE_PROVIDERS[number];

export const assertImageBizType = (value: unknown): ImageBizTypeValue => {
  if (typeof value !== 'string' || !IMAGE_BIZ_TYPES.includes(value as ImageBizTypeValue)) {
    throw new Error('非法图片业务类型');
  }
  return value as ImageBizTypeValue;
};

export const assertImageProvider = (value: unknown): ImageProviderValue => {
  if (typeof value !== 'string' || !IMAGE_PROVIDERS.includes(value as ImageProviderValue)) {
    throw new Error('非法图片来源');
  }
  return value as ImageProviderValue;
};

export const dedupeImageUrls = (urls: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      urls
        .filter((url): url is string => typeof url === 'string')
        .map(url => url.trim())
        .filter(Boolean),
    ),
  );

export const normalizeRefKey = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const buildImageUsageSummary = (references: Array<{ refType: string }>) => {
  const usedRefTypes = Array.from(new Set(references.map(item => item.refType))).sort();
  return {
    isUsed: references.length > 0,
    usedRefCount: references.length,
    usedRefTypes,
  };
};

export const replaceImageReferences = async (params: {
  userId: number;
  refType: string;
  refId: number;
  imageIds: number[];
  keyBuilder?: (imageId: number, index: number) => string | null;
}) => {
  const { userId, refType, refId, imageIds, keyBuilder } = params;

  await prisma.imageReference.deleteMany({
    where: { userId, refType, refId },
  });

  if (imageIds.length === 0) return;

  await prisma.imageReference.createMany({
    data: imageIds.map((imageId, index) => ({
      userId,
      imageId,
      refType,
      refId,
      refKey: keyBuilder ? keyBuilder(imageId, index) : null,
    })),
    skipDuplicates: true,
  });
};
```

- [ ] **Step 4: Re-run the test**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: PASS for helper checks

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/imageAssetService.ts backend/src/scripts/imageAssetService.test.ts
git commit -m "feat: add image asset service helpers"
```

### Task 3: Add Typed Upload/List/Delete Backend Logic

**Files:**
- Modify: `backend/src/controllers/imageController.ts`
- Modify: `backend/src/routes/imageRoutes.ts`
- Modify: `backend/src/scripts/imageAssetService.test.ts`

- [ ] **Step 1: Add a failing controller-contract test**

```ts
import fs from 'fs';
import path from 'path';

const imageControllerSource = fs.readFileSync(
  path.join(__dirname, '../src/controllers/imageController.ts'),
  'utf8',
);

assert(imageControllerSource.includes('assertImageBizType'));
assert(imageControllerSource.includes('bizType'));
assert(imageControllerSource.includes('provider'));
assert(imageControllerSource.includes('usedRefCount'));
assert(imageControllerSource.includes('usedRefTypes'));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: FAIL because `imageController.ts` does not yet include typed asset logic

- [ ] **Step 3: Update image list params and local query behavior**

```ts
const { page = 1, pageSize = 20, source = 'local', bizType, usedStatus } = req.query;

const where: any = {
  userId,
  isDeleted: false,
};

if (bizType) {
  where.bizType = assertImageBizType(bizType);
}

const images = await prisma.image.findMany({
  where,
  orderBy: { id: 'desc' },
  skip,
  take,
  include: {
    references: {
      select: {
        refType: true,
      },
    },
  },
});

const imagesWithUsage = images
  .map(image => {
    const usage = buildImageUsageSummary(image.references);
    return {
      ...image,
      ...usage,
    };
  })
  .filter(image => {
    if (usedStatus === 'used') return image.isUsed;
    if (usedStatus === 'unused') return !image.isUsed;
    return true;
  });
```

- [ ] **Step 4: Persist imagehost uploads locally and validate upload type**

```ts
const source = assertImageProvider(req.query.source || 'local');
const bizType = assertImageBizType(req.body.bizType);

const imageRecord = await prisma.image.create({
  data: {
    userId,
    fileName,
    fileUrl,
    fileSize,
    fileType,
    width,
    height,
    thumbnailUrl,
    bizType,
    provider: source,
  },
});
```

- [ ] **Step 5: Replace delete usage checks with `ImageReference` guard**

```ts
const image = await prisma.image.findFirst({
  where: {
    id: Number(id),
    userId,
    isDeleted: false,
  },
  include: {
    references: {
      select: {
        refType: true,
      },
    },
  },
});

const usage = buildImageUsageSummary(image.references);
if (usage.isUsed) {
  return res.status(409).json({
    success: false,
    message: '图片正在使用，禁止删除',
    data: usage,
  });
}
```

- [ ] **Step 6: Re-run the test**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: PASS for controller-contract assertions

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/imageController.ts backend/src/routes/imageRoutes.ts backend/src/scripts/imageAssetService.test.ts
git commit -m "feat: type image uploads and usage responses"
```

### Task 4: Maintain Avatar References

**Files:**
- Modify: `backend/src/controllers/authController.ts`
- Modify: `backend/src/scripts/imageAssetService.test.ts`

- [ ] **Step 1: Add a failing avatar-reference test**

```ts
const authControllerSource = fs.readFileSync(
  path.join(__dirname, '../src/controllers/authController.ts'),
  'utf8',
);

assert(authControllerSource.includes("bizType: 'avatar'"));
assert(authControllerSource.includes("provider: 'local'"));
assert(authControllerSource.includes("refType: 'user_avatar'"));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: FAIL because avatar upload does not yet write typed references

- [ ] **Step 3: Mark avatar uploads and maintain the single active avatar reference**

```ts
const imageRecord = await prisma.image.create({
  data: {
    userId,
    fileName: originalFilename,
    fileUrl: avatarUrl,
    fileSize: req.file.size,
    fileType: req.file.mimetype,
    bizType: 'avatar',
    provider: 'local',
  },
});

await prisma.imageReference.deleteMany({
  where: {
    userId,
    refType: 'user_avatar',
  },
});

await prisma.imageReference.create({
  data: {
    userId,
    imageId: imageRecord.id,
    refType: 'user_avatar',
    refId: userId,
    refKey: 'current',
  },
});
```

- [ ] **Step 4: Update profile avatar switching to keep reference state aligned**

```ts
if (avatar !== undefined) {
  const image = await prisma.image.findFirst({
    where: {
      userId,
      fileUrl: avatar,
      bizType: 'avatar',
      isDeleted: false,
    },
  });

  if (!image) {
    return res.status(400).json({
      success: false,
      message: '只能选择当前用户自己的头像图片',
    });
  }

  await prisma.imageReference.deleteMany({
    where: { userId, refType: 'user_avatar' },
  });

  await prisma.imageReference.create({
    data: {
      userId,
      imageId: image.id,
      refType: 'user_avatar',
      refId: userId,
      refKey: 'current',
    },
  });
}
```

- [ ] **Step 5: Keep history deletion allowed only for non-current avatars**

```ts
const activeAvatar = await prisma.imageReference.findFirst({
  where: {
    userId,
    refType: 'user_avatar',
  },
  include: { image: true },
});

if (activeAvatar?.image.fileUrl === avatar) {
  return res.status(409).json({
    success: false,
    message: '当前使用中的头像不可删除',
  });
}
```

- [ ] **Step 6: Re-run the test**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: PASS for avatar reference assertions

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/authController.ts backend/src/scripts/imageAssetService.test.ts
git commit -m "feat: track active avatar image references"
```

### Task 5: Maintain Product References In Collection And Product Supply Flows

**Files:**
- Modify: `backend/src/controllers/collectionController.ts`
- Modify: `backend/src/controllers/productSupplyController.ts`
- Modify: `backend/src/scripts/imageAssetService.test.ts`

- [ ] **Step 1: Add a failing product-reference test**

```ts
const collectionControllerSource = fs.readFileSync(
  path.join(__dirname, '../src/controllers/collectionController.ts'),
  'utf8',
);
const productSupplyControllerSource = fs.readFileSync(
  path.join(__dirname, '../src/controllers/productSupplyController.ts'),
  'utf8',
);

assert(collectionControllerSource.includes('replaceImageReferences'));
assert(productSupplyControllerSource.includes('replaceImageReferences'));
assert(productSupplyControllerSource.includes("bizType: 'product'"));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: FAIL because product flows do not yet maintain typed references

- [ ] **Step 3: Maintain references for collection item create/update**

```ts
await replaceImageReferences({
  userId,
  refType: 'collection_item_gallery',
  refId: item.id,
  imageIds: images,
  keyBuilder: (_imageId, index) => `gallery:${index}`,
});

if (images[0]) {
  await replaceImageReferences({
    userId,
    refType: 'collection_item_main',
    refId: item.id,
    imageIds: [images[0]],
    keyBuilder: () => 'main',
  });
}
```

- [ ] **Step 4: Maintain references when collection items are moved into product items**

```ts
await replaceImageReferences({
  userId,
  refType: 'product_item_gallery',
  refId: productItem.id,
  imageIds: item.images.map(img => img.imageId),
  keyBuilder: (_imageId, index) => `gallery:${index}`,
});

if (item.images[0]?.imageId) {
  await replaceImageReferences({
    userId,
    refType: 'product_item_main',
    refId: productItem.id,
    imageIds: [item.images[0].imageId],
    keyBuilder: () => 'main',
  });
}
```

- [ ] **Step 5: Normalize and maintain references for `ProductSupply` create/update**

```ts
const resolveProductImageIds = async (userId: number, imageUrls: string[]) => {
  const records = await prisma.image.findMany({
    where: {
      userId,
      bizType: 'product',
      isDeleted: false,
      fileUrl: { in: imageUrls },
    },
    select: { id: true, fileUrl: true },
  });

  return imageUrls
    .map(url => records.find(record => record.fileUrl === url)?.id)
    .filter((id): id is number => typeof id === 'number');
};

const normalizedImageUrls = dedupeImageUrls([
  imageUrl,
  ...(Array.isArray(images) ? images : []),
]);
const imageIds = await resolveProductImageIds(userId, normalizedImageUrls);

await replaceImageReferences({
  userId,
  refType: 'product_supply_gallery',
  refId: newItem.id,
  imageIds,
  keyBuilder: (_imageId, index) => `gallery:${index}`,
});

if (imageIds[0]) {
  await replaceImageReferences({
    userId,
    refType: 'product_supply_main',
    refId: newItem.id,
    imageIds: [imageIds[0]],
    keyBuilder: () => 'main',
  });
}
```

- [ ] **Step 6: Re-run the test**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: PASS for product reference assertions

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/collectionController.ts backend/src/controllers/productSupplyController.ts backend/src/scripts/imageAssetService.test.ts
git commit -m "feat: track product image references"
```

### Task 6: Backfill Existing Image Types And References

**Files:**
- Create: `backend/src/scripts/backfillImageAssets.ts`
- Modify: `backend/src/scripts/imageAssetService.test.ts`

- [ ] **Step 1: Add a failing migration-script contract test**

```ts
const backfillSource = fs.readFileSync(
  path.join(__dirname, '../src/scripts/backfillImageAssets.ts'),
  'utf8',
);

assert(backfillSource.includes('collectionItemImage'));
assert(backfillSource.includes('productItemImage'));
assert(backfillSource.includes('avatarHistory'));
assert(backfillSource.includes('user_avatar'));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: FAIL because the backfill script does not exist yet

- [ ] **Step 3: Create the migration script**

```ts
import prisma from '../config/database';

async function main() {
  const avatarUsers = await prisma.user.findMany({
    select: { id: true, avatar: true, avatarHistory: true },
  });

  for (const user of avatarUsers) {
    const avatarUrls = Array.from(
      new Set(
        [user.avatar, ...(Array.isArray(user.avatarHistory) ? user.avatarHistory : [])]
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
      ),
    );

    if (avatarUrls.length > 0) {
      await prisma.image.updateMany({
        where: {
          userId: user.id,
          fileUrl: { in: avatarUrls },
        },
        data: {
          bizType: 'avatar',
        },
      });
    }
  }

  await prisma.image.updateMany({
    where: {
      collectionItems: {
        some: {},
      },
    },
    data: {
      bizType: 'product',
    },
  });

  await prisma.image.updateMany({
    where: {
      productItems: {
        some: {},
      },
    },
    data: {
      bizType: 'product',
    },
  });

  await prisma.imageReference.deleteMany({});

  const collectionLinks = await prisma.collectionItemImage.findMany({
    include: { collectionItem: true },
  });

  await prisma.imageReference.createMany({
    data: collectionLinks.map(link => ({
      userId: link.collectionItem.userId,
      imageId: link.imageId,
      refType: 'collection_item_gallery',
      refId: link.collectionItemId,
      refKey: `gallery:${link.order}`,
    })),
    skipDuplicates: true,
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
```

- [ ] **Step 4: Re-run the test**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Expected: PASS for migration-script contract assertions

- [ ] **Step 5: Commit**

```bash
git add backend/src/scripts/backfillImageAssets.ts backend/src/scripts/imageAssetService.test.ts
git commit -m "chore: add image asset backfill script"
```

### Task 7: Add Frontend Typed Image API

**Files:**
- Modify: `frontend/src/api/imageAPI.ts`

- [ ] **Step 1: Add the missing request/response fields**

```ts
export interface Image {
  id: number | string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  width?: number | null;
  height?: number | null;
  thumbnailUrl?: string | null;
  bizType: 'avatar' | 'product';
  provider: 'local' | 'imagehost';
  isUsed?: boolean;
  usedRefCount?: number;
  usedRefTypes?: string[];
}

export interface ImageListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  source?: 'local' | 'imagehost';
  bizType?: 'avatar' | 'product';
  usedStatus?: 'used' | 'unused';
}
```

- [ ] **Step 2: Update upload API to pass `bizType`**

```ts
export const uploadImage = async (
  file: File,
  source: 'local' | 'imagehost' = 'local',
  bizType: 'avatar' | 'product',
): Promise<ApiResponse<Image>> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bizType', bizType);

  const response = await request.post(`${API_BASE}/upload?source=${source}`, formData);
  if (response.success && response.data) {
    response.data = normalizeImage(response.data);
  }
  return response;
};
```

- [ ] **Step 3: Keep existing callers compiling by updating the function signature usage sites in later tasks**

```ts
// No fallback overload. Every caller must now pass bizType explicitly.
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/imageAPI.ts
git commit -m "feat: add typed image api params"
```

### Task 8: Filter Product Image Pickers

**Files:**
- Modify: `frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue`
- Modify: `frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue`
- Modify: `frontend/src/views/ozon/product-management/components/ProductEditDrawer.vue`

- [ ] **Step 1: Add `bizType` prop to the shared picker**

```ts
interface Props {
  modelValue: boolean;
  maxCount?: number;
  existingImageIds: Array<number | string>;
  imageSource?: ImageListParams['source'];
  bizType: 'avatar' | 'product';
}

const props = withDefaults(defineProps<Props>(), {
  maxCount: 8,
  existingImageIds: () => [],
  imageSource: 'local',
  bizType: 'product',
});
```

- [ ] **Step 2: Pass `bizType` into list fetching and upload**

```ts
const response = await getImages({
  page: page.value,
  pageSize: pageSize.value,
  source: props.imageSource,
  bizType: props.bizType,
});

const response = await uploadImage(item.file, props.imageSource, props.bizType);
```

- [ ] **Step 3: Update product-library picker call site**

```vue
<ImageGalleryPicker
  v-model:modelValue="imagePickerVisible"
  :max-count="8 - imageUrls.length"
  :existing-image-ids="images"
  image-source="imagehost"
  biz-type="product"
  @confirm="handleImagePickerConfirm"
/>
```

- [ ] **Step 4: Update Ozon product-management picker call site**

```vue
<ImageGalleryPicker
  v-model:modelValue="imagePickerVisible"
  :max-count="8 - imageUrls.length"
  :existing-image-ids="images"
  biz-type="product"
  @confirm="handleImagePickerConfirm"
/>
```

- [ ] **Step 5: Run frontend build**

Run: `npm run build`  
Workdir: `frontend`  
Expected: PASS with no TypeScript/Vite errors caused by the new prop/signature

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue frontend/src/views/ozon/product-management/components/ProductEditDrawer.vue
git commit -m "feat: filter product image pickers by business type"
```

### Task 9: Update Avatar History UI To Use Avatar Assets

**Files:**
- Modify: `frontend/src/views/settings/account-info/components/AvatarEditor.vue`
- Modify: `frontend/src/store/authStore.ts`

- [ ] **Step 1: Query and render avatar-typed history slots**

```ts
const historyAvatars = computed(() => {
  const rawHistory = Array.isArray(authStore.user?.avatarHistory) ? authStore.user.avatarHistory : [];
  const unique = rawHistory.filter(
    (avatar, index, list): avatar is string =>
      typeof avatar === 'string' &&
      avatar.trim().length > 0 &&
      list.indexOf(avatar) === index,
  );

  return unique.slice(0, 5);
});

const historyAvatarSlots = computed(() => {
  const avatars = [...historyAvatars.value];
  while (avatars.length < 5) {
    avatars.push(null as unknown as string);
  }
  return avatars;
});
```

- [ ] **Step 2: Keep current avatar undeletable and show empty state as `无`**

```vue
<button
  v-if="avatar && selectedAvatar !== avatar && authStore.user?.avatar !== avatar"
  type="button"
  class="history-avatar-delete"
  :disabled="deletingAvatar === avatar"
  @click.stop="removeHistoryAvatar(avatar)"
>
  ×
</button>

<div v-else class="history-avatar-empty">
  <span class="history-avatar-empty-text">无</span>
</div>
```

- [ ] **Step 3: Keep auth store state aligned after delete/upload**

```ts
if (response.success && response.data) {
  user.value = { ...user.value, ...response.data };
  return true;
}
```

- [ ] **Step 4: Run frontend build**

Run: `npm run build`  
Workdir: `frontend`  
Expected: PASS with no Vue compile errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/settings/account-info/components/AvatarEditor.vue frontend/src/store/authStore.ts
git commit -m "feat: align avatar history with typed avatar assets"
```

### Task 10: Add Material Library Type/Usage Filters

**Files:**
- Modify: `frontend/src/views/warehouse/material-library/index.vue`

- [ ] **Step 1: Add filter state for business type and usage**

```ts
const bizType = ref<'avatar' | 'product' | ''>('');
const usedStatus = ref<'used' | 'unused' | ''>('');
```

- [ ] **Step 2: Send filter params to the backend list API**

```ts
const response = await getImages({
  page: page.value,
  pageSize: pageSize.value,
  source: source.value,
  bizType: bizType.value || undefined,
  usedStatus: usedStatus.value || undefined,
});
```

- [ ] **Step 3: Render state labels from backend data**

```vue
<div class="image-card-badges">
  <el-tag size="small" type="info">{{ image.bizType === 'avatar' ? '头像图' : '商品图' }}</el-tag>
  <el-tag v-if="image.isUsed" size="small" type="danger">使用中</el-tag>
</div>
```

- [ ] **Step 4: Disable delete actions for used images**

```ts
if (image.isUsed) {
  ElMessage.warning('图片正在使用，禁止删除');
  return;
}
```

- [ ] **Step 5: Run frontend build**

Run: `npm run build`  
Workdir: `frontend`  
Expected: PASS with no new material-library errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/warehouse/material-library/index.vue
git commit -m "feat: add image asset filters and usage badges"
```

### Task 11: Full Verification

**Files:**
- Test: `backend/src/scripts/imageAssetService.test.ts`
- Test: `backend/src/scripts/backfillImageAssets.ts`

- [ ] **Step 1: Run backend assertion test**

Run: `npx ts-node src/scripts/imageAssetService.test.ts`  
Workdir: `backend`  
Expected: PASS with `schema model shape check passed` and no assertion failures

- [ ] **Step 2: Run backend build**

Run: `npm run build`  
Workdir: `backend`  
Expected: PASS and TypeScript emit completes

- [ ] **Step 3: Run frontend build**

Run: `npm run build`  
Workdir: `frontend`  
Expected: PASS and Vite production bundle completes

- [ ] **Step 4: Dry-run the migration script against a non-production database**

Run: `npx ts-node src/scripts/backfillImageAssets.ts`  
Workdir: `backend`  
Expected: completes without uncaught exceptions; review printed migration summary if added

- [ ] **Step 5: Record any unrelated failures explicitly**

```text
If any build or test fails for a pre-existing reason, capture the exact command, exact error, and whether it blocks image asset rollout.
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-06-27-image-asset-typing-and-usage.md
git commit -m "docs: add image asset typing implementation plan"
```

## Self-Review

- Spec coverage check:
  - `Image.bizType` / `provider`: covered in Tasks 1, 3, 7
  - `ImageReference`: covered in Tasks 1, 2, 4, 5, 6
  - Avatar isolation: covered in Tasks 4, 9
  - Product picker isolation: covered in Task 8
  - Material library usage and delete protection: covered in Tasks 3, 10
  - Existing data backfill: covered in Task 6
- Placeholder scan:
  - No `TODO` / `TBD`
  - Every code-changing task includes concrete code blocks
- Type consistency:
  - Shared names are consistent across tasks: `bizType`, `provider`, `ImageReference`, `replaceImageReferences`, `usedRefCount`, `usedRefTypes`
