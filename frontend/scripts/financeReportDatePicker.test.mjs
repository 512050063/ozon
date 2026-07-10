import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = [
  'src/views/ozon/finance-report/Index.vue',
  'src/views/ozon/finance-report/components/FinanceReportToolbar.vue',
].map(file => readFileSync(file, 'utf8')).join('\n');

assert.doesNotMatch(source, /v-model="datePreset"/, 'finance report must not use the old preset date select');
assert.doesNotMatch(source, /const\s+datePreset\s*=/, 'finance report date state should be a concrete range, not a preset');
assert.match(source, /ozon-period-trigger/, 'finance report needs an Ozon-like period trigger button');
assert.match(source, /periodPickerOpen/, 'finance report needs a custom period popover state');
assert.match(source, /periodLabel/, 'finance report needs a formatted period label');
assert.match(source, /visibleCalendarMonths/, 'finance report needs two visible calendar months');
assert.match(source, /quickMonthRanges/, 'finance report needs right-side quick month shortcuts');
assert.match(source, /selectCalendarDay/, 'finance report needs day range selection logic');
assert.match(source, /applyQuickMonth/, 'finance report needs quick month selection logic');
assert.match(source, /MAX_FINANCE_PERIOD_DAYS\s*=\s*31/, 'finance period picker should cap selectable ranges at Ozon one-month API limit');
assert.match(source, /选择范围最长\s*\$\{MAX_FINANCE_PERIOD_DAYS\}\s*天/, 'finance period picker should tell users about the one-month range limit');
assert.match(source, /QUICK_MONTH_LIMIT\s*=\s*12/, 'finance period picker should offer up to 12 quick months');
assert.match(source, /minSelectableDate/, 'finance period picker should know the first bill date lower bound');
assert.match(source, /isCalendarDayDisabled/, 'finance period picker should centralize disabled day rules');
assert.match(source, /getCalendarDayDisabledReason/, 'finance period picker should expose disabled reasons for tooltips');
assert.match(source, /firstRecordDate/, 'finance period picker should use backend first bill date metadata');
assert.match(source, /\.ozon-period-trigger\s*\{[\s\S]*width:\s*280px;/, 'finance period trigger should show the full date range');
assert.match(source, /\.ozon-period-trigger\s*\{[\s\S]*height:\s*32px;/, 'finance period trigger should match the adjacent select height');
assert.match(source, /\.ozon-period-trigger\s*\{[\s\S]*background:\s*#f8fafc;/, 'finance period trigger should match the adjacent select background');
assert.match(source, /\.ozon-period-trigger\s*\{[\s\S]*border:\s*1px solid #dbe3ef;/, 'finance period trigger should match the adjacent select border');
assert.doesNotMatch(source, /0 0 0 3px rgba\(0,\s*91,\s*255,\s*0\.1\)/, 'finance period trigger should not use a thick blue focus ring');
assert.match(source, /\.ozon-period-popover\s*\{[\s\S]*width:\s*min\(660px,\s*calc\(100vw - 56px\)\);/, 'finance period popover should be compact');
assert.match(source, /\.ozon-quick-months\s*\{[\s\S]*max-height:\s*238px;[\s\S]*overflow-y:\s*auto;/, 'quick months should scroll instead of stretching the popover');
assert.match(source, /\.type-select\s*\{\s*width:\s*150px;\s*\}/, 'finance type dropdown should stay compact');
assert.match(source, /color:\s*#475569;[\s\S]*font-weight:\s*700;/, 'finance picker text should use bold typography');
assert.match(source, /\.ozon-calendar-day\s*\{[\s\S]*font-size:\s*13px;/, 'finance calendar day numbers should stay compact');
assert.doesNotMatch(source, /\.ozon-calendar-day span\s*\{[^}]*border-radius:\s*50%;/, 'finance selected dates should not use circular day pills');
assert.match(source, /is-range-row-start/, 'finance date range rows should mark rounded row starts');
assert.match(source, /is-range-row-end/, 'finance date range rows should mark rounded row ends');
assert.match(source, /\.ozon-calendar-day\.is-selected-start span,[\s\S]*\.ozon-calendar-day\.is-selected-end span\s*\{[\s\S]*border-radius:\s*8px;/, 'finance selected dates should use rounded square day pills');
assert.match(source, /FILTER_SKELETON_MIN_MS\s*=\s*280/, 'finance filters should keep skeleton loading visible briefly');
assert.match(source, /function\s+delayFilterSkeleton/, 'finance filters should have a minimum skeleton delay helper');
assert.match(source, /function\s+onSearch\(\)\s*\{[\s\S]*fetchPostings\(\{\s*minimumSkeletonMs:\s*FILTER_SKELETON_MIN_MS\s*\}\)/, 'type filter changes should use skeleton transition');
assert.match(source, /function\s+applySelectedDateRange[\s\S]*fetchPostings\(\{\s*minimumSkeletonMs:\s*FILTER_SKELETON_MIN_MS\s*\}\)/, 'date range changes should use skeleton transition');
assert.match(source, /return\s+\{\s*date_from:\s*selectedDateRange\.value\.from,\s*date_to:\s*selectedDateRange\.value\.to\s*\}/, 'finance report API dates must come from the selected range');

console.log('financeReportDatePicker.test passed');
