<template>
  <div class="app-table-scroll app-page-table-scroll overflow-x-auto">
    <table class="data-table app-table">
      <colgroup>
        <col class="col-index">
        <col class="col-expand">
        <col class="col-id">
        <col class="col-name">
        <col class="col-group">
        <col class="col-type">
        <col class="col-date">
        <col class="col-amount">
      </colgroup>
      <thead class="app-page-table-head">
        <tr>
          <th class="app-table-th center">序号</th>
          <th class="app-table-th center"></th>
          <th class="app-table-th">应计费用ID</th>
          <th class="app-table-th">名称和货号</th>
          <th class="app-table-th">服务分组</th>
          <th class="app-table-th">应计项目类型</th>
          <th class="app-table-th sort-th" @click="$emit('toggle-sort')">
            累积日期
            <span class="sort-icon">{{ sortDesc ? '↓' : '↑' }}</span>
          </th>
          <th class="app-table-th right">金额</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loadingPostings">
          <td colspan="8" class="app-table-td empty-cell" style="border-bottom: none;">
            <div class="finance-table-skeleton">
              <AppSkeletonLoader variant="finance-table" :rows="6" compact />
            </div>
          </td>
        </tr>
        <tr v-else-if="groupedItems.length === 0">
          <td colspan="8" class="app-table-td empty-cell app-table-empty-cell" style="border-bottom: none;">
            <AppEmpty
              variant="table"
              :title="totalRecords === 0 ? '暂无数据' : '无匹配数据'"
              :description="totalRecords === 0 ? '暂无数据，请先点击「财报同步」从 Ozon 拉取' : '无匹配数据'"
            />
          </td>
        </tr>

        <template v-for="(item, gi) in groupedItems" :key="item._groupKey || 'solo_' + gi">
          <tr v-if="item.isGroup" class="app-table-row data-row group-parent" @click="$emit('toggle-group', gi)">
            <td class="app-table-td index-cell center">{{ rowIndex(gi) }}</td>
            <td class="app-table-td expand-cell center">
              <span class="expand-icon" :class="{ expanded: expandedGroups.has(gi) }">
                <span class="expand-icon-glyph">›</span>
              </span>
            </td>
            <td class="app-table-td parent-id" :title="item.main?.posting_number || '—'">
              <span class="cell-truncate font-mono text-xs">{{ item.main?.posting_number || '—' }}</span>
            </td>
            <td class="app-table-td" :title="displayFinanceProductName(item.main?.items?.[0]?.name) + ' ' + (item.main?.posting_number || '')">
              <div class="name-cell">
                <span class="product-name">{{ displayFinanceProductName(item.main?.items?.[0]?.name) }}</span>
                <span class="posting-num">{{ item.main?.posting_number || '' }}</span>
              </div>
            </td>
            <td class="app-table-td text-xs text-slate-400">—</td>
            <td class="app-table-td text-xs text-slate-400">—</td>
            <td class="app-table-td text-xs text-slate-500 whitespace-nowrap">{{ fmtDateTable(item.main?.operation_date) }}</td>
            <td class="app-table-td right" style="white-space: nowrap;">
              <span :class="['amount', amountToneClass(groupNetAmount(item))]">
                {{ signedAmt(groupNetAmount(item)) }} ₽
              </span>
            </td>
          </tr>

          <template v-if="item.isGroup && expandedGroups.has(gi)">
            <tr v-for="(child, ci) in item.children" :key="'c_' + gi + '_' + ci" class="app-table-row data-row child-row">
              <td class="app-table-td index-cell center">—</td>
              <td class="app-table-td expand-cell center"></td>
              <td class="app-table-td child-id">
                <span class="child-dash">—</span>
              </td>
              <td class="app-table-td" :title="displayFinanceProductName(child.items?.[0]?.name || item.main?.items?.[0]?.name) || child.operation_type_name_zh || child.operation_type_name || ''">
                <div class="name-cell">
                  <span class="product-name text-slate-500 text-xs">{{ displayFinanceProductName(child.items?.[0]?.name || item.main?.items?.[0]?.name) }}</span>
                  <span v-if="child.services?.[0]?.name" class="posting-num">{{ child.services[0].name }}</span>
                </div>
              </td>
              <td class="app-table-td text-xs" :title="child.service_group_zh || child.operation_type_name_zh || child.operation_type_name || '—'">
                <span class="cell-truncate">{{ child.service_group_zh || child.operation_type_name_zh || child.operation_type_name || '—' }}</span>
              </td>
              <td class="app-table-td text-xs" :title="child.accrual_type_zh || child.operation_type_name_zh || child.operation_type_name || '—'">
                <span class="app-table-tag app-table-tag--blue type-badge cell-truncate">{{ child.accrual_type_zh || child.operation_type_name_zh || child.operation_type_name || '—' }}</span>
              </td>
              <td class="app-table-td text-xs text-slate-500 whitespace-nowrap">{{ fmtDateTable(child.operation_date) }}</td>
              <td class="app-table-td right" style="white-space: nowrap;">
                <span :class="['amount', amountToneClass(child.amount ?? 0)]">
                  {{ signedAmt(child.amount ?? 0) }} ₽
                </span>
              </td>
            </tr>
          </template>

          <tr v-if="!item.isGroup" class="app-table-row data-row">
            <td class="app-table-td index-cell center">{{ rowIndex(gi) }}</td>
            <td class="app-table-td expand-cell center"></td>
            <td class="app-table-td font-mono text-xs text-slate-600" :title="displayAccrualId(item.operation)">
              <span class="cell-truncate">{{ displayAccrualId(item.operation) }}</span>
            </td>
            <td class="app-table-td" :title="displayFinanceProductName(item.operation?.items?.[0]?.name) + ' ' + (item.operation?.posting_number || '')">
              <div class="name-cell">
                <span class="product-name">{{ displayFinanceProductName(item.operation?.items?.[0]?.name) }}</span>
                <span class="posting-num">{{ item.operation?.posting_number || '' }}</span>
              </div>
            </td>
            <td class="app-table-td text-xs" :title="item.operation?.service_group_zh || item.operation?.operation_type_name_zh || item.operation?.operation_type_name || '—'">
              <span class="cell-truncate">{{ item.operation?.service_group_zh || item.operation?.operation_type_name_zh || item.operation?.operation_type_name || '—' }}</span>
            </td>
            <td class="app-table-td text-xs" :title="item.operation?.accrual_type_zh || item.operation?.operation_type_name_zh || item.operation?.operation_type_name || '—'">
              <span class="app-table-tag app-table-tag--blue type-badge cell-truncate">{{ item.operation?.accrual_type_zh || item.operation?.operation_type_name_zh || item.operation?.operation_type_name || '—' }}</span>
            </td>
            <td class="app-table-td text-xs text-slate-500 whitespace-nowrap">{{ fmtDateTable(item.operation?.operation_date) }}</td>
            <td class="app-table-td right" style="white-space: nowrap;">
              <span :class="['amount', amountToneClass(item.operation?.amount ?? 0)]">
                {{ signedAmt(item.operation?.amount ?? 0) }} ₽
              </span>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>

  <div v-if="postingsTotal > 0" class="table-footer">
    <AppPagination
      :model-value="currentPage"
      :page-size="pageSize"
      :total="postingsTotal"
      @update:model-value="$emit('update:currentPage', $event)"
      @change="$emit('page-change', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { AppEmpty, AppPagination, AppSkeletonLoader } from '@/components/ui';
import type { PostingGroupItem } from '@/api/ozonFinanceAPI';

type AmountTone = 'positive' | 'negative' | 'neutral';

defineProps<{
  loadingPostings: boolean;
  groupedItems: PostingGroupItem[];
  expandedGroups: Set<number>;
  sortDesc: boolean;
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  postingsTotal: number;
  rowIndex: (index: number) => number;
  displayAccrualId: (operation?: { posting_number?: string | null } | null) => string;
  displayFinanceProductName: (name?: string | null) => string;
  fmtDateTable: (value?: string | Date | null) => string;
  groupNetAmount: (item: PostingGroupItem) => number;
  amountToneClass: (value?: number | null) => AmountTone;
  signedAmt: (value?: number | null) => string;
}>();

defineEmits<{
  (event: 'toggle-sort'): void;
  (event: 'toggle-group', index: number): void;
  (event: 'update:currentPage', page: number): void;
  (event: 'page-change', page: number): void;
}>();
</script>

<style scoped>
.app-table-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
}

.table-footer {
  flex: 0 0 auto;
  padding: 0;
  border-top: 0;
  display: block;
}

.table-footer :deep(.app-pagination) {
  min-height: 54px;
  padding: 10px 20px;
}

.data-table {
  width: 100%;
  min-width: 1030px;
  border-collapse: collapse;
  table-layout: fixed;
  height: 100%;
}

.col-index { width: 58px; }
.col-expand { width: 58px; }
.col-id { width: 126px; }
.col-name { width: 300px; }
.col-group { width: 130px; }
.col-type { width: 145px; }
.col-date { width: 118px; }
.col-amount { width: 120px; }

.app-table-th {
  padding: 12px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.025em;
  border-bottom: 1px solid #f1f5f9;
  background-color: #f8fafc;
  white-space: nowrap;
}

.app-table-th.center {
  text-align: center;
}

.app-table-th.right {
  text-align: right;
}

.app-table-td {
  padding: 8px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 400;
  color: #2b3747;
  vertical-align: middle;
  border-bottom: 1px solid #f1f5f9;
}

.app-table-td.center {
  text-align: center;
}

.app-table-td.right {
  text-align: right;
}

.cell-truncate {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.product-name {
  font-size: 11px;
  font-weight: 500;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.posting-num {
  font-size: 9px;
  color: #94a3b8;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.index-cell {
  color: #94a3b8;
  font-size: 11px;
  font-family: monospace;
}

.expand-cell {
  color: #2563eb;
  padding-left: 6px !important;
  padding-right: 6px !important;
}

.group-parent {
  cursor: pointer;
  background: #fff;
}

.group-parent:hover {
  background: #f7fbff;
}

.expand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  text-align: center;
  border: 0;
  border-radius: 0;
  font-size: 11px;
  color: #2f6fca;
  background: transparent;
  box-shadow: none;
  transition:
    color 0.18s ease,
    transform 0.18s ease;
  vertical-align: middle;
}

.expand-icon:hover {
  color: #0b63ce;
  transform: translateX(1px);
}

.expand-icon.expanded {
  color: #0b63ce;
}

.expand-icon-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
  transform: translateX(0);
  transition: transform 0.2s ease;
}

.expand-icon.expanded .expand-icon-glyph {
  transform: translateX(0) rotate(90deg);
}

.parent-id {
  padding-left: 8px !important;
}

.child-row {
  background: #fbfdff;
}

.child-row:hover {
  background: #f5faff;
}

.child-id {
  padding-left: 32px !important;
  color: #94a3b8;
  font-size: 12px;
}

.child-dash {
  color: #cbd5e1;
}

.sort-th {
  cursor: pointer;
  user-select: none;
}

.sort-th:hover {
  background: #f1f5f9;
}

.sort-icon {
  margin-left: 4px;
  color: #94a3b8;
}

.data-row {
  transition: background 0.15s;
}

.data-row:hover {
  background: #f7fbff;
}

.empty-cell {
  padding: 0;
}

tbody {
  height: 100%;
}

tbody tr:has(.app-table-empty-cell),
tbody tr:has(.finance-table-skeleton) {
  height: 100%;
}

.app-table-empty-cell {
  height: 100%;
  vertical-align: middle;
}

.app-table-empty-cell :deep(.app-empty) {
  min-height: 100%;
  justify-content: center;
}

.type-badge {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
}

.amount {
  font-family: monospace;
  font-size: 10px;
  font-weight: 600;
}

.amount-pos,
.amount.positive { color: var(--finance-amount-positive); }
.amount-neg,
.amount.negative { color: var(--finance-amount-negative); }
.amount.neutral { color: var(--finance-amount-neutral); }

.finance-table-skeleton {
  min-height: 282px;
  padding: 22px 18px;
}
</style>
