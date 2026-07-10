<template>
  <div class="stats-grid">
    <button
      type="button"
      class="stat-filter-card"
      aria-label="筛选所有商品"
      :aria-pressed="activeStatus === ''"
      @click="emit('filter-change', '')"
    >
      <StatCard label="商品库总数" :value="total" type="total" />
    </button>
    <button
      type="button"
      class="stat-filter-card"
      aria-label="筛选待上架商品"
      :aria-pressed="activeStatus === 'pending'"
      @click="emit('filter-change', 'pending')"
    >
      <StatCard label="待上架" :value="`${pendingCount}/${listingCount}`" type="pending" />
    </button>
    <button
      type="button"
      class="stat-filter-card"
      aria-label="筛选已上架商品"
      :aria-pressed="activeStatus === 'listed'"
      @click="emit('filter-change', 'listed')"
    >
      <StatCard label="已上架" :value="listedCount" type="listed" />
    </button>
    <button
      type="button"
      class="stat-filter-card"
      aria-label="筛选错误商品"
      :aria-pressed="activeStatus === 'failed'"
      @click="emit('filter-change', 'failed')"
    >
      <StatCard label="错误" :value="failedCount" type="growth" :icon="WarningFilled" />
    </button>
  </div>
</template>

<script setup lang="ts">
import StatCard from '@/components/ui/StatCard.vue';
import { WarningFilled } from '@element-plus/icons-vue';

interface Props {
  total: number;
  pendingCount: number;
  listingCount: number;
  listedCount: number;
  failedCount: number;
  activeStatus: '' | 'pending' | 'listed' | 'failed';
}

defineProps<Props>();

const emit = defineEmits<{
  (event: 'filter-change', status: '' | 'pending' | 'listed' | 'failed'): void;
}>();
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}

.stat-filter-card {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.stat-filter-card:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 3px;
}

.stat-filter-card :deep(.stat-card) {
  height: 100%;
}
</style>
