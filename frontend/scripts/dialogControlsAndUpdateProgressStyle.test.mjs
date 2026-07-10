import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const uiCss = readFileSync('src/styles/ui.css', 'utf8');
const updateProgress = readFileSync('src/components/ui/AppUpdateProgressBar.vue', 'utf8');
const mainLayout = readFileSync('src/components/MainLayout.vue', 'utf8');
const userManagement = readFileSync('src/views/settings/user-management/Index.vue', 'utf8');
const keywordDialog = readFileSync('src/views/customer-service/auto-reply/components/KeywordDialog.vue', 'utf8');

assert.match(uiCss, /\.dialog-switch\b/, '需要定义弹窗开关公共样式');
assert.match(uiCss, /\.dialog-switch[\s\S]*--el-switch-on-color:\s*#3b82f6/, '弹窗开关需要浅色蓝色开启态');
assert.match(uiCss, /\.dialog-switch[\s\S]*\.el-switch__core[\s\S]*background:\s*linear-gradient/, '弹窗开关轨道需要浅色渐变');
assert.match(uiCss, /\.dialog-switch[\s\S]*\.el-switch__action[\s\S]*box-shadow:/, '弹窗开关滑块需要细阴影');
assert.match(uiCss, /\.dialog-select\b/, '需要定义弹窗下拉框公共样式');
assert.match(uiCss, /\.dialog-select[\s\S]*\.el-select__wrapper[\s\S]*background:\s*#f8fafc/, '弹窗下拉框需要浅色背景');
assert.match(uiCss, /\.dialog-select[\s\S]*\.el-select__wrapper[\s\S]*border-radius:\s*8px/, '弹窗下拉框圆角需要与文本框一致');
assert.match(uiCss, /\.dialog-select[\s\S]*\.el-select__wrapper\.is-focus[\s\S]*box-shadow:/, '弹窗下拉框聚焦态需要浮起样式');
assert.match(uiCss, /\.dialog-select-popper\b/, '需要定义弹窗下拉面板样式');

assert.match(userManagement, /class="select-base dialog-select flex-1"/, '用户管理角色和会员等级下拉框需要接入 dialog-select');
assert.match(userManagement, /popper-class="dialog-select-popper"/, '用户管理下拉框需要接入弹窗下拉面板样式');
const memberLevelBlock = userManagement.match(/<label[^>]*>会员等级<\/label>[\s\S]*?<\/div>\s*<div class="error-message-container/)?.[0] || '';
assert.ok(memberLevelBlock, '用户管理需要保留会员等级表单项');
assert.doesNotMatch(memberLevelBlock, /<el-select/, '会员等级需要改为分段样式，不应使用下拉框');
assert.match(memberLevelBlock, /member-level-segmented/, '会员等级需要使用浅色分段控件');
assert.match(userManagement, /class="user-status-tag"/, '用户管理状态应使用状态标签触发确认弹窗');
assert.match(userManagement, /statusConfirmVisible/, '用户管理状态变更需要显式确认弹窗状态');
assert.match(userManagement, /AppDeleteConfirmDialog[\s\S]*statusConfirmVariant/, '用户管理状态确认弹窗需要按状态切换主题');
assert.match(keywordDialog, /class="dialog-switch"/, '自动回复弹窗状态开关需要接入 dialog-switch');

assert.match(updateProgress, /app-update-progress-orb/, '更新进度需要浅色状态图标');
assert.match(updateProgress, /app-update-progress-row/, '更新进度需要保持紧凑单行布局');
assert.match(updateProgress, /app-update-progress-message/, '更新进度需要显示进度文案');
assert.doesNotMatch(updateProgress, /app-update-progress-dot/, '更新进度标题前不应再显示第二个圆点图标');
assert.match(updateProgress, /<small class="app-update-progress-message"[\s\S]*\{\{ displayMessage \}\}<\/small>[\s\S]*app-update-progress-track[\s\S]*app-update-progress-percent/, '单行布局需要依次显示文案、进度条和百分比');
assert.match(updateProgress, /\.app-update-progress-card[\s\S]*width:\s*min\(430px,\s*calc\(100% - 32px\)\)/, '更新进度卡片需要保持紧凑宽度');
assert.match(updateProgress, /\.app-update-progress-track[\s\S]*max-width:\s*240px/, '进度条需要限制长度，避免过长');
assert.match(updateProgress, /app-update-progress-percent[\s\S]*{{ normalizedProgress }}%/, '进度数字需要单独显示');
assert.match(updateProgress, /@keyframes\s+updateProgressShine/, '更新进度条需要扫光动画');
assert.match(updateProgress, /background:\s*#ffffff/, '更新进度卡片需要白色浅背景');
assert.match(updateProgress, /linear-gradient\(90deg,\s*#60a5fa,\s*#22d3ee,\s*#2563eb\)/, '更新进度条需要蓝青渐变');

assert.match(mainLayout, /'order-management': '订单更新中'/, '订单更新条文案需要显示为“订单更新中”');
assert.match(mainLayout, /'product-management': '商品更新中'/, '商品更新条文案需要显示为“商品更新中”');
assert.match(mainLayout, /return '';/, '更新条不应再额外传入“正在更新”覆盖模块更新文案');
assert.doesNotMatch(mainLayout, /return meta\.statusText \|\| '正在更新'/, '更新条不应再显示单独的“正在更新”');

console.log('dialogControlsAndUpdateProgressStyle.test passed');
