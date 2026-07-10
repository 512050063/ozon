import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const componentPath = path.resolve(
  __dirname,
  '../../frontend/src/views/warehouse/product-library/components/ProductLibraryList.vue',
)

const source = fs.readFileSync(componentPath, 'utf8')

assert.match(source, /key:\s*'source',\s*label:\s*'货源'/, 'table should expose source as a standalone column')
assert.match(source, /#cell-source/, 'source column should have its own slot')

const actionSlot = source.match(/<template #cell-action[\s\S]*?<\/template>/)?.[0] || ''
assert.ok(actionSlot, 'action slot should exist')
assert.ok(!actionSlot.includes('货源'), 'action slot should not contain source controls')
assert.ok(!actionSlot.includes('上架'), 'action slot should not contain listing controls')
assert.ok(!actionSlot.includes('查询状态'), 'action slot should not contain status query controls')
assert.match(actionSlot, /AppTableButton\s+name="edit"/, 'edit action should use AppTableButton')
assert.match(actionSlot, /AppTableButton\s+name="delete"/, 'delete action should use AppTableButton')

const statusSlot = source.match(/<template #cell-status[\s\S]*?<\/template>/)?.[0] || ''
assert.ok(statusSlot, 'status slot should exist')
assert.match(statusSlot, /handleStatusAction\(row\)/, 'status slot should drive listing actions')
assert.match(statusSlot, /getStatusDetail\(row\)/, 'status slot should use detailed status tooltip content')
assert.match(source, /if \(product\.listedAt\)[\s\S]*上架时间/, 'listed rows should show listed time through status detail tooltip')

console.log('productLibraryListActions tests passed')
