import assert from 'assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')
const sourcePath = path.join(root, 'frontend/src/views/warehouse/product-library/components/productTemplateDisplay.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'product-template-display-'))
const tmpTs = path.join(tmpDir, 'productTemplateDisplay.ts')
const tmpJs = path.join(tmpDir, 'productTemplateDisplay.js')

fs.writeFileSync(
  tmpTs,
  source.replace(/^import type .*?;\r?\n/gm, ''),
  'utf8',
)

execFileSync('npx', ['esbuild', tmpTs, '--bundle', '--platform=node', '--format=esm', `--outfile=${tmpJs}`], {
  cwd: path.join(root, 'frontend'),
  stdio: 'pipe',
  shell: process.platform === 'win32',
})

const {
  getProductTemplateDisplay,
  buildTemplateFieldHints,
  sanitizeTemplateAttributeRecords,
  buildPersistedTemplateSnapshot,
} = await import(`file:///${tmpJs.replace(/\\/g, '/')}`)

const template = {
  descriptionCategoryId: 17028929,
  typeId: 504866264,
  language: 'ZH_HANS',
  source: 'cache',
  cachedAt: new Date().toISOString(),
  requiredAttributeIds: [8229, 85, 4298, 9048, 2001],
  variantAttributes: [
    { id: 8229, name: '类型', description: '来自模板的类型提示', is_required: true, section: 'variant', isSkuDimension: false },
    { id: 85, name: '颜色', description: '颜色维度', is_required: true, section: 'variant', isSkuDimension: true },
    { id: 4298, name: '尺寸', description: '尺寸维度', is_required: true, section: 'variant', isSkuDimension: true },
    { id: 4191, name: '简介', description: '简介字段', is_required: false, section: 'variant', isSkuDimension: false },
    { id: 9048, name: '#主题标签', description: '主题标签字段', is_required: true, section: 'variant', isSkuDimension: false },
  ],
  hiddenAttributes: [
    { id: 2001, name: '原产国', description: '隐藏属性', is_required: true, section: 'hidden', isSkuDimension: false },
    { id: 100, name: '品牌', description: '来自模板的品牌提示', is_required: true, section: 'hidden', isSkuDimension: false },
  ],
  skuDimensionCandidates: [
    { id: 85, name: '颜色', description: '颜色维度', is_required: true, section: 'variant', isSkuDimension: true },
    { id: 4298, name: '尺寸', description: '尺寸维度', is_required: true, section: 'variant', isSkuDimension: true },
  ],
  rawAttributes: [],
}

const addDisplay = getProductTemplateDisplay(template, false)
assert.deepStrictEqual(addDisplay.baseAttributes.map(item => item.id).sort((a, b) => a - b), [100, 8229])
assert.deepStrictEqual(addDisplay.skuDimensionCandidates.map(item => item.id), [85, 4298])
assert.deepStrictEqual(addDisplay.editableVariantAttributes.map(item => item.id), [9048, 4191])
assert.deepStrictEqual(addDisplay.hiddenAttributes.map(item => item.id), [2001])

const editDisplay = getProductTemplateDisplay(template, true)
assert.deepStrictEqual(editDisplay.skuDimensionCandidates, [])
assert.deepStrictEqual(editDisplay.editableVariantAttributes.map(item => item.id), [9048, 4191, 85, 4298])
assert.deepStrictEqual(editDisplay.hiddenAttributes.map(item => item.id), [2001])

const hints = buildTemplateFieldHints(template)
assert.strictEqual(hints.brand, '来自模板的品牌提示')
assert.strictEqual(hints.type, '来自模板的类型提示')

const sanitized = sanitizeTemplateAttributeRecords(
  { 8229: { value: '耳机' }, 9048: '#tech', 4191: '短描述', 85: { value: '黑色' } },
  { 100: { value: '品牌A' }, 2001: { value: '中国' } },
  addDisplay.baseAttributeIds,
)
assert.deepStrictEqual(Object.keys(sanitized.attributes).sort(), ['4191', '85', '9048'])
assert.deepStrictEqual(Object.keys(sanitized.hiddenAttributes), ['2001'])

const addSnapshot = buildPersistedTemplateSnapshot(template, false)
assert.deepStrictEqual(addSnapshot.baseAttributes.map(item => item.id).sort((a, b) => a - b), [100, 8229])
assert.deepStrictEqual(addSnapshot.variantAttributes.map(item => item.id), [9048, 4191])
assert.deepStrictEqual(addSnapshot.hiddenAttributes.map(item => item.id), [2001])
assert.deepStrictEqual(addSnapshot.skuDimensionCandidates.map(item => item.id), [85, 4298])
assert.deepStrictEqual(addSnapshot.requiredAttributeIds.sort((a, b) => a - b), [85, 2001, 4298, 9048])

console.log('productTemplateDisplayLogic tests passed')
