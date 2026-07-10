<template>
  <div v-if="total > 0" class="app-pagination">
    <div class="app-pagination-info">
      显示 {{ total }} 条，共 {{ totalPages }} 页
    </div>

    <div class="app-pagination-controls">
      <button
        class="app-pagination-button app-pagination-button--text"
        :disabled="modelValue <= 1"
        @click="handleChange(modelValue - 1)"
      >
        上一页
      </button>

      <div class="app-pagination-pages">
        <template v-for="item in visiblePages" :key="item.key">
          <span v-if="item.type === 'ellipsis'" class="app-pagination-ellipsis">...</span>
          <button
            v-else
            class="app-pagination-button app-pagination-button--page"
            :class="{ 'is-active': modelValue === item.page }"
            @click="handleChange(item.page)"
          >
            {{ item.page }}
          </button>
        </template>
      </div>

      <button
        class="app-pagination-button app-pagination-button--text"
        :disabled="modelValue >= totalPages"
        @click="handleChange(modelValue + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  /** 当前页（v-model） */
  modelValue: number;
  /** 数据总条数 */
  total: number;
  /** 每页条数 */
  pageSize: number;
  /** 最多显示几个页码按钮，默认 5 */
  maxVisible?: number;
}>();

const emit = defineEmits<{
  (e: 'change', page: number): void;
  (e: 'update:modelValue', page: number): void;
}>();

/** 总页数 */
const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.total / props.pageSize))
);

type PageItem =
  | { type: 'page'; key: string; page: number }
  | { type: 'ellipsis'; key: string };

/** 窗口内可见的页码列表，首尾页保留，页数多时用省略号收起 */
const visiblePages = computed(() => {
  const pages: PageItem[] = [];
  const max = props.maxVisible ?? 5;
  const total = totalPages.value;

  if (total <= max + 2) {
    for (let i = 1; i <= total; i++) {
      pages.push({ type: 'page', key: `page-${i}`, page: i });
    }
    return pages;
  }

  pages.push({ type: 'page', key: 'page-1', page: 1 });

  const middleCount = Math.max(3, max);
  let start = Math.max(2, props.modelValue - Math.floor(middleCount / 2));
  let end = Math.min(total - 1, start + middleCount - 1);

  if (end - start + 1 < middleCount) {
    start = Math.max(2, end - middleCount + 1);
  }

  if (start > 2) {
    pages.push({ type: 'ellipsis', key: 'ellipsis-left' });
  }

  for (let i = start; i <= end; i++) {
    pages.push({ type: 'page', key: `page-${i}`, page: i });
  }

  if (end < total - 1) {
    pages.push({ type: 'ellipsis', key: 'ellipsis-right' });
  }

  pages.push({ type: 'page', key: `page-${total}`, page: total });
  return pages;
});

const handleChange = (page: number) => {
  const nextPage = Math.max(1, Math.min(totalPages.value, page));
  if (nextPage === props.modelValue) {
    return;
  }
  emit('update:modelValue', nextPage);
  emit('change', nextPage);
};
</script>

<style scoped>
.app-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 62px;
  padding: 14px 20px;
  border-top: 1px solid rgba(226, 232, 240, 0.78);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.86));
}

.app-pagination-info {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.app-pagination-controls,
.app-pagination-pages {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.app-pagination-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  border: 1px solid rgba(203, 213, 225, 0.88);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.app-pagination-button--text {
  min-width: 62px;
  padding: 0 10px;
}

.app-pagination-button--page {
  min-width: 30px;
  padding: 0 8px;
}

.app-pagination-button:hover:not(:disabled):not(.is-active) {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
  box-shadow: 0 5px 12px rgba(37, 99, 235, 0.1);
  transform: translateY(-1px);
}

.app-pagination-button.is-active {
  border-color: transparent;
  background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
  color: #ffffff;
  box-shadow: 0 7px 16px rgba(37, 99, 235, 0.22);
}

.app-pagination-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.app-pagination-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 30px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1;
}

@media (max-width: 720px) {
  .app-pagination {
    align-items: flex-start;
    flex-direction: column;
  }

  .app-pagination-controls {
    width: 100%;
    justify-content: flex-end;
    overflow-x: auto;
  }
}
</style>
