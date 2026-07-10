import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.resolve(file), 'utf8');

const sharedStyles = read('src/styles/components.css');
const userManagement = read('src/views/settings/user-management/Index.vue');
const roleManagement = read('src/views/settings/role-management/Index.vue');
const storeManagement = read('src/views/ozon/store-management/Index.vue');
const paymentRecords = read('src/views/settings/payment-records/Index.vue');
const productLibrary = read('src/views/warehouse/product-library/components/ProductLibraryList.vue');
const ozonPreference = read('src/views/product-analysis/ozon-preference/components/ProductList.vue');
const biddingMonitor = read('src/views/product-analysis/bidding-monitor/Index.vue');
const autoReply = read('src/views/customer-service/auto-reply/Index.vue');

for (const className of [
  'app-table-tag',
  'app-table-tag--success',
  'app-table-tag--info',
  'app-table-tag--warning',
  'app-table-tag--danger',
  'app-table-tag--blue',
  'app-table-tag--purple',
]) {
  assert.match(sharedStyles, new RegExp(`\\.${className}\\b`), `公共样式需定义 ${className}`);
}

assert.match(sharedStyles, /\.app-table-wrapper\s+\.el-tag[\s\S]*?height:\s*26px(?:\s*!important)?;/, '表格中的 el-tag 应统一为 26px 高度');
assert.match(sharedStyles, /\.app-table-tag[\s\S]*?font-size:\s*12px(?:\s*!important)?;/, '公共表格标签字号应统一为 12px');
assert.match(sharedStyles, /\.app-table-tag[\s\S]*?font-weight:\s*500(?:\s*!important)?;/, '公共表格标签字重应统一为 500');
assert.match(sharedStyles, /\.app-table-tag[\s\S]*?border-radius:\s*8px(?:\s*!important)?;/, '公共表格标签应统一为轻量圆角矩形');
assert.doesNotMatch(sharedStyles, /\.app-table-tag[\s\S]*?border-radius:\s*999px/, '公共表格标签不应再使用胶囊圆角');

for (const [name, source] of [
  ['用户管理', userManagement],
  ['角色管理', roleManagement],
  ['店铺管理', storeManagement],
  ['支付记录', paymentRecords],
  ['商品库列表', productLibrary],
  ['Ozon 优选', ozonPreference],
  ['竞价监控', biddingMonitor],
  ['自动回复', autoReply],
]) {
  assert.match(source, /app-table-tag/, `${name} 表格标签应使用公共 app-table-tag 样式`);
}

for (const [name, source] of [
  ['用户管理', userManagement],
  ['角色管理', roleManagement],
  ['店铺管理', storeManagement],
  ['支付记录', paymentRecords],
  ['Ozon 优选', ozonPreference],
  ['自动回复', autoReply],
]) {
  assert.doesNotMatch(source, /px-[23]\s+py-1\s+rounded-full/, `${name} 不应保留散装表格标签尺寸类`);
}

console.log('tableTagStyle passed');
