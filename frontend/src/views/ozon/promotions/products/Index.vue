<template>
  <MainLayout>
    <div class="p-6 promotion-products-page app-page-stack">
      <div class="promotion-products-card flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="promotion-products-header">
          <div class="promotion-header-main">
            <div class="promotion-title-row">
              <button type="button" class="promotion-back-link" @click="router.push('/ozon/promotions')">
                <el-icon><ArrowLeft /></el-icon>
                <span>返回活动</span>
              </button>
              <span class="promotion-header-divider"></span>
              <h1 class="promotion-header-title" :title="activityTitle">{{ activityTitle || `活动 ${actionId}` }}</h1>
            </div>
            <div v-if="activityHint" class="promotion-activity-hint">{{ activityHint }}</div>
          </div>
          <div class="promotion-status-tabs" role="tablist">
            <button
              v-for="tab in statusTabs"
              :key="tab.key"
              type="button"
              :class="['promotion-status-tab', { 'is-active': participationFilter === tab.key, 'is-unavailable': tab.unavailableReason }]"
              :title="tab.unavailableReason || ''"
              :aria-disabled="tab.unavailableReason ? 'true' : 'false'"
              @click="setParticipationFilter(tab.key)"
            >
              <span>{{ tab.label }}</span>
              <span v-if="tab.count !== null" class="promotion-status-tab-count">{{ tab.count }}</span>
            </button>
          </div>
        </div>

        <div class="px-6 h-[100px] flex items-center promotion-products-search" data-promotion-products-search-module>
          <div class="promotion-products-search-inner">
            <AppSearch v-model="keyword" placeholder="搜索商品名称、ID、SKU 或货号" @search="handleSearch" />
            <div class="promotion-products-search-actions">
              <el-button type="primary" class="btn-create promotion-add-button" @click="openAddDrawer">
                <el-icon class="mr-1"><Plus /></el-icon>
                <span>添加商品</span>
              </el-button>
            </div>
          </div>
        </div>

        <AppTable
          class="promotion-products-table"
          :columns="columns"
          :data="paginatedProducts"
          :loading="loading"
          empty-text="暂无活动商品"
        >
          <template #header-index>序号</template>
          <template #header-photo>照片</template>
          <template #header-sku>
            <div class="table-header-stack">
              <span class="promotion-table-mainhead">货号</span>
              <span class="promotion-table-subhead">SKU</span>
            </div>
          </template>
          <template #header-product>
            <div class="table-header-stack">
              <span class="promotion-table-mainhead">商品名称</span>
              <span class="promotion-table-subhead">类目</span>
            </div>
          </template>
          <template #header-ownPrice>
            <div class="table-header-stack right">
              <span class="promotion-table-mainhead">售价</span>
              <span class="promotion-table-subhead">底价</span>
            </div>
          </template>
          <template #header-currentPromotion>
            <div class="table-header-stack right">
              <span class="promotion-table-mainhead">当前价</span>
              <span class="promotion-table-subhead">当前折扣</span>
            </div>
          </template>
          <template #header-activityDiscount>
            <div class="table-header-stack right">
              <span class="promotion-table-mainhead">定价折扣</span>
              <span class="promotion-table-subhead">优惠额</span>
            </div>
          </template>
          <template #header-promotionPrice>
            <div class="table-header-stack right">
              <span class="promotion-table-mainhead">活动价</span>
              <span class="promotion-table-subhead">促销提升</span>
            </div>
          </template>
          <template #header-promotionProductCount>
            <div class="table-header-stack right">
              <span class="promotion-table-mainhead">促销</span>
              <span class="promotion-table-subhead">商品数</span>
            </div>
          </template>
          <template #cell-photo="{ row }">
            <AppImage :src="row.image" :alt="row.name" class="product-image" empty-text="暂无图片" error-text="加载失败" />
          </template>
          <template #cell-sku="{ row }">
            <div class="sku-cell">
              <span class="sku-offer" :title="row.offerId || '-'">{{ row.offerId || '-' }}</span>
              <span class="sku-id">{{ row.sku || row.productId || row.id || '-' }}</span>
            </div>
          </template>
          <template #cell-product="{ row }">
            <div class="product-cell">
              <div class="product-meta">
                <span class="product-name" :title="getProductNameTitle(row)">{{ getProductDisplayName(row) }}</span>
                <span class="product-category" :title="getProductCategory(row)">{{ getProductCategory(row) }}</span>
              </div>
            </div>
          </template>
          <template #cell-ownPrice="{ row }">
            <div class="money-cell">
              <span>{{ formatMoney(row.price) }}</span>
              <span>{{ formatMoney(getMinPrice(row)) }}</span>
            </div>
          </template>
          <template #cell-currentPromotion="{ row }">
            <div class="money-cell">
              <span>{{ formatMoney(getCurrentPromotionPrice(row)) }}</span>
              <span>{{ formatPercent(getCurrentPromotionDiscount(row)) }}</span>
            </div>
          </template>
          <template #cell-activityDiscount="{ row }">
            <div class="money-cell editable-promotion-cell" @click="startInlineEdit(row, 'discount')">
              <span v-show="isInlineEditing(row, 'discount')" class="editable-promotion-input-wrap" @click.stop>
                <input
                  v-model="inlineEditValue"
                  class="editable-promotion-input"
                  :data-edit-key="getInlineEditKey(row, 'discount')"
                  @keydown.enter.prevent="saveInlinePromotionField(row, 'discount')"
                  @keydown.esc.stop.prevent="cancelInlineEdit"
                  @blur="cancelInlineEdit"
                />
                <button type="button" class="editable-promotion-clear" @mousedown.prevent @click="clearInlineEditValue(row, 'discount')">×</button>
              </span>
              <div v-show="!isInlineEditing(row, 'discount')" class="promotion-readonly-stack promotion-editable-display">
                <span>{{ formatPercent(getActivityDiscount(row)) }}</span>
                <span>{{ formatMoney(getActivityDiscountAmount(row)) }}</span>
                <el-icon class="editable-field-icon"><EditPen /></el-icon>
              </div>
            </div>
          </template>
          <template #cell-promotionPrice="{ row }">
            <div class="money-cell editable-promotion-cell" @click="startInlineEdit(row, 'price')">
              <span v-show="isInlineEditing(row, 'price')" class="editable-promotion-input-wrap" @click.stop>
                <input
                  v-model="inlineEditValue"
                  class="editable-promotion-input"
                  :data-edit-key="getInlineEditKey(row, 'price')"
                  @keydown.enter.prevent="saveInlinePromotionField(row, 'price')"
                  @keydown.esc.stop.prevent="cancelInlineEdit"
                  @blur="cancelInlineEdit"
                />
                <button type="button" class="editable-promotion-clear" @mousedown.prevent @click="clearInlineEditValue(row, 'price')">×</button>
              </span>
              <div v-show="!isInlineEditing(row, 'price')" class="promotion-readonly-stack promotion-editable-display">
                <span class="promotion-price">{{ formatMoney(getPromotionPrice(row)) }}</span>
                <span class="promotion-progress-line">
                  <i><b :style="{ width: `${getProgressWidth(getPromotionBoost(row))}%` }"></b></i>
                  <em>{{ formatPercent(getPromotionBoost(row)) }}</em>
                </span>
                <el-icon class="editable-field-icon"><EditPen /></el-icon>
              </div>
            </div>
          </template>
          <template #cell-promotionProductCount="{ row }">
            <div class="money-cell editable-promotion-cell" @click="startInlineEdit(row, 'count')">
              <span v-show="isInlineEditing(row, 'count')" class="editable-promotion-input-wrap" @click.stop>
                <input
                  v-model="inlineEditValue"
                  class="editable-promotion-input"
                  :data-edit-key="getInlineEditKey(row, 'count')"
                  @keydown.enter.prevent="saveInlinePromotionField(row, 'count')"
                  @keydown.esc.stop.prevent="cancelInlineEdit"
                  @blur="cancelInlineEdit"
                />
                <button type="button" class="editable-promotion-clear" @mousedown.prevent @click="clearInlineEditValue(row, 'count')">×</button>
              </span>
              <div v-show="!isInlineEditing(row, 'count')" class="promotion-readonly-stack promotion-editable-display">
                <span>{{ getPromotionProductCountDisplay(row).main }}</span>
                <span>{{ getPromotionProductCountDisplay(row).sub }}</span>
                <el-icon class="editable-field-icon"><EditPen /></el-icon>
              </div>
            </div>
          </template>
          <template #cell-action="{ row }">
            <div class="row-actions">
              <AppTableButton name="detail" tooltip="详情" @click="openProductDetail(row)" />
              <AppTableButton
                name="delete"
                tooltip="移出活动"
                delete-confirm-text="确定要将该商品移出活动吗？"
                delete-confirm-button-text="移出"
                :disabled="removingProductId !== null && removingProductId !== Number(row.id)"
                :loading="removingProductId === Number(row.id)"
                @click="removeProduct(row)"
              />
            </div>
          </template>
          <template #loading>
            <AppSkeletonLoader variant="table" :rows="6" :columns="columns.length + 1" compact />
          </template>
        </AppTable>

        <AppPagination
          v-if="filteredProducts.length > 0"
          v-model="pagination.page"
          :total="filteredProducts.length"
          :page-size="pagination.pageSize"
          @change="handlePageChange"
        />
      </div>
      <PromotionAddProductsDrawer
        v-model:visible="showAddDrawer"
        :store-id="currentStoreId"
        :action-id="actionId"
        :activity-title="activityTitle"
        @added="loadProducts"
      />
      <PromotionProductDetailDrawer
        v-model:visible="detailDrawerVisible"
        v-model:show-raw-product-data="showRawProductData"
        :product="detailProduct"
        :formatted-raw-product="formattedRawProduct"
        :get-product-display-name="getProductDisplayName"
        :get-product-type-display="getProductTypeDisplay"
        :format-money="formatMoney"
        :format-percent="formatPercent"
        :format-number-text="formatNumberText"
        :get-min-price="getMinPrice"
        :get-current-promotion-price="getCurrentPromotionPrice"
        :get-current-promotion-discount="getCurrentPromotionDiscount"
        :get-promotion-price="getPromotionPrice"
        :get-activity-discount="getActivityDiscount"
        :get-activity-discount-amount="getActivityDiscountAmount"
        :get-promotion-boost="getPromotionBoost"
        :get-lift-price-min="getLiftPriceMin"
        :get-lift-price-max="getLiftPriceMax"
        :get-promotion-product-count-display="getPromotionProductCountDisplay"
        :get-seven-day-orders="getSevenDayOrders"
        :get-seven-day-views="getSevenDayViews"
        :get-ozon-warehouse-stock-display="getOzonWarehouseStockDisplay"
        :get-own-warehouse-stock-display="getOwnWarehouseStockDisplay"
        :get-required-sales-display="getRequiredSalesDisplay"
        :get-other-promotions-display="getOtherPromotionsDisplay"
        :get-limit-display="getLimitDisplay"
        :get-error-display="getErrorDisplay"
      />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, EditPen, Plus } from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
import { AppImage, AppPagination, AppSearch, AppSkeletonLoader, AppTable, AppTableButton } from '@/components/ui';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
import { useProductNameTranslations } from '@/composables/useProductNameTranslations';
import { ozonPromotionAPI, type OzonPromotion, type OzonPromotionProduct } from '@/api/ozonPromotionAPI';
import PromotionAddProductsDrawer from '../components/PromotionAddProductsDrawer.vue';
import PromotionProductDetailDrawer from '../components/PromotionProductDetailDrawer.vue';

const route = useRoute();
const router = useRouter();
const { loadStoreContext, storeContext } = useOzonStoreContext();
const { getTranslatedName, resolveNames } = useProductNameTranslations();
const currentStoreId = computed(() => storeContext.value?.resolvedStoreId ?? null);
const actionId = computed(() => Number(route.params.actionId || 0));
const activityTitle = computed(() => String(route.query.title || ''));
const loading = ref(true);
const products = ref<OzonPromotionProduct[]>([]);
const promotionMeta = ref<OzonPromotion | null>(null);
const total = ref(0);
const removingProductId = ref<number | null>(null);
const savingInlineField = ref(false);
const keyword = ref('');
const participationFilter = ref('active');
const showAddDrawer = ref(false);
const pagination = reactive({ page: 1, pageSize: 20 });
const detailDrawerVisible = ref(false);
const detailProduct = ref<OzonPromotionProduct | null>(null);
const showRawProductData = ref(false);
type EditablePromotionField = 'count' | 'discount' | 'price';
const inlineEditTarget = ref<{ productId: number; field: EditablePromotionField } | null>(null);
const inlineEditValue = ref('');

const columns = [
  { key: 'photo', label: '照片', width: '20' },
  { key: 'sku', label: '货号', width: '28' },
  { key: 'product', label: '商品名称', minWidth: '116px' },
  { key: 'ownPrice', label: '售价', width: '24', align: 'right' as const },
  { key: 'currentPromotion', label: '当前价', width: '28', align: 'right' as const },
  { key: 'activityDiscount', label: '活动折扣', width: '28', align: 'right' as const },
  { key: 'promotionPrice', label: '活动价', width: '28', align: 'right' as const },
  { key: 'promotionProductCount', label: '促销商品数', width: '28', align: 'right' as const },
  { key: 'action', label: '操作', width: '24', align: 'center' as const },
];

const parseDateTime = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const getRawValue = (row: OzonPromotionProduct, keys: string[]) => {
  for (const key of keys) {
    const value = row?.[key] ?? row?.raw?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

const getMetaRawValue = (keys: string[]) => {
  const source = promotionMeta.value as any;
  for (const key of keys) {
    const value = source?.[key] ?? source?.raw?.[key] ?? source?.result?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

const parseQueryAutoAddDates = () => {
  const value = route.query.autoAddDates;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(item => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const parseQueryAutoAddPlanCounts = () => {
  const value = route.query.autoAddPlanCounts;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce<Record<string, number>>((acc, [date, count]) => {
      const numericCount = Number(count);
      if (date && Number.isFinite(numericCount) && numericCount > 0) acc[String(date)] = numericCount;
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const getSortedAutoAddDates = () => {
  const metaDates = getMetaRawValue(['auto_add_dates', 'autoAddDates']);
  const dates = Array.isArray(metaDates) ? metaDates : parseQueryAutoAddDates();
  return dates
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
};

const getAutoAddPlanCounts = () => {
  const metaCounts = getMetaRawValue([
    'auto_add_counts',
    'autoAddCounts',
    'auto_add_products_counts',
    'autoAddProductsCounts',
    'auto_add_dates_counts',
    'autoAddDatesCounts',
    'planned_products_counts',
    'plannedProductsCounts',
  ]);
  if (Array.isArray(metaCounts)) {
    const dates = getSortedAutoAddDates();
    return dates.reduce<Record<string, number>>((acc, date, index) => {
      const count = Number(metaCounts[index]);
      if (Number.isFinite(count) && count > 0) acc[date] = count;
      return acc;
    }, {});
  }
  if (metaCounts && typeof metaCounts === 'object') {
    return Object.entries(metaCounts).reduce<Record<string, number>>((acc, [date, count]) => {
      const numericCount = Number(count);
      if (date && Number.isFinite(numericCount) && numericCount > 0) acc[String(date)] = numericCount;
      return acc;
    }, {});
  }
  return parseQueryAutoAddPlanCounts();
};

const getPlannedProductRows = (date: string) =>
  products.value.filter(row => getParticipationStatus(row) === 'planned' && getRowPlannedDate(row) === date);

const getPlannedTabCount = (date: string) => {
  const plannedCounts = getAutoAddPlanCounts();
  const explicitCount = Number(plannedCounts[date]);
  if (Number.isFinite(explicitCount) && explicitCount > 0) return explicitCount;

  const productRowCount = getPlannedProductRows(date).length;
  if (productRowCount > 0) return productRowCount;

  return null;
};

const getPlannedTabUnavailableReason = (date: string) => {
  if (getPlannedProductRows(date).length > 0) return '';
  const count = getPlannedTabCount(date);
  return count
    ? '活动未开始，Ozon 暂未开放该日期商品明细'
    : '活动未开始，暂未开放该日期商品明细';
};

const isPlannedTabSelectable = (key: string) => {
  if (!key.startsWith('planned:')) return true;
  return !getPlannedTabUnavailableReason(key.replace('planned:', ''));
};

const formatRawDateWithoutTimezoneShift = (value: unknown) => {
  if (!value) return '';
  const rawValue = String(value).trim();
  if (/[tT]\d{2}:\d{2}|\d{2}:\d{2}:\d{2}|[zZ]$|[+-]\d{2}:?\d{2}$/.test(rawValue)) {
    const date = new Date(rawValue);
    if (!Number.isNaN(date.getTime())) {
      const moscowTime = new Date(date.getTime() + 3 * 60 * 60 * 1000);
      const day = String(moscowTime.getUTCDate()).padStart(2, '0');
      const month = String(moscowTime.getUTCMonth() + 1).padStart(2, '0');
      return `${day}.${month}.${moscowTime.getUTCFullYear()}`;
    }
  }
  const rawDateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (rawDateMatch) return `${rawDateMatch[3]}.${rawDateMatch[2]}.${rawDateMatch[1]}`;
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
};

const formatOzonTabDate = (value: string) => {
  return formatRawDateWithoutTimezoneShift(value);
};

const formatActivityDate = (value: unknown) => {
  return formatRawDateWithoutTimezoneShift(value);
};

const activityHint = computed(() => {
  const start = formatActivityDate(getMetaRawValue(['date_start', 'dateStart']) || route.query.dateStart);
  const end = formatActivityDate(getMetaRawValue(['date_end', 'dateEnd']) || route.query.dateEnd);
  if (!start && !end) return '';
  if (start && end) return `从${start}至${end}（UTC+3，莫斯科时间）`;
  return start ? `从${start}起（UTC+3，莫斯科时间）` : `至${end}（UTC+3，莫斯科时间）`;
});

const getPlannedDateKey = (value: string) => `planned:${value}`;

const getRowPlannedDate = (row: OzonPromotionProduct) => {
  const rawDate = getRawValue(row, [
    'date_start',
    'dateStart',
    'start_date',
    'startDate',
    'start_at',
    'startAt',
    'started_at',
    'startedAt',
    'activate_at',
    'activateAt',
    'participate_from',
    'participateFrom',
    'auto_add_date',
    'autoAddDate',
  ]);
  if (!rawDate) return '';
  return String(rawDate);
};

const getParticipationStatus = (row: OzonPromotionProduct): 'active' | 'planned' => {
  const statusText = String(getRawValue(row, [
    'status',
    'participation_status',
    'participationStatus',
    'state',
    'action_status',
    'actionStatus',
  ]) || '').toLowerCase();
  if (/(planned|scheduled|future|pending|waiting|ожид|план|будущ)/i.test(statusText)) return 'planned';

  const startDate = parseDateTime(getRawValue(row, [
    'date_start',
    'dateStart',
    'start_at',
    'startAt',
    'started_at',
    'startedAt',
    'activate_at',
    'activateAt',
    'participate_from',
    'participateFrom',
  ]) || route.query.dateStart);
  if (startDate && startDate.getTime() > Date.now()) return 'planned';

  return 'active';
};

const activeCount = computed(() => products.value.filter(row => getParticipationStatus(row) === 'active').length);

const plannedTabs = computed(() => {
  const dates = getSortedAutoAddDates();
  return dates.map(date => ({
  key: getPlannedDateKey(date),
  label: `从${formatOzonTabDate(date)}起参与`,
  date,
  count: getPlannedTabCount(date),
  unavailableReason: getPlannedTabUnavailableReason(date),
  }));
});

const statusTabs = computed(() => [
  { key: 'active', label: '正在参与', count: activeCount.value, unavailableReason: '' },
  ...plannedTabs.value,
]);

const filteredProducts = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase();
  return products.value.filter(row => {
    const status = getParticipationStatus(row);
    if (participationFilter.value === 'active') {
      if (status !== 'active') return false;
    } else if (participationFilter.value.startsWith('planned:')) {
      if (status !== 'planned') return false;
      const selectedDate = participationFilter.value.replace('planned:', '');
      if (getRowPlannedDate(row) !== selectedDate) return false;
    }
    if (!normalizedKeyword) return true;
    return [
      row.name,
      getTranslatedName(row.name),
      row.productId,
      row.id,
      row.offerId,
      row.sku,
    ].join(' ').toLowerCase().includes(normalizedKeyword);
  });
});

const paginatedProducts = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize;
  return filteredProducts.value.slice(start, start + pagination.pageSize);
});

const formatMoney = (value: unknown) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return '-';
  return `${numberValue.toFixed(2).replace('.', ',')} ¥`;
};

const setParticipationFilter = (key: string) => {
  if (!isPlannedTabSelectable(key)) {
    const tab = statusTabs.value.find(item => item.key === key);
    ElMessage.info(tab?.unavailableReason || '活动未开始，暂未开放该日期商品明细');
    return;
  }
  participationFilter.value = key;
  handleSearch();
};

const formatPercent = (value: unknown) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return '-';
  return `${numberValue.toFixed(2).replace(/\.00$/, '')}%`;
};

const getProgressWidth = (value: unknown) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return 0;
  return Math.max(8, Math.min(100, numberValue));
};

const getNumberValue = (row: OzonPromotionProduct, keys: string[]) => {
  const value = getRawValue(row, keys);
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getBestProductName = (row: OzonPromotionProduct) => {
  const value = getRawValue(row, [
    'name',
    'product_name',
    'productName',
    'title',
    'product_title',
    'productTitle',
    'name_ru',
    'nameRu',
    'original_name',
    'originalName',
  ]) || row.name;
  return String(value || '').trim();
};

const getProductDisplayName = (row: OzonPromotionProduct) => {
  const bestName = getBestProductName(row);
  return getTranslatedName(bestName) || bestName || '-';
};

const getProductNameTitle = (row: OzonPromotionProduct) => {
  const bestName = getBestProductName(row);
  const translatedName = getTranslatedName(bestName);
  if (!translatedName || translatedName === bestName) return bestName || '-';
  return `${translatedName}\n${bestName}`;
};

const getProductCategory = (row: OzonPromotionProduct) => {
  const value = String(
    row.categoryLeaf ||
    row.category ||
    getRawValue(row, [
      'category_leaf',
      'categoryLeaf',
      'leaf_category',
      'leafCategory',
      'category_name',
      'categoryName',
      'category_title',
      'categoryTitle',
      'type_name',
      'typeName',
      'subject',
      'subject_name',
      'subjectName',
    ]) ||
    '-'
  );
  const INTERNAL_CATEGORY_VALUES = new Set(['ozon_product', 'ozon product', 'ozon-product']);
  return INTERNAL_CATEGORY_VALUES.has(value.trim().toLowerCase()) ? '-' : value;
};

const getProductTypeDisplay = (row: OzonPromotionProduct) => {
  const category = getProductCategory(row);
  if (category && category !== '-') return category;
  const typeId = getRawValue(row, ['productTypeId', 'typeId', 'type_id', 'typeId']);
  return typeId ? `类型 ${typeId}` : '类型未知';
};

const DEFAULT_RECOMMENDED_PRODUCT_COUNT = 5;

const getPromotionProductCountDisplay = (row: OzonPromotionProduct) => {
  const main = getRawValue(row, [
    'promotion_products_count',
    'promotionProductsCount',
    'action_products_count',
    'actionProductsCount',
    'products_count',
    'productsCount',
    'stock',
    'quantity',
  ]);
  const recommended = getRawValue(row, [
    'recommended_products_count',
    'recommendedProductsCount',
    'recommended_quantity',
    'recommendedQuantity',
    'recommend_count',
    'recommendCount',
    'min_stock',
    'minStock',
  ]);
  const recommendedValue = Number(recommended);
  const suggestedCount = Number.isFinite(recommendedValue) && recommendedValue > 0
    ? String(recommended)
    : String(DEFAULT_RECOMMENDED_PRODUCT_COUNT);
  return {
    main: main === null || String(main) === '' || Number(main) <= 0 ? '无限' : String(main),
    sub: `建议 ${suggestedCount}`,
  };
};

const getMinPrice = (row: OzonPromotionProduct) => getNumberValue(row, [
  'min_price',
  'minPrice',
  'minimal_price',
  'minimalPrice',
  'marketing_price',
  'marketingPrice',
]);

const getCurrentPromotionPrice = (row: OzonPromotionProduct) => getNumberValue(row, [
  'current_price',
  'currentPrice',
  'current_action_price',
  'currentActionPrice',
  'action_price',
  'actionPrice',
]) || Number(row.actionPrice || 0);

const getPromotionPrice = (row: OzonPromotionProduct) => getNumberValue(row, [
  'action_price',
  'actionPrice',
  'discount_price',
  'discountPrice',
  'price_with_discount',
  'priceWithDiscount',
]) || Number(row.actionPrice || row.maxActionPrice || 0);

const getPromotionBoost = (row: OzonPromotionProduct) => getNumberValue(row, [
  'current_boost',
  'currentBoost',
  'promotion_boost',
  'promotionBoost',
  'action_boost',
  'actionBoost',
  'boost',
]);

const getCurrentPromotionDiscount = (row: OzonPromotionProduct) => {
  const explicit = getNumberValue(row, [
    'current_discount',
    'currentDiscount',
    'discount',
    'discount_percent',
    'discountPercent',
  ]);
  if (explicit > 0) return explicit;
  const price = Number(row.price || 0);
  const promotionPrice = getCurrentPromotionPrice(row);
  if (price <= 0 || promotionPrice <= 0 || promotionPrice >= price) return 0;
  return ((price - promotionPrice) / price) * 100;
};

const getActivityDiscount = (row: OzonPromotionProduct) => {
  const explicit = getNumberValue(row, [
    'action_discount',
    'actionDiscount',
    'action_discount_percent',
    'actionDiscountPercent',
    'discount_value',
    'discountValue',
  ]);
  if (explicit > 0) return explicit;
  const price = Number(row.price || 0);
  const promotionPrice = getPromotionPrice(row);
  if (price <= 0 || promotionPrice <= 0 || promotionPrice >= price) return 0;
  return ((price - promotionPrice) / price) * 100;
};

const getActivityDiscountAmount = (row: OzonPromotionProduct) => {
  const explicit = getNumberValue(row, [
    'discount_amount',
    'discountAmount',
    'action_discount_amount',
    'actionDiscountAmount',
  ]);
  if (explicit > 0) return explicit;
  const price = Number(row.price || 0);
  const promotionPrice = getPromotionPrice(row);
  if (price <= 0 || promotionPrice <= 0 || promotionPrice >= price) return 0;
  return price - promotionPrice;
};

const isInlineEditing = (row: OzonPromotionProduct, field: EditablePromotionField) => {
  return inlineEditTarget.value?.productId === Number(row.id) && inlineEditTarget.value.field === field;
};

const getInlineEditKey = (row: OzonPromotionProduct, field: EditablePromotionField) => {
  return `${Number(row.id)}-${field}`;
};

const getInlineFieldValue = (row: OzonPromotionProduct, field: EditablePromotionField) => {
  if (field === 'count') {
    const value = getRawValue(row, ['stock', 'promotion_products_count', 'promotionProductsCount', 'quantity']);
    return value === null || Number(value) <= 0 ? '' : String(value);
  }
  if (field === 'discount') return getActivityDiscount(row) > 0 ? String(Number(getActivityDiscount(row).toFixed(2))) : '';
  return getPromotionPrice(row) > 0 ? String(getPromotionPrice(row)) : '';
};

const startInlineEdit = (row: OzonPromotionProduct, field: EditablePromotionField) => {
  if (savingInlineField.value) return;
  inlineEditTarget.value = { productId: Number(row.id), field };
  inlineEditValue.value = getInlineFieldValue(row, field);
  void nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(`.editable-promotion-input[data-edit-key="${getInlineEditKey(row, field)}"]`);
    if (!input) return;
    input.focus();
    const cursorPosition = input.value.length;
    input.setSelectionRange(cursorPosition, cursorPosition);
  });
};

const cancelInlineEdit = () => {
  inlineEditTarget.value = null;
  inlineEditValue.value = '';
};

const clearInlineEditValue = (row: OzonPromotionProduct, field: EditablePromotionField) => {
  inlineEditValue.value = '';
  void nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(`.editable-promotion-input[data-edit-key="${getInlineEditKey(row, field)}"]`);
    input?.focus();
  });
};

const saveInlinePromotionField = async (row: OzonPromotionProduct, field: EditablePromotionField) => {
  if (!isInlineEditing(row, field) || savingInlineField.value) return;
  if (!currentStoreId.value || !actionId.value || !row.id) return;

  const rawValue = inlineEditValue.value.trim().replace(',', '.');
  const numericValue = rawValue === '' ? 0 : Number(rawValue);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    ElMessage.warning('请输入有效数值');
    return;
  }

  let actionPrice = getPromotionPrice(row);
  let stock = Number(getRawValue(row, ['stock', 'promotion_products_count', 'promotionProductsCount', 'quantity']) || 0);
  if (field === 'price') actionPrice = numericValue;
  if (field === 'discount') {
    const price = Number(row.price || 0);
    if (price <= 0) {
      ElMessage.warning('缺少商品定价，无法按折扣保存');
      return;
    }
    actionPrice = Number((price * (100 - numericValue) / 100).toFixed(2));
  }
  if (field === 'count') stock = numericValue;
  if (actionPrice <= 0) {
    ElMessage.warning('请先填写活动价');
    return;
  }

  savingInlineField.value = true;
  try {
    const response = await ozonPromotionAPI.activateProduct(currentStoreId.value, actionId.value, {
      productId: Number(row.id),
      actionPrice,
      stock,
    });
    if (response.success) {
      row.actionPrice = actionPrice;
      row.stock = stock;
      ElMessage.success(response.message || '已保存');
      cancelInlineEdit();
      await loadProducts();
    } else {
      ElMessage.error(getOperationMessage(response, '保存失败'));
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    savingInlineField.value = false;
  }
};

const formatNumberText = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '-';
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return String(value);
  return String(numberValue);
};

const getLiftPriceMin = (row: OzonPromotionProduct) => getNumberValue(row, [
  'boost_price_min',
  'boostPriceMin',
  'max_action_price',
  'maxActionPrice',
  'price_min_elastic',
  'priceMinElastic',
  'min_boost_price',
  'minBoostPrice',
  'min_lift_price',
  'minLiftPrice',
  'min_action_price',
  'minActionPrice',
  'min_price_for_boost',
  'minPriceForBoost',
]);

const getLiftPriceMax = (row: OzonPromotionProduct) => getNumberValue(row, [
  'boost_price_max',
  'boostPriceMax',
  'price_max_elastic',
  'priceMaxElastic',
  'max_boost_price',
  'maxBoostPrice',
  'max_lift_price',
  'maxLiftPrice',
  'max_price_for_boost',
  'maxPriceForBoost',
]);

const getSevenDayOrders = (row: OzonPromotionProduct) => getRawValue(row, [
  'orders',
  'order_count',
  'orderCount',
  'orders_count',
  'ordersCount',
  'orders_7_days',
  'orders7Days',
  'orders_count_7_days',
  'ordersCount7Days',
  'last_7_days_orders',
  'last7DaysOrders',
  'last_7_days_orders_count',
  'last7DaysOrdersCount',
  'last_week_orders_count',
  'lastWeekOrdersCount',
]);

const getSevenDayViews = (row: OzonPromotionProduct) => getRawValue(row, [
  'views',
  'view_count',
  'viewCount',
  'views_count',
  'viewsCount',
  'shows',
  'show_count',
  'showCount',
  'shows_count',
  'showsCount',
  'impressions',
  'impressions_count',
  'impressionsCount',
  'display_count',
  'displayCount',
  'last_7_days_views',
  'last7DaysViews',
  'last_7_days_views_count',
  'last7DaysViewsCount',
  'last_7_days_shows',
  'last7DaysShows',
  'last_7_days_show_count',
  'last7DaysShowCount',
]);

const getOzonWarehouseStockDisplay = (row: OzonPromotionProduct) => {
  const value = getRawValue(row, [
    'stockFbo',
    'fboPresent',
    'ozon_stock',
    'ozonStock',
    'fbo_stock',
    'fboStock',
    'stock_on_ozon',
    'stockOnOzon',
    'stock_in_ozon',
    'stockInOzon',
  ]);
  return value === null ? '-' : formatNumberText(value);
};

const getOwnWarehouseStockDisplay = (row: OzonPromotionProduct) => {
  const value = getRawValue(row, [
    'stockFbs',
    'warehouseInventoryQuantity',
    'fbsPresent',
    'my_stock',
    'myStock',
    'fbs_stock',
    'fbsStock',
    'own_stock',
    'ownStock',
    'stock_in_my_warehouse',
    'stockInMyWarehouse',
    'warehouse_stock',
    'warehouseStock',
  ]);
  return value === null ? '-' : formatNumberText(value);
};

const getRequiredSalesDisplay = (row: OzonPromotionProduct) => {
  const value = getRawValue(row, [
    'required_sales',
    'requiredSales',
    'need_sell',
    'needSell',
    'required_quantity',
    'requiredQuantity',
    'target_sales',
    'targetSales',
  ]);
  if (value === null) {
    const stock = Number(getRawValue(row, ['stock', 'promotion_products_count', 'promotionProductsCount', 'quantity']) ?? 0);
    return Number.isFinite(stock) && stock <= 0 ? '无限' : '-';
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue <= 0 ? '无限' : formatNumberText(value);
};

const getOtherPromotionsDisplay = (row: OzonPromotionProduct) => {
  const value = getRawValue(row, [
    'productPromotions',
    'promotions',
    'other_actions',
    'otherActions',
    'other_promotions',
    'otherPromotions',
    'active_actions',
    'activeActions',
    'other_action_count',
    'otherActionCount',
  ]);
  if (value === null) return '-';
  if (Array.isArray(value)) return value.length ? `${value.length}个促销活动` : '-';
  if (typeof value === 'object') {
    const count = Number((value as any).count ?? (value as any).total ?? (value as any).length);
    return Number.isFinite(count) && count > 0 ? `${count}个促销活动` : JSON.stringify(value);
  }
  return String(value);
};

const getLimitDisplay = (row: OzonPromotionProduct) => {
  const value = getRawValue(row, [
    'restriction',
    'restrictions',
    'limit',
    'limits',
    'reject_reasons',
    'rejectReasons',
    'reasons',
  ]);
  const messages = collectMessages(value);
  return messages.join('；') || '-';
};

const getErrorDisplay = (row: OzonPromotionProduct) => {
  return getRowWarnings(row).join('；') || '-';
};

const formattedRawProduct = computed(() => {
  if (!detailProduct.value) return '';
  return JSON.stringify(detailProduct.value.raw || detailProduct.value, null, 2);
});

const loadProducts = async () => {
  if (!currentStoreId.value || !actionId.value) {
    products.value = [];
    total.value = 0;
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const response = await ozonPromotionAPI.getPromotionProducts(currentStoreId.value, actionId.value, {
      limit: 1000,
      offset: 0,
    });
    if (response.success && response.data) {
      products.value = response.data.products || [];
      total.value = response.data.total || products.value.length;
      pagination.page = 1;
      await resolveNames(products.value.map(row => row.name).filter(Boolean));
    } else {
      ElMessage.error(response.message || '获取活动商品失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取活动商品失败');
  } finally {
    loading.value = false;
  }
};

const loadPromotionMeta = async () => {
  if (!currentStoreId.value || !actionId.value) return;
  try {
    const response = await ozonPromotionAPI.getPromotions(currentStoreId.value);
    if (response.success && response.data?.actions) {
      promotionMeta.value = response.data.actions.find(row => Number(row.id) === actionId.value) || null;
    }
  } catch {
    promotionMeta.value = null;
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

const openAddDrawer = () => {
  showAddDrawer.value = true;
};

const openProductDetail = (row: OzonPromotionProduct) => {
  detailProduct.value = row;
  showRawProductData.value = false;
  detailDrawerVisible.value = true;
};

const removeProduct = async (row: OzonPromotionProduct) => {
  if (!currentStoreId.value || !actionId.value || !row.id) return;
  removingProductId.value = Number(row.id);
  try {
    const response = await ozonPromotionAPI.deactivateProduct(currentStoreId.value, actionId.value, Number(row.id));
    if (response.success) {
      ElMessage.success(response.message || '商品已移出活动');
      await loadProducts();
    } else {
      ElMessage.error(getOperationMessage(response, '商品移出活动失败'));
    }
  } catch (error: any) {
    ElMessage.error(error.message || '商品移出活动失败');
  } finally {
    removingProductId.value = null;
  }
};

const handlePageChange = (page: number) => {
  pagination.page = page;
};

const handleSearch = () => {
  pagination.page = 1;
};

onMounted(async () => {
  await loadStoreContext(true);
  await loadPromotionMeta();
  await loadProducts();
});

watch(currentStoreId, () => {
  pagination.page = 1;
  void loadPromotionMeta();
  void loadProducts();
});

watch([filteredProducts, participationFilter], () => {
  pagination.page = Math.min(pagination.page, Math.max(1, Math.ceil(filteredProducts.value.length / pagination.pageSize)));
});
</script>

<style scoped>
.promotion-products-page {
  height: var(--app-page-min-height);
  min-height: var(--app-page-min-height);
  overflow: hidden;
}

.promotion-products-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: var(--app-page-min-height);
  overflow: hidden;
}

.promotion-products-card :deep(.app-table-wrapper) {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.promotion-products-card :deep(.app-table-scroll) {
  min-height: 0;
  overflow-x: auto;
  overflow-y: visible;
}

.promotion-products-card :deep(.app-table-wrapper--empty) {
  min-height: clamp(260px, calc(100vh - 430px), 360px);
}

.promotion-products-table {
  --app-table-min-width: 0;
}

.promotion-products-table :deep(.app-table) {
  min-width: var(--app-table-min-width);
  table-layout: fixed;
}

.promotion-products-table :deep(.app-table-th:nth-child(1)),
.promotion-products-table :deep(.app-table-td:nth-child(1)) {
  width: 4.5% !important;
}

.promotion-products-table :deep(.app-table-th:nth-child(2)),
.promotion-products-table :deep(.app-table-td:nth-child(2)) {
  width: 6% !important;
}

.promotion-products-table :deep(.app-table-th:nth-child(3)),
.promotion-products-table :deep(.app-table-td:nth-child(3)) {
  width: 12% !important;
}

.promotion-products-table :deep(.app-table-th:nth-child(4)),
.promotion-products-table :deep(.app-table-td:nth-child(4)) {
  width: 17% !important;
}

.promotion-products-table :deep(.app-table-th:nth-child(5)),
.promotion-products-table :deep(.app-table-td:nth-child(5)) {
  width: 8% !important;
}

.promotion-products-table :deep(.app-table-th:nth-child(6)),
.promotion-products-table :deep(.app-table-td:nth-child(6)),
.promotion-products-table :deep(.app-table-th:nth-child(7)),
.promotion-products-table :deep(.app-table-td:nth-child(7)),
.promotion-products-table :deep(.app-table-th:nth-child(8)),
.promotion-products-table :deep(.app-table-td:nth-child(8)) {
  width: 9% !important;
}

.promotion-products-table :deep(.app-table-th:nth-child(9)),
.promotion-products-table :deep(.app-table-td:nth-child(9)) {
  width: 9.5% !important;
}

.promotion-products-table :deep(.app-table-th:nth-child(10)),
.promotion-products-table :deep(.app-table-td:nth-child(10)) {
  width: 7% !important;
}

.promotion-products-header {
  min-height: 76px;
  padding: 0 30px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.promotion-header-main {
  min-width: 0;
  display: grid;
  grid-template-columns: 88px 1px minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 14px;
  align-items: center;
}

.promotion-title-row {
  display: contents;
}

.promotion-back-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  gap: 5px;
  min-width: 78px;
  grid-row: 1 / span 2;
  grid-column: 1;
  border: 0;
  background: transparent;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  padding: 6px 4px;
  white-space: nowrap;
}

.promotion-back-link:hover {
  color: #2563eb;
}

.promotion-header-divider {
  width: 1px;
  height: 48px;
  grid-row: 1 / span 2;
  grid-column: 2;
  background: #cbd5e1;
  flex-shrink: 0;
}

.promotion-header-title {
  grid-row: 1;
  grid-column: 3;
  max-width: 760px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
}

.promotion-activity-hint {
  grid-row: 2;
  grid-column: 3;
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
  line-height: 18px;
}

.promotion-status-tabs {
  display: inline-flex;
  align-self: center;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 4px;
  border-radius: 999px;
  background: rgba(248, 251, 255, 0.78);
}

.promotion-status-tab {
  position: relative;
  height: 32px;
  padding: 0 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  color: #475569;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.promotion-status-tab::after {
  content: "";
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 4px;
  height: 2px;
  border-radius: 999px;
  background: transparent;
  transition: background 0.18s ease, transform 0.18s ease;
  transform: scaleX(0.45);
}

.promotion-status-tab.is-active {
  color: #2563eb;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.92));
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.12), inset 0 0 0 1px rgba(147, 197, 253, 0.58);
}

.promotion-status-tab.is-active::after {
  background: #3b82f6;
  transform: scaleX(1);
}

.promotion-status-tab.is-unavailable {
  color: #94a3b8;
  cursor: help;
}

.promotion-status-tab.is-unavailable.is-active {
  box-shadow: none;
}

.promotion-status-tab.is-unavailable.is-active::after {
  background: transparent;
}

.promotion-status-tab-count {
  height: 17px;
  min-width: 17px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #2563eb;
  background: rgba(219, 234, 254, 0.9);
  font-size: 11px;
  line-height: 17px;
  font-weight: 700;
}

.promotion-status-tab.is-active .promotion-status-tab-count {
  color: #ffffff;
  background: #3b82f6;
}

.promotion-products-search {
  border-bottom: 0;
  background: #ffffff;
}

.promotion-products-search-inner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.promotion-products-search-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.product-cell {
  width: 100%;
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.product-image {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.product-meta,
.money-cell,
.sku-cell {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name {
  max-width: min(180px, 100%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1e293b;
  font-weight: 600;
  font-size: 12px;
}

.product-category,
.sku-id,
.money-cell span:nth-child(2) {
  color: #64748b;
  font-size: 12px;
}

.sku-offer {
  max-width: 112px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
}

.table-header-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 17px;
}

.promotion-table-mainhead {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.promotion-table-subhead {
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
}

.table-header-stack.right {
  align-items: flex-end;
}

.money-cell {
  align-items: flex-end;
  color: #0f172a;
  font-size: 13px;
  font-weight: 500;
}

.promotion-readonly-stack {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.promotion-progress-line {
  min-width: 86px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  line-height: 16px;
}

.promotion-progress-line i {
  width: 52px;
  height: 6px;
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 999px;
  background: #d6dee8;
}

.promotion-progress-line b {
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  border-radius: inherit;
  background: #2f5fa9;
}

.promotion-progress-line em {
  min-width: 30px;
  color: #64748b;
  font-style: normal;
  text-align: right;
}

.promotion-price {
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
}

.editable-promotion-cell {
  min-height: 36px;
  cursor: text;
}

.promotion-editable-display {
  min-width: 88px;
  max-width: 100%;
  min-height: 32px;
  position: relative;
  box-sizing: border-box;
  padding: 0 18px 0 0;
  justify-content: center;
  border: 0;
  background: transparent;
}

.editable-promotion-cell:hover .promotion-editable-display {
  background: transparent;
}

.editable-field-icon {
  width: 14px;
  height: 14px;
  position: absolute;
  top: 50%;
  right: 7px;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 14px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.16s ease, color 0.16s ease;
}

.promotion-products-table td:hover .editable-field-icon,
.editable-promotion-cell:hover .editable-field-icon,
.promotion-editable-display:hover .editable-field-icon {
  color: #2563eb;
  opacity: 1;
}

.editable-promotion-input-wrap {
  width: 100%;
  max-width: 100%;
  height: 28px;
  min-width: 0;
  position: relative;
  display: block;
}

.editable-promotion-input {
  width: 100%;
  max-width: 100%;
  height: 28px;
  box-sizing: border-box;
  padding: 0 28px 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
  line-height: 28px;
  text-align: left;
  outline: none;
}

.editable-promotion-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.editable-promotion-clear {
  width: 22px;
  height: 22px;
  padding: 0;
  position: absolute;
  top: 3px;
  right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #94a3b8;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.editable-promotion-clear:hover {
  color: #64748b;
  background: #f1f5f9;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.price-stock-form {
  display: grid;
  gap: 14px;
}

.dialog-field {
  display: grid;
  gap: 7px;
}

.dialog-field label {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
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

:global(.promotion-price-stock-dialog) {
  width: min(520px, calc(100vw - 48px));
}

:deep(.app-table) {
  min-width: 1280px;
}

:deep(.app-table-th.center),
:deep(.app-table-td.center) {
  text-align: center;
}

:deep(.app-table-th) {
  vertical-align: top;
}

.promotion-products-table :deep(.app-table-th) {
  border-top: 0 !important;
  border-bottom: 0 !important;
}

@media (max-width: 1280px) {
  .promotion-products-search {
    height: auto;
    min-height: 100px;
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .promotion-products-search-inner {
    flex-wrap: wrap;
  }

  .promotion-products-search-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
