<template>
  <AppDialog
    :model-value="visible"
    :title="isEdit ? '编辑关键词规则' : '添加关键词规则'"
    :subtitle="isEdit ? '修改关键词触发条件与回复内容' : '设置买家消息的关键词触发与自动回复'"
    :show-footer="false"
    :icon="icon"
    @update:model-value="$emit('update:visible', $event)"
  >
    <!-- 表单 -->
    <form class="dialog-form" @submit.prevent="handleSave">
      <!-- 规则类型 -->
      <div class="form-item-wrapper">
        <div class="flex items-center gap-2 mb-2">
          <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">规则类型</label>
          <div class="rule-type-toggle" role="radiogroup" aria-label="规则类型">
            <button
              type="button"
              :class="['rule-type-option', { 'is-active': localForm.type === 'store' }]"
              role="radio"
              :aria-checked="localForm.type === 'store'"
              @click="setRuleType('store')"
            >
              店铺规则
            </button>
            <button
              type="button"
              :class="['rule-type-option', { 'is-active': localForm.type === 'product' }]"
              role="radio"
              :aria-checked="localForm.type === 'product'"
              @click="setRuleType('product')"
            >
              商品规则
            </button>
          </div>
        </div>
        <div class="type-hint">
          {{ localForm.type === 'store' ? '适用于物流、包邮、退货等店铺层面的通用回复' : '适用于尺码、材质、颜色等具体商品的回复' }}
        </div>
      </div>

      <!-- 关联商品（仅商品类型显示） -->
      <div v-if="localForm.type === 'product'" class="form-item-wrapper">
        <div class="flex items-center gap-2 mb-2 min-w-0">
          <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">关联商品</label>
          <el-select
            v-model="localForm.productSelectionId"
            placeholder="请选择关联商品"
            filterable
            fit-input-width
            :loading="productsLoading"
            class="flex-1 input-height auto-reply-product-select"
            popper-class="auto-reply-product-select-popper"
            @focus="loadProducts"
          >
            <template #loading>
              <div class="product-select-loading">
                <span class="product-select-loading-spinner"></span>
                <span>正在加载商品</span>
              </div>
            </template>
            <template #empty>
              <div class="product-select-empty">
                {{ productsLoading ? '正在加载商品' : '暂无在售商品' }}
              </div>
            </template>
            <el-option
              v-for="product in productList"
              :key="product.id"
              :label="getProductOptionName(product)"
              :value="product.id"
            >
              <div class="product-option">
                <img
                  v-if="product.imageUrl"
                  :src="product.imageUrl"
                  class="product-option-img"
                  alt=""
                />
                <div v-else class="product-option-img-placeholder">
                  图
                </div>
                <div class="product-option-info">
                  <div class="product-option-name" :title="getProductOptionName(product)">
                    {{ getProductOptionName(product) }}
                  </div>
                  <div class="product-option-meta">
                    <span v-if="product.category">{{ product.category }}</span>
                    <span v-if="product.price"> · ₽{{ product.price }}</span>
                  </div>
                </div>
              </div>
            </el-option>
          </el-select>
        </div>
      </div>

      <!-- 关键词 -->
      <div class="form-item-wrapper">
        <div class="flex items-center gap-2 mb-2">
          <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">关键词</label>
          <el-input
            v-model="localForm.keyword"
            placeholder="请输入触发关键词"
            :maxlength="100"
            :show-word-limit="true"
            class="input-basic flex-1"
          />
        </div>
      </div>

      <!-- 回复内容 -->
      <div class="form-item-wrapper">
        <div class="flex items-center gap-2 mb-2">
          <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">回复内容</label>
          <el-input
            v-model="localForm.replyContent"
            type="textarea"
            :rows="3"
            placeholder="请输入自动回复内容"
            :maxlength="500"
            :show-word-limit="true"
            class="textarea-base flex-1"
          />
        </div>
      </div>

      <!-- 启用状态 -->
      <div class="form-item-wrapper">
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">状态</label>
          <el-switch v-model="localForm.enabled" inline-prompt :active-icon="Check" :inactive-icon="Close" class="dialog-switch" />
        </div>
      </div>

      <!-- 优先级 -->
      <div class="form-item-wrapper">
        <div class="flex items-center gap-2 mb-2">
          <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">优先级</label>
          <div class="flex-1 flex items-center gap-4">
            <el-slider v-model="localForm.priority" :min="1" :max="10" class="flex-1" />
            <span class="text-sm text-gray-600 font-medium w-8 text-right">{{ localForm.priority }}</span>
          </div>
        </div>
        <div class="priority-hint">数值越大越优先匹配</div>
      </div>
    </form>

    <!-- 底部按钮 -->
    <div class="dialog-footer">
      <el-button class="btn-cancel" @click="handleCancel">取消</el-button>
      <el-button type="primary" class="btn-confirm" :loading="saving" @click="handleSave">确认</el-button>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { AppDialog } from '@/components/ui';
import { ozonProductAPI } from '@/api/ozonProductAPI';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
import { useProductNameTranslations } from '@/composables/useProductNameTranslations';
import { getProductImage } from '@/views/ozon/product-management/utils/productDisplay';
import type { Component } from 'vue';
import { Check, Close } from '@element-plus/icons-vue';

interface AutoReplyProductOption {
  id: number;
  name: string;
  imageUrl: string;
  category: string;
  price: number;
}

type AutoReplyFormData = {
  type: 'store' | 'product';
  keyword: string;
  replyContent: string;
  enabled: boolean;
  priority: number;
  productSelectionId: number | null;
}

interface Props {
  visible: boolean;
  formData: AutoReplyFormData;
  isEdit?: boolean;
  saving?: boolean;
  icon?: Component;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  isEdit: false,
  saving: false,
  icon: undefined,
  formData: () => ({
    type: 'store',
    keyword: '',
    replyContent: '',
    enabled: true,
    priority: 1,
    productSelectionId: null,
  }),
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'update:formData': [value: AutoReplyFormData];
  save: [];
}>();

const createDefaultForm = (): AutoReplyFormData => ({
  type: 'store',
  keyword: '',
  replyContent: '',
  enabled: true,
  priority: 1,
  productSelectionId: null,
});

const cloneForm = (value?: Partial<AutoReplyFormData>): AutoReplyFormData => ({
  ...createDefaultForm(),
  ...value,
});

const localForm = reactive<AutoReplyFormData>(cloneForm(props.formData));

watch(
  () => props.formData,
  value => {
    Object.assign(localForm, cloneForm(value));
  },
  { deep: true }
);

watch(
  localForm,
  value => {
    emit('update:formData', cloneForm(value));
  },
  { deep: true }
);

// 商品列表状态
const productList = ref<AutoReplyProductOption[]>([]);
const productsLoading = ref(false);
const productsLoaded = ref(false);
const { loadStoreContext } = useOzonStoreContext();
const { getTranslatedName, resolveNames } = useProductNameTranslations();

const getProductOptionName = (product: AutoReplyProductOption) => {
  return getTranslatedName(product.name) || '未命名商品';
};

const normalizeProductOption = (product: any): AutoReplyProductOption | null => {
  const id = Number(product?.id);
  if (!Number.isFinite(id)) return null;
  const name = String(
    product?.name ||
    product?.nameZh ||
    product?.product?.titleTranslated ||
    product?.product?.titleOriginal ||
    product?.offerId ||
    ''
  ).trim();

  return {
    id,
    name: name || '未命名商品',
    imageUrl: getProductImage(product),
    category: String(product?.categoryName || product?.product?.category || '').trim(),
    price: Number(product?.price || product?.product?.price || 0),
  };
};

// 加载商品列表
const loadProducts = async () => {
  if (productsLoaded.value) return;
  productsLoading.value = true;
  try {
    const context = await loadStoreContext(true);
    const storeId = context?.resolvedStoreId;
    if (!storeId) {
      productList.value = [];
      productsLoaded.value = true;
      return;
    }

    const res = await ozonProductAPI.getLocalProducts(storeId, 1, 200, '', 'selling');
    if (res.success && res.data) {
      const items = Array.isArray(res.data.items) ? res.data.items : [];
      productList.value = items
        .map(normalizeProductOption)
        .filter((item): item is AutoReplyProductOption => Boolean(item));
      await resolveNames(productList.value.map(product => product.name));
      productsLoaded.value = true;
    }
  } catch {
    // 静默失败
  } finally {
    productsLoading.value = false;
  }
};

// 切换类型时清空商品选择
const handleTypeChange = (val: string | number | boolean) => {
  if (val === 'store') {
    localForm.productSelectionId = null;
  }
};

const setRuleType = (type: AutoReplyFormData['type']) => {
  if (localForm.type === type) return;
  localForm.type = type;
  handleTypeChange(type);
};

const handleCancel = () => {
  emit('update:visible', false);
};

const handleSave = () => {
  emit('save');
};
</script>

<style scoped>
/* 表单容器 */
.dialog-form {
  padding: 0 16px;
  font-size: 13px;
}

/* 统一占位符字号 */
.dialog-form ::placeholder {
  font-size: 12px;
}

.rule-type-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  width: 218px;
  height: 34px;
  padding: 2px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #f8fafc;
}

.rule-type-option {
  flex: 1 1 0;
  min-width: 0;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #475569;
  font-size: 13px;
  line-height: 28px;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.rule-type-option:hover {
  color: #2563eb;
}

.rule-type-option.is-active {
  background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
  color: #fff;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.2);
}

.rule-type-option:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

/* 统一输入框高度和字号 */
.input-height {
  height: 34px;
  font-size: 12px;
}

/* 调整 el-select 组件内的字号 - 需同时设置 wrapper 和 input */
.input-height :deep(.el-select__wrapper) {
  font-size: 12px;
  max-width: 100%;
}

.input-height :deep(.el-select__input) {
  font-size: 12px;
}

/* 调整 el-select 下拉选项的字号 */
.input-height :deep(.el-select-dropdown__item) {
  font-size: 12px;
}

.auto-reply-product-select {
  min-width: 0;
  max-width: 100%;
}

.auto-reply-product-select :deep(.el-select__selection) {
  min-width: 0;
}

:global(.auto-reply-product-select-popper) {
  max-width: calc(100vw - 48px);
}

:global(.auto-reply-product-select-popper .el-select-dropdown) {
  max-width: 100%;
}

:global(.auto-reply-product-select-popper .el-select-dropdown__item) {
  height: auto;
  min-height: 58px;
  padding: 7px 10px;
  line-height: 1.35;
  white-space: normal;
}

.product-select-loading,
.product-select-empty {
  min-height: 54px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

.product-select-loading-spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #dbeafe;
  border-top-color: #3b82f6;
  animation: productSelectSpin 0.7s linear infinite;
}

@keyframes productSelectSpin {
  to {
    transform: rotate(360deg);
  }
}

/* 表单项包装 */
.form-item-wrapper {
  margin-bottom: 16px;
}

/* 类型提示文字 */
.type-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
  line-height: 1.4;
  margin-left: 88px;
}

/* 优先级提示 */
.priority-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-left: 88px;
}

/* 商品选择器选项 */
.product-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.product-option-img {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  flex: 0 0 32px;
  background-color: #f1f5f9;
}

.product-option-img-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex: 0 0 32px;
  background-color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.product-option-info {
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.product-option-name {
  font-size: 12px;
  font-weight: 500;
  color: #1e293b;
  line-height: 17px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.product-option-meta {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
  line-height: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 底部 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}


</style>
