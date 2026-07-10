<template>
  <el-drawer
    v-model="drawerVisible"
    direction="ttb"
    size="90%"
    :show-close="false"
    class="promotion-add-drawer"
    @closed="handleClosed"
  >
    <template #header>
      <div class="app-surface-header app-surface-header--drawer">
        <div class="app-surface-icon">
          <el-icon class="text-blue-600 text-lg"><Box /></el-icon>
        </div>
        <div class="app-surface-title-wrapper">
          <span class="app-surface-title">添加活动商品</span>
          <span class="app-surface-subtitle" :title="activityTitle">{{ activityTitle || `活动 ${actionId}` }}</span>
        </div>
      </div>
    </template>

    <div class="promotion-add-drawer-body">
      <div class="promotion-add-search">
        <AppSearch v-model="keyword" placeholder="搜索商品名称、ID、SKU 或货号" @search="handleSearch" />
        <el-button type="primary" class="btn-create promotion-refresh-button" :loading="loading" @click="loadCandidates">
          <el-icon class="mr-1"><Refresh /></el-icon>
          刷新候选
        </el-button>
      </div>

      <div class="promotion-add-table-area">
        <AppTable
          class="promotion-add-table"
          :columns="columns"
          :data="paginatedProducts"
          :loading="loading"
          empty-text="暂无可添加商品"
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
          <div class="table-header-stack right promotion-activity-header">
            <span class="promotion-table-mainhead">定价折扣</span>
            <span class="promotion-table-subhead">优惠额</span>
          </div>
        </template>
        <template #header-actionPrice>
          <div class="table-header-stack right promotion-activity-header">
            <span class="promotion-table-mainhead">该促销活动价格</span>
            <span class="promotion-table-subhead">促销提升</span>
          </div>
        </template>
        <template #header-boostPrice>
          <div class="table-header-stack right">
            <span class="promotion-table-mainhead">提升价格</span>
            <span class="promotion-table-subhead">最小 / 最大</span>
          </div>
        </template>
        <template #header-stockSummary>
          <div class="table-header-stack right">
            <span class="promotion-table-mainhead">仓库库存</span>
            <span class="promotion-table-subhead">Ozon / 我的</span>
          </div>
        </template>
        <template #header-promotionProductCount>
          <div class="table-header-stack right promotion-activity-header">
            <span class="promotion-table-mainhead">促销</span>
            <span class="promotion-table-subhead">商品数</span>
          </div>
        </template>
        <template #header-action>操作</template>
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
              <span class="product-name" :title="getProductName(row).main">{{ getProductName(row).main }}</span>
              <span class="product-category" :title="getProductCategory(row)">{{ getProductCategory(row) }}</span>
            </div>
          </div>
        </template>
        <template #cell-ownPrice="{ row }">
          <div class="price-cell">
            <span>{{ formatMoney(row.price) }}</span>
            <span>{{ formatMoney(getMinPrice(row)) }}</span>
          </div>
        </template>
        <template #cell-currentPromotion="{ row }">
          <div class="price-cell">
            <span>{{ formatMoney(getCurrentPromotionPrice(row)) }}</span>
            <span>{{ formatPercent(getCurrentPromotionDiscount(row), true) }}</span>
          </div>
        </template>
        <template #cell-activityDiscount="{ row }">
          <div class="candidate-edit-cell" @click="startCandidateEdit(row, 'discount')">
            <span v-if="isCandidateEditing(row, 'discount')" class="candidate-edit-input-wrap" @click.stop>
              <input
                v-model="candidateEditValue"
                class="candidate-edit-input"
                :data-edit-key="getCandidateEditKey(row, 'discount')"
                @keydown.enter.prevent="commitCandidateEdit(row, 'discount')"
                @keydown.esc.stop.prevent="cancelCandidateEdit"
                @blur="commitCandidateEdit(row, 'discount')"
              />
              <button
                v-if="candidateEditValue"
                type="button"
                class="candidate-edit-clear"
                aria-label="清除"
                @mousedown.prevent
                @click.stop="clearCandidateEditValue(row, 'discount')"
              >
                ×
              </button>
            </span>
            <span v-else class="candidate-edit-text">
              <span>{{ formatPercent(getDraftDiscount(row), true) }}</span>
              <span>{{ formatMoney(getActivityDiscountAmount(row), { allowNegative: true }) }}</span>
            </span>
          </div>
        </template>
        <template #cell-actionPrice="{ row }">
          <div class="candidate-edit-cell" @click="startCandidateEdit(row, 'actionPrice')">
            <span v-if="isCandidateEditing(row, 'actionPrice')" class="candidate-edit-input-wrap" @click.stop>
              <input
                v-model="candidateEditValue"
                class="candidate-edit-input"
                :data-edit-key="getCandidateEditKey(row, 'actionPrice')"
                @keydown.enter.prevent="commitCandidateEdit(row, 'actionPrice')"
                @keydown.esc.stop.prevent="cancelCandidateEdit"
                @blur="commitCandidateEdit(row, 'actionPrice')"
              />
              <button
                v-if="candidateEditValue"
                type="button"
                class="candidate-edit-clear"
                aria-label="清除"
                @mousedown.prevent
                @click.stop="clearCandidateEditValue(row, 'actionPrice')"
              >
                ×
              </button>
            </span>
            <span v-else class="candidate-edit-text">
              <span class="promotion-price">{{ formatMoney(draftByProductId[row.id]?.actionPrice) }}</span>
              <span class="promotion-boost-line">
                <i><b :style="{ width: `${getPromotionBoostWidth(row)}%` }"></b></i>
                <em>{{ formatPercent(getPromotionBoost(row)) }}</em>
              </span>
            </span>
          </div>
        </template>
        <template #cell-boostPrice="{ row }">
          <div class="boost-price-cell">
            <span><em>最小</em>{{ formatMoney(getBoostMinPrice(row)) }}</span>
            <span><em>最大</em>{{ formatMoney(getBoostMaxPrice(row)) }}</span>
          </div>
        </template>
        <template #cell-stockSummary="{ row }">
          <div class="stock-summary-cell">
            <span><em>Ozon</em>{{ formatStock(getOzonStock(row)) }}</span>
            <span><em>我的</em>{{ formatStock(getMyStock(row)) }}</span>
          </div>
        </template>
        <template #cell-promotionProductCount="{ row }">
          <div class="candidate-edit-cell" @click="startCandidateEdit(row, 'stock')">
            <span v-if="isCandidateEditing(row, 'stock')" class="candidate-edit-input-wrap" @click.stop>
              <input
                v-model="candidateEditValue"
                class="candidate-edit-input"
                :data-edit-key="getCandidateEditKey(row, 'stock')"
                @keydown.enter.prevent="commitCandidateEdit(row, 'stock')"
                @keydown.esc.stop.prevent="cancelCandidateEdit"
                @blur="commitCandidateEdit(row, 'stock')"
              />
              <button
                v-if="candidateEditValue"
                type="button"
                class="candidate-edit-clear"
                aria-label="清除"
                @mousedown.prevent
                @click.stop="clearCandidateEditValue(row, 'stock')"
              >
                ×
              </button>
            </span>
            <span v-else class="candidate-edit-text">
              <span>{{ getPromotionProductCountDisplay(row).main }}</span>
              <span>{{ getPromotionProductCountDisplay(row).sub }}</span>
            </span>
          </div>
        </template>
        <template #cell-action="{ row }">
          <AppTableButton
            name="add"
            tooltip="加入活动"
            :disabled="addingProductId !== null && addingProductId !== Number(row.id)"
            :loading="addingProductId === Number(row.id)"
            @click="addProduct(row)"
          />
        </template>
        <template #loading>
          <AppSkeletonLoader variant="table" :rows="6" :columns="columns.length + 1" compact />
        </template>
        </AppTable>
      </div>

      <div class="promotion-add-pagination">
        <AppPagination
          v-if="filteredProducts.length > 0"
          v-model="pagination.page"
          :total="filteredProducts.length"
          :page-size="pagination.pageSize"
          @change="handlePageChange"
        />
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Box, Refresh } from '@element-plus/icons-vue';
import { AppImage, AppPagination, AppSearch, AppSkeletonLoader, AppTable, AppTableButton } from '@/components/ui';
import { useProductNameTranslations } from '@/composables/useProductNameTranslations';
import { ozonPromotionAPI, type OzonPromotionProduct } from '@/api/ozonPromotionAPI';

const props = defineProps<{
  visible: boolean;
  storeId: number | null;
  actionId: number;
  activityTitle?: string;
}>();

const MIN_CANDIDATE_LOADING_MS = 360;

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'added'): void;
}>();

const drawerVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
});
const { getTranslatedName, resolveNames } = useProductNameTranslations();

const loading = ref(false);
const products = ref<OzonPromotionProduct[]>([]);
const total = ref(0);
const keyword = ref('');
const addingProductId = ref<number | null>(null);
const draftByProductId = reactive<Record<number, { actionPrice: number; stock: number; discount: number }>>({});
const pagination = reactive({ page: 1, pageSize: 20 });
type CandidateEditableField = 'actionPrice' | 'stock' | 'discount';
const candidateEditTarget = ref<{ productId: number; field: CandidateEditableField } | null>(null);
const candidateEditValue = ref('');

const columns = [
  { key: 'photo', label: '照片', width: '20' },
  { key: 'sku', label: '货号', width: '28' },
  { key: 'product', label: '商品名称', minWidth: '104px' },
  { key: 'ownPrice', label: '售价', width: '24', align: 'right' as const },
  { key: 'currentPromotion', label: '当前价', width: '28', align: 'right' as const },
  { key: 'activityDiscount', label: '活动折扣', width: '28', align: 'right' as const },
  { key: 'actionPrice', label: '活动价', width: '30', align: 'right' as const },
  { key: 'boostPrice', label: '提升价格', width: '30', align: 'right' as const },
  { key: 'stockSummary', label: '库存', width: '24', align: 'right' as const },
  { key: 'promotionProductCount', label: '促销商品数', width: '24', align: 'right' as const },
  { key: 'action', label: '操作', width: '20', align: 'center' as const },
];

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase());

const filteredProducts = computed(() => {
  if (!normalizedKeyword.value) return products.value;
  return products.value.filter(row => [
    row.name,
    row.productId,
    row.id,
    row.offerId,
    row.sku,
  ].join(' ').toLowerCase().includes(normalizedKeyword.value));
});

const paginatedProducts = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize;
  return filteredProducts.value.slice(start, start + pagination.pageSize);
});

const formatMoney = (value: unknown, options: { allowNegative?: boolean } = {}) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue === 0 || (!options.allowNegative && numberValue < 0)) return '-';
  return `${numberValue.toFixed(2).replace('.', ',')} ¥`;
};

const formatPercent = (value: unknown, showZero = false) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) return '-';
  if (numberValue === 0) return showZero ? '0%' : '-';
  return `${numberValue.toFixed(2).replace(/\.00$/, '')}%`;
};

const formatDraftNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return '-';
  return Number.isInteger(numberValue) ? String(numberValue) : String(Number(numberValue.toFixed(2)));
};

const normalizeText = (value: unknown) => String(value || '').trim();

const getProductName = (row: OzonPromotionProduct) => {
  const original = normalizeText(row.nameOriginal || row.titleOriginal || row.raw?.name || row.raw?.title || row.name);
  const translated = normalizeText(row.nameZh || row.titleTranslated || row.raw?.name_zh || row.raw?.nameZh || getTranslatedName(original));
  return {
    main: translated || original || '-',
  };
};

const getProductCategory = (row: OzonPromotionProduct) => {
  const value = String(row.categoryLeaf || row.category || row.raw?.category_leaf || row.raw?.category_name || '-');
  const internalValues = new Set(['ozon_product', 'ozon product', 'ozon-product']);
  return internalValues.has(value.trim().toLowerCase()) ? '-' : value;
};

const getRawValue = (row: OzonPromotionProduct, keys: string[]) => {
  for (const key of keys) {
    const value = row?.[key] ?? row?.raw?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

const getNumberValue = (row: OzonPromotionProduct, keys: string[]) => {
  const value = getRawValue(row, keys);
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
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
]) || Number(row.price || 0);

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

const getDraftDiscount = (row: OzonPromotionProduct) => {
  const id = Number(row.id);
  return draftByProductId[id]?.discount ?? getDiscountByActionPrice(row, getDefaultActionPrice(row));
};

const getActionPriceByDiscount = (row: OzonPromotionProduct, discount: number) => {
  const price = Number(row.price || 0);
  if (price <= 0) return getDefaultActionPrice(row);
  return Math.max(0, price * (1 - discount / 100));
};

const getDiscountByActionPrice = (row: OzonPromotionProduct, actionPrice: number) => {
  const price = Number(row.price || 0);
  if (price <= 0 || actionPrice <= 0) return 0;
  return ((price - actionPrice) / price) * 100;
};

const getActivityDiscountAmount = (row: OzonPromotionProduct) => {
  const explicitRaw = getRawValue(row, [
    'discount_amount',
    'discountAmount',
    'action_discount_amount',
    'actionDiscountAmount',
  ]);
  const explicit = Number(explicitRaw);
  if (Number.isFinite(explicit) && explicit !== 0) return explicit;
  const price = Number(row.price || 0);
  const draftPrice = Number(draftByProductId[Number(row.id)]?.actionPrice || getDefaultActionPrice(row));
  if (price <= 0 || draftPrice <= 0) return 0;
  return price - draftPrice;
};

const getPromotionBoost = (row: OzonPromotionProduct) => getNumberValue(row, [
  'current_boost',
  'currentBoost',
  'promotion_boost',
  'promotionBoost',
  'action_boost',
  'actionBoost',
  'boost',
]);

const getPromotionBoostWidth = (row: OzonPromotionProduct) => {
  const boost = getPromotionBoost(row);
  if (!Number.isFinite(boost) || boost <= 0) return 0;
  return Math.max(8, Math.min(100, boost));
};

const getBoostMinPrice = (row: OzonPromotionProduct) => {
  const explicit = getNumberValue(row, [
    'priceMinElastic',
    'price_min_elastic',
    'minActionPrice',
    'min_action_price',
    'min_price_for_action',
    'minPriceForAction',
    'action_min_price',
    'actionMinPrice',
  ]);
  return explicit > 0 ? explicit : Number(draftByProductId[Number(row.id)]?.actionPrice || getDefaultActionPrice(row));
};

const getBoostMaxPrice = (row: OzonPromotionProduct) => {
  const explicit = getNumberValue(row, [
    'priceMaxElastic',
    'price_max_elastic',
    'maxActionPrice',
    'max_action_price',
    'max_price_for_action',
    'maxPriceForAction',
    'action_max_price',
    'actionMaxPrice',
  ]);
  if (explicit > 0) return explicit;
  return getNumberValue(row, [
    'min_price_for_action',
    'minPriceForAction',
    'min_action_price',
    'minActionPrice',
  ]);
};

const getOzonStock = (row: OzonPromotionProduct) => {
  return getNumberValue(row, [
    'stockFbo',
    'stock_fbo',
    'fboStock',
    'fbo_stock',
    'raw_fbo_stock',
    'rawFboStock',
  ]);
};

const getMyStock = (row: OzonPromotionProduct) => getNumberValue(row, [
  'stockFbs',
  'stock_fbs',
  'fbsStock',
  'fbs_stock',
  'warehouseInventoryQuantity',
  'warehouse_inventory_quantity',
  'myStock',
  'my_stock',
  'inventoryQuantity',
  'inventory_quantity',
]);

const formatStock = (value: unknown) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return '0';
  return String(Math.floor(numberValue));
};

const getPromotionProductCountDisplay = (row: OzonPromotionProduct) => {
  const id = Number(row.id);
  const draftStock = draftByProductId[id]?.stock;
  const main = draftStock !== undefined && Number(draftStock) > 0
    ? String(draftStock)
    : '无限';
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
  return {
    main,
    sub: Number.isFinite(recommendedValue) && recommendedValue > 0 ? `建议 ${recommendedValue}` : '',
  };
};

const getDefaultActionPrice = (row: OzonPromotionProduct) => {
  const value = Number(
    row.actionPrice ||
    row.maxActionPrice ||
    row.raw?.max_action_price ||
    row.minActionPrice ||
    row.raw?.min_action_price ||
    row.price ||
    0
  );
  return Number.isFinite(value) ? value : 0;
};

const ensureDrafts = () => {
  for (const row of products.value) {
    const id = Number(row.id);
    if (!id || draftByProductId[id]) continue;
    draftByProductId[id] = {
      actionPrice: getDefaultActionPrice(row),
      stock: Number(row.stock || row.minStock || 0),
      discount: getDiscountByActionPrice(row, getDefaultActionPrice(row)),
    };
  }
};

const clearDrafts = () => {
  Object.keys(draftByProductId).forEach(key => {
    delete draftByProductId[Number(key)];
  });
};

const isCandidateEditing = (row: OzonPromotionProduct, field: CandidateEditableField) => {
  return candidateEditTarget.value?.productId === Number(row.id) && candidateEditTarget.value.field === field;
};

const getCandidateEditKey = (row: OzonPromotionProduct, field: CandidateEditableField) => {
  return `${Number(row.id)}-${field}`;
};

const getCandidateEditDisplayValue = (row: OzonPromotionProduct, field: CandidateEditableField) => {
  const id = Number(row.id);
  if (!draftByProductId[id]) return '';
  const value = draftByProductId[id][field];
  if (value === undefined || value === null) return '';
  if (field === 'stock') return String(Math.floor(Number(value) || 0));
  return formatDraftNumber(value);
};

const startCandidateEdit = (row: OzonPromotionProduct, field: CandidateEditableField) => {
  const id = Number(row.id);
  if (!draftByProductId[id]) {
    draftByProductId[id] = {
      actionPrice: getDefaultActionPrice(row),
      stock: Number(row.stock || row.minStock || 0),
      discount: getDiscountByActionPrice(row, getDefaultActionPrice(row)),
    };
  }
  candidateEditTarget.value = { productId: id, field };
  candidateEditValue.value = getCandidateEditDisplayValue(row, field);
  void nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(`.candidate-edit-input[data-edit-key="${getCandidateEditKey(row, field)}"]`);
    if (!input) return;
    input.focus();
    const cursorPosition = input.value.length;
    input.setSelectionRange(cursorPosition, cursorPosition);
  });
};

const clearCandidateEditValue = (row: OzonPromotionProduct, field: CandidateEditableField) => {
  candidateEditValue.value = '';
  void nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(`.candidate-edit-input[data-edit-key="${getCandidateEditKey(row, field)}"]`);
    input?.focus();
  });
};

const cancelCandidateEdit = () => {
  candidateEditTarget.value = null;
  candidateEditValue.value = '';
};

const wait = (duration: number) => new Promise(resolve => setTimeout(resolve, duration));

const commitCandidateEdit = (row: OzonPromotionProduct, field: CandidateEditableField) => {
  if (!isCandidateEditing(row, field)) return;
  const id = Number(row.id);
  const normalizedValue = candidateEditValue.value.trim().replace(',', '.');
  const numericValue = normalizedValue === '' ? 0 : Number(normalizedValue);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    ElMessage.warning('请输入有效数值');
    void nextTick(() => {
      const input = document.querySelector<HTMLInputElement>(`.candidate-edit-input[data-edit-key="${getCandidateEditKey(row, field)}"]`);
      input?.focus();
    });
    return;
  }
  if (field === 'stock') {
    draftByProductId[id].stock = Math.floor(numericValue);
  } else if (field === 'discount') {
    const discount = Number(numericValue.toFixed(2));
    draftByProductId[id].discount = discount;
    draftByProductId[id].actionPrice = Number(getActionPriceByDiscount(row, discount).toFixed(2));
  } else {
    draftByProductId[id].actionPrice = Number(numericValue.toFixed(2));
    draftByProductId[id].discount = getDiscountByActionPrice(row, draftByProductId[id].actionPrice);
  }
  cancelCandidateEdit();
};

const loadCandidates = async () => {
  if (!props.storeId || !props.actionId) return;
  const loadingStartedAt = Date.now();
  loading.value = true;
  products.value = [];
  total.value = 0;
  pagination.page = 1;
  clearDrafts();
  cancelCandidateEdit();
  try {
    const response = await ozonPromotionAPI.getPromotionCandidates(props.storeId, props.actionId, {
      limit: 1000,
      offset: 0,
    });
    if (response.success && response.data) {
      products.value = response.data.products || [];
      total.value = response.data.total || products.value.length;
      pagination.page = 1;
      ensureDrafts();
      void resolveNames(products.value.map(row => row.nameOriginal || row.titleOriginal || row.raw?.name || row.raw?.title || row.name));
    } else {
      ElMessage.error(response.message || '获取可添加商品失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取可添加商品失败');
  } finally {
    const remaining = MIN_CANDIDATE_LOADING_MS - (Date.now() - loadingStartedAt);
    if (remaining > 0) await wait(remaining);
    loading.value = false;
  }
};

const getOperationMessage = (response: any, fallback: string) => {
  const messages = [
    response?.message,
    ...(Array.isArray(response?.data?.errors) ? response.data.errors : []),
  ].filter(Boolean);
  return messages.length ? messages.join('\n') : fallback;
};

const addProduct = async (row: OzonPromotionProduct) => {
  if (!props.storeId || !props.actionId || !row.id) return;
  const draft = draftByProductId[Number(row.id)];
  if (!draft?.actionPrice || draft.actionPrice <= 0) {
    ElMessage.warning('请填写活动价格');
    return;
  }
  addingProductId.value = Number(row.id);
  try {
    const response = await ozonPromotionAPI.activateProduct(props.storeId, props.actionId, {
      productId: Number(row.id),
      actionPrice: Number(draft.actionPrice),
      stock: Number(draft.stock || 0),
    });
    if (response.success) {
      ElMessage.success(response.message || '商品已加入活动');
      products.value = products.value.filter(item => Number(item.id) !== Number(row.id));
      total.value = Math.max(0, total.value - 1);
      emit('added');
    } else {
      ElMessage.error(getOperationMessage(response, '商品加入活动失败'));
    }
  } catch (error: any) {
    ElMessage.error(error.message || '商品加入活动失败');
  } finally {
    addingProductId.value = null;
  }
};

const handleSearch = () => {
  pagination.page = 1;
};

const handlePageChange = (page: number) => {
  pagination.page = page;
};

const handleClosed = () => {
  keyword.value = '';
  pagination.page = 1;
  products.value = [];
  total.value = 0;
  clearDrafts();
  cancelCandidateEdit();
};

watch(() => props.visible, value => {
  if (value) void loadCandidates();
});
</script>

<style scoped>
.promotion-add-drawer-body {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  padding: 0 30px;
  overflow: hidden;
}

.promotion-add-drawer :deep(.el-drawer__body) {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

:global(.el-drawer.promotion-add-drawer) {
  width: 100vw !important;
  max-width: 100vw !important;
}

.promotion-add-search {
  min-height: 100px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 0;
}

.promotion-refresh-button {
  flex-shrink: 0;
}

.promotion-add-table-area {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.promotion-add-table-area :deep(.app-table-wrapper) {
  position: relative;
  height: 100%;
  min-height: 0;
}

.promotion-add-table-area :deep(.app-table-scroll) {
  height: 100%;
  overflow: auto;
}

.promotion-add-table-area :deep(.app-table-loading) {
  position: absolute;
  left: 0;
  right: 0;
  top: 74px;
  bottom: 0;
  z-index: 5;
  min-height: 0;
  padding: 18px 16px 20px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(248, 251, 255, 0.96), rgba(241, 245, 249, 0.88));
}

.promotion-add-table-area :deep(.app-skeleton) {
  height: 100%;
  justify-content: flex-start;
}

.promotion-add-table-area :deep(.app-skeleton-generic-table-row) {
  min-height: 64px;
}

.promotion-add-table-area :deep(.app-table-th) {
  position: sticky;
  top: 0;
  z-index: 6;
  border-top: 0 !important;
  border-bottom: 0 !important;
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(241, 247, 255, 0.94));
}

.promotion-add-table :deep(.app-table) {
  width: 100%;
  min-width: 100%;
  table-layout: fixed;
}

.promotion-add-table :deep(.app-table-th:first-child),
.promotion-add-table :deep(.app-table-td:first-child) {
  width: 64px;
  text-align: center !important;
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
.price-cell,
.sku-cell {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name {
  max-width: min(260px, 100%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1e293b;
  font-weight: 600;
  font-size: 13px;
}

.product-translated-name {
  max-width: min(260px, 100%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #334155;
  font-size: 12px;
  line-height: 16px;
}

.product-category,
.sku-id,
.price-cell span:nth-child(2) {
  color: #64748b;
  font-size: 12px;
}

.sku-offer {
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
}

.price-cell {
  align-items: flex-end;
  color: #0f172a;
  font-size: 13px;
}

.table-header-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 17px;
}

.promotion-table-mainhead {
  color: #0f172a;
  font-size: 13px;
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

.candidate-edit-cell {
  min-height: 32px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  cursor: text;
}

.candidate-edit-text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  color: #0f172a;
  font-size: 13px;
}

.candidate-edit-text span:nth-child(2) {
  color: #64748b;
  font-size: 12px;
}

.promotion-boost-line {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  min-width: 86px;
  color: #64748b;
  font-style: normal;
}

.promotion-boost-line i {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 5px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.promotion-boost-line b {
  position: absolute;
  inset: 0 auto 0 0;
  display: block;
  border-radius: inherit;
  background: linear-gradient(90deg, #475569 0%, #2563eb 100%);
}

.promotion-boost-line em {
  min-width: 28px;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  text-align: right;
}

.boost-price-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  color: #0f172a;
  font-size: 13px;
  white-space: nowrap;
}

.boost-price-cell span,
.stock-summary-cell span {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 84px;
  text-align: right;
}

.boost-price-cell em,
.stock-summary-cell em {
  min-width: 28px;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  text-align: left;
}

.stock-summary-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  color: #0f172a;
  font-size: 13px;
  white-space: nowrap;
}

.candidate-edit-input-wrap {
  width: 116px;
  max-width: 100%;
  height: 30px;
  min-width: 0;
  position: relative;
  display: block;
}

.candidate-edit-input {
  width: 100%;
  max-width: 100%;
  height: 30px;
  box-sizing: border-box;
  padding: 0 26px 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
  line-height: 30px;
  text-align: left;
  outline: none;
}

.candidate-edit-clear {
  position: absolute;
  top: 50%;
  right: 7px;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #94a3b8;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

.candidate-edit-clear:hover {
  background: #e2e8f0;
  color: #475569;
}

.candidate-edit-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.promotion-add-pagination {
  flex: 0 0 auto;
  margin: 0 -30px;
}
</style>
