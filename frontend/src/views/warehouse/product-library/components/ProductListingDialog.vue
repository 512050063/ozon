<template>
  <AppDialog
    :model-value="modelValue"
    title="上架确认"
    subtitle="使用页头当前店铺提交商品到 Ozon"
    :icon="Upload"
    content-class="product-listing-dialog"
    confirm-text="确认上架"
    confirm-loading-text="提交中..."
    :confirm-loading="submitting"
    :confirm-disabled="submitDisabled"
    :cancel-disabled="loading || submitting"
    @update:model-value="handleDialogModelUpdate"
    @confirm="handleSubmit"
    @cancel="handleClose"
  >
    <template #header>
      <div class="listing-dialog-header app-surface-header">
        <div class="dialog-icon-wrapper app-surface-icon listing-dialog-icon-wrapper">
          <el-icon class="dialog-icon listing-dialog-icon">
            <Upload />
          </el-icon>
        </div>
        <div class="listing-dialog-title-wrapper app-surface-title-wrapper">
          <h3 class="listing-dialog-title app-surface-title">上架确认</h3>
          <p class="listing-dialog-subtitle app-surface-subtitle">
            当前上架店铺
            <span class="listing-store-name">{{ currentStoreName }}</span>
          </p>
        </div>
      </div>
    </template>
    <div class="listing-dialog-body">
      <div v-if="loading" class="listing-dialog-loading">
        <AppSkeletonLoader variant="dialog" :rows="7" compact />
      </div>
      <div v-else-if="loadError" class="dialog-error-state">
        <el-alert :title="loadError" type="error" :closable="false" show-icon />
      </div>

      <template v-else>
        <section class="dialog-band">
          <div class="price-section-header">
            <div class="section-title">价格预览</div>
            <div class="strategy-field">
              <span class="strategy-label">定价策略</span>
              <el-select
                ref="strategySelectRef"
                v-model="form.pricingStrategyId"
                placeholder="选择策略"
                filterable
                size="small"
                class="select-base strategy-select"
                popper-class="select-base-popper listing-strategy-popper"
                @change="refreshPreview"
              >
                <el-option
                  v-for="strategy in preview?.pricingStrategies || []"
                  :key="strategy.id"
                  :label="strategy.name"
                  :value="strategy.id"
                />
              </el-select>
            </div>
          </div>
          <div class="price-panel">
            <div class="price-card">
              <span class="price-label">商品库价格</span>
              <strong>{{ formatMoney(preview?.pricing.productPrice) }}</strong>
            </div>
            <div class="price-card">
              <span class="price-label">建议上架价</span>
              <strong>{{ formatMoney(preview?.pricing.suggestedPrice) }}</strong>
            </div>
            <div class="price-card final">
              <span class="price-label">最终上架价</span>
              <el-input
                ref="finalPriceInputRef"
                v-model="finalPriceInput"
                inputmode="decimal"
                class="final-price-input"
                @change="handleFinalPriceChange"
                @blur="handleFinalPriceChange"
              />
            </div>
          </div>
          <div class="breakdown-panel">
            <div class="breakdown-title">计算明细</div>
            <div class="breakdown-grid">
              <div v-for="item in preview?.pricing.breakdown || []" :key="item.key" class="breakdown-row">
                <span>{{ item.label }}</span>
                <strong>{{ formatMoney(item.amount) }}</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="dialog-band">
          <div class="band-header check-header">
            <div class="section-title">提交前检查</div>
            <div class="check-summary">
              <button
                type="button"
                class="summary-item summary-button error"
                :aria-disabled="!firstBlockingCheck"
                @click="handleCheckEdit(firstBlockingCheck)"
              >
                阻止 {{ preview?.blockingCount || 0 }}
              </button>
              <span class="summary-item warning">警告 {{ preview?.warningCount || 0 }}</span>
              <span class="summary-item pass">通过 {{ passCount }}</span>
            </div>
          </div>
          <el-tabs v-model="activeCheckTab" class="check-tabs">
            <el-tab-pane
              v-for="group in groupedChecks"
              :key="group.group"
              :label="`${group.group} ${group.items.length}`"
              :name="group.group"
            >
              <div class="check-scroll">
                <div class="check-list">
                  <button
                    v-for="check in group.items"
                    :key="check.key"
                    type="button"
                    class="check-row"
                    :class="{ 'check-row-actionable': isCheckActionable(check) }"
                    :data-check-key="check.key"
                    :aria-disabled="!isCheckActionable(check)"
                    @click="handleCheckEdit(check)"
                  >
                    <div class="check-main">
                      <span class="check-label" :title="check.label">
                        {{ check.label }}<span v-if="isRequiredCheck(check)" class="check-required-mark">*</span>
                      </span>
                      <span class="check-message" :title="formatCheckMessage(check.message)">{{ formatCheckMessage(check.message) }}</span>
                    </div>
                    <el-tag :type="statusTagType(check.status)" size="small" effect="plain">
                      {{ statusLabel(check.status) }}
                    </el-tag>
                  </button>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </section>
      </template>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload } from '@element-plus/icons-vue';
import AppDialog from '@/components/ui/AppDialog.vue';
import AppSkeletonLoader from '@/components/ui/AppSkeletonLoader.vue';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
import {
  listingPreview,
  listToOzon,
  type ProductSupplyItem,
  type ProductSupplyListingCheck,
  type ProductSupplyListingPreview,
} from '@/api/productSupplyAPI';
import { ozonProductAPI, type OzonProductLimits } from '@/api/ozonProductAPI';

interface Props {
  modelValue: boolean;
  product: ProductSupplyItem | null;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submitted', payload: { taskId?: string }): void;
  (e: 'edit-check', check: ProductSupplyListingCheck): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const loading = ref(false);
const submitting = ref(false);
const limitLoading = ref(false);
const limitError = ref('');
const limits = ref<OzonProductLimits | null>(null);
const loadError = ref('');
const preview = ref<ProductSupplyListingPreview | null>(null);
const activeCheckTab = ref('');
const strategySelectRef = ref();
const finalPriceInputRef = ref();
const { loadStoreContext, storeContext } = useOzonStoreContext();

const form = reactive({
  storeId: null as number | null,
  pricingStrategyId: null as number | null,
  finalPrice: null as number | null,
});

const finalPriceInput = ref('');

const groupedChecks = computed(() => {
  const groups = new Map<string, ProductSupplyListingCheck[]>();
  for (const check of preview.value?.checks || []) {
    if (!groups.has(check.group)) {
      groups.set(check.group, []);
    }
    groups.get(check.group)!.push(check);
  }
  return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
});

const passCount = computed(() => (preview.value?.checks || []).filter(item => item.status === 'pass').length);
const firstBlockingCheck = computed(() => (preview.value?.checks || []).find(item => item.status === 'error') || null);

const currentStoreName = computed(() => {
  return storeContext.value?.store?.name || '未选择店铺';
});

const submitDisabled = computed(() => {
  if (loading.value || submitting.value || !!loadError.value) return true;
  if (isCreateQuotaExhausted.value) return true;
  if (!preview.value) return true;
  if (!form.storeId || !form.pricingStrategyId) return true;
  if (!form.finalPrice || form.finalPrice <= 0) return true;
  return false;
});

const isCreateQuotaExhausted = computed(() => {
  const remaining = limits.value?.dailyCreate?.remaining;
  return remaining !== null && remaining !== undefined && Number(remaining) <= 0;
});

function formatMoney(value: number | null | undefined) {
  const number = Number(value || 0);
  const currencyCode = preview.value?.pricing.currencyCode || 'CNY';
  const symbolMap: Record<string, string> = {
    CNY: '￥',
    RUB: '₽',
    USD: '$',
    EUR: '€',
    KZT: '₸',
    BYN: 'Br',
  };
  const symbol = symbolMap[currencyCode] || `${currencyCode} `;
  return `${symbol}${number.toFixed(2)}`;
}

function statusLabel(status: ProductSupplyListingCheck['status']) {
  if (status === 'error') return '阻止';
  if (status === 'warning') return '警告';
  return '通过';
}

function statusTagType(status: ProductSupplyListingCheck['status']) {
  if (status === 'error') return 'danger';
  if (status === 'warning') return 'warning';
  return 'success';
}

function formatCheckMessage(message: string) {
  return String(message || '');
}

function parseFinalPriceInput(value: string): number | null {
  const sanitized = String(value || '').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  if (!sanitized) return null;
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

function syncFormFromPreview(data: ProductSupplyListingPreview) {
  let changed = false;
  const nextStoreId = storeContext.value?.resolvedStoreId ?? null;
  if (form.storeId !== nextStoreId) {
    form.storeId = nextStoreId;
    changed = true;
  }
  if (!form.pricingStrategyId && data.pricingStrategies.length > 0) {
    const lastStrategyId = data.product.lastPricingStrategyId;
    const nextPricingStrategyId =
      data.pricingStrategies.find(item => item.id === lastStrategyId)?.id ||
      data.pricing.strategyId ||
      null;
    if (form.pricingStrategyId !== nextPricingStrategyId) {
      form.pricingStrategyId = nextPricingStrategyId;
      changed = true;
    }
  }
  if (form.finalPrice == null) {
    const nextFinalPrice = data.product.lastListingFinalPrice ?? data.pricing.finalPrice ?? data.pricing.suggestedPrice;
    if (form.finalPrice !== nextFinalPrice) {
      form.finalPrice = nextFinalPrice;
      changed = true;
    }
  }
  finalPriceInput.value = form.finalPrice != null ? String(form.finalPrice) : '';
  if (!activeCheckTab.value && groupedChecks.value.length > 0) {
    activeCheckTab.value = groupedChecks.value[0].group;
  }
  return changed;
}

async function fetchPreview(allowDefaultRefresh = true) {
  if (!props.product) return;
  loading.value = true;
  loadError.value = '';
  try {
    const response = await listingPreview(props.product.id, {
      storeId: form.storeId || undefined,
      pricingStrategyId: form.pricingStrategyId || undefined,
      finalPrice: form.finalPrice || undefined,
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || '获取上架预览失败');
    }
    preview.value = response.data;
    const defaultValueChanged = syncFormFromPreview(response.data);
    if (defaultValueChanged && allowDefaultRefresh && props.modelValue) {
      await fetchPreview(false);
    }
  } catch (error: any) {
    loadError.value = error.message || '获取上架预览失败';
  } finally {
    loading.value = false;
  }
}

async function fetchLimits() {
  if (!form.storeId) return;
  limitLoading.value = true;
  limitError.value = '';
  try {
    const response = await ozonProductAPI.getProductLimits(form.storeId);
    if (response.success) {
      limits.value = response.data || null;
    } else {
      limits.value = null;
      limitError.value = response.message || '额度未知';
    }
  } catch (error: any) {
    limits.value = null;
    limitError.value = error.message || '额度未知';
  } finally {
    limitLoading.value = false;
  }
}

async function refreshPreview() {
  if (!props.product) return;
  form.finalPrice = parseFinalPriceInput(finalPriceInput.value);
  await fetchPreview();
}

function handleFinalPriceChange() {
  form.finalPrice = parseFinalPriceInput(finalPriceInput.value);
  finalPriceInput.value = form.finalPrice != null ? String(form.finalPrice) : '';
  refreshPreview();
}

function resetState() {
  limitLoading.value = false;
  limitError.value = '';
  limits.value = null;
  loadError.value = '';
  preview.value = null;
  activeCheckTab.value = '';
  form.storeId = null;
  form.pricingStrategyId = null;
  form.finalPrice = null;
  finalPriceInput.value = '';
}

function handleClose() {
  emit('update:modelValue', false);
}

function handleDialogModelUpdate(value: boolean) {
  if (!value) {
    handleClose();
  }
}

function isListingParameterCheck(check: ProductSupplyListingCheck) {
  return ['storeId', 'pricingStrategyId', 'finalPrice', 'priceDiff'].includes(check.key);
}

function isCheckActionable(check: ProductSupplyListingCheck | null) {
  return !!check && check.status === 'error';
}

function isRequiredCheck(check: ProductSupplyListingCheck) {
  return check.status === 'error' || [
    'storeId',
    'pricingStrategyId',
    'finalPrice',
    'name',
    'brand',
    'modelName',
    'descriptionCategoryId',
    'mainImage',
    'packageLength',
    'packageWidth',
    'packageHeight',
    'grossWeight',
    'sku',
    'skuRows',
    'skuPrice',
  ].includes(check.key) || check.key.startsWith('requiredAttribute-');
}

async function focusListingParameterCheck(check: ProductSupplyListingCheck) {
  activeCheckTab.value = check.group;
  await nextTick();
  const target = check.key === 'pricingStrategyId'
    ? strategySelectRef.value?.$el
    : check.key === 'finalPrice'
      ? finalPriceInputRef.value?.$el
      : null;
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.add('listing-parameter-highlight');
  window.setTimeout(() => {
    target.classList.remove('listing-parameter-highlight');
  }, 1800);
}

async function focusBlockingCheck() {
  const check = firstBlockingCheck.value;
  if (!check) return;
  activeCheckTab.value = check.group;
  await nextTick();
  if (isListingParameterCheck(check)) {
    await focusListingParameterCheck(check);
    return;
  }
  const target = document.querySelector(`[data-check-key="${CSS.escape(check.key)}"]`) as HTMLElement | null;
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('listing-parameter-highlight');
    window.setTimeout(() => {
      target.classList.remove('listing-parameter-highlight');
    }, 1800);
  }
}

function handleCheckEdit(check: ProductSupplyListingCheck | null) {
  if (!isCheckActionable(check)) return;
  if (isListingParameterCheck(check)) {
    focusListingParameterCheck(check);
    return;
  }
  emit('edit-check', check);
  emit('update:modelValue', false);
}

async function handleSubmit() {
  if (!props.product || submitDisabled.value) return;
  if (!preview.value?.canSubmit) {
    await focusBlockingCheck();
    return;
  }
  submitting.value = true;
  try {
    const response = await listToOzon(props.product.id, {
      storeId: form.storeId!,
      pricingStrategyId: form.pricingStrategyId!,
      finalPrice: form.finalPrice!,
    });
    if (!response.success) {
      throw new Error(response.message || '上架失败');
    }
    ElMessage.success(response.message || '商品已提交到 Ozon');
    emit('submitted', { taskId: response.taskId });
    emit('update:modelValue', false);
  } catch (error: any) {
    ElMessage.error(error.message || '上架失败');
    await fetchPreview();
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible && props.product) {
      resetState();
      loadStoreContext(true).then((context) => {
        form.storeId = context?.resolvedStoreId ?? null;
        fetchLimits();
        fetchPreview();
      });
    }
    if (!visible) {
      resetState();
    }
  },
);
</script>

<style scoped>
:global(.product-listing-dialog) {
  width: min(920px, calc(100vw - var(--app-dialog-edge, 48px))) !important;
  max-width: min(920px, calc(100vw - var(--app-dialog-edge, 48px))) !important;
  height: min(800px, calc(100vh - 48px));
  max-height: calc(100vh - 48px);
  padding: 0 !important;
  display: flex;
  flex-direction: column;
}

:global(.product-listing-dialog .app-dialog-header) {
  padding: 22px 30px 18px;
  margin-bottom: 0;
}

:global(.product-listing-dialog .dialog-icon-wrapper) {
  width: 48px;
  height: 48px;
  border-radius: 14px;
}

:global(.product-listing-dialog .dialog-icon) {
  font-size: 24px;
}

:global(.product-listing-dialog .app-dialog-body) {
  flex: 1;
  min-height: 0;
  padding: 14px 30px 0;
  overflow: hidden;
}

:global(.product-listing-dialog .app-dialog-footer) {
  padding: 14px 30px 20px;
}

.listing-dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 24px 18px;
  margin-bottom: 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.78);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.72));
}

.listing-dialog-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  margin-right: 0;
  border: 1px solid rgba(191, 219, 254, 0.86);
  border-radius: 14px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 8px 18px rgba(37, 99, 235, 0.12);
}

.listing-dialog-icon {
  color: #3b82f6;
  font-size: 24px;
}

.listing-dialog-title-wrapper {
  min-width: 0;
  text-align: left;
}

.listing-dialog-title {
  margin: 0 0 4px;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
  line-height: 24px;
}

.listing-dialog-subtitle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.listing-store-name {
  max-width: 260px;
  overflow: hidden;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  padding: 1px 8px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.listing-dialog-body {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.listing-dialog-loading {
  flex: 1;
  min-height: 0;
  padding: 12px 2px;
  overflow: hidden;
}

.dialog-band + .dialog-band {
  margin-top: 14px;
}

.dialog-band {
  padding: 0;
  background: transparent;
}

.dialog-band:last-child {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.band-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.section-title {
  position: relative;
  display: flex;
  align-items: center;
  padding-left: 14px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 20px;
  margin: 0 0 14px;
}

.section-title::before {
  content: "";
  position: absolute;
  left: 0;
  width: 4px;
  height: 18px;
  border-radius: 999px;
  background: #3b82f6;
}

.price-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.price-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 10px;
}

.price-section-header .section-title {
  margin-bottom: 0;
}

.price-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  min-height: 70px;
  padding: 10px 16px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.price-card.final {
  background: #f8fbff;
  border-color: #bfdbfe;
}

.price-label {
  font-size: 12px;
  color: #64748b;
}

.price-card strong {
  font-size: 15px;
  color: #1e293b;
}

.strategy-field {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  padding: 0;
  border: 0;
  background: transparent;
}

.strategy-label {
  color: #64748b;
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}

.strategy-select {
  width: 108px;
  flex: 0 0 108px;
}

.strategy-select :deep(.el-select__wrapper) {
  min-height: 24px;
  height: 24px;
  border-radius: 7px;
  font-size: 11px;
  padding: 0 6px 0 8px;
  box-shadow: 0 0 0 1px #dbeafe inset;
  background: #ffffff;
}

.strategy-select :deep(.el-select__placeholder),
.strategy-select :deep(.el-select__selected-item) {
  font-size: 11px;
  color: #334155;
}

.strategy-select :deep(.el-select__caret) {
  font-size: 12px;
}

:global(.listing-strategy-popper) {
  min-width: 108px !important;
  border-radius: 9px !important;
  border: 1px solid rgba(191, 219, 254, 0.9) !important;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12) !important;
}

:global(.listing-strategy-popper .el-select-dropdown__item) {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  line-height: 28px;
}

:global(.listing-strategy-popper .el-select-dropdown__item.is-selected) {
  color: #2563eb;
  font-weight: 700;
  background: #eff6ff;
}

.final-price-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  min-height: 30px;
  box-shadow: 0 0 0 1px #dbeafe inset;
}

.breakdown-panel {
  position: relative;
  min-height: 88px;
  margin-top: 18px;
  padding: 18px 16px 14px;
  border: 1px solid #dbe4ef;
  border-radius: 8px;
  background: #ffffff;
}

.breakdown-title {
  position: absolute;
  top: -10px;
  left: 12px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
}

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 26px;
  row-gap: 8px;
}

.breakdown-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  min-height: 22px;
  font-size: 12px;
  color: #334155;
  line-height: 22px;
}

.breakdown-row strong {
  font-weight: 600;
  color: #1e293b;
  font-size: 12px;
  white-space: nowrap;
}

.check-header {
  margin-bottom: 8px;
}

.check-header .section-title {
  margin-bottom: 0;
  font-size: 13px;
  line-height: 18px;
}

.check-header .section-title::before {
  height: 16px;
}

.check-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.check-tabs {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.summary-item {
  border: none;
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  line-height: 17px;
}

.summary-button {
  cursor: pointer;
  transition: background-color 0.18s ease, box-shadow 0.18s ease;
}

.summary-button[aria-disabled="true"] {
  cursor: default;
}

.summary-button[aria-disabled="false"]:hover {
  box-shadow: 0 2px 8px rgba(185, 28, 28, 0.14);
}

.summary-item.error {
  color: #b91c1c;
  background: #fef2f2;
}

.summary-item.warning {
  color: #b45309;
  background: #fffbeb;
}

.summary-item.pass {
  color: #15803d;
  background: #f0fdf4;
}

.check-tabs :deep(.el-tabs__header) {
  margin: 0 0 8px;
  border-bottom: none;
}

.check-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.check-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.check-tabs :deep(.el-tabs__item) {
  height: 28px;
  line-height: 28px;
  font-size: 13px;
}

.check-tabs :deep(.el-tabs__content) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.check-tabs :deep(.el-tab-pane) {
  height: 100%;
  min-height: 0;
}

.check-scroll {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: 0 4px 12px 0;
  scrollbar-gutter: stable;
}

.check-scroll::-webkit-scrollbar {
  width: 8px;
}

.check-scroll::-webkit-scrollbar-track {
  background: #f8fafc;
  border-radius: 999px;
}

.check-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.check-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.check-list {
  border: none;
  border-radius: 0;
  overflow: visible;
}

.check-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: none;
  gap: 12px;
  min-height: 36px;
  height: 36px;
  padding: 6px 10px;
  background: #fff;
  text-align: left;
  transition: background-color 0.18s ease;
}

.check-row[aria-disabled="true"] {
  cursor: default;
}

.check-row-actionable {
  cursor: pointer;
}

.check-row-actionable:hover {
  background: #fff7f7;
}

.listing-parameter-highlight {
  border-radius: 8px;
  outline: 2px solid #3b82f6;
  outline-offset: 3px;
  animation: listingParameterPulse 1.6s ease;
}

@keyframes listingParameterPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.3);
  }
  60% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

.check-row + .check-row {
  border-top: 1px solid #eef2f7;
}

.check-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.check-label {
  font-size: 12px;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-message {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-required-mark {
  color: #ef4444;
  margin-left: 2px;
  font-size: 11px;
  font-weight: 700;
  vertical-align: top;
}

.dialog-error-state {
  padding: 8px 0;
}
</style>
