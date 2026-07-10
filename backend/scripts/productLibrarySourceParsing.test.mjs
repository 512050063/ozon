import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const utilPath = path.join(root, 'frontend/src/views/warehouse/product-library/sourceBindingUtils.ts')
const utilSource = fs.readFileSync(utilPath, 'utf8')

assert.match(utilSource, /productSaleInfo\?\.priceRanges/, 'source parser should read nested 1688 sale price ranges')
assert.match(utilSource, /supplierLoginId/, 'source parser should fall back to supplierLoginId')
assert.match(utilSource, /loginId/, 'source parser should fall back to 1688 search result loginId')
assert.match(utilSource, /getAlibabaSourceDetailUrl/, 'source parser should expose a reusable 1688 detail URL helper')

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'source-binding-utils-'))
const tmpTs = path.join(tmpDir, 'sourceBindingUtils.ts')
const tmpJs = path.join(tmpDir, 'sourceBindingUtils.js')
fs.writeFileSync(
  tmpTs,
  utilSource
    .replace(/^import type .*?;\r?\n/gm, '')
)

execFileSync('npx', ['esbuild', tmpTs, '--bundle', '--platform=node', '--format=esm', `--outfile=${tmpJs}`], {
  cwd: path.join(root, 'frontend'),
  stdio: 'pipe',
  shell: process.platform === 'win32',
})

const {
  extractAlibabaOfferId,
  getAlibabaSourceDetailUrl,
  normalizeAlibabaDetailToSourcePayload,
} = await import(`file:///${tmpJs.replace(/\\/g, '/')}`)

const inputUrl = 'https://detail.1688.com/offer/850153922606.html?offerId=850153922606&hotSaleSkuId=5927015738603&spm=a260k.home2025.recommendpart.2'
assert.equal(extractAlibabaOfferId(inputUrl), '850153922606', 'parser should extract offer id from detail URL before extra query params')

const source = normalizeAlibabaDetailToSourcePayload({
  offerId: '850153922606',
  subject: '蓝牙头戴式无线蓝牙耳机 电竞吃鸡听歌重低音耳麦头戴式蓝牙耳机',
  productSaleInfo: {
    priceRanges: [{ startQuantity: 2, price: '23.50' }],
    minOrderQuantity: 2,
  },
  productImage: {
    images: ['https://cbu01.alicdn.com/img/ibank/O1CN01.jpg'],
  },
  supplierLoginId: '深圳蓝牙耳机工厂',
}, '850153922606', inputUrl)

assert.equal(source.alibabaOfferId, '850153922606')
assert.equal(source.price, 23.5)
assert.equal(source.moq, 2)
assert.equal(source.supplierName, '深圳蓝牙耳机工厂')
assert.equal(source.image, 'https://cbu01.alicdn.com/img/ibank/O1CN01.jpg')
assert.equal(source.detailUrl, inputUrl)
assert.equal(getAlibabaSourceDetailUrl({ alibabaOfferId: '850153922606' }), 'https://detail.1688.com/offer/850153922606.html')

const keywordSource = normalizeAlibabaDetailToSourcePayload({
  companyInfo: {
    city: '深圳市',
    companyName: '1688深圳3C数码选品中心',
    province: '广东',
  },
  loginId: '维肯熊品牌供应链',
  offerId: 850153922606,
  offerImage: {
    imageUrl: 'https://cbu01.alicdn.com/img/ibank/O1CN01LfolxK1R7MWZc4dqQ_!!2217860982064-0-cib.jpg',
  },
  offerPrice: {
    consignPrice: '19.90',
    price: '19.90',
  },
  subject: '蓝牙头戴式无线蓝牙耳机 电竞吃鸡听歌重低音耳麦头戴式蓝牙耳机',
}, '850153922606', inputUrl)

assert.equal(keywordSource.alibabaOfferId, '850153922606')
assert.equal(keywordSource.supplierName, '1688深圳3C数码选品中心')
assert.equal(keywordSource.price, 19.9)
assert.equal(keywordSource.consignPrice, 19.9)
assert.equal(keywordSource.city, '深圳市')
assert.equal(keywordSource.province, '广东')
assert.equal(keywordSource.image, 'https://cbu01.alicdn.com/img/ibank/O1CN01LfolxK1R7MWZc4dqQ_!!2217860982064-0-cib.jpg')

console.log('productLibrarySourceParsing tests passed')
