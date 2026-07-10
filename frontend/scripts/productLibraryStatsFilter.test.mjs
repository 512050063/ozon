import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const statsPath = path.resolve('src/views/warehouse/product-library/components/ProductLibraryStats.vue');
const indexPath = path.resolve('src/views/warehouse/product-library/Index.vue');
const statsSource = fs.readFileSync(statsPath, 'utf8');
const indexSource = fs.readFileSync(indexPath, 'utf8');

assert.match(
  statsSource,
  /defineEmits<\{[\s\S]*filter-change[\s\S]*'' \| 'pending' \| 'listed' \| 'failed'/,
  '商品库统计卡应发出与状态筛选一致的 filter-change 事件',
);

for (const status of ["''", "'pending'", "'listed'", "'failed'"]) {
  assert.match(
    statsSource,
    new RegExp(`@click="emit\\('filter-change', ${status.replace(/'/g, "\\'")}\\)"`),
    `统计卡应能切换到 ${status} 筛选`,
  );
}

assert.match(
  indexSource,
  /@filter-change="handleStatsFilterChange"/,
  '商品库页面应监听统计卡筛选事件',
);

assert.match(
  indexSource,
  /const\s+STATUS_ALL\s*=\s*'all'/,
  '商品库所有状态应使用非空值，避免 el-select 把空字符串显示为占位符',
);

assert.match(
  indexSource,
  /\{\s*value:\s*STATUS_ALL,\s*label:\s*'所有'\s*\}/,
  '状态下拉的所有选项应显示为“所有”并绑定非空值',
);

assert.match(
  indexSource,
  /status:\s*selectedStatus\.value === STATUS_ALL\s*\?\s*undefined\s*:\s*selectedStatus\.value/,
  '查询接口应把“所有”状态转换为 undefined，而不是直接提交 all',
);

assert.match(
  indexSource,
  /const\s+handleStatsFilterChange\s*=\s*\(status:\s*'' \| 'pending' \| 'listed' \| 'failed'\)[\s\S]*const nextStatus = status \|\| STATUS_ALL[\s\S]*selectedStatus\.value\s*=\s*nextStatus[\s\S]*loadProductLibrary\(\)/,
  '统计卡筛选应把商品库总数映射为下拉框“所有”并重新加载列表',
);

assert.doesNotMatch(
  statsSource,
  /\.stat-filter-card-active\s*\{[\s\S]*?(box-shadow|border|outline)[\s\S]*?\}/,
  '当前选中的统计卡不应添加额外边框、阴影或描边样式',
);

assert.doesNotMatch(
  statsSource,
  /\.stat-filter-card-active\s+:deep\(\.stat-card\)/,
  '当前选中的统计卡不应覆盖内部卡片边框样式',
);

console.log('productLibraryStatsFilter.test passed');
