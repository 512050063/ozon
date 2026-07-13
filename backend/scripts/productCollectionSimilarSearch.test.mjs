import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const drawerPath = path.join(root, 'frontend/src/views/source-collection/product-collection/components/SimilarProductsDrawer.vue')
const productCollectionPath = path.join(root, 'frontend/src/views/source-collection/product-collection/Index.vue')
const alibabaServicePath = path.join(root, 'backend/src/services/alibabaService.ts')

const drawer = fs.readFileSync(drawerPath, 'utf8')
const productCollection = fs.readFileSync(productCollectionPath, 'utf8')
const alibabaService = fs.readFileSync(alibabaServicePath, 'utf8')

assert.doesNotMatch(drawer, /product\.yx_score_level|formatYxLevel|YX_SCORE_LEVEL/, 'similar products drawer should not render raw yx score level tags')
assert.match(drawer, /质优/, 'similar products drawer should keep the quality tag')
assert.match(drawer, /quality_score/, 'similar products drawer should base quality tag on quality_score')
assert.match(drawer, /product\.image_url/, 'similar products drawer should render backend image_url fields')
assert.match(drawer, /product\.imageUrl/, 'similar products drawer should render backend imageUrl fields')
assert.match(drawer, /product\.image\)/, 'similar products drawer should render backend image fields')
assert.match(drawer, /toDisplayImageUrl\(imgUrl\)/, 'similar products drawer should proxy Alibaba CDN images for display')

assert.match(productCollection, /getCategoryLeafText\(product\)[\s\S]*?searchKeyword/, 'same-category search should use the leaf category text instead of the full category path')
assert.doesNotMatch(productCollection, /const searchKeyword = product\.category && product\.category\.trim\(\)[\s\S]*?\? product\.category\.trim\(\)/, 'same-category search should not send the full category path as the 1688 keyword')
assert.match(productCollection, /similarSearchMode/, 'similar drawer should track whether current search is keyword or image')
assert.match(productCollection, /similarSearchMode\.value === 'image'[\s\S]*?alibabaAPI\.searchByImage/, 'loading more same-product results should continue image search pagination')
assert.match(productCollection, /searchSameProductsByImage[\s\S]*?similarSearchMode\.value = 'image'[\s\S]*?hasMoreSimilar\.value = similarProducts\.value\.length < total/, 'same-product image search should preserve pagination state')
assert.match(productCollection, /unwrapDisplayImageUrl[\s\S]*?\/api\/images\/proxy[\s\S]*?searchParams\.get\('url'\)/, 'same-product image search should unwrap display proxy URLs before calling 1688 image search')

assert.doesNotMatch(alibabaService, /call1688Api\(userId,\s*'com\.alibaba\.fenxiao',\s*'product\.keywords\.search'/, 'fenxiao keyword search should not fall back to POST because POST can ignore keywords')
assert.match(alibabaService, /filterRelevanceWithFallback/, 'keyword search should avoid returning too few items when relevance filtering is too aggressive')
assert.match(alibabaService, /p\.image_url[\s\S]*?p\.imageUrl[\s\S]*?p\.imgUrl[\s\S]*?p\.mainImage/, '1688 product parsing should preserve common image fields')
assert.match(alibabaService, /fetchImageAsBase64/, 'image search should retry with base64 when remote URL search fails')
assert.match(alibabaService, /isWebpImageBuffer[\s\S]*?convertImageBufferToJpegBase64/, 'image search should convert downloaded WebP images before Base64 retry')
assert.match(alibabaService, /canvas\.toDataURL\('image\/jpeg'/, 'image search should convert WebP to JPEG for 1688 image search')
assert.match(alibabaService, /URL图搜失败，尝试下载图片并使用Base64重试跨境图搜/, 'image search should log the base64 retry path')

console.log('productCollectionSimilarSearch tests passed')
