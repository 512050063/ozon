import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/views/customer-service/auto-reply/components/KeywordDialog.vue', 'utf8');

assert.match(
  source,
  /@click="setRuleType\('store'\)"/,
  '店铺规则按钮应直接切换本地规则类型',
);

assert.match(
  source,
  /@click="setRuleType\('product'\)"/,
  '商品规则按钮应直接切换本地规则类型',
);

assert.doesNotMatch(
  source,
  /<el-radio-button\b/,
  '规则类型切换不应依赖当前弹窗中失效的 el-radio-button',
);

assert.match(
  source,
  /const\s+setRuleType\s*=\s*\(type:\s*AutoReplyFormData\['type'\]\)\s*=>/,
  '规则类型切换应有显式 setRuleType 处理函数',
);

console.log('autoReplyKeywordDialog.test passed');
