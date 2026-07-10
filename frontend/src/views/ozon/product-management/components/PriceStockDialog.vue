<template>
  <AppDialog
    :model-value="visible"
    :title="dialogTitle"
    :subtitle="productSubtitle"
    :icon="dialogIcon"
    :content-class="mode === 'stock' ? 'price-stock-dialog-wide' : 'price-stock-dialog-compact'"
    confirm-text="应用"
    confirm-loading-text="应用中..."
    :confirm-loading="saving"
    :confirm-disabled="loading || !canSubmit"
    @update:model-value="value => emit('update:visible', value)"
    @confirm="handleSave"
    @cancel="handleClose"
  >
    <div class="price-stock-dialog" :class="{ 'is-loading': loading }">
      <div v-if="loading" class="dialog-loading-panel">
        <AppSkeletonLoader variant="dialog" :rows="mode === 'stock' ? 4 : 3" compact />
      </div>
      <template v-if="mode === 'price'">
        <div class="field-grid">
          <div
            v-for="field in priceFields"
            :key="field.key"
            class="dialog-field"
            :class="{ required: field.required }"
          >
            <div class="field-copy">
              <label class="dialog-label" :for="field.key">
                {{ field.label }}
                <span v-if="field.required" class="required-mark">*</span>
              </label>
              <p class="field-hint">{{ field.hint }}</p>
            </div>
            <div class="field-control">
              <el-input
                :id="field.key"
                :model-value="field.value"
                class="plain-number-input"
                inputmode="decimal"
                :placeholder="field.placeholder"
                @update:model-value="value => setPriceField(field.key, value)"
              >
                <template #suffix>
                  <button
                    v-if="field.value"
                    type="button"
                    class="field-action"
                    :aria-label="`清空${field.label}`"
                    @click.stop="setPriceField(field.key, '')"
                  >
                    <el-icon><Close /></el-icon>
                  </button>
                </template>
              </el-input>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="warehouse-section editable">
          <div class="warehouse-header">
            <div>
              <div class="warehouse-title">在我的仓库中</div>
              <div class="warehouse-subtitle">{{ fbsWarehouseName }}</div>
            </div>
            <span class="warehouse-badge fbs">FBS</span>
          </div>
          <div class="warehouse-fields">
            <el-input
              v-model="fbsStockInput"
              class="stock-input full"
              inputmode="numeric"
              placeholder="可订购数量"
            >
              <template #prefix>
                <span class="input-label">可订购数量</span>
              </template>
              <template #suffix>
                <button
                  v-if="fbsStockInput"
                  type="button"
                  class="field-action"
                  aria-label="清空可订购数量"
                  @click.stop="fbsStockInput = ''"
                >
                  <el-icon><Close /></el-icon>
                </button>
              </template>
            </el-input>
            <el-input
              :model-value="String(fbsReservedValue)"
              class="stock-input full locked-input"
              disabled
              placeholder="待备货订单预留库存"
            >
              <template #prefix>
                <span class="input-label">待备货订单预留库存</span>
              </template>
              <template #suffix>
                <el-icon class="lock-icon"><Lock /></el-icon>
              </template>
            </el-input>
          </div>
        </div>

        <div class="warehouse-section readonly">
          <div class="warehouse-header">
            <div>
              <div class="warehouse-title">在FBP仓库中</div>
              <div class="warehouse-subtitle">{{ fboWarehouseName }}</div>
            </div>
            <span class="warehouse-badge fbo">FBO</span>
          </div>
          <div class="warehouse-fields">
            <el-input
              :model-value="String(fboStockValue)"
              class="stock-input full locked-input"
              disabled
              placeholder="可订购数量"
            >
              <template #prefix>
                <span class="input-label">可订购数量</span>
              </template>
              <template #suffix>
                <el-tooltip content="FBP/平台仓库存由 Ozon 仓储同步，不能在卖家侧直接修改" placement="top">
                  <el-icon class="lock-icon"><Lock /></el-icon>
                </el-tooltip>
              </template>
            </el-input>
            <el-input
              :model-value="String(fboReservedValue)"
              class="stock-input full locked-input"
              disabled
              placeholder="待备货订单预留库存"
            >
              <template #prefix>
                <span class="input-label">待备货订单预留库存</span>
              </template>
              <template #suffix>
                <el-icon class="lock-icon"><Lock /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
      </template>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Box, Close, Lock, PriceTag } from '@element-plus/icons-vue';
import { AppDialog, AppSkeletonLoader } from '@/components/ui';
import { ozonProductAPI } from '@/api/ozonProductAPI';

interface Props {
  visible: boolean;
  mode: 'price' | 'stock';
  product: any;
  storeId: number | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  mode: 'price',
  product: null,
  storeId: null,
  loading: false,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  saved: [];
}>();

const priceInput = ref('');
const oldPriceInput = ref('');
const minPriceInput = ref('');
const premiumPriceInput = ref('');
const fbsStockInput = ref('');

const fbsReservedValue = ref<number>(0);
const fboStockValue = ref<number>(0);
const fboReservedValue = ref<number>(0);
const fbsWarehouseName = ref('我的仓库');
const fboWarehouseName = ref('FBP仓库');
const saving = ref(false);

const dialogTitle = computed(() => (props.mode === 'price' ? '价格管理' : '库存管理'));
const dialogIcon = computed(() => (props.mode === 'price' ? PriceTag : Box));
const productSubtitle = computed(() => (
  props.product?.offerId ||
  props.product?.product?.offerId ||
  props.product?.sku ||
  props.product?.product?.ozonSku ||
  'N/A'
));

const priceFields = computed(() => [
  {
    key: 'price',
    label: '您的价格, ¥',
    value: priceInput.value,
    placeholder: '请输入价格',
    hint: '当前货号的销售价格',
    required: true,
  },
  {
    key: 'oldPrice',
    label: '折扣前价格, ¥',
    value: oldPriceInput.value,
    placeholder: '可选，用于显示划线价',
    hint: '填写后作为折扣前价格展示',
    required: false,
  },
  {
    key: 'minPrice',
    label: '最低价格, ¥',
    value: minPriceInput.value,
    placeholder: '可选，卖家能接受的最低价',
    hint: 'Ozon 价格策略最低限',
    required: false,
  },
  {
    key: 'premiumPrice',
    label: '成本, ¥',
    value: premiumPriceInput.value,
    placeholder: '可选，您的成本价格',
    hint: '记录成本或高级价格字段',
    required: false,
  },
]);

const parseDecimal = (value: string): number | undefined => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseInteger = (value: string): number | undefined => {
  const parsed = parseDecimal(value);
  return parsed === undefined ? undefined : Math.max(0, Math.round(parsed));
};

const formatOptionalNumber = (value: any) => {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : '';
};

const parseMaybeJson = (value: any) => {
  if (!value || typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const getOzonRawData = (product: any) => {
  const p = product?.product || product || {};
  return parseMaybeJson(
    p.ozonOriginalData ||
    product?.product?.ozonOriginalData ||
    product?.ozonOriginalData ||
    {}
  ) || {};
};

const normalizeStockRows = (stocksRaw: any): any[] => {
  if (!stocksRaw) return [];
  if (Array.isArray(stocksRaw)) return stocksRaw;
  if (Array.isArray(stocksRaw.stocks)) return stocksRaw.stocks;
  if (stocksRaw.stocks && typeof stocksRaw.stocks === 'object') return [stocksRaw.stocks];
  if (typeof stocksRaw === 'object' && ('present' in stocksRaw || 'stock' in stocksRaw || 'source' in stocksRaw)) {
    return [stocksRaw];
  }
  return [];
};

const getRawStocks = (product: any): any[] => {
  const p = product?.product || product || {};
  const raw = getOzonRawData(product);
  return normalizeStockRows(
    raw?.stocks ||
    p.stocks ||
    product?.stocks ||
    []
  );
};

const getStockSource = (stock: any) => String(
  stock?.source ||
  stock?.type ||
  stock?.delivery_schema ||
  stock?.schema ||
  stock?.sale_schema ||
  stock?.stock_type ||
  ''
).toLowerCase();

const isFboStock = (stock: any) => {
  const source = getStockSource(stock);
  return source.includes('fbo') || source.includes('fbp');
};

const isFbsStock = (stock: any) => {
  const source = getStockSource(stock);
  return source.includes('fbs') || source.includes('rfbs') || source === 'sds';
};

const getStockQuantity = (stock: any, key: 'present' | 'reserved') => {
  const value = key === 'present'
    ? stock?.present ?? stock?.stock ?? stock?.quantity ?? stock?.available ?? stock?.available_stock
    : stock?.reserved ?? stock?.reserved_stock ?? stock?.reserve;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getWarehouseName = (stock: any) => {
  const value = stock?.warehouse_name || stock?.warehouseName || stock?.warehouse_id || stock?.warehouseId;
  return value ? String(value) : '';
};

const summarizeStocks = (stocks: any[], fallbackName: string) => {
  const names = [...new Set(stocks.map(getWarehouseName).filter(Boolean))];
  return {
    name: names.length ? names.join(' / ') : fallbackName,
    present: stocks.reduce((sum, stock) => sum + getStockQuantity(stock, 'present'), 0),
    reserved: stocks.reduce((sum, stock) => sum + getStockQuantity(stock, 'reserved'), 0),
  };
};

const setPriceField = (key: string, value: string | number) => {
  const nextValue = String(value ?? '');
  if (key === 'price') priceInput.value = nextValue;
  if (key === 'oldPrice') oldPriceInput.value = nextValue;
  if (key === 'minPrice') minPriceInput.value = nextValue;
  if (key === 'premiumPrice') premiumPriceInput.value = nextValue;
};

const canSubmit = computed(() => {
  if (props.mode === 'price') {
    const price = parseDecimal(priceInput.value);
    return Boolean(price && price > 0);
  }
  return parseInteger(fbsStockInput.value) !== undefined;
});

const getOzonProductId = (product: any): string => {
  return String(
    product?.productId ||
    product?.ozonProductId ||
    product?.product?.productId ||
    product?.product?.ozonProductId ||
    ''
  );
};

watch(() => props.visible, (val) => {
  if (!val || !props.product) return;

  const p = props.product.product || props.product;
  if (props.mode === 'price') {
    priceInput.value = formatOptionalNumber(p.price || props.product.price || 0);
    oldPriceInput.value = formatOptionalNumber(p.oldPrice);
    minPriceInput.value = formatOptionalNumber(p.minPrice);
    const origData = p.ozonOriginalData || props.product?.product?.ozonOriginalData || {};
    premiumPriceInput.value = formatOptionalNumber(origData.premium_price);
  } else {
    fbsStockInput.value = formatOptionalNumber(p.stockFbs ?? props.product.stockFbs ?? 0);
    fbsReservedValue.value = Number(p.stockFbsReserved || props.product.stockFbsReserved || 0);
    fboStockValue.value = Number(p.stockFbo || props.product.stockFbo || 0);
    fboReservedValue.value = Number(p.stockFboReserved || props.product.stockFboReserved || 0);
    const raw = getOzonRawData(props.product);
    const stocks = getRawStocks(props.product);
    const fboStocks = stocks.filter(isFboStock);
    const fbsStocks = stocks.filter(isFbsStock);
    const uncategorizedStocks = stocks.filter((stock: any) => !isFboStock(stock) && !isFbsStock(stock));
    const fbsSummary = summarizeStocks(fbsStocks.length ? fbsStocks : uncategorizedStocks, '我的仓库');
    const fboSummary = summarizeStocks(fboStocks, 'FBP仓库');

    fbsWarehouseName.value = fbsSummary.name;
    fboWarehouseName.value = fboSummary.name;
    if (fbsSummary.present > 0 || fbsStocks.length || uncategorizedStocks.length) {
      fbsStockInput.value = formatOptionalNumber(fbsSummary.present);
    }
    if (fboSummary.present > 0 || fboStocks.length) {
      fboStockValue.value = fboSummary.present;
    } else if (raw?.discounted_fbo_stocks !== undefined) {
      fboStockValue.value = Number(raw.discounted_fbo_stocks || 0);
    }
    fbsReservedValue.value = fbsSummary.reserved;
    fboReservedValue.value = fboSummary.reserved;
  }
});

const handleClose = () => {
  emit('update:visible', false);
};

const handleSave = async () => {
  if (!props.storeId) {
    ElMessage.warning('请先在顶部选择当前操作店铺');
    return;
  }
  if (!props.product) return;

  saving.value = true;
  try {
    const productId = getOzonProductId(props.product);
    if (!productId) {
      ElMessage.error('商品ID不存在');
      return;
    }

    if (props.mode === 'price') {
      const priceValue = parseDecimal(priceInput.value);
      if (!priceValue || priceValue <= 0) {
        ElMessage.warning('请输入有效的价格');
        return;
      }
      const currencyCode = props.product.product?.ozonCurrencyCode || props.product.product?.currencyCode || 'RUB';
      const response = await ozonProductAPI.updatePrice(
        props.storeId,
        productId,
        priceValue,
        currencyCode,
        parseDecimal(oldPriceInput.value),
        parseDecimal(minPriceInput.value),
        parseDecimal(premiumPriceInput.value)
      );
      if (response.success) {
        ElMessage.success('价格更新成功');
        emit('saved');
        handleClose();
      } else {
        ElMessage.error(response.message || '价格更新失败');
      }
    } else {
      const fbsStockValue = parseInteger(fbsStockInput.value);
      if (fbsStockValue === undefined) {
        ElMessage.warning('请输入有效的库存数量');
        return;
      }
      const response = await ozonProductAPI.updateStock(
        props.storeId,
        productId,
        fbsStockValue
      );
      if (response.success) {
        ElMessage.success('库存更新成功');
        emit('saved');
        handleClose();
      } else {
        ElMessage.error(response.message || '库存更新失败');
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败，请重试');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
:global(.price-stock-dialog-compact) {
  max-width: 540px;
}

:global(.price-stock-dialog-wide) {
  max-width: 580px;
}

:global(.price-stock-dialog-compact .app-dialog-body),
:global(.price-stock-dialog-wide .app-dialog-body) {
  padding: 0;
}

:global(.price-stock-dialog-compact .app-dialog-header),
:global(.price-stock-dialog-wide .app-dialog-header) {
  margin-bottom: 24px;
}

.price-stock-dialog {
  padding: 0;
  position: relative;
  min-height: 160px;
}

.price-stock-dialog.is-loading {
  pointer-events: none;
}

.dialog-loading-panel {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: block;
  padding: 18px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(1px);
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.dialog-field {
  display: grid;
  grid-template-columns: minmax(150px, 190px) minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
}

.dialog-label,
.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0;
}

.field-label.compact {
  margin: 0;
}

.required-mark {
  color: #ef4444;
  margin-left: 2px;
}

.field-hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #94a3b8;
}

.field-copy {
  min-width: 0;
}

.field-control {
  min-width: 0;
}

.plain-number-input,
.stock-input {
  width: 100%;
}

.stock-input {
  width: 180px;
}

.stock-input.full {
  width: 100%;
}

:deep(.stock-input.full .el-input__wrapper) {
  min-height: 40px;
  border-radius: 8px;
}

:deep(.stock-input.full .el-input__prefix) {
  flex: 0 0 auto;
}

:deep(.locked-input .el-input__wrapper) {
  background-color: #f8fafc;
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

:deep(.locked-input .el-input__inner) {
  color: #64748b;
  -webkit-text-fill-color: #64748b;
}

.input-label {
  display: inline-flex;
  align-items: center;
  min-width: 116px;
  font-size: 12px;
  color: #64748b;
}

.lock-icon {
  color: #94a3b8;
  font-size: 14px;
}

.field-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}

.field-action:hover {
  color: #475569;
  background: #f1f5f9;
}

.warehouse-section {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px 18px;
  margin-bottom: 12px;
  background: #ffffff;
}

.warehouse-section:last-child {
  margin-bottom: 0;
}

.warehouse-section.readonly {
  background: #f8fafc;
}

.warehouse-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef2f7;
}

.warehouse-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.warehouse-subtitle {
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}

.warehouse-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.4px;
  flex-shrink: 0;
}

.warehouse-badge.fbs {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.warehouse-badge.fbo {
  background-color: #fef3c7;
  color: #92400e;
}

.warehouse-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 640px) {
  .dialog-field {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .stock-input {
    width: 100%;
  }
}
</style>
