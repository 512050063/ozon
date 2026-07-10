<template>
  <el-empty class="app-empty" :class="`app-empty--${variant}`" :image-size="imageSize">
    <template #description>
      <h3 v-if="title" class="app-empty-title">{{ title }}</h3>
      <p v-if="description" class="app-empty-description">{{ description }}</p>
    </template>
    <template #default>
      <slot name="action"></slot>
    </template>
  </el-empty>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title?: string;
  description?: string;
  variant?: 'default' | 'table';
}

const props = withDefaults(defineProps<Props>(), {
  title: '暂无数据',
  description: '暂无相关内容',
  variant: 'default',
});

const imageSize = computed(() => (props.variant === 'table' ? 144 : 180));
</script>

<style scoped>
.app-empty {
  width: 100%;
  display: flex;
  justify-content: center;
}

.app-empty--table {
  padding: 0;
}

.app-empty-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  line-height: 1.4;
  margin: 0 0 6px 0;
}

.app-empty--table .app-empty-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.app-empty-description {
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
  margin: 0;
}

.app-empty--table .app-empty-description {
  font-size: 12px;
  color: #94a3b8;
}

.app-empty--table :deep(.el-empty__image) {
  width: 132px;
  margin-bottom: 4px;
}

.app-empty--table :deep(.el-empty__description) {
  margin-top: 0;
}

.app-empty :deep(.el-empty__description) {
  padding: 0;
}
</style>
