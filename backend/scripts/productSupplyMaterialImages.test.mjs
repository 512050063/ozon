import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');
const service = fs.readFileSync(path.join(root, 'backend/src/services/imageAssetService.ts'), 'utf8');
const imageController = fs.readFileSync(path.join(root, 'backend/src/controllers/imageController.ts'), 'utf8');
const productSupplyController = fs.readFileSync(path.join(root, 'backend/src/controllers/productSupplyController.ts'), 'utf8');

assert.match(
  service,
  /ensureProductImagesForReferences/,
  'image asset service should ensure product image records exist before writing usage references',
);

assert.match(
  service,
  /providerAssetId: buildProductImageProviderAssetId\(url\)/,
  'ensured product images should have deterministic provider asset ids to avoid duplicate material records',
);

assert.match(
  service,
  /refType: "product_supply"/,
  'product supply images should be marked as product_supply references',
);

assert.match(
  service,
  /userId: Number\(product\.userId\)/,
  'product supply image sync should preserve each product owner on usage references',
);

assert.match(
  productSupplyController,
  /replaceProductSupplyImageReferences\(prisma/,
  'product supply create and update should reuse the shared image reference sync logic',
);

assert.match(
  imageController,
  /await syncProductSupplyImageReferences\(prisma\)/,
  'material library list should sync saved product images before reading images',
);

console.log('productSupplyMaterialImages tests passed');
