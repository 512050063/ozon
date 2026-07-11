<template>
  <MainLayout>
    <div class="app-page app-page-stack app-page--fixed finance-report-page">
      <div class="finance-page">
        <FinanceSummarySection
          :loading-totals="loadingTotals"
          :totals="totals"
          :expanded="financeSummaryExpanded"
          :net-total="netTotal"
          :sales-and-returns="salesAndReturns"
          :total-expense="totalExpense"
          :expense-split="expenseSplit"
          :sales-bar-width="salesBarWidth"
          :sales-bar-gradient="salesBarGradient"
          :sales-rows="salesRows"
          :expense-negative-bar-width="expenseNegativeBarWidth"
          :expense-positive-bar-width="expensePositiveBarWidth"
          :expense-negative-bar-gradient="expenseNegativeBarGradient"
          :expense-positive-bar-gradient="expensePositiveBarGradient"
          :expense-rows="expenseRowsFull"
          :amount-tone-class="amountToneClass"
          :signed-amt="signedAmt"
          :fmt-amt="fmtAmt"
          :format-expense-amount="formatExpenseAmount"
          @toggle-summary="toggleFinanceSummaryExpanded"
        />

        <div class="finance-table-panel app-page-table-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <FinanceReportToolbar
            v-model:posting-type="postingType"
            :period-picker-open="periodPickerOpen"
            :period-label="periodLabel"
            :visible-calendar-months="visibleCalendarMonths"
            :week-day-labels="weekDayLabels"
            :quick-month-ranges="quickMonthRanges"
            :is-sync-updating="isSyncUpdating"
            :sync-progress="syncProgress"
            :selected-store-id="selectedStoreId"
            :last-update-time="syncMeta.lastSyncDate"
            :sync-visual-status="syncVisualStatus"
            :module="FINANCE_REPORT_MODULE"
            :get-calendar-day-class="getCalendarDayClass"
            :is-quick-month-active="isQuickMonthActive"
            @toggle-period-picker="togglePeriodPicker"
            @close-period-picker="periodPickerOpen = false"
            @navigate-month="navigatePickerMonth"
            @select-day="selectCalendarDay"
            @apply-quick-month="applyQuickMonth"
            @search="onSearch"
            @sync="doSync"
            @open-sync-log="openSyncLogDialog"
          />

          <FinancePostingTable
            v-model:current-page="currentPage"
            :loading-postings="loadingPostings"
            :grouped-items="groupedItems"
            :expanded-groups="expandedGroups"
            :sort-desc="sortDesc"
            :total-records="syncMeta.totalRecords"
            :page-size="pageSize"
            :postings-total="postingsTotal"
            :row-index="rowIndex"
            :display-accrual-id="displayAccrualId"
            :display-finance-product-name="displayFinanceProductName"
            :fmt-date-table="fmtDateTable"
            :group-net-amount="groupNetAmount"
            :amount-tone-class="amountToneClass"
            :signed-amt="signedAmt"
            @toggle-sort="toggleSort"
            @toggle-group="toggleGroup"
            @page-change="fetchPostings"
          />
        </div>
      </div>
    </div>
    <AppDetailDialog
      v-model="showSyncLogModal"
      title="财务同步记录"
      subtitle="查看财务报告同步明细"
      :data="syncLogList"
      :total="syncLogTotal"
      :current-page="syncLogPage"
      :page-size="syncLogPageSize"
      :fetching="syncLogLoading"
      @page-change="fetchSyncLogs"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { ElMessage } from 'element-plus';
import MainLayout from '@/components/MainLayout.vue';
import AppDetailDialog from '@/components/ui/AppDetailDialog.vue';
import FinancePostingTable from './components/FinancePostingTable.vue';
import FinanceReportToolbar from './components/FinanceReportToolbar.vue';
import FinanceSummarySection from './components/FinanceSummarySection.vue';
import { ozonFinanceAPI, type FinanceExpenseRow, type FinanceExpenseSplit, type FinanceTotals, type PostingGroupItem, type SyncMeta, type FinanceSyncLogItem } from '@/api/ozonFinanceAPI';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
import { useUpdateStore } from '@/store/updateStore';
import { useProductNameTranslations } from '@/composables/useProductNameTranslations';

const selectedStoreId = ref<number | null>(null);
const loadingStores = ref(true);
const updateStore = useUpdateStore();
const FINANCE_REPORT_MODULE = 'finance-report';
const FILTER_SKELETON_MIN_MS = 280;
const { loadStoreContext, storeContext } = useOzonStoreContext();
const { getTranslatedName, resolveNames } = useProductNameTranslations();
const storeContextReady = ref(false);

type DateRange = { from: string; to: string };
type PendingDateRange = { from: string | null; to: string | null };
type CalendarDay = {
  key: string;
  date: Date | null;
  day: number;
  value: string | null;
  disabled: boolean;
  disabledReason: string;
  isWeekend: boolean;
};
type QuickMonthRange = DateRange & { key: string; label: string };

const MAX_FINANCE_PERIOD_DAYS = 31;
const QUICK_MONTH_LIMIT = 12;
const weekDayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const periodPickerOpen = ref(false);

function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

function parseDateParam(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function compareDateParams(a: string, b: string): number {
  return parseDateParam(a).getTime() - parseDateParam(b).getTime();
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

function formatPeriodDate(value: string): string {
  const date = parseDateParam(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

function createDefaultDateRange(): DateRange {
  const today = startOfDay(new Date());
  return {
    from: formatDateParam(startOfMonth(today)),
    to: formatDateParam(today),
  };
}

const selectedDateRange = ref<DateRange>(createDefaultDateRange());
const pendingDateRange = ref<PendingDateRange>({
  from: selectedDateRange.value.from,
  to: selectedDateRange.value.to,
});
const pickerMonth = ref(startOfMonth(parseDateParam(selectedDateRange.value.from)));

function buildDates(): { date_from: string; date_to: string } {
  return { date_from: selectedDateRange.value.from, date_to: selectedDateRange.value.to };
}

const periodLabel = computed(() => `时期： ${formatPeriodDate(selectedDateRange.value.from)} – ${formatPeriodDate(selectedDateRange.value.to)}`);

const minSelectableDate = computed(() => {
  const firstRecordDate = syncMeta.value.firstRecordDate;
  return firstRecordDate ? startOfDay(parseDateParam(firstRecordDate)) : null;
});

const maxSelectableDate = computed(() => startOfDay(new Date()));

const visibleCalendarMonths = computed(() => [
  buildCalendarMonth(pickerMonth.value),
  buildCalendarMonth(addMonths(pickerMonth.value, 1)),
]);

const quickMonthRanges = computed<QuickMonthRange[]>(() => {
  const today = maxSelectableDate.value;
  const firstDate = minSelectableDate.value;
  const currentMonth = startOfMonth(today);
  const ranges: QuickMonthRange[] = [];

  for (let index = 0; index < QUICK_MONTH_LIMIT; index += 1) {
    const monthStart = addMonths(currentMonth, -index);
    const monthLastDay = endOfMonth(monthStart);
    if (firstDate && monthLastDay.getTime() < firstDate.getTime()) continue;

    const rangeStart = firstDate ? maxDate(monthStart, firstDate) : monthStart;
    const monthEnd = index === 0 ? today : endOfMonth(monthStart);
    ranges.push({
      key: formatDateParam(monthStart),
      label: monthNames[monthStart.getMonth()],
      from: formatDateParam(rangeStart),
      to: formatDateParam(monthEnd),
    });
  }

  return ranges;
});

function getCalendarDayDisabledReason(value: string): string {
  const date = parseDateParam(value);
  const minDateValue = minSelectableDate.value;
  const maxDateValue = maxSelectableDate.value;

  if (date.getTime() > maxDateValue.getTime()) return '超过今日，暂不可选择';
  if (minDateValue && date.getTime() < minDateValue.getTime()) return '早于第一笔账单，暂不可选择';

  const pendingStart = pendingDateRange.value.from && !pendingDateRange.value.to
    ? parseDateParam(pendingDateRange.value.from)
    : null;
  if (pendingStart) {
    const minRangeDate = minDateValue
      ? maxDate(addDays(pendingStart, -(MAX_FINANCE_PERIOD_DAYS - 1)), minDateValue)
      : addDays(pendingStart, -(MAX_FINANCE_PERIOD_DAYS - 1));
    const maxRangeDate = minDate(addDays(pendingStart, MAX_FINANCE_PERIOD_DAYS - 1), maxDateValue);
    if (date.getTime() < minRangeDate.getTime() || date.getTime() > maxRangeDate.getTime()) {
      return `选择范围最长 ${MAX_FINANCE_PERIOD_DAYS} 天`;
    }
  }

  return '';
}

function isCalendarDayDisabled(value: string): boolean {
  return Boolean(getCalendarDayDisabledReason(value));
}

function buildCalendarMonth(monthStart: Date) {
  const firstDayIndex = (monthStart.getDay() + 6) % 7;
  const totalDays = endOfMonth(monthStart).getDate();
  const days: CalendarDay[] = [];

  for (let i = 0; i < firstDayIndex; i += 1) {
    days.push({
      key: `${formatDateParam(monthStart)}-blank-${i}`,
      date: null,
      day: 0,
      value: null,
      disabled: true,
      disabledReason: '',
      isWeekend: false,
    });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    const value = formatDateParam(date);
    const weekDay = date.getDay();
    days.push({
      key: value,
      date,
      day,
      value,
      disabled: isCalendarDayDisabled(value),
      disabledReason: getCalendarDayDisabledReason(value),
      isWeekend: weekDay === 0 || weekDay === 6,
    });
  }

  while (days.length % 7 !== 0) {
    days.push({
      key: `${formatDateParam(monthStart)}-tail-${days.length}`,
      date: null,
      day: 0,
      value: null,
      disabled: true,
      disabledReason: '',
      isWeekend: false,
    });
  }

  return {
    key: formatDateParam(monthStart),
    title: `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}年`,
    days,
  };
}

function getActiveRange(): PendingDateRange {
  return {
    from: pendingDateRange.value.from || selectedDateRange.value.from,
    to: pendingDateRange.value.to,
  };
}

function getCalendarDayClass(day: CalendarDay) {
  const range = getActiveRange();
  const from = range.from;
  const to = range.to;
  const value = day.value || '';
  const isSelectedStart = Boolean(from && value === from);
  const isSelectedEnd = Boolean(to && value === to);
  const isInRange = Boolean(from && to && compareDateParams(value, from) > 0 && compareDateParams(value, to) < 0);
  const isCompleteRange = Boolean(from && to && from !== to);
  const isRangeDay = isCompleteRange && (isSelectedStart || isSelectedEnd || isInRange);
  const weekDayIndex = day.date ? (day.date.getDay() + 6) % 7 : -1;

  return [
    'ozon-calendar-day',
    {
      'is-weekend': day.isWeekend,
      'is-disabled': day.disabled,
      'is-selected-start': isSelectedStart,
      'is-selected-end': isSelectedEnd,
      'is-in-range': isInRange,
      'is-single-selected': isSelectedStart && (!to || from === to),
      'is-range-row-start': isRangeDay && (isSelectedStart || weekDayIndex === 0),
      'is-range-row-end': isRangeDay && (isSelectedEnd || weekDayIndex === 6),
    },
  ];
}

function applySelectedDateRange(from: string, to: string) {
  const nextRange = compareDateParams(from, to) <= 0
    ? { from, to }
    : { from: to, to: from };
  selectedDateRange.value = nextRange;
  pendingDateRange.value = { ...nextRange };
  periodPickerOpen.value = false;
  currentPage.value = 1;
  fetchTotals();
  fetchPostings({ minimumSkeletonMs: FILTER_SKELETON_MIN_MS });
}

function togglePeriodPicker() {
  if (!periodPickerOpen.value) {
    pendingDateRange.value = { ...selectedDateRange.value };
    pickerMonth.value = startOfMonth(parseDateParam(selectedDateRange.value.from));
  }
  periodPickerOpen.value = !periodPickerOpen.value;
}

function navigatePickerMonth(direction: number) {
  pickerMonth.value = addMonths(pickerMonth.value, direction);
}

function selectCalendarDay(day: CalendarDay) {
  if (!day.value || day.disabled) return;

  if (!pendingDateRange.value.from || pendingDateRange.value.to) {
    pendingDateRange.value = { from: day.value, to: null };
    return;
  }

  applySelectedDateRange(pendingDateRange.value.from, day.value);
}

function applyQuickMonth(month: QuickMonthRange) {
  pickerMonth.value = startOfMonth(parseDateParam(month.from));
  applySelectedDateRange(month.from, month.to);
}

function isQuickMonthActive(month: QuickMonthRange): boolean {
  return selectedDateRange.value.from === month.from && selectedDateRange.value.to === month.to;
}

function delayFilterSkeleton(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeSelectedRangeToBounds() {
  const minDateValue = minSelectableDate.value;
  const maxDateValue = maxSelectableDate.value;
  let from = parseDateParam(selectedDateRange.value.from);
  let to = parseDateParam(selectedDateRange.value.to);

  if (minDateValue) {
    from = maxDate(from, minDateValue);
    to = maxDate(to, minDateValue);
  }
  from = minDate(from, maxDateValue);
  to = minDate(to, maxDateValue);

  if (to.getTime() < from.getTime()) to = from;

  const nextRange = {
    from: formatDateParam(from),
    to: formatDateParam(to),
  };
  if (nextRange.from !== selectedDateRange.value.from || nextRange.to !== selectedDateRange.value.to) {
    selectedDateRange.value = nextRange;
    pendingDateRange.value = { ...nextRange };
    pickerMonth.value = startOfMonth(from);
  }
}

// ─── 筛选 ──────────────────────────────────────────────
const postingType = ref('');
const pageSize = ref(50);
const currentPage = ref(1);
const sortDesc = ref(true);

// ─── 数据 ──────────────────────────────────────────────
const totals = ref<FinanceTotals | null>(null);
const categories = ref<Array<{ type: string; operation_type_name: string; operation_type_name_zh?: string; accruals_for_sale: number; count: number }>>([]);
const backendExpenseRows = ref<FinanceExpenseRow[]>([]);
const backendExpenseSplit = ref<FinanceExpenseSplit | null>(null);
const groupedItems = ref<PostingGroupItem[]>([]);
const postingsTotal = ref(0);
const totalOperations = ref(0);
const syncMeta = ref<SyncMeta>({ lastSyncDate: null, firstRecordDate: null, totalRecords: 0 });
const loadingTotals = ref(false);
const loadingPostings = ref(false);
const syncProgress = ref('同步中...');
const showSyncLogModal = ref(false);
const syncLogList = ref<FinanceSyncLogItem[]>([]);
const syncLogTotal = ref(0);
const syncLogPage = ref(1);
const syncLogPageSize = ref(6);
const syncLogLoading = ref(false);
const syncPollCount = ref(0);
const syncPollTimer = ref<ReturnType<typeof setInterval> | null>(null);

// ─── 折叠展开 ──────────────────────────────────────────
const financeSummaryExpanded = ref(false);
const expandedGroups = ref(new Set<number>());

function toggleFinanceSummaryExpanded() {
  financeSummaryExpanded.value = !financeSummaryExpanded.value;
}

function toggleGroup(gi: number) {
  const s = new Set(expandedGroups.value);
  if (s.has(gi)) s.delete(gi); else s.add(gi);
  expandedGroups.value = s;
}

function groupNetAmount(item: PostingGroupItem): number {
  const mainAmt = item.main?.amount ?? 0;
  const childrenSum = (item.children || []).reduce((s: number, c: any) => s + (c.is_derived ? 0 : (c.amount || 0)), 0);
  return mainAmt + childrenSum;
}

function rowIndex(index: number): number {
  return (currentPage.value - 1) * pageSize.value + index + 1;
}

function displayAccrualId(operation?: { posting_number?: string | null } | null): string {
  return operation?.posting_number || '—';
}

// ─── 安全取值 ──────────────────────────────────────────
function safeNum(v?: number | null): number {
  return (v != null && !isNaN(v)) ? v : 0;
}

function roundSignedDisplayValue(v?: number | null): number {
  const n = safeNum(v);
  const rounded = Math.round(Math.abs(n));
  if (rounded === 0) return 0;
  return n < 0 ? -rounded : rounded;
}

function amountToneClass(v?: number | null): 'positive' | 'negative' | 'neutral' {
  const n = roundSignedDisplayValue(v);
  if (n > 0) return 'positive';
  if (n < 0) return 'negative';
  return 'neutral';
}

// ─── 统计计算 ──────────────────────────────────────────
// 应计项目净额：Ozon 里费用项可能为正（返还/调账），必须保留正负号。
const totalExpense = computed(() => {
  const val = expenseRowsFull.value.reduce((sum, row) => sum + safeNum(row.value), 0);
  return Math.round(val * 100) / 100;
});

const salesAndReturns = computed(() => {
  if (!totals.value) return 0;
  const val = safeNum(totals.value.accruals_for_sale);
  return Math.round(val * 100) / 100;
});

const expenseSplit = computed(() => {
  if (backendExpenseSplit.value) return backendExpenseSplit.value;
  const rows = expenseRowsFull.value;
  const positiveAmount = Math.round(rows.reduce((sum, row) => sum + Math.max(0, safeNum(row.value)), 0) * 100) / 100;
  const negativeAmount = Math.round(rows.reduce((sum, row) => sum + Math.min(0, safeNum(row.value)), 0) * 100) / 100;
  return { positiveAmount, negativeAmount };
});

const expenseRowColorMap = [
  '#3a7bd5',
  '#d48600',
  '#c83f78',
  '#2f6fdb',
  '#7567d8',
  '#2c9a8a',
  '#21a6a1',
  '#b36a2e',
  '#5d7ce2',
  '#9b59d0',
];

const expenseColorByLabel: Record<string, string> = {
  '其他服务与罚款': '#3a7bd5',
  '配送服务': '#d48600',
  '推广和广告': '#c83f78',
  'Ozon代理佣金': '#2f6fdb',
  '合作伙伴服务': '#7567d8',
  'WHD服务': '#2c9a8a',
  '赔偿和赔偿返还': '#9b59d0',
  '借贷和托收信贷': '#68a44c',
  'Ozon配送服务': '#5d7ce2',
  '其他应计项目': '#8a63d2',
};

function getExpenseRowColor(label: string, index: number): string {
  return expenseColorByLabel[label] || expenseRowColorMap[index % expenseRowColorMap.length];
}

const netTotal = computed(() => {
  if (!totals.value) return 0;
  return roundSignedDisplayValue(salesAndReturns.value)
    + roundSignedDisplayValue(totalExpense.value)
    + roundSignedDisplayValue(totals.value.opening_debt);
});

type SummaryColorRow = {
  label: string;
  value: number;
  color: string;
  currency?: boolean;
};

function buildSegmentGradient(rows: SummaryColorRow[], fallbackColor = '#cbd5e1'): string {
  const activeRows = rows.filter((row) => Math.abs(safeNum(row.value)) > 0);
  const total = activeRows.reduce((sum, row) => sum + Math.abs(safeNum(row.value)), 0);
  if (!total) return `linear-gradient(90deg, ${fallbackColor} 0%, ${fallbackColor} 100%)`;

  let cursor = 0;
  const stops: string[] = [];
  activeRows.forEach((row, index) => {
    const ratio = Math.abs(safeNum(row.value)) / total;
    const start = cursor;
    const end = index === activeRows.length - 1 ? 100 : Math.min(100, cursor + ratio * 100);
    stops.push(`${row.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
    cursor = end;
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

const salesRows = computed<SummaryColorRow[]>(() => {
  if (!totals.value) return [];
  return [
    {
      label: '收入',
      value: safeNum(totals.value.sales_income ?? totals.value.accruals_for_sale),
      color: '#0f8f84',
      currency: true,
    },
    {
      label: '合作伙伴的计划',
      value: safeNum(totals.value.partner_program),
      color: '#16a3a0',
      currency: true,
    },
    {
      label: '折扣积分',
      value: safeNum(totals.value.discount_points),
      color: '#78c79b',
      currency: false,
    },
  ];
});

// 统计条按当前模块内的明细项拼满 100%
const salesBarWidth = computed(() => {
  return salesRows.value.some((row) => Math.abs(safeNum(row.value)) > 0) ? 100 : 0;
});

const expenseNegativeBarWidth = computed(() => {
  return expenseRowsFull.value.some((row) => safeNum(row.value) < 0) ? 100 : 0;
});

const expensePositiveBarWidth = computed(() => {
  return expenseRowsFull.value.some((row) => safeNum(row.value) > 0) ? 100 : 0;
});

const salesBarGradient = computed(() => buildSegmentGradient(salesRows.value, '#cbd5e1'));

const isSyncUpdating = computed(() => updateStore.isUpdating(FINANCE_REPORT_MODULE));

const syncVisualStatus = computed<'success' | 'error' | 'idle'>(() => {
  if (!syncMeta.value.lastSyncDate) return 'idle';
  return 'success';
});

// ─── 费用明细行（10项，完全参考 Ozon 截图） ─────────────
// Ozon 截图中的10项（左列5项，右列5项）：
// 左：推广和广告 | 配送服务 | 其他服务与罚款 | WHD服务 | 其他应计项目
// 右：Ozon代理佣金 | 合作伙伴服务 | 赔偿和赔偿返还 | Ozon配送服务 | 借贷和托收信贷
const expenseRowsFull = computed(() => {
  if (backendExpenseRows.value.length > 0) {
    return [...backendExpenseRows.value]
      .map((row, index) => ({
        ...row,
        color: getExpenseRowColor(row.label, index),
      }))
      .sort((a, b) => Math.abs(safeNum(b.value)) - Math.abs(safeNum(a.value)));
  }
  if (!totals.value) return [];
  const t = totals.value;

  // services_amount 代表推广/广告
  const advertising = safeNum(t.services_amount);
  // processing_and_delivery 代表配送
  const delivery = safeNum(t.processing_and_delivery);
  // sale_commission 代表 Ozon 代理佣金
  const commission = safeNum(t.sale_commission);
  // compensation 赔偿
  const compensation = safeNum(t.compensation_amount);
  // others_amount 其他
  const others = safeNum(t.others_amount);

  const partnerService = safeNum(t.partner_services);
  const ozonDelivery = safeNum(t.ozon_delivery_services);
  const whdService = safeNum(t.whd_services);
  const credit = safeNum(t.credit_services);

  return [
    // 左列
    { label: '推广和广告',    value: advertising,           color: expenseColorByLabel['推广和广告'] },
    { label: '配送服务',      value: delivery,              color: expenseColorByLabel['配送服务'] },
    { label: '其他服务与罚款', value: others,                color: expenseColorByLabel['其他服务与罚款'] },
    { label: 'WHD服务',       value: whdService,             color: expenseColorByLabel['WHD服务'] },
    { label: '其他应计项目',   value: 0,                     color: expenseColorByLabel['其他应计项目'] },
    // 右列
    { label: 'Ozon代理佣金',   value: commission,            color: expenseColorByLabel['Ozon代理佣金'] },
    { label: '合作伙伴服务',   value: partnerService,         color: expenseColorByLabel['合作伙伴服务'] },
    { label: '赔偿和赔偿返还', value: compensation,           color: expenseColorByLabel['赔偿和赔偿返还'] },
    { label: 'Ozon配送服务',   value: ozonDelivery,           color: expenseColorByLabel['Ozon配送服务'] },
    { label: '借贷和托收信贷', value: credit,                 color: expenseColorByLabel['借贷和托收信贷'] },
  ].sort((a, b) => Math.abs(safeNum(b.value)) - Math.abs(safeNum(a.value)));
});

const expenseNegativeBarGradient = computed(() => {
  const rows = expenseRowsFull.value.filter((row) => safeNum(row.value) < 0);
  return buildSegmentGradient(rows, '#cbd5e1');
});

const expensePositiveBarGradient = computed(() => {
  const rows = expenseRowsFull.value.filter((row) => safeNum(row.value) > 0);
  return buildSegmentGradient(rows, '#e2e8f0');
});

// ─── 格式化 ────────────────────────────────────────────
function fmtAmt(v?: number | null): string {
  if (v == null || isNaN(v)) return '0';
  return Math.round(Math.abs(v)).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function signedAmt(v?: number | null): string {
  const n = roundSignedDisplayValue(v);
  if (n === 0) return '0';
  return `${n > 0 ? '+' : '−'}${fmtAmt(Math.abs(n))}`;
}

function formatExpenseAmount(v?: number | null): string {
  const n = roundSignedDisplayValue(v);
  if (n === 0) return '0';
  return `${n < 0 ? '−' : ''}${fmtAmt(Math.abs(n))}`;
}

function displayFinanceProductName(name?: string | null): string {
  const translated = getTranslatedName(name || '');
  return translated || '—';
}

function collectPostingProductNames(items: PostingGroupItem[]): string[] {
  const names: string[] = [];
  for (const item of items) {
    if (item.main?.items?.[0]?.name) names.push(item.main.items[0].name);
    if (item.operation?.items?.[0]?.name) names.push(item.operation.items[0].name);
    for (const child of item.children || []) {
      if (child.items?.[0]?.name) names.push(child.items[0].name);
    }
  }
  return names;
}

// 表格日期：DD.MM.YYYY 格式（对齐 Ozon 截图）
function fmtDateTable(v?: string | Date | null): string {
  if (!v) return '—';
  try {
    const d = new Date(v);
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const yr = d.getFullYear();
    return `${day}.${mon}.${yr}`;
  } catch { return String(v).slice(0, 10); }
}

// ─── 数据拉取 ──────────────────────────────────────────
async function fetchTotals() {
  if (!selectedStoreId.value) return;
  loadingTotals.value = true;
  try {
    const { date_from, date_to } = buildDates();
    const res = await ozonFinanceAPI.getTotals(selectedStoreId.value, date_from, date_to);
    if (res.success && res.data) {
      totals.value = res.data.totals;
      categories.value = res.data.categories || [];
      backendExpenseRows.value = res.data.expenseRows || [];
      backendExpenseSplit.value = res.data.expenseSplit || null;
      syncMeta.value = res.data.sync;
      normalizeSelectedRangeToBounds();
    }
  } catch {
  } finally {
    loadingTotals.value = false;
  }
}

async function fetchPostings(options: { minimumSkeletonMs?: number } = {}) {
  if (!selectedStoreId.value) return;
  const startedAt = Date.now();
  loadingPostings.value = true;
  try {
    const { date_from, date_to } = buildDates();
    const res = await ozonFinanceAPI.getPostings(selectedStoreId.value, {
      date_from, date_to,
      type: postingType.value || undefined,
      page: currentPage.value,
      page_size: pageSize.value,
    });
    if (res.success && res.data) {
      groupedItems.value = res.data.items || [];
      postingsTotal.value = res.data.total || 0;
      totalOperations.value = res.data.totalOperations || res.data.total || 0;
      expandedGroups.value = new Set();
      void resolveNames(collectPostingProductNames(groupedItems.value));
    }
  } catch {
  } finally {
    const remainingMs = Math.max(0, (options.minimumSkeletonMs || 0) - (Date.now() - startedAt));
    if (remainingMs > 0) {
      await delayFilterSkeleton(remainingMs);
    }
    loadingPostings.value = false;
  }
}

async function fetchSyncLogs(page: number = 1) {
  if (!selectedStoreId.value) return;
  syncLogLoading.value = true;
  try {
    const response = await ozonFinanceAPI.getSyncLogs(selectedStoreId.value, page, syncLogPageSize.value);
    if (response.success && response.data) {
      syncLogList.value = response.data.list;
      syncLogTotal.value = response.data.total;
      syncLogPage.value = response.data.page;
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取财务同步日志失败');
  } finally {
    syncLogLoading.value = false;
  }
}

function openSyncLogDialog() {
  showSyncLogModal.value = true;
  void fetchSyncLogs(1);
}

// ─── 同步 ──────────────────────────────────────────────
function stopSyncPolling() {
  if (syncPollTimer.value) {
    clearInterval(syncPollTimer.value);
    syncPollTimer.value = null;
  }
  syncPollCount.value = 0;
}

async function refreshFinancePageData() {
  await Promise.allSettled([
    fetchTotals(),
    fetchPostings(),
    showSyncLogModal.value ? fetchSyncLogs(1) : Promise.resolve(),
  ]);
}

async function checkSyncStatus(showCompletionMessage = false): Promise<boolean> {
  if (!selectedStoreId.value) return false;
  try {
    const prevCount = syncMeta.value.totalRecords;
    const response = await ozonFinanceAPI.getSyncStatus(selectedStoreId.value);
    if (!response.success || !response.data) return false;

    syncMeta.value = response.data;
    normalizeSelectedRangeToBounds();
    const hasCompleted = response.data.totalRecords > prevCount || (syncPollCount.value >= 12 && response.data.totalRecords > 0);

    if (hasCompleted) {
      stopSyncPolling();
      updateStore.stopUpdate(FINANCE_REPORT_MODULE);
      syncProgress.value = '同步中...';
      if (showCompletionMessage) {
        ElMessage.success(`同步完成，数据库共 ${response.data.totalRecords} 条记录`);
      }
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function startSyncPolling() {
  stopSyncPolling();
  syncPollTimer.value = setInterval(() => {
    void (async () => {
      syncPollCount.value += 1;
      syncProgress.value = `同步中${'.'.repeat((syncPollCount.value % 3) + 1)}`;
      const nextProgress = Math.min(90, 12 + syncPollCount.value * 4);
      updateStore.setUpdateProgress(FINANCE_REPORT_MODULE, nextProgress);

      const finished = await checkSyncStatus(true);
      if (finished) return;

      if (syncPollCount.value >= 36) {
        stopSyncPolling();
        updateStore.stopUpdate(FINANCE_REPORT_MODULE);
        syncProgress.value = '同步中...';
        ElMessage.warning('同步超时，请刷新页面查看数据');
      }
    })();
  }, 5000);
}

async function doSync() {
  if (!selectedStoreId.value) { ElMessage.warning('请先在顶部选择当前操作店铺'); return; }
  if (isSyncUpdating.value) return;

  updateStore.startUpdate(FINANCE_REPORT_MODULE, {
    scope: 'global',
    statusText: '正在更新',
    progress: 0,
  });
  syncProgress.value = '同步中...';
  try {
    const to = new Date();
    const from = new Date(to.getFullYear() - 2, 0, 1);
    await ozonFinanceAPI.sync(selectedStoreId.value, from.toISOString(), to.toISOString());
    updateStore.setUpdateProgress(FINANCE_REPORT_MODULE, 12);
    startSyncPolling();
  } catch (e: any) {
    ElMessage.error(e.message || '同步失败');
    updateStore.stopUpdate(FINANCE_REPORT_MODULE);
    syncProgress.value = '同步中...';
  }
}

// ─── 事件 ──────────────────────────────────────────────
function onSearch() { currentPage.value = 1; fetchPostings({ minimumSkeletonMs: FILTER_SKELETON_MIN_MS }); }
function toggleSort() { sortDesc.value = !sortDesc.value; fetchPostings({ minimumSkeletonMs: FILTER_SKELETON_MIN_MS }); }

const resetFinanceState = () => {
  totals.value = null;
  categories.value = [];
  backendExpenseRows.value = [];
  groupedItems.value = [];
  postingsTotal.value = 0;
  totalOperations.value = 0;
  syncMeta.value = { lastSyncDate: null, firstRecordDate: null, totalRecords: 0 };
};

const syncSelectedStoreContext = () => {
  selectedStoreId.value = storeContext.value?.resolvedStoreId ?? null;
};

// ─── 初始化 ────────────────────────────────────────────
onMounted(() => {
  void (async () => {
    try {
      const context = await loadStoreContext(true);
      syncSelectedStoreContext();
      if (context?.resolvedStoreId) {
        if (isSyncUpdating.value) {
          syncProgress.value = '同步中...';
          startSyncPolling();
        } else {
          fetchTotals();
          fetchPostings();
        }
      } else {
        resetFinanceState();
      }
    } catch {
    } finally {
      storeContextReady.value = true;
      loadingStores.value = false;
    }
  })();
});

watch(
  () => storeContext.value?.resolvedStoreId ?? null,
  async (nextStoreId, prevStoreId) => {
    syncSelectedStoreContext();
    if (!storeContextReady.value || nextStoreId === prevStoreId) {
      return;
    }

    currentPage.value = 1;
    if (nextStoreId) {
      if (isSyncUpdating.value) {
        if (!syncPollTimer.value) {
          startSyncPolling();
        }
      } else {
        await refreshFinancePageData();
      }
    } else {
      stopSyncPolling();
      resetFinanceState();
    }
  }
);

watch(isSyncUpdating, async (updating, wasUpdating) => {
  if (!wasUpdating || updating || !selectedStoreId.value) {
    return;
  }

  currentPage.value = 1;
  await refreshFinancePageData();
});

onBeforeUnmount(() => {
  stopSyncPolling();
});
</script>

<style scoped>
.finance-report-page {
  display: flex;
  flex-direction: column;
  height: var(--app-page-min-height);
  min-height: 0;
  overflow: visible;
  border-radius: 16px;
}

.finance-page {
  --finance-amount-positive: #15836d;
  --finance-amount-negative: #c84f62;
  --finance-amount-neutral: #5f6f86;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  flex: 1 1 auto;
  min-height: 0;
  height: auto;
  overflow: hidden;
}

.finance-table-panel {
  border-color: rgba(203, 213, 225, 0.82) !important;
  background: #ffffff !important;
  background-image: none !important;
  box-shadow: none !important;
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
}

@media (max-width: 960px) {
  .finance-report-page {
    height: auto;
    min-height: var(--app-page-min-height);
    overflow: visible;
  }

}
</style>




