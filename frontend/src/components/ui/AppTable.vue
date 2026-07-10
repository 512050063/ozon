<template>
  <div
    class="app-table-wrapper app-table-wrapper--embedded"
    :class="{ 'app-table-wrapper--empty': showEmptyState }"
  >
    <div class="app-table-scroll overflow-x-auto">
      <table class="app-table">
        <thead class="app-table-header">
          <tr>
            <!-- 序号列 -->
            <th class="app-table-th w-16 center">
              <slot name="header-index">序号</slot>
            </th>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="[
                'app-table-th',
                column.align || 'left',
                column.width ? `w-${column.width}` : '',
                column.minWidth ? `min-w-[${column.minWidth}]` : ''
              ]"
            >
              <slot :name="`header-${column.key}`">
                {{ column.label }}
              </slot>
            </th>
          </tr>
        </thead>
        <tbody class="app-table-body">
          <slot name="body">
            <tr
              v-for="(row, index) in data"
              :key="row.id || index"
              class="app-table-row"
              @click="handleRowClick(row)"
            >
              <!-- 序号列 -->
              <td class="app-table-td w-16 center">
                <slot name="cell-index" :row="row" :index="index">
                  {{ index + 1 }}
                </slot>
              </td>
              <td
                v-for="column in columns"
                :key="column.key"
                :class="[
                  'app-table-td',
                  column.align || 'left',
                  column.width ? `w-${column.width}` : '',
                  column.minWidth ? `min-w-[${column.minWidth}]` : ''
                ]"
              >
                <slot :name="`cell-${column.key}`" :row="row" :index="index">
                  {{ formatValue(row[column.key], column) }}
                </slot>
              </td>
            </tr>
          </slot>
        </tbody>
      </table>
    </div>
    <!-- 空状态 -->
    <div v-if="showEmptyState" class="app-table-empty">
      <slot name="empty">
        <AppEmpty variant="table" :title="tableEmptyTitle" :description="tableEmptyDescription" />
      </slot>
    </div>
    <!-- 加载状态 -->
    <div v-if="showLoadingState" class="app-table-loading">
      <slot name="loading">
        <div class="app-table-skeleton">
          <AppSkeletonLoader variant="table" :rows="6" :columns="columns.length + 1" compact />
          <span v-if="loadingText" class="app-loading-text">{{ loadingText }}</span>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import AppSkeletonLoader from './AppSkeletonLoader.vue';
import AppEmpty from './AppEmpty.vue';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  minWidth?: string;
  formatter?: (value: any, row: any) => string;
}

interface Props {
  columns: Column[];
  data?: any[];
  loading?: boolean;
  emptyText?: string;
  loadingText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  loading: false,
  emptyText: '暂无数据',
  loadingText: '加载中...',
});

const emit = defineEmits<{
  (e: 'row-click', row: any): void;
}>();

// 判断是否使用了自定义body插槽
const showSlotBody = computed(() => {
  return false;
});

const initialEmptyPending = ref(true);
let initialEmptyTimer: ReturnType<typeof setTimeout> | null = null;

const clearInitialEmptyTimer = () => {
  if (initialEmptyTimer) {
    clearTimeout(initialEmptyTimer);
    initialEmptyTimer = null;
  }
};

watch(
  () => [props.loading, props.data.length] as const,
  ([isLoading, rowCount], [wasLoading] = [false, 0]) => {
    clearInitialEmptyTimer();

    if (rowCount > 0) {
      initialEmptyPending.value = false;
      return;
    }

    if (isLoading) {
      initialEmptyPending.value = false;
      return;
    }

    if (wasLoading) {
      initialEmptyPending.value = false;
      return;
    }

    if (initialEmptyPending.value) {
      initialEmptyTimer = setTimeout(() => {
        initialEmptyPending.value = false;
        initialEmptyTimer = null;
      }, 180);
    }
  },
  { immediate: true }
);

onBeforeUnmount(clearInitialEmptyTimer);

const showLoadingState = computed(() =>
  props.loading || (initialEmptyPending.value && props.data.length === 0 && !showSlotBody.value)
);

const showEmptyState = computed(() =>
  props.data.length === 0 && !showLoadingState.value && !showSlotBody.value
);

const tableEmptyTitle = computed(() => (props.emptyText.length > 10 ? '暂无数据' : props.emptyText));
const tableEmptyDescription = computed(() => (props.emptyText.length > 10 ? props.emptyText : '暂无相关数据'));

const handleRowClick = (row: any) => {
  emit('row-click', row);
};

const formatValue = (value: any, column: Column) => {
  if (column.formatter) {
    return column.formatter(value, props.data.find((r: any) => r[column.key] === value));
  }
  return value;
};
</script>

<style scoped>
/* 表格容器 */
.app-table-wrapper {
  width: 100%;
  min-height: 300px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-top: 0 !important;
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(248, 251, 255, 0.72));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.app-table-wrapper--embedded {
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

/* 表格主体 */
.app-table {
  width: 100%;
  min-width: var(--app-table-min-width, 760px);
  border-collapse: separate;
  border-spacing: 0;
}

/* 表头 */
.app-table-header {
  background: var(--app-table-header-bg, #f8fbff) !important;
}

.app-table-th {
  padding: 12px 14px;
  text-align: left;
  font-size: var(--app-table-header-font-size, 12px) !important;
  font-weight: var(--app-table-header-font-weight, 700) !important;
  line-height: var(--app-table-header-line-height, 18px) !important;
  color: var(--app-table-header-color, #334155) !important;
  letter-spacing: 0 !important;
  background: var(--app-table-header-bg, #f8fbff) !important;
  white-space: nowrap;
  border-top: 0 !important;
  border-bottom: 0 !important;
}

/* 表体 */
.app-table-body {
  background-color: rgba(255, 255, 255, 0.96);
}

/* 表格行 */
.app-table-row {
  transition: background-color 0.18s ease, box-shadow 0.18s ease;
}

.app-table-row:hover {
  background-color: #f8fbff;
  box-shadow: inset 3px 0 0 rgba(37, 99, 235, 0.48);
}

/* 表格单元格 */
.app-table-td {
  padding: 11px 14px;
  text-align: left;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  color: #2b3747;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid rgba(241, 245, 249, 0.92);
}

.app-table-scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

/* 加载状态 */
.app-table-loading {
  min-height: 200px;
  padding: 18px 20px 22px;
  background:
    radial-gradient(circle at 50% 10%, rgba(219, 234, 254, 0.22), transparent 30%),
    rgba(255, 255, 255, 0.78);
}

.app-table-skeleton {
  display: flex;
  min-height: 200px;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

.app-loading-text {
  align-self: center;
  color: #94a3b8;
  font-size: 12px;
}

@media (max-width: 1500px) {
  .app-table-th {
    padding: 11px 12px;
  }

  .app-table-td {
    padding: 10px 12px;
  }
}

@media (max-width: 1400px) {
  .app-table-wrapper {
    min-height: 260px;
  }

  .app-table-th {
    padding: 10px 10px;
  }

  .app-table-td {
    padding: 9px 10px;
  }
}
</style>
