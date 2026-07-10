<template>
  <div
    :id="fieldId"
    class="floating-item"
    :class="{
      'has-error': !!error,
      'textarea-floating-item': attribute.type === 'textarea',
      'checkbox-floating-item': attribute.type === 'boolean',
    }"
  >
    <!-- 字符串输入 -->
    <el-input
      v-if="attribute.type === 'string'"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      placeholder=" "
      class="floating-input"
      @focus="isFocused = true"
      @blur="isFocused = false"
    />

    <!-- 下拉选择 -->
    <el-select
      v-else-if="attribute.type === 'select'"
      :model-value="selectModelValue"
      @update:model-value="handleSelectChange"
      placeholder=" "
      filterable
      :multiple="attribute.is_collection"
      :collapse-tags="attribute.is_collection"
      :collapse-tags-tooltip="attribute.is_collection"
      popper-class="attribute-select-popper"
      class="w-full"
      :filter-method="handleSelectFilter"
      @visible-change="isFocused = $event"
    >
      <el-option
        v-for="(value, valueIndex) in renderedSelectOptions"
        :key="valueIndex"
        :label="value.value"
        :value="String(value.id ?? value.valueId ?? value.value)"
      />
    </el-select>

    <!-- 数字输入 -->
    <el-input
      v-else-if="attribute.type === 'number'"
      :model-value="numberModelValue"
      @update:model-value="handleNumberInput"
      placeholder=" "
      class="floating-input w-full"
      inputmode="decimal"
      @focus="isFocused = true"
      @blur="isFocused = false"
    />

    <!-- 复选框 -->
    <el-checkbox
      v-else-if="attribute.type === 'boolean'"
      :model-value="booleanModelValue"
      @update:model-value="handleBooleanChange"
      class="floating-checkbox"
    />

    <!-- 多行文本 -->
    <el-input
      v-else-if="attribute.type === 'textarea'"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      type="textarea"
      :rows="3"
      placeholder=" "
      class="floating-input textarea-field"
      @focus="isFocused = true"
      @blur="isFocused = false"
    />

    <!-- 兜底 -->
    <el-input
      v-else
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      placeholder=" "
      class="floating-input"
      @focus="isFocused = true"
      @blur="isFocused = false"
    />

    <div
      v-if="showInlineActions"
      class="field-actions"
      :class="{
        'select-field-actions': attribute.type === 'select',
        'textarea-field-actions': attribute.type === 'textarea',
      }"
    >
      <button
        v-if="canClear"
        type="button"
        class="field-action-button"
        :aria-label="`清空${attribute.name}`"
        @click.stop="clearAttributeValue"
      >
        <el-icon><Close /></el-icon>
      </button>
      <el-tooltip
        v-if="tooltipLines.length > 0"
        placement="right"
        effect="dark"
        popper-class="field-tooltip-popper"
      >
        <template #content>
          <div class="field-tooltip-content">
            <p v-for="(line, index) in tooltipLines" :key="`${attribute.id}-tip-${index}`">{{ line }}</p>
          </div>
        </template>
        <button
          type="button"
          class="field-action-button info"
          :aria-label="`查看${attribute.name}提示`"
          @click.stop
        >
          <el-icon><InfoFilled /></el-icon>
        </button>
      </el-tooltip>
    </div>

    <!-- 浮动标签（只写一次） -->
    <label class="floating-label" :class="{ active: isActive }" :title="attribute.name">
      {{ attribute.name }}
      <span v-if="attribute.is_required" class="required-asterisk">*</span>
    </label>

    <!-- 属性描述提示 -->
    <p v-if="error" class="field-hint error" :title="error">{{ error }}</p>
    <p v-else-if="attribute.description" class="field-hint" :title="attribute.description">{{ attribute.description }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Close, InfoFilled } from '@element-plus/icons-vue'
import type { ProductTemplateAttribute } from '@/api/productSupplyAPI'

interface Props {
  attribute: ProductTemplateAttribute
  modelValue: any
  error?: string
  fieldId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const isFocused = ref(false)
const selectKeyword = ref('')
const MAX_RENDERED_SELECT_OPTIONS = 80

const isMultiSelect = computed(() => props.attribute.type === 'select' && props.attribute.is_collection === true)

const renderedSelectOptions = computed(() => {
  const values = props.attribute.values || []
  const keyword = selectKeyword.value.trim().toLowerCase()
  if (!keyword) return values.slice(0, MAX_RENDERED_SELECT_OPTIONS)
  return values
    .filter(option => String(option.value || '').toLowerCase().includes(keyword))
    .slice(0, MAX_RENDERED_SELECT_OPTIONS)
})

const hasValue = (value: any): boolean => {
  if (value === false || value === 0) return true
  if (Array.isArray(value)) return value.some(item => hasValue(item))
  if (typeof value === 'object' && value !== null) {
    return !!value.value || !!value.valueId || !!value.id
  }
  return value !== undefined && value !== null && value !== ''
}

const tooltipLines = computed(() => {
  return String(props.attribute.description || '')
    .split(/\r?\n+/)
    .map(line => line.trim())
    .filter(Boolean)
})

const canClear = computed(() => {
  if (props.attribute.type === 'boolean') return false
  return hasValue(props.modelValue)
})

const showInlineActions = computed(() => {
  if (props.attribute.type === 'boolean') return false
  return canClear.value || tooltipLines.value.length > 0
})

/**
 * 标签是否处于激活状态（浮动到顶部）
 * - boolean/switch 类型始终激活
 * - 有值时激活
 * - 获得焦点时激活
 */
const isActive = computed(() => {
  if (props.attribute.type === 'boolean') return false
  const val = props.modelValue
  if (Array.isArray(val)) {
    return isFocused.value || val.length > 0
  }
  if (typeof val === 'object' && val !== null) {
    return isFocused.value || !!val.value || !!val.valueId || !!val.id
  }
  return isFocused.value || (val !== undefined && val !== null && val !== '')
})

const selectModelValue = computed(() => {
  const val = props.modelValue
  if (isMultiSelect.value) {
    const values = Array.isArray(val) ? val : (val !== undefined && val !== null && val !== '' ? [val] : [])
    return values
      .map(item => {
        if (typeof item === 'object' && item !== null) {
          return String(item.valueId ?? item.id ?? item.value ?? '')
        }
        const found = props.attribute.values?.find((option: any) => option.value === item)
        return String(found?.id ?? found?.valueId ?? item)
      })
      .filter(Boolean)
  }
  if (typeof val === 'object' && val !== null) {
    return String(val.valueId ?? val.id ?? val.value ?? '')
  }
  if (val === undefined || val === null) return ''
  const found = props.attribute.values?.find((item: any) => item.value === val)
  return String(found?.id ?? found?.valueId ?? val)
})

const normalizeSelectOption = (selected: string) => {
  const option = props.attribute.values?.find((item: any) => String(item.id ?? item.valueId ?? item.value) === String(selected))
  if (!option) {
    return selected
  }
  return {
    value: option.value,
    valueId: option.id ?? option.valueId,
  }
}

const handleSelectChange = (selected: string | string[]) => {
  if (isMultiSelect.value) {
    const values = Array.isArray(selected) ? selected.map(normalizeSelectOption) : []
    emit('update:modelValue', values)
    return
  }
  const normalized = normalizeSelectOption(String(selected))
  emit('update:modelValue', normalized)
}

const handleSelectFilter = (keyword: string) => {
  selectKeyword.value = keyword || ''
}

const numberModelValue = computed(() => {
  return props.modelValue === undefined || props.modelValue === null ? '' : String(props.modelValue)
})

const booleanModelValue = computed(() => {
  if (typeof props.modelValue === 'boolean') return props.modelValue
  if (typeof props.modelValue === 'number') return props.modelValue > 0
  if (typeof props.modelValue === 'string') {
    const normalized = props.modelValue.trim().toLowerCase()
    return ['true', '1', 'yes', 'y', 'on', 'да'].includes(normalized)
  }
  return false
})

const handleBooleanChange = (value: string | number | boolean) => {
  emit('update:modelValue', Boolean(value))
}

const clearAttributeValue = () => {
  if (props.attribute.type === 'number') {
    emit('update:modelValue', null)
    return
  }
  if (props.attribute.type === 'select') {
    emit('update:modelValue', props.attribute.is_collection ? [] : null)
    return
  }
  emit('update:modelValue', '')
}

const handleNumberInput = (value: string | number) => {
  const allowDecimal = (props.attribute.precision || 0) > 0
  const raw = String(value ?? '')
  const sanitized = allowDecimal
    ? raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
    : raw.replace(/\D/g, '')
  if (!sanitized) {
    emit('update:modelValue', null)
    return
  }
  const numberValue = allowDecimal ? Number(sanitized) : Number.parseInt(sanitized, 10)
  emit('update:modelValue', Number.isFinite(numberValue) ? numberValue : null)
}
</script>

<style scoped>
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

.checkbox-floating-item {
  min-height: 32px;
  padding-left: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.checkbox-floating-item .floating-label {
  position: static;
  display: inline-flex;
  max-width: calc(100% - 52px);
  transform: none;
  vertical-align: middle;
  background: transparent;
  padding: 0;
  pointer-events: auto;
}

.checkbox-floating-item :deep(.el-checkbox) {
  vertical-align: middle;
  margin-right: 0;
}

.floating-item :deep(.el-input__wrapper),
.floating-item :deep(.el-select__wrapper) {
  padding-top: 0;
  padding-left: 13px;
  padding-right: 64px;
  height: 46px;
  border-radius: 8px;
  width: 100%;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

.floating-item :deep(.el-input__wrapper:hover),
.floating-item :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px #bfdbfe inset;
}

.floating-item :deep(.el-input__wrapper.is-focus),
.floating-item :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #3b82f6 inset;
}

.floating-item.has-error :deep(.el-input__wrapper),
.floating-item.has-error :deep(.el-select__wrapper),
.floating-item.has-error :deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px #ef4444 inset;
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

.floating-item :deep(.el-textarea__inner) {
  height: 96px;
  font-size: 13px;
  padding-top: 18px;
  padding-right: 64px;
  border-radius: 8px;
}

.field-actions {
  position: absolute;
  top: 23px;
  right: 12px;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  z-index: 3;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.textarea-field-actions {
  top: 18px;
  transform: none;
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

.floating-item:hover .field-actions,
.floating-item:focus-within .field-actions {
  opacity: 1;
  pointer-events: auto;
}

.field-action-button:hover {
  color: #64748b;
  background: transparent;
}

.field-action-button.info {
  color: #64748b;
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

:global(.attribute-select-popper .el-select-dropdown__item) {
  height: auto;
  min-height: 34px;
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
  padding-top: 8px;
  padding-bottom: 8px;
  display: flex;
  align-items: center;
}

.required-asterisk {
  color: #f56c6c;
  position: relative;
  top: -6px;
  font-size: 11px;
  margin-left: 2px;
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
}

.field-hint.error {
  color: #ef4444;
}

/* textarea 的浮动标签初始位置对齐文本基线（而非几何中心） */
.floating-item.textarea-floating-item .floating-label {
  top: 25px;
  transform: none;
}
</style>
