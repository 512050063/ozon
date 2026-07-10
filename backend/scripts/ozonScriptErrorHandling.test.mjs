import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const searchService = fs.readFileSync(path.join(root, 'backend/src/services/ozonSearchService.ts'), 'utf8')
const linkService = fs.readFileSync(path.join(root, 'backend/src/services/ozonProductLinkService.ts'), 'utf8')

assert.match(
  searchService,
  /搜索超时：Ozon访问无响应或被拦截，请稍后重试或重新获取Cookie/,
  'search service should convert killed search scripts into a clear timeout message',
)
assert.match(
  searchService,
  /extractKnownSearchScriptError/,
  'search service should extract known Ozon script errors from stdout/stderr',
)
assert.match(
  linkService,
  /parseScriptFailureMessage/,
  'manual add service should parse JSON failure messages from the product-by-url script',
)
assert.match(
  linkService,
  /extractKnownScriptFailure/,
  'manual add service should extract known Ozon script failures',
)
assert.doesNotMatch(
  linkService,
  /reject\(new Error\(`链接解析失败: \$\{error\.message\}`\)\)/,
  'manual add service should not expose raw Command failed output to the UI',
)

console.log('ozonScriptErrorHandling tests passed')
