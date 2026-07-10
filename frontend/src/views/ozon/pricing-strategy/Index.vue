<template>
  <MainLayout>
    <div class="app-page app-page-stack app-page--fixed pricing-strategy-page">
      <!-- 策略列表 -->
      <div class="app-page-card app-page-card--fill pricing-strategy-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="app-table-topbar">
          <div class="app-table-topbar__left">
            <AppSearch v-model="searchKeyword" placeholder="搜索策略名称" @search="handleSearch" />
          </div>
          <div class="app-table-topbar__right">
            <el-button type="primary" class="btn-create" @click="handleCreate">
              <el-icon class="mr-1"><Plus /></el-icon>
              创建策略
            </el-button>
          </div>
        </div>
        <AppTable :columns="columns" :data="paginatedStrategies" :loading="loading" :empty-text="'暂无定价策略'">
          <template #cell-name="{ row }">
            <div class="text-left">
              <div>
                {{ row.name }}
                <span v-if="row.isDefault"
                  class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] rounded-full">
                  默认
                </span>
              </div>
              <div class="text-[9px] text-slate-400">创建{{ formatDate(row.createdAt) }}</div>
            </div>
          </template>
          <template #cell-basePrice="{ row }">
            <span>{{ row.basePrice }}x</span>
          </template>
          <template #cell-profitRate="{ row }">
            <span>{{ row.profitRate }}%</span>
          </template>
          <template #cell-tariffRate="{ row }">
            <span>{{ row.tariffRate }}%</span>
          </template>
          <template #cell-platformFeeRate="{ row }">
            <span>{{ row.platformFeeRate }}%</span>
          </template>
          <template #cell-shippingPrice="{ row }">
            <span>¥{{ row.shippingPrice }}</span>
          </template>
          <template #cell-otherCost="{ row }">
            <span>¥{{ row.otherCost }}</span>
          </template>
          <template #cell-action="{ row }">
            <div class="flex items-center space-x-2">
              <AppTableButton name="edit" @click="editStrategy(row)" />
              <AppTableButton name="delete" delete-confirm-text="确定要删除该定价策略吗？" @click="deleteStrategy(row.id)" />
            </div>
          </template>
        </AppTable>
        <AppPagination :model-value="currentPage" :total="total" :page-size="pageSize" @change="handlePageChange" />
      </div>
    </div>
    <!-- 创建/编辑模态框 -->
    <div v-if="showCreateModal || showEditModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 p-8">
        <div class="app-surface-header mb-8">
          <div class="app-surface-icon">
            <el-icon class="text-blue-600 text-2xl">
              <Coin />
            </el-icon>
          </div>
          <div class="app-surface-title-wrapper">
            <h3 class="app-surface-title">
              {{ showCreateModal ? '创建定价策略' : '编辑定价策略' }}
            </h3>
            <p class="app-surface-subtitle">请填写定价策略信息</p>
          </div>
        </div>
        <form @submit.prevent="handleSubmit" class="px-4">
          <!-- 第一行：策略名称 -->
          <div class="mb-4">
            <div class="flex items-center gap-2 mb-1">
              <label class="text-xs font-medium text-gray-700 w-16 flex-shrink-0 text-left">策略名称</label><el-input
                v-model="addForm.name" placeholder="输入策略名称" size="default" clearable class="flex-1"><template
                  #prefix><el-icon>
                    <Document />
                  </el-icon></template></el-input>
            </div>
            <div class="error-message-container ml-20">
              <p v-if="errors.name" class="text-xs text-red-500">{{ errors.name }}</p>
              <p v-else class="text-xs text-transparent">占位文本</p>
            </div>
          </div>
          <!-- 第二行：价格系数、利润比-->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-24 mb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <label class="text-xs font-medium text-gray-700 w-16 flex-shrink-0 text-left">价格系数</label><el-input
                  v-model="addForm.basePrice" type="number" step="0.01" placeholder="例如.5" size="default"
                  clearable class="flex-1"><template #prefix><el-icon>
                      <Coin />
                    </el-icon></template></el-input>
              </div>
              <div class="error-message-container ml-20">
                <p class="text-xs text-gray-500">商品原始价格的倍数系数</p>
              </div>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <label class="text-xs font-medium text-gray-700 w-16 flex-shrink-0 text-left">利润比例</label><el-input
                  v-model="addForm.profitRate" type="number" step="0.01" placeholder="例如0" size="default"
                  clearable class="flex-1"><template #prefix><el-icon>
                      <Document />
                    </el-icon></template></el-input>
              </div>
              <div class="error-message-container ml-20">
                <p class="text-xs text-gray-500">预期利润占比百分比</p>
              </div>
            </div>
          </div>
          <!-- 第三行：关税税率、平台费-->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-24 mb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <label class="text-xs font-medium text-gray-700 w-16 flex-shrink-0 text-left">关税税率</label><el-input
                  v-model="addForm.tariffRate" type="number" step="0.01" placeholder="例如0" size="default"
                  clearable class="flex-1"><template #prefix><el-icon>
                      <Money />
                    </el-icon></template></el-input>
              </div>
              <div class="error-message-container ml-20">
                <p class="text-xs text-gray-500">海关关税税率百分比</p>
              </div>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <label class="text-xs font-medium text-gray-700 w-16 flex-shrink-0 text-left">平台费率</label><el-input
                  v-model="addForm.platformFeeRate" type="number" step="0.01" placeholder="例如" size="default"
                  clearable class="flex-1"><template #prefix><el-icon>
                      <Lock />
                    </el-icon></template></el-input>
              </div>
              <div class="error-message-container ml-20">
                <p class="text-xs text-gray-500">电商平台佣金费用百分比</p>
              </div>
            </div>
          </div>
          <!-- 第四行：快递价格、其他费-->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-24 mb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <label class="text-xs font-medium text-gray-700 w-16 flex-shrink-0 text-left">快递价格</label><el-input
                  v-model="addForm.shippingPrice" type="number" step="0.01" placeholder="例如0" size="default"
                  clearable class="flex-1"><template #prefix><el-icon>
                      <Location />
                    </el-icon></template></el-input>
              </div>
              <div class="error-message-container ml-20">
                <p class="text-xs text-gray-500">国内物流快递费</p>
              </div>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <label class="text-xs font-medium text-gray-700 w-16 flex-shrink-0 text-left">其他费用</label><el-input
                  v-model="addForm.otherCost" type="number" step="0.01" placeholder="例如" size="default"
                  clearable class="flex-1"><template #prefix><el-icon>
                      <CreditCard />
                    </el-icon></template></el-input>
              </div>
              <div class="error-message-container ml-20">
                <p class="text-xs text-gray-500">包装、耗材等杂项费</p>
              </div>
            </div>
          </div>
          <!-- 按钮 -->
          <div class="button-group pt-6">
            <el-button type="default" class="btn-cancel" :disabled="loading" @click="
              showCreateModal = false;
              showEditModal = false;
            ">
              取消
            </el-button>
            <el-button type="primary" class="btn-confirm" :disabled="loading" @click="handleSubmit">
              {{ loading ? '保存..' : showCreateModal ? '创建' : '保存' }}
            </el-button>
          </div>
        </form>
      </div>
    </div>
  </MainLayout>
</template>
<style scoped>
.pricing-strategy-card {
  overflow: hidden;
}

.pricing-strategy-card :deep(.app-table-wrapper),
.pricing-strategy-card :deep(.app-table-container) {
  flex: 1 1 auto;
  min-height: 0;
}

/* 表单项间*/
.form-item-wrapper {
  margin-bottom: 8px;
}

/* 文字和文本框左对齐（w-16*/
.ml-20 {
  margin-left: 72px;
  /* w-16 (64px) + gap-2 (8px) = 72px */
}

/* 错误提示容器固定高度，防止弹窗增*/
.error-message-container {
  height: 14px;
  /* 固定高度，足够容纳一行文*/
  display: flex;
  align-items: center;
  padding-top: 2px;
}

/* 确保按钮右对*/
.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Document, Coin, Location, Money, Lock, CreditCard, Plus } from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
import { AppSearch, AppTableButton, AppTable, AppPagination } from '@/components/ui';
import { pricingAPI, type PricingStrategy } from '@/api/pricingAPI';

// 表格列配置
const columns = [
  { key: 'name', label: '策略信息', align: 'left' as const },
  { key: 'basePrice', label: '价格系数', align: 'left' as const },
  { key: 'profitRate', label: '利润比例', align: 'left' as const },
  { key: 'tariffRate', label: '关税税率', align: 'left' as const },
  { key: 'platformFeeRate', label: '平台费率', align: 'left' as const },
  { key: 'shippingPrice', label: '快递价格', align: 'left' as const },
  { key: 'otherCost', label: '其他费用', align: 'left' as const },
  { key: 'action', label: '操作', align: 'left' as const },
];

// 状态
const strategies = ref<PricingStrategy[]>([]);
const searchKeyword = ref('');
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingStrategy = ref<PricingStrategy | null>(null);
const loading = ref(false);

// 分页
const currentPage = ref(1);
const pageSize = 10;

// 分页相关计算属性
const filteredStrategies = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return strategies.value;
  }
  return strategies.value.filter(strategy =>
    String(strategy.name || '').toLowerCase().includes(keyword)
  );
});
const total = computed(() => filteredStrategies.value.length);
const paginatedStrategies = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredStrategies.value.slice(start, end);
});

// 分页变化处理
const handlePageChange = (page: number) => {
  currentPage.value = page;
};

const handleSearch = () => {
  currentPage.value = 1;
};

// 错误提示
const errors = reactive({
  name: '',
  basePrice: '',
  shippingPrice: '',
  tariffRate: '',
  profitRate: '',
  platformFeeRate: '',
  otherCost: '',
});

// 打开创建策略弹窗
const handleCreate = () => {
  resetForm();
  clearErrors();
  showCreateModal.value = true;
};

// 表单数据
const addForm = reactive<{
  id: number;
  name: string;
  basePrice: number;
  shippingPrice: number;
  tariffRate: number;
  profitRate: number;
  platformFeeRate: number;
  otherCost: number;
  isDefault: boolean;
}>({
  id: 0,
  name: '',
  basePrice: 1.5,
  shippingPrice: 20,
  tariffRate: 10,
  profitRate: 30,
  platformFeeRate: 5,
  otherCost: 5,
  isDefault: false,
});

// 加载策略列表
const loadStrategies = async () => {
  try {
    const response = await pricingAPI.getStrategies();
    if (response.success && response.data) {
      strategies.value = response.data;
    }
  } catch {
  }
};

// 编辑策略
const editStrategy = (strategy: PricingStrategy) => {
  editingStrategy.value = strategy;
  Object.assign(addForm, {
    id: strategy.id,
    name: strategy.name,
    basePrice: strategy.basePrice,
    shippingPrice: strategy.shippingPrice,
    tariffRate: strategy.tariffRate,
    profitRate: strategy.profitRate,
    platformFeeRate: strategy.platformFeeRate,
    otherCost: strategy.otherCost,
    isDefault: strategy.isDefault,
  });
  clearErrors();
  showEditModal.value = true;
};

// 删除策略
const deleteStrategy = async (id: number) => {
  try {
    const response = await pricingAPI.deleteStrategy(id);
    if (response.success) {
      await loadStrategies();
    }
  } catch {
  }
};

// 清除错误信息
const clearErrors = () => {
  errors.name = '';
  errors.basePrice = '';
  errors.shippingPrice = '';
  errors.tariffRate = '';
  errors.profitRate = '';
  errors.platformFeeRate = '';
  errors.otherCost = '';
};

// 检查策略名称是否重复
const isNameDuplicate = (name: string, excludeId: number | undefined = undefined) => {
  return strategies.value.some(strategy =>
    strategy.name === name && strategy.id !== excludeId
  );
};

// 验证表单
const validateForm = () => {
  clearErrors();
  let isValid = true;

  if (!addForm.name.trim()) {
    errors.name = '请输入策略名称';
    isValid = false;
  } else if (isNameDuplicate(addForm.name, addForm.id)) {
    errors.name = '策略名称已存在';
    isValid = false;
  }

  return isValid;
};

// 提交表单
const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  try {
    if (showCreateModal.value) {
      // 创建新策略
      const response = await pricingAPI.createStrategy(addForm as any);
      if (response.success) {
        ElMessage.success('创建成功');
        showCreateModal.value = false;
        await loadStrategies();
        resetForm();
      } else {
        ElMessage.error(response.message || '创建失败');
      }
    } else if (showEditModal.value && editingStrategy.value) {
      // 更新策略
      const response = await pricingAPI.updateStrategy(editingStrategy.value.id, addForm);
      if (response.success) {
        ElMessage.success('更新成功');
        showEditModal.value = false;
        await loadStrategies();
        resetForm();
      } else {
        ElMessage.error(response.message || '更新失败');
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '请求失败，请重试');
  } finally {
    loading.value = false;
  }
};

// 重置表单
const resetForm = () => {
  Object.assign(addForm, {
    id: undefined,
    name: '',
    basePrice: 1.5,
    shippingPrice: 20,
    tariffRate: 10,
    profitRate: 30,
    platformFeeRate: 5,
    otherCost: 5,
    isDefault: false,
  });
  editingStrategy.value = null;
};

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

onMounted(() => {
  loadStrategies();
});
</script>
