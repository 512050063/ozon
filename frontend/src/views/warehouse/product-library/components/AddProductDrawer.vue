<template>
  <el-drawer v-model="drawerVisible" direction="rtl" size="60%" :show-close="false" @closed="handleClosed"
    class="add-product-drawer"><template #header>
      <div class="app-surface-header app-surface-header--drawer">
        <div class="app-surface-icon">
          <el-icon class="text-blue-600 text-lg">
            <Box />
          </el-icon>
        </div>
        <div class="app-surface-title-wrapper">
          <span class="app-surface-title">{{ isEditMode ? '编辑商品信息' : '添加商品信息' }}</span><span
            class="app-surface-subtitle">{{ isEditMode ? '修改商品基础信息和规格参数' : '填写商品基础信息并添加到商品库' }}</span>
        </div>
      </div>
    </template><!-- 内容区域 -->
    <div ref="drawerBodyRef" class="add-product-body px-6 space-y-5 pb-28">
      <el-form ref="addFormRef" :model="formData" label-width="140px" label-position="left" class="add-product-form"
        :hide-required-asterisk="true"><!-- 商品信息 -->
        <div>
          <h3 class="text-sm font-semibold text-slate-800 section-title text-left flex items-center">商品信息</h3>
          <div id="field-name" class="floating-item" :class="{ 'has-error': !!fieldErrors.name }">
            <el-input v-model="formData.name" placeholder=" " class="floating-input" @input="generateModelNumber"
              @focus="focused['name'] = true" @blur="focused['name'] = false">
              <template #suffix>
                <div class="field-actions">
                  <button v-if="hasFieldValue(formData.name)" type="button" class="field-action-button" @click.stop="clearField('name')" aria-label="清空商品名称">
                    <el-icon><Close /></el-icon>
                  </button>
                  <el-tooltip v-if="fixedFieldMeta.name.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
                    <template #content>
                      <div class="field-tooltip-content">
                        <p v-for="(line, index) in fixedFieldMeta.name.tooltip" :key="`name-tip-${index}`">{{ line }}</p>
                      </div>
                    </template>
                    <button type="button" class="field-action-button info" aria-label="查看商品名称提示">
                      <el-icon><InfoFilled /></el-icon>
                    </button>
                  </el-tooltip>
                </div>
              </template>
            </el-input><label class="floating-label"
              :class="{ active: formData.name || focused['name'] }">{{ fixedFieldMeta.name.label }}<span v-if="fixedFieldMeta.name.required" class="required-asterisk">*</span></label>
            <p v-if="fieldErrors.name || fixedFieldMeta.name.description" class="field-hint" :class="{ error: !!fieldErrors.name }" :title="fieldErrors.name || fixedFieldMeta.name.description">{{ fieldErrors.name || fixedFieldMeta.name.description }}</p>
          </div>
          <div id="field-images" class="floating-item image-field" :class="{ 'has-error': !!fieldErrors.images }">
            <p class="text-xs text-slate-500 mb-2 text-left">
              商品图<span class="required-asterisk">*</span>
              <span class="ml-2">主图为第一张图片，最多上传8张图片</span>
            </p>
            <div class="flex flex-wrap gap-3">
              <div v-for="(image, index) in imageUrls" :key="index"
                class="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden border-2 border-dashed border-slate-300 relative group">
                <AppImage :src="image" :alt="`图片${index + 1}`" class="w-full h-full" error-text="加载失败" empty-text="暂无图片" />
                <div
                  class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="removeImage(index)">
                  <el-icon class="text-white">
                    <Delete />
                  </el-icon>
                </div>
                <div v-if="index === 0"
                  class="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                  主图
                </div>
              </div>
              <div v-if="imageUrls.length < 8"
                class="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                @click="openImagePicker">
                <el-icon class="text-slate-400">
                  <Plus />
                </el-icon>
              </div>
            </div>
            <p class="field-hint" :class="{ error: !!fieldErrors.images }" :title="fieldErrors.images || '商品图为必填，第一张作为主图，最多上传 8 张'">{{ fieldErrors.images || '商品图为必填，第一张作为主图，最多上传 8 张' }}</p>
          </div>
          <div id="field-category" class="floating-item" :class="{ 'has-error': !!fieldErrors.category }">
            <el-input v-model="categoryText" placeholder=" " readonly class="floating-input cursor-pointer"
              @click="openCategoryDialog" @focus="focused['category'] = true" @blur="focused['category'] = false" /><label
              class="floating-label" :class="{ active: categoryText || focused['category'] }">{{ fixedFieldMeta.category.label }}<span
                v-if="fixedFieldMeta.category.required" class="required-asterisk">*</span></label>
            <p v-if="fieldErrors.category || fixedFieldMeta.category.description" class="field-hint" :class="{ error: !!fieldErrors.category }" :title="fieldErrors.category || fixedFieldMeta.category.description">{{ fieldErrors.category || fixedFieldMeta.category.description }}</p>
          </div>
          <div id="field-brand" class="floating-item" :class="{ 'has-error': !!fieldErrors.brand }">
            <el-select
              v-model="formData.brand"
              placeholder=" "
              class="floating-input brand-select"
              popper-class="attribute-select-popper brand-select-popper"
              @focus="focused['brand'] = true"
              @blur="focused['brand'] = false"
              @change="handleBrandChange"
              @clear="clearField('brand')"
            >
              <el-option
                v-for="option in brandOptions"
                :key="String(option.id ?? option.valueId ?? option.value)"
                :label="option.value"
                :value="option.value"
              >
                <div class="brand-option">
                  <span class="brand-option-name">{{ option.value }}</span>
                  <span v-if="option.info || option.description" class="brand-option-desc">{{ option.info || option.description }}</span>
                </div>
              </el-option>
            </el-select>
            <label class="floating-label"
              :class="{ active: formData.brand || focused['brand'] }">{{ fixedFieldMeta.brand.label }}<span v-if="fixedFieldMeta.brand.required" class="required-asterisk">*</span></label>
            <p v-if="fieldErrors.brand || fixedFieldMeta.brand.description" class="field-hint" :class="{ error: !!fieldErrors.brand }" :title="fieldErrors.brand || fixedFieldMeta.brand.description">{{ fieldErrors.brand || fixedFieldMeta.brand.description }}</p>
          </div>
          <div id="field-modelName" class="floating-item" :class="{ 'has-error': !!fieldErrors.modelName }">
            <el-input v-model="formData.modelName" placeholder=" " class="floating-input" @input="handleModelNameInput"
              @focus="focused['model'] = true" @blur="focused['model'] = false">
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
            </el-input><label class="floating-label"
              :class="{ active: formData.modelName || focused['model'] }">{{ fixedFieldMeta.modelName.label }}<span
                v-if="fixedFieldMeta.modelName.required" class="required-asterisk">*</span></label>
            <p v-if="fieldErrors.modelName || fixedFieldMeta.modelName.description" class="field-hint" :class="{ error: !!fieldErrors.modelName }" :title="fieldErrors.modelName || fixedFieldMeta.modelName.description">{{ fieldErrors.modelName || fixedFieldMeta.modelName.description }}</p>
          </div>
        </div>
        <!-- 尺寸和重量 -->
        <div>
          <h3 class="text-sm font-semibold text-slate-800 section-title text-left flex items-center">尺寸和重量</h3>
          <div class="max-w-full">
            <el-row :gutter="20"><el-col :span="12">
                <div id="field-packageLength" class="floating-item" :class="{ 'has-error': !!fieldErrors.packageLength }">
                  <el-input :model-value="formatNumberInput(formData.packageLength)" placeholder=" " class="floating-input w-full"
                    inputmode="numeric" @update:model-value="value => formData.packageLength = parseNumberInput(value, false)"
                    @focus="focused['length'] = true" @blur="focused['length'] = false">
                    <template #suffix>
                      <div class="field-actions">
                        <button v-if="hasFieldValue(formData.packageLength)" type="button" class="field-action-button" @click.stop="clearField('packageLength')" aria-label="清空包装长度">
                          <el-icon><Close /></el-icon>
                        </button>
                        <el-tooltip v-if="fixedFieldMeta.packageLength.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
                          <template #content>
                            <div class="field-tooltip-content">
                              <p v-for="(line, index) in fixedFieldMeta.packageLength.tooltip" :key="`length-tip-${index}`">{{ line }}</p>
                            </div>
                          </template>
                          <button type="button" class="field-action-button info" aria-label="查看包装长度提示">
                            <el-icon><InfoFilled /></el-icon>
                          </button>
                        </el-tooltip>
                      </div>
                    </template>
                  </el-input><label class="floating-label"
                    :class="{ active: formData.packageLength != null || focused['length'] }">{{ fixedFieldMeta.packageLength.label }}<span
                      v-if="fixedFieldMeta.packageLength.required" class="required-asterisk">*</span></label>
                  <p v-if="fieldErrors.packageLength" class="field-hint error" :title="fieldErrors.packageLength">{{ fieldErrors.packageLength }}</p>
                </div>
              </el-col><el-col :span="12">
                <div id="field-packageWidth" class="floating-item" :class="{ 'has-error': !!fieldErrors.packageWidth }">
                  <el-input :model-value="formatNumberInput(formData.packageWidth)" placeholder=" " class="floating-input w-full"
                    inputmode="numeric" @update:model-value="value => formData.packageWidth = parseNumberInput(value, false)"
                    @focus="focused['width'] = true" @blur="focused['width'] = false">
                    <template #suffix>
                      <div class="field-actions">
                        <button v-if="hasFieldValue(formData.packageWidth)" type="button" class="field-action-button" @click.stop="clearField('packageWidth')" aria-label="清空包装宽度">
                          <el-icon><Close /></el-icon>
                        </button>
                        <el-tooltip v-if="fixedFieldMeta.packageWidth.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
                          <template #content>
                            <div class="field-tooltip-content">
                              <p v-for="(line, index) in fixedFieldMeta.packageWidth.tooltip" :key="`width-tip-${index}`">{{ line }}</p>
                            </div>
                          </template>
                          <button type="button" class="field-action-button info" aria-label="查看包装宽度提示">
                            <el-icon><InfoFilled /></el-icon>
                          </button>
                        </el-tooltip>
                      </div>
                    </template>
                  </el-input><label class="floating-label"
                    :class="{ active: formData.packageWidth != null || focused['width'] }">{{ fixedFieldMeta.packageWidth.label }}<span
                      v-if="fixedFieldMeta.packageWidth.required" class="required-asterisk">*</span></label>
                  <p v-if="fieldErrors.packageWidth" class="field-hint error" :title="fieldErrors.packageWidth">{{ fieldErrors.packageWidth }}</p>
                </div>
              </el-col><el-col :span="12">
                <div id="field-packageHeight" class="floating-item" :class="{ 'has-error': !!fieldErrors.packageHeight }">
                  <el-input :model-value="formatNumberInput(formData.packageHeight)" placeholder=" " class="floating-input w-full"
                    inputmode="numeric" @update:model-value="value => formData.packageHeight = parseNumberInput(value, false)"
                    @focus="focused['height'] = true" @blur="focused['height'] = false">
                    <template #suffix>
                      <div class="field-actions">
                        <button v-if="hasFieldValue(formData.packageHeight)" type="button" class="field-action-button" @click.stop="clearField('packageHeight')" aria-label="清空包装高度">
                          <el-icon><Close /></el-icon>
                        </button>
                        <el-tooltip v-if="fixedFieldMeta.packageHeight.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
                          <template #content>
                            <div class="field-tooltip-content">
                              <p v-for="(line, index) in fixedFieldMeta.packageHeight.tooltip" :key="`height-tip-${index}`">{{ line }}</p>
                            </div>
                          </template>
                          <button type="button" class="field-action-button info" aria-label="查看包装高度提示">
                            <el-icon><InfoFilled /></el-icon>
                          </button>
                        </el-tooltip>
                      </div>
                    </template>
                  </el-input><label class="floating-label"
                    :class="{ active: formData.packageHeight != null || focused['height'] }">{{ fixedFieldMeta.packageHeight.label }}<span
                      v-if="fixedFieldMeta.packageHeight.required" class="required-asterisk">*</span></label>
                  <p v-if="fieldErrors.packageHeight" class="field-hint error" :title="fieldErrors.packageHeight">{{ fieldErrors.packageHeight }}</p>
                </div>
              </el-col><el-col :span="12">
                <div id="field-grossWeight" class="floating-item" :class="{ 'has-error': !!fieldErrors.grossWeight }">
                  <el-input :model-value="formatNumberInput(formData.grossWeight)" placeholder=" " class="floating-input w-full"
                    inputmode="numeric" @update:model-value="value => formData.grossWeight = parseNumberInput(value, false)"
                    @focus="focused['weight'] = true" @blur="focused['weight'] = false">
                    <template #suffix>
                      <div class="field-actions">
                        <button v-if="hasFieldValue(formData.grossWeight)" type="button" class="field-action-button" @click.stop="clearField('grossWeight')" aria-label="清空含包装重量">
                          <el-icon><Close /></el-icon>
                        </button>
                        <el-tooltip v-if="fixedFieldMeta.grossWeight.tooltip?.length" placement="right" effect="dark" popper-class="field-tooltip-popper">
                          <template #content>
                            <div class="field-tooltip-content">
                              <p v-for="(line, index) in fixedFieldMeta.grossWeight.tooltip" :key="`weight-tip-${index}`">{{ line }}</p>
                            </div>
                          </template>
                          <button type="button" class="field-action-button info" aria-label="查看含包装重量提示">
                            <el-icon><InfoFilled /></el-icon>
                          </button>
                        </el-tooltip>
                      </div>
                    </template>
                  </el-input><label class="floating-label"
                    :class="{ active: formData.grossWeight != null || focused['weight'] }">{{ fixedFieldMeta.grossWeight.label }}<span
                      v-if="fixedFieldMeta.grossWeight.required" class="required-asterisk">*</span></label>
                  <p v-if="fieldErrors.grossWeight" class="field-hint error" :title="fieldErrors.grossWeight">{{ fieldErrors.grossWeight }}</p>
                </div>
              </el-col></el-row>
          </div>
        </div>
        <!-- 变体特征 -->
        <div id="section-variant-features" v-if="variantAttributes.length > 0 || templateLoadingVisible || showSingleSkuCard">
          <h3 v-if="editableVariantAttributes.length > 0 || templateLoadingVisible" class="text-sm font-semibold text-slate-800 section-title text-left flex items-center">变体特征</h3>
          <div v-if="templateLoadingVisible" class="attribute-loading-panel attribute-loading-skeleton">
            <AppSkeletonLoader variant="drawer" :rows="4" compact />
          </div>
          <div v-else>
            <AttributeField
              v-for="attr in editableVariantAttributes"
              :key="attr.id"
              :attribute="attr"
              v-model="formData.attributes![attr.id]"
              :error="fieldErrors[`attr-${attr.id}`]"
              :field-id="`field-attr-${attr.id}`"
            />
            <div v-if="showSingleSkuCard" id="field-single-sku" class="single-sku-card" :class="{ 'has-error': !!fieldErrors.singleSku || !!fieldErrors.sku || !!fieldErrors.price }">
              <div class="sku-matrix-header">
                <div>
                  <div class="text-sm font-semibold text-slate-800">商品变体</div>
                  <div class="sku-subtitle" :title="singleSkuSubtitle">{{ singleSkuSubtitle }}</div>
                </div>
              </div>
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="floating-item" :class="{ 'has-error': !!fieldErrors.sku }">
                    <el-input v-model="formData.sku" placeholder=" " class="floating-input"
                      @focus="focused['sku'] = true" @blur="focused['sku'] = false" /><label class="floating-label"
                      :class="{ active: formData.sku || focused['sku'] }">货号<span
                        class="required-asterisk">*</span></label>
                    <p class="field-hint" :class="{ error: !!fieldErrors.sku }" :title="fieldErrors.sku || '请输入商品货号或您库存中的编号。货号应在您商品种类中独一无二'">{{ fieldErrors.sku || '请输入商品货号或您库存中的编号。货号应在您商品种类中独一无二' }}</p>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="floating-item">
                    <el-input v-model="formData.barcode" placeholder=" " class="floating-input"
                      @focus="focused['barcode'] = true" @blur="focused['barcode'] = false" /><label class="floating-label"
                      :class="{ active: formData.barcode || focused['barcode'] }">条形码</label>
                    <p class="field-hint" title="可选，填写商品条形码">可选，填写商品条形码</p>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="floating-item" :class="{ 'has-error': !!fieldErrors.price }">
                    <el-input :model-value="formatNumberInput(formData.price)" class="floating-input w-full" inputmode="decimal"
                      @update:model-value="value => formData.price = parseNumberInput(value, true)"
                      @focus="focused['price'] = true" @blur="focused['price'] = false" /><label class="floating-label"
                      :class="{ active: formData.price != null || focused['price'] }">价格<span
                        class="required-asterisk">*</span></label>
                    <p class="field-hint" :class="{ error: !!fieldErrors.price }" :title="fieldErrors.price || '当前货号的销售价格'">{{ fieldErrors.price || '当前货号的销售价格' }}</p>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="floating-item">
                    <el-input :model-value="formatNumberInput(formData.oldPrice)" class="floating-input w-full" inputmode="decimal"
                      @update:model-value="value => formData.oldPrice = parseNumberInput(value, true)"
                      @focus="focused['oldPrice'] = true" @blur="focused['oldPrice'] = false" /><label class="floating-label"
                      :class="{ active: formData.oldPrice != null || focused['oldPrice'] }">折扣前价格</label>
                    <p class="field-hint" title="可选，填写划线价">可选，填写划线价</p>
                  </div>
                </el-col>
              </el-row>
              <p v-if="fieldErrors.singleSku" class="field-hint error" :title="fieldErrors.singleSku">{{ fieldErrors.singleSku }}</p>
            </div>
            <div v-if="showSkuMatrix" class="sku-matrix">
              <div class="sku-matrix-header">
                <div>
                  <div class="text-sm font-semibold text-slate-800">商品变体</div>
                  <div class="sku-subtitle" title="选择颜色、尺寸等取值后自动生成货号行；货号、条形码和价格在这里维护。">选择颜色、尺寸等取值后自动生成货号行；货号、条形码和价格在这里维护。</div>
                </div>
                <div class="sku-actions">
                  <el-button size="small" @click="addSkuRow">新增货号</el-button>
                  <el-button size="small" @click="resetSkuRows">重置货号</el-button>
                </div>
              </div>
              <div class="sku-dimension-grid">
                <div
                  v-for="attr in skuDimensionCandidates"
                  :id="`field-sku-dimension-${attr.id}`"
                  :key="attr.id"
                  class="sku-dimension-item"
                  :class="{ 'has-error': !!fieldErrors[`sku-dimension-${attr.id}`] }"
                >
                  <div class="text-xs text-slate-500 mb-2">{{ attr.name }}<span v-if="attr.is_required" class="required-asterisk">*</span></div>
                  <el-select
                    v-model="skuDimensionValues[attr.id]"
                    multiple
                    filterable
                    collapse-tags
                    collapse-tags-tooltip
                    popper-class="attribute-select-popper"
                    class="w-full"
                    placeholder="选择变体取值"
                    :filter-method="keyword => handleSkuDimensionFilter(attr.id, keyword)"
                    @change="generateSkuRows"
                  >
                    <el-option
                      v-for="value in getSkuDimensionVisibleOptions(attr)"
                      :key="String(value.id ?? value.valueId ?? value.value)"
                      :label="value.value"
                      :value="String(value.id ?? value.valueId ?? value.value)"
                    />
                  </el-select>
                  <p v-if="fieldErrors[`sku-dimension-${attr.id}`]" class="field-hint error" :title="fieldErrors[`sku-dimension-${attr.id}`]">{{ fieldErrors[`sku-dimension-${attr.id}`] }}</p>
                </div>
              </div>
              <div id="field-skus" class="sku-table" :class="{ 'has-error': !!fieldErrors.skus }">
                <table>
                  <thead>
                    <tr>
                      <th v-for="attr in selectedSkuDimensionAttributes" :key="attr.id">{{ attr.name }}</th>
                      <th>货号<span class="required-asterisk">*</span></th>
                      <th>条形码</th>
                      <th>价格<span class="required-asterisk">*</span></th>
                      <th>折扣前价格</th>
                      <th class="sku-action-head">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in skuRows" :key="row.id">
                      <td v-for="attr in selectedSkuDimensionAttributes" :key="attr.id" class="sku-dim-value">
                        {{ getSkuCellValue(row, attr.id) || '-' }}
                      </td>
                      <td><el-input v-model="row.sku" size="small" placeholder="货号" /></td>
                      <td><el-input v-model="row.barcode" size="small" placeholder="条形码" /></td>
                      <td><el-input :model-value="formatNumberInput(row.price)" size="small" inputmode="decimal" @update:model-value="value => row.price = parseNumberInput(value, true)" /></td>
                      <td><el-input :model-value="formatNumberInput(row.oldPrice)" size="small" inputmode="decimal" @update:model-value="value => row.oldPrice = parseNumberInput(value, true)" /></td>
                      <td class="sku-row-action"><el-button link type="danger" size="small" @click="removeSkuRow(row.id)">删除</el-button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="fieldErrors.skus" class="field-hint error" :title="fieldErrors.skus">{{ fieldErrors.skus }}</p>
            </div>
          </div>
        </div>
        <!-- 隐藏特征 -->
        <div v-if="hiddenAttributes.length > 0 || templateLoadingVisible">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800 section-title text-left flex items-center mb-0 pb-0">隐藏特征</h3>
            <el-button v-if="!templateLoadingVisible" link type="primary" size="small" @click="hiddenFeaturesExpanded = !hiddenFeaturesExpanded" class="mb-2">
              {{ hiddenFeaturesExpanded ? '收起' : '展开' }}
              <el-icon class="ml-1">
                <component :is="hiddenFeaturesExpanded ? ArrowUp : ArrowDown" />
              </el-icon>
            </el-button>
          </div>
          <el-collapse-transition>
            <div v-if="templateLoadingVisible || hiddenFeaturesExpanded">
              <div v-if="templateLoadingVisible" class="attribute-loading-panel attribute-loading-skeleton hidden-loading-skeleton">
                <AppSkeletonLoader variant="drawer" :rows="4" compact />
              </div>
              <div v-else>
                <AttributeField
                  v-for="attr in hiddenAttributes"
                  :key="attr.id"
                  :attribute="attr"
                  v-model="formData.hiddenAttributes![attr.id]"
                  :error="fieldErrors[`hidden-${attr.id}`]"
                  :field-id="`field-hidden-${attr.id}`"
                />
              </div>
            </div>
          </el-collapse-transition>
          <div v-if="!hiddenFeaturesExpanded && !templateLoadingVisible" class="text-xs text-slate-400 py-2 pl-4">
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
    <ImageGalleryPicker v-model:modelValue="imagePickerVisible" :max-count="8 - imageUrls.length"
      :existing-image-ids="images" :existing-image-urls="imageUrls" @confirm="handleImagePickerConfirm" />
    <!-- 分类选择弹窗 -->
    <CategorySelectDialog 
      v-model="categoryDialogVisible" 
      :load-tree-data="getCategoryTreeData" 
      @select="handleCategorySelect" 
    />
  </el-drawer>
</template>
<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Box, Plus, Delete, ArrowUp, ArrowDown, Close, InfoFilled } from '@element-plus/icons-vue';
import type { AddProductForm, AddProductSkuRow } from '@/types/selection';
import { getCategoryLeaf } from '@/utils/categoryText';
import { getCurrentDateStr, getPinyinInitials } from '@/utils/common';
import ImageGalleryPicker from '../../material-library/components/ImageGalleryPicker.vue';
import CategorySelectDialog from '@/components/ui/CategorySelectDialog.vue';
import AppImage from '@/components/ui/AppImage.vue';
import AppSkeletonLoader from '@/components/ui/AppSkeletonLoader.vue';
import AttributeField from './AttributeField.vue';
import {
  buildPersistedTemplateSnapshot,
  getProductTemplateDisplay,
  sanitizeTemplateAttributeRecords,
} from './productTemplateDisplay';
import ozonCategoriesRaw from '@/assets/ozonCategories.json';
import {
  getProductSupplyTemplate,
  type ProductSupplyListingCheck,
  type ProductSupplyTemplate,
  type ProductTemplateAttribute,
} from '@/api/productSupplyAPI';
import {
  resolveCategorySelection,
  type OzonTopCategory,
} from '../categorySelection';
// Ozon 类目数据
interface OzonType { type_id: number; type_name: string; disabled: boolean }
interface OzonSubCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonType[] }
type OzonTopCat = OzonTopCategory & { disabled: boolean; children: OzonSubCat[] };
const ozonCategories = (ozonCategoriesRaw as any).result as OzonTopCat[];
// 类目树节点类型
interface TreeNode {
  id: string
  label: string
  typeId?: number
  topCatId: number
  subCatId?: number
  children: TreeNode[]
}
// 构建 el-tree 数据
function buildCategoryTree(cats: OzonTopCat[]): TreeNode[] {
  if (!cats || cats.length === 0) return [];
  return cats.filter(c => !c.disabled).map(top => ({
    id: `top-${top.description_category_id}`,
    label: top.category_name,
    topCatId: top.description_category_id,
    children: top.children.filter(s => !s.disabled).map(sub => ({
      id: sub.description_category_id != null ? `sub-${sub.description_category_id}` : `sub-${Math.random().toString(36).slice(2)}`,
      label: sub.category_name,
      topCatId: top.description_category_id,
      subCatId: sub.description_category_id,
      children: sub.children.filter(t => !t.disabled).map(t => ({
        id: `type-${t.type_id}`,
        label: t.type_name,
        typeId: t.type_id,
        topCatId: top.description_category_id,
        subCatId: sub.description_category_id,
        children: []
      }))
    }))
  }));
}
let cachedCategoryTreeData: TreeNode[] | null = null;
const getCategoryTreeData = () => {
  if (!cachedCategoryTreeData) {
    cachedCategoryTreeData = buildCategoryTree(ozonCategories);
  }
  return cachedCategoryTreeData;
};

const deferToNextPaint = () => new Promise<void>(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

interface Props {
  modelValue: boolean;
  initialData: Partial<AddProductForm>;
  existingAlibabaIds: string[];
}
interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit', data: AddProductForm): void;
}
const props = withDefaults(defineProps<Props>(), {
  existingAlibabaIds: () => [],
  initialData: () => ({})
});
const emit = defineEmits<Emits>();

// 改用 computed 双向绑定（与 SimilarProductsDrawer 一致，避免 watcher 时序问题）
const drawerVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
});

// 抽屉打开时初始化表单
watch(drawerVisible, (newVal) => {
  if (newVal) {
    initFormData();
  }
});

const saving = ref(false);
const addFormRef = ref();
const drawerBodyRef = ref<HTMLElement | null>(null);
// 分类选择事件
const isEditMode = computed(() => {
  const data = props.initialData as any;
  return data?.id !== undefined && data?.id !== null;
});
const imagePickerVisible = ref(false);
const images = ref<number[]>([]); // 存储图片ID
// 分类选择弹窗
const categoryDialogVisible = ref(false);
const categoryText = ref('');
const selectedTypeId = ref(0);
const selectedTopCatId = ref(0);
const selectedSubCatId = ref(0);

// 打开分类选择弹窗
const openCategoryDialog = () => {
  categoryDialogVisible.value = true;
};

// 处理分类选择
const handleCategorySelect = (data: { topCatId: number; subCatId: number; typeId: number; fullPath: string }) => {
  categoryText.value = data.fullPath;
  selectedTopCatId.value = data.topCatId;
  selectedSubCatId.value = data.subCatId;
  selectedTypeId.value = data.typeId;
  formData.value.category = data.fullPath;
  formData.value.categoryLeaf = getCategoryLeaf(data.fullPath);
  formData.value.descriptionCategoryId = data.subCatId;
  formData.value.typeId = data.typeId;
  categoryDialogVisible.value = false;
  void fetchProductTemplateDeferred(data.subCatId, data.typeId);
};

const resetSelectedCategory = () => {
  categoryText.value = '';
  selectedTopCatId.value = 0;
  selectedSubCatId.value = 0;
  selectedTypeId.value = 0;
  formData.value.categoryLeaf = '';
};

const imageUrls = ref<string[]>([]); // 存储图片URL用于显示
const formData = ref<AddProductForm>({
  name: '',
  description: '',
  image: '',
  category: '',
  categoryLeaf: '',
  brand: '无品牌',
  modelName: '',
  offerId: '',
  sku: '',
  packageLength: null,
  packageWidth: null,
  packageHeight: null,
  grossWeight: null,
  alibabaId: '',
  price: null,
  oldPrice: null,
  barcode: '',
  descriptionCategoryId: null,
  typeId: null,
  attributes: {},
  hiddenAttributes: {},
  variantAttributes: []
});
const focused = ref({
  name: false,
  desc: false,
  category: false,
  brand: false,
  model: false,
  alibaba: false,
  offerId: false,
  sku: false,
  barcode: false,
  price: false,
  oldPrice: false,
  length: false,
  width: false,
  height: false,
  weight: false
});
// Ozon 模板和属性
const productTemplate = ref<ProductSupplyTemplate | null>(null);
const categoryAttributes = ref<ProductTemplateAttribute[]>([]);
const loadingAttributes = ref(false);
const templateLoadingVisible = computed(() => loadingAttributes.value);
const fieldErrors = ref<Record<string, string>>({});
const sharedFieldDescription = '所有的变体都会有相同的数值';
const fieldDescriptions = {
  name: '',
  category: sharedFieldDescription,
  brand: sharedFieldDescription,
  modelName: sharedFieldDescription,
};
const fieldTooltips: Record<string, string[]> = {
  name: [
    '请查看名称要求，以便正确填写商品名称并通过审核。您可以不填写此字段。',
    '那么名称将自动从该模板中组合。',
    '公式: 类型 + 品牌 + 型号 + 重要特征（类别）',
  ],
  brand: [
    '所有的变体都会有相同的数值。',
    '请选择商品品牌；无品牌商品可保留“无品牌”。',
  ],
  modelName: [
    '所有的变体都会有相同的数值。',
    '用于区分商品卡片；Ozon 后台为型号名称。',
  ],
  packageLength: [
    '请以毫米为单位测量原包装中的商品的任何一边。如果没有包装，则测量商品。',
    '对不规则形状的商品来说，请测量从一边到另一边的长度。',
    '请把包含几件商品的套装落起来。',
    '在包装中把衣服、纺织品、刺绣套件对折起来。',
  ],
  packageWidth: [
    '请以毫米为单位测量原包装中的商品宽度。',
    '如果商品形状不规则，请填写最大宽度。',
  ],
  packageHeight: [
    '请以毫米为单位测量商品或包装的高度。',
    '若为可压缩商品，请按包装后的高度填写。',
  ],
  grossWeight: [
    '请填写含包装商品重量，单位为克。',
    '如果商品包含配件，请将配件一并计入重量。',
  ],
};
const normalizeNumberField = (value: any) => {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  if (numberValue === 0) return null;
  return Number.isFinite(numberValue) ? numberValue : null;
};

const formatNumberInput = (value: number | null | undefined) => {
  return value === undefined || value === null ? '' : String(value);
};

const parseNumberInput = (value: string | number, allowDecimal = false) => {
  const raw = String(value ?? '');
  const sanitized = allowDecimal
    ? raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
    : raw.replace(/\D/g, '');
  if (!sanitized) return null;
  const numberValue = allowDecimal ? Number(sanitized) : Number.parseInt(sanitized, 10);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeImageUrls = (value: any, fallback?: string) => {
  const urls = Array.isArray(value)
    ? value
        .map((image: any) => {
          if (typeof image === 'string') return image;
          return image?.fileUrl || image?.url || image?.imageUrl || '';
        })
        .filter(Boolean)
    : [];
  if (urls.length > 0) return urls;
  return fallback ? [fallback] : [];
};

const mergeImageUrls = (...groups: Array<string[] | undefined>) => {
  const urls: string[] = [];
  groups.forEach(group => {
    if (!Array.isArray(group)) return;
    group.forEach(url => {
      if (url && !urls.includes(url)) urls.push(url);
    });
  });
  return urls;
};

const normalizeImageIds = (value: any) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((image: any) => typeof image === 'object' && image !== null ? Number(image.id) : null)
    .filter((id: number | null): id is number => Number.isFinite(id));
};

const variantAttributes = computed(() => productTemplate.value?.variantAttributes || categoryAttributes.value || []);
const templateDisplay = computed(() => getProductTemplateDisplay(productTemplate.value, isEditMode.value));
const hiddenAttributes = computed(() => templateDisplay.value.hiddenAttributes);
const skuDimensionCandidates = computed(() => templateDisplay.value.skuDimensionCandidates);
const editableVariantAttributes = computed(() => templateDisplay.value.editableVariantAttributes);
const hiddenFeaturesExpanded = ref(false);
const skuDimensionValues = ref<Record<number, string[]>>({});
const skuDimensionFilterKeywords = ref<Record<number, string>>({});
const skuRows = ref<AddProductSkuRow[]>([]);
const modelNameManuallyEdited = ref(false);
const hasCategorySelected = computed(() => Boolean(
  formData.value.category ||
  formData.value.descriptionCategoryId ||
  selectedSubCatId.value
));
const showSingleSkuCard = computed(() =>
  isEditMode.value ||
  (hasCategorySelected.value && !templateLoadingVisible.value && skuDimensionCandidates.value.length === 0)
);
const showSkuMatrix = computed(() => !isEditMode.value && skuDimensionCandidates.value.length > 0);
const singleSkuSubtitle = computed(() =>
  isEditMode.value
    ? '编辑模式仅修改当前商品记录的货号、条形码和价格信息。'
    : '该类目没有多变体维度，请在这里维护当前商品的货号、条形码和价格信息。'
);
const selectedSkuDimensionAttributes = computed(() =>
  skuDimensionCandidates.value.filter(attr => (skuDimensionValues.value[attr.id] || []).length > 0)
);

interface RequiredFieldItem {
  key: string;
  label: string;
  value: any;
  required: boolean;
}

const baseRequiredFields = computed<RequiredFieldItem[]>(() => [
  { key: 'name', label: fixedFieldMeta.value.name.label, value: formData.value.name, required: fixedFieldMeta.value.name.required },
  { key: 'images', label: '商品图', value: imageUrls.value, required: true },
  { key: 'category', label: fixedFieldMeta.value.category.label, value: formData.value.category, required: fixedFieldMeta.value.category.required },
  { key: 'brand', label: fixedFieldMeta.value.brand.label, value: formData.value.brand, required: fixedFieldMeta.value.brand.required },
  { key: 'modelName', label: fixedFieldMeta.value.modelName.label, value: formData.value.modelName, required: fixedFieldMeta.value.modelName.required },
  { key: 'packageLength', label: fixedFieldMeta.value.packageLength.label, value: formData.value.packageLength, required: fixedFieldMeta.value.packageLength.required },
  { key: 'packageWidth', label: fixedFieldMeta.value.packageWidth.label, value: formData.value.packageWidth, required: fixedFieldMeta.value.packageWidth.required },
  { key: 'packageHeight', label: fixedFieldMeta.value.packageHeight.label, value: formData.value.packageHeight, required: fixedFieldMeta.value.packageHeight.required },
  { key: 'grossWeight', label: fixedFieldMeta.value.grossWeight.label, value: formData.value.grossWeight, required: fixedFieldMeta.value.grossWeight.required },
]);

const templateRequiredFields = computed<RequiredFieldItem[]>(() => [
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

const skuRequiredFields = computed<RequiredFieldItem[]>(() => {
  if (showSingleSkuCard.value) {
    return [
      { key: 'sku', label: '货号', value: formData.value.sku, required: true },
      { key: 'price', label: '价格', value: formData.value.price, required: true },
    ];
  }
  const dimensionFields = skuDimensionCandidates.value
    .filter(attr => attr.is_required)
    .map(attr => ({
      key: `sku-dimension-${attr.id}`,
      label: attr.name,
      value: skuDimensionValues.value[attr.id],
      required: true,
    }));
  return [
    ...dimensionFields,
    { key: 'skus', label: '货号和价格', value: validateSkuRowValues(false), required: true },
  ];
});

const completionFields = computed<RequiredFieldItem[]>(() => [
  ...baseRequiredFields.value,
  ...templateRequiredFields.value.filter(item => item.required),
  ...skuRequiredFields.value,
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

watch(() => formData.value.price, (price) => {
  if (isEditMode.value) return;
  skuRows.value.forEach(row => {
    if (row.price == null || row.price === 0) row.price = price;
  });
});

watch(() => formData.value.oldPrice, (oldPrice) => {
  if (isEditMode.value) return;
  skuRows.value.forEach(row => {
    if (row.oldPrice == null || row.oldPrice === 0) row.oldPrice = oldPrice ?? null;
  });
});

const getAttributeOption = (attr: ProductTemplateAttribute, key: string) => {
  return (attr.values || []).find(value => String(value.id ?? value.valueId ?? value.value) === String(key));
};

const MAX_RENDERED_SKU_OPTIONS = 80;

const handleSkuDimensionFilter = (attrId: number, keyword: string) => {
  skuDimensionFilterKeywords.value = {
    ...skuDimensionFilterKeywords.value,
    [attrId]: keyword || '',
  };
};

const getSkuDimensionVisibleOptions = (attr: ProductTemplateAttribute) => {
  const values = attr.values || [];
  const keyword = (skuDimensionFilterKeywords.value[attr.id] || '').trim().toLowerCase();
  if (!keyword) return values.slice(0, MAX_RENDERED_SKU_OPTIONS);
  return values
    .filter(value => String(value.value || '').toLowerCase().includes(keyword))
    .slice(0, MAX_RENDERED_SKU_OPTIONS);
};

const syncTemplateFieldHints = () => {
};

const sanitizeTemplateValues = () => {
  const sanitized = sanitizeTemplateAttributeRecords(
    formData.value.attributes,
    formData.value.hiddenAttributes,
    templateDisplay.value.baseAttributeIds,
  );
  formData.value.attributes = sanitized.attributes;
  formData.value.hiddenAttributes = sanitized.hiddenAttributes;
};

const buildSlimTemplateSnapshot = () => {
  return buildPersistedTemplateSnapshot(productTemplate.value, isEditMode.value);
};

const getSkuCellValue = (row: AddProductSkuRow, attrId: number) => {
  return row.variantAttributes.find(item => item.attributeId === attrId)?.value || '';
};

const buildVariantSummary = (variantAttributes: AddProductSkuRow['variantAttributes']) => {
  return variantAttributes
    .filter(item => item.name && item.value)
    .map(item => `${item.name}：${item.value}`)
    .join(' / ');
};

const templateAttributes = computed(() => {
  const base = Array.isArray((productTemplate.value as any)?.baseAttributes) ? (productTemplate.value as any).baseAttributes : [];
  const variant = Array.isArray(productTemplate.value?.variantAttributes) ? productTemplate.value!.variantAttributes : [];
  const hidden = Array.isArray(productTemplate.value?.hiddenAttributes) ? productTemplate.value!.hiddenAttributes : [];
  const common = Array.isArray(productTemplate.value?.commonVariantAttributes) ? productTemplate.value!.commonVariantAttributes || [] : [];
  return [...base, ...variant, ...common, ...hidden];
});

const normalizeTemplateName = (value: string) => String(value || '').trim().toLowerCase();

const findTemplateAttribute = (names: string[]) => {
  const normalizedNames = names.map(normalizeTemplateName);
  return templateAttributes.value.find(attr => {
    const name = normalizeTemplateName(attr.name);
    return normalizedNames.some(candidate => name === candidate || name.startsWith(candidate));
  });
};

const brandAttribute = computed(() => findTemplateAttribute(['бренд', 'brand', '品牌']));
const brandOptions = computed(() => {
  return [{ id: 0, valueId: 0, value: '无品牌' }];
});

const splitDescriptionLines = (value: any) => {
  return String(value || '')
    .split(/\r?\n+/)
    .map(line => line.trim())
    .filter(Boolean);
};

const mergeTooltip = (baseLines: string[], attr: any, prependLines: string[] = []) => {
  const lines = [...prependLines];
  for (const line of splitDescriptionLines(attr?.description)) {
    if (!lines.includes(line)) lines.push(line);
  }
  return lines.length > 0 ? lines : baseLines;
};

const pickDescription = (attr: any, fallback: string) => {
  return splitDescriptionLines(attr?.description)[0] || fallback;
};

const fixedFieldMeta = computed(() => {
  const brandAttr = brandAttribute.value;
  const modelAttr = findTemplateAttribute(['название модели', 'модель', 'model name', '型号名称', '型号']);
  return {
    name: {
      label: '商品名称',
      description: fieldDescriptions.name,
      tooltip: fieldTooltips.name,
      required: true,
    },
    category: {
      label: '类目和类型',
      description: fieldDescriptions.category,
      required: true,
    },
    brand: {
      label: brandAttr?.name || '品牌',
      description: pickDescription(brandAttr, fieldDescriptions.brand),
      tooltip: mergeTooltip(fieldTooltips.brand, brandAttr, ['所有的变体都会有相同的数值。']),
      required: true,
    },
    modelName: {
      label: modelAttr?.name || '型号名称',
      description: pickDescription(modelAttr, fieldDescriptions.modelName),
      tooltip: mergeTooltip(fieldTooltips.modelName, modelAttr, ['所有的变体都会有相同的数值。']),
      required: true,
    },
    packageLength: {
      label: '包装长度，毫米',
      tooltip: fieldTooltips.packageLength,
      required: true,
    },
    packageWidth: {
      label: '包装宽度，毫米',
      tooltip: fieldTooltips.packageWidth,
      required: true,
    },
    packageHeight: {
      label: '包装高度，毫米',
      tooltip: fieldTooltips.packageHeight,
      required: true,
    },
    grossWeight: {
      label: '含包装重量，克',
      tooltip: fieldTooltips.grossWeight,
      required: true,
    },
  };
});

const buildManualOfferId = (index: number) => {
  const datePart = getCurrentDateStr().slice(2);
  const seedSource = formData.value.modelName || getPinyinInitials(formData.value.name) || 'SP';
  const seed = seedSource
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
    .padEnd(5, 'X');
  const sequence = String(index + 1).padStart(2, '0');
  return `OZ-MAN-${datePart}-${seed}-${sequence}`;
};

const buildManualSku = (index: number) => {
  const datePart = getCurrentDateStr().slice(2);
  const seedSource = formData.value.modelName || getPinyinInitials(formData.value.name) || 'SP';
  const seed = seedSource
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
    .padEnd(5, 'X');
  const sequence = String(index + 1).padStart(2, '0');
  return `SKU-MAN-${datePart}-${seed}-${sequence}`;
};

const isAutoManualOfferId = (value: string | null | undefined) => {
  return /^OZ-MAN-\d{6}-[A-Z0-9]{5,8}-\d{2}$/.test(String(value || '').trim());
};

const isAutoManualSku = (value: string | null | undefined) => {
  return /^SKU-MAN-\d{6}-[A-Z0-9]{5,8}-\d{2}$/.test(String(value || '').trim());
};

const ensureSkuRowIdentifiers = (rows: AddProductSkuRow[]) => {
  const usedOfferIds = new Set<string>();
  const usedSkus = new Set<string>();
  return rows.map((row, index) => {
    let nextOfferId = row.offerId?.trim();
    let nextSku = row.sku?.trim();
    if (!nextOfferId || usedOfferIds.has(nextOfferId)) {
      let attempt = index;
      do {
        nextOfferId = buildManualOfferId(attempt);
        attempt += 1;
      } while (usedOfferIds.has(nextOfferId));
    }
    if (!nextSku || usedSkus.has(nextSku) || nextSku === nextOfferId) {
      let attempt = index;
      do {
        nextSku = buildManualSku(attempt);
        attempt += 1;
      } while (usedSkus.has(nextSku) || nextSku === nextOfferId);
    }
    usedOfferIds.add(nextOfferId);
    usedSkus.add(nextSku);
    return {
      ...row,
      offerId: nextOfferId,
      sku: nextSku,
    };
  });
};

const refreshAutoSkuOfferIds = () => {
  if (isEditMode.value || skuRows.value.length === 0) return;
  skuRows.value = ensureSkuRowIdentifiers(skuRows.value.map(row => ({
    ...row,
    offerId: !row.offerId || isAutoManualOfferId(row.offerId) ? '' : row.offerId,
    sku: !row.sku || isAutoManualSku(row.sku) ? '' : row.sku,
  })));
};

const buildSkuRowsFromSelectedValues = () => {
  const dimensions = selectedSkuDimensionAttributes.value;
  if (dimensions.length === 0) {
    return ensureSkuRowIdentifiers([{
      id: 'sku-default',
      offerId: formData.value.offerId || formData.value.modelName || '',
      sku: formData.value.sku || '',
      barcode: formData.value.barcode || '',
      price: formData.value.price,
      oldPrice: formData.value.oldPrice ?? null,
      variantValues: {},
      variantAttributes: []
    }]);
  }

  const combinations: Array<Array<{ attr: ProductTemplateAttribute; key: string }>> = [[]];
  for (const attr of dimensions) {
    const selectedValues = skuDimensionValues.value[attr.id] || [];
    const current = combinations.splice(0, combinations.length);
    for (const combo of current) {
      for (const key of selectedValues) {
        combinations.push([...combo, { attr, key }]);
      }
    }
  }

  return ensureSkuRowIdentifiers(combinations.map((combo, index) => {
    const variantAttributes = combo.map(({ attr, key }) => {
      const option = getAttributeOption(attr, key);
      return {
        attributeId: attr.id,
        name: attr.name,
        value: option?.value || key,
        valueId: option?.id ?? option?.valueId,
      };
    });
    const variantValues = variantAttributes.reduce<Record<number, any>>((acc, item) => {
      acc[item.attributeId] = { value: item.value, valueId: item.valueId };
      return acc;
    }, {});
    const previous = skuRows.value[index];
    return {
      id: variantAttributes.map(item => `${item.attributeId}-${item.valueId ?? item.value}`).join('|') || `sku-${index}`,
      offerId: previous?.offerId || '',
      sku: previous?.sku || '',
      barcode: previous?.barcode || '',
      price: previous?.price ?? formData.value.price,
      oldPrice: previous?.oldPrice ?? formData.value.oldPrice ?? null,
      variantValues,
      variantAttributes
    };
  }));
};

const generateSkuRows = () => {
  skuRows.value = buildSkuRowsFromSelectedValues();
};

const createEmptySkuRow = (index: number): AddProductSkuRow => ({
  id: `sku-manual-${Date.now()}-${index}`,
  offerId: buildManualOfferId(index),
  sku: buildManualSku(index),
  barcode: '',
  price: formData.value.price,
  oldPrice: formData.value.oldPrice ?? null,
  variantValues: {},
  variantAttributes: []
});

const addSkuRow = () => {
  const baseRows = skuRows.value.length > 0 ? skuRows.value : buildSkuRowsFromSelectedValues();
  const templateRow = baseRows[baseRows.length - 1];
  skuRows.value = [
    ...baseRows,
    templateRow
      ? {
          ...templateRow,
          id: `${templateRow.id}|manual-${Date.now()}`,
          offerId: buildManualOfferId(baseRows.length),
          sku: buildManualSku(baseRows.length),
          barcode: '',
          price: formData.value.price ?? templateRow.price,
          oldPrice: formData.value.oldPrice ?? templateRow.oldPrice ?? null,
          variantValues: { ...templateRow.variantValues },
          variantAttributes: [...templateRow.variantAttributes],
        }
      : createEmptySkuRow(0)
  ];
  skuRows.value = ensureSkuRowIdentifiers(skuRows.value);
};

const removeSkuRow = (rowId: string) => {
  if (skuRows.value.length <= 1) {
    fieldErrors.value.skus = '至少保留一条货号记录';
    return;
  }
  skuRows.value = skuRows.value.filter(row => row.id !== rowId);
};

const resetSkuRows = () => {
  skuDimensionValues.value = {};
  skuDimensionFilterKeywords.value = {};
  skuRows.value = buildSkuRowsFromSelectedValues();
};

const clearTemplateStateForLoading = () => {
  productTemplate.value = null;
  categoryAttributes.value = [];
  skuDimensionValues.value = {};
  skuDimensionFilterKeywords.value = {};
  skuRows.value = [];
  fieldErrors.value = {};
};

const applyProductTemplateResponse = (template: ProductSupplyTemplate | null) => {
  if (!template) {
    categoryAttributes.value = [];
    productTemplate.value = null;
    return;
  }
  productTemplate.value = template;
  categoryAttributes.value = template.variantAttributes || [];
  formData.value.templateSnapshot = template;
  formData.value.descriptionCategoryId = template.descriptionCategoryId;
  formData.value.typeId = template.typeId;
  syncTemplateFieldHints();
  sanitizeTemplateValues();
  hiddenFeaturesExpanded.value = false;
  if (!isEditMode.value) resetSkuRows();
};

// 获取商品类型模板（后端负责真实 Ozon 数据和本地缓存）
const fetchProductTemplate = async (categoryId: number, typeId: number, options: { preserveLoadingState?: boolean; minLoadingMs?: number; cacheOnly?: boolean; keepExistingOnEmpty?: boolean } = {}) => {
  if (!categoryId) return categoryAttributes.value;
  const loadingStartedAt = performance.now();
  if (!options.preserveLoadingState) {
    loadingAttributes.value = true;
    clearTemplateStateForLoading();
    await nextTick();
  }
  try {
    const response = await getProductSupplyTemplate({
      descriptionCategoryId: categoryId,
      typeId,
      language: 'ZH_HANS',
      cacheOnly: options.cacheOnly,
    });
    if (response.success && response.data) {
      await deferToNextPaint();
      applyProductTemplateResponse(response.data);
    } else {
      if (options.keepExistingOnEmpty) return categoryAttributes.value;
      ElMessage.warning(response.message || '获取商品模板失败');
      applyProductTemplateResponse(null);
    }
  } catch (error: any) {
    if (options.keepExistingOnEmpty) return categoryAttributes.value;
    ElMessage.error(error.message || '获取商品模板失败');
    applyProductTemplateResponse(null);
  } finally {
    const minLoadingMs = options.minLoadingMs || 0;
    const elapsed = performance.now() - loadingStartedAt;
    if (minLoadingMs > elapsed) {
      await delay(minLoadingMs - elapsed);
    }
    loadingAttributes.value = false;
  }
  return categoryAttributes.value;
};

const fetchProductTemplateDeferred = async (categoryId: number, typeId: number) => {
  loadingAttributes.value = true;
  clearTemplateStateForLoading();
  await deferToNextPaint();
  await scrollToTemplateLoadingSection();
  return fetchProductTemplate(categoryId, typeId, { preserveLoadingState: true, minLoadingMs: 220 });
};

const scrollToTemplateLoadingSection = async () => {
  await nextTick();
  await deferToNextPaint();
  const container = drawerBodyRef.value;
  const target = document.getElementById('section-variant-features');
  if (!container || !target) return;
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const nextTop = container.scrollTop + targetRect.top - containerRect.top - 12;
  container.scrollTo({ top: Math.max(0, nextTop), behavior: 'auto' });
  await deferToNextPaint();
};
const initFormData = () => {
  if (isEditMode.value) {
    // 编辑模式
    const initialData = props.initialData as any;
    const categorySelection = resolveCategorySelection(
      ozonCategories,
      Number(initialData.descriptionCategoryId || 0),
      Number(initialData.typeId || 0),
      initialData.category || '',
    );
    selectedTopCatId.value = categorySelection.topCatId;
    selectedSubCatId.value = categorySelection.subCatId;
    selectedTypeId.value = categorySelection.typeId;
    const initialCategory = categorySelection.fullPath;
    categoryText.value = initialCategory;
    const initialOfferId = initialData.offerId || (String(initialData.alibabaId || '').startsWith('OZ-') ? initialData.alibabaId : '');
    const resolvedDescriptionCategoryId = categorySelection.subCatId || Number(initialData.descriptionCategoryId || 0) || null;
    const resolvedTypeId = categorySelection.typeId || Number(initialData.typeId || 0) || null;
    modelNameManuallyEdited.value = true;
    formData.value = {
      name: initialData.name || '',
      description: initialData.description || '',
      image: initialData.imageUrl || '', // ProductSupply uses imageUrl
      category: initialCategory,
      categoryLeaf: initialData.categoryLeaf || getCategoryLeaf(initialCategory),
      brand: initialData.brand || '无品牌',
      modelName: initialData.modelName || initialOfferId,
      offerId: initialOfferId,
      sku: initialData.sku || (!String(initialData.alibabaId || '').startsWith('OZ-') ? initialData.alibabaId : ''),
      packageLength: normalizeNumberField(initialData.packageLength),
      packageWidth: normalizeNumberField(initialData.packageWidth),
      packageHeight: normalizeNumberField(initialData.packageHeight),
      grossWeight: normalizeNumberField(initialData.grossWeight),
      alibabaId: initialData.alibabaId || '',
      barcode: initialData.barcode || '',
      price: initialData.price || null,
      oldPrice: initialData.oldPrice || null,
      descriptionCategoryId: resolvedDescriptionCategoryId,
      typeId: resolvedTypeId,
      attributes: initialData.attributes || {},
      hiddenAttributes: initialData.hiddenAttributes || {},
      variantAttributes: initialData.variantAttributes || [],
      templateSnapshot: initialData.templateSnapshot || null,
      variantSummary: initialData.variantSummary || ''
    };
    images.value = normalizeImageIds(initialData.images);
    const productImageUrls = normalizeImageUrls(initialData.images, initialData.imageUrl);
    const sourceImageUrls = normalizeImageUrls(initialData.supplySource?.images, initialData.supplySource?.image);
    imageUrls.value = mergeImageUrls(productImageUrls, sourceImageUrls).slice(0, 8);
    formData.value.image = imageUrls.value[0] || initialData.imageUrl || '';
    if (initialData.templateSnapshot) {
      productTemplate.value = initialData.templateSnapshot;
      categoryAttributes.value = initialData.templateSnapshot.variantAttributes || [];
      syncTemplateFieldHints();
      sanitizeTemplateValues();
      hiddenFeaturesExpanded.value = false;
    }
    if (resolvedDescriptionCategoryId) {
      fetchProductTemplate(resolvedDescriptionCategoryId, resolvedTypeId || 0, {
        cacheOnly: true,
        keepExistingOnEmpty: true,
      });
    }
    skuRows.value = [];
  } else {
    // 新增模式：清空所有字段，品牌保留默认值，货号留空由用户后续编辑填写
    hiddenFeaturesExpanded.value = false;
    resetSelectedCategory();
    modelNameManuallyEdited.value = false;
    formData.value = {
      name: '',
      description: '',
      image: '',
      category: '',
      categoryLeaf: '',
      brand: '无品牌',
      modelName: '',
      offerId: '',
      sku: '',
      packageLength: null,
      packageWidth: null,
      packageHeight: null,
      attributes: {},
      hiddenAttributes: {},
      variantAttributes: [],
      grossWeight: null,
      alibabaId: '', // 货号留空，后续编辑填写
      barcode: '',
      price: null,
      oldPrice: null,
      descriptionCategoryId: null,
      typeId: null
    };
    productTemplate.value = null;
    categoryAttributes.value = [];
    fieldErrors.value = {};
    resetSkuRows();
    images.value = [];
    imageUrls.value = [];
  }
  // 不调用 resetFields，直接使用设置的值
};
// 生成型号
const generateModelNumber = () => {
  if (modelNameManuallyEdited.value) return;
  if (!formData.value.name) {
    formData.value.modelName = '';
    refreshAutoSkuOfferIds();
    return;
  }
  const initials = getPinyinInitials(formData.value.name);
  const dateStr = getCurrentDateStr();
  formData.value.modelName = `${initials}_${dateStr}`;
  refreshAutoSkuOfferIds();
};

const handleModelNameInput = () => {
  modelNameManuallyEdited.value = true;
  if (hasValue(formData.value.modelName)) {
    delete fieldErrors.value.modelName;
  }
  refreshAutoSkuOfferIds();
};

const hasValue = (value: any) => {
  if (value === false || value === 0) return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) {
    return !!value.value || !!value.valueId || !!value.id;
  }
  return value !== undefined && value !== null && value !== '';
};

const hasFieldValue = (value: any) => hasValue(value);

const clearField = (key: keyof AddProductForm) => {
  const emptyValue = ['price', 'oldPrice', 'packageLength', 'packageWidth', 'packageHeight', 'grossWeight'].includes(String(key))
    ? null
    : '';
  (formData.value as any)[key] = emptyValue;
  delete fieldErrors.value[key as string];
  if (key === 'modelName') {
    modelNameManuallyEdited.value = true;
  }
};

const handleBrandChange = () => {
  if (!hasValue(formData.value.brand)) {
    formData.value.brand = '无品牌';
  }
  if (hasValue(formData.value.brand)) {
    delete fieldErrors.value.brand;
  }
};

const setFieldError = (key: string, message: string) => {
  fieldErrors.value[key] = message;
};

const getFieldElementId = (key: string) => {
  if (key.startsWith('attr-')) return `field-attr-${key.replace('attr-', '')}`;
  if (key.startsWith('hidden-')) return `field-hidden-${key.replace('hidden-', '')}`;
  if (key.startsWith('sku-dimension-')) return `field-${key}`;
  if (key === 'alibabaId' || key === 'barcode' || key === 'price' || key === 'sku') return 'field-single-sku';
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

const listingCheckFieldMap: Record<string, string> = {
  images: 'images',
  mainImage: 'images',
  mainImageUrl: 'images',
  name: 'name',
  brand: 'brand',
  modelName: 'modelName',
  description: 'name',
  descriptionCategoryId: 'category',
  typeId: 'category',
  packageLength: 'packageLength',
  packageWidth: 'packageWidth',
  packageHeight: 'packageHeight',
  grossWeight: 'grossWeight',
  templateSnapshot: 'category',
  requiredAttributes: 'category',
  optionalAttributes: 'category',
  offerId: 'modelName',
  offerIdDuplicate: 'modelName',
  sku: 'sku',
  skuDuplicate: 'sku',
  skuRows: 'skus',
  skuPrice: 'price',
  barcode: 'barcode',
};

const getExistingFieldKey = (candidates: string[]) => {
  for (const key of candidates) {
    if (document.getElementById(getFieldElementId(key))) return key;
  }
  return candidates[0] || 'name';
};

const resolveListingCheckFieldKey = (check: ProductSupplyListingCheck) => {
  const requiredAttributeMatch = check.key.match(/^requiredAttribute-(\d+)$/);
  if (requiredAttributeMatch) {
    const attrId = requiredAttributeMatch[1];
    if (brandAttribute.value && String(brandAttribute.value.id) === attrId) {
      return 'brand';
    }
    return getExistingFieldKey([`attr-${attrId}`, `hidden-${attrId}`, 'category']);
  }
  return listingCheckFieldMap[check.key] || 'name';
};

const focusListingCheck = async (check: ProductSupplyListingCheck) => {
  await nextTick();
  const fieldKey = resolveListingCheckFieldKey(check);
  const message = check.message || `请完善${check.label || '当前项'}`;
  fieldErrors.value = {
    ...fieldErrors.value,
    [fieldKey]: message,
  };
  if (fieldKey.startsWith('hidden-')) {
    hiddenFeaturesExpanded.value = true;
  }
  await nextTick();
  scrollToField(fieldKey);
  window.setTimeout(() => {
    const element = document.getElementById(getFieldElementId(fieldKey));
    if (!element) return;
    const input = element.querySelector('input, textarea, .el-input__inner') as HTMLElement | null;
    input?.focus?.();
  }, 220);
};

defineExpose({
  focusListingCheck,
});

const scrollToMissingField = () => {
  const missing = completionStats.value.missingRequired[0];
  if (missing) scrollToField(missing.key);
};

const validateBaseFields = () => {
  let valid = true;
  for (const item of baseRequiredFields.value) {
    const invalidNumber = typeof item.value === 'number' && item.value <= 0;
    if (!hasValue(item.value) || invalidNumber) {
      setFieldError(item.key, invalidNumber ? `${item.label}必须大于 0` : `请填写${item.label}`);
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

const validateSkuRows = (showMessage = true) => {
  if (showSingleSkuCard.value) {
    let valid = true;
    if (!hasValue(formData.value.sku)) {
      if (showMessage) setFieldError('sku', '请填写货号');
      valid = false;
    }
    if (!hasValue(formData.value.price) || Number(formData.value.price) <= 0) {
      if (showMessage) setFieldError('price', '请填写有效价格');
      valid = false;
    }
    return valid;
  }
  skuRows.value = ensureSkuRowIdentifiers(skuRows.value);
  for (const attr of skuDimensionCandidates.value) {
    if (attr.is_required && !hasValue(skuDimensionValues.value[attr.id])) {
      if (showMessage) setFieldError(`sku-dimension-${attr.id}`, `请选择${attr.name}`);
      return false;
    }
  }
  return validateSkuRowValues(showMessage);
};

const validateSkuRowValues = (showMessage = true) => {
  if (showSingleSkuCard.value) return true;
  if (skuRows.value.length === 0) {
    if (showMessage) setFieldError('skus', '请至少生成一条货号记录');
    return false;
  }
  const seenOfferIds = new Set<string>();
  const seenSkus = new Set<string>();
  for (const row of skuRows.value) {
    if (!row.sku || row.sku.trim() === '') {
      if (showMessage) setFieldError('skus', '请填写每条记录的货号');
      return false;
    }
    if (seenOfferIds.has(row.offerId.trim())) {
      if (showMessage) setFieldError('skus', `型号名称编码重复：${row.offerId}`);
      return false;
    }
    seenOfferIds.add(row.offerId.trim());
    if (seenSkus.has(row.sku.trim())) {
      if (showMessage) setFieldError('skus', `货号重复：${row.sku}`);
      return false;
    }
    seenSkus.add(row.sku.trim());
    if (row.price == null || row.price <= 0) {
      if (showMessage) setFieldError('skus', `请填写货号 ${row.sku || ''} 的有效价格`);
      return false;
    }
  }
  return true;
};

const buildSingleSkuRowsForSubmit = () => ensureSkuRowIdentifiers([{
  id: 'sku-single',
  offerId: formData.value.offerId || formData.value.modelName || '',
  sku: formData.value.sku || '',
  barcode: formData.value.barcode || '',
  price: formData.value.price,
  oldPrice: formData.value.oldPrice ?? null,
  variantValues: {},
  variantAttributes: formData.value.variantAttributes || [],
}]);

// 表单提交处理
const handleSubmit = async () => {
  if (!addFormRef.value) return;
  fieldErrors.value = {};
  const valid = [
    validateBaseFields(),
    validateTemplateAttributes(),
    validateSkuRows(),
  ].every(Boolean);
  if (!valid) {
    const firstKey = Object.keys(fieldErrors.value)[0];
    ElMessage.warning(fieldErrors.value[firstKey] || '请完善必填项');
    if (firstKey) scrollToField(firstKey);
    return;
  }
  // 验证通过，保存数据
  await saveAddProduct();
};
// 保存添加的商品
const saveAddProduct = async () => {
  saving.value = true;
  try {
    const submitSkuRows = showSingleSkuCard.value
      ? buildSingleSkuRowsForSubmit()
      : skuRows.value;
    if (!isEditMode.value && !showSingleSkuCard.value) {
      skuRows.value = ensureSkuRowIdentifiers(skuRows.value);
    }
    const commonBase = {
      name: formData.value.name,
      category: formData.value.category || '',
      categoryLeaf: formData.value.categoryLeaf || getCategoryLeaf(formData.value.category),
      brand: formData.value.brand || '',
      modelName: formData.value.modelName || '',
      description: formData.value.description || '',
      imageUrl: formData.value.image || imageUrls.value[0] || '',
      images: imageUrls.value,
      price: formData.value.price || submitSkuRows[0]?.price || 0,
      oldPrice: formData.value.oldPrice || null,
      packageLength: formData.value.packageLength ?? null,
      packageWidth: formData.value.packageWidth ?? null,
      packageHeight: formData.value.packageHeight ?? null,
      grossWeight: formData.value.grossWeight ?? null,
      descriptionCategoryId: formData.value.descriptionCategoryId || selectedSubCatId.value || null,
      typeId: formData.value.typeId || selectedTypeId.value || null,
      attributes: formData.value.attributes || {},
      hiddenAttributes: formData.value.hiddenAttributes || {}
    };
    const submitData = isEditMode.value
      ? {
          ...formData.value,
          images: imageUrls.value,
          imageUrl: commonBase.imageUrl,
          packageLength: commonBase.packageLength,
          packageWidth: commonBase.packageWidth,
          packageHeight: commonBase.packageHeight,
          grossWeight: commonBase.grossWeight,
          offerId: formData.value.offerId || formData.value.modelName || '',
          price: formData.value.price || 0,
          oldPrice: formData.value.oldPrice || null,
          variantSummary: formData.value.variantSummary || buildVariantSummary(formData.value.variantAttributes || []),
        }
      : {
          base: commonBase,
          skus: submitSkuRows.map(row => ({
            offerId: row.offerId.trim(),
            sku: row.sku.trim(),
            barcode: row.barcode || '',
            price: row.price || 0,
            oldPrice: row.oldPrice || null,
            variantAttributes: row.variantAttributes,
            attributes: row.variantValues,
          })),
          templateSnapshot: buildSlimTemplateSnapshot(),
        };
    emit('submit', submitData);
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
  // 抽屉关闭后的清理工作
  hiddenFeaturesExpanded.value = false;
  formData.value = {
    name: '',
    description: '',
    image: '',
    category: '',
    categoryLeaf: '',
    brand: '无品牌',
    modelName: '',
    offerId: '',
    sku: '',
    packageLength: null,
    packageWidth: null,
      packageHeight: null,
      grossWeight: null,
      alibabaId: '',
      barcode: '',
      price: null,
      oldPrice: null,
      descriptionCategoryId: null,
      typeId: null,
      attributes: {},
      hiddenAttributes: {},
      variantAttributes: []
    };
  images.value = [];
  imageUrls.value = [];
  resetSelectedCategory();
  modelNameManuallyEdited.value = false;
  productTemplate.value = null;
  categoryAttributes.value = [];
  skuDimensionValues.value = {};
  skuRows.value = [];
  fieldErrors.value = {};
  focused.value = {
    name: false,
    desc: false,
    category: false,
    brand: false,
    model: false,
    alibaba: false,
    barcode: false,
    price: false,
    oldPrice: false,
    length: false,
    width: false,
    height: false,
    weight: false
  };
};
const openImagePicker = () => {
  imagePickerVisible.value = true;
};
const handleImagePickerConfirm = (selectedImageIds: number[], newImages: any[], selectedImageData: any[]) => {
  // 添加新选择的图片
  const existingImageIds = images.value;
  const newImageIds = selectedImageIds
    .filter(id => Number.isFinite(Number(id)))
    .filter(id => !existingImageIds.includes(Number(id)))
    .map(id => Number(id));
  
  // 只获取新增的本地图库图片URL（去重）
  const existingImageUrlSet = new Set(imageUrls.value);
  const newSelectedImageUrls = selectedImageData
    .map(img => img.fileUrl)
    .filter(url => url && !existingImageUrlSet.has(url));
  
  // 获取新上传的图片URL
  const newImageUrls = newImages.map(img => img.fileUrl);
  
  // 合并所有新图片URL
  const allNewUrls = [...newSelectedImageUrls, ...newImageUrls];
  
  // 合并新选择的图片ID和URL
  images.value = [...images.value, ...newImageIds];
  imageUrls.value = [...imageUrls.value, ...allNewUrls];
  
  // 如果是第一张图片，设置为主图
  if (imageUrls.value.length > 0 && !formData.value.image) {
    formData.value.image = imageUrls.value[0];
  } else if (images.value.length === 1) {
    formData.value.image = imageUrls.value[0];
  }
};
const removeImage = (index: number) => {
  images.value.splice(index, 1);
  imageUrls.value.splice(index, 1);
  if (index === 0 && imageUrls.value.length > 0) {
    formData.value.image = imageUrls.value[0];
  } else if (imageUrls.value.length === 0) {
    formData.value.image = '';
  }
};
</script>
<style scoped>
/* 表单样式 */
.add-product-form {
  width: 100%;
}

.add-product-body {
  height: calc(100vh - 84px);
  overflow-y: auto;
}

.required-asterisk {
  color: #f56c6c;
  position: relative;
  top: -6px;
  font-size: 11px;
  margin-left: 2px;
}

.image-field .required-asterisk,
.sku-dimension-item .required-asterisk {
  top: -1px;
}

.drawer-action-button {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 8px;
}

.add-product-form :deep(.el-switch) {
  --el-switch-on-color: #2563eb;
}

/* 小标题样*/
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

/* 浮动标签输入框样*/
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

.floating-item :deep(.el-select__placeholder),
.floating-item :deep(.el-select__selected-item),
.floating-item :deep(.el-select__input) {
  line-height: 46px;
}

.floating-item.has-error :deep(.el-input__wrapper),
.floating-item.has-error :deep(.el-select__wrapper),
.floating-item.has-error :deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px #ef4444 inset;
}

.floating-item :deep(.el-textarea__inner) {
  height: 96px;
  font-size: 13px;
  padding-top: 18px;
  border-radius: 8px;
}

/* 尺寸和重量区域的输入框宽度统一 */
.floating-item :deep(.el-input__wrapper),
.floating-item :deep(.el-select__wrapper),
.floating-item :deep(.el-cascader__wrapper) {
  width: 100% !important;
}

/* 确保级联选择器宽度与其他文本框一*/
.floating-item :deep(.el-cascader) {
  width: 100% !important;
}

/* 确保尺寸和重量区域的行间距一*/
.el-row {
  margin-bottom: 0;
}

.el-row .el-col .floating-item {
  margin-bottom: 30px;
}

/* 字段提示文本 */
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


.attribute-loading-panel {
  min-height: 92px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  margin-bottom: 18px;
}

.attribute-loading-skeleton {
  padding: 14px;
}

.hidden-loading-skeleton {
  background: #fff;
}

/* textarea 的浮动标签初始位置对齐文本基线（而非几何中心） */
.floating-item.textarea-field .floating-label {
  top: 25px;
  transform: none;
}

.sku-matrix,
.single-sku-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 22px;
  background: #f8fafc;
}

.single-sku-card.has-error {
  border-color: #ef4444;
}

.sku-matrix-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.sku-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sku-dimension-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.sku-dimension-item {
  min-width: 0;
}

.sku-table {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.sku-table table {
  width: 100%;
  min-width: 800px;
  border-collapse: collapse;
  table-layout: fixed;
}

.sku-table th,
.sku-table td {
  height: 48px;
  padding: 7px 8px;
  border-right: 1px solid #eef2f7;
  border-bottom: 1px solid #eef2f7;
  vertical-align: middle;
}

.sku-table th:last-child,
.sku-table td:last-child {
  border-right: 0;
}

.sku-table tbody tr:last-child td {
  border-bottom: 0;
}

.sku-table th {
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
}

.sku-dim-value {
  color: #334155;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sku-row-action,
.sku-action-head {
  width: 64px;
  text-align: center !important;
}

.sku-table :deep(.el-input__wrapper) {
  height: 32px;
  box-shadow: 0 0 0 1px #dbe3ef inset;
}

.sku-table :deep(.el-input__inner) {
  height: 32px;
  line-height: 32px;
}

.sku-table.has-error {
  border-color: #ef4444;
}

.sku-subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
  max-width: 620px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  z-index: 2;
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
