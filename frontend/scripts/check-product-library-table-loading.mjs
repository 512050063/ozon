import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const pageSource = fs.readFileSync(
  path.resolve('src/views/warehouse/product-library/index.vue'),
  'utf8',
);

const listSource = fs.readFileSync(
  path.resolve('src/views/warehouse/product-library/components/ProductLibraryList.vue'),
  'utf8',
);

assert.match(pageSource, /:loading="showTableSkeleton"/, '商品库父页面应把表格骨架屏状态传给列表');
assert.match(pageSource, /const dataLoaded = ref\(false\)/, '商品库应记录列表数据是否完成加载');
assert.match(pageSource, /const showTableSkeleton = computed\(\(\) => loading\.value && !dataLoaded\.value\)/, '商品库应沿用商品管理的表格骨架屏显示条件');
assert.match(pageSource, /dataLoaded\.value = false;/, '每次加载前应先切换到骨架屏');
assert.match(pageSource, /dataLoaded\.value = true;/, '加载结束后应显示数据或空状态');

assert.match(listSource, /loading\?: boolean;/, '商品库列表组件应接收 loading');
assert.match(listSource, /:loading="loading"/, '商品库列表应调用 AppTable 公共加载样式');
assert.match(listSource, /:data="loading \? \[\] : productLibrary"/, '商品库列表加载中不应继续显示旧表格数据');

console.log('check-product-library-table-loading passed');
