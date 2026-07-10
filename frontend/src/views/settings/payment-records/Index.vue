<template>
  <MainLayout>
    <div class="app-page app-page-stack payment-records-page">
      <!-- 统计信息 -->
      <StatCardGrid :items="statItems" />
      <!-- 充值记录列表（包含搜索模块） -->
      <div class="app-page-card payment-records-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <!-- 搜索模块 -->
        <div class="payment-records-search h-[100px] flex items-center px-6">
          <div class="flex flex-col md:flex-row gap-4 items-center">
            <div class="search-container">
              <el-input
                v-model="searchParams.username"
                placeholder="搜索用户名"
                clearable
                class="input-search"
                @keyup.enter="handleSearch"
              />
              <el-button type="primary" class="btn-search" @click="handleSearch">
                <el-icon class="mr-1"><Search /></el-icon>
                搜索
              </el-button>
            </div>
          </div>
        </div>
        <AppTable :columns="columns" :data="paymentRecords" :loading="loading" :empty-text="emptyText">
          <template #cell-user="{ row }">
            <div v-if="row.user" class="text-left">
              <div>
                {{ row.user.nickname || row.user.username }}
              </div>
            </div>
            <span v-else class="text-slate-400">未知用户</span>
          </template>
          <template #cell-planType="{ row }">
            <span :class="[
              'app-table-tag',
              getPlanTypeClass(row.planType),
            ]">
              {{ getPlanTypeName(row.planType) }}
            </span>
          </template>
          <template #cell-amount="{ row }">
            <span>¥{{ row.amount.toFixed(2) }}</span>
          </template>
          <template #cell-paymentMethod="{ row }">
            <span>{{ getPaymentMethodName(row.paymentMethod || '') }}</span>
          </template>
          <template #cell-status="{ row }">
            <el-tag class="app-table-tag" :type="getStatusType(row.status)" size="small">{{ getStatusName(row.status) }}</el-tag>
          </template>
          <template #cell-createdAt="{ row }">
            <span>{{ formatDate(row.createdAt) }}</span>
          </template>
          <template #cell-action="{ row }">
            <AppTableButton name="detail" @click="handleView(row)" />
          </template>
        </AppTable>
        <!-- 分页 -->
        <AppPagination :model-value="searchParams.page" :total="pagination.total" :page-size="searchParams.limit" @change="handlePageChange" />
      </div>
      <!-- 详情弹窗 -->
      <el-dialog v-model="detailDialogVisible" width="520px" :before-close="handleCloseDetail" :show-close="false"
        class="payment-detail-dialog" custom-class="no-close-dialog">
        <template #header>
          <div class="app-surface-header">
            <div class="app-surface-icon">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="app-surface-title-wrapper">
              <h3 class="app-surface-title">充值记录详情</h3>
              <p class="app-surface-subtitle">查看用户充值与套餐信息</p>
            </div>
          </div>
        </template>
        <div v-if="selectedRecord" class="px-2 py-2">
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100">
            <p class="text-xs text-slate-500 mb-1 text-left">支付金额</p>
            <p class="text-2xl font-bold text-blue-600 text-left">¥{{ selectedRecord.amount.toFixed(2) }}</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-slate-50 rounded-lg p-3 text-left">
              <p class="text-xs font-medium text-gray-700 mb-1">用户ID</p>
              <p class="text-sm font-medium text-slate-900">{{ selectedRecord.userId }}</p>
            </div>
            <div class="bg-slate-50 rounded-lg p-3 text-left">
              <p class="text-xs font-medium text-gray-700 mb-1">用户名</p>
              <p class="text-sm font-medium text-slate-900 truncate">{{ getUserName(selectedRecord) }}</p>
            </div>
            <div class="bg-slate-50 rounded-lg p-3 text-left">
              <p class="text-xs font-medium text-gray-700 mb-1">套餐类型</p>
              <span
                :class="['app-table-tag', getPlanTypeClass(selectedRecord.planType)]">
                {{ getPlanTypeName(selectedRecord.planType) }}
              </span>
            </div>
            <div class="bg-slate-50 rounded-lg p-3 text-left">
              <p class="text-xs font-medium text-gray-700 mb-1">支付状态</p>
              <el-tag class="app-table-tag" :type="getStatusType(selectedRecord.status)" size="small">{{ getStatusName(selectedRecord.status)
                }}</el-tag>
            </div>
            <div class="bg-slate-50 rounded-lg p-3 text-left">
              <p class="text-xs font-medium text-gray-700 mb-1">支付方式</p>
              <p class="text-sm font-medium text-slate-900">{{ getPaymentMethodName(selectedRecord.paymentMethod || '') }}</p>
            </div>
            <div class="bg-slate-50 rounded-lg p-3 text-left">
              <p class="text-xs font-medium text-gray-700 mb-1">创建时间</p>
              <p class="text-sm font-medium text-slate-900">{{ formatDate(selectedRecord.createdAt) }}</p>
            </div>
          </div>
          <div class="bg-slate-50 rounded-lg p-3 mt-3 text-left">
            <p class="text-xs font-medium text-gray-700 mb-1">交易号</p>
            <p class="text-sm font-mono text-slate-700 break-all">{{ selectedRecord.transactionId || '-' }}</p>
          </div>
        </div>
      </el-dialog>
    </div>
  </MainLayout>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Files, Search } from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
import AppPagination from '@/components/ui/AppPagination.vue';
import StatCardGrid from '@/components/ui/StatCardGrid.vue';
import { AppTable, AppTableButton } from '@/components/ui';
import { paymentRecordAPI, type PaymentRecord } from '@/api/paymentRecordAPI';
// 表格列配置
const columns = [
  { key: 'user', label: '用户信息', align: 'left' as const },
  { key: 'planType', label: '套餐类型', align: 'left' as const },
  { key: 'amount', label: '支付金额', align: 'left' as const },
  { key: 'paymentMethod', label: '支付方式', align: 'left' as const },
  { key: 'status', label: '支付状态', align: 'left' as const },
  { key: 'createdAt', label: '创建时间', align: 'left' as const },
  { key: 'action', label: '操作', align: 'left' as const },
];

const emptyText = '暂无充值记录';

// 状态
const loading = ref(false);
const detailLoading = ref(false);
const paymentRecords = ref<PaymentRecord[]>([]);
const selectedRecord = ref<PaymentRecord | null>(null);
const detailDialogVisible = ref(false);
const pagination = reactive({
  total: 0,
  totalPages: 0, page: 1,
  limit: 10,
});
const stats = reactive({
  totalCount: 0,
  successCount: 0,
  totalAmount: 0,
  paidUserCount: 0,
});

const statItems = computed(() => [
  {
    label: '总交易笔数',
    value: stats.totalCount,
    type: 'total' as const,
    icon: Files,
  },
  {
    label: '成功交易',
    value: stats.successCount,
    type: 'listed' as const,
  },
  {
    label: '支付人数',
    value: stats.paidUserCount,
    type: 'users' as const,
  },
  {
    label: '累计金额',
    value: `¥${stats.totalAmount.toFixed(2)}`,
    type: 'money' as const,
  },
]);
// 搜索参数
const searchParams = reactive({
  page: 1,
  limit: 10,
  username: '' as string,
});
// 获取套餐类型样式
const getPlanTypeClass = (planType: string) => {
  const classes: Record<string, string> = {
    trial: 'app-table-tag--orange',
    free: 'app-table-tag--info',
    standard: 'app-table-tag--blue',
    professional: 'app-table-tag--purple',
  };
  return classes[planType] || 'app-table-tag--info';
};
// 获取套餐类型名称
const getPlanTypeName = (planType: string) => {
  const names: Record<string, string> = {
    trial: '试用版',
    free: '免费版',
    standard: '标准版',
    professional: '专业版',
  };
  return names[planType] || '未知';
};
// 获取支付状态类型
const getStatusType = (status: string) => {
const types: Record<string, any> = {
  pending: 'warning',
  success: 'success',
  failed: 'danger',
  refunded: 'info',
};
return types[status] || 'info';
};
// 获取支付状态名称
const getStatusName = (status: string) => {
const names: Record<string, string> = {
  pending: '待支',
  success: '成功',
  failed: '失败',
  refunded: '已退款',
};
return names[status] || '未知';
};
// 获取支付方式名称
const getPaymentMethodName = (method: string) => {
  if (!method) return '未选择';
  const names: Record<string, string> = {
    wechat: '微信',
    alipay: '支付',
    card: '银行',
  };
  return names[method] || method;
};
// 获取用户名（处理多表联合查询场景）
const getUserName = (record: PaymentRecord) => {
  // 优先使用已关联的用户信息
  if (record.user) {
    return record.user.nickname || record.user.username || '未知';
  }
  // 如果没有关联用户，根据 userId 查询用户信息（模拟多表联合查询）
  // 这里可以调用用户API进行查询
  return `用户ID: ${record.userId}`;
};
// 格式化日期
const formatDate = (dateString: string) => {
if (!dateString) return '-';
const date = new Date(dateString);
return date.toLocaleString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
};
// 搜索
const handleSearch = () => {
  searchParams.page = 1;
  fetchPaymentRecords();
};
// 分页
const handlePageChange = (page: number) => {
  searchParams.page = page;
  fetchPaymentRecords();
};
// 获取支付记录列表
const fetchPaymentRecords = async () => {
  loading.value = true;
  try {
    const params = {
      page: searchParams.page,
      limit: searchParams.limit,
      username: searchParams.username || undefined,
    };
    const response = await paymentRecordAPI.getAllPaymentRecords(params as any);
    if (response.success && response.data) {
      paymentRecords.value = response.data.data;
      pagination.total = response.data.pagination.total;
      pagination.totalPages = response.data.pagination.totalPages;
      pagination.page = response.data.pagination.page;
      pagination.limit = response.data.pagination.limit;
      // 更新统计数据
      if (response.data.stats) {
        stats.totalCount = response.data.stats.totalCount || 0;
        stats.successCount = response.data.stats.successCount || 0;
        stats.totalAmount = response.data.stats.totalAmount || 0;
        stats.paidUserCount = response.data.stats.paidUserCount || 0;
      }
    } else {
      ElMessage.error(response.message || '获取充值记录失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '请求失败');
  } finally {
    loading.value = false;
  }
};
// 查看详情
const handleView = async (record: PaymentRecord) => {
  detailLoading.value = true;
  try {
    const response = await paymentRecordAPI.getPaymentRecordById(record.id);
    if (response.success && response.data) {
      selectedRecord.value = response.data;
      detailDialogVisible.value = true;
    } else {
      ElMessage.error(response.message || '获取记录详情失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '请求失败');
  } finally {
    detailLoading.value = false;
  }
};
// 关闭详情
const handleCloseDetail = () => {
  detailDialogVisible.value = false;
  selectedRecord.value = null;
};
// 页面加载
onMounted(() => {
  fetchPaymentRecords();
});
</script>
<style scoped>
.payment-records-page {
  height: var(--app-page-min-height);
  min-height: 0;
  overflow: visible;
  gap: 0;
}

.payment-records-card {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.payment-records-search {
  flex-shrink: 0;
}

.payment-records-page :deep(.stat-card-grid) {
  flex-shrink: 0;
}

.payment-records-card :deep(.app-table-wrapper) {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.payment-records-card :deep(.app-table-scroll) {
  min-height: 0;
  overflow-x: auto;
  overflow-y: visible;
}

.payment-records-card :deep(.app-pagination) {
  flex-shrink: 0;
}

.payment-detail-dialog :deep(.el-dialog__header) {
  padding: 0;
}

.payment-detail-dialog :deep(.el-dialog__headerbtn) {
  display: none;
}

.payment-detail-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.payment-detail-dialog :deep(.el-dialog__footer) {
  padding-top: 0;
}

.no-close-dialog :deep(.el-dialog__headerbtn) {
  display: none;
}
</style>
