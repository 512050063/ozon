<template>
  <AppDialog
    :model-value="modelValue"
    :title="title"
    :subtitle="subtitle"
    :icon="Document"
    :show-footer="false"
    content-class="detail-dialog-panel detail-dialog-panel--store"
    @update:model-value="handleClose"
  >
    <!-- 数据列表 - 始终显示表头 -->
    <div class="detail-table-container">
      <div class="detail-table-scroll overflow-x-auto">
        <table class="w-full">
          <colgroup>
            <col class="detail-col-index" />
            <col class="detail-col-user" />
            <col class="detail-col-store" />
            <col class="detail-col-count" />
            <col class="detail-col-count" />
            <col class="detail-col-count" />
            <col class="detail-col-status" />
            <col class="detail-col-time" />
          </colgroup>
          <thead class="detail-table-head sticky top-0">
            <tr>
              <th class="detail-index-cell px-4 py-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                序号
              </th>
              <th class="px-4 py-3 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                操作人昵称
              </th>
              <th class="px-4 py-3 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                店铺名称
              </th>
              <th class="px-4 py-3 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                新增
              </th>
              <th class="px-4 py-3 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                修改
              </th>
              <th class="px-4 py-3 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                删除
              </th>
              <th class="px-4 py-3 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                状态
              </th>
              <th class="detail-time-col px-4 py-3 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                时间
              </th>
            </tr>
          </thead>
          <tbody v-if="isLoading" class="bg-white">
            <tr class="detail-state-row">
              <td colspan="8" class="detail-state-cell">
                <div class="detail-skeleton-wrap">
                  <AppSkeletonLoader variant="table" :rows="6" compact />
                </div>
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="(!data || data.length === 0) && !fetching" class="bg-white">
            <tr class="detail-state-row">
              <td colspan="8" class="detail-state-cell text-center">
                <div class="detail-empty-state">
                  <svg class="w-16 h-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 class="text-sm font-medium text-slate-600">暂无记录</h3>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody v-else class="bg-white">
            <!-- 数据行 -->
            <tr v-for="(item, index) in data" :key="item.id" class="app-table-row cursor-default"
                :title="item.message || '无详细信息'">
              <td class="detail-index-cell px-4 py-2.5 align-middle">
                <span class="text-[11px] text-slate-500">{{ (currentPage - 1) * pageSize + index + 1 }}</span>
              </td>
              <td class="px-4 py-2.5 align-middle text-left">
                <span class="text-[13px] text-slate-700">{{ item.userName === '系统' ? '系统' : (item.userName || '-') }}</span>
              </td>
              <td class="px-4 py-2.5 align-middle text-left">
                <span class="text-[13px] text-slate-700">{{ item.storeName || '-' }}</span>
              </td>
              <td class="px-4 py-2.5 align-middle text-left">
                <span class="text-[13px] font-medium text-green-600">{{ item.syncedCount || 0 }}</span>
              </td>
              <td class="px-4 py-2.5 align-middle text-left">
                <span class="text-[13px] font-medium text-blue-600">{{ item.updatedCount || 0 }}</span>
              </td>
              <td class="px-4 py-2.5 align-middle text-left">
                <span class="text-[13px] font-medium text-red-600">{{ item.deletedCount || 0 }}</span>
              </td>
              <td class="px-4 py-2.5 align-middle text-left">
                <span class="app-table-tag"
                  :class="isSuccessStatus(item.status) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                  {{ isSuccessStatus(item.status) ? '成功' : '失败' }}
                </span>
              </td>
              <td class="detail-time-col px-4 py-2.5 align-middle text-left">
                <span class="detail-time-text text-[11px] text-slate-500">{{ formatDate(item.createdAt) }}</span>
              </td>
            </tr>
            <!-- 空行填充，确保一页显6行 -->
            <tr v-for="i in (6 - data.length > 0 ? 6 - data.length : 0)" :key="'empty-' + i" class="border-0">
              <td class="px-4 py-3" colspan="8">&nbsp;</td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination
        :model-value="currentPage"
        :total="total"
        :page-size="pageSize"
        :max-visible="5"
        @change="handlePageChange"
      />
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Document } from '@element-plus/icons-vue';
import AppDialog from './AppDialog.vue';
import AppSkeletonLoader from './AppSkeletonLoader.vue';
import AppPagination from './AppPagination.vue';

interface LogItem {
  id: number;
  userName: string;
  storeName?: string;
  syncedCount: number;
  updatedCount: number;
  deletedCount: number;
  status: string;
  message?: string;
  createdAt: string;
}

interface Props {
  modelValue: boolean;
  title?: string;
  subtitle?: string;
  data?: LogItem[];
  showStore?: boolean;
  total?: number;
  currentPage?: number;
  pageSize?: number;
  type?: string;
  fetching?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '操作记录',
  subtitle: '查看详细操作记录',
  data: () => [],
  showStore: true,
  total: 0,
  currentPage: 1,
  pageSize: 10,
  type: '',
  fetching: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'page-change', page: number): void;
}>();

// 只有 fetching 为 true 时才显示加载；data 为空由空状态处理
const isLoading = computed(() => props.fetching);

const handleClose = () => {
  emit('update:modelValue', false);
};

const handlePageChange = (page: number) => {
  emit('page-change', page);
};

const isSuccessStatus = (status: unknown) => {
  const value = String(status || '').trim().toLowerCase();
  return ['success', 'succeeded', 'ok', '更新成功', '成功'].includes(value);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};
</script>

<style scoped>
/* 弹窗样式 */
:global(.detail-dialog-panel) {
  width: min(var(--detail-dialog-width, 840px), calc(100vw - var(--app-dialog-edge, 48px))) !important;
  height: auto;
  max-height: calc(100vh - 84px);
  border-radius: 4px !important;
}

:global(.detail-dialog-panel--store) {
  --detail-dialog-width: 840px;
}

:global(.detail-dialog-panel .app-dialog-body) {
  display: flex;
  min-height: 0;
  padding: 0 0 14px;
  overflow: hidden;
}

/* 表格容器 */
.detail-table-container {
  --detail-table-head-height: 38px;
  --detail-table-row-height: 50px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  padding: 0;
  background: rgba(255, 255, 255, 0.84);
}

.detail-table-scroll {
  flex: 0 0 auto;
  width: 100%;
  height: calc(var(--detail-table-head-height) + var(--detail-table-row-height) * 6);
  overflow: hidden;
  border-bottom: 0;
}

.detail-table-scroll table {
  width: 100% !important;
  table-layout: fixed;
  border-collapse: collapse;
}

.detail-col-index {
  width: 74px;
}

.detail-col-user {
  width: 124px;
}

.detail-col-store {
  width: 140px;
}

.detail-col-count {
  width: 62px;
}

.detail-col-status {
  width: 80px;
}

.detail-col-time {
  width: 188px;
}

.detail-index-cell {
  text-align: center !important;
}

.detail-state-cell {
  height: calc(var(--detail-table-row-height) * 6);
  padding: 0;
}

.detail-empty-state {
  display: flex;
  height: calc(var(--detail-table-row-height) * 6);
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
}

.detail-skeleton-wrap {
  height: calc(var(--detail-table-row-height) * 6);
  padding: 18px 20px;
}

:deep(.detail-table-container .px-6.py-4) {
  flex-shrink: 0;
  min-height: 52px;
  padding-top: 10px;
  padding-bottom: 10px;
  padding-left: 20px;
  padding-right: 20px;
}

:deep(.detail-table-container .app-pagination) {
  min-height: 54px;
  padding: 10px 20px;
  border-top-color: rgba(226, 232, 240, 0.58);
}

.detail-table-head {
  height: var(--detail-table-head-height);
  border-bottom: 1px solid rgba(226, 232, 240, 0.92);
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(241, 247, 255, 0.9));
}

.detail-table-head th {
  height: var(--detail-table-head-height);
  padding-top: 0;
  padding-bottom: 0;
  padding-left: 10px;
  padding-right: 10px;
  color: #475569;
  font-weight: 700;
  letter-spacing: 0;
}

.detail-table-container tbody tr {
  height: var(--detail-table-row-height);
  transition: background-color 0.18s ease, box-shadow 0.18s ease;
}

.detail-table-container tbody td {
  height: var(--detail-table-row-height);
  padding-top: 0;
  padding-bottom: 0;
  padding-left: 10px;
  padding-right: 10px;
}

.detail-table-container tbody tr:not(.detail-state-row):hover {
  background-color: rgba(248, 251, 255, 0.98);
  box-shadow: inset 3px 0 0 rgba(37, 99, 235, 0.42);
}

.detail-time-col {
  width: 170px;
  min-width: 170px;
  white-space: nowrap;
}

.detail-time-text {
  display: inline-block;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  line-height: 18px;
}

</style>
