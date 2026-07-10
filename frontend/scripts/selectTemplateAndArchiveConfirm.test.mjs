import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const uiCss = read('src/styles/ui.css');
const financeReport = [
  read('src/views/ozon/finance-report/Index.vue'),
  read('src/views/ozon/finance-report/components/FinanceReportToolbar.vue'),
].join('\n');
const productLibrary = read('src/views/warehouse/product-library/Index.vue');
const productManagement = read('src/views/ozon/product-management/Index.vue');

assert.match(uiCss, /\.select-base\s+\.el-select__wrapper[\s\S]*background:\s*#f8fafc/, 'select-base wrapper should use the shared light input background');
assert.match(uiCss, /\.select-base\s+\.el-select__wrapper[\s\S]*border:\s*1px\s+solid/, 'select-base wrapper should own the visible border template');
assert.match(uiCss, /\.select-base-popper\s*\{/, 'shared select dropdown popper template is missing');
assert.match(uiCss, /\.select-base-popper\s+\.el-select-dropdown__item\.is-selected[\s\S]*background:\s*#dbeafe/, 'shared select dropdown selected style should be light blue');

assert.match(financeReport, /popper-class="select-base-popper"/, 'finance report selects should use the shared select popper');
assert.match(productLibrary, /popper-class="select-base-popper"/, 'product library status select should use the shared select popper');

assert.match(productManagement, /AppDeleteConfirmDialog/, 'archive confirmation should reuse AppDeleteConfirmDialog');
assert.doesNotMatch(productManagement, /ElMessageBox\.confirm/, 'archive confirmation should not use Element Plus MessageBox confirm');
assert.match(productManagement, /archiveConfirmVisible/, 'archive confirmation state should be explicit and template-driven');
assert.match(productManagement, /确认归档/, 'archive confirmation copy should keep the original user-facing title');

console.log('selectTemplateAndArchiveConfirm checks passed');
