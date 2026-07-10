import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const listSource = fs.readFileSync(
  path.resolve('src/views/warehouse/product-library/components/ProductLibraryList.vue'),
  'utf8',
);

const pageSource = fs.readFileSync(
  path.resolve('src/views/warehouse/product-library/index.vue'),
  'utf8',
);

assert.match(listSource, /const isActionLocked = \(product: ProductSupplyItem\) => \['listing', 'listed'\]\.includes\(product\.status\);/, '上架中和已上架应锁定编辑、删除和货源绑定');
assert.match(listSource, /<AppTableButton name="edit" :disabled="isActionLocked\(row\)"/, '编辑按钮禁用状态应使用统一锁定规则');
assert.match(listSource, /:disabled="isActionLocked\(row\)"/, '删除按钮禁用状态应使用统一锁定规则');
const sourceCellSource = listSource.match(/<template #cell-source="\{ row \}">[\s\S]*?<\/template>/)?.[0] || '';
assert.doesNotMatch(sourceCellSource, /:disabled="isActionLocked\(row\)"/, '货源绑定不应受商品上架状态限制');
assert.doesNotMatch(sourceCellSource, /getActionLockedTitle/, '货源绑定标题不应显示状态锁定文案');
assert.doesNotMatch(listSource, /const handleEditSource = \(product: ProductSupplyItem\) => \{\s*if \(isActionLocked\(product\)\) return;/, '货源绑定点击不应被前端状态锁定拦截');
assert.match(listSource, /failed:\s*'错误'/, 'failed 状态文案应显示为错误');
assert.doesNotMatch(listSource, /failed:\s*'上架失败'/, '列表状态不应再显示上架失败');
assert.doesNotMatch(listSource, /InfoFilled|status-detail-icon/, '状态详情不应新建图标，应悬浮状态标签显示');
assert.match(listSource, /:content="getStatusDetail\(row\) \|\| getStatusTooltip\(row\)"/, '状态标签悬浮应优先展示提交时间、上架时间和错误信息');
assert.match(listSource, /:popper-class="getStatusDetail\(row\) \? 'status-detail-tooltip' : ''"/, '状态详情 tooltip 应使用换行样式');
assert.match(listSource, /提交时间: \$\{formatFullTime\(product\.listingSubmittedAt\)\}/, '提交时间应在状态详情中展示完整时间');
assert.match(listSource, /上架时间: \$\{formatFullTime\(product\.listedAt\)\}/, '已上架应在状态详情中展示上架时间');
assert.match(listSource, /错误信息: \$\{errorText\}/, '错误状态应在状态详情中展示错误信息');
assert.doesNotMatch(listSource, /row\.status === 'failed' && row\.listingError[\s\S]*\{\{ row\.listingError \}\}/, '错误信息不应直接铺在列表中');
assert.match(listSource, /const formatFullTime = \(timeStr: string\) =>/, '需要提供完整时间格式化函数');

assert.match(pageSource, /failed', label: '错误'/, '状态筛选项 failed 应显示为错误');
assert.match(pageSource, /const isProductActionLocked = \(product: ProductSupplyItem\) => \['listing', 'listed'\]\.includes\(product\.status\);/, '父页面也应拦截上架中和已上架编辑删除');
assert.match(pageSource, /if \(isProductActionLocked\(product\)\)/, '编辑删除入口应调用统一锁定规则');

console.log('check-product-library-list-status-actions passed');
