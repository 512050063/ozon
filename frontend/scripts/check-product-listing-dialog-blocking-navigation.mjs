import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dialogSource = fs.readFileSync(
  path.resolve('src/views/warehouse/product-library/components/ProductListingDialog.vue'),
  'utf8',
);

const apiSource = fs.readFileSync(
  path.resolve('src/api/productSupplyAPI.ts'),
  'utf8',
);

const submitDisabledBlock = dialogSource.match(/const submitDisabled = computed\(\(\) => \{[\s\S]*?\n\}\);/)?.[0] || '';
assert.ok(submitDisabledBlock, '应保留 submitDisabled computed');
assert.doesNotMatch(
  submitDisabledBlock,
  /return\s+!preview\.value\.canSubmit/,
  '确认按钮不能因为 canSubmit=false 直接禁用，否则无法点击定位阻止项',
);

assert.match(
  dialogSource,
  /async function focusBlockingCheck\(\)/,
  '应提供阻止项定位函数',
);
assert.match(
  dialogSource,
  /if \(!preview\.value\??\.canSubmit\) \{\s*await focusBlockingCheck\(\);\s*return;\s*\}/,
  '点击确认时应先切换并定位第一个阻止项，而不是直接提交',
);
assert.match(
  dialogSource,
  /activeCheckTab\.value = check\.group;/,
  '定位阻止项应切换到阻止项所在 tab',
);
assert.match(
  dialogSource,
  /ElMessage\.warning\('请先完善阻止项后再上架'\)/,
  '定位阻止项时应给出明确提示',
);
assert.match(
  dialogSource,
  /function isRequiredCheck\(check: ProductSupplyListingCheck\)/,
  '检查列表应能识别必填项',
);
assert.match(
  dialogSource,
  /class="check-required-mark"/,
  '必填检查项应显示红色星号',
);

assert.match(
  apiSource,
  /group:\s*'基础信息' \| '尺寸重量' \| '模板信息' \| '上架参数';/,
  '前端类型应包含尺寸重量分组，并移除媒体与图片分组',
);
assert.doesNotMatch(apiSource, /'媒体与图片'/, '媒体与图片 tab 已合并到基础信息');

console.log('check-product-listing-dialog-blocking-navigation passed');
