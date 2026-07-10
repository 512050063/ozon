<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="app-dialog-overlay"
      :class="overlayClass"
      @click.self="handleClose"
    >
      <div class="app-dialog-content" :class="contentClass">
        <!-- 弹窗头部 -->
        <div v-if="!$slots.header" class="app-dialog-header app-surface-header">
          <div class="dialog-icon-wrapper app-surface-icon">
            <el-icon class="dialog-icon">
              <component :is="icon" />
            </el-icon>
          </div>
          <div class="dialog-title-wrapper app-surface-title-wrapper">
            <h3 class="dialog-title app-surface-title">{{ title }}</h3>
            <p v-if="subtitle" class="dialog-subtitle app-surface-subtitle">{{ subtitle }}</p>
          </div>
        </div>
        <slot v-else name="header"></slot>
        <!-- 弹窗内容 -->
        <div class="app-dialog-body">
          <div v-if="loading" class="app-dialog-loading">
            <AppSkeletonLoader :variant="loadingVariant" :rows="loadingRows" compact />
            <span v-if="loadingText" class="app-dialog-loading-text">{{ loadingText }}</span>
          </div>
          <slot v-else name="body">
            <slot></slot>
          </slot>
        </div>
        <!-- 弹窗底部 -->
        <div v-if="showFooter && !$slots.footer" class="app-dialog-footer" :class="footerClass">
          <el-button class="btn-cancel" :class="cancelButtonClass" :disabled="cancelDisabled || confirmLoading" @click="handleClose">
            {{ cancelText }}
          </el-button>
          <el-button
            type="primary"
            class="btn-confirm"
            :class="confirmButtonClass"
            :disabled="confirmDisabled"
            :loading="confirmLoading"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </el-button>
        </div>
        <div v-else-if="$slots.footer" class="app-dialog-footer" :class="footerClass">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { User } from '@element-plus/icons-vue';
import AppSkeletonLoader from './AppSkeletonLoader.vue';

interface Props {
  modelValue: boolean;
  title: string;
  subtitle?: string;
  icon?: any;
  showFooter?: boolean;
  cancelText?: string;
  confirmText?: string;
  confirmLoadingText?: string;
  cancelDisabled?: boolean;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  loading?: boolean;
  loadingText?: string;
  loadingRows?: number;
  loadingVariant?: 'form' | 'table' | 'dialog' | 'drawer' | 'card';
  contentClass?: string;
  overlayClass?: string;
  footerClass?: string;
  cancelButtonClass?: string;
  confirmButtonClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  icon: User,
  showFooter: true,
  cancelText: '取消',
  confirmText: '确定',
  confirmLoadingText: '处理中...',
  cancelDisabled: false,
  confirmDisabled: false,
  confirmLoading: false,
  loading: false,
  loadingText: '加载中...',
  loadingRows: 4,
  loadingVariant: 'dialog',
  contentClass: '',
  overlayClass: '',
  footerClass: '',
  cancelButtonClass: '',
  confirmButtonClass: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const handleClose = () => {
  if (props.cancelDisabled || props.confirmLoading) {
    return;
  }
  emit('update:modelValue', false);
  emit('cancel');
};

const handleConfirm = () => {
  emit('confirm');
};
</script>

<style scoped>
/* 弹窗样式 - 与账号管理页一致 */
.app-dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 2vw, 24px);
  background:
    radial-gradient(circle at 48% 42%, rgba(219, 234, 254, 0.2), transparent 34%),
    rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(3px);
  z-index: 50;
}

.app-dialog-content {
  display: flex;
  flex-direction: column;
  width: min(560px, calc(100vw - var(--app-dialog-edge, 48px)));
  max-width: min(var(--app-dialog-max-width, 1100px), calc(100vw - var(--app-dialog-edge, 48px)));
  max-height: var(--app-dialog-max-height, calc(100vh - 80px));
  margin: 0;
  overflow: hidden;
  padding: 0;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.94));
  box-shadow:
    0 26px 62px rgba(15, 23, 42, 0.2),
    0 2px 8px rgba(15, 23, 42, 0.06);
}

/* 弹窗头部 */
.app-dialog-header {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 12px;
  min-height: 110px;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.78);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.72));
}

.dialog-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  overflow: hidden;
  border: 1px solid rgba(191, 219, 254, 0.86);
  border-radius: 14px;
  background:
    linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 8px 18px rgba(37, 99, 235, 0.12);
  margin-right: 0;
}

.dialog-icon {
  color: #2563eb;
  font-size: 24px;
}

.dialog-title-wrapper {
  text-align: left;
}

.dialog-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}

.dialog-subtitle {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 18px;
}

/* 弹窗内容 */
.app-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 22px 24px;
  background: rgba(255, 255, 255, 0.78);
}

.app-dialog-loading {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

.app-dialog-loading-text {
  align-self: center;
  color: #94a3b8;
  font-size: 12px;
}

/* 弹窗底部 */
.app-dialog-footer {
  display: flex;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 10px;
  margin-top: 0;
  padding: 16px 24px 20px;
  border-top: 1px solid rgba(226, 232, 240, 0.78);
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.84), rgba(255, 255, 255, 0.98));
}

.btn-cancel {
  min-width: 66px;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  background-color: #f8fafc;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.btn-cancel:hover {
  border-color: #cbd5e1;
  background-color: #f1f5f9;
  transform: translateY(-1px);
}

.btn-confirm {
  min-width: 66px;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 650;
  color: #ffffff;
  background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
  border-radius: 7px;
  border: none;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.18);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

.btn-confirm:hover {
  filter: brightness(0.98);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.24);
  transform: translateY(-1px);
}

.btn-cancel:disabled,
.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

:slotted(.btn-cancel) {
  min-width: 66px;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  background-color: #f8fafc;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

:slotted(.btn-cancel:hover) {
  border-color: #cbd5e1;
  background-color: #f1f5f9;
  transform: translateY(-1px);
}

:slotted(.btn-confirm) {
  min-width: 66px;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 650;
  color: #ffffff;
  background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
  border-radius: 7px;
  border: none;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.18);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

:slotted(.btn-confirm:hover) {
  filter: brightness(0.98);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.24);
  transform: translateY(-1px);
}

:slotted(.btn-cancel:disabled),
:slotted(.btn-confirm:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1500px) {
  .app-dialog-header {
    padding: 20px 22px 16px;
  }

  .app-dialog-body {
    padding: 20px 22px;
  }

  .app-dialog-footer {
    padding: 14px 22px 18px;
  }
}

@media (max-width: 1400px) {
  .app-dialog-content {
    max-height: var(--app-dialog-max-height, calc(100vh - 48px));
  }

  .app-dialog-header {
    padding: 18px 20px 14px;
  }

  .app-dialog-body {
    padding: 18px 20px;
  }

  .app-dialog-footer {
    padding: 12px 20px 16px;
  }
}
</style>
