<template>
  <Teleport to="body">
    <div v-if="modelValue" class="app-delete-confirm-overlay" @click.self="handleOverlayClick">
        <div class="app-delete-confirm-card" role="dialog" aria-modal="true" :aria-label="title">
        <div :class="['app-delete-confirm-icon', `app-delete-confirm-icon--${variant}`]">
          <svg
            v-if="icon === 'success'"
            class="app-delete-confirm-icon-svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 2.25A9.75 9.75 0 1 0 21.75 12 9.76 9.76 0 0 0 12 2.25Zm4.62 7.37-5.25 5.25a.88.88 0 0 1-1.24 0l-2.62-2.62a.88.88 0 0 1 1.24-1.24l2 2 4.63-4.62a.88.88 0 0 1 1.24 1.23Z"
            />
          </svg>
          <svg
            v-else-if="icon === 'warning'"
            class="app-delete-confirm-icon-svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 2.6c.7 0 1.34.37 1.7.98l8.02 13.86A1.96 1.96 0 0 1 19.72 20H4.28a1.96 1.96 0 0 1-1.7-2.56l8.02-13.86c.36-.61 1-.98 1.7-.98Zm0 4.9a.88.88 0 0 0-.88.88v5.25a.88.88 0 0 0 1.76 0V8.38A.88.88 0 0 0 12 7.5Zm0 9.7a1.05 1.05 0 1 0 0-2.1 1.05 1.05 0 0 0 0 2.1Z"
            />
          </svg>
          <svg
            v-else-if="icon === 'disable'"
            class="app-delete-confirm-icon-svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 2.25A9.75 9.75 0 1 0 21.75 12 9.76 9.76 0 0 0 12 2.25Zm3.36 12.12a.7.7 0 0 1-.99.99L12 12.99l-2.37 2.37a.7.7 0 1 1-.99-.99L11.01 12 8.64 9.63a.7.7 0 1 1 .99-.99L12 11.01l2.37-2.37a.7.7 0 1 1 .99.99L12.99 12l2.37 2.37Z"
            />
          </svg>
          <svg v-else class="app-delete-confirm-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9.75 3.25h4.5c.5 0 .93.34 1.06.82l.32 1.18h3.12a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1 0-1.5h3.12l.32-1.18c.13-.48.56-.82 1.06-.82Zm-2.88 5h10.26l-.64 10.2A2.48 2.48 0 0 1 14.02 20.8H9.98a2.48 2.48 0 0 1-2.47-2.35L6.87 8.25Zm3.25 2.5a.62.62 0 0 0-.62.62v5.13a.62.62 0 1 0 1.25 0v-5.13a.62.62 0 0 0-.63-.62Zm3.75.62a.62.62 0 1 0-1.25 0v5.13a.62.62 0 1 0 1.25 0v-5.13Z"
            />
          </svg>
        </div>
        <h3 class="app-delete-confirm-title">{{ title }}</h3>
        <p class="app-delete-confirm-message">{{ message }}</p>
        <div class="app-delete-confirm-actions">
          <button
            :class="['app-delete-confirm-button', 'app-delete-confirm-button--primary', `app-delete-confirm-button--${variant}`]"
            :disabled="loading"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </button>
          <button
            v-if="showCancel"
            class="app-delete-confirm-button app-delete-confirm-button--cancel"
            :disabled="loading"
            @click="handleCancel"
          >
            {{ cancelText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  variant?: 'danger' | 'success' | 'warning';
  icon?: 'delete' | 'disable' | 'success' | 'warning';
  showCancel?: boolean;
  closeOnOverlay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认删除',
  message: '删除后无法恢复，确定继续吗？',
  confirmText: '删除',
  cancelText: '取消',
  loading: false,
  variant: 'danger',
  icon: 'delete',
  showCancel: true,
  closeOnOverlay: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const handleCancel = () => {
  if (props.loading) return;
  emit('update:modelValue', false);
  emit('cancel');
};

const handleOverlayClick = () => {
  if (!props.closeOnOverlay) return;
  handleCancel();
};

const handleConfirm = () => {
  if (props.loading) return;
  emit('confirm');
};
</script>

<style scoped>
.app-delete-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.44);
  backdrop-filter: blur(2px);
}

.app-delete-confirm-card {
  width: 320px;
  min-height: 218px;
  padding: 22px 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  overflow: hidden;
  position: relative;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.18);
}

.app-delete-confirm-icon {
  width: 50px;
  height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 24px;
}

.app-delete-confirm-icon-svg {
  width: 25px;
  height: 25px;
  display: block;
  flex-shrink: 0;
  fill: currentColor;
}

.app-delete-confirm-icon--danger {
  color: #ef4444;
  background: #fee2e2;
}

.app-delete-confirm-icon--success {
  color: #16a34a;
  background: #dcfce7;
}

.app-delete-confirm-icon--warning {
  color: #f59e0b;
  background: #fef3c7;
}

.app-delete-confirm-title {
  margin: 0;
  color: #1f2937;
  font-size: 20px;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: 0;
}

.app-delete-confirm-message {
  margin: 0;
  max-width: 238px;
  min-height: 36px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 600;
  text-align: center;
}

.app-delete-confirm-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 2px;
}

.app-delete-confirm-button {
  min-width: 88px;
  height: 38px;
  padding: 0 22px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-size: 14px;
  line-height: 38px;
  font-weight: 700;
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.app-delete-confirm-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.app-delete-confirm-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.app-delete-confirm-button--primary {
  color: #ffffff;
}

.app-delete-confirm-button--danger {
  background: #ef4444;
  box-shadow: 0 8px 18px rgba(239, 68, 68, 0.22);
}

.app-delete-confirm-button--danger:not(:disabled):hover {
  background: #dc2626;
}

.app-delete-confirm-button--success {
  background: #16a34a;
  box-shadow: 0 8px 18px rgba(22, 163, 74, 0.22);
}

.app-delete-confirm-button--success:not(:disabled):hover {
  background: #15803d;
}

.app-delete-confirm-button--warning {
  background: #f59e0b;
  box-shadow: 0 8px 18px rgba(245, 158, 11, 0.24);
}

.app-delete-confirm-button--warning:not(:disabled):hover {
  background: #d97706;
}

.app-delete-confirm-button--cancel {
  color: #374151;
  background: #e5e7eb;
}

.app-delete-confirm-button--cancel:not(:disabled):hover {
  background: #d1d5db;
}
</style>
