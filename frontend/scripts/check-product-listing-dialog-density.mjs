import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve('src/views/warehouse/product-library/components/ProductListingDialog.vue'),
  'utf8',
);

const blockFor = selector => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return source.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\n\\}`))?.[0] || '';
};

const checkHeaderTitle = blockFor('.check-header .section-title');
const dialogBandSpacing = blockFor('.dialog-band + .dialog-band');
const breakdownPanel = blockFor('.breakdown-panel');
const breakdownGrid = blockFor('.breakdown-grid');
const breakdownRow = blockFor('.breakdown-row');
const checkRow = blockFor('.check-row');
const checkLabel = blockFor('.check-label');
const checkMessage = blockFor('.check-message');
const checkRowSeparator = blockFor('.check-row + .check-row');

assert.match(checkHeaderTitle, /font-size:\s*13px;/, '提交前检查标题字号应比通用 section title 稍小');
assert.match(checkHeaderTitle, /line-height:\s*18px;/, '提交前检查标题行高应更紧凑');
assert.match(dialogBandSpacing, /margin-top:\s*16px;/, '价格预览和提交前检查模块之间需要增加间隔');
assert.match(breakdownPanel, /min-height:\s*92px;/, '计算明细容器需要增加高度');
assert.match(breakdownPanel, /margin-top:\s*20px;/, '计算明细上边距需要更舒展');
assert.match(breakdownPanel, /padding:\s*18px 14px 14px;/, '计算明细上下内边距需要增加');
assert.match(breakdownGrid, /row-gap:\s*8px;/, '计算明细行间距需要增加');
assert.match(breakdownRow, /min-height:\s*22px;/, '计算明细每行高度需要增加');
assert.match(breakdownRow, /line-height:\s*22px;/, '计算明细行高需要增加');
assert.match(checkRow, /min-height:\s*34px;/, '提交检查项行高应保持原来的紧凑列表高度');
assert.match(checkRow, /\n\s*height:\s*34px;/, '提交检查项不应被改成更高的卡片行');
assert.match(checkRow, /padding:\s*5px 10px;/, '提交检查项内边距应保持紧凑');
assert.match(checkLabel, /font-size:\s*12px;/, '检查项名称字号应小于 tab 字号，避免列表文本过重');
assert.match(checkMessage, /font-size:\s*11px;/, '检查项说明字号应跟随下调');
assert.match(checkRowSeparator, /border-top:\s*1px solid #eef2f7;/, '检查项应保留原来的紧凑分隔线');

console.log('check-product-listing-dialog-density passed');
