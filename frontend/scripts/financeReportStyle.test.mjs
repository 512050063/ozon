import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = [
  'src/views/ozon/finance-report/Index.vue',
  'src/views/ozon/finance-report/components/FinanceReportToolbar.vue',
  'src/views/ozon/finance-report/components/FinanceSummarySection.vue',
].map(file => readFileSync(file, 'utf8')).join('\n');

assert.match(source, /\.report-toolbar\s*\{[\s\S]*min-height:\s*var\(--app-search-toolbar-height,\s*100px\);/, '筛选区高度应沿用全局搜索工具栏高度');
assert.match(source, /\.stats-section\s*\{[\s\S]*box-shadow:\s*none;/, '统计区需要保持克制的白底样式');
assert.match(source, /\.stats-section::before,[\s\S]*\.stats-section::after\s*\{[\s\S]*display:\s*none;/, '统计区不应再使用额外装饰高光层');
assert.match(source, /finance-stat-icon/, '统计区标题需要图标容器');
assert.doesNotMatch(source, /@keyframes\s+financeStatsGlow/, '统计区不应保留旧高光动画');
assert.match(source, /\.ozon-progress-fill::after/, '统计区进度条需要流动高光');
assert.match(source, /\.summary-side\s*\{[\s\S]*background:\s*(?:#f8fafc|linear-gradient)/, '期初欠款需要信息块样式');
assert.match(source, /\.ozon-sales-card,\s*\n\.ozon-expense-card\s*\{[\s\S]*background:\s*#ffffff/, '销售和费用卡需要保持白底分区背景');
assert.match(source, /\.ozon-detail-row\s*\{[\s\S]*min-height:\s*24px;[\s\S]*border-radius:\s*8px;/, '销售明细行需要保持紧凑圆角布局');
assert.match(source, /\.ozon-expense-item\s*\{[\s\S]*min-height:\s*24px;[\s\S]*border-radius:\s*8px;/, '费用明细行需要保持紧凑圆角布局');
assert.match(source, /finance-table-panel/, '表格容器需要语义样式类');
assert.match(source, /\.finance-table-panel\s*\{[\s\S]*box-shadow:\s*none\s*!important;/, '表格容器需要保持克制白底样式');

console.log('financeReportStyle.test passed');
