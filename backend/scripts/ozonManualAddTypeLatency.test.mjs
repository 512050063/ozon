import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const productLinkServicePath = path.join(root, 'backend/src/services/ozonProductLinkService.ts')
const typeServicePath = path.join(root, 'backend/src/services/ozonTypeService.ts')
const taskServicePath = path.join(root, 'backend/src/services/ozonBrowserTaskService.ts')
const crawlerApiPath = path.join(root, 'frontend/src/api/ozonCrawlerAPI.ts')
const productByUrlScriptPath = path.join(root, 'backend/scripts/ozon/ozon_product_by_url.py')
const typeBatchScriptPath = path.join(root, 'backend/scripts/ozon/ozon_extract_type_batch.py')

const productLinkService = fs.readFileSync(productLinkServicePath, 'utf8')
const typeService = fs.readFileSync(typeServicePath, 'utf8')
const taskService = fs.readFileSync(taskServicePath, 'utf8')
const crawlerApi = fs.readFileSync(crawlerApiPath, 'utf8')
const productByUrlScript = fs.readFileSync(productByUrlScriptPath, 'utf8')
const typeBatchScript = fs.readFileSync(typeBatchScriptPath, 'utf8')

const resolveBody = productLinkService.match(/export const resolveOzonProductLink = async[\s\S]*?export const resolveOzonProductLinkWithDefaultDependencies/)?.[0] || ''
assert.ok(resolveBody, 'manual Ozon link resolver should exist')
assert.doesNotMatch(resolveBody, /await dependencies\.extractType/, 'manual add should not block product parsing while waiting for type extraction')
assert.match(productLinkService, /inferred_type\?: string/, 'manual add backend should accept inferred_type from the parser script')
assert.match(productLinkService, /productType: item\.productType \|\| item\.product_type \|\| item\.inferred_type \|\| item\.inferredType \|\| ""/, 'manual add backend should use inferred type as a fallback product type')

assert.match(crawlerApi, /item\.productType \|\| item\.product_type \|\| item\.inferred_type \|\| item\.inferredType \|\| ''/, 'frontend Ozon product normalization should preserve inferred product types from worker results')

assert.match(productByUrlScript, /product\['inferred_type'\] = infer_type_from_text/, 'manual product parser should emit inferred_type for normal detail parsing')
assert.match(productByUrlScript, /const combinedText = clean\(textNodes\.join\(' '\)\)/, 'manual product parser should inspect combined detail text for split rating and review fragments')
assert.match(productByUrlScript, /const ratingMatch = combinedText\.match/, 'manual product parser should recover rating from combined detail text')
assert.match(productByUrlScript, /const reviewSource = combinedText\.replace/, 'manual product parser should remove rating fragments before extracting reviews')
assert.match(productByUrlScript, /const reviewMatches = Array\.from\(reviewSource\.matchAll/, 'manual product parser should consider all review candidates')

assert.match(typeBatchScript, /extract_type_from_characteristics_text/, 'type extraction script should parse flexible characteristics text, not only dl dt\/dd markup')
assert.match(typeBatchScript, /类型\|商品类型\|Тип товара\|Тип\|Вид/, 'type extraction script should recognize Chinese and Russian type labels')

assert.match(typeService, /let activeBatchUrls: string\[\] = \[\]/, 'type service should track the current batch urls separately from the persistent cache')
const batchBody = typeService.match(/export const batchExtractTypes = async[\s\S]*?\/\*\*\s*\n \* 获取批量提取状态/)?.[0] || ''
assert.ok(batchBody, 'batch type extraction body should exist')
assert.doesNotMatch(batchBody, /clearTypeCache\(\)/, 'starting a new batch should not clear persisted type cache for unrelated products')
assert.match(typeService, /const statusUrls = batchRunning && activeBatchUrls\.length > 0/, 'batch status should report the active batch while it is running')

assert.match(taskService, /const MAX_TASK_ERROR_MESSAGE_LENGTH = 80/, 'worker task error messages should be short enough for deployed database varchar limits')
assert.match(taskService, /errorMessage: normalizeTaskErrorMessage\(errorMessage\)/, 'worker task failures should persist normalized error messages')

console.log('ozonManualAddTypeLatency tests passed')
