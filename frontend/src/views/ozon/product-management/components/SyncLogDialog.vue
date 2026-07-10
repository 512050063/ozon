<template>
  <AppDialog
    :model-value="modelValue"
    title="商品更新记录"
    subtitle="查看详细操作记录"
    :icon="Document"
    :show-footer="false"
    content-class="update-log-dialog-panel"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- 加载状态 -->
    <div v-if="loading" class="update-log-state">
      <el-icon class="w-8 h-8 text-blue-600 animate-spin mx-auto">
        <Refresh />
      </el-icon>
      <p class="ml-2 text-slate-500">加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="logList.length === 0" class="update-log-state flex-col">
      <svg class="w-20 h-20 text-slate-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="text-lg font-medium text-slate-800 mb-1">暂无更新记录</h3>
    </div>

    <!-- 数据列表 -->
    <div v-else class="update-log-table-container">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th class="px-4 py-5 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">类型</th>
              <th class="px-4 py-5 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">操作人</th>
              <th class="px-4 py-5 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">新增数量</th>
              <th class="px-4 py-5 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">更新数量</th>
              <th class="px-4 py-5 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">删除数量</th>
              <th class="px-4 py-5 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">时间</th>
            </tr>
          </thead>
          <tbody class="bg-white">
            <tr v-for="(log, index) in logList" :key="index" class="app-table-row">
              <td class="px-4 py-3 align-middle text-left">
                <span v-if="log.syncType === 'category'" class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">类目更新</span>
                <span v-else-if="log.syncType === 'product'" class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800">产品同步</span>
                <span v-else class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">{{ log.syncType || '未知' }}</span>
              </td>
              <td class="px-4 py-3 align-middle text-left">
                <span class="text-[11px] text-slate-700">{{ log.operatorName || '未知用户' }}</span>
              </td>
              <td class="px-4 py-3 align-middle text-left">
                <span class="text-[11px] font-medium text-slate-900">{{ log.syncedCount || 0 }}</span>
              </td>
              <td class="px-4 py-3 align-middle text-left">
                <span class="text-[11px] font-medium text-slate-900">{{ log.updatedCount || 0 }}</span>
              </td>
              <td class="px-4 py-3 align-middle text-left">
                <span class="text-[11px] font-medium text-slate-900">{{ log.deletedCount || 0 }}</span>
              </td>
              <td class="px-4 py-3 align-middle text-left">
                <span class="text-[11px] text-slate-600">{{ formatDateTime(log.createdAt) }}</span>
              </td>
            </tr>
            <!-- 空行填充 -->
            <tr v-for="i in (pageSize - logList.length > 0 ? pageSize - logList.length : 0)" :key="'empty-' + i" class="border-0">
              <td class="px-4 py-3" colspan="5">&nbsp;</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <AppPagination
        :model-value="page"
        :total="total"
        :page-size="pageSize"
        @change="handlePageChange"
      />
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { Document, Refresh } from '@element-plus/icons-vue';
import AppDialog from '@/components/ui/AppDialog.vue';
import AppPagination from '@/components/ui/AppPagination.vue';

// Props
interface Props {
  modelValue: boolean;
  loading: boolean;
  logList: any[];
  page: number;
  total: number;
  pageSize: number;
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  loading: false,
  logList: () => [],
  page: 1,
  total: 0,
  pageSize: 6,
});

// Emits
const emit = defineEmits<{
  pageChange: [page: number];
  'update:modelValue': [visible: boolean];
}>();

// 格式化日期时间
const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 页面变化处理
const handlePageChange = (page: number) => {
  emit('pageChange', page);
};
</script>

<style scoped>
:global(.update-log-dialog-panel) {
  width: min(980px, calc(100vw - var(--app-dialog-edge, 48px))) !important;
  height: min(760px, calc(100vh - 72px));
}

:global(.update-log-dialog-panel .app-dialog-body) {
  display: flex;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

.update-log-state {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 420px;
  padding: 32px;
}

.update-log-table-container {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.update-log-table-container > .overflow-x-auto {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.update-log-table-container table {
  min-width: 840px;
}
</style>
