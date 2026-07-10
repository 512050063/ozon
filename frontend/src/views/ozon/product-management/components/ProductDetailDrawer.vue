<template>
  <el-drawer v-model="drawerVisible" direction="rtl" size="60%" :with-header="true" :show-close="false">
    <template #header>
      <div class="app-surface-header app-surface-header--drawer">
        <div class="app-surface-icon">
          <el-icon class="text-blue-600 text-lg"><Box /></el-icon>
        </div>
        <div class="app-surface-title-wrapper">
          <span class="app-surface-title">商品详情</span>
          <span v-if="raw" class="app-surface-subtitle">{{ raw.offer_id || raw.product_id || raw.id || '-' }}</span>
        </div>
      </div>
    </template>

    <div v-if="loading" class="app-drawer-content">
      <div class="detail-loading-panel">
        <AppSkeletonLoader variant="form" :rows="7" :show-avatar="true" />
      </div>
    </div>

    <div v-else-if="raw" class="app-drawer-content app-drawer-sections">
      <!-- 1. 产品图片与名称 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-4">
          <span class="w-1 h-4 bg-blue-500 rounded mr-2"></span>
          产品图片
        </h4>
        <div class="flex flex-wrap gap-3 mb-4">
          <div v-for="(img, index) in allImages" :key="index" 
               :class="['rounded-lg overflow-hidden border border-slate-200', index === 0 ? 'w-28 h-28' : 'w-20 h-20']">
            <AppImage :src="img" class="w-full h-full" fit="cover" alt="产品图片" error-text="加载失败" empty-text="暂无图片" />
          </div>
          <div v-if="allImages.length === 0" class="w-28 h-28 rounded-lg overflow-hidden border border-slate-200">
            <AppImage src="" class="w-full h-full" fit="cover" alt="产品图片" empty-text="暂无图片" />
          </div>
        </div>
        <h3 class="text-base font-bold text-slate-900 break-all">
          <span>{{ detailProductName }}</span>
          <span v-if="detailProductNameZh" class="text-sm font-normal text-slate-500 ml-1">({{ detailProductNameZh }})</span>
        </h3>
      </div>

      <!-- 2. Ozon基础信息 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-4">
          <span class="w-1 h-4 bg-blue-500 rounded mr-2"></span>
          Ozon基础信息
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">Ozon商品ID</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.product_id || raw.id || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">内部ID</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.id || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">Offer ID</span>
            <el-tooltip :content="raw.offer_id || '-'" placement="top" :show-after="200">
              <span class="text-xs text-slate-900 truncate ml-2 max-w-[180px]">{{ truncate(raw.offer_id, 30) }}</span>
            </el-tooltip>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">SKU</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.sku || product?.product?.ozonSku || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">类型ID (type_id)</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.type_id || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">类目ID</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.description_category_id || product?.categoryName || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">条形码</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ (raw.barcodes || []).join(', ') || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">可见性</span>
            <el-tag size="small" :type="visibilityTagType(raw.visibility)">{{ raw.visibility || '-' }}</el-tag>
          </div>
        </div>
      </div>

      <!-- 3. 状态信息（含时间） -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-4">
          <span class="w-1 h-4 bg-purple-500 rounded mr-2"></span>
          状态信息
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">状态(status)</span>
            <el-tag size="small" :type="statusTagType(raw.statuses?.status)">{{ raw.statuses?.status || '-' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">状态名称</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.statuses?.status_name || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">中文状态</span>
            <el-tag size="small" :type="statusTagType(product?.status)">{{ product?.statusZh || translateProductStatus(raw.statuses?.status_name) || product?.status || '-' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">状态描述</span>
            <el-tooltip :content="raw.statuses?.status_description || '-'" placement="top" :show-after="200">
              <span class="text-xs text-slate-900 truncate ml-2 max-w-[180px]">{{ truncate(raw.statuses?.status_description, 30) }}</span>
            </el-tooltip>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">状态失败原因</span>
            <span class="text-xs text-red-600 truncate ml-2">{{ raw.statuses?.status_failed || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">状态提示</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.statuses?.status_tooltip || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">审核状态</span>
            <el-tag size="small" :type="getModerateStatusType(raw.statuses?.moderate_status)">{{ translateModerateStatus(raw.statuses?.moderate_status) || '-' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">校验状态</span>
            <el-tag size="small" :type="getValidationStatusType(raw.statuses?.validation_status)">{{ translateValidationStatus(raw.statuses?.validation_status) || '-' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">是否已创建</span>
            <el-tag size="small" :type="raw.statuses?.is_created ? 'success' : 'info'">{{ raw.statuses?.is_created ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">状态更新时间</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(raw.statuses?.status_updated_at) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">创建时间</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(raw.created_at) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">更新时间</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(raw.updated_at) }}</span>
          </div>
        </div>
      </div>

      <!-- 4. 价格信息 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-4">
          <span class="w-1 h-4 bg-green-500 rounded mr-2"></span>
          价格信息
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">当前价格</span>
            <span class="text-xs font-semibold text-green-600 truncate ml-2">{{ currencySymbol(raw.currency_code) }}{{ formatPrice(raw.price) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">原价(old_price)</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.old_price ? currencySymbol(raw.currency_code) + formatPrice(raw.old_price) : '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">最低价格(min_price)</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.min_price ? currencySymbol(raw.currency_code) + formatPrice(raw.min_price) : '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">货币代码</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.currency_code || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">增值税(VAT)</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.vat || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">是否打折</span>
            <el-tag size="small" :type="raw.is_discounted ? 'warning' : 'info'">{{ raw.is_discounted ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">价格指数</span>
            <span class="text-xs px-1.5 py-0.5 rounded"
              :style="{ backgroundColor: getPriceIndexBg(raw.price_indexes?.color_index), color: getPriceIndexColor(raw.price_indexes?.color_index) }">
              {{ getPriceIndexText(raw.price_indexes?.color_index) }}
            </span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">体积重量</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.volume_weight || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 5. 库存信息 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-4">
          <span class="w-1 h-4 bg-orange-500 rounded mr-2"></span>
          库存信息
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">总库存(DB)</span>
            <span class="text-xs text-slate-900 truncate ml-2 font-medium">{{ product?.product?.totalStock ?? product?.stock ?? 0 }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">FBO库存(DB)</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ product?.product?.stockFbo ?? 0 }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">FBS库存(DB)</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ product?.product?.stockFbs ?? 0 }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">是否有库存(API)</span>
            <el-tag size="small" :type="raw.stocks?.has_stock ? 'success' : 'info'">{{ raw.stocks?.has_stock ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">折扣FBO库存</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ raw.discounted_fbo_stocks ?? 0 }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">本地库存</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ product?.stock ?? 0 }}</span>
          </div>
          <div v-if="raw.stocks?.stocks?.length" class="col-span-2">
            <span class="text-xs text-slate-500">stocks.stocks 详情</span>
            <div class="mt-2 grid grid-cols-2 gap-x-10 gap-y-3">
              <template v-for="(s, idx) in raw.stocks.stocks" :key="idx">
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">仓库</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ s.warehouse_name || s.warehouse_id || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0"></div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">现有</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ s.present ?? 0 }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">预留</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ s.reserved ?? 0 }}</span>
                </div>
              </template>
            </div>
          </div>
            <div v-else class="text-xs text-slate-400 mt-1">无详细库存数据</div>
        </div>
      </div>

      <!-- 6. 归档与特殊标记 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-4">
          <span class="w-1 h-4 bg-red-500 rounded mr-2"></span>
          归档与特殊标记
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">是否归档</span>
            <el-tag size="small" :type="raw.is_archived ? 'danger' : 'success'">{{ raw.is_archived ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">是否自动归档</span>
            <el-tag size="small" :type="raw.is_autoarchived ? 'warning' : 'info'">{{ raw.is_autoarchived ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">是否季节性</span>
            <el-tag size="small" :type="raw.is_seasonal ? 'warning' : 'info'">{{ raw.is_seasonal ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">是否KGT</span>
            <el-tag size="small" :type="raw.is_kgt ? 'warning' : 'info'">{{ raw.is_kgt ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">是否Super商品</span>
            <el-tag size="small" :type="raw.is_super ? 'success' : 'info'">{{ raw.is_super ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">是否允许预付款</span>
            <el-tag size="small" :type="raw.is_prepayment_allowed ? 'success' : 'info'">{{ raw.is_prepayment_allowed ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">有折扣FBO商品</span>
            <el-tag size="small" :type="raw.has_discounted_fbo_item ? 'warning' : 'info'">{{ raw.has_discounted_fbo_item ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">归档类型(DB)</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ product?.archiveType || '-' }}</span>
          </div>
        </div>
      </div>

<!-- 10. 错误信息 -->
      <!-- 10. 错误信息 -->
      <div v-if="raw.errors?.length" class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-4">
          <span class="w-1 h-4 bg-red-500 rounded mr-2"></span>
          错误信息 ({{ raw.errors.length }})
        </h4>
        <div class="space-y-2 max-h-[300px] overflow-y-auto">
          <div v-for="(err, idx) in raw.errors" :key="idx" class="text-xs p-3 bg-white rounded-lg border border-slate-200">
            <div class="flex items-start gap-2">
              <el-tag size="small" :type="err.level === 'ERROR_LEVEL_ERROR' ? 'danger' : 'warning'" class="flex-shrink-0">
                {{ err.level === 'ERROR_LEVEL_ERROR' ? 'ERROR' : 'WARNING' }}
              </el-tag>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-slate-900 break-all">{{ err.texts?.message || err.code || '-' }}</div>
                <div v-if="err.texts?.description" class="text-slate-500 mt-1 break-all">{{ err.texts.description }}</div>
                <div v-if="err.texts?.attribute_name" class="text-slate-400 mt-1">属性: {{ err.texts.attribute_name }}</div>
                <div v-if="err.field" class="text-slate-400 mt-1">字段: {{ err.field }}</div>
                <div class="text-slate-400 mt-1">错误码: {{ err.code }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 11. 佣金信息 -->
      <div v-if="raw.commissions?.length" class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-4">
          <span class="w-1 h-4 bg-yellow-500 rounded mr-2"></span>
          佣金信息
        </h4>
        <el-table :data="commissionTableData" size="small" border stripe class="w-full">
          <el-table-column prop="sale_schema" label="销售方案" min-width="100" />
          <el-table-column prop="value" label="佣金值" min-width="80" align="right" />
          <el-table-column prop="percent" label="百分比" min-width="80" align="right" />
          <el-table-column prop="return_amount" label="退货金额" min-width="90" align="right" />
          <el-table-column prop="delivery_amount" label="配送金额" min-width="90" align="right" />
        </el-table>
      </div>


<!-- 12. 原始API数据（可折叠） -->
      <div class="bg-slate-50 rounded-lg p-4">
        <div class="flex items-center justify-between cursor-pointer" @click="showRawData = !showRawData">
          <h4 class="text-[13px] font-semibold text-slate-700 flex items-center">
            <span class="w-1 h-4 bg-slate-400 rounded mr-2"></span>
            原始API数据
          </h4>
          <el-icon class="text-slate-400 transition-transform" :class="{ 'rotate-180': showRawData }"><ArrowDown /></el-icon>
        </div>
        <div v-show="showRawData" class="mt-3">
          <pre class="bg-slate-100 text-slate-700 text-[11px] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto border border-slate-200 text-left">{{ formattedJson }}</pre>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Box, ArrowDown } from '@element-plus/icons-vue';
import { AppImage, AppSkeletonLoader } from '@/components/ui';
import { translateProductStatus, translateModerateStatus, translateValidationStatus } from '@/utils/translation';

interface Props {
  visible: boolean;
  product: any;
  loading: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  product: null,
  loading: false,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const drawerVisible = computed({
  get: () => props.visible,
  set: (val: boolean) => emit('update:visible', val),
});

const showRawData = ref(false);

// 解析原始数据
const raw = computed(() => {
  if (!props.product) return null;
  const p = props.product.product || props.product;
  let data = p?.ozonOriginalData;
  if (!data) return null;
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch { return null; }
});

const detailProductName = computed(() => raw.value?.name || props.product?.name || '-');
const detailProductNameZh = computed(() => props.product?.product?.titleTranslated || props.product?.nameZh || '');

const normalizeImageList = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap(item => normalizeImageList(item))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (typeof value === 'object') {
    return normalizeImageList(value.url || value.src || value.fileUrl || value.imageUrl || value.image);
  }
  return [];
};

// 所有图片（primary_image + images）
const allImages = computed(() => {
  if (!raw.value) return [];
  const imgs: string[] = [];
  imgs.push(...normalizeImageList(raw.value.primary_image));
  imgs.push(...normalizeImageList(raw.value.images));
  // 去重
  return [...new Set(imgs)];
});

// ========== 标签类型 ==========
const visibilityTagType = (v?: string): string => {
  const map: Record<string, string> = { 'VISIBLE': 'success', 'INVISIBLE': 'warning', 'ARCHIVED': 'info', 'EMPTY': 'info' };
  return map?.[v || ''] || 'info';
};

const statusTagType = (status: string): string => {
  const map: Record<string, string> = {
    'selling': 'success', 'listed': 'success', 'on_sale': 'success',
    'pending': 'warning', 'ready': 'warning', 'new': 'warning',
    'error': 'danger', 'failed': 'danger',
    'moderating': 'warning',
    'unlisted': 'info', 'archived': 'info',
  };
  return map?.[status] || 'info';
};

const getModerateStatusType = (status?: string): any => {
  if (status === 'approved') return 'success';
  if (status === 'pending' || status === 'moderating') return 'warning';
  return 'info';
};

const getValidationStatusType = (status?: string): any => {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  return 'info';
};

// ========== 文本截断 ==========
const truncate = (val: any, maxLen: number): string => {
  const str = String(val ?? '-');
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
};

// 货币符号
const currencySymbol = (code?: string): string => {
  const map: Record<string, string> = { 'RUB': '₽', 'CNY': '￥', 'USD': '$', 'EUR': '€', 'KZT': '₸', 'BYN': 'Br' };
  return map?.[code || ''] || (code || '');
};

// 价格指数映射
const getPriceIndexText = (colorIndex?: string): string => {
  if (!colorIndex) return '没有指数';
  if (colorIndex.includes('GREEN')) return '有利';
  if (colorIndex.includes('YELLOW')) return '不利';
  if (colorIndex.includes('RED')) return '不利';
  if (colorIndex.includes('WITHOUT_INDEX')) return '没有指数';
  return '没有指数';
};

const getPriceIndexColor = (colorIndex?: string): string => {
  if (!colorIndex) return '#94a3b8';
  if (colorIndex.includes('GREEN')) return '#22c55e';
  if (colorIndex.includes('YELLOW')) return '#eab308';
  if (colorIndex.includes('RED')) return '#ef4444';
  return '#94a3b8';
};

const getPriceIndexBg = (colorIndex?: string): string => {
  if (!colorIndex) return '#f3f4f6';
  if (colorIndex.includes('GREEN')) return '#dcfce7';
  if (colorIndex.includes('YELLOW')) return '#fef9c3';
  if (colorIndex.includes('RED')) return '#fee2e2';
  return '#f3f4f6';
};

// ========== 格式化 ==========
const formatDateTime = (val: any): string => {
  if (!val) return '-';
  try { return new Date(val).toLocaleString('zh-CN'); }
  catch { return String(val); }
};

const formatPrice = (price: any): string => {
  if (!price || price === '' || price === '0' || price === 0) return '-';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num) || num === 0) return '-';
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ========== 佣金表格数据 ==========
const commissionTableData = computed(() => {
  if (!raw.value?.commissions) return [];
  return raw.value.commissions.map((c: any) => ({
    value: c.value ?? '-',
    percent: c.percent != null ? c.percent + '%' : '-',
    sale_schema: c.sale_schema || '-',
    return_amount: c.return_amount ?? '-',
    delivery_amount: c.delivery_amount ?? '-',
  }));
});

// ========== JSON格式化 ==========
const formattedJson = computed(() => {
  if (!raw.value) return '';
  try {
    return JSON.stringify(raw.value, null, 2)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  } catch { return ''; }
});
</script>

<style scoped>
.detail-loading-panel {
  min-height: 520px;
  padding: 18px;
  border-radius: 10px;
  background: #f8fafc;
}
</style>
