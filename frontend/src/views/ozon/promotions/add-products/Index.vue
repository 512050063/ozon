<template>
  <MainLayout>
    <div class="p-6 promotion-add-page app-page-stack">
      <div class="promotion-add-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="promotions-toolbar">
          <div>
            <div class="page-eyebrow">添加活动商品</div>
            <h1 class="page-title" :title="activityTitle">{{ activityTitle || `活动 ${actionId}` }}</h1>
          </div>
          <div class="toolbar-actions">
            <el-button @click="backToProducts">返回</el-button>
            <el-button type="primary" :loading="loading" @click="loadCandidates">刷新候选</el-button>
          </div>
        </div>

        <AppTable
          :columns="columns"
          :data="products"
          :loading="loading"
          empty-text="暂无可添加商品"
        >
          <template #cell-product="{ row }">
            <div class="product-cell">
              <AppImage :src="row.image" :alt="row.name" class="product-image" empty-text="暂无图片" error-text="加载失败" />
              <div class="product-meta">
                <span class="product-name" :title="row.name">{{ row.name || '-' }}</span>
                <span class="product-id">ID {{ row.productId || row.id }} · {{ row.offerId || row.sku || '-' }}</span>
              </div>
            </div>
          </template>
          <template #cell-price="{ row }">
            <div class="price-cell">
              <span>原价 {{ formatMoney(row.price) }}</span>
              <span>最高活动价 {{ formatMoney(row.maxActionPrice || row.raw?.max_action_price) }}</span>
            </div>
          </template>
          <template #cell-actionPrice="{ row }">
            <el-input-number
              v-model="draftByProductId[row.id].actionPrice"
              :min="0"
              :controls="false"
              class="promotion-number-input"
            />
          </template>
          <template #cell-stock="{ row }">
            <el-input-number
              v-model="draftByProductId[row.id].stock"
              :min="0"
              :precision="0"
              :controls="false"
              class="promotion-number-input"
            />
          </template>
          <template #cell-warnings="{ row }">
            <el-tooltip
              v-if="getRowWarnings(row).length"
              :content="getRowWarnings(row).join('\n')"
              placement="top"
              popper-class="promotion-warning-tooltip"
            >
              <span class="promotion-warning">查看限制</span>
            </el-tooltip>
            <span v-else class="muted-text">-</span>
          </template>
          <template #cell-action="{ row }">
            <el-button
              size="small"
              type="primary"
              :disabled="addingProductId !== null && addingProductId !== Number(row.id)"
              :loading="addingProductId === Number(row.id)"
              @click="addProduct(row)"
            >
              加入活动
            </el-button>
          </template>
          <template #loading>
            <AppSkeletonLoader variant="table" :rows="6" :columns="columns.length + 1" compact />
          </template>
        </AppTable>

        <AppPagination
          v-if="products.length > 0"
          v-model="pagination.page"
          :total="total"
          :page-size="pagination.pageSize"
          @change="handlePageChange"
        />
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import MainLayout from '@/components/MainLayout.vue';
import { AppImage, AppPagination, AppSkeletonLoader, AppTable } from '@/components/ui';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
import { ozonPromotionAPI, type OzonPromotionProduct } from '@/api/ozonPromotionAPI';

const route = useRoute();
const router = useRouter();
const { loadStoreContext, storeContext } = useOzonStoreContext();
const currentStoreId = computed(() => storeContext.value?.resolvedStoreId ?? null);
const actionId = computed(() => Number(route.params.actionId || 0));
const activityTitle = computed(() => String(route.query.title || ''));
const loading = ref(false);
const products = ref<OzonPromotionProduct[]>([]);
const total = ref(0);
const addingProductId = ref<number | null>(null);
const draftByProductId = reactive<Record<number, { actionPrice: number; stock: number }>>({});
const pagination = reactive({ page: 1, pageSize: 20 });

const columns = [
  { key: 'product', label: '商品信息', minWidth: '360px' },
  { key: 'price', label: '参考价格', width: '40' },
  { key: 'actionPrice', label: '活动价格', width: '32' },
  { key: 'stock', label: '活动库存', width: '32' },
  { key: 'warnings', label: '限制/错误', width: '34' },
  { key: 'action', label: '操作', width: '28' },
];

const formatMoney = (value: unknown) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return '-';
  return numberValue.toFixed(2);
};

const getDefaultActionPrice = (row: OzonPromotionProduct) => {
  const value = Number(row.actionPrice || row.maxActionPrice || row.raw?.max_action_price || row.price || 0);
  return Number.isFinite(value) ? value : 0;
};

const ensureDrafts = () => {
  for (const row of products.value) {
    const id = Number(row.id);
    if (!id || draftByProductId[id]) continue;
    draftByProductId[id] = {
      actionPrice: getDefaultActionPrice(row),
      stock: Number(row.stock || row.minStock || 0),
    };
  }
};

const loadCandidates = async () => {
  if (!currentStoreId.value || !actionId.value) return;
  loading.value = true;
  try {
    const response = await ozonPromotionAPI.getPromotionCandidates(currentStoreId.value, actionId.value, {
      limit: pagination.pageSize,
      offset: (pagination.page - 1) * pagination.pageSize,
    });
    if (response.success && response.data) {
      products.value = response.data.products || [];
      total.value = response.data.total || 0;
      ensureDrafts();
    } else {
      ElMessage.error(response.message || '获取可添加商品失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取可添加商品失败');
  } finally {
    loading.value = false;
  }
};

const collectMessages = (value: any): string[] => {
  if (!value) return [];
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(item => collectMessages(item));
  if (typeof value !== 'object') return [];
  const message = value.message || value.error || value.reason || value.description || value.error_message || value.errorMessage;
  return [
    ...(message ? [String(message)] : []),
    ...collectMessages(value.errors),
    ...collectMessages(value.reasons),
    ...collectMessages(value.reject_reasons),
    ...collectMessages(value.rejectReasons),
  ];
};

const getRowWarnings = (row: OzonPromotionProduct) => {
  return Array.from(new Set([
    ...collectMessages(row.errors),
    ...collectMessages(row.raw?.errors),
    ...collectMessages(row.raw?.reasons),
    ...collectMessages(row.raw?.reject_reasons),
  ])).filter(Boolean);
};

const getOperationMessage = (response: any, fallback: string) => {
  const messages = [
    response?.message,
    ...(Array.isArray(response?.data?.errors) ? response.data.errors : []),
  ].filter(Boolean);
  return messages.length ? messages.join('\n') : fallback;
};

const addProduct = async (row: OzonPromotionProduct) => {
  if (!currentStoreId.value || !actionId.value || !row.id) return;
  const draft = draftByProductId[Number(row.id)];
  if (!draft?.actionPrice || draft.actionPrice <= 0) {
    ElMessage.warning('请填写活动价格');
    return;
  }
  addingProductId.value = Number(row.id);
  try {
    const response = await ozonPromotionAPI.activateProduct(currentStoreId.value, actionId.value, {
      productId: Number(row.id),
      actionPrice: Number(draft.actionPrice),
      stock: Number(draft.stock || 0),
    });
    if (response.success) {
      ElMessage.success(response.message || '商品已加入活动');
      products.value = products.value.filter(item => Number(item.id) !== Number(row.id));
      total.value = Math.max(0, total.value - 1);
    } else {
      ElMessage.error(getOperationMessage(response, '商品加入活动失败'));
    }
  } catch (error: any) {
    ElMessage.error(error.message || '商品加入活动失败');
  } finally {
    addingProductId.value = null;
  }
};

const backToProducts = () => {
  router.push({
    name: 'OzonPromotionProducts',
    params: { actionId: actionId.value },
    query: { title: activityTitle.value },
  });
};

const handlePageChange = (page: number) => {
  pagination.page = page;
  void loadCandidates();
};

onMounted(async () => {
  await loadStoreContext(true);
  await loadCandidates();
});

watch(currentStoreId, () => {
  pagination.page = 1;
  void loadCandidates();
});
</script>

<style scoped>
.promotion-add-page {
  height: var(--app-page-min-height);
  min-height: 0;
  overflow: hidden;
}

.promotion-add-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.promotion-add-card :deep(.app-table-wrapper) {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.promotion-add-card :deep(.app-table-scroll) {
  min-height: 0;
  overflow-x: auto;
  overflow-y: visible;
}

.promotion-add-card :deep(.app-pagination) {
  flex-shrink: 0;
}

.promotions-toolbar {
  flex-shrink: 0;
  min-height: 104px;
  padding: 0 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid #e2e8f0;
}

.page-eyebrow {
  margin-bottom: 8px;
  color: #64748b;
  font-size: 13px;
}

.page-title {
  max-width: 760px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #0f172a;
  font-size: 22px;
  font-weight: 700;
}

.toolbar-actions,
.product-cell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.product-image {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.product-meta,
.price-cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.product-name {
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1e293b;
  font-weight: 600;
}

.product-id,
.price-cell {
  color: #64748b;
}

.promotion-number-input {
  width: 116px;
}

.promotion-warning {
  color: #dc2626;
  cursor: help;
}

.muted-text {
  color: #94a3b8;
}

:global(.promotion-warning-tooltip) {
  max-width: 360px;
  white-space: pre-line;
  line-height: 1.5;
}
</style>
