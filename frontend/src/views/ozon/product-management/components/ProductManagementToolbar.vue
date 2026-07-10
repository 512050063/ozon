<template>
  <div class="app-page-table-toolbar px-6 h-[100px] flex items-center">
    <div class="flex flex-col md:flex-row gap-4 items-center w-full">
      <div class="flex items-center gap-3 flex-1">
        <div class="search-container">
          <el-input
            :model-value="modelValue"
            placeholder="搜索商品名称、货号、SKU..."
            clearable
            class="input-search"
            @update:model-value="value => emit('update:modelValue', String(value))"
            @keyup.enter="emit('search')"
          />
          <el-button type="primary" class="btn-search" @click="emit('search')">
            <el-icon class="mr-1"><Search /></el-icon>
            搜索
          </el-button>
        </div>
      </div>

      <div class="toolbar-actions">
        <OzonProductLimitPill
          mode="update"
          :limits="productLimits"
          :loading="productLimitsLoading"
          :error="productLimitsError"
        />
        <AppUpdateButton
          text="商品更新"
          :loading="isUpdating"
          :last-update-time="lastUpdateTime"
          :update-status="updateButtonStatus"
          :fetch-last-update-time="fetchLastUpdateTime"
          :module="module"
          :disabled="disabled"
          @click="emit('update-click')"
          @detail="emit('detail-click')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { AppUpdateButton, OzonProductLimitPill } from '@/components/ui';
import type { OzonProductLimits } from '@/api/ozonProductAPI';

const props = defineProps<{
  modelValue: string;
  isUpdating: boolean;
  lastUpdateTime: Date | null;
  updateStatus: string;
  module: string;
  disabled?: boolean;
  fetchLastUpdateTime: () => Promise<{ lastUpdateTime: string | Date; status: 'idle' | 'success' | 'error' }>;
  productLimits?: OzonProductLimits | null;
  productLimitsLoading?: boolean;
  productLimitsError?: string;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'search'): void;
  (event: 'update-click'): void;
  (event: 'detail-click'): void;
}>();

const updateButtonStatus = computed(() => {
  if (props.updateStatus === '更新成功') return 'success';
  if (props.updateStatus === '更新失败') return 'error';
  return 'idle';
});
</script>

<style scoped>
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
