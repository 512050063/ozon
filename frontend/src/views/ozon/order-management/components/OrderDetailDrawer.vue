<template>
  <el-drawer v-model="drawerVisible" direction="rtl" size="60%" :with-header="true" :show-close="false">
    <template #header>
      <div class="app-surface-header app-surface-header--drawer">
        <div class="app-surface-icon">
          <el-icon class="text-blue-600 text-lg"><Document /></el-icon>
        </div>
        <div class="app-surface-title-wrapper">
          <span class="app-surface-title">订单详情</span>
          <span v-if="order" class="app-surface-subtitle">{{ order.postingNumber }}</span>
        </div>
      </div>
    </template>

    <div v-if="order" class="app-drawer-content app-drawer-sections">
      <!-- 1. 订单基础信息 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-blue-500 rounded mr-2"></span>
          订单基础信息
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">Ozon订单ID</span>
            <span class="text-xs text-slate-900 font-medium truncate ml-2">{{ formatRawValue(order.raw?.order_id) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">订单号</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.order_number) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">发货单号</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ order.postingNumber || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">父发货单号</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.parent_posting_number) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">客户姓名</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatCustomerName(order.raw?.customer) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">客户电话</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.customer?.phone) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">客户邮箱</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.customer?.email) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">目的地</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.destination_place_name) || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 2. 状态与时间线 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-violet-500 rounded mr-2"></span>
          状态与时间线
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">状态</span>
            <el-tag size="small" :type="statusTagType(order.status)">{{ statusLabel(order.status) }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">子状态</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.substatus) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">前一子状态</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.previous_substatus) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">进入处理</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(order.inProcessAt) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">开始配送</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(order.raw?.delivering_date) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">实际签收</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(order.raw?.fact_delivery_date) || formatDateTime(order.deliveredAt) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">计划发货</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(order.raw?.shipment_date) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">无延迟发货</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(order.raw?.shipment_date_without_delay) }}</span>
          </div>
        </div>
      </div>

      <!-- 3. 商品明细 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-indigo-500 rounded mr-2"></span>
          商品明细
        </h4>
        <div v-for="(product, idx) in (order.raw?.products || order.products || [])" :key="product.sku || product.offer_id || idx" class="border-b border-slate-200 last:border-b-0 pb-4 mb-4 last:pb-0 last:mb-0">
          <!-- 商品信息 -->
          <div class="flex items-center gap-4">
            <!-- 图片（垂直居中） -->
            <AppImage
              :src="getProductImage(product)"
              fit="cover"
              class="order-detail-product-image"
              :alt="getTranslatedName(product.name)"
              error-text="加载失败"
              empty-text="暂无图片"
            />
            
            <!-- 右侧信息区域（三行布局） -->
            <div class="flex-1 min-w-0">
              <!-- 第一行：商品名 -->
              <div class="text-xs text-slate-700 font-medium leading-relaxed line-clamp-2 break-all">{{ getTranslatedName(product.name) }}</div>
              <!-- 第二行：offerid（左）和价格（右） -->
              <div class="flex items-center justify-between mt-1">
                <span class="text-[10px] text-slate-500">OfferId: {{ product.offer_id || '-' }}</span>
                <span class="text-xs font-semibold text-slate-700">{{ formatPrice(product.price, product.currency_code) }}</span>
              </div>
              <!-- 第三行：sku（左）和数量（右） -->
              <div class="flex items-center justify-between mt-1">
                <span class="text-[10px] text-slate-500">SKU: {{ product.sku || '-' }}</span>
                <span class="text-[10px] text-slate-500">x{{ (product.quantity || 1) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 分隔线 -->
          <div class="border-t border-slate-200 mt-3 pt-3"></div>
          
          <!-- 下面2列3行：尺寸重量+货币代码（两栏布局，与其他区块一致） -->
          <div class="mt-3">
            <div class="grid grid-cols-2 gap-x-10 gap-y-3">
              <div class="flex items-center justify-between min-w-0">
                <span class="text-xs text-slate-500 flex-shrink-0">长度</span>
                <span class="text-xs text-slate-900 truncate ml-2">{{ formatDimension(product.dimensions?.length) }}</span>
              </div>
              <div class="flex items-center justify-between min-w-0">
                <span class="text-xs text-slate-500 flex-shrink-0">宽度</span>
                <span class="text-xs text-slate-900 truncate ml-2">{{ formatDimension(product.dimensions?.width) }}</span>
              </div>
              <div class="flex items-center justify-between min-w-0">
                <span class="text-xs text-slate-500 flex-shrink-0">高度</span>
                <span class="text-xs text-slate-900 truncate ml-2">{{ formatDimension(product.dimensions?.height) }}</span>
              </div>
              <div class="flex items-center justify-between min-w-0">
                <span class="text-xs text-slate-500 flex-shrink-0">重量</span>
                <span class="text-xs text-slate-900 truncate ml-2">{{ formatWeight(product.dimensions?.weight) }}</span>
              </div>
              <div class="flex items-center justify-between min-w-0">
                <span class="text-xs text-slate-500 flex-shrink-0">最大重量</span>
                <span class="text-xs text-slate-900 truncate ml-2">{{ formatWeight(product.weight_max) }}</span>
              </div>
              <div class="flex items-center justify-between min-w-0">
                <span class="text-xs text-slate-500 flex-shrink-0">最小重量</span>
                <span class="text-xs text-slate-900 truncate ml-2">{{ formatWeight(product.weight_min) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 物流与配送 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-teal-500 rounded mr-2"></span>
          物流与配送
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">跟踪号</span>
            <span class="text-xs text-slate-900 truncate ml-2 font-mono">{{ formatRawValue(order.raw?.tracking_number) || order.trackingNumber || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">是否快递</span>
            <el-tag size="small" :type="order.raw?.is_express ? 'success' : 'info'">{{ order.raw?.is_express ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">配送费用</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatPrice(order.raw?.delivery_price) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">配送方式ID</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.delivery_method?.id) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">配送方式</span>
            <el-tooltip :content="formatRawValue(order.raw?.delivery_method?.name) || '-'" placement="top" :show-after="300">
              <span class="text-xs text-slate-900 truncate ml-2 min-w-0 max-w-[200px]">{{ formatRawValue(order.raw?.delivery_method?.name) || '-' }}</span>
            </el-tooltip>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">仓库</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.delivery_method?.warehouse) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">物流商</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.delivery_method?.tpl_provider) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">配送类型</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.analytics_data?.delivery_type) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">收货城市</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.analytics_data?.city) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">收货地区</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.analytics_data?.region) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">是否高级配送</span>
            <el-tag size="small" :type="order.raw?.analytics_data?.is_premium ? 'success' : 'info'">{{ order.raw?.analytics_data?.is_premium ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">支付类型分组</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.analytics_data?.payment_type_group_name) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">配送开始日期</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(order.raw?.analytics_data?.delivery_date_begin) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">配送结束日期</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(order.raw?.analytics_data?.delivery_date_end) }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">收货人电话</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.addressee?.phone) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">详细地址</span>
            <el-tooltip :content="formatFullAddress(order.raw) || '-'" placement="top" :show-after="300">
              <span class="text-xs text-slate-900 truncate ml-2">{{ formatFullAddress(order.raw) || '-' }}</span>
            </el-tooltip>
          </div>
        </div>
      </div>

      <!-- 5. 财务结算 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-amber-500 rounded mr-2"></span>
          财务结算
        </h4>
        <!-- 区域信息 -->
        <div class="grid grid-cols-2 gap-x-10 gap-y-3 mb-4 pb-4 border-b border-slate-200">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">发货区域</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.financial_data?.cluster_from) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">目的区域</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.financial_data?.cluster_to) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">价格货币</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ props.order?.raw?.products?.[0]?.currency_code || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">结算货币</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.financial_data?.products?.[0]?.currency_code) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">客户支付货币</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.financial_data?.products?.[0]?.customer_currency_code) || '-' }}</span>
          </div>
        </div>
        <!-- 每商品财务明细 -->
        <div v-for="(fp, idx) in (order.raw?.financial_data?.products || [])" :key="fp.product_id || idx" class="border-b border-slate-200 last:border-b-0 pb-3 mb-3 last:pb-0 last:mb-0">
          <div class="text-xs font-medium text-slate-700 mb-2">商品 #{{ idx + 1 }}</div>
          <div class="grid grid-cols-2 gap-x-10 gap-y-3">
            <div class="flex items-center justify-between min-w-0">
              <span class="text-xs text-slate-500 flex-shrink-0">数量</span>
              <span class="text-xs text-slate-900 truncate ml-2">{{ fp.quantity || '-' }}</span>
            </div>
            <div class="flex items-center justify-between min-w-0">
              <span class="text-xs text-slate-500 flex-shrink-0">单价</span>
              <span class="text-xs text-slate-900 truncate ml-2">{{ formatPrice(fp.price, getFinancialProductPriceCurrency(idx, fp)) }}</span>
            </div>
            <div class="flex items-center justify-between min-w-0">
              <span class="text-xs text-slate-500 flex-shrink-0">原价</span>
              <span class="text-xs text-slate-900 truncate ml-2">{{ formatPrice(fp.old_price, getFinancialProductPriceCurrency(idx, fp)) }}</span>
            </div>
            <div class="flex items-center justify-between min-w-0">
              <span class="text-xs text-slate-500 flex-shrink-0">客户实付</span>
              <span class="text-xs text-slate-900 truncate ml-2">{{ formatPrice(fp.customer_price, fp.customer_currency_code) }}</span>
            </div>
            <div class="flex items-center justify-between min-w-0">
              <span class="text-xs text-slate-500 flex-shrink-0">佣金比例</span>
              <span class="text-xs text-slate-900 truncate ml-2">{{ fp.commission_percent ? fp.commission_percent + '%' : '-' }}</span>
            </div>
            <div class="flex items-center justify-between min-w-0">
              <span class="text-xs text-slate-500 flex-shrink-0">佣金金额</span>
              <span class="text-xs text-slate-900 truncate ml-2">{{ formatPrice(fp.commission_amount, fp.currency_code) }}</span>
            </div>
            <div class="flex items-center justify-between min-w-0">
              <span class="text-xs text-slate-500 flex-shrink-0">实际到账</span>
              <span class="text-xs text-emerald-600 font-medium truncate ml-2">{{ formatPrice(fp.payout, fp.currency_code) }}</span>
            </div>
            <div class="flex items-center justify-between min-w-0">
              <span class="text-xs text-slate-500 flex-shrink-0">折扣金额</span>
              <span class="text-xs text-slate-900 truncate ml-2">{{ formatPrice(fp.total_discount_value, fp.currency_code) }}</span>
            </div>
            <div class="flex items-center justify-between min-w-0">
              <span class="text-xs text-slate-500 flex-shrink-0">折扣比例</span>
              <span class="text-xs text-slate-900 truncate ml-2">{{ fp.total_discount_percent ? fp.total_discount_percent + '%' : '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 6. 取消信息（条件显示：cancel_reason_id !== 0） -->
      <div v-if="order.raw?.cancellation?.cancel_reason_id && order.raw.cancellation.cancel_reason_id !== 0" class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-rose-500 rounded mr-2"></span>
          取消信息
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">取消原因</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatCancellationReason(order.raw?.cancellation) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">取消原因ID</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(order.raw?.cancellation?.cancel_reason_id) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">取消类型</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatCancellationType(order.raw?.cancellation) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">发货后取消</span>
            <el-tag size="small" :type="order.raw?.cancellation?.cancelled_after_ship ? 'danger' : 'info'">{{ order.raw?.cancellation?.cancelled_after_ship ? '是' : '否' }}</el-tag>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">取消发起方</span>
            <span class="text-xs text-slate-900 truncate ml-2">{{ formatCancellationInitiator(order.raw?.cancellation) || '-' }}</span>
          </div>
          <div class="flex items-center justify-between min-w-0">
            <span class="text-xs text-slate-500 flex-shrink-0">影响评分</span>
            <el-tag size="small" :type="order.raw?.cancellation?.affect_cancellation_rating ? 'danger' : 'success'">{{ order.raw?.cancellation?.affect_cancellation_rating ? '是' : '否' }}</el-tag>
          </div>
        </div>
      </div>

      <!-- 7. 原始API数据（可折叠） -->
      <div v-if="order.raw" class="bg-slate-50 rounded-lg p-4">
        <div class="flex items-center justify-between cursor-pointer" @click="showRawData = !showRawData">
          <h4 class="text-[13px] font-semibold text-slate-700 flex items-center">
            <span class="w-1 h-4 bg-slate-400 rounded mr-2"></span>
            原始API数据
          </h4>
          <el-icon class="text-slate-400 transition-transform" :class="{ 'rotate-180': showRawData }"><ArrowDown /></el-icon>
        </div>
        <div v-show="showRawData" class="mt-3">
          <pre class="bg-slate-100 text-slate-700 text-[11px] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto border border-slate-200 text-left">{{ formattedRawOrder }}</pre>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Document, ArrowDown } from '@element-plus/icons-vue';
import type { OzonOrder } from '@/api/ozonOrderAPI';
import { useProductNameTranslations } from '@/composables/useProductNameTranslations';
import AppImage from '@/components/ui/AppImage.vue';

// Props
interface Props {
  visible: boolean;
  order: OzonOrder | null;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  order: null,
});

const { getTranslatedName, resolveNames } = useProductNameTranslations();

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

// 内部状态
const showRawData = ref(false);

// 抽屉可见性（双向绑定）
const drawerVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

watch(
  () => [props.visible, props.order],
  ([visible]) => {
    if (!visible || !props.order) return;
    const products = props.order.raw?.products || props.order.products || [];
    void resolveNames(products.map((product: any) => product?.name).filter(Boolean));
  },
  { immediate: true },
);

// 格式化原始值
const formatRawValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

// 格式化客户姓名
const formatCustomerName = (customer: any): string => {
  if (!customer) return '-';
  const firstName = customer.first_name || '';
  const lastName = customer.last_name || '';
  const name = `${firstName} ${lastName}`.trim();
  return name || '-';
};

// 格式化日期时间
const formatDateTime = (val: any): string => {
  if (!val) return '-';
  try {
    const d = new Date(val);
    return d.toLocaleString('zh-CN');
  } catch {
    return String(val);
  }
};

// 格式化价格（带货币符号，保留2位小数，值为0显示0无符号）
const formatPrice = (val: any, currencyCode?: string): string => {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  // 值为0时直接返回0
  if (num === 0) return '0';
  const formatted = num.toFixed(2);
  const symbol = currencyCode === 'CNY' ? '￥' : currencyCode === 'RUB' ? '₽' : '';
  return `${symbol}${formatted}`;
};

const getProductIdentifiers = (product: any): string[] => (
  [product?.product_id, product?.sku, product?.offer_id]
    .filter(value => value !== null && value !== undefined && value !== '')
    .map(value => String(value))
);

const getFinancialProductPriceCurrency = (idx: number, financialProduct: any): string | undefined => {
  const products = props.order?.raw?.products || props.order?.products || [];
  const financialIdentifiers = getProductIdentifiers(financialProduct);
  const matchedProduct = products.find((product: any) => (
    getProductIdentifiers(product).some(identifier => financialIdentifiers.includes(identifier))
  ));
  return matchedProduct?.currency_code || products[idx]?.currency_code || financialProduct?.currency_code;
};

const formatCancellationReason = (cancellation: any): string => {
  return formatRawValue(cancellation?.cancel_reason_zh || cancellation?.cancel_reason);
};

const formatCancellationInitiator = (cancellation: any): string => {
  return formatRawValue(cancellation?.cancellation_initiator_zh || cancellation?.cancellation_initiator);
};

const formatCancellationType = (cancellation: any): string => {
  return formatRawValue(cancellation?.cancellation_type_zh || cancellation?.cancellation_type);
};


// 格式化尺寸（取整）
const formatDimension = (val: any): string => {
  if (val === null || val === undefined || val === '') return '-';
  const num = parseFloat(val);
  if (isNaN(num)) return '-';
  return Math.round(num) + ' mm';
};

// 格式化重量
const formatWeight = (val: any): string => {
  if (val === null || val === undefined || val === '') return '-';
  const num = parseFloat(val);
  if (isNaN(num)) return '-';
  // 重量单位是g，取整显示，0显示为0而不是0.000
  const intValue = Math.round(num);
  return intValue + ' g';
};

// 获取商品图片
const pickImageUrl = (...values: any[]): string | undefined => {
  for (const value of values) {
    if (Array.isArray(value)) {
      const image = pickImageUrl(...value);
      if (image) return image;
      continue;
    }
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const getProductImage = (product: any): string | undefined => {
  return pickImageUrl(product?.image, product?.primary_image, product?.imageUrl, product?.image_url);
};

// 格式化完整地址
const formatFullAddress = (raw: any): string => {
  if (!raw) return '';
  const parts = [
    raw.addressee?.address?.city,
    raw.addressee?.address?.address_tail,
  ].filter(Boolean);
  return parts.join(', ') || '';
};

// 状态标签类型
const statusTagType = (status: string): string => {
  const map: Record<string, string> = {
    'awaiting_packaging': 'warning',
    'awaiting_deliver': 'info',
    'delivering': 'primary',
    'delivered': 'success',
    'cancelled': 'danger',
    'dispute': 'warning',
    'awaiting_registration': 'info',
    'acceptance_in_progress': 'warning',
    'awaiting_approve': 'info',
    'arbitration': 'danger',
    'client_arbitration': 'danger',
    'driver_pickup': 'primary',
  };
  return map[status] || 'info';
};

// 状态标签文本
const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    'awaiting_packaging': '等待备货',
    'awaiting_deliver': '等待发运',
    'delivering': '运输中',
    'delivered': '已签收',
    'cancelled': '已取消',
    'dispute': '纠纷',
    'awaiting_registration': '等待登记',
    'acceptance_in_progress': '正在验收',
    'awaiting_approve': '等待批准',
    'arbitration': '仲裁中',
    'client_arbitration': '客户仲裁',
    'driver_pickup': '司机取货',
  };
  return map[status] || status;
};

// 格式化原始订单数据
const formattedRawOrder = computed(() => {
  if (!props.order?.raw) return '';
  return JSON.stringify(props.order.raw, null, 2);
});
</script>

<style scoped>
.order-detail-product-image,
.order-detail-image-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  flex-shrink: 0;
  background: #fff;
}

.order-detail-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 10px;
}
</style>
