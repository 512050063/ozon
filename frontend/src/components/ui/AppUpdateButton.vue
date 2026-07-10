<template>
  <el-tooltip
    placement="bottom"
    effect="dark"
    :show-after="300"
    @show="handleTooltipShow"
  >
    <template #content>
      <div class="update-tooltip-content">
        <div class="tooltip-row">
          <span class="tooltip-label">最近更新时间：</span>
          <span class="tooltip-status badge" :class="statusClass">{{ statusText }}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-status">{{ lastUpdateTimeText }}</span>
          <span class="tooltip-link" @click.stop="handleDetailClick">详情>></span>
        </div>
      </div>
    </template>
    <el-button
      type="primary"
      class="btn-update"
      :loading="isLoading"
      :disabled="disabled || isLoading"
      @click="handleClick"
    >
      <el-icon class="mr-1"><Refresh /></el-icon>
      {{ text }}
    </el-button>
  </el-tooltip>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { useUpdateStore } from '@/store/updateStore';

interface Props {
  text?: string;
  loadingText?: string;
  loading?: boolean;
  disabled?: boolean;
  lastUpdateTime?: string | Date | null;
  updateStatus?: 'success' | 'error' | 'idle';
  fetchLastUpdateTime?: () => Promise<{ lastUpdateTime: string | Date; status: 'success' | 'error' | 'idle' }>;
  module?: string; // 模块标识符，用于全局状态管理
}

const props = withDefaults(defineProps<Props>(), {
  text: '更新',
  loadingText: '更新中...',
  loading: false,
  disabled: false,
  lastUpdateTime: null,
  updateStatus: 'idle',
  fetchLastUpdateTime: undefined,
  module: '',
});

const emit = defineEmits<{
  (e: 'click', clickTime: Date): void;
  (e: 'detail', clickTime: Date): void;
}>();

// 全局更新状态管理
const updateStore = useUpdateStore();

// 内部状态
const currentLastUpdateTime = ref<string | Date | null>(props.lastUpdateTime);
const currentStatus = ref<'success' | 'error' | 'idle'>(props.updateStatus);
const isFetching = ref(false);

// 计算实际加载状态：优先使用全局状态（当有module时）
const isLoading = computed(() => {
  if (props.module) {
    return updateStore.isUpdating(props.module);
  }
  return props.loading;
});

// tooltip 显示时触发获取最新更新时间
const handleTooltipShow = async () => {
  if (!props.fetchLastUpdateTime || isFetching.value) return;
  
  isFetching.value = true;
  try {
    const result = await props.fetchLastUpdateTime();
    if (result) {
      currentLastUpdateTime.value = result.lastUpdateTime;
      currentStatus.value = result.status;
    }
  } catch {
  } finally {
    isFetching.value = false;
  }
};

const handleClick = () => {
  // 如果有模块标识符，则由父组件控制状态
  const clickTime = new Date();
  emit('click', clickTime);
};

const handleDetailClick = () => {
  const clickTime = new Date();
  emit('detail', clickTime);
};

// 格式化更新时间
const lastUpdateTimeText = computed(() => {
  const time = currentLastUpdateTime.value || props.lastUpdateTime;
  if (!time) {
    return '暂无更新';
  }
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
});

// 获取状态文本
const statusText = computed(() => {
  const time = currentLastUpdateTime.value || props.lastUpdateTime;
  const status = currentStatus.value || props.updateStatus;
  if (!time) {
    return '暂无数据';
  }
  switch (status) {
    case 'success':
      return '更新成功';
    case 'error':
      return '更新失败';
    default:
      return '更新成功';
  }
});

// 获取状态样式类
const statusClass = computed(() => {
  const time = currentLastUpdateTime.value || props.lastUpdateTime;
  const status = currentStatus.value || props.updateStatus;
  if (!time) {
    return 'status-idle';
  }
  switch (status) {
    case 'success':
      return 'status-success';
    case 'error':
      return 'status-error';
    default:
      return 'status-success';
  }
});
</script>

<style scoped>
/* 更新按钮样式 */
.btn-update {
  --el-button-font-size: 12px !important;
  --el-button-height: 28px !important;
  --el-button-border-radius: 6px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  height: 28px !important;
  min-height: 28px !important;
  line-height: 28px !important;
  border-radius: 6px !important;
  padding: 0 10px !important;
  min-width: 60px !important;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  border: none !important;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.25) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.btn-update:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 100%, #1d4ed8 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35) !important;
}

.btn-update:active:not(:disabled) {
  transform: translateY(0);
}

.btn-update:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Tooltip 样式 - 黑色背景 */
.update-tooltip-content {
  min-width: 180px;
  font-size: 12px;
  line-height: 1.6;
  padding: 4px 0;
}

.tooltip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 8px;
}

.tooltip-row:last-child {
  margin-bottom: 0;
}

.tooltip-label {
  color: #9ca3af;
}

.tooltip-link {
  color: #60a5fa;
  cursor: pointer;
  margin-left: 4px;
}

.tooltip-link:hover {
  text-decoration: underline;
}

.tooltip-status {
  color: #9ca3af;
  font-weight: 500;
}

.tooltip-status.badge {
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

.status-success {
  color: #4ade80;
  background-color: rgba(74, 222, 128, 0.2);
}

.status-error {
  color: #f87171;
  background-color: rgba(248, 113, 113, 0.2);
}

.status-idle {
  color: #9ca3af;
  background-color: rgba(156, 163, 175, 0.2);
}
</style>
