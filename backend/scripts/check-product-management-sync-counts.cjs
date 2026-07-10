const fs = require('fs');
const path = require('path');
const assert = require('assert');

const servicePath = path.join(__dirname, '..', 'src', 'services', 'ozonProductService.ts');
const source = fs.readFileSync(servicePath, 'utf8');

assert.match(
  source,
  /allTotalCount:\s*nonArchivedCount/,
  '商品管理“所有”数量必须直接使用非归档商品去重数量，不能用状态数量相加'
);

assert.match(
  source,
  /const hasProductChanged = true;/,
  '商品同步已有记录时必须强制覆盖 Ozon 状态快照，不能只依赖 updated_at 判断'
);

assert.doesNotMatch(
  source,
  /allTotalCount:\s*sellingCount\s*\+\s*readyCount\s*\+\s*errorCount\s*\+\s*unlistedCount/,
  '商品管理“所有”数量不能通过销售中、准备销售、错误、已下架相加得到'
);

assert.doesNotMatch(
  source,
  /product_id:\s*product\.product_id\s*\|\|\s*productIds\[index\]/,
  '商品详情不能按返回数组索引兜底 product_id，否则会把编辑详情错配到其他商品'
);

assert.match(
  source,
  /const archiveData = \{\s*product_id:\s*\[parseInt\(productId\)\]\s*\};/,
  'Ozon 归档接口 product_id 必须按数组提交'
);

assert.match(
  source,
  /const unarchiveData = \{\s*product_id:\s*\[parseInt\(productId\)\]\s*\};/,
  'Ozon 取消归档接口 product_id 必须按数组提交'
);

const errorCodeSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'ozonErrorCodeService.ts'), 'utf8');
assert.match(
  errorCodeSource,
  /truncateErrorText/,
  'Ozon 错误码文本入库前需要截断，避免单条错误说明过长导致同步警告'
);

const productManagementSource = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'views', 'ozon', 'product-management', 'Index.vue'), 'utf8');
assert.match(
  productManagementSource,
  /case 'archive':[\s\S]*ElMessageBox\.confirm[\s\S]*then\(async \(\) => \{[\s\S]*const latestProduct = await validateProductForAction\(product\)/,
  '归档操作必须先弹确认框，再在用户确认后校验商品'
);

assert.match(
  productManagementSource,
  /const archivingProductIds = ref<Set<string>>\(new Set\(\)\);/,
  '前端需要记录正在归档的商品ID，避免重复提交'
);

assert.match(
  productManagementSource,
  /setArchiveOperationProcessing\(productId, 'archive', true\);[\s\S]*已提交归档请求，正在处理/,
  '确认归档后需要立即进入处理中状态并提示用户'
);

assert.match(
  source,
  /alreadyArchived: true/,
  '后端归档接口需要对已归档商品做幂等成功返回'
);

console.log('product management sync/count checks passed');
