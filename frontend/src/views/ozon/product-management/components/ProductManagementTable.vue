<template>
  <div class="app-table-wrapper app-table-wrapper--embedded app-table-scroll app-page-table-scroll overflow-x-auto">
    <table class="app-table product-management-table">
      <thead class="app-table-header app-page-table-head">
        <tr>
          <th class="app-table-th center w-16 min-w-[60px] whitespace-nowrap">序号</th>
          <th class="app-table-th left w-20 min-w-[80px] whitespace-nowrap">商品</th>
          <th class="app-table-th left w-48">货号</th>
          <th class="app-table-th left max-w-[200px]">商品名称 / 类目</th>
          <th class="app-table-th left w-28">状态</th>
          <th class="app-table-th right w-36">价格 / 价格指数</th>
          <th class="app-table-th right w-20">库存</th>
          <th class="app-table-th right w-28">创建时间</th>
          <th class="app-table-th left w-28">操作</th>
        </tr>
      </thead>
      <tbody class="app-table-body">
        <tr v-if="showTableSkeleton">
          <td colspan="9" class="app-table-td relative" style="border-bottom: none;">
            <div class="product-table-skeleton" aria-label="正在加载商品列表">
              <AppSkeletonLoader variant="product-table" :rows="6" compact />
            </div>
          </td>
        </tr>

        <tr v-else-if="dataLoaded && products.length === 0">
          <td colspan="9" class="app-table-td app-table-empty-cell" style="border-bottom: none;">
            <AppEmpty title="暂无产品" description="暂无相关产品数据" variant="table" />
          </td>
        </tr>

        <template v-else-if="dataLoaded && products.length > 0">
          <tr v-for="(product, index) in products" :key="product.id" class="app-table-row">
            <td class="app-table-td center align-middle">
              <span class="text-slate-500">{{ (currentPage - 1) * pageSize + index + 1 }}</span>
            </td>

            <td class="app-table-td align-middle">
              <div class="product-image-box">
                <AppImage :src="getProductImage(product)" alt="商品图片" fit="cover" error-text="加载失败" empty-text="暂无图片" />
              </div>
            </td>

            <td class="app-table-td align-middle text-left">
              <div class="flex flex-col gap-0.5 max-w-[160px]">
                <span class="text-slate-900 font-medium font-mono truncate block" :title="getOfferId(product)">
                  {{ getOfferId(product) }}
                </span>
                <span class="text-slate-500 font-mono truncate block" :title="getSkuDisplay(product)">
                  {{ getSkuDisplay(product) }}
                </span>
              </div>
            </td>

            <td class="app-table-td align-middle text-left max-w-[200px]">
              <el-tooltip
                :content="getProductDisplayName(product)"
                placement="top"
                :show-after="300"
                :disabled="!isProductNameOverflowing(product)"
              >
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span
                    :ref="el => setProductNameElement(product, el)"
                    class="text-slate-900 font-medium truncate"
                  >{{ getProductDisplayName(product) }}</span>
                  <span class="text-slate-500 truncate">{{ getCategoryName(product) }}</span>
                </div>
              </el-tooltip>
            </td>

            <td class="app-table-td align-middle">
              <el-tooltip :placement="getTooltipPlacement(product)" effect="dark" :raw-content="true" :content="getStatusTooltip(product)" :disabled="!hasStatusTooltip(product)" :show-after="300">
                <template #content>
                  <div class="text-xs leading-relaxed max-w-[320px]" v-html="getStatusTooltip(product)"></div>
                </template>
                <div class="flex flex-col items-start gap-0.5">
                  <div class="flex items-center gap-1.5">
                    <span class="px-2 py-1 rounded text-xs font-medium leading-tight whitespace-nowrap" :style="getStatusBadgeStyle(product)">
                      {{ getStatusLabel(product) }}
                    </span>
                    <span
                      v-if="getStatusBadgeCount(product) > 0"
                      class="px-1.5 py-0.5 rounded text-xs font-medium leading-tight min-w-[18px] text-center"
                      :style="getStatusBadgeCountStyle(product)"
                    >
                      {{ getStatusBadgeCount(product) }}
                    </span>
                  </div>
                  <span v-if="getStatusSubtitle(product)" class="text-xs text-slate-400 leading-tight pl-2">
                    {{ getStatusSubtitle(product) }}
                  </span>
                </div>
              </el-tooltip>
            </td>

            <td class="app-table-td align-middle text-right">
              <div class="flex flex-col gap-0.5 items-end">
                <span
                  class="font-semibold text-slate-900"
                >
                  {{ formatPrice(product.price) }} ¥
                </span>
                <span
                  class="text-xs px-1.5 py-0.5 rounded"
                  :style="{ backgroundColor: getColorIndexBg(product), color: getColorIndexColor(product?.product?.ozonOriginalData?.price_indexes?.color_index || '') }"
                >
                  {{ getColorIndexTextShort(product?.product?.ozonOriginalData?.price_indexes?.color_index || '') }}
                </span>
              </div>
            </td>

            <td class="app-table-td align-middle text-right">
              <div v-if="isEditing(product, 'stock')" class="flex items-center justify-end gap-1">
                <el-input-number
                  v-model="editValueModel"
                  :min="0"
                  :step="1"
                  size="small"
                  controls-position="right"
                  style="width: 100px"
                  @keydown.enter.prevent="emit('save-edit', product)"
                  @keydown.esc.prevent="emit('cancel-edit')"
                />
                <el-button size="small" type="primary" :loading="savingEdit" circle @click.stop="emit('save-edit', product)">
                  <el-icon><Check /></el-icon>
                </el-button>
                <el-button size="small" circle @click.stop="emit('cancel-edit')">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
              <div v-else class="flex items-center justify-end">
                <span>{{ product.stock }}</span>
              </div>
            </td>

            <td class="app-table-td align-middle text-right">
              <div class="flex flex-col gap-0.5 items-end">
                <span class="text-slate-900">{{ formatDate(product.ozonCreatedAt || product.createdAt || '') }}</span>
                <span v-if="product.ozonCreatedAt || product.createdAt" class="text-slate-500">
                  {{ formatTime(product.ozonCreatedAt || product.createdAt || '') }}
                </span>
              </div>
            </td>

            <td class="app-table-td align-middle text-left">
              <div class="flex items-center gap-1.5">
                <AppTableButton name="detail" @click="emit('view-product', product)" />
                <el-dropdown
                  trigger="click"
                  popper-class="product-more-dropdown"
                  :disabled="isArchiveOperationProcessing(product)"
                  @command="(cmd: string) => emit('product-command', cmd, product)"
                >
                  <span class="more-btn-wrapper"><AppTableButton name="more" /></span>
                  <template #dropdown>
                    <el-dropdown-menu class="product-action-menu">
                      <el-dropdown-item command="edit">
                        <el-icon><EditPen /></el-icon>编辑
                      </el-dropdown-item>
                      <el-dropdown-item command="price">
                        <el-icon><PriceTag /></el-icon>价格
                      </el-dropdown-item>
                      <el-dropdown-item command="stock">
                        <el-icon><Box /></el-icon>库存
                      </el-dropdown-item>
                      <el-dropdown-item
                        :command="isArchivedProduct(product) ? 'unarchive' : 'archive'"
                        :disabled="isArchiveOperationProcessing(product)"
                      >
                        <el-icon><FolderOpened /></el-icon>{{ getArchiveActionLabel(product) }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>

  <AppPagination
    v-if="dataLoaded"
    :model-value="currentPage"
    :page-size="paginationPageSize"
    :total="totalCount"
    @change="page => emit('page-change', page)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Placement } from 'element-plus';
import { Box, Check, Close, EditPen, FolderOpened, PriceTag } from '@element-plus/icons-vue';
import { AppEmpty, AppImage, AppSkeletonLoader, AppTableButton } from '@/components/ui';
import AppPagination from '@/components/ui/AppPagination.vue';

type ProductField = 'stock';

const props = defineProps<{
  products: any[];
  showTableSkeleton: boolean;
  dataLoaded: boolean;
  currentPage: number;
  pageSize: number;
  paginationPageSize: number;
  totalCount: number;
  editValue: number;
  savingEdit: boolean;
  getProductImage: (product: any) => string;
  getOfferId: (product: any) => string;
  getSkuDisplay: (product: any) => string;
  getProductDisplayName: (product: any) => string;
  isProductNameOverflowing: (product: any) => boolean;
  setProductNameElement: (product: any, element: Element | null) => void;
  getCategoryName: (product: any) => string;
  getTooltipPlacement: (product: any) => Placement;
  getStatusTooltip: (product: any) => string;
  hasStatusTooltip: (product: any) => boolean;
  getStatusBadgeStyle: (product: any) => Record<string, string>;
  getStatusLabel: (product: any) => string;
  getStatusBadgeCount: (product: any) => number;
  getStatusBadgeCountStyle: (product: any) => Record<string, string>;
  getStatusSubtitle: (product: any) => string;
  isEditing: (product: any, field: ProductField) => boolean;
  formatPrice: (price: number) => string;
  getColorIndexBg: (product: any) => string;
  getColorIndexColor: (colorIndex: string) => string;
  getColorIndexTextShort: (colorIndex: string) => string;
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
  isArchiveOperationProcessing: (product: any) => boolean;
  isArchivedProduct: (product: any) => boolean;
  getArchiveActionLabel: (product: any) => string;
}>();

const emit = defineEmits<{
  (event: 'update:editValue', value: number): void;
  (event: 'page-change', page: number): void;
  (event: 'view-product', product: any): void;
  (event: 'product-command', command: string, product: any): void;
  (event: 'start-edit', product: any, field: ProductField, value: number): void;
  (event: 'save-edit', product: any): void;
  (event: 'cancel-edit'): void;
}>();

const editValueModel = computed({
  get: () => props.editValue,
  set: (value: number) => emit('update:editValue', value),
});
</script>

<style scoped>
.product-image-box {
  width: 48px;
  height: 48px;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-image-placeholder {
  width: 100%;
  height: 100%;
  background: #e2e8f0;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.product-table-skeleton {
  min-width: 980px;
  padding: 18px 12px;
}

.product-management-table {
  min-width: 980px;
}
</style>

<style>
.more-btn-wrapper {
  display: inline-flex;
  cursor: pointer;
}

.product-more-dropdown .el-dropdown-menu {
  background-color: #000000 !important;
  border: 1px solid #333333 !important;
  border-radius: 8px !important;
  padding: 4px 0 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
}

.product-more-dropdown .el-dropdown-menu__item {
  color: #e5e7eb !important;
}

.product-more-dropdown .el-dropdown-menu__item:hover,
.product-more-dropdown .el-dropdown-menu__item:focus,
.product-more-dropdown .el-dropdown-menu__item:focus-visible,
.product-more-dropdown .el-dropdown-menu__item.is-focused {
  background-color: #1f2937 !important;
  color: #ffffff !important;
  outline: none !important;
}

.product-more-dropdown .el-dropdown-menu__item .el-icon {
  color: #9ca3af;
  margin-right: 6px;
}

.product-more-dropdown .el-dropdown-menu__item:hover .el-icon,
.product-more-dropdown .el-dropdown-menu__item:focus .el-icon,
.product-more-dropdown .el-dropdown-menu__item:focus-visible .el-icon,
.product-more-dropdown .el-dropdown-menu__item.is-focused .el-icon {
  color: #60a5fa;
}

.product-more-dropdown .el-popper__arrow::before {
  background-color: #000000 !important;
  border-color: #333333 !important;
}
</style>
