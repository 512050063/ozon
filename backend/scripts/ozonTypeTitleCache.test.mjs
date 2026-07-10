import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const searchServicePath = path.join(root, 'backend/src/services/ozonSearchService.ts')
const typeServicePath = path.join(root, 'backend/src/services/ozonTypeService.ts')
const crawlerApiPath = path.join(root, 'frontend/src/api/ozonCrawlerAPI.ts')
const preferenceIndexPath = path.join(root, 'frontend/src/views/product-analysis/ozon-preference/Index.vue')

const searchService = fs.readFileSync(searchServicePath, 'utf8')
const typeService = fs.readFileSync(typeServicePath, 'utf8')
const crawlerApi = fs.readFileSync(crawlerApiPath, 'utf8')
const preferenceIndex = fs.readFileSync(preferenceIndexPath, 'utf8')

assert.match(searchService, /export function updateCachedOzonSearchProductDetails/, 'search service should expose a cache updater for detail-page fields')
assert.match(searchService, /search_.*\.json/, 'cache updater should scan persisted search cache files')
assert.match(searchService, /normalizeProductUrl/, 'cache updater should match Ozon product URLs after normalization')
assert.match(searchService, /fs\.utimesSync/, 'cache updater should preserve cache file age after patching product details')

assert.match(typeService, /updateCachedOzonSearchProductDetails/, 'type extraction should update search cache with detail-page data')
assert.match(typeService, /title:\s*info\.title/, 'type extraction status should expose detail-page title')
assert.match(typeService, /syncSearchCachesFromTypeCache/, 'type service should backfill search caches from persisted type cache')
assert.match(typeService, /getBatchExtractStatus[\s\S]*?syncSearchCachesFromTypeCache/, 'batch status polling should backfill newly-created search caches')

assert.match(crawlerApi, /title\??:\s*string/, 'frontend crawler API should type batch status result titles')
assert.match(preferenceIndex, /r\.title[\s\S]*?products\.value\[idx\]\.name/, 'preference page should replace product names from type extraction detail titles')

console.log('ozonTypeTitleCache tests passed')
