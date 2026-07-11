import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const source = fs.readFileSync(path.join(root, 'backend/src/services/ozonProductService.ts'), 'utf8');

assert.match(source, /function parseWarehouseStatus\(product: any\): ProductStatusType \{/,
  '同步层必须显式解析仓库状态');
assert.match(source, /if \(hasProductErrors\(product\)\) \{\s*return ProductStatus\.ERROR;/,
  '同步层应优先按 Ozon errors 字段识别错误商品');
assert.match(source, /if \(statusFailed && statusFailed !== '' && statusFailed !== 'none'\) \{/,
  '同步层应识别 Ozon status_failed');
assert.match(source, /case 'VISIBLE':/,
  '同步层应按 visibility 判断销售中状态');
assert.match(source, /case 'INVISIBLE':/,
  '同步层应区分不可见状态与下架状态');
assert.match(source, /case 'ARCHIVED':/,
  '同步层应识别归档状态');
assert.match(source, /statusName === '不出售' \|\| statusName === 'Не продается'/,
  '同步层应识别下架状态');
assert.match(source, /const isReadyForSale = isReadyForSaleStatus \|\| hasWarningOnly;/,
  '准备销售统计必须包含 Ozon ready 状态和 warning-only 商品');
assert.match(source, /if \(!isArchived && isReadyForSale\) \{\s*readyCount\+\+;/,
  '准备销售计数必须包含 warning-only 商品');
assert.match(source, /case 'pending':\s*return !isArchived && isReadyForSale;/,
  '准备销售筛选必须包含 warning-only 商品');
assert.match(source, /case 'moderating':\s*return !isArchived && hasWarningOnly;/,
  '待修改筛选必须保持为 warning-only 子集');

assert.match(source, /primaryImage: truncateStr\(Array\.isArray\(product\.primary_image\) \? product\.primary_image\[0\] : product\.primary_image, 500\)/,
  '同步层应保留原始主图字段');
assert.match(source, /images: product\.images \|\| null,/,
  '同步层应保留原始图片列表字段');

console.log('ozonProductService.syncStatus.test passed');
