<template>
  <!-- 删除按钮使用统一弹窗确认 -->
  <template v-if="name === 'delete'">
    <el-tooltip :content="resolvedTooltip" :placement="tooltipPlacement" :disabled="tooltipDisabled">
      <span class="app-table-btn-tooltip-trigger">
        <el-button
          type="danger"
          size="small"
          plain
          :disabled="disabled"
          :class="['app-table-btn', `app-table-btn--${name}`]"
          @click="openDeleteConfirm"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </span>
    </el-tooltip>
    <AppDeleteConfirmDialog
      v-model="deleteConfirmVisible"
      :message="deleteConfirmText"
      :confirm-text="deleteConfirmButtonText"
      :cancel-text="deleteCancelButtonText"
      @confirm="handleConfirm"
    >
    </AppDeleteConfirmDialog>
  </template>
  
  <!-- 其他按钮使用普通按钮 -->
  <el-tooltip v-else :content="resolvedTooltip" :placement="tooltipPlacement" :disabled="tooltipDisabled">
    <span class="app-table-btn-tooltip-trigger">
      <el-button
        :type="buttonConfig.type"
        size="small"
        plain
        :disabled="disabled || loading"
        @click="handleClick"
        :class="['app-table-btn', `app-table-btn--${name}`, { 'is-loading': loading }]"
      >
        <el-icon><component :is="buttonConfig.icon" /></el-icon>
      </el-button>
    </span>
  </el-tooltip>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, CloseBold, EditPen, Document, Refresh, Loading, Delete, More, TakeawayBox, Box } from '@element-plus/icons-vue';
import AppDeleteConfirmDialog from './AppDeleteConfirmDialog.vue';

type ButtonName = 'edit' | 'detail' | 'save' | 'update' | 'delete' | 'more' | 'prepare' | 'cancel' | 'approve' | 'add';

interface Props {
  name: ButtonName;
  loading?: boolean;
  disabled?: boolean;
  deleteConfirmText?: string;
  deleteConfirmButtonText?: string;
  deleteCancelButtonText?: string;
  tooltip?: string;
  tooltipPlacement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right';
  tooltipDisabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  deleteConfirmText: '确定要删除吗？',
  deleteConfirmButtonText: '删除',
  deleteCancelButtonText: '取消',
  tooltip: undefined,
  tooltipPlacement: 'top',
  tooltipDisabled: false,
});

const deleteConfirmVisible = ref(false);

const buttonConfig = computed(() => {
  const configs = {
    edit: {
      type: 'primary' as const,
      icon: EditPen,
      tooltip: '编辑',
    },
    detail: {
      type: 'warning' as const,
      icon: Document,
      tooltip: '详情',
    },
    save: {
      type: 'primary' as const,
      icon: TakeawayBox,
      tooltip: '保存',
    },
    add: {
      type: 'success' as const,
      icon: Box,
      tooltip: '添加商品',
    },
    update: {
      type: 'success' as const,
      icon: props.loading ? Loading : Refresh,
      tooltip: '更新',
    },
    delete: {
      type: 'danger' as const,
      icon: Delete,
      tooltip: '删除',
    },
    more: {
      type: 'info' as const,
      icon: More,
      tooltip: '更多',
    },
    prepare: {
      type: 'success' as const,
      icon: props.loading ? Loading : Box,
      tooltip: '备货',
    },
    approve: {
      type: 'success' as const,
      icon: props.loading ? Loading : Check,
      tooltip: '审核通过',
    },
    cancel: {
      type: 'danger' as const,
      icon: props.loading ? Loading : CloseBold,
      tooltip: '取消货件',
    },
  };
  return configs[props.name];
});

const resolvedTooltip = computed(() => props.tooltip || buttonConfig.value.tooltip);

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const handleClick = () => {
  emit('click');
};

const openDeleteConfirm = () => {
  if (props.disabled || props.loading) return;
  deleteConfirmVisible.value = true;
};

const handleConfirm = () => {
  deleteConfirmVisible.value = false;
  emit('click');
};
</script>

<style scoped>
.app-table-btn-tooltip-trigger {
  display: inline-flex;
  line-height: 0;
  vertical-align: middle;
}

.app-table-btn {
  width: 30px !important;
  height: 30px !important;
  padding: 0 !important;
  margin: 0 6px 0 0 !important;
  border-radius: 8px !important;
  border-width: 1px !important;
  background: #ffffff !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition:
    color 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}
.app-table-btn:last-child {
  margin-right: 0 !important;
}

.app-table-btn:hover:not(.is-disabled):not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 7px 14px rgba(15, 23, 42, 0.08);
}

.app-table-btn :deep(.el-icon) {
  font-size: 14px;
}

.app-table-btn--edit,
.app-table-btn--detail {
  color: #2563eb !important;
  border-color: #bfdbfe !important;
  background: #eff6ff !important;
}

.app-table-btn--edit:hover,
.app-table-btn--detail:hover {
  color: #1d4ed8 !important;
  border-color: #93c5fd !important;
  background: #dbeafe !important;
}

.app-table-btn--save,
.app-table-btn--add,
.app-table-btn--update,
.app-table-btn--prepare,
.app-table-btn--approve {
  color: #059669 !important;
  border-color: #bbf7d0 !important;
  background: #f0fdf4 !important;
}

.app-table-btn--save:hover,
.app-table-btn--add:hover,
.app-table-btn--update:hover,
.app-table-btn--prepare:hover,
.app-table-btn--approve:hover {
  color: #047857 !important;
  border-color: #86efac !important;
  background: #dcfce7 !important;
}

.app-table-btn--delete,
.app-table-btn--cancel {
  color: #dc2626 !important;
  border-color: #fecaca !important;
  background: #fff1f2 !important;
}

.app-table-btn--delete:hover,
.app-table-btn--cancel:hover {
  color: #b91c1c !important;
  border-color: #fca5a5 !important;
  background: #fee2e2 !important;
}

.app-table-btn--more {
  color: #64748b !important;
  border-color: #e2e8f0 !important;
  background: #f8fafc !important;
}

.app-table-btn--more:hover {
  color: #334155 !important;
  border-color: #cbd5e1 !important;
  background: #f1f5f9 !important;
}

.app-table-btn.is-disabled,
.app-table-btn:disabled {
  color: #94a3b8 !important;
  border-color: #e2e8f0 !important;
  background: #f8fafc !important;
  box-shadow: none !important;
  cursor: not-allowed !important;
  opacity: 1 !important;
  transform: none !important;
}

.app-table-btn.is-disabled:hover,
.app-table-btn:disabled:hover {
  color: #94a3b8 !important;
  border-color: #e2e8f0 !important;
  background: #f8fafc !important;
  box-shadow: none !important;
  transform: none !important;
}

.app-table-btn.is-disabled :deep(.el-icon),
.app-table-btn:disabled :deep(.el-icon) {
  color: #94a3b8 !important;
}

.app-table-btn.is-loading :deep(.el-icon) {
  animation: appTableButtonSpin 1s linear infinite;
}

@keyframes appTableButtonSpin {
  to {
    transform: rotate(360deg);
  }
}
</style>
