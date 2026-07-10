<template>
  <div class="api-config-tab-panel px-8 py-6">
    <!-- 配置说明 -->
    <div class="mb-5 px-4 py-3 bg-blue-50 rounded-lg">
      <p class="text-xs text-blue-700 leading-5 text-left">
        <strong>配置说明：</strong>{{ description }}
      </p>
    </div>

    <!-- 配置字段 -->
    <div class="api-config-form">
      <div v-for="field in fields" :key="field.key" class="api-config-field">
        <span class="api-config-label">{{ field.label }}</span>
        <div class="api-config-control">
          <el-input
            :model-value="getFieldValue(field)"
            :type="isEditing && field.type === 'password' ? 'password' : 'text'"
            :placeholder="field.placeholder"
            :readonly="!isEditing"
            size="small"
            class="api-config-input"
            :show-password="isEditing && field.type === 'password'"
            @update:model-value="value => handleFieldUpdate(field, value)"
          >
            <template #prefix>
              <el-icon><component :is="field.icon" /></el-icon>
            </template>
          </el-input>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="api-config-actions">
        <template v-if="isEditing">
          <button
            @click="handleSave"
            :disabled="isSaving"
            :class="[
              'api-config-button api-config-button--primary',
              isSaving ? 'is-disabled' : ''
            ]"
          >
            {{ isSaving ? '保存中...' : '保存' }}
          </button>
          <button
            @click="handleCancel"
            class="api-config-button api-config-button--secondary"
          >
            取消
          </button>
          <button
            @click="handleTest"
            :disabled="isTesting"
            :class="[
              'api-config-button api-config-button--success',
              isTesting ? 'is-disabled' : ''
            ]"
          >
            {{ isTesting ? '测试中...' : '测试' }}
          </button>
        </template>
        <template v-else>
          <button
            @click="handleEdit"
            class="api-config-button api-config-button--primary"
          >
            配置
          </button>
          <button
            v-if="hasConfig"
            @click="handleTest"
            :disabled="isTesting"
            :class="[
              'api-config-button api-config-button--success',
              isTesting ? 'is-disabled' : ''
            ]"
          >
            {{ isTesting ? '测试中...' : '测试' }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Props
interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder: string;
  icon: any;
}

interface Props {
  platform: string;
  description: string;
  fields: ConfigField[];
  configData: Record<string, string>;
  editData: Record<string, string>;
  isEditing: boolean;
  isSaving: boolean;
  isTesting: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  platform: '',
  description: '',
  fields: () => [],
  configData: () => ({} as Record<string, string>),
  editData: () => ({} as Record<string, string>),
  isEditing: false,
  isSaving: false,
  isTesting: false,
});

// Emits
const emit = defineEmits<{
  'update:editData': [value: Record<string, string>];
  edit: [platform: string];
  save: [platform: string];
  cancel: [];
  test: [platform: string];
}>();

// 计算是否有配置
const hasConfig = computed(() => {
  return Object.keys(props.configData).some(key => props.configData[key]);
});

const getFieldValue = (field: ConfigField) => {
  if (props.isEditing) {
    return props.editData[field.key] || '';
  }
  if (field.type === 'password') {
    return props.configData[field.key] ? '•••••••' : '-';
  }
  return props.configData[field.key] || '-';
};

const handleFieldUpdate = (field: ConfigField, value: string | number) => {
  if (!props.isEditing) return;
  emit('update:editData', {
    ...props.editData,
    [field.key]: String(value),
  });
};

// 处理编辑
const handleEdit = () => {
  emit('edit', props.platform);
};

// 处理保存
const handleSave = () => {
  emit('save', props.platform);
};

// 处理取消
const handleCancel = () => {
  emit('cancel');
};

// 处理测试
const handleTest = () => {
  emit('test', props.platform);
};
</script>

<style scoped>
.api-config-tab-panel {
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.api-config-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 680px;
  margin-left: 24px;
}

.api-config-field {
  display: grid;
  grid-template-columns: 128px minmax(0, 360px);
  align-items: center;
  min-height: 38px;
  column-gap: 16px;
}

.api-config-label {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  text-align: left;
}

.api-config-control {
  min-width: 0;
}

.api-config-input :deep(.el-input__wrapper) {
  min-height: 34px;
  padding: 0 11px;
  background-color: #ffffff;
  border: 1px solid #dbe4f0;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.api-config-input :deep(.el-input__wrapper:hover) {
  border-color: #b8c6d8;
}

.api-config-input :deep(.el-input__wrapper.is-focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.api-config-input.is-disabled,
.api-config-input.is-disabled :deep(.el-input__wrapper),
.api-config-input.is-disabled :deep(.el-input__wrapper:hover),
.api-config-input.is-disabled :deep(.el-input__wrapper.is-focus) {
  cursor: default !important;
}

.api-config-input.is-disabled :deep(.el-input__wrapper),
.api-config-input.is-disabled :deep(.el-input__wrapper:hover),
.api-config-input.is-disabled :deep(.el-input__wrapper.is-focus) {
  border-color: #dbe4f0 !important;
  background-color: #ffffff !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
}

.api-config-input :deep(.el-input__inner) {
  color: #1e293b;
  font-size: 13px;
}

.api-config-input.is-disabled :deep(.el-input__prefix-inner),
.api-config-input.is-disabled :deep(.el-input__inner),
.api-config-input.is-disabled :deep(.el-input__inner:disabled) {
  color: #334155 !important;
  -webkit-text-fill-color: #334155 !important;
  cursor: default !important;
}

.api-config-input.is-disabled :deep(.el-input__prefix),
.api-config-input.is-disabled :deep(.el-input__suffix) {
  cursor: default !important;
}

.api-config-input :deep(.el-input__prefix-inner) {
  color: #94a3b8;
}

.api-config-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding-top: 12px;
  margin-left: 144px;
}

.api-config-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: color 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.api-config-button:hover:not(:disabled):not(.is-disabled) {
  transform: translateY(-1px);
}

.api-config-button:active:not(:disabled):not(.is-disabled) {
  transform: translateY(0);
}

.api-config-button--primary {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.api-config-button--primary:hover:not(:disabled):not(.is-disabled) {
  color: #ffffff;
  background: #2563eb;
  border-color: #2563eb;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.18);
}

.api-config-button--secondary {
  color: #475569;
  background: #f8fafc;
  border-color: #dbe4f0;
}

.api-config-button--secondary:hover:not(:disabled):not(.is-disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.api-config-button--success {
  color: #15803d;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.api-config-button--success:hover:not(:disabled):not(.is-disabled) {
  color: #ffffff;
  background: #16a34a;
  border-color: #16a34a;
  box-shadow: 0 6px 14px rgba(22, 163, 74, 0.16);
}

.api-config-button:disabled,
.api-config-button.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
