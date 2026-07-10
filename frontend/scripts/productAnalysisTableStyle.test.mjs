import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.resolve(file), 'utf8');

const productList = read('src/views/product-analysis/ozon-preference/components/ProductList.vue');
const biddingMonitor = read('src/views/product-analysis/bidding-monitor/Index.vue');
const appTable = read('src/components/ui/AppTable.vue');
const sharedStyles = read('src/styles/components.css');

assert.match(productList, /class="app-table-wrapper/, 'Ozon 优选商品列表外层应使用公共 AppTable wrapper');
assert.match(productList, /<table class="[^"]*\bapp-table\b[^"]*">/, 'Ozon 优选商品列表应使用公共 AppTable 表格类');
assert.match(productList, /<thead class="app-table-header">/, 'Ozon 优选商品列表表头应使用公共 AppTable header 类');
assert.match(productList, /<tbody class="app-table-body">/, 'Ozon 优选商品列表表体应使用公共 AppTable body 类');
assert.match(productList, /class="app-table-row"/, 'Ozon 优选商品列表行应使用公共 AppTable row 类');
assert.match(productList, /class="app-table-th /, 'Ozon 优选商品列表表头单元格应使用公共 AppTable th 类');
assert.match(productList, /class="app-table-td /, 'Ozon 优选商品列表表体单元格应使用公共 AppTable td 类');
assert.doesNotMatch(productList, /<table class="w-full">/, 'Ozon 优选商品列表不应保留孤立 Tailwind 表格');

assert.doesNotMatch(
  biddingMonitor,
  /<AppEmpty v-if="priceHistory\.length === 0"[\s\S]*?<AppTable/,
  '竞价监控价格历史空状态应由 AppTable 统一渲染，避免重复空状态',
);

for (const [name, source] of [
  ['AppTable.vue', appTable],
  ['components.css', sharedStyles],
]) {
  assert.match(source, /\.app-table-th[\s\S]*?font-size:\s*12px;/, `${name} 公共表头字号应统一为 12px`);
  assert.match(source, /\.app-table-td[\s\S]*?font-size:\s*12px;/, `${name} 公共单元格字号应统一为 12px`);
  assert.match(source, /\.app-table-row:hover[\s\S]*?background-color:\s*#f8fbff;/, `${name} 公共表格 hover 应使用统一浅色背景`);
}

console.log('productAnalysisTableStyle passed');
