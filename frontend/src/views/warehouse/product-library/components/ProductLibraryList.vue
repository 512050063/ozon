<template>
  <AppTable
    class="app-page-table-scroll"
    :columns="columns"
    :data="loading ? [] : productLibrary"
    :loading="loading"
    :empty-text="'暂无商品信息'"
  >
    <template #cell-info="{ row }">
      <div class="flex items-center">
        <div class="h-10 w-10 bg-cyan-50 rounded-lg flex items-center justify-center overflow-hidden mr-3">
          <AppImage :src="row.imageUrl" :alt="row.name" error-text="加载失败" empty-text="暂无图片" />
        </div>
        <div class="product-info">
          <div class="table-main-text" :title="row.name">{{ row.name }}</div>
          <div v-if="row.variantSummary" class="table-sub-text table-sub-text-blue" :title="row.variantSummary">
            {{ row.variantSummary }}
          </div>
          <div class="table-sub-text product-category" :title="displayCategory(row)">
            {{ displayCategory(row) }}
          </div>
        </div>
      </div>
    </template>
    <template #cell-model="{ row }">
      <div>
        <div class="table-main-text" :title="row.offerId || row.alibabaId || '-'">{{ row.offerId || row.alibabaId || '-' }}</div>
        <div class="table-sub-text" :title="row.sku || '-'">{{ row.sku || '-' }}</div>
      </div>
    </template>
    <template #cell-price="{ row }">
      <span class="table-main-text">¥{{ row.price.toFixed(2) }}</span>
    </template>
    <template #cell-source="{ row }">
      <button
        v-if="row.supplySource"
        class="app-table-tag app-table-tag--blue app-table-tag--clickable source-tag"
        title="编辑1688货源绑定"
        @click.stop="handleEditSource(row)"
      >
        1688货源
      </button>
      <button
        v-else
        class="app-table-tag app-table-tag--info app-table-tag--clickable source-tag"
        title="绑定货源"
        @click.stop="handleEditSource(row)"
      >
        无货源
      </button>
    </template>
    <template #cell-status="{ row }">
      <el-tooltip
        :content="getStatusDetail(row) || getStatusTooltip(row)"
        placement="top"
        :popper-class="getStatusDetail(row) ? 'status-detail-tooltip' : ''"
        :show-after="80"
      >
        <button
          :class="[
            'app-table-tag',
            'app-table-tag--clickable',
            'status-pill',
            getStatusClass(row.status),
            'status-pill-clickable'
          ]"
          @click.stop="handleStatusAction(row)"
        >
          {{ getStatusLabel(row.status) }}
        </button>
      </el-tooltip>
    </template>
    <template #cell-action="{ row }">
      <div class="flex items-center gap-2" @click.stop>
        <AppTableButton name="edit" :disabled="isActionLocked(row)" @click="handleEdit(row)" />
        <AppTableButton
          name="delete"
          delete-confirm-text="确认删除该商品吗？"
          :disabled="isActionLocked(row)"
          @click="handleDelete(row)"
        />
      </div>
    </template>
  </AppTable>
  <!-- 分页 -->
  <AppPagination 
    v-if="total > 0"
    :model-value="currentPage" 
    :total="total" 
    :page-size="pageSize" 
    @change="handlePageChange" 
  />
</template>

<script setup lang="ts">
import AppPagination from '@/components/ui/AppPagination.vue';
import { AppTable, AppImage, AppTableButton } from '@/components/ui';
import type { ProductSupplyItem } from '@/api/productSupplyAPI';
import ozonCategoriesRaw from '@/assets/ozonCategories.json';

interface OzonType { type_id: number; type_name: string; disabled: boolean }
interface OzonSubCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonType[] }
interface OzonTopCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonSubCat[] }

const ozonCategories = (ozonCategoriesRaw as any).result as OzonTopCat[];

// 表格列配置
const columns = [
  { key: 'info', label: '商品信息', align: 'left' as const },
  { key: 'model', label: '型号/货号', align: 'left' as const },
  { key: 'price', label: '价格', align: 'left' as const },
  { key: 'source', label: '货源', align: 'left' as const },
  { key: 'status', label: '状态', align: 'left' as const },
  { key: 'action', label: '操作', align: 'left' as const },
];

interface Props {
  productLibrary: ProductSupplyItem[];
  loading?: boolean;
  searchKeyword: string;
  currentPage: number;
  pageSize: number;
  statusFilter: string;
  total: number;
}

interface Emits {
  (e: 'view-source', product: ProductSupplyItem): void;
  (e: 'delete', product: ProductSupplyItem): void;
  (e: 'edit', product: ProductSupplyItem): void;
  (e: 'edit-source', product: ProductSupplyItem): void;
  (e: 'list-to-ozon', product: ProductSupplyItem): void;
  (e: 'check-status', product: ProductSupplyItem): void;
  (e: 'page-change', page: number): void;
  (e: 'page-size-change', size: number): void;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  pageSize: 10,
  statusFilter: ''
});

const emit = defineEmits<Emits>();

const buildCategoryPath = (descriptionCategoryId?: number | null, typeId?: number | null, fallback = '') => {
  const subId = Number(descriptionCategoryId || 0);
  const leafTypeId = Number(typeId || 0);
  if (subId && leafTypeId) {
    for (const top of ozonCategories) {
      const sub = top.children?.find(item => item.description_category_id === subId);
      if (!sub) continue;
      const type = sub.children?.find(item => item.type_id === leafTypeId);
      if (!type) continue;
      return [top.category_name, sub.category_name, type.type_name].filter(Boolean).join(' > ');
    }
  }
  const fallbackName = fallback.trim();
  if (fallbackName && !fallbackName.includes('>')) {
    for (const top of ozonCategories) {
      for (const sub of top.children || []) {
        const type = sub.children?.find(item => item.type_name.trim() === fallbackName);
        if (type) {
          return [top.category_name, sub.category_name, type.type_name].filter(Boolean).join(' > ');
        }
      }
    }
  }
  return fallbackName;
};

const displayCategory = (product: ProductSupplyItem) => {
  const category = product.category ? product.category.trim() : '';
  if (category.includes('>')) return category;
  return buildCategoryPath(product.descriptionCategoryId, product.typeId, category) || '-';
};

// 页面变化
const handlePageChange = (page: number) => {
  emit('page-change', page);
};

// 编辑操作
const handleEdit = (product: ProductSupplyItem) => {
  if (isActionLocked(product)) return;
  emit('edit', product);
};

// 删除操作
const handleDelete = (product: ProductSupplyItem) => {
  if (isActionLocked(product)) return;
  emit('delete', product);
};

const handleEditSource = (product: ProductSupplyItem) => {
  emit('edit-source', product);
};

// 上架操作
const handleListToOzon = (product: ProductSupplyItem) => {
  emit('list-to-ozon', product);
};

// 查询状态操作
const handleCheckStatus = (product: ProductSupplyItem) => {
  emit('check-status', product);
};

const isActionLocked = (product: ProductSupplyItem) => ['listing', 'listed'].includes(product.status);

const handleStatusAction = (product: ProductSupplyItem) => {
  if (product.status === 'listing') {
    handleCheckStatus(product);
    return;
  }
  handleListToOzon(product);
};

// 状态标签映射
const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待上架',
    listing: '上架中',
    listed: '已上架',
    failed: '错误',
    draft: '待完善'
  };
  return map[status] || status;
};

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'app-table-tag--warning',
    listing: 'app-table-tag--blue',
    listed: 'app-table-tag--success',
    failed: 'app-table-tag--danger',
    draft: 'app-table-tag--info'
  };
  return map[status] || 'app-table-tag--info';
};

const getStatusTooltip = (product: ProductSupplyItem) => {
  const map: Record<string, string> = {
    pending: '点击提交到Ozon平台',
    listing: '点击查询Ozon处理状态',
    listed: '点击查看上架确认',
    failed: '点击重新提交到Ozon平台',
    draft: '点击查看上架确认'
  };
  return map[product.status] || product.status;
};

const normalizeErrorText = (error: unknown): string => {
  if (error === null || error === undefined || error === '') return '';
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (trimmed === '[object Object]') {
      return '历史错误信息无法解析，请重新查询状态或重新提交后查看最新错误原因';
    }
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return normalizeErrorText(JSON.parse(trimmed));
      } catch {
        return error;
      }
    }
    return error;
  }
  if (Array.isArray(error)) {
    return error.map(normalizeErrorText).filter(Boolean).join('; ');
  }
  if (typeof error === 'object') {
    const value = error as Record<string, any>;
    const directMessage = value.message || value.error || value.reason || value.description || value.detail;
    if (directMessage) return normalizeErrorText(directMessage);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(error);
};

const getStatusDetail = (product: ProductSupplyItem) => {
  const parts: string[] = [];
  if (product.listingSubmittedAt) {
    parts.push(`提交时间: ${formatFullTime(product.listingSubmittedAt)}`);
  }
  if (product.listedAt) {
    parts.push(`上架时间: ${formatFullTime(product.listedAt)}`);
  }
  const errorText = normalizeErrorText(product.listingError);
  if (product.status === 'failed' && errorText) {
    parts.push(`错误信息: ${errorText}`);
  }
  return parts.join('\n');
};

const formatFullTime = (timeStr: string) => {
  if (!timeStr) return '-';
  const d = new Date(timeStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
</script>

<style scoped>
.product-info {
  min-width: 0;
  max-width: 460px;
}
.table-main-text {
  max-width: 100%;
  overflow: hidden;
  color: #1f2937;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.table-sub-text {
  max-width: 100%;
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  font-weight: 400;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.table-sub-text-blue {
  color: #2563eb;
}
.product-category {
  max-width: 460px;
}
.status-time {
  max-width: 120px;
  margin-top: 4px;
  overflow: hidden;
  color: #94a3b8;
  font-size: 10px;
  line-height: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-time-success {
  color: #22c55e;
}
.status-time-error {
  color: #ef4444;
}
:global(.status-detail-tooltip) {
  max-width: 520px;
  white-space: pre-line;
  line-height: 20px;
  text-align: left;
}
.source-tag {
  min-width: 76px;
}
.source-tag:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.status-pill {
  min-width: 64px;
}
.status-pill-clickable {
  cursor: pointer;
}
</style>
