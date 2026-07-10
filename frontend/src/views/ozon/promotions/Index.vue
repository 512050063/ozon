<template>
  <MainLayout>
    <div class="p-6 promotions-page app-page-stack">
      <StatCardGrid
        :items="statItems"
        :active-key="statusFilter"
        clickable
        @item-click="handleStatClick"
      />

      <div class="promotions-card flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="px-6 h-[100px] flex items-center" data-promotion-search-module>
          <div class="flex flex-col md:flex-row gap-4 items-center w-full">
            <div class="flex items-center gap-3 flex-1">
              <AppSearch v-model="keyword" placeholder="搜索活动名称或说明" @search="handleSearch" />
            </div>

            <AppUpdateButton
              text="更新活动"
              :loading="loading"
              module="promotions"
              :last-update-time="lastUpdateTime"
              :update-status="updateStatus"
              :fetch-last-update-time="fetchLastUpdateTime"
              :disabled="!currentStoreId"
              @click="handleUpdateClick"
              @detail="handleUpdateDetail"
            />
          </div>
        </div>

        <AppTable
          :columns="columns"
          :data="loading ? [] : paginatedPromotions"
          :loading="loading"
          empty-text="暂无促销活动"
        >
          <template #cell-title="{ row }">
            <div class="promotion-info-cell">
              <div class="promotion-info-main">
                <span class="promotion-title" :title="getTranslatedTitle(row)">{{ getTranslatedTitle(row) || '-' }}</span>
              </div>
              <div class="promotion-info-date" :title="getPromotionDateHint(row)">
                从{{ formatOzonShortDate(row.date_start) }}至{{ formatOzonShortDate(row.date_end) }}，{{ getPromotionListTypeLabel(row) }}
              </div>
            </div>
          </template>
          <template #cell-period="{ row }">
            <span
              :class="['promotion-add-plan', getPromotionAddPlanText(row) === '请添加商品' ? 'is-empty' : '']"
              :title="getPromotionAddPlanText(row)"
            >
              {{ getPromotionAddPlanText(row) }}
            </span>
          </template>
          <template #cell-status="{ row }">
            <span :class="['app-table-tag', row.is_participating ? 'app-table-tag--success' : 'app-table-tag--info']">
              {{ row.is_participating ? '我正在参与' : '未参与' }}
            </span>
          </template>
          <template #cell-counts="{ row }">
            <div class="promotion-counts">
              <span>可加 {{ row.potential_products_count || 0 }}</span>
              <span>已加 {{ row.participating_products_count || 0 }}</span>
            </div>
          </template>
          <template #cell-autoAdd="{ row }">
            <span
              :class="['promotion-auto-column', getAutoAddText(row) === '已自动添加' ? 'is-enabled' : 'is-muted']"
              :title="getAutoAddTooltip(row)"
            >
              <template v-if="getAutoAddText(row) === '已自动添加'">
                <strong>A</strong>
                <span>{{ getAutoAddText(row) }}</span>
              </template>
              <template v-else>{{ getAutoAddText(row) }}</template>
            </span>
          </template>
          <template #cell-action="{ row }">
            <div class="table-actions">
              <AppTableButton name="detail" tooltip="活动详情" @click="openPromotionDetail(row)" />
              <AppTableButton name="add" tooltip="添加商品" @click="openPromotionProducts(row, true)" />
            </div>
          </template>
          <template #loading>
            <AppSkeletonLoader variant="table" :rows="6" :columns="columns.length + 1" compact />
          </template>
        </AppTable>

        <AppPagination
          v-model="currentPage"
          :total="filteredPromotions.length"
          :page-size="pageSize"
          @change="handlePageChange"
        />
      </div>
      <AppDetailDialog
        v-model="showUpdateDetailDialog"
        title="活动更新记录"
        :data="updateDetailRows"
        :total="updateDetailTotal"
        :current-page="updateDetailPage"
        :page-size="updateDetailPageSize"
        :fetching="updateDetailLoading"
        @page-change="fetchUpdateDetailRows"
      />
      <PromotionDetailDrawer
        v-model:visible="showPromotionDetailDrawer"
        :promotion="selectedPromotion"
        :title="selectedPromotion ? getTranslatedTitle(selectedPromotion) : ''"
        :description="selectedPromotion ? getTranslatedDescription(selectedPromotion) : ''"
      />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import MainLayout from '@/components/MainLayout.vue';
import { AppPagination, AppSearch, AppSkeletonLoader, AppTable, AppTableButton, AppUpdateButton, StatCardGrid } from '@/components/ui';
import AppDetailDialog from '@/components/ui/AppDetailDialog.vue';
import type { StatCardItem } from '@/components/ui/StatCardGrid.vue';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
import { usePromotionTextTranslations } from '@/composables/usePromotionTextTranslations';
import { ozonPromotionAPI, type OzonPromotion } from '@/api/ozonPromotionAPI';
import { useUpdateStore } from '@/store/updateStore';
import PromotionDetailDrawer from './components/PromotionDetailDrawer.vue';

const PROMOTIONS_MODULE = 'promotions';
const router = useRouter();
const updateStore = useUpdateStore();
const { loadStoreContext, storeContext } = useOzonStoreContext();
const { getPromotionTranslatedText, resolveVisiblePromotionTextTranslations } = usePromotionTextTranslations();
const currentStoreId = computed(() => storeContext.value?.resolvedStoreId ?? null);
const loading = ref(true);
const promotions = ref<OzonPromotion[]>([]);
const keyword = ref('');
const statusFilter = ref<'all' | 'joined' | 'notJoined'>('all');
const currentPage = ref(1);
const pageSize = ref(10);
const lastUpdateTime = ref<string | Date | null>(null);
const updateStatus = ref<'success' | 'error' | 'idle'>('idle');
const showUpdateDetailDialog = ref(false);
const showPromotionDetailDrawer = ref(false);
const selectedPromotion = ref<OzonPromotion | null>(null);
const updateDetailRows = ref<any[]>([]);
const updateDetailTotal = ref(0);
const updateDetailPage = ref(1);
const updateDetailPageSize = 6;
const updateDetailLoading = ref(false);

const columns = [
  { key: 'title', label: '活动信息', minWidth: '360px' },
  { key: 'period', label: '添加计划', width: '56' },
  { key: 'status', label: '状态', width: '24' },
  { key: 'counts', label: '商品数量', width: '32' },
  { key: 'autoAdd', label: '是否自动添加', width: '36' },
  { key: 'action', label: '操作', width: '32' },
];

const PROMOTION_ACTION_TYPE_LABELS: Record<string, string> = {
  ELASTIC_BOOSTING: '弹性提升',
  STOCK_DISCOUNT: '库存折扣',
};

const filteredPromotions = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase();
  return promotions.value.filter(row => {
    if (statusFilter.value === 'joined' && !row.is_participating) return false;
    if (statusFilter.value === 'notJoined' && row.is_participating) return false;
    if (!normalizedKeyword) return true;
    return [
      row.title || '',
      formatPlainText(row.description || ''),
      getTranslatedTitle(row),
      getTranslatedDescription(row),
    ].join(' ').toLowerCase().includes(normalizedKeyword);
  });
});

const paginatedPromotions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredPromotions.value.slice(start, start + pageSize.value);
});

const participatingProductCount = computed(() =>
  promotions.value.reduce((sum, row) => sum + Number(row.participating_products_count || 0), 0)
);

const statItems = computed<StatCardItem[]>(() => [
  { key: 'all', label: '所有', value: promotions.value.length, type: 'total' },
  { key: 'joined', label: '我正在参与', value: promotions.value.filter(row => row.is_participating).length, type: 'listed' },
  { key: 'notJoined', label: '未参与', value: promotions.value.filter(row => !row.is_participating).length, type: 'pending' },
  { key: 'products', label: '参与商品数量', value: participatingProductCount.value, type: 'package' },
]);

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatOzonShortDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const getPart = (type: string) => parts.find(part => part.type === type)?.value || '';
  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  return `${day}.${month}.${year}`;
};

const formatOzonEnglishDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const getPromotionDateHint = (row: OzonPromotion) => {
  return `${formatDate(row.date_start)} 至 ${formatDate(row.date_end)}`;
};

const formatPlainText = (value?: string) => {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
};

const decodeHtmlEntities = (value: string) => {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

const stripHtmlLine = (value: string) => {
  return decodeHtmlEntities(value)
    .replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:，。！？；：])/g, '$1')
    .trim();
};

const collectDescriptionLines = (value?: string) => {
  if (!value) return [];
  return decodeHtmlEntities(value)
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .split('\n')
    .map(stripHtmlLine)
    .map(line => line.replace(/^[•\-–]\s*/, '').trim())
    .filter(Boolean);
};

const getTranslatedTitle = (row: OzonPromotion) => {
  return getPromotionTranslatedText(row.title || '');
};

const getTranslatedDescription = (row: OzonPromotion) => {
  return getPromotionTranslatedText(formatPlainText(row.description || ''));
};

const getPromotionListTypeLabel = (row: OzonPromotion) => {
  const actionType = String(row.action_type || '').trim();
  return PROMOTION_ACTION_TYPE_LABELS[actionType] || actionType || '促销活动';
};

const getRawValue = (row: OzonPromotion, keys: string[]) => {
  const source = row as any;
  for (const key of keys) {
    const value = source?.[key] ?? source?.raw?.[key] ?? source?.result?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

const getSortedAutoAddDates = (row: OzonPromotion) => {
  const autoAddDates = getRawValue(row, ['auto_add_dates', 'autoAddDates']);
  if (!Array.isArray(autoAddDates)) return [];
  return autoAddDates
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
};

const getAutoAddPlanCounts = (row: OzonPromotion) => {
  const rawCounts = getRawValue(row, [
    'auto_add_counts',
    'autoAddCounts',
    'auto_add_products_counts',
    'autoAddProductsCounts',
    'auto_add_dates_counts',
    'autoAddDatesCounts',
    'planned_products_counts',
    'plannedProductsCounts',
  ]);
  if (!rawCounts) return {};
  if (Array.isArray(rawCounts)) {
    const dates = getSortedAutoAddDates(row);
    return dates.reduce<Record<string, number>>((acc, date, index) => {
      const value = Number(rawCounts[index]);
      if (Number.isFinite(value) && value > 0) acc[date] = value;
      return acc;
    }, {});
  }
  if (typeof rawCounts !== 'object') return {};
  return Object.entries(rawCounts).reduce<Record<string, number>>((acc, [date, value]) => {
    const count = Number(value);
    if (date && Number.isFinite(count) && count > 0) acc[String(date)] = count;
    return acc;
  }, {});
};

const getNextAutoAddDate = (row: OzonPromotion) => {
  const dates = getSortedAutoAddDates(row);
  if (dates.length === 0) return '';
  const now = Date.now();
  return dates.find(value => {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) && timestamp >= now;
  }) || dates[dates.length - 1];
};

const getPromotionAddPlanText = (row: OzonPromotion) => {
  const nextAutoAddDate = getNextAutoAddDate(row);
  if (!nextAutoAddDate) return '请添加商品';
  return `将自动添加商品 从${formatOzonEnglishDate(nextAutoAddDate)}`;
};

const getAutoAddText = (row: OzonPromotion) => {
  if (getSortedAutoAddDates(row).length > 0) return '已自动添加';

  const value = getRawValue(row, [
    'is_auto_add',
    'isAutoAdd',
    'auto_add',
    'autoAdd',
    'auto_added',
    'autoAdded',
    'with_auto_add',
    'withAutoAdd',
    'is_auto_add_enabled',
    'isAutoAddEnabled',
  ]);
  if (value === true || value === 1 || value === '1' || value === 'true') return '已自动添加';
  if (value === false || value === 0 || value === '0' || value === 'false') return '未自动添加';
  return '-';
};

const getAutoAddTooltip = (row: OzonPromotion) => {
  const autoAddDates = getSortedAutoAddDates(row);
  if (autoAddDates.length === 0) return '';
  return `自动添加日期：${autoAddDates.map(value => formatDate(String(value))).join('，')}`;
};

const resolvePromotionTexts = async () => {
  const texts = promotions.value.flatMap(row => [
    row.title || '',
    formatPlainText(row.description || ''),
    ...collectDescriptionLines(row.description || ''),
  ]).filter(Boolean);
  await resolveVisiblePromotionTextTranslations(texts);
};

const loadPromotions = async (markUpdate = false) => {
  if (!currentStoreId.value) {
    promotions.value = [];
    loading.value = false;
    return;
  }

  if (markUpdate && updateStore.isUpdating(PROMOTIONS_MODULE)) return;

  let progressTimer: ReturnType<typeof setInterval> | null = null;
  if (markUpdate) {
    updateStore.startUpdate(PROMOTIONS_MODULE, {
      scope: 'global',
      statusText: '正在更新',
      progress: 0,
    });
    progressTimer = setInterval(() => {
      const meta = updateStore.getModuleMeta(PROMOTIONS_MODULE);
      if (meta.progress < 90) {
        updateStore.setUpdateProgress(PROMOTIONS_MODULE, Math.min(90, meta.progress + 14));
      }
    }, 500);
  } else {
    loading.value = true;
  }

  try {
    const response = await ozonPromotionAPI.getPromotions(currentStoreId.value, { sync: markUpdate });
    if (markUpdate) {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      updateStore.setUpdateProgress(PROMOTIONS_MODULE, 100);
    }
    if (response.success && response.data) {
      promotions.value = response.data.actions || [];
      currentPage.value = 1;
      void resolvePromotionTexts();
      if (markUpdate) {
        lastUpdateTime.value = new Date();
        updateStatus.value = 'success';
        if (showUpdateDetailDialog.value) {
          void fetchUpdateDetailRows(1);
        }
        ElMessage.success('活动更新成功');
      }
    } else {
      ElMessage.error(response.message || '获取促销活动失败');
      if (!markUpdate) promotions.value = [];
      if (markUpdate) {
        updateStatus.value = 'error';
        if (showUpdateDetailDialog.value) {
          void fetchUpdateDetailRows(1);
        }
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取促销活动失败');
    if (!markUpdate) promotions.value = [];
    if (markUpdate) {
      updateStatus.value = 'error';
      if (showUpdateDetailDialog.value) {
        void fetchUpdateDetailRows(1);
      }
    }
  } finally {
    if (progressTimer) {
      clearInterval(progressTimer);
    }
    if (markUpdate) {
      window.setTimeout(() => updateStore.stopUpdate(PROMOTIONS_MODULE), 260);
    } else {
      loading.value = false;
    }
  }
};

const openPromotionProducts = (row: OzonPromotion, openAdd = false) => {
  if (!row.id) return;
  router.push({
    name: 'OzonPromotionProducts',
    params: { actionId: row.id },
    query: {
      title: getTranslatedTitle(row) || row.title || '',
      dateStart: row.date_start || '',
      dateEnd: row.date_end || '',
      autoAddDates: JSON.stringify(getSortedAutoAddDates(row)),
      autoAddPlanCounts: JSON.stringify(getAutoAddPlanCounts(row)),
      ...(openAdd ? { openAdd: '1' } : {}),
    },
  });
};

const openPromotionDetail = (row: OzonPromotion) => {
  selectedPromotion.value = row;
  showPromotionDetailDrawer.value = true;
};

const handleStatClick = (item: StatCardItem) => {
  if (item.key === 'products') return;
  statusFilter.value = (item.key || 'all') as typeof statusFilter.value;
  currentPage.value = 1;
};

const handleSearch = () => {
  currentPage.value = 1;
};

const handleUpdateClick = () => {
  void loadPromotions(true);
};

const fetchLastUpdateTime = async (): Promise<{ lastUpdateTime: string | Date; status: 'success' | 'error' | 'idle' }> => {
  if (!currentStoreId.value) {
    return { lastUpdateTime: lastUpdateTime.value || '', status: lastUpdateTime.value ? updateStatus.value : 'idle' };
  }

  const response = await ozonPromotionAPI.getSyncLogs(currentStoreId.value, 1, 1);
  const latestLog = response.success ? response.data?.list?.[0] : null;
  if (!latestLog) {
    return { lastUpdateTime: '', status: 'idle' };
  }

  lastUpdateTime.value = latestLog.createdAt;
  updateStatus.value = latestLog.status === 'failed' ? 'error' : latestLog.status === 'success' ? 'success' : 'idle';
  return {
    lastUpdateTime: latestLog.createdAt,
    status: updateStatus.value,
  };
};

const fetchUpdateDetailRows = async (page: number = 1) => {
  if (!currentStoreId.value) {
    updateDetailRows.value = [];
    updateDetailTotal.value = 0;
    updateDetailPage.value = page;
    return;
  }

  updateDetailPage.value = page;
  updateDetailLoading.value = true;
  try {
    const response = await ozonPromotionAPI.getSyncLogs(currentStoreId.value, page, updateDetailPageSize);
    if (response.success && response.data) {
      updateDetailRows.value = response.data.list || [];
      updateDetailTotal.value = response.data.total || 0;
      updateDetailPage.value = response.data.page || page;
    } else {
      updateDetailRows.value = [];
      updateDetailTotal.value = 0;
    }
  } finally {
    updateDetailLoading.value = false;
  }
};

const handleUpdateDetail = () => {
  showUpdateDetailDialog.value = true;
  void fetchUpdateDetailRows(1);
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
};

onMounted(async () => {
  await loadStoreContext(true);
  await loadPromotions();
});

watch(currentStoreId, () => {
  void loadPromotions();
});

watch([filteredPromotions, keyword, statusFilter], async () => {
  currentPage.value = Math.min(currentPage.value, Math.max(1, Math.ceil(filteredPromotions.value.length / pageSize.value)));
  await nextTick();
});
</script>

<style scoped>
.promotions-page {
  --app-card-gap: 16px;
  display: flex;
  flex-direction: column;
  height: var(--app-page-min-height);
  min-height: 0;
  overflow: visible;
}

.promotions-card {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.promotions-card :deep(.app-table-wrapper) {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.promotions-card :deep(.app-table-scroll) {
  min-height: 0;
  overflow-x: auto;
  overflow-y: visible;
}

.promotions-card :deep(.app-pagination) {
  flex-shrink: 0;
}

.promotions-page :deep(.stat-card-grid) {
  flex-shrink: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

@media (max-width: 960px) {
  .promotions-page :deep(.stat-card-grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.promotion-info-cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.promotion-info-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

[data-promotion-search-module] {
  flex-shrink: 0;
  border-bottom: 0;
  background: #ffffff;
}

.promotions-card :deep(.app-table-th) {
  border-top: 0 !important;
  border-bottom: 0 !important;
}

.promotion-title {
  display: block;
  max-width: 460px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1e293b;
  font-weight: 700;
}

.promotion-info-date {
  display: block;
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #475569;
  font-size: 12px;
  line-height: 1.4;
}

.promotion-counts {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: #475569;
  font-size: 12px;
  line-height: 1.35;
}

.promotion-add-plan {
  display: inline-block;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #b45309;
  font-size: 12px;
  line-height: 18px;
}

.promotion-add-plan.is-empty {
  color: #64748b;
}

.promotion-auto-column {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  white-space: nowrap;
}

.promotion-auto-column.is-enabled {
  color: #111827;
  background: #f5b800;
}

.promotion-auto-column strong {
  color: #000000;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
}

.promotion-auto-column.is-muted {
  color: #64748b;
  background: #f1f5f9;
}

.table-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}
</style>
