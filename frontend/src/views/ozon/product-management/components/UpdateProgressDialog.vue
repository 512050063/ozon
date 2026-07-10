<template>
  <AppDialog
    :model-value="visible"
    title="更新商品数据"
    :subtitle="message"
    :icon="Refresh"
    content-class="update-progress-dialog"
    :show-footer="false"
    :cancel-disabled="isRunning"
    :confirm-loading="isRunning"
    @update:model-value="value => emit('update:visible', value)"
  >
    <div class="update-progress-body">
      <AppSkeletonLoader v-if="isRunning" variant="dialog" :rows="4" compact />
      <div class="progress-meta">
        <div class="progress-status">{{ status || '正在更新' }}</div>
        <div class="progress-track">
          <span :style="{ width: normalizedProgress + '%' }"></span>
        </div>
        <div class="progress-text">{{ progressText || `同步中 ${normalizedProgress}%` }}</div>
      </div>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { AppDialog, AppSkeletonLoader } from '@/components/ui';

// Props
interface Props {
  visible: boolean;
  status: string;
  message: string;
  progress: number;
  progressText: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  status: '',
  message: '',
  progress: 0,
  progressText: '',
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const normalizedProgress = computed(() => Math.max(0, Math.min(100, Math.round(props.progress || 0))));
const isRunning = computed(() => props.visible && normalizedProgress.value < 100 && props.status !== '更新失败');
</script>

<style scoped>
:global(.update-progress-dialog) {
  max-width: 420px;
}

:global(.update-progress-dialog .app-dialog-body) {
  padding: 0;
}

.update-progress-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 210px;
}

.progress-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-status {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  text-align: left;
}

.progress-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #60a5fa, #2563eb);
  transition: width 0.25s ease;
}

.progress-text {
  font-size: 12px;
  color: #64748b;
  text-align: left;
}
</style>
