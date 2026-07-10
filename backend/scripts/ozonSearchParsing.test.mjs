import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const searchScriptPath = path.join(root, 'backend/scripts/ozon/ozon_search.py')
const crawlerApiPath = path.join(root, 'frontend/src/api/ozonCrawlerAPI.ts')

const searchScript = fs.readFileSync(searchScriptPath, 'utf8')
const crawlerApi = fs.readFileSync(crawlerApiPath, 'utf8')

assert.match(searchScript, /deliveryPattern/, 'search script should explicitly filter delivery-time text from product titles')
assert.match(searchScript, /titleCandidates/, 'search script should collect title candidates from product links/images before fallback text')
assert.doesNotMatch(searchScript, /title = t;\s*\n\s*\}/, 'search script should not keep overwriting title with the last valid text node')
assert.match(searchScript, /deriveOriginalPrice/, 'search script should derive original price when discount exists')
assert.match(searchScript, /originalPriceValue <= currentPriceValue/, 'search script should reject original prices lower than the current price')
assert.match(searchScript, /is_ozon_error_page/, 'search script should detect Ozon error/challenge pages before waiting for product tiles')
assert.match(searchScript, /Ozon返回错误页，请稍后重试或重新获取Cookie/, 'search script should return a clear Ozon error-page message')
assert.doesNotMatch(searchScript, /ERROR_PAGE_PATTERNS[\s\S]*['"]Похоже,\s*нет['"]/, 'search script should not treat Ozon normal no-result text as an error page')
assert.match(searchScript, /def log\(/, 'search script should route diagnostic output through a stderr logger')
assert.match(searchScript, /print\(json\.dumps\(\{[\s\S]*'products': products/, 'search script stdout should end with machine-readable JSON products')
assert.doesNotMatch(searchScript, /print\(f?["']\[/, 'search script should not write diagnostic bracket logs to stdout')

assert.match(crawlerApi, /deriveOriginalPrice/, 'frontend normalization should derive original price when cached data is incomplete')
assert.match(crawlerApi, /originalPrice <= price/, 'frontend normalization should repair stale cache where original price is lower than price')

console.log('ozonSearchParsing tests passed')
