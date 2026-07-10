import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve('src/views/ozon/product-management/Index.vue'),
  'utf8',
);

assert.match(
  source,
  /<el-tooltip[\s\S]*:content="getProductDisplayName\(product\)"[\s\S]*:disabled="!isProductNameOverflowing\(product\)"/,
  '商品名称 tooltip 必须使用显示名，并且只有文本溢出时启用',
);

assert.match(
  source,
  /<span[\s\S]*:ref="el => setProductNameElement\(product, el\)"[\s\S]*>\{\{ getProductDisplayName\(product\) \}\}<\/span>/,
  '商品名称主行必须使用翻译后的显示名替代俄文原名',
);

assert.doesNotMatch(
  source,
  /<span v-if="product\.nameZh"/,
  '翻译后的商品名不应作为第二行副标题显示',
);

assert.doesNotMatch(
  source,
  /<span[^>]*:title="product\.name"/,
  '商品名称不能同时使用原生 title，避免和 el-tooltip 出现双提示',
);

assert.doesNotMatch(
  source,
  /<span[^>]*:title="product\.nameZh"/,
  '翻译名称不能使用原生 title，避免和 el-tooltip 出现双提示',
);

assert.match(
  source,
  /window\.addEventListener\('resize', handleProductNameResize\)/,
  '窗口尺寸变化后需要重新计算商品名称是否溢出',
);

const setProductNameElementBody = source.match(/const setProductNameElement = \([^)]*\) => \{[\s\S]*?\n\};/)?.[0] || '';
assert.ok(setProductNameElementBody, '需要存在商品名称元素 ref 注册函数');
assert.doesNotMatch(
  setProductNameElementBody,
  /refreshProductNameOverflowStates\(\)/,
  '函数 ref 里不能直接刷新溢出响应式状态，否则可能触发 Vue 递归更新',
);

assert.match(
  source,
  /watch\(\s*products,\s*\(\) => \{\s*void refreshProductNameOverflowStates\(\);/s,
  '商品列表或翻译结果变化后需要重新计算商品名称是否溢出',
);

console.log('check-product-name-translation-display passed');
