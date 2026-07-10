import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const indexPath = path.join(root, 'frontend/src/views/product-analysis/ozon-preference/Index.vue')
const overlayPath = path.join(root, 'frontend/src/views/product-analysis/ozon-preference/components/ProgressOverlay.vue')

const index = fs.readFileSync(indexPath, 'utf8')
const overlay = fs.readFileSync(overlayPath, 'utf8')

const handleSearchStart = index.indexOf('const handleSearch = async')
assert.ok(handleSearchStart > -1, 'ozon preference should define handleSearch')
const handleSearch = index.slice(handleSearchStart)

const cacheCheckPos = handleSearch.indexOf('getSearchCache(keyword')
const cookieCheckPos = handleSearch.indexOf('checkCookieStatus()')
const environmentPos = handleSearch.indexOf("persistSearchProgress(keyword, category, 'environment'")
const apiSearchPos = handleSearch.indexOf('searchOzonProducts(keyword, category)')

assert.ok(cacheCheckPos > -1, 'handleSearch should check local search snapshot cache')
assert.ok(cookieCheckPos > -1, 'handleSearch should still check cookie before live search')
assert.ok(environmentPos > -1, 'handleSearch should still show environment stage before live search')
assert.ok(apiSearchPos > -1, 'handleSearch should call live search API on cache miss')
assert.ok(cacheCheckPos < cookieCheckPos, 'cache should be checked before cookie/environment checks')
assert.ok(cacheCheckPos < environmentPos, 'cache should be checked before language/currency environment stage')
assert.ok(environmentPos < apiSearchPos, 'environment stage should only happen before live search')
assert.match(handleSearch, /const cachedProducts = await getSearchCache\(keyword[\s\S]*?if \(cachedProducts\)[\s\S]*?return;/, 'cache hit should render products and return without live search')
assert.match(handleSearch, /if \(!extractCompleted\.value\)[\s\S]*?startBackgroundTypeExtraction/, 'type extraction should only start when cached/live results still miss types')

assert.doesNotMatch(overlay, /class="progress-title"/, 'progress overlay should not render a separate duplicate title')
assert.doesNotMatch(overlay, /falcon-stage/, 'progress loader should not render a second stage indicator')
assert.match(overlay, /polling-status[\s\S]*?阶段 \{\{ activeStageIndex \+ 1 \}\}\/\{\{ stages\.length \}\} · \{\{ activeStageTitle \}\}/, 'progress overlay should keep the animated stage pill')
assert.ok(overlay.indexOf('class="polling-status"') < overlay.indexOf('class="progress-copy"'), 'animated stage pill should be above the description text')
assert.match(overlay, /progress-track[\s\S]*?skill-box/, 'progress bar should use the Uiverse-like skill-box structure')
assert.match(overlay, /progress-pulse/, 'progress bar should use a rhythmic pulse instead of a sweeping shine')
assert.match(overlay, /class="progress-bubble"/, 'progress bar should render a percentage bubble above the fill end')
assert.match(overlay, /class="progress-water"/, 'progress bar should use a dedicated water layer instead of a plain shine overlay')
assert.match(overlay, /progress-water::before[\s\S]*?progress-water::after/, 'water layer should include two wave surfaces')
assert.doesNotMatch(overlay, /@keyframes progress-wave[\s\S]*?translateX\(50%\) rotate\(360deg\)/, 'progress water should not use the previous mechanical rotating sweep')
assert.match(index, /\.preference-results-area[\s\S]*?min-height:\s*440px/, 'results area should reserve the same height while loading or empty')

console.log('ozonPreferenceSearchFlow tests passed')
