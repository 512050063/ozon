<template>
  <div class="stats-section">
    <template v-if="loadingTotals">
      <div class="finance-stats-skeleton">
        <AppSkeletonLoader variant="finance" />
      </div>
    </template>

    <template v-else-if="totals">
      <div :class="['ozon-stats-layout', { 'is-collapsed': !expanded }]">
        <div class="ozon-card ozon-total-card finance-summary-card">
          <div class="summary-main">
            <div class="ozon-card-label">
              <span class="finance-stat-icon total-icon">
                <el-icon><WalletFilled /></el-icon>
              </span>
              <span>总计</span>
            </div>
            <div :class="['ozon-big-amount total-amount', amountToneClass(netTotal)]">
              {{ signedAmt(netTotal) }} <span class="currency-symbol">₽</span>
            </div>
          </div>
          <div class="summary-side">
            <div class="summary-side-label">期初欠款</div>
            <div class="ozon-sub-line">
              <span :class="['ozon-sub-amount', amountToneClass(totals.opening_debt || 0)]">
                {{ signedAmt(totals.opening_debt || 0) }} ₽
              </span>
            </div>
          </div>
        </div>

        <transition name="finance-summary-details">
          <div v-show="expanded" class="finance-summary-extra">
            <div class="ozon-card ozon-sales-card">
              <div class="ozon-card-label">
                <span class="finance-stat-icon sales-icon">
                  <el-icon><TrendCharts /></el-icon>
                </span>
                <span>销售和退货</span>
              </div>
              <div :class="['ozon-big-amount', amountToneClass(salesAndReturns)]">
                {{ signedAmt(salesAndReturns) }} ₽
              </div>
              <div class="ozon-progress-bar sales-bar">
                <div class="ozon-progress-fill" :style="{ width: salesBarWidth + '%' }" />
              </div>
              <div class="ozon-detail-rows">
                <div class="ozon-detail-row">
                  <span class="ozon-dot dot-teal" />
                  <span class="ozon-detail-name">收入</span>
                  <span :class="['ozon-detail-val', amountToneClass(totals.sales_income ?? totals.accruals_for_sale)]">
                    {{ fmtAmt(totals.sales_income ?? totals.accruals_for_sale) }} ₽
                  </span>
                </div>
                <div class="ozon-detail-row">
                  <span class="ozon-dot dot-light-green" />
                  <span class="ozon-detail-name">合作伙伴的计划</span>
                  <span :class="['ozon-detail-val', amountToneClass(totals.partner_program || 0)]">
                    {{ fmtAmt(totals.partner_program || 0) }} ₽
                  </span>
                </div>
                <div class="ozon-detail-row">
                  <span class="ozon-dot dot-gray" />
                  <span class="ozon-detail-name">折扣积分</span>
                  <span :class="['ozon-detail-val', amountToneClass(totals.discount_points || 0)]">
                    {{ fmtAmt(totals.discount_points || 0) }}
                  </span>
                </div>
                <div class="ozon-detail-row">
                  <span class="ozon-dot dot-red" />
                  <span class="ozon-detail-name">退款和取消</span>
                  <span :class="['ozon-detail-val', amountToneClass(totals.refunds_and_cancellations)]">
                    {{ fmtAmt(Math.abs(totals.refunds_and_cancellations)) }} ₽
                  </span>
                </div>
                <div class="ozon-detail-row">
                  <span class="ozon-dot dot-amber" />
                  <span class="ozon-detail-name">赔偿</span>
                  <span :class="['ozon-detail-val', amountToneClass(totals.compensation_amount)]">
                    {{ fmtAmt(Math.abs(totals.compensation_amount)) }} ₽
                  </span>
                </div>
              </div>
            </div>

            <div class="ozon-card ozon-expense-card">
              <div class="ozon-card-label">
                <span class="finance-stat-icon expense-icon">
                  <el-icon><CreditCard /></el-icon>
                </span>
                <span>应计费用</span>
              </div>
              <div :class="['ozon-big-amount', amountToneClass(totalExpense)]">
                {{ formatExpenseAmount(totalExpense) }} ₽
              </div>
              <div class="ozon-progress-bar expense-bar">
                <div class="ozon-progress-fill" :style="{ width: expenseBarWidth + '%' }" />
              </div>
              <div class="ozon-expense-grid">
                <div v-for="row in expenseRows" :key="row.label" class="ozon-expense-item">
                  <span class="ozon-expense-dot" :style="{ background: row.color }" />
                  <span class="ozon-expense-name" :title="row.label">{{ row.label }}</span>
                  <span :class="['ozon-expense-val', amountToneClass(row.value)]">
                    {{ formatExpenseAmount(row.value) }} ₽
                  </span>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <button
          type="button"
          :class="['finance-summary-toggle', { 'is-expanded': expanded }]"
          @click="$emit('toggle-summary')"
        >
          <span>{{ expanded ? '收起' : '查看全部' }}</span>
          <el-icon class="finance-summary-toggle-icon"><ArrowDown /></el-icon>
        </button>
      </div>
    </template>

    <div v-if="!loadingTotals && !totals" class="no-data-hint">
      <el-icon class="text-4xl text-slate-300 mb-3"><Document /></el-icon>
      <p class="text-slate-500 font-medium">暂无财务数据</p>
      <p class="text-slate-400 text-sm mt-1">请点击右上角「财报同步」从 Ozon 拉取数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, CreditCard, Document, TrendCharts, WalletFilled } from '@element-plus/icons-vue';
import { AppSkeletonLoader } from '@/components/ui';
import type { FinanceTotals } from '@/api/ozonFinanceAPI';

type AmountTone = 'positive' | 'negative' | 'neutral';
type ExpenseRow = {
  label: string;
  value: number;
  color: string;
};

defineProps<{
  loadingTotals: boolean;
  totals: FinanceTotals | null;
  expanded: boolean;
  netTotal: number;
  salesAndReturns: number;
  totalExpense: number;
  salesBarWidth: number;
  expenseBarWidth: number;
  expenseRows: ExpenseRow[];
  amountToneClass: (value?: number | null) => AmountTone;
  signedAmt: (value?: number | null) => string;
  fmtAmt: (value?: number | null) => string;
  formatExpenseAmount: (value?: number | null) => string;
}>();

defineEmits<{
  (event: 'toggle-summary'): void;
}>();
</script>

<style scoped>
.stats-section {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(203, 213, 225, 0.48);
  background: #ffffff;
  box-shadow: none;
}

.stats-section::before,
.stats-section::after {
  display: none;
}

.ozon-stats-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.35fr);
  min-width: 0;
  overflow: hidden;
  min-height: 0;
}

.ozon-stats-layout.is-collapsed {
  grid-template-columns: minmax(0, 1fr);
}

.ozon-card {
  padding: 18px 26px;
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;
}

.ozon-card-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.finance-stat-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 13px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78), 0 6px 14px rgba(15, 23, 42, 0.08);
}

.total-icon {
  color: #2563eb;
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.92), rgba(239, 246, 255, 0.8));
}

.sales-icon {
  color: #0d9488;
  background: linear-gradient(135deg, rgba(204, 251, 241, 0.95), rgba(240, 253, 250, 0.82));
}

.expense-icon {
  color: #db2777;
  background: linear-gradient(135deg, rgba(252, 231, 243, 0.95), rgba(253, 242, 248, 0.8));
}

.ozon-big-amount {
  font-size: 25px;
  font-weight: 800;
  letter-spacing: 0;
  margin-bottom: 12px;
  line-height: 1.1;
}

.finance-summary-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 58%, #f1f5f9 100%);
}

.summary-main,
.summary-side {
  display: flex;
  flex-direction: column;
}

.summary-side {
  align-items: flex-end;
  gap: 5px;
  min-width: 138px;
  padding: 8px 12px;
  border-radius: 11px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.94), rgba(239, 246, 255, 0.72));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.summary-side-label {
  font-size: 11px;
  color: #94a3b8;
}

.finance-summary-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  position: absolute;
  right: 24px;
  bottom: 18px;
  z-index: 2;
  height: 20px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  line-height: 20px;
  cursor: pointer;
  transition:
    color 0.18s ease,
    transform 0.18s ease;
}

.finance-summary-toggle:hover {
  color: #1d4ed8;
  transform: translateY(-0.5px);
}

.finance-summary-toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  font-size: 12px;
  line-height: 1;
  transform-origin: center;
  transition: transform 0.2s ease;
}

.finance-summary-toggle.is-expanded .finance-summary-toggle-icon {
  transform: rotate(180deg);
}

.total-amount {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.currency-symbol {
  font-size: 0.92em;
}

.ozon-sub-line {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.ozon-sub-amount {
  font-weight: 600;
  color: #1e293b;
}

.ozon-total-card {
  grid-column: 1 / -1;
  border-bottom: 1px solid rgba(203, 213, 225, 0.34);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}

.ozon-stats-layout.is-collapsed .ozon-total-card {
  min-height: 86px;
  padding-right: 116px;
  border-bottom: 0;
}

.finance-summary-extra {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.35fr);
  min-width: 0;
  overflow: hidden;
}

.ozon-sales-card {
  border-right: 1px solid rgba(203, 213, 225, 0.32);
}

.ozon-sales-card,
.ozon-expense-card {
  background: #ffffff;
  padding-bottom: 38px;
}

.ozon-expense-card {
  height: 100%;
}

.ozon-progress-bar {
  height: 1px;
  background: rgba(226, 232, 240, 0.48);
  border-radius: 999px;
  margin-bottom: 12px;
  overflow: hidden;
}

.ozon-progress-fill {
  position: relative;
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s ease;
  overflow: hidden;
}

.ozon-progress-fill::after {
  content: "";
  position: absolute;
  inset: 0;
  width: 42%;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.62), transparent);
  animation: financeProgressSweep 2.8s ease-in-out infinite;
}

@keyframes financeProgressSweep {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(260%);
  }
}

.sales-bar .ozon-progress-fill {
  background: linear-gradient(90deg, #0d9488, #14b8a6);
}

.expense-bar .ozon-progress-fill {
  background: linear-gradient(90deg, #db2777, #f472b6);
}

.finance-summary-details-enter-active,
.finance-summary-details-leave-active {
  overflow: hidden;
  transition:
    max-height 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s ease,
    transform 0.24s ease;
}

.finance-summary-details-enter-to,
.finance-summary-details-leave-from {
  max-height: 260px;
}

.finance-summary-details-enter-from,
.finance-summary-details-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-6px);
}

.ozon-detail-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ozon-detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  padding: 4px 9px;
  border-radius: 8px;
  font-size: 12px;
}

.ozon-detail-name {
  color: #475569;
  flex: 1;
}

.ozon-detail-val {
  font-weight: 600;
  color: #1e293b;
  font-family: monospace;
  font-size: 12px;
}

.ozon-detail-val.negative { color: var(--finance-amount-negative); }
.ozon-detail-val.positive { color: var(--finance-amount-positive); }
.ozon-detail-val.neutral { color: var(--finance-amount-neutral); }

.ozon-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.12);
}

.dot-teal { background: #0d9488; }
.dot-light-green { background: #14b8a6; }
.dot-gray { background: #94a3b8; }
.dot-red { background: #ef4444; }
.dot-amber { background: #f59e0b; }

.ozon-expense-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 6px 12px;
  min-width: 0;
}

.ozon-expense-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 24px;
  padding: 4px 9px;
  border-radius: 8px;
  font-size: 12px;
}

.ozon-expense-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.12);
}

.ozon-expense-name {
  flex: 1;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ozon-expense-val {
  font-weight: 600;
  color: #1e293b;
  font-family: monospace;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.positive { color: var(--finance-amount-positive); }
.negative { color: var(--finance-amount-negative); }
.neutral { color: var(--finance-amount-neutral); }

.finance-stats-skeleton {
  height: 106px;
  min-height: 106px;
  padding: 18px 26px;
  box-sizing: border-box;
  overflow: hidden;
}

.finance-stats-skeleton :deep(.app-skeleton) {
  height: 100%;
  overflow: hidden;
}

.finance-stats-skeleton :deep(.app-skeleton-finance-head) {
  margin-bottom: 12px;
}

.finance-stats-skeleton :deep(.app-skeleton-finance-grid) {
  display: grid;
  grid-template-columns: minmax(0, 0.58fr) minmax(180px, 0.28fr);
  gap: 28px;
  align-items: center;
}

.finance-stats-skeleton :deep(.app-skeleton-finance-card) {
  gap: 10px;
}

.finance-stats-skeleton :deep(.app-skeleton-finance-card:not(:first-child)) {
  display: none;
}

.finance-stats-skeleton :deep(.app-skeleton-finance-card--wide) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(140px, 0.35fr);
  column-gap: 24px;
  row-gap: 8px;
  align-items: center;
}

.finance-stats-skeleton :deep(.app-skeleton-finance-card--wide .app-skeleton-block--sm) {
  width: 88px;
  height: 14px;
}

.finance-stats-skeleton :deep(.app-skeleton-finance-card--wide .app-skeleton-block--title) {
  width: 230px;
  height: 24px;
}

.finance-stats-skeleton :deep(.app-skeleton-finance-card--wide .app-skeleton-block--line) {
  width: 70%;
  height: 12px;
}

.finance-stats-skeleton :deep(.app-skeleton-finance-card--wide .app-skeleton-block--short) {
  width: 54%;
  height: 12px;
}

.no-data-hint {
  background: #fff;
  border: 1px dashed #e2e8f0;
  border-radius: 14px;
  min-height: 128px;
  padding: 18px 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.no-data-hint :deep(.el-icon) {
  font-size: 28px;
  margin-bottom: 8px;
}

.no-data-hint p:first-of-type {
  margin: 0 0 6px;
  font-size: 13px !important;
  line-height: 1.4;
  font-weight: 600;
  color: #334155 !important;
}

.no-data-hint p:last-of-type {
  margin: 0;
  font-size: 12px !important;
  line-height: 1.5;
  font-weight: 400;
  color: #94a3b8 !important;
}

@media (max-width: 1100px) {
  .ozon-stats-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .ozon-sales-card {
    border-right: none;
    border-bottom: 1px solid rgba(203, 213, 225, 0.32);
  }

  .ozon-total-card {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
