import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve('src/views/ozon/product-management/components/ProductEditDrawer.vue'),
  'utf8',
);

const loadingPanel = source.match(/\.drawer-loading-panel\s*\{[\s\S]*?\n\}/)?.[0] || '';
const completionBar = source.match(/\.completion-bar\s*\{[\s\S]*?\n\}/)?.[0] || '';
const drawerBody = source.match(/:global\(\.add-product-drawer \.el-drawer__body\)\s*\{[\s\S]*?\n\}/)?.[0] || '';

assert.match(drawerBody, /position:\s*relative;/, '编辑抽屉 body 需要作为加载层和底部栏的定位容器');
assert.match(drawerBody, /overflow:\s*hidden;/, '编辑抽屉 body 需要裁剪加载层，避免动画溢出到底部按钮区域');
assert.match(loadingPanel, /inset:\s*0 24px 96px;/, '加载层底部需要给底部固定操作栏预留空间');
assert.match(loadingPanel, /max-height:\s*calc\(100% - 96px\);/, '加载层高度需要限制在内容区内');
assert.match(loadingPanel, /overflow:\s*hidden;/, '加载骨架内容不能溢出加载层');
assert.match(completionBar, /z-index:\s*12;/, '底部统计和按钮栏需要高于加载骨架层');

console.log('check-product-edit-drawer-loading-layer passed');
