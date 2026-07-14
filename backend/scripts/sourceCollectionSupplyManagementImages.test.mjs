import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const supplyManagementPath = path.join(
  root,
  'frontend/src/views/source-collection/supply-management/Index.vue',
)
const productCollectionPath = path.join(
  root,
  'frontend/src/views/source-collection/product-collection/Index.vue',
)

const supplyManagement = fs.readFileSync(supplyManagementPath, 'utf8')
const productCollection = fs.readFileSync(productCollectionPath, 'utf8')

assert.match(
  supplyManagement,
  /import \{ toDisplayImageUrl \} from '@\/utils\/imageUrl'/,
  'supply management should use the shared display image URL helper',
)
assert.match(
  supplyManagement,
  /:src="toDisplayImageUrl\(imageUrl\)"/,
  'supply management list images should proxy 1688 image URLs for display',
)
assert.match(
  supplyManagement,
  /:src="toDisplayImageUrl\(previewSource\.image\)"/,
  'supply management preview images should proxy 1688 image URLs for display',
)

assert.match(
  productCollection,
  /const existingProductImages = mergeProductImages\([\s\S]*?product\.images[\s\S]*?product\.imageUrl[\s\S]*?\)/,
  'source collection save should build an existing image list before fetching detail images',
)
assert.match(
  productCollection,
  /const detailImages = existingProductImages\.length > 1\s*\?\s*\[\]\s*:\s*await loadProductDetailImages\(product\)/,
  'source collection save should skip the slow detail image request when search results already contain multiple images',
)
assert.match(
  productCollection,
  /const productImageUrl = allProductImages\[0\] \|\| product\.image \|\| product\.image_url \|\| product\.imageUrl \|\| ''/,
  'source collection save should use the first merged image as the primary saved source image',
)

console.log('sourceCollectionSupplyManagementImages tests passed')
