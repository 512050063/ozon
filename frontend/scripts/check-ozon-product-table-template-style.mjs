import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve('src/views/ozon/product-management/components/ProductManagementTable.vue'),
  'utf8',
);
const sharedStyles = fs.readFileSync(
  path.resolve('src/styles/components.css'),
  'utf8',
);

assert.match(source, /<div class="app-table-wrapper overflow-x-auto"/, '商品管理表格外层需要使用公共 AppTable wrapper 类');
assert.match(source, /<table class="app-table">/, '商品管理表格需要使用公共 AppTable 表格类');
assert.match(source, /<thead class="app-table-header">/, '商品管理表头需要使用公共 AppTable header 类');
assert.match(source, /<tbody class="app-table-body">/, '商品管理表体需要使用公共 AppTable body 类');
assert.match(source, /class="app-table-row"/, '商品管理数据行需要使用公共 AppTable row 类');
assert.match(source, /class="app-table-th /, '商品管理表头单元格需要使用公共 AppTable th 类');
assert.match(source, /class="app-table-td /, '商品管理表体单元格需要使用公共 AppTable td 类');

assert.doesNotMatch(source, /ozon-product-table/, '商品管理表格不应保留临时字号覆盖类');
assert.doesNotMatch(source, /\.ozon-product-table/, '商品管理页面不应保留单独字号覆盖样式');

assert.match(sharedStyles, /\.app-table \.app-table-th\s*\{[\s\S]*?font-size:\s*12px;/, '公共表头模板类应在全局样式中定义字号');
assert.match(sharedStyles, /\.app-table \.app-table-td\s*\{[\s\S]*?font-size:\s*12px;/, '公共单元格模板类应在全局样式中定义字号');

console.log('check-ozon-product-table-template-style passed');
