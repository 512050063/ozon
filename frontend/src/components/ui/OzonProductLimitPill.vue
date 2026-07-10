<template>
  <el-tooltip
    effect="dark"
    placement="top"
    :disabled="!tooltipText"
    popper-class="product-limit-tooltip-popper"
  >
    <template #content>
      <div class="product-limit-tooltip">
        <div v-for="line in tooltipLines" :key="line">{{ line }}</div>
      </div>
    </template>
    <div class="product-limit-pill" :class="{ 'is-loading': loading, 'is-unknown': !limits && !loading }">
      <el-icon class="limit-icon"><Clock /></el-icon>
      <span class="limit-label">每24小时</span>
      <span class="limit-item">{{ modeLabel }} <strong>{{ formatLimit(activeBucket?.remaining) }}</strong></span>
    </div>
  </el-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Clock } from '@element-plus/icons-vue';
import type { OzonProductLimits } from '@/api/ozonProductAPI';

const props = defineProps<{
  mode: 'create' | 'update';
  limits?: OzonProductLimits | null;
  loading?: boolean;
  error?: string;
}>();

const modeLabel = computed(() => (props.mode === 'create' ? '可添加' : '可更改'));
const activeBucket = computed(() => (
  props.mode === 'create' ? props.limits?.dailyCreate : props.limits?.dailyUpdate
));

const formatLimit = (value: number | null | undefined) => {
  if (props.loading) return '...';
  if (value === null || value === undefined) return '-';
  return String(value);
};

const tooltipLines = computed(() => {
  if (props.error) return [props.error];
  if (props.loading) return ['获取额度中'];
  if (!props.limits || !activeBucket.value) return ['额度未知'];
  const bucket = activeBucket.value;
  return [
    `剩余：${formatLimit(bucket.remaining)}`,
    bucket.used !== null ? `已用：${bucket.used}` : '',
    bucket.limit !== null ? `总量：${bucket.limit}` : '',
  ].filter(Boolean);
});

const tooltipText = computed(() => tooltipLines.value.join('\n'));
</script>

<style scoped>
.product-limit-pill {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-size: 13px;
  white-space: nowrap;
}

.limit-icon {
  flex: 0 0 auto;
  font-size: 14px;
  color: #3b82f6;
}

.product-limit-pill.is-loading,
.product-limit-pill.is-unknown {
  color: #64748b;
}

.limit-label {
  color: #64748b;
}

.limit-item strong {
  display: inline-flex;
  min-width: 28px;
  justify-content: center;
  margin-left: 4px;
  padding: 2px 7px;
  border-radius: 8px;
  background: #eef2ff;
  color: #2563eb;
}

:global(.product-limit-tooltip-popper) {
  max-width: 220px;
}

.product-limit-tooltip {
  line-height: 1.7;
  white-space: normal;
}
</style>
