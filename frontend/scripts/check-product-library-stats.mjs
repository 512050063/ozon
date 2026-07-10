import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const pageSource = fs.readFileSync(
  path.resolve('src/views/warehouse/product-library/index.vue'),
  'utf8',
);

const statsSource = fs.readFileSync(
  path.resolve('src/views/warehouse/product-library/components/ProductLibraryStats.vue'),
  'utf8',
);

const apiSource = fs.readFileSync(
  path.resolve('src/api/productSupplyAPI.ts'),
  'utf8',
);

const backendSource = fs.readFileSync(
  path.resolve('../backend/src/controllers/productSupplyController.ts'),
  'utf8',
);

assert.match(statsSource, /<StatCard label="商品库总数"/, '统计卡片应保留商品库总数');
assert.match(statsSource, /<StatCard label="待上架"[\s\S]*:value="`\$\{pendingCount\}\/\$\{listingCount\}`"/, '待上架卡片应使用 待上架/上架中 格式展示');
assert.match(statsSource, /<StatCard label="已上架"/, '统计卡片应保留已上架');
assert.match(statsSource, /<StatCard label="错误"/, '统计卡片应新增错误');
assert.match(statsSource, /grid-template-columns:\s*repeat\(4,\s*1fr\)/, '统计区应显示四个模块');
assert.doesNotMatch(statsSource, /subLabel=/, '商品库统计卡不应显示小字说明');

assert.match(pageSource, /:pendingCount="libraryStats\.pendingAndListing"/, '待上架统计应使用 pending + listing 合并值');
assert.match(pageSource, /:listingCount="libraryStats\.listing"/, '待上架统计卡应接收单独的上架中数量');
assert.match(pageSource, /:failedCount="libraryStats\.failed"/, '错误统计应使用后端 failed 统计');
assert.doesNotMatch(pageSource, /productLibrary\.value\.filter\(item => item\.status === 'pending'\)/, '顶部统计不应基于当前页数据计算');
assert.doesNotMatch(pageSource, /value:\s*'listing',\s*label:\s*'上架中'/, '状态下拉不应单独显示上架中，上架中归入待上架筛选');

assert.match(apiSource, /pendingAndListing:\s*number;/, '前端列表响应类型应包含 pendingAndListing');
assert.match(apiSource, /failed:\s*number;/, '前端列表响应类型应包含 failed');

assert.match(backendSource, /pendingAndListing:\s*pendingCount \+ listingCount/, '后端应返回待上架和上架中合并统计');
assert.match(backendSource, /status:\s*'failed'/, '后端应返回错误统计');
assert.match(backendSource, /where\.status = \{ in: \['pending', 'listing'\] \};/, '待上架筛选应同时返回待上架和上架中商品');

console.log('check-product-library-stats passed');
