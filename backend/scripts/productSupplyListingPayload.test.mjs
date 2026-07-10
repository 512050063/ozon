import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const controllerSource = fs.readFileSync(path.join(root, 'src/controllers/productSupplyController.ts'), 'utf8');

assert.match(
  controllerSource,
  /brand:\s*listingProduct\.brand\s*\|\|\s*'无品牌'/,
  '商品库上架提交必须把本地品牌传给 Ozon payload 构造层',
);
assert.match(
  controllerSource,
  /modelName:\s*listingProduct\.modelName\s*\|\|\s*listingProduct\.offerId/,
  '商品库上架提交必须把本地型号名称传给 Ozon payload 构造层',
);
assert.match(
  controllerSource,
  /barcode:\s*listingProduct\.barcode/,
  '商品库上架提交必须把本地条形码传给 Ozon payload 构造层',
);

console.log('productSupplyListingPayload.test passed');
