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

assert.match(productCollection, /getCategoryLeafText\(product\)[\s\S]*?searchKeyword/, 'same-category search should use the leaf category text instead of the full category path')
assert.doesNotMatch(productCollection, /const searchKeyword = product\.category && product\.category\.trim\(\)[\s\S]*?\? product\.category\.trim\(\)/, 'same-category search should not send the full category path as the 1688 keyword')
assert.match(productCollection, /similarSearchMode/, 'similar drawer should track whether current search is keyword or image')
assert.match(productCollection, /similarSearchMode\.value === 'image'[\s\S]*?alibabaAPI\.searchByImage/, 'loading more same-product results should continue image search pagination')
assert.match(productCollection, /searchSameProductsByImage[\s\S]*?similarSearchMode\.value = 'image'[\s\S]*?hasMoreSimilar\.value = similarProducts\.value\.length < total/, 'same-product image search should preserve pagination state')

assert.doesNotMatch(alibabaService, /call1688Api\(userId,\s*'com\.alibaba\.fenxiao',\s*'product\.keywords\.search'/, 'fenxiao keyword search should not fall back to POST because POST can ignore keywords')
assert.match(alibabaService, /filterRelevanceWithFallback/, 'keyword search should avoid returning too few items when relevance filtering is too aggressive')

console.log('productCollectionSimilarSearch tests passed')
