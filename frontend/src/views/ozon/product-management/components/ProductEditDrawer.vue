<template>
  <el-drawer v-model="drawerVisible" direction="rtl" size="60%" :show-close="false" @closed="handleClosed" class="add-product-drawer">
    <template #header>
      <div class="app-surface-header app-surface-header--drawer">
        <div class="app-surface-icon">
          <el-icon class="text-blue-600 text-lg"><Box /></el-icon>
        </div>
        <div class="app-surface-title-wrapper">
          <span class="app-surface-title">编辑商品信息</span>
          <span class="app-surface-subtitle">修改商品基础信息和规格参数</span>
        </div>
      </div>
    </template>
    <!-- 内容区域 -->
    <div ref="drawerBodyRef" class="add-product-body px-6 space-y-5 pb-28" :class="{ 'is-refreshing': refreshing }">
      <div v-if="refreshing" class="drawer-loading-panel">
        <AppSkeletonLoader variant="form" :rows="8" :show-avatar="true" />
      </div>
      <el-form ref="editFormRef" :model="formData" label-width="140px" label-position="left" class="add-product-form" :hide-required-asterisk="true">
        <!-- 商品信息 -->
        <div>
          <h3 class="text-sm font-semibold text-slate-800 section-title text-left flex items-center">商品信息</h3>
          <div id="field-name" class="floating-item" :class="{ 'has-error': !!fieldErrors.name }">
            <el-input v-model="formData.name" placeholder=" " class="floating-input" @focus="focused['name'] = true" @blur="focused['name'] = false">
              <template #suffix>
                <div class="field-actions">
                  <button v-if="hasFieldValue(formData.name)" type="button" class="field-action-button" @click.stop="clearField('name')" aria-label="清空名称">
                    <el-icon><Close /></el-icon>
                  </button>
                  <el-tooltip v-if="fixedFieldMeta.name.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
                    <template #content>
                      <div class="field-tooltip-content">
                        <p v-for="(line, index) in fixedFieldMeta.name.tooltip" :key="`name-tip-${index}`">{{ line }}</p>
                      </div>
                    </template>
                    <button type="button" class="field-action-button info" aria-label="查看名称提示">
                      <el-icon><InfoFilled /></el-icon>
                    </button>
                  </el-tooltip>
                </div>
              </template>
            </el-input>
            <label class="floating-label" :class="{ active: formData.name || focused['name'] }">{{ fixedFieldMeta.name.label }}</label>
            <p v-if="fieldErrors.name || fixedFieldMeta.name.description" class="field-hint" :class="{ error: !!fieldErrors.name }">{{ fieldErrors.name || fixedFieldMeta.name.description }}</p>
          </div>
          <div id="field-images" class="floating-item image-field" :class="{ 'has-error': !!fieldErrors.images }">
            <p class="text-xs text-slate-500 mb-2 text-left">
              商品图<span class="required-asterisk">*</span>
              <span class="ml-2">主图为第一张图片，最多上传8张图片</span>
            </p>
            <div class="flex flex-wrap gap-3">
              <div v-for="(image, index) in imageUrls" :key="index" class="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden border-2 border-dashed border-slate-300 relative group">
                <img :src="image" :alt="`图片${index + 1}`" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" @click="removeImage(index)">
                  <el-icon class="text-white"><Delete /></el-icon>
                </div>
                <div v-if="index === 0" class="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">主图</div>
              </div>
              <div v-if="imageUrls.length < 8" class="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all" @click="openImagePicker">
                <el-icon class="text-slate-400"><Plus /></el-icon>
              </div>
            </div>
            <p class="field-hint" :class="{ error: !!fieldErrors.images }">{{ fieldErrors.images || '商品图为必填，第一张作为主图，最多上传 8 张' }}</p>
          </div>
          <div id="field-category" class="floating-item" :class="{ 'has-error': !!fieldErrors.category }">
            <el-input v-model="categoryText" placeholder=" " readonly class="floating-input cursor-pointer" @click="openCategoryDialog" @focus="focused['category'] = true" @blur="focused['category'] = false">
              <template #suffix>
                <el-icon class="field-static-icon"><ArrowRight /></el-icon>
              </template>
            </el-input>
            <label class="floating-label" :class="{ active: categoryText || focused['category'] }">{{ fixedFieldMeta.category.label }}<span v-if="fixedFieldMeta.category.required" class="required-asterisk">*</span></label>
            <p v-if="fieldErrors.category || fixedFieldMeta.category.description" class="field-hint" :class="{ error: !!fieldErrors.category }">{{ fieldErrors.category || fixedFieldMeta.category.description }}</p>
          </div>
          <div id="field-brand" class="floating-item" :class="{ 'has-error': !!fieldErrors.brand }">
            <el-select
              v-model="formData.brand"
              placeholder=" "
              class="floating-input"
              popper-class="attribute-select-popper brand-select-popper"
              @focus="focused['brand'] = true"
              @blur="focused['brand'] = false"
              @change="handleBrandChange"
            >
              <el-option :label="'无品牌'" :value="'无品牌'" />
            </el-select>
            <button v-if="hasFieldValue(formData.brand)" type="button" class="field-action-button brand-clear" @click.stop="clearField('brand')" aria-label="清空品牌">
              <el-icon><Close /></el-icon>
            </button>
            <el-tooltip v-if="fixedFieldMeta.brand.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
              <template #content>
                <div class="field-tooltip-content">
                  <p v-for="(line, index) in fixedFieldMeta.brand.tooltip" :key="`brand-tip-${index}`">{{ line }}</p>
                </div>
              </template>
              <button type="button" class="field-action-button info brand-info" aria-label="查看品牌提示">
                <el-icon><InfoFilled /></el-icon>
              </button>
            </el-tooltip>
            <label class="floating-label" :class="{ active: formData.brand || focused['brand'] }">{{ fixedFieldMeta.brand.label }}<span v-if="fixedFieldMeta.brand.required" class="required-asterisk">*</span></label>
            <p v-if="fieldErrors.brand || fixedFieldMeta.brand.description" class="field-hint" :class="{ error: !!fieldErrors.brand }">{{ fieldErrors.brand || fixedFieldMeta.brand.description }}</p>
          </div>
          <div id="field-modelName" class="floating-item" :class="{ 'has-error': !!fieldErrors.modelName }">
            <el-input v-model="formData.modelName" placeholder=" " class="floating-input" @focus="focused['model'] = true" @blur="focused['model'] = false">
              <template #suffix>
                <div class="field-actions">
                  <button v-if="hasFieldValue(formData.modelName)" type="button" class="field-action-button" @click.stop="clearField('modelName')" aria-label="清空型号名称">
                    <el-icon><Close /></el-icon>
                  </button>
                  <el-tooltip v-if="fixedFieldMeta.modelName.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
                    <template #content>
                      <div class="field-tooltip-content">
                        <p v-for="(line, index) in fixedFieldMeta.modelName.tooltip" :key="`model-tip-${index}`">{{ line }}</p>
                      </div>
                    </template>
                    <button type="button" class="field-action-button info" aria-label="查看型号名称提示">
                      <el-icon><InfoFilled /></el-icon>
                    </button>
                  </el-tooltip>
                </div>
              </template>
            </el-input>
            <label class="floating-label" :class="{ active: formData.modelName || focused['model'] }">{{ fixedFieldMeta.modelName.label }}<span v-if="fixedFieldMeta.modelName.required" class="required-asterisk">*</span></label>
            <p v-if="fieldErrors.modelName || fixedFieldMeta.modelName.description" class="field-hint" :class="{ error: !!fieldErrors.modelName }">{{ fieldErrors.modelName || fixedFieldMeta.modelName.description }}</p>
          </div>
        </div>
        <!-- 尺寸和重量 -->
        <div>
          <h3 class="text-sm font-semibold text-slate-800 section-title text-left flex items-center">尺寸和重量</h3>
          <div class="max-w-full">
            <el-row :gutter="20">
              <el-col :span="12">
                <div id="field-packageLength" class="floating-item" :class="{ 'has-error': !!fieldErrors.packageLength }">
                  <el-input :model-value="formatNumberInput(formData.packageLength)" placeholder=" " class="floating-input w-full" inputmode="numeric" @update:model-value="value => formData.packageLength = parseNumberInput(value, false)" @focus="focused['length'] = true" @blur="focused['length'] = false">
                    <template #suffix>
                      <div class="field-actions">
                        <button v-if="hasFieldValue(formData.packageLength)" type="button" class="field-action-button" @click.stop="clearField('packageLength')" aria-label="清空包装长度">
                          <el-icon><Close /></el-icon>
                        </button>
                        <el-tooltip v-if="fixedFieldMeta.packageLength.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
                          <template #content>
                            <div class="field-tooltip-content">
                              <p v-for="(line, index) in fixedFieldMeta.packageLength.tooltip" :key="`packageLength-tip-${index}`">{{ line }}</p>
                            </div>
                          </template>
                          <button type="button" class="field-action-button info" aria-label="查看包装长度提示">
                            <el-icon><InfoFilled /></el-icon>
                          </button>
                        </el-tooltip>
                      </div>
                    </template>
                  </el-input>
                  <label class="floating-label" :class="{ active: formData.packageLength != null || focused['length'] }">{{ fixedFieldMeta.packageLength.label }}<span v-if="fixedFieldMeta.packageLength.required" class="required-asterisk">*</span></label>
                  <p v-if="fieldErrors.packageLength" class="field-hint error">{{ fieldErrors.packageLength }}</p>
                </div>
              </el-col>
              <el-col :span="12">
                <div id="field-packageWidth" class="floating-item" :class="{ 'has-error': !!fieldErrors.packageWidth }">
                  <el-input :model-value="formatNumberInput(formData.packageWidth)" placeholder=" " class="floating-input w-full" inputmode="numeric" @update:model-value="value => formData.packageWidth = parseNumberInput(value, false)" @focus="focused['width'] = true" @blur="focused['width'] = false">
                    <template #suffix>
                      <div class="field-actions">
                        <button v-if="hasFieldValue(formData.packageWidth)" type="button" class="field-action-button" @click.stop="clearField('packageWidth')" aria-label="清空包装宽度">
                          <el-icon><Close /></el-icon>
                        </button>
                        <el-tooltip v-if="fixedFieldMeta.packageWidth.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
                          <template #content>
                            <div class="field-tooltip-content">
                              <p v-for="(line, index) in fixedFieldMeta.packageWidth.tooltip" :key="`packageWidth-tip-${index}`">{{ line }}</p>
                            </div>
                          </template>
                          <button type="button" class="field-action-button info" aria-label="查看包装宽度提示">
                            <el-icon><InfoFilled /></el-icon>
                          </button>
                        </el-tooltip>
                      </div>
                    </template>
                  </el-input>
                  <label class="floating-label" :class="{ active: formData.packageWidth != null || focused['width'] }">{{ fixedFieldMeta.packageWidth.label }}<span v-if="fixedFieldMeta.packageWidth.required" class="required-asterisk">*</span></label>
                  <p v-if="fieldErrors.packageWidth" class="field-hint error">{{ fieldErrors.packageWidth }}</p>
                </div>
              </el-col>
              <el-col :span="12">
                <div id="field-packageHeight" class="floating-item" :class="{ 'has-error': !!fieldErrors.packageHeight }">
                  <el-input :model-value="formatNumberInput(formData.packageHeight)" placeholder=" " class="floating-input w-full" inputmode="numeric" @update:model-value="value => formData.packageHeight = parseNumberInput(value, false)" @focus="focused['height'] = true" @blur="focused['height'] = false">
                    <template #suffix>
                      <div class="field-actions">
                        <button v-if="hasFieldValue(formData.packageHeight)" type="button" class="field-action-button" @click.stop="clearField('packageHeight')" aria-label="清空包装高度">
                          <el-icon><Close /></el-icon>
                        </button>
                        <el-tooltip v-if="fixedFieldMeta.packageHeight.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
                          <template #content>
                            <div class="field-tooltip-content">
                              <p v-for="(line, index) in fixedFieldMeta.packageHeight.tooltip" :key="`packageHeight-tip-${index}`">{{ line }}</p>
                            </div>
                          </template>
                          <button type="button" class="field-action-button info" aria-label="查看包装高度提示">
                            <el-icon><InfoFilled /></el-icon>
                          </button>
                        </el-tooltip>
                      </div>
                    </template>
                  </el-input>
                  <label class="floating-label" :class="{ active: formData.packageHeight != null || focused['height'] }">{{ fixedFieldMeta.packageHeight.label }}<span v-if="fixedFieldMeta.packageHeight.required" class="required-asterisk">*</span></label>
                  <p v-if="fieldErrors.packageHeight" class="field-hint error">{{ fieldErrors.packageHeight }}</p>
                </div>
              </el-col>
              <el-col :span="12">
                <div id="field-grossWeight" class="floating-item" :class="{ 'has-error': !!fieldErrors.grossWeight }">
                  <el-input :model-value="formatNumberInput(formData.grossWeight)" placeholder=" " class="floating-input w-full" inputmode="numeric" @update:model-value="value => formData.grossWeight = parseNumberInput(value, false)" @focus="focused['weight'] = true" @blur="focused['weight'] = false">
                    <template #suffix>
                      <div class="field-actions">
                        <button v-if="hasFieldValue(formData.grossWeight)" type="button" class="field-action-button" @click.stop="clearField('grossWeight')" aria-label="清空含包装重量">
                          <el-icon><Close /></el-icon>
                        </button>
                        <el-tooltip v-if="fixedFieldMeta.grossWeight.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
                          <template #content>
                            <div class="field-tooltip-content">
                              <p v-for="(line, index) in fixedFieldMeta.grossWeight.tooltip" :key="`grossWeight-tip-${index}`">{{ line }}</p>
                            </div>
                          </template>
                          <button type="button" class="field-action-button info" aria-label="查看含包装重量提示">
                            <el-icon><InfoFilled /></el-icon>
                          </button>
                        </el-tooltip>
                      </div>
                    </template>
                  </el-input>
                  <label class="floating-label" :class="{ active: formData.grossWeight != null || focused['weight'] }">{{ fixedFieldMeta.grossWeight.label }}<span v-if="fixedFieldMeta.grossWeight.required" class="required-asterisk">*</span></label>
                  <p v-if="fieldErrors.grossWeight" class="field-hint error">{{ fieldErrors.grossWeight }}</p>
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
        <!-- 变体特征 -->
        <div v-if="variantAttributes.length > 0 || loadingAttributes">
          <h3 class="text-sm font-semibold text-slate-800 section-title text-left flex items-center">变体特征</h3>
          <div v-if="loadingAttributes" class="attribute-loading-panel">
            <AppSkeletonLoader variant="form" :rows="3" compact />
          </div>
          <div v-else>
            <AttributeField
              v-for="attr in editableVariantAttributes"
              :key="attr.id"
              :attribute="attr"
              v-model="formData.attributes[attr.id]"
              :error="fieldErrors[`attr-${attr.id}`]"
              :field-id="`field-attr-${attr.id}`"
            />
            <div id="field-single-sku" class="single-sku-card" :class="{ 'has-error': !!fieldErrors.sku || !!fieldErrors.price }">
              <div class="sku-matrix-header">
                <div>
                  <div class="text-sm font-semibold text-slate-800">商品变体</div>
                  <div class="sku-subtitle">当前 Ozon 商品的货号、条形码和价格在这里维护。</div>
                </div>
              </div>
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="floating-item" :class="{ 'has-error': !!fieldErrors.sku }">
                    <el-input v-model="formData.sku" placeholder=" " class="floating-input" @focus="focused['sku'] = true" @blur="focused['sku'] = false" />
                    <label class="floating-label" :class="{ active: formData.sku || focused['sku'] }">货号<span class="required-asterisk">*</span></label>
                    <p class="field-hint" :class="{ error: !!fieldErrors.sku }">{{ fieldErrors.sku || '请输入商品货号或您库存中的编号。货号应在您商品种类中独一无二' }}</p>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="floating-item">
                    <el-input v-model="formData.barcode" placeholder=" " class="floating-input" @focus="focused['barcode'] = true" @blur="focused['barcode'] = false" />
                    <label class="floating-label" :class="{ active: formData.barcode || focused['barcode'] }">条形码</label>
                    <p class="field-hint">可选，填写商品条形码</p>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="floating-item" :class="{ 'has-error': !!fieldErrors.price }">
                    <el-input :model-value="formatNumberInput(formData.price)" class="floating-input w-full" inputmode="decimal" @update:model-value="value => formData.price = parseNumberInput(value, true)" @focus="focused['price'] = true" @blur="focused['price'] = false" />
                    <label class="floating-label" :class="{ active: formData.price != null || focused['price'] }">价格<span class="required-asterisk">*</span></label>
                    <p class="field-hint" :class="{ error: !!fieldErrors.price }">{{ fieldErrors.price || '当前货号的销售价格' }}</p>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="floating-item">
                    <el-input :model-value="formatNumberInput(formData.oldPrice)" class="floating-input w-full" inputmode="decimal" @update:model-value="value => formData.oldPrice = parseNumberInput(value, true)" @focus="focused['oldPrice'] = true" @blur="focused['oldPrice'] = false" />
                    <label class="floating-label" :class="{ active: formData.oldPrice != null || focused['oldPrice'] }">折扣前价格</label>
                    <p class="field-hint">可选，填写划线价</p>
                  </div>
                </el-col>
              </el-row>
            </div>
          </div>
        </div>
        <!-- 隐藏特征 -->
        <div v-if="hiddenAttributes.length > 0 || loadingAttributes">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800 section-title text-left flex items-center mb-0 pb-0">隐藏特征</h3>
            <el-button v-if="!loadingAttributes" link type="primary" size="small" @click="hiddenFeaturesExpanded = !hiddenFeaturesExpanded" class="mb-2">
              {{ hiddenFeaturesExpanded ? '收起' : '展开' }}
              <el-icon class="ml-1"><component :is="hiddenFeaturesExpanded ? ArrowUp : ArrowDown" /></el-icon>
            </el-button>
          </div>
          <el-collapse-transition>
            <div v-show="hiddenFeaturesExpanded || loadingAttributes">
              <div v-if="loadingAttributes" class="attribute-loading-panel">
                <AppSkeletonLoader variant="form" :rows="3" compact />
              </div>
              <div v-else>
                <AttributeField
                  v-for="attr in hiddenAttributes"
                  :key="attr.id"
                  :attribute="attr"
                  v-model="formData.hiddenAttributes[attr.id]"
                  :error="fieldErrors[`hidden-${attr.id}`]"
                  :field-id="`field-hidden-${attr.id}`"
                />
              </div>
            </div>
          </el-collapse-transition>
          <div v-if="!hiddenFeaturesExpanded && !loadingAttributes" class="text-xs text-slate-400 py-2 pl-4">
            共 {{ hiddenAttributes.length }} 项隐藏特征，点击展开填写
          </div>
        </div>
      </el-form>
    </div>
    <div class="completion-bar">
      <div class="completion-main">
        <div class="completion-line">
          <span class="completion-title">填写统计</span>
          <span class="completion-meta">已填 {{ completionStats.filled }} / {{ completionStats.total }}</span>
          <span v-if="completionStats.missingRequired.length > 0" class="completion-meta">缺少 {{ completionStats.missingRequired.length }} 个必填项</span>
          <button v-if="completionStats.missingRequired.length > 0" type="button" class="missing-link" @click="scrollToMissingField">
            定位：{{ completionStats.missingRequired[0]?.label }}
          </button>
        </div>
        <div class="completion-progress"><span :style="{ width: `${completionStats.percent}%` }"></span></div>
      </div>
      <div class="completion-actions">
        <el-button class="btn-cancel" @click="handleCancel">取消</el-button>
        <el-button type="primary" class="btn-confirm" :loading="saving" @click="handleSubmit">保存</el-button>
      </div>
    </div>
    <!-- 图片选择弹窗 -->
    <ImageGalleryPicker v-model:modelValue="imagePickerVisible" :max-count="8 - imageUrls.length" :existing-image-ids="images" :existing-image-urls="imageUrls" @confirm="handleImagePickerConfirm" />
    <!-- 分类选择弹窗 -->
    <CategorySelectDialog 
      v-model="categoryDialogVisible" 
      :load-tree-data="getCategoryTreeData" 
      @select="handleCategorySelect" 
    />
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Box, Plus, Delete, ArrowUp, ArrowDown, ArrowRight, Close, InfoFilled } from '@element-plus/icons-vue';
import { AppSkeletonLoader } from '@/components/ui';
import ImageGalleryPicker from '../../../warehouse/material-library/components/ImageGalleryPicker.vue';
import CategorySelectDialog from '@/components/ui/CategorySelectDialog.vue';
import AttributeField from '../../../warehouse/product-library/components/AttributeField.vue';
import { getProductSupplyTemplate, type ProductSupplyTemplate, type ProductTemplateAttribute } from '@/api/productSupplyAPI';
import { getProductTemplateDisplay } from '@/views/warehouse/product-library/components/productTemplateDisplay';
import { ozonProductAPI } from '@/api/ozonProductAPI';
import { findCategoryPath, getCategoryTreeData } from './productEditCategories';
import { buildFixedFieldMeta } from './productEditFieldMeta';
import {
  buildAttributePayload,
  findAttributeByNames,
  findTemplateAttributeForOzonAttribute,
  formatNumberInput,
  getAttrTextValue,
  getDimensions,
  getOzonProductId,
  hasValue,
  normalizeAttributeValue,
  normalizeImageUrls,
  normalizeTemplateAttributes,
  parseNumberInput,
} from './productEditUtils';

interface Props {
  modelValue: boolean;
  product: any;
  storeId: number | null;
  refreshing?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved'): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  product: null,
  storeId: null,
  refreshing: false,
});

const emit = defineEmits<Emits>();

const drawerVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
});

const saving = ref(false);
const editFormRef = ref();
const drawerBodyRef = ref<HTMLElement | null>(null);
const imagePickerVisible = ref(false);
const images = ref<number[]>([]);
const categoryDialogVisible = ref(false);
const categoryText = ref('');
const selectedTypeId = ref(0);
const selectedTopCatId = ref(0);
const selectedSubCatId = ref(0);

const openCategoryDialog = () => {
  categoryDialogVisible.value = true;
};

const handleCategorySelect = (data: { topCatId: number; subCatId: number; typeId: number; fullPath: string }) => {
  categoryText.value = data.fullPath;
  selectedTopCatId.value = data.topCatId;
  selectedSubCatId.value = data.subCatId;
  selectedTypeId.value = data.typeId;
  formData.value.category = data.fullPath;
  formData.value.descriptionCategoryId = data.subCatId;
  formData.value.typeId = data.typeId;
  categoryDialogVisible.value = false;
  fetchProductTemplate(data.subCatId, data.typeId);
};

const imageUrls = ref<string[]>([]);

interface EditFormData {
  name: string;
  description: string;
  category: string;
  brand: string;
  modelName: string;
  offerId: string;
  sku: string;
  barcode: string;
  price: number | null;
  oldPrice: number | null;
  packageLength: number | null;
  packageWidth: number | null;
  packageHeight: number | null;
  grossWeight: number | null;
  descriptionCategoryId: number | null;
  typeId: number | null;
  attributes: Record<number, any>;
  hiddenAttributes: Record<number, any>;
  productId: string;
}

const formData = ref<EditFormData>({
  name: '',
  description: '',
  category: '',
  brand: '无品牌',
  modelName: '',
  offerId: '',
  sku: '',
  barcode: '',
  price: null,
  oldPrice: null,
  packageLength: null,
  packageWidth: null,
  packageHeight: null,
  grossWeight: null,
  descriptionCategoryId: null,
  typeId: null,
  attributes: {},
  hiddenAttributes: {},
  productId: '',
});

const focused = ref({
  name: false,
  desc: false,
  category: false,
  brand: false,
  model: false,
  offerId: false,
  sku: false,
  barcode: false,
  price: false,
  oldPrice: false,
  length: false,
  width: false,
  height: false,
  weight: false,
});

// Ozon 模板和属性
const productTemplate = ref<ProductSupplyTemplate | null>(null);
const categoryAttributes = ref<ProductTemplateAttribute[]>([]);
const loadingAttributes = ref(false);
const fieldErrors = ref<Record<string, string>>({});
let initRequestId = 0;

const variantAttributes = computed(() => productTemplate.value?.variantAttributes || categoryAttributes.value || []);
const templateDisplay = computed(() => getProductTemplateDisplay(productTemplate.value, true));
const hiddenAttributes = computed(() => templateDisplay.value.hiddenAttributes);
const editableVariantAttributes = computed(() => templateDisplay.value.editableVariantAttributes);
const hiddenFeaturesExpanded = ref(false);
const templateAttributes = computed(() => {
  const variant = Array.isArray(productTemplate.value?.variantAttributes) ? productTemplate.value!.variantAttributes : [];
  const hidden = Array.isArray(productTemplate.value?.hiddenAttributes) ? productTemplate.value!.hiddenAttributes : [];
  return [...variant, ...hidden];
});

const findTemplateAttribute = (names: string[]) => findAttributeByNames(templateAttributes.value as any[], names);

const fixedFieldMeta = computed(() => {
  const brandAttr = findTemplateAttribute(['бренд', 'brand', '品牌']);
  const modelAttr = findTemplateAttribute(['название модели', 'модель', 'model name', '型号名称', '型号']);
  return buildFixedFieldMeta(brandAttr, modelAttr);
});

const baseRequiredFields = computed(() => [
  { key: 'name', label: fixedFieldMeta.value.name.label, value: formData.value.name, required: fixedFieldMeta.value.name.required },
  { key: 'images', label: '商品图', value: imageUrls.value.length > 0 ? imageUrls.value : '', required: true },
  { key: 'category', label: fixedFieldMeta.value.category.label, value: formData.value.category, required: fixedFieldMeta.value.category.required },
  { key: 'brand', label: fixedFieldMeta.value.brand.label, value: formData.value.brand, required: fixedFieldMeta.value.brand.required },
  { key: 'modelName', label: fixedFieldMeta.value.modelName.label, value: formData.value.modelName, required: fixedFieldMeta.value.modelName.required },
  { key: 'packageLength', label: fixedFieldMeta.value.packageLength.label, value: formData.value.packageLength, required: fixedFieldMeta.value.packageLength.required },
  { key: 'packageWidth', label: fixedFieldMeta.value.packageWidth.label, value: formData.value.packageWidth, required: fixedFieldMeta.value.packageWidth.required },
  { key: 'packageHeight', label: fixedFieldMeta.value.packageHeight.label, value: formData.value.packageHeight, required: fixedFieldMeta.value.packageHeight.required },
  { key: 'grossWeight', label: fixedFieldMeta.value.grossWeight.label, value: formData.value.grossWeight, required: fixedFieldMeta.value.grossWeight.required },
]);

const templateRequiredFields = computed(() => [
  ...editableVariantAttributes.value.map(attr => ({
    key: `attr-${attr.id}`,
    label: attr.name,
    value: formData.value.attributes?.[attr.id],
    required: attr.is_required,
  })),
  ...hiddenAttributes.value.map(attr => ({
    key: `hidden-${attr.id}`,
    label: attr.name,
    value: formData.value.hiddenAttributes?.[attr.id],
    required: attr.is_required,
  })),
]);

const completionFields = computed(() => [
  ...baseRequiredFields.value,
  ...templateRequiredFields.value.filter(item => item.required),
]);

const completionStats = computed(() => {
  const total = completionFields.value.length;
  const missingRequired = completionFields.value.filter(item => item.required && !hasValue(item.value));
  const filled = Math.max(0, total - missingRequired.length);
  return {
    total,
    filled,
    missingRequired,
    percent: total > 0 ? Math.round((filled / total) * 100) : 100,
  };
});

const hasFieldValue = (value: any) => hasValue(value);

const clearField = (key: keyof EditFormData) => {
  const emptyValue = ['price', 'oldPrice', 'packageLength', 'packageWidth', 'packageHeight', 'grossWeight'].includes(String(key))
    ? null
    : '';
  (formData.value as any)[key] = emptyValue;
};

const setFieldError = (key: string, message: string) => {
  fieldErrors.value[key] = message;
};

const getFieldElementId = (key: string) => {
  if (key.startsWith('attr-')) return `field-attr-${key.replace('attr-', '')}`;
  if (key.startsWith('hidden-')) return `field-hidden-${key.replace('hidden-', '')}`;
  if (key === 'sku') return 'field-single-sku';
  return `field-${key}`;
};

const scrollToField = (key: string) => {
  const id = getFieldElementId(key);
  if (key.startsWith('hidden-')) {
    hiddenFeaturesExpanded.value = true;
  }
  requestAnimationFrame(() => {
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

const scrollToMissingField = () => {
  const missing = completionStats.value.missingRequired[0];
  if (missing) scrollToField(missing.key);
};

const validateBaseFields = () => {
  let valid = true;
  for (const item of baseRequiredFields.value) {
    if (!item.required) continue;
    if (!hasValue(item.value) || (typeof item.value === 'number' && item.value <= 0)) {
      setFieldError(item.key, `请填写${item.label}`);
      valid = false;
    }
  }
  return valid;
};

const validateTemplateAttributes = () => {
  let valid = true;
  for (const attribute of editableVariantAttributes.value) {
    if (attribute.is_required && !hasValue(formData.value.attributes?.[attribute.id])) {
      setFieldError(`attr-${attribute.id}`, `请输入 ${attribute.name}`);
      valid = false;
    }
  }
  for (const attribute of hiddenAttributes.value) {
    if (attribute.is_required && !hasValue(formData.value.hiddenAttributes?.[attribute.id])) {
      setFieldError(`hidden-${attribute.id}`, `请输入 ${attribute.name}`);
      hiddenFeaturesExpanded.value = true;
      valid = false;
    }
  }
  return valid;
};

const validateSkuFields = () => {
  let valid = true;
  if (!hasValue(formData.value.sku)) {
    setFieldError('sku', '请填写货号');
    valid = false;
  }
  if (!hasValue(formData.value.price) || Number(formData.value.price) <= 0) {
    setFieldError('price', '请填写有效价格');
    valid = false;
  }
  return valid;
};

// 获取商品类型模板
const fetchProductTemplate = async (categoryId: number, typeId: number) => {
  loadingAttributes.value = true;
  try {
    const response = await getProductSupplyTemplate({
      descriptionCategoryId: categoryId,
      typeId,
      language: 'ZH_HANS',
    });
    if (response.success && response.data) {
      const normalizedTemplate = {
        ...response.data,
        variantAttributes: normalizeTemplateAttributes(response.data.variantAttributes),
        hiddenAttributes: normalizeTemplateAttributes(response.data.hiddenAttributes),
        skuDimensionCandidates: normalizeTemplateAttributes(response.data.skuDimensionCandidates),
      };
      productTemplate.value = normalizedTemplate;
      categoryAttributes.value = normalizedTemplate.variantAttributes || [];
      hiddenFeaturesExpanded.value = false;
    } else {
      ElMessage.warning(response.message || '获取商品模板失败');
      categoryAttributes.value = [];
      productTemplate.value = null;
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取商品模板失败');
    categoryAttributes.value = [];
    productTemplate.value = null;
  } finally {
    loadingAttributes.value = false;
  }
};

const setAttributeByName = (attrs: ProductTemplateAttribute[], names: string[], value: any) => {
  if (!hasValue(value)) return;
  const attr = attrs.find(item => {
    const name = String(item.name || '').toLowerCase();
    return names.some(target => name === target.toLowerCase() || name.includes(target.toLowerCase()));
  });
  if (!attr) return;
  formData.value.attributes[attr.id] = value;
};

// 初始化表单数据 - 从产品详情中提取
const initFormData = async () => {
  if (!props.product || !props.storeId) return;

  const requestId = ++initRequestId;
  loadingAttributes.value = true;
  try {
    const productId = getOzonProductId(props.product);
    if (!productId) {
      ElMessage.error('商品ID不存在');
      return;
    }

    const rawDetail = props.product?.product?.ozonOriginalData || props.product?.ozonOriginalData || {};
    const detail = {
      ...(typeof rawDetail === 'object' && rawDetail !== null ? rawDetail : {}),
      name: rawDetail?.name || props.product?.name || props.product?.product?.titleOriginal || props.product?.product?.name,
      titleOriginal: props.product?.product?.titleOriginal || props.product?.name,
      offer_id: rawDetail?.offer_id || props.product?.offerId || props.product?.product?.offerId,
      sku: rawDetail?.sku || props.product?.sku || props.product?.ozonSku || props.product?.product?.ozonSku,
      price: rawDetail?.price ?? props.product?.price ?? props.product?.product?.price,
      old_price: rawDetail?.old_price ?? props.product?.product?.oldPrice,
      primary_image: rawDetail?.primary_image || props.product?.product?.primaryImage || props.product?.primaryImage,
      images: rawDetail?.images || props.product?.product?.images || props.product?.images,
      description_category_id: rawDetail?.description_category_id || props.product?.product?.ozonCategoryId || props.product?.descriptionCategoryId,
      type_id: rawDetail?.type_id || props.product?.typeId,
    };
    if (!detail) {
      ElMessage.error('商品本地快照缺少 Ozon 原始详情，请先更新商品列表');
      return;
    }
    const attributes = Array.isArray(detail.attributes) ? detail.attributes : [];
    const dimensions = getDimensions(detail);
    const brandAttr = findAttributeByNames(attributes, ['бренд', 'brand', '品牌']);
    const modelAttr = findAttributeByNames(attributes, ['название модели', 'модель', 'model name', '型号名称', '型号']);
    const barcodeAttr = findAttributeByNames(attributes, ['barcode', 'штрихкод', '条形码']);

    // 提取基本信息
    formData.value = {
      name: detail.name || detail.titleOriginal || '',
      description: detail.description || detail.descriptionOriginal || '',
      category: '',
      brand: detail.brand || getAttrTextValue(brandAttr) || '无品牌',
      modelName: detail.offer_id || detail.offerId || detail.modelName || getAttrTextValue(modelAttr) || '',
      offerId: detail.offer_id || detail.offerId || '',
      sku: detail.sku ? String(detail.sku) : '',
      barcode: detail.barcode || (Array.isArray(detail.barcodes) ? detail.barcodes[0] : '') || getAttrTextValue(barcodeAttr) || '',
      price: parseFloat(detail.price || 0),
      oldPrice: detail.old_price ? parseFloat(detail.old_price) : null,
      packageLength: dimensions.length,
      packageWidth: dimensions.width,
      packageHeight: dimensions.height,
      grossWeight: dimensions.weight,
      descriptionCategoryId: detail.description_category_id || null,
      typeId: detail.type_id || null,
      attributes: {},
      hiddenAttributes: {},
      productId: String(productId),
    };

    // 处理图片
    imageUrls.value = normalizeImageUrls(detail);
    images.value = [];

    // 处理类目
    if (detail.description_category_id) {
      selectedSubCatId.value = detail.description_category_id;
      selectedTypeId.value = detail.type_id || 0;
      const categoryPath = findCategoryPath(detail.description_category_id, detail.type_id);
      if (categoryPath) {
        selectedTopCatId.value = categoryPath.topCatId;
        selectedSubCatId.value = categoryPath.subCatId;
        selectedTypeId.value = categoryPath.typeId;
        categoryText.value = categoryPath.fullPath;
        formData.value.category = categoryPath.fullPath;
      }
      // 加载模板
      if (detail.type_id) {
        await fetchProductTemplate(detail.description_category_id, detail.type_id);
        if (requestId !== initRequestId) return;
      }
    }

    // 处理属性 - 从Ozon API返回的attributes数组中提取
    if (attributes.length > 0) {
      attributes.forEach((attr: any) => {
        const attrId = attr.id;
        if (attrId) {
          const normalized = normalizeAttributeValue(attr);
          const normalizedName = String(attr.name || attr.attribute_name || '').toLowerCase();
          if (normalizedName.includes('brand') || normalizedName.includes('бренд') || normalizedName.includes('品牌')) {
            formData.value.brand = getAttrTextValue(attr) || formData.value.brand;
          }
          if ((normalizedName.includes('model') || normalizedName.includes('модель') || normalizedName.includes('型号')) && !formData.value.modelName) {
            formData.value.modelName = getAttrTextValue(attr) || formData.value.modelName;
          }
          if (normalizedName.includes('barcode') || normalizedName.includes('штрихкод') || normalizedName.includes('条形码')) {
            formData.value.barcode = getAttrTextValue(attr) || formData.value.barcode;
          }
          // 判断是变体还是隐藏属性
          const hiddenAttr = findTemplateAttributeForOzonAttribute(attr, hiddenAttributes.value);
          const variantAttr = findTemplateAttributeForOzonAttribute(attr, editableVariantAttributes.value);
          if (hiddenAttr) {
            formData.value.hiddenAttributes[hiddenAttr.id] = normalized;
          } else if (variantAttr) {
            formData.value.attributes[variantAttr.id] = normalized;
          } else {
            formData.value.attributes[attrId] = normalized;
          }
        }
      });
    }
  } catch (error: any) {
    ElMessage.error(error.message || '初始化表单失败');
  } finally {
    loadingAttributes.value = false;
  }
};

// 监听抽屉打开
watch(drawerVisible, (newVal) => {
  if (newVal) {
    initFormData();
  }
});

watch(() => props.product, () => {
  if (drawerVisible.value) {
    initFormData();
  }
});

// 表单提交处理
const handleSubmit = async () => {
  if (!editFormRef.value) return;
  fieldErrors.value = {};

  const valid = [validateBaseFields(), validateTemplateAttributes(), validateSkuFields()].every(Boolean);
  if (!valid) {
    const firstKey = Object.keys(fieldErrors.value)[0];
    ElMessage.warning(fieldErrors.value[firstKey] || '请完善必填项');
    if (firstKey) scrollToField(firstKey);
    return;
  }

  saving.value = true;
  try {
    if (!props.storeId) {
      ElMessage.warning('请先在顶部选择当前操作店铺');
      return;
    }
    setAttributeByName(variantAttributes.value, ['бренд', 'brand', '品牌'], formData.value.brand || '无品牌');
    setAttributeByName(variantAttributes.value, ['barcode', 'штрихкод', '条形码'], formData.value.barcode);

    // 构建提交数据
    const submitData = {
      productId: formData.value.productId,
      name: formData.value.name,
      description: formData.value.description,
      images: imageUrls.value,
      imageUrl: imageUrls.value[0] || '',
      brand: formData.value.brand || '无品牌',
      modelName: formData.value.modelName,
      offerId: formData.value.offerId,
      sku: formData.value.sku,
      barcode: formData.value.barcode,
      price: formData.value.price,
      oldPrice: formData.value.oldPrice,
      packageLength: formData.value.packageLength,
      packageWidth: formData.value.packageWidth,
      packageHeight: formData.value.packageHeight,
      grossWeight: formData.value.grossWeight,
      descriptionCategoryId: formData.value.descriptionCategoryId,
      typeId: formData.value.typeId,
      attributes: [],
    };

    // 构建attributes数组供Ozon API使用
    const allAttrs = [
      ...Object.entries(formData.value.attributes).map(([id, value]) => buildAttributePayload(Number(id), value)),
      ...Object.entries(formData.value.hiddenAttributes).map(([id, value]) => buildAttributePayload(Number(id), value)),
    ].filter(Boolean);
    submitData.attributes = allAttrs;

    // 调用更新API，后端成功后会刷新该条本地快照
    const response = await ozonProductAPI.updateProduct(props.storeId, formData.value.productId, submitData);
    if (response.success) {
      ElMessage.success('商品更新成功');
      emit('saved');
      drawerVisible.value = false;
    } else {
      ElMessage.error(response.message || '更新失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const handleCancel = () => {
  drawerVisible.value = false;
};

const handleClosed = () => {
  hiddenFeaturesExpanded.value = false;
  formData.value = {
    name: '',
    description: '',
    category: '',
    brand: '无品牌',
    modelName: '',
    offerId: '',
    sku: '',
    barcode: '',
    price: null,
    oldPrice: null,
    packageLength: null,
    packageWidth: null,
    packageHeight: null,
    grossWeight: null,
    descriptionCategoryId: null,
    typeId: null,
    attributes: {},
    hiddenAttributes: {},
    productId: '',
  };
  images.value = [];
  imageUrls.value = [];
  productTemplate.value = null;
  categoryAttributes.value = [];
  fieldErrors.value = {};
  focused.value = {
    name: false,
    desc: false,
    category: false,
    brand: false,
    model: false,
    offerId: false,
    sku: false,
    barcode: false,
    price: false,
    oldPrice: false,
    length: false,
    width: false,
    height: false,
    weight: false,
  };
};

const openImagePicker = () => {
  imagePickerVisible.value = true;
};

const handleImagePickerConfirm = (selectedImageIds: number[], newImages: any[], selectedImageData: any[]) => {
  const existingImageIds = images.value;
  const newImageIds = selectedImageIds.filter(id => !existingImageIds.includes(id));
  const existingImageUrlSet = new Set(imageUrls.value);
  const newSelectedImageUrls = selectedImageData
    .map(img => img.fileUrl)
    .filter(url => url && !existingImageUrlSet.has(url));
  const newImageUrls = newImages.map(img => img.fileUrl);
  const allNewUrls = [...newSelectedImageUrls, ...newImageUrls];
  images.value = [...images.value, ...newImageIds];
  imageUrls.value = [...imageUrls.value, ...allNewUrls];
};

const removeImage = (index: number) => {
  images.value.splice(index, 1);
  imageUrls.value.splice(index, 1);
};
</script>

<style scoped>
/* 复用 AddProductDrawer 样式 */
.add-product-form {
  width: 100%;
}

.add-product-body {
  height: calc(100vh - 84px);
  overflow-y: auto;
}

:global(.add-product-drawer .el-drawer__body) {
  position: relative;
  overflow: hidden;
  padding: 0;
}

.required-asterisk {
  color: #f56c6c;
  position: relative;
  top: -6px;
  font-size: 11px;
  margin-left: 2px;
}

.section-title {
  padding-top: 18px;
  padding-bottom: 16px;
  margin: 0;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 16px;
  background: #3b82f6;
  border-radius: 999px;
  margin-right: 8px;
}

.add-product-form > div > .section-title ~ * {
  width: calc(100% - 18px);
  margin-left: 18px;
}

.floating-item {
  position: relative;
  margin-bottom: 22px;
  max-width: 100%;
}

.floating-item .floating-label {
  position: absolute;
  left: 13px;
  top: 23px;
  transform: translateY(-50%);
  font-size: 13px;
  color: #94a3b8;
  pointer-events: none;
  background: #fff;
  padding: 0 4px;
  transition: all 0.2s ease;
  z-index: 1;
  max-width: calc(100% - 28px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.floating-item .floating-label.active {
  top: 0;
  transform: translateY(-50%);
  font-size: 11px;
  color: #3b82f6;
}

.floating-item :deep(.el-input__wrapper),
.floating-item :deep(.el-select__wrapper),
.floating-item :deep(.el-cascader__wrapper) {
  padding-top: 0;
  padding-left: 13px;
  height: 46px;
  border-radius: 8px;
  width: 100%;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

.floating-item :deep(.el-input__wrapper:hover),
.floating-item :deep(.el-select__wrapper:hover),
.floating-item :deep(.el-cascader__wrapper:hover) {
  box-shadow: 0 0 0 1px #bfdbfe inset;
}

.floating-item :deep(.el-input__wrapper.is-focus),
.floating-item :deep(.el-select__wrapper.is-focused),
.floating-item :deep(.el-cascader__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3b82f6 inset;
}

.floating-item :deep(.el-input__inner) {
  height: 100%;
  font-size: 13px;
  padding-top: 0;
  color: #0f172a;
  line-height: 46px;
}

.floating-item :deep(.el-input__suffix) {
  display: flex;
  align-items: center;
  color: #94a3b8;
}

.floating-item :deep(.el-textarea__inner) {
  height: 96px;
  font-size: 13px;
  padding-top: 18px;
  border-radius: 8px;
}

.floating-item.has-error :deep(.el-input__wrapper),
.floating-item.has-error :deep(.el-select__wrapper),
.floating-item.has-error :deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px #ef4444 inset;
}

.field-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 4px 0 0 0;
  line-height: 1.4;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 17px;
}

.field-hint.error {
  color: #ef4444;
}

.field-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.16s ease;
}

.floating-item:hover .field-actions,
.floating-item:focus-within .field-actions {
  opacity: 1;
  pointer-events: auto;
}

.field-action-button {
  width: 22px;
  height: 22px;
  border: 0;
  padding: 0;
  border-radius: 999px;
  background: transparent;
  color: #94a3b8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.field-action-button:hover {
  color: #64748b;
  background: transparent;
}

.field-action-button.info {
  color: #64748b;
  background: transparent;
}

.field-action-button.info:hover {
  color: #475569;
  background: transparent;
}

.brand-select-popper {
  min-width: 220px;
}

.brand-clear,
.brand-info {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}

.brand-clear {
  right: 34px;
}

.brand-info {
  right: 8px;
}

.field-static-icon {
  color: #94a3b8;
  font-size: 15px;
}

.field-tooltip-content {
  max-width: 280px;
  font-size: 13px;
  line-height: 1.6;
  color: #fff;
}

.field-tooltip-content p {
  margin: 0 0 6px 0;
}

.field-tooltip-content p:last-child {
  margin-bottom: 0;
}

.floating-item.textarea-field .floating-label {
  top: 25px;
  transform: none;
}

.attribute-loading-panel {
  min-height: 150px;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  margin-bottom: 18px;
}

.add-product-body {
  position: relative;
}

.add-product-body.is-refreshing {
  pointer-events: none;
}

.drawer-loading-panel {
  position: absolute;
  inset: 0 24px 96px;
  z-index: 4;
  max-height: calc(100% - 96px);
  overflow: hidden;
  padding: 18px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.94);
  backdrop-filter: blur(1px);
}

.single-sku-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
  margin: 4px 0 22px;
  background: #f8fafc;
}

.single-sku-card.has-error {
  border-color: #ef4444;
}

.sku-matrix-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.sku-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

.completion-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 24px;
  border-top: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
  z-index: 12;
}

.completion-main {
  min-width: 0;
  flex: 1;
}

.completion-line {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  white-space: nowrap;
}

.completion-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  flex-shrink: 0;
}

.completion-meta {
  font-size: 12px;
  color: #64748b;
  flex-shrink: 0;
}

.completion-progress {
  width: 300px;
  height: 5px;
  margin-top: 7px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.completion-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #3b82f6;
  transition: width 0.2s ease;
}

.missing-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.completion-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
