import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dialog = readFileSync('src/views/customer-service/auto-reply/components/KeywordDialog.vue', 'utf8');

assert.match(dialog, /import\s+\{\s*ozonProductAPI\s*\}\s+from\s+'@\/api\/ozonProductAPI'/, '自动回复商品下拉应读取商品管理接口');
assert.doesNotMatch(dialog, /productSelectionAPI/, '自动回复商品下拉不应再读取选品库接口');
assert.match(dialog, /useOzonStoreContext/, '商品管理列表需要使用当前 Ozon 店铺上下文');
assert.match(dialog, /getLocalProducts\([\s\S]*'selling'[\s\S]*\)/, '商品下拉应只获取商品管理的销售中商品');
assert.match(dialog, /resolveNames\(/, '商品下拉应复用商品名称翻译缓存');
assert.match(dialog, /getTranslatedName\(/, '商品下拉显示应使用中文翻译名称');
assert.match(dialog, /:label="getProductOptionName\(product\)"/, 'el-option label 应显示中文翻译后的商品名');
assert.match(dialog, /popper-class="auto-reply-product-select-popper"/, '商品下拉需要独立 popper 样式避免影响其他下拉');
assert.match(dialog, /\bfit-input-width\b/, '商品下拉面板宽度应跟随输入框宽度');
assert.doesNotMatch(dialog, /width:\s*min\(420px/, '商品下拉不应再固定为 420px 宽度');
assert.match(dialog, /#loading[\s\S]*product-select-loading/, '查询商品列表时需要在下拉内容区显示加载动画');
assert.match(dialog, /product-select-loading-spinner/, '商品下拉加载态需要使用轻量动画');
assert.match(dialog, /:global\(\.auto-reply-product-select-popper\s+\.el-select-dropdown__item\)[\s\S]*height:\s*auto/, '商品下拉项高度应自适应');
assert.match(dialog, /:global\(\.auto-reply-product-select-popper\s+\.el-select-dropdown__item\)[\s\S]*min-height:\s*58px/, '商品下拉项需要足够行高显示图片');
assert.match(dialog, /\.product-option-name[\s\S]*-webkit-line-clamp:\s*2/, '商品名应允许两行显示并截断');
assert.match(dialog, /\.product-option-img[\s\S]*width:\s*32px[\s\S]*height:\s*32px/, '商品图应缩小并完整显示');

console.log('autoReplyProductDropdown.test passed');
