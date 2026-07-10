<template>
  <el-drawer
    :model-value="visible"
    direction="rtl"
    size="60%"
    :with-header="true"
    :show-close="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="app-surface-header app-surface-header--drawer">
        <div class="app-surface-icon">
          <el-icon class="text-blue-600 text-lg"><Document /></el-icon>
        </div>
        <div class="app-surface-title-wrapper">
          <span class="app-surface-title">活动商品详情</span>
          <span class="app-surface-subtitle">
            {{ product ? product.offerId || String(product.productId || product.id || '') : '' }}
          </span>
        </div>
      </div>
    </template>

    <div v-if="product" class="app-drawer-content app-drawer-sections">
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-indigo-500 rounded mr-2"></span>
          商品明细
        </h4>
        <div class="flex items-start justify-between gap-6">
          <div class="flex items-center gap-4 min-w-0">
            <AppImage
              :src="product.image"
              :alt="getProductDisplayName(product)"
              fit="cover"
              class="promotion-detail-product-image"
              empty-text="暂无图片"
              error-text="加载失败"
            />
            <div class="flex-1 min-w-0">
              <div class="text-xs text-slate-700 font-medium leading-relaxed line-clamp-2 break-all">
                {{ getProductDisplayName(product) }}
              </div>
              <div class="flex items-center mt-1">
                <span class="text-[10px] text-slate-500 truncate">OfferId: {{ product.offerId || '-' }}</span>
              </div>
              <div class="flex items-center mt-1">
                <span class="text-[10px] text-slate-500 truncate">SKU: {{ product.sku || product.productId || '-' }}</span>
              </div>
            </div>
          </div>
          <div class="promotion-detail-side">
            <span class="text-[10px] text-slate-500">ID: {{ product.productId || product.id || '-' }}</span>
            <el-tag size="small" type="info" effect="plain" class="promotion-detail-type-tag">{{ getProductTypeDisplay(product) }}</el-tag>
            <span class="text-xs font-semibold text-slate-900">{{ formatMoney(product.price) }}</span>
          </div>
        </div>
      </div>

      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-green-500 rounded mr-2"></span>
          价格信息
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">您的价格</span>
            <span class="text-xs text-slate-900 font-medium truncate ml-2">{{ formatMoney(product.price) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">最低价格</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatMoney(getMinPrice(product)) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">当前促销价</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatMoney(getCurrentPromotionPrice(product)) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">当前促销折扣</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatPercent(getCurrentPromotionDiscount(product)) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">该促销活动价格</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatMoney(getPromotionPrice(product)) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">本次促销折扣</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatPercent(getActivityDiscount(product)) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">本次促销优惠额</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatMoney(getActivityDiscountAmount(product)) }}</span>
          </div>
        </div>
      </div>

      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-violet-500 rounded mr-2"></span>
          促销信息
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">促销提升</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatPercent(getPromotionBoost(product)) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">提升价格最小</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatMoney(getLiftPriceMin(product)) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">提升价格最大</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatMoney(getLiftPriceMax(product)) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">促销活动中的商品数量</span>
            <span class="text-xs text-slate-900 truncate ml-2">
              {{ getPromotionProductCountDisplay(product).main }}
            </span>
          </div>
        </div>
      </div>

      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-cyan-500 rounded mr-2"></span>
          数据分析
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">过去7天订购商品数量</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatNumberText(getSevenDayOrders(product)) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">过去7天展示总数</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatNumberText(getSevenDayViews(product)) }}</span>
          </div>
        </div>
      </div>

      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-amber-500 rounded mr-2"></span>
          库存与限制
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">活动库存</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ product.stock ?? '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">最低库存</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ product.minStock ?? '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">在Ozon仓库中</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ getOzonWarehouseStockDisplay(product) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">在我的仓库中</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ getOwnWarehouseStockDisplay(product) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">还需要销售</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ getRequiredSalesDisplay(product) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">存在于其他促销活动中</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ getOtherPromotionsDisplay(product) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">限制</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ getLimitDisplay(product) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">错误</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ getErrorDisplay(product) }}</span>
          </div>
        </div>
      </div>

      <div class="bg-slate-50 rounded-lg p-4">
        <div class="flex items-center justify-between cursor-pointer" @click="$emit('update:showRawProductData', !showRawProductData)">
          <h4 class="text-[13px] font-semibold text-slate-700 flex items-center">
            <span class="w-1 h-4 bg-slate-400 rounded mr-2"></span>
            原始API数据
          </h4>
          <el-icon class="text-slate-400 transition-transform" :class="{ 'rotate-180': showRawProductData }"><ArrowDown /></el-icon>
        </div>
        <div v-show="showRawProductData" class="mt-3">
          <pre class="bg-slate-100 text-slate-700 text-[11px] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto border border-slate-200 text-left">{{ formattedRawProduct }}</pre>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ArrowDown, Document } from '@element-plus/icons-vue';
import { AppImage } from '@/components/ui';
import type { OzonPromotionProduct } from '@/api/ozonPromotionAPI';

type ProductCountDisplay = {
  main: string;
  sub?: string;
};

defineProps<{
  visible: boolean;
  product: OzonPromotionProduct | null;
  showRawProductData: boolean;
  formattedRawProduct: string;
  getProductDisplayName: (row: OzonPromotionProduct) => string;
  getProductTypeDisplay: (row: OzonPromotionProduct) => string;
  formatMoney: (value: unknown) => string;
  formatPercent: (value: unknown) => string;
  formatNumberText: (value: unknown) => string;
  getMinPrice: (row: OzonPromotionProduct) => number | null;
  getCurrentPromotionPrice: (row: OzonPromotionProduct) => number | null;
  getCurrentPromotionDiscount: (row: OzonPromotionProduct) => number | null;
  getPromotionPrice: (row: OzonPromotionProduct) => number | null;
  getActivityDiscount: (row: OzonPromotionProduct) => number | null;
  getActivityDiscountAmount: (row: OzonPromotionProduct) => number | null;
  getPromotionBoost: (row: OzonPromotionProduct) => number | null;
  getLiftPriceMin: (row: OzonPromotionProduct) => number | null;
  getLiftPriceMax: (row: OzonPromotionProduct) => number | null;
  getPromotionProductCountDisplay: (row: OzonPromotionProduct) => ProductCountDisplay;
  getSevenDayOrders: (row: OzonPromotionProduct) => unknown;
  getSevenDayViews: (row: OzonPromotionProduct) => unknown;
  getOzonWarehouseStockDisplay: (row: OzonPromotionProduct) => string;
  getOwnWarehouseStockDisplay: (row: OzonPromotionProduct) => string;
  getRequiredSalesDisplay: (row: OzonPromotionProduct) => string;
  getOtherPromotionsDisplay: (row: OzonPromotionProduct) => string;
  getLimitDisplay: (row: OzonPromotionProduct) => string;
  getErrorDisplay: (row: OzonPromotionProduct) => string;
}>();

defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'update:showRawProductData', value: boolean): void;
}>();
</script>

<style scoped>
.promotion-detail-product-image {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  flex-shrink: 0;
  background: #ffffff;
}

.promotion-detail-side {
  min-width: 140px;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.promotion-detail-type-tag {
  max-width: 180px;
}

.promotion-detail-type-tag :deep(.el-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
