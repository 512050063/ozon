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
const addProductDrawerPath = path.join(
  root,
  'frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue',
)
const productSupplyControllerPath = path.join(
  root,
  'backend/src/controllers/productSupplyController.ts',
)

const supplyManagement = fs.readFileSync(supplyManagementPath, 'utf8')
const productCollection = fs.readFileSync(productCollectionPath, 'utf8')
const addProductDrawer = fs.readFileSync(addProductDrawerPath, 'utf8')
const productSupplyController = fs.readFileSync(productSupplyControllerPath, 'utf8')

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
  /v-for="\(\s*imageUrl,\s*imageIndex\s*\) in previewSourceImages"/,
  'supply management URL preview should render all parsed source images',
)
assert.match(
  supplyManagement,
  /:src="toDisplayImageUrl\(imageUrl\)"[\s\S]*?class="source-preview-image"/,
  'supply management URL preview images should proxy 1688 image URLs for display',
)
assert.match(
  supplyManagement,
  /@mouseenter="startPreviewImageCarousel"/,
  'supply management URL preview should start the image carousel on hover',
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

assert.match(
  addProductDrawer,
  /import AppImage from '@\/components\/ui\/AppImage\.vue'/,
  'product library drawer should use the shared AppImage component',
)
assert.match(
  addProductDrawer,
  /<AppImage\s+:src="image"[\s\S]*?empty-text="暂无图片"/,
  'product library drawer image slots should proxy remote images through AppImage',
)

assert.match(
  productSupplyController,
  /const resolvedImageUrl = imageUrl \|\| productImages\?\.\[0\] \|\| source\?\.image \|\| ''/,
  'product supply create should fall back to the first image as primary imageUrl',
)
assert.match(
  productSupplyController,
  /const resolvedUpdateImageUrl = imageUrl !== undefined[\s\S]*?normalizeImageArray\(normalizedUpdateImages\)\[0\]/,
  'product supply update should fall back to the first submitted image as primary imageUrl',
)

console.log('sourceCollectionSupplyManagementImages tests passed')
