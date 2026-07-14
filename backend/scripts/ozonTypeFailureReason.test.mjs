import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const typeService = fs.readFileSync(path.join(root, 'backend/src/services/ozonTypeService.ts'), 'utf8');
const typeController = fs.readFileSync(path.join(root, 'backend/src/controllers/ozonTypeController.ts'), 'utf8');
const crawlerApi = fs.readFileSync(path.join(root, 'frontend/src/api/ozonCrawlerAPI.ts'), 'utf8');
const typeApi = fs.readFileSync(path.join(root, 'frontend/src/api/ozonTypeAPI.ts'), 'utf8');
const preference = fs.readFileSync(path.join(root, 'frontend/src/views/product-analysis/ozon-preference/Index.vue'), 'utf8');
const productList = fs.readFileSync(path.join(root, 'frontend/src/views/product-analysis/ozon-preference/components/ProductList.vue'), 'utf8');

assert.match(
  typeService,
  /message: info\.message/,
  'batch type status should expose per-product failure messages',
);
assert.match(
  typeService,
  /const message = '本机采集器未在线，无法获取商品类型'[\s\S]*return \{ total, started: false, message \}/,
  'worker-offline type extraction should return a clear non-started reason',
);
assert.match(
  typeController,
  /message: result\.message \|\| `已开始后台批量提取 \$\{result\.total\} 个商品的类型`/,
  'batch type controller should not overwrite a non-started failure reason',
);

assert.match(
  crawlerApi,
  /results: Array<\{ url: string; type: string; title\?: string; status: string; message\?: string \}>/,
  'ozon crawler API should type batch status messages',
);
assert.match(
  typeApi,
  /results: Array<\{ url: string; type: string; title\?: string; status: string; message\?: string \}>/,
  'ozon type API should type batch status messages',
);

assert.match(
  preference,
  /typeErrorMessage\?: string/,
  'preference products should keep a per-row type error message',
);
assert.match(
  preference,
  /r\.status === 'error'[\s\S]*nextProduct = \{ \.\.\.nextProduct, typeErrorMessage: message \}/,
  'preference page should apply type extraction error messages to rows',
);
assert.match(
  preference,
  /!batchResult\.data\?\.started[\s\S]*await restoreProductTypesFromCache\(\)/,
  'preference page should restore error reasons when a type task does not start',
);

assert.match(
  productList,
  /\{\{ product\.typeErrorMessage \|\| '类型获取失败' \}\}/,
  'product list should display the concrete type extraction failure reason',
);

console.log('ozonTypeFailureReason tests passed');
