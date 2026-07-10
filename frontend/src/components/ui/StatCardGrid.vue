<template>
  <div class="stat-card-grid">
    <button
      v-for="(item, index) in items"
      :key="index"
      type="button"
      :class="[
        'stat-card-grid__item',
        { 'stat-card-grid__item--clickable': clickable, 'is-active': activeKey && item.key === activeKey }
      ]"
      :disabled="!clickable"
      @click="handleItemClick(item)"
    >
      <StatCard
        :label="item.label"
        :value="item.value"
        :sub-label="item.subLabel"
        :type="item.type"
        :icon="item.icon"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import StatCard from './StatCard.vue';
import { Document } from '@element-plus/icons-vue';

export interface StatCardItem {
  /** 唯一标识（用于选中和点击） */
  key?: string;
  /** 标题 */
  label: string;
  /** 数值 */
  value: string | number;
  /** 子标签（可选） */
  subLabel?: string;
  /** 类型 */
  type?: 'total' | 'pending' | 'listed' | 'growth' | 'users' | 'money' | 'package' | 'cart';
  /** 自定义图标（可选） */
  icon?: typeof Document;
}

interface Props {
  /** 统计数据列表 */
  items: StatCardItem[];
  /** 当前选中的统计项 */
  activeKey?: string;
  /** 是否允许点击 */
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  activeKey: '',
  clickable: false,
});

const emit = defineEmits<{
  (e: 'item-click', item: StatCardItem): void;
}>();

const handleItemClick = (item: StatCardItem) => {
  if (!props.clickable) return;
  emit('item-click', item);
};
</script>

<style scoped>
.stat-card-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--app-card-gap, 16px);
  margin-bottom: 18px;
}

.stat-card-grid__item {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.stat-card-grid__item:disabled {
  cursor: default;
}

.stat-card-grid__item--clickable {
  cursor: pointer;
}

.stat-card-grid__item--clickable.is-active :deep(.stat-card) {
  box-shadow: 0 16px 34px rgba(37, 99, 235, 0.1);
}

@media (max-width: 1280px) {
  .stat-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .stat-card-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
