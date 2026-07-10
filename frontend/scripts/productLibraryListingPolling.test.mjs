import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('src/views/warehouse/product-library/Index.vue');
const source = fs.readFileSync(sourcePath, 'utf8');

assert.match(
  source,
  /const\s+checkListingStatusOnce\s*=\s*async\s*\(\s*productId:\s*number/,
  '商品库应抽出单次上架状态查询，供手动查询、即时轮询和恢复轮询复用',
);

assert.match(
  source,
  /const\s+resumeListingPolling\s*=\s*\(\s*\)\s*=>[\s\S]*product\.status\s*===\s*'listing'[\s\S]*startPolling\(product\.id,\s*\{\s*announce:\s*false/,
  '加载列表后应静默恢复已有上架中商品的轮询',
);

assert.match(
  source,
  /const\s+startPolling\s*=\s*\(\s*productId:\s*number[\s\S]*void\s+runCheck\(\)/,
  '启动轮询后应立即查询一次状态，不能等到第一个 1 分钟间隔',
);

assert.match(
  source,
  /productLibrary\.value\s*=\s*result\.data[\s\S]*resumeListingPolling\(\)/,
  '商品列表刷新后应检查并恢复上架中商品的状态查询',
);

console.log('productLibraryListingPolling.test passed');
