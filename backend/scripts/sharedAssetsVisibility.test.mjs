import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const storeContext = read('backend/src/services/ozonStoreContextService.ts');
const apiConfigController = read('backend/src/controllers/apiConfigController.ts');
const alibabaService = read('backend/src/services/alibabaService.ts');
const imageController = read('backend/src/controllers/imageController.ts');
const productSupplyController = read('backend/src/controllers/productSupplyController.ts');
const productSelectionController = read('backend/src/controllers/productSelectionController.ts');
const supplySourceService = read('backend/src/services/supplySourceService.ts');
const dashboardService = read('backend/src/services/dashboardService.ts');
const pricingController = read('backend/src/controllers/pricingController.ts');
const imageAssetService = read('backend/src/services/imageAssetService.ts');
const ozonProductService = read('backend/src/services/ozonProductService.ts');
const autoReplyController = read('backend/src/controllers/autoReplyController.ts');
const paymentRecordController = read('backend/src/controllers/paymentRecordController.ts');

assert.doesNotMatch(
  storeContext,
  /prisma\.ozonStore\.findFirst\(\{[\s\S]{0,180}where:\s*\{[\s\S]{0,80}userId/,
  'Ozon store context should resolve stores globally, not only stores owned by the current user',
);

assert.doesNotMatch(
  apiConfigController,
  /prisma\.apiConfig\.(?:findMany|findFirst)\(\{[\s\S]{0,180}where:\s*\{[\s\S]{0,80}userId/,
  'API config reads should be shared across users',
);
assert.match(
  apiConfigController,
  /new Map<string,\s*\(typeof records\)\[number\]>/,
  'Shared API config list should collapse historical per-user duplicates by platform',
);

assert.doesNotMatch(
  alibabaService,
  /where:\s*\{\s*userId,\s*platform:\s*PLATFORM\s*\}/,
  '1688 API config and token reads should be shared across users',
);

assert.match(
  imageController,
  /const imageWhere = \{[\s\S]{0,180}provider:\s*'local' as const/,
  'Image list should still filter local provider',
);
assert.doesNotMatch(
  imageController,
  /const imageWhere = \{[\s\S]{0,160}userId/,
  'Image list and stats should not be scoped to current user',
);

assert.doesNotMatch(
  productSupplyController,
  /const where:\s*any\s*=\s*\{\s*userId\s*\}/,
  'Product supply list should not be scoped to current user',
);
assert.doesNotMatch(
  productSupplyController,
  /where:\s*\{\s*id:\s*Number\(id\),\s*userId\s*\}/,
  'Product supply detail/actions should not hide shared products from other users',
);
assert.match(
  productSupplyController,
  /select:\s*\{\s*id:\s*true\s*\}[\s\S]{0,120}orderBy:\s*\{\s*createdAt:\s*'desc'\s*\}/,
  'Product supply list should page on lightweight ids before loading large product rows',
);

assert.doesNotMatch(
  productSelectionController,
  /const where:\s*any\s*=\s*\{\s*userId\s*\}/,
  'Product selection list should not be scoped to current user',
);
assert.doesNotMatch(
  productSelectionController,
  /where:\s*\{\s*id:\s*Number\(id\),\s*userId\s*\}/,
  'Product selection detail/actions should not hide shared selections from other users',
);

assert.doesNotMatch(
  supplySourceService,
  /const where:\s*any\s*=\s*\{\s*userId\s*\}/,
  'Supply source list should not be scoped to current user',
);

assert.doesNotMatch(
  dashboardService,
  /where:\s*\{\s*userId\s*\}/,
  'Dashboard shared asset statistics should not be scoped to current user',
);

assert.doesNotMatch(
  pricingController,
  /prisma\.pricingStrategy\.(?:findMany|findFirst|findUnique|update|delete)\(\{[\s\S]{0,220}where:\s*\{[\s\S]{0,120}userId/,
  'Pricing strategies are business configuration and should be shared across users',
);

assert.doesNotMatch(
  imageAssetService,
  /db\.image\.findMany\(\{[\s\S]{0,180}where:\s*\{[\s\S]{0,120}userId/,
  'Product image lookup should use the shared image library, not only images uploaded by the current user',
);
assert.doesNotMatch(
  imageAssetService,
  /db\.productSupply\.findMany\(\{[\s\S]{0,120}where:\s*\{\s*userId/,
  'Product image reference sync should cover shared product supplies',
);

assert.doesNotMatch(
  ozonProductService,
  /prisma\.image\.findMany\(\{[\s\S]{0,180}where:\s*\{[\s\S]{0,120}userId/,
  'Ozon product image resolution should use the shared image library',
);

assert.doesNotMatch(
  autoReplyController,
  /prisma\.autoReplyRule\.(?:findMany|findFirst|update|delete)\(\{[\s\S]{0,220}where:\s*\{[\s\S]{0,140}userId/,
  'Auto reply rules are shared customer-service assets and should not be hidden by creator userId',
);
assert.match(
  autoReplyController,
  /data:\s*\{[\s\S]{0,80}userId/,
  'Auto reply creation should still retain the creating user for audit/history',
);

assert.match(
  paymentRecordController,
  /ADMIN_ROLE_CODES[\s\S]{0,120}super_admin/,
  'Payment record permissions should recognize the project super_admin role code',
);
assert.doesNotMatch(
  paymentRecordController,
  /currentUserRole\s*!==\s*'admin'/,
  'Payment record permission checks should not hard-code only the legacy admin role code',
);

console.log('sharedAssetsVisibility.test passed');
