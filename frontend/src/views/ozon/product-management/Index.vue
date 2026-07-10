<template>
  <MainLayout>
    <div class="p-6 product-management-page app-page-stack app-page--fluid">
      <!-- 页头分类标签 - 使用统一的AppTabs组件 -->
      <AppTabs
        v-model="currentStatusFilter"
        :tabs="statusTabs"
        @change="handleStatusFilter"
      />
      <!-- 搜索和商品列表 -->
      <div class="app-page-table-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <ProductManagementToolbar
          v-model="searchKeyword"
          :is-updating="isUpdating"
          :last-update-time="lastUpdateTime"
          :update-status="updateStatus"
          :fetch-last-update-time="fetchLastUpdateTime"
          :module="PRODUCT_MANAGEMENT_MODULE"
          :disabled="!selectedStoreId"
          :product-limits="productLimits"
          :product-limits-loading="productLimitsLoading"
          :product-limits-error="productLimitsError"
          @search="searchProducts"
          @update-click="handleUpdateClick"
          @detail-click="handleDetailClick"
        />

        <ProductManagementTable
          v-model:edit-value="editValue"
          :products="products"
          :show-table-skeleton="showTableSkeleton"
          :data-loaded="dataLoaded"
          :current-page="currentPage"
          :page-size="pageSize"
          :pagination-page-size="PAGINATION_PAGE_SIZE"
          :total-count="totalCount"
          :saving-edit="savingEdit"
          :get-product-image="getProductImage"
          :get-offer-id="getOfferId"
          :get-sku-display="getSkuDisplay"
          :get-product-display-name="getProductDisplayName"
          :is-product-name-overflowing="isProductNameOverflowing"
          :set-product-name-element="setProductNameElement"
          :get-category-name="getCategoryName"
          :get-tooltip-placement="getTooltipPlacement"
          :get-status-tooltip="getStatusTooltip"
          :has-status-tooltip="hasStatusTooltip"
          :get-status-badge-style="getStatusBadgeStyle"
          :get-status-label="getStatusLabel"
          :get-status-badge-count="getStatusBadgeCount"
          :get-status-badge-count-style="getStatusBadgeCountStyle"
          :get-status-subtitle="getStatusSubtitle"
          :is-editing="isEditing"
          :format-price="formatPrice"
          :get-color-index-bg="getColorIndexBg"
          :get-color-index-color="getColorIndexColor"
          :get-color-index-text-short="getColorIndexTextShort"
          :format-date="formatDate"
          :format-time="formatTime"
          :is-archive-operation-processing="isArchiveOperationProcessing"
          :is-archived-product="isArchivedProduct"
          :get-archive-action-label="getArchiveActionLabel"
          @page-change="handlePageChange"
          @view-product="viewProduct"
          @product-command="handleProductCommand"
          @start-edit="startEdit"
          @save-edit="saveEdit"
          @cancel-edit="cancelEdit"
        />
      </div>
    <!-- 回到顶部按钮 -->
    <el-backtop :right="30" :bottom="80" :visibility-height="400">
      <div class="backtop-btn">
        <el-icon>
          <ArrowUp />
        </el-icon>
      </div>
    </el-backtop>
    <!-- 商品详情抽屉 -->
    <ProductDetailDrawer
      v-model:visible="showProductDetail"
      :product="selectedProduct"
      :loading="loadingDetail"
    />
    <!-- 价格/库存编辑弹窗 -->
    <PriceStockDialog
      v-model:visible="showPriceStockDialog"
      :mode="priceStockMode"
      :product="selectedProduct"
      :store-id="selectedStoreId"
      :loading="loadingActionProduct"
      @saved="loadLocalProducts"
    />
    <!-- 商品编辑抽屉 -->
    <ProductEditDrawer
      v-model="showProductEditDrawer"
      :product="selectedProduct"
      :store-id="selectedStoreId"
      :refreshing="loadingActionProduct"
      @saved="loadLocalProducts"
    />
    <!-- 同步日志弹窗 -->
    <AppDetailDialog
      v-model="showSyncLogModal"
      title="商品更新记录"
      :data="syncLogList"
      :total="syncLogTotal"
      :current-page="syncLogPage"
      :page-size="syncLogPageSize"
      :fetching="loadingSyncLogs"
      @page-change="fetchSyncLogs"
    />
    <AppDeleteConfirmDialog
      v-model="archiveConfirmVisible"
      :title="archiveConfirmTitle"
      :message="archiveConfirmMessage"
      :confirm-text="archiveConfirmButtonText"
      cancel-text="取消"
      :loading="archiveConfirmLoading"
      @confirm="handleArchiveConfirm"
      @cancel="resetArchiveConfirm"
    />
    </div>
  </MainLayout>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import MainLayout from '@/components/MainLayout.vue';
import { AppDeleteConfirmDialog, AppTabs } from '@/components/ui';
import AppDetailDialog from '@/components/ui/AppDetailDialog.vue';
import ProductManagementTable from './components/ProductManagementTable.vue';
import ProductManagementToolbar from './components/ProductManagementToolbar.vue';
import ProductDetailDrawer from './components/ProductDetailDrawer.vue';
import PriceStockDialog from './components/PriceStockDialog.vue';
import ProductEditDrawer from './components/ProductEditDrawer.vue';
import { useProductNameTranslations } from './composables/useProductNameTranslations';
import { useProductStatusDisplay } from './composables/useProductStatusDisplay';
import {
  formatDate,
  formatPrice,
  formatTime,
  getCategoryName,
  getApiProductId,
  getColorIndexBg,
  getColorIndexColor,
  getColorIndexTextShort,
  getOfferId,
  getProductImage,
  getSkuDisplay,
  isArchivedProduct,
} from './utils/productDisplay';
import { ozonStoreAPI } from '@/api/ozonStoreAPI';
import { ozonProductAPI } from '@/api/ozonProductAPI';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
import { ArrowUp } from '@element-plus/icons-vue';
import { useUpdateStore } from '@/store/updateStore';
// 状态标签（与Ozon后台保持一致 - 完整7分类
const statusTabs = reactive([
  { label: '所有', value: 'all', count: 0, color: '#6366f1' },
  { label: '销售中', value: 'selling', count: 0, color: '#10b981' },
  { label: '准备销售', value: 'pending', count: 0, color: '#3b82f6' },
  { label: '错误', value: 'error', count: 0, color: '#dc2626' },
  { label: '待修改', value: 'moderating', count: 0, color: '#f59e0b' },
  { label: '商品已下架', value: 'unlisted', count: 0, color: '#6b7280' },
  { label: '档案', value: 'archived', count: 0, color: '#7c3aed' },
]);
const currentStatusFilter = ref('all');
// 获取预留库存
const searchKeyword = ref('');
const selectedStoreId = ref<number | null>(null);
const { loadStoreContext, storeContext } = useOzonStoreContext();
const storeContextReady = ref(false);
const productLimits = ref<any | null>(null);
const productLimitsLoading = ref(false);
const productLimitsError = ref('');
const loading = ref(false);
const dataLoaded = ref(false); // 数据是否已加载完成（控制显示切换）
const loadingTimedOut = ref(false);
let loadingTimer: ReturnType<typeof setTimeout> | null = null;
let loadingStartTime: number = 0;
const MIN_LOADING_DURATION = 500; // 最少显示 0.5 秒加载动画

// 超时计时器：10 秒后停止加载并显示空状态
const startLoadingTimeout = () => {
  clearLoadingTimeout();
  loadingStartTime = Date.now();
  loadingTimer = setTimeout(() => {
    if (loading.value) {
      loading.value = false;
      loadingTimedOut.value = true;
      products.value = [];
      totalCount.value = 0;
      dataLoaded.value = true;
    }
  }, 10000);
};

// 确保最小加载时长（防止动画闪退）
const ensureMinLoadingDuration = (): Promise<void> => {
  const elapsed = Date.now() - loadingStartTime;
  const remaining = MIN_LOADING_DURATION - elapsed;
  if (remaining > 0) {
    return new Promise(resolve => setTimeout(resolve, remaining));
  }
  return Promise.resolve();
};

const clearLoadingTimeout = () => {
  if (loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }
  loadingTimedOut.value = false;
};
// 商品详情弹窗相关
const showProductDetail = ref(false);
const selectedProduct = ref<any>(null);
const showRawData = ref(false);
const loadingDetail = ref(false);
type ArchiveConfirmType = 'archive' | 'unarchive';
const archiveConfirmVisible = ref(false);
const archiveConfirmLoading = ref(false);
const archiveConfirmProduct = ref<any>(null);
const archiveConfirmType = ref<ArchiveConfirmType>('archive');
const archiveConfirmTitle = computed(() => (
  archiveConfirmType.value === 'archive' ? '确认归档' : '确认取消归档'
));
const archiveConfirmButtonText = computed(() => (
  archiveConfirmType.value === 'archive' ? '确认归档' : '确认取消'
));
const archiveConfirmMessage = computed(() => {
  const productName = archiveConfirmProduct.value?.name || '未命名';
  if (archiveConfirmType.value === 'archive') {
    return `确定要归档商品「${productName}」吗？归档后商品将停止销售。`;
  }
  return `确定要取消归档商品「${productName}」吗？`;
});
// 价格/库存弹窗相关
const showPriceStockDialog = ref(false);
const priceStockMode = ref<'price' | 'stock'>('price');
const loadingActionProduct = ref(false);
// 编辑抽屉相关
const showProductEditDrawer = ref(false);
// 行内编辑状
const editingProductId = ref<number | null>(null);
const editingField = ref<string | null>(null);
const editValue = ref(0);
const savingEdit = ref(false);
// 更新相关状态
const updateStatus = ref('');
const updateMessage = ref('');
const lastUpdateTime = ref<Date | null>(null);
// 全局更新状态管理
const updateStore = useUpdateStore();
const PRODUCT_MANAGEMENT_MODULE = 'product-management';
// 从全局状态获取更新状态，确保页面切换后保持
const isUpdating = computed(() => updateStore.isUpdating(PRODUCT_MANAGEMENT_MODULE));
const showTableSkeleton = computed(() => loading.value && !dataLoaded.value);
// 悬浮提示相关
// 同步日志弹窗相关
const showSyncLogModal = ref(false);
const syncLogList = ref<any[]>([]);
const syncLogTotal = ref(0);
const syncLogPage = ref(1);
const syncLogPageSize = 6; // 一页六条数据
const loadingSyncLogs = ref(false);

const fetchSyncLogs = async (page: number = 1) => {
  if (!selectedStoreId.value) return;
  syncLogPage.value = page;
  loadingSyncLogs.value = true;
  try {
    const response = await ozonStoreAPI.getSyncLogs(selectedStoreId.value, page, syncLogPageSize);
    syncLogList.value = response.data.list;
    syncLogTotal.value = response.data.total;
    syncLogPage.value = response.data.page;
  } catch {
    ElMessage.error('获取同步日志失败');
  } finally {
    loadingSyncLogs.value = false;
  }
};
const products = ref<any[]>([]);
const archivingProductIds = ref<Set<string>>(new Set());
const unarchivingProductIds = ref<Set<string>>(new Set());
const totalCount = ref(0);
const sellingCount = ref(0);
const pendingCount = ref(0);
const readyCount = ref(0);
const errorCount = ref(0);
const unlistedCount = ref(0);
const archivedCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20); // 每页条数
const PAGINATION_PAGE_SIZE = 20; // 分页模式每页条数
// 状态提示/错误提示展示逻辑
const {
  getStatusBadgeStyle,
  getStatusLabel,
  getStatusSubtitle,
  getStatusBadgeCount,
  getStatusBadgeCountStyle,
  getStatusTooltip,
  hasStatusTooltip,
  getTooltipPlacement,
  loadStoredTranslations,
  translateVisibleOzonMessages,
} = useProductStatusDisplay({
  products,
  translateErrors: (items) => ozonStoreAPI.translateErrors(items),
});
const {
  getProductDisplayName,
  isProductNameOverflowing,
  setProductNameElement,
  refreshProductNameOverflowStates,
  handleProductNameResize,
  resolveVisibleProductNameTranslations,
} = useProductNameTranslations({
  products,
  resolveTranslations: (names) => ozonProductAPI.resolveProductNameTranslations(names),
  onTranslationNotConfigured: () => ElMessage.warning('未配置翻译 API，商品名称将暂时显示原文'),
  onQuotaExceeded: () => ElMessage.warning('本月翻译字符额度不足，未翻译的商品名称将暂时显示原文'),
});
const isProductIdInSet = (setRef: typeof archivingProductIds, product: any): boolean => {
  const productId = getApiProductId(product);
  return Boolean(productId && setRef.value.has(productId));
};

const isArchivingProduct = (product: any): boolean => isProductIdInSet(archivingProductIds, product);

const isUnarchivingProduct = (product: any): boolean => isProductIdInSet(unarchivingProductIds, product);

const isArchiveOperationProcessing = (product: any): boolean => {
  return isArchivingProduct(product) || isUnarchivingProduct(product);
};

const getArchiveActionLabel = (product: any): string => {
  if (isArchivingProduct(product)) return '归档中';
  if (isUnarchivingProduct(product)) return '取消归档中';
  return isArchivedProduct(product) ? '取消归档' : '归档';
};

const setArchiveOperationProcessing = (productId: string, type: 'archive' | 'unarchive', processing: boolean) => {
  const target = type === 'archive' ? archivingProductIds : unarchivingProductIds;
  const next = new Set(target.value);
  if (processing) {
    next.add(productId);
  } else {
    next.delete(productId);
  }
  target.value = next;
};

const mergeProductSnapshotForDialog = (current: any, latest: any) => {
  if (!latest) return current;
  return {
    ...current,
    ...latest,
    name: latest.name || current?.name,
    offerId: latest.offerId || current?.offerId,
    price: latest.price ?? current?.price,
    stock: latest.stock ?? current?.stock,
    categoryName: latest.categoryName && latest.categoryName !== '-' ? latest.categoryName : current?.categoryName,
    productId: current?.productId || latest.productId,
    ozonProductId: current?.ozonProductId || latest.ozonProductId || latest.productId,
    product: {
      ...(current?.product || {}),
      ...(latest.product || {}),
      titleOriginal: latest.product?.titleOriginal || current?.product?.titleOriginal,
      primaryImage: latest.product?.primaryImage || current?.product?.primaryImage,
      images: latest.product?.images || current?.product?.images,
      ozonOriginalData: latest.product?.ozonOriginalData || current?.product?.ozonOriginalData,
    },
  };
};

const validateProductForAction = async (product: any): Promise<any | null> => {
  if (!selectedStoreId.value) {
    ElMessage.warning('请先在顶部选择当前操作店铺');
    return null;
  }
  const productId = getApiProductId(product);
  if (!productId) {
    ElMessage.error('商品ID不存在');
    return null;
  }
  try {
    const response = await ozonProductAPI.validateProduct(selectedStoreId.value, productId);
    if (response.success && response.data) {
      const responseProductId = getApiProductId(response.data);
      if (responseProductId && responseProductId !== productId) {
        ElMessage.error(`商品校验返回不匹配：请求 ${productId}，返回 ${responseProductId}`);
        return null;
      }
      return mergeProductSnapshotForDialog(product, response.data);
    }
    ElMessage.error(response.message || '商品状态校验失败');
  } catch (error: any) {
    ElMessage.error(error.message || '商品状态校验失败，请先更新商品列表');
    await loadLocalProducts();
  }
  return null;
};

const refreshSelectedProductForAction = async (product: any) => {
  loadingActionProduct.value = true;
  const latestProduct = await validateProductForAction(product);
  if (latestProduct) {
    selectedProduct.value = latestProduct;
  } else {
    showPriceStockDialog.value = false;
    showProductEditDrawer.value = false;
  }
  loadingActionProduct.value = false;
};

const openArchiveConfirm = (product: any, type: ArchiveConfirmType) => {
  if (isArchiveOperationProcessing(product)) {
    ElMessage.info('该商品正在执行归档操作，请勿重复提交');
    return;
  }
  archiveConfirmProduct.value = product;
  archiveConfirmType.value = type;
  archiveConfirmVisible.value = true;
};

const resetArchiveConfirm = () => {
  if (archiveConfirmLoading.value) return;
  archiveConfirmProduct.value = null;
  archiveConfirmType.value = 'archive';
};

const handleArchiveConfirm = async () => {
  const product = archiveConfirmProduct.value;
  const type = archiveConfirmType.value;
  if (!product) {
    archiveConfirmVisible.value = false;
    resetArchiveConfirm();
    return;
  }

  const productId = getApiProductId(product);
  if (!productId) {
    ElMessage.error('商品ID不存在');
    archiveConfirmVisible.value = false;
    resetArchiveConfirm();
    return;
  }

  archiveConfirmLoading.value = true;
  setArchiveOperationProcessing(productId, type, true);
  ElMessage.info(type === 'archive' ? '已提交归档请求，正在处理...' : '已提交取消归档请求，正在处理...');

  try {
    const latestProduct = await validateProductForAction(product);
    if (!latestProduct) {
      setArchiveOperationProcessing(productId, type, false);
      return;
    }

    if (type === 'archive') {
      await archiveProduct(latestProduct, productId);
    } else {
      await unarchiveProduct(latestProduct, productId);
    }
  } finally {
    archiveConfirmLoading.value = false;
    archiveConfirmVisible.value = false;
    resetArchiveConfirm();
  }
};
// ״̬ɸ
const handleStatusFilter = async (status: string) => {
  currentStatusFilter.value = status;
  currentPage.value = 1;
  await loadLocalProducts();
};

const resetProductState = () => {
  products.value = [];
  totalCount.value = 0;
  sellingCount.value = 0;
  readyCount.value = 0;
  pendingCount.value = 0;
  errorCount.value = 0;
  unlistedCount.value = 0;
  archivedCount.value = 0;
  dataLoaded.value = true;
};

const syncSelectedStoreContext = () => {
  selectedStoreId.value = storeContext.value?.resolvedStoreId ?? null;
};

const loadProductLimits = async () => {
  if (!selectedStoreId.value) {
    productLimits.value = null;
    productLimitsError.value = '';
    return;
  }
  productLimitsLoading.value = true;
  productLimitsError.value = '';
  try {
    const response = await ozonProductAPI.getProductLimits(selectedStoreId.value);
    if (response.success) {
      productLimits.value = response.data || null;
    } else {
      productLimits.value = null;
      productLimitsError.value = response.message || 'Ozon 商品额度未知';
    }
  } catch (error: any) {
    productLimits.value = null;
    productLimitsError.value = error.message || 'Ozon 商品额度未知';
  } finally {
    productLimitsLoading.value = false;
  }
};

const loadSelectedStoreContext = async () => {
  try {
    const context = await loadStoreContext(true);
    syncSelectedStoreContext();
    if (context?.resolvedStoreId) {
      void loadProductLimits();
      if (!isUpdating.value) {
        await loadLocalProducts();
      }
    } else {
      resetProductState();
      productLimits.value = null;
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载当前操作店铺失败');
  } finally {
    storeContextReady.value = true;
  }
};
// 加载错误码中文映射表
const loadErrorCodes = async () => {
  try {
    const response = await ozonStoreAPI.getErrorCodes();
    if (response.success && response.data) {
      loadStoredTranslations(response.data);
    }
  } catch {
  }
};// 加载本地产品数据
const loadLocalProducts = async () => {
  if (!selectedStoreId.value) {
    products.value = [];
    totalCount.value = 0;
    return;
  }
  loading.value = true;
  dataLoaded.value = false;
  startLoadingTimeout();
  try {
    const response = await ozonProductAPI.getLocalProducts(
      selectedStoreId.value,
      currentPage.value,
      pageSize.value,
      searchKeyword.value,
      currentStatusFilter.value === 'all' ? undefined : currentStatusFilter.value
    );
    if (response.success) {
      products.value = response.data.items || [];
      totalCount.value = response.data.totalCount || 0;
      sellingCount.value = response.data.sellingCount || 0;
      readyCount.value = response.data.readyCount || 0;
      errorCount.value = response.data.errorCount || 0;
      pendingCount.value = response.data.pendingCount || 0;
      unlistedCount.value = response.data.unlistedCount || 0;
      archivedCount.value = response.data.archivedCount || 0;
      // 保存最后更新时
      if (response.data.lastUpdateTime) {
        lastUpdateTime.value = new Date(response.data.lastUpdateTime);
      }
      // 更新各 Tab 数量（与 Ozon 后台保持一致）
      // 所有 = 销售中 + 准备销售 + 错误 + 商品已下架（不含待修改，因为待修改已包含在准备销售中）
      const allTotal = response.data.allTotalCount || (
        sellingCount.value + readyCount.value + errorCount.value + unlistedCount.value
      );
      statusTabs[0].count = allTotal;                    // 所有
      statusTabs[1].count = sellingCount.value;           // 销售中
      statusTabs[2].count = readyCount.value;             // 准备销售（含 WARNING 商品）
      statusTabs[3].count = errorCount.value;             // 错误
      statusTabs[4].count = pendingCount.value;           // 待修改（WARNING only，与准备销售有重叠）
      statusTabs[5].count = unlistedCount.value;          // 商品已下架
      statusTabs[6].count = archivedCount.value;          // 档案
      void translateVisibleOzonMessages();
      void resolveVisibleProductNameTranslations();
    } else {
      ElMessage.error(response.message || '获取产品列表失败');
      products.value = [];
      totalCount.value = 0;
      sellingCount.value = 0;
      readyCount.value = 0;
      pendingCount.value = 0;
      errorCount.value = 0;
      unlistedCount.value = 0;
      archivedCount.value = 0;
    }
  } catch (error: any) {
    ElMessage.error(error.message || '请求失败，请重试');
    products.value = [];
    totalCount.value = 0;
  } finally {
    // 确保最小加载时长（防止加载动画闪退）
    await ensureMinLoadingDuration();
    loading.value = false;
    dataLoaded.value = true; // 加载完成，显示数据
    clearLoadingTimeout();
  }
};
const searchProducts = async () => {
  currentPage.value = 1;
  await loadLocalProducts();
};

// 分页切换
const handlePageChange = async (page: number) => {
  currentPage.value = page;
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await loadLocalProducts();
};
// ===== 行内编辑功能 =====
const isEditing = (product: any, field: string): boolean => {
  return editingProductId.value === product.id && editingField.value === field;
};
const startEdit = (product: any, field: string, value: number) => {
  editingProductId.value = product.id;
  editingField.value = field;
  editValue.value = value;
};
const cancelEdit = () => {
  editingProductId.value = null;
  editingField.value = null;
};
const saveEdit = async (product: any) => {
  if (savingEdit.value) return;
  if (!selectedStoreId.value || !editingProductId.value) return;
  const field = editingField.value;
  const newValue = editValue.value;
  const productId = getApiProductId(product);
  if (!productId) {
    ElMessage.error('商品ID不存在');
    return;
  }
  savingEdit.value = true;
  try {
    if (field === 'price') {
      const response = await ozonProductAPI.updatePrice(
        selectedStoreId.value,
        productId,
        newValue
      );
      if (response.success) {
        ElMessage.success('价格更新成功');
        await loadLocalProducts();
      } else {
        ElMessage.error(response.message || '价格更新失败');
      }
    } else if (field === 'stock') {
      const response = await ozonProductAPI.updateStock(
        selectedStoreId.value,
        productId,
        Math.round(newValue)
      );
      if (response.success) {
        ElMessage.success('库存更新成功');
        await loadLocalProducts();
      } else {
        ElMessage.error(response.message || '库存更新失败');
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败');
  } finally {
    editingProductId.value = null;
    editingField.value = null;
    savingEdit.value = false;
  }
};
// 格式化最后刷新时间显
// 单个商品上架
// 查看商品详情
const viewProduct = async (product: any) => {
  // 先显示列表中的基础数据
  selectedProduct.value = product;
  showProductDetail.value = true;
  showRawData.value = false;
  // 异步获取 Ozon 最新数
  if (!selectedStoreId.value) return;
  loadingDetail.value = true;
  try {
    const response = await ozonProductAPI.getProductDetail(
      selectedStoreId.value,
      getApiProductId(product)
    );
    if (response.success && response.data) {
      // 合并 Ozon 最新数据到 selectedProduct
      selectedProduct.value = {
        ...product,
        product: {
          ...product.product,
          ...response.data,
          // 保留原始 API 数据用于 JSON չʾ
          ozonOriginalData: response.data,
        },
      };
    }
  } catch {
    // 获取失败时静默处理，仍使用列表缓存数据
  } finally {
    loadingDetail.value = false;
  }
};
const handleProductCommand = async (command: string, product: any) => {
  switch (command) {
    case 'edit':
      selectedProduct.value = product;
      showProductEditDrawer.value = true;
      void refreshSelectedProductForAction(product);
      break;
    case 'price':
      selectedProduct.value = product;
      priceStockMode.value = 'price';
      showPriceStockDialog.value = true;
      void refreshSelectedProductForAction(product);
      break;
    case 'stock':
      selectedProduct.value = product;
      priceStockMode.value = 'stock';
      showPriceStockDialog.value = true;
      void refreshSelectedProductForAction(product);
      break;
    case 'archive':
      openArchiveConfirm(product, 'archive');
      break;
    case 'unarchive':
      openArchiveConfirm(product, 'unarchive');
      break;
  }
};

const archiveProduct = async (product: any, lockedProductId?: string) => {
  if (!selectedStoreId.value) {
    ElMessage.warning('请先在顶部选择当前操作店铺');
    return;
  }
  let productId = lockedProductId || '';
  try {
    productId = productId || getApiProductId(product);
    if (!productId) {
      ElMessage.error('商品ID不存在');
      return;
    }
    // 归档操作 - 通过Ozon归档API
    const response = await ozonProductAPI.archiveProduct(selectedStoreId.value, String(productId));
    if (response.success) {
      ElMessage.success('归档成功');
      await loadLocalProducts();
    } else {
      ElMessage.error(response.message || '归档失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '归档失败，请重试');
  } finally {
    if (productId) {
      setArchiveOperationProcessing(productId, 'archive', false);
    }
  }
};

const unarchiveProduct = async (product: any, lockedProductId?: string) => {
  if (!selectedStoreId.value) {
    ElMessage.warning('请先在顶部选择当前操作店铺');
    return;
  }
  let productId = lockedProductId || '';
  try {
    productId = productId || getApiProductId(product);
    if (!productId) {
      ElMessage.error('商品ID不存在');
      return;
    }
    const response = await ozonProductAPI.unarchiveProduct(selectedStoreId.value, String(productId));
    if (response.success) {
      ElMessage.success('取消归档成功');
      await loadLocalProducts();
    } else {
      ElMessage.error(response.message || '取消归档失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '取消归档失败，请重试');
  } finally {
    if (productId) {
      setArchiveOperationProcessing(productId, 'unarchive', false);
    }
  }
};

// 获取要显示的JSON数据
// 格式化JSON，添加语法高
// 复制JSON数据到剪贴板
// 格式化日期时
// 获取最后更新时间文

// 获取最新更新时间
const fetchLastUpdateTime = async (): Promise<{ lastUpdateTime: string | Date; status: 'idle' | 'success' | 'error' }> => {
  const storeId = selectedStoreId.value;
  if (!storeId) {
    return { lastUpdateTime: '', status: 'idle' };
  }
  try {
    const response = await ozonProductAPI.getLastUpdateTime(storeId);
    if (response.data.lastUpdateTime) {
      lastUpdateTime.value = new Date(response.data.lastUpdateTime);
    }
    if (response.data.status) {
      updateStatus.value = response.data.status;
    }
    const status: 'idle' | 'success' | 'error' = updateStatus.value === '更新成功' ? 'success' : updateStatus.value === '更新失败' ? 'error' : 'idle';
    return {
      lastUpdateTime: lastUpdateTime.value || '',
      status
    };
  } catch {
    return { lastUpdateTime: '', status: 'idle' };
  }
};

// 更新按钮点击处理
const handleUpdateClick = () => {
  syncProducts();
};

// 详情链接点击处理
const handleDetailClick = () => {
  showSyncLogModal.value = true;
};

// 同步商品数据
const syncProducts = async () => {
  const storeId = selectedStoreId.value;
  if (!storeId) {
    ElMessage.warning('请先在顶部选择当前操作店铺');
    return;
  }
  // 使用全局状态管理防止重复点击
  if (updateStore.isUpdating(PRODUCT_MANAGEMENT_MODULE)) return;
  updateStore.startUpdate(PRODUCT_MANAGEMENT_MODULE, {
    scope: 'global',
    statusText: '正在更新',
    progress: 0,
  });
  updateStatus.value = '正在更新';
  updateMessage.value = '';
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  try {
    // 模拟进度更新
    progressInterval = setInterval(() => {
      const meta = updateStore.getModuleMeta(PRODUCT_MANAGEMENT_MODULE);
      if (meta.progress < 90) {
        const next = meta.progress + Math.random() * 15;
        const normalized = next > 90 ? 90 : next;
        updateStore.setUpdateProgress(PRODUCT_MANAGEMENT_MODULE, normalized);
      }
    }, 500);
    const response = await ozonProductAPI.syncProducts(storeId);
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    updateStore.setUpdateProgress(PRODUCT_MANAGEMENT_MODULE, 100);
    if (response.success) {
      updateStatus.value = '更新成功';
      const synced = response.data.syncedCount || 0;
      const updated = response.data.updatedCount || 0;
      updateMessage.value = `成功同步商品：新${synced} 件，更新 ${updated} 件`;
      lastUpdateTime.value = new Date();
      ElMessage.success(updateMessage.value || '商品更新成功');
    } else {
      updateStatus.value = '更新失败';
      updateMessage.value = response.message || '同步失败，请稍后重试';
      ElMessage.error(updateMessage.value);
    }
    updateStore.stopUpdate(PRODUCT_MANAGEMENT_MODULE);
  } catch (error: any) {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    updateStatus.value = '更新失败';
    updateMessage.value = error.message || '网络错误，请稍后重试';
    ElMessage.error(updateMessage.value);
    updateStore.stopUpdate(PRODUCT_MANAGEMENT_MODULE);
  }
};
// 监听同步日志弹窗打开事件
watch(showSyncLogModal, async (newVal) => {
  if (newVal) {
    if (!selectedStoreId.value) {
      ElMessage.warning('请先在顶部选择当前操作店铺');
      showSyncLogModal.value = false;
      return;
    }
    syncLogPage.value = 1;
    await fetchSyncLogs(1);
  }
});

watch(
  () => storeContext.value?.resolvedStoreId ?? null,
  async (nextStoreId, prevStoreId) => {
    syncSelectedStoreContext();
    if (!storeContextReady.value || nextStoreId === prevStoreId) {
      return;
    }

    currentPage.value = 1;
    if (nextStoreId) {
      void loadProductLimits();
      if (!isUpdating.value) {
        await loadLocalProducts();
      }
    } else {
      productLimits.value = null;
      productLimitsError.value = '';
      resetProductState();
    }
  }
);

watch(isUpdating, async (updating, wasUpdating) => {
  if (!wasUpdating || updating || !selectedStoreId.value) {
    return;
  }

  currentPage.value = 1;
  await loadLocalProducts();
});

watch(
  products,
  () => {
    void refreshProductNameOverflowStates();
  },
  { flush: 'post' }
);

onMounted(() => {
  window.addEventListener('resize', handleProductNameResize);
  void loadSelectedStoreContext();
  void loadErrorCodes();
});
onUnmounted(() => {
  window.removeEventListener('resize', handleProductNameResize);
  clearLoadingTimeout();
});
</script>
<style scoped>
.el-dropdown-link {
  user-select: none;
}

.update-tooltip {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.update-tooltip.visible {
  opacity: 1;
  visibility: visible;
}

/* 更新记录弹窗样式 */
:deep(.update-log-custom-dialog .el-dialog__header) {
  padding: 0;
  margin: 0;
}

:deep(.update-log-custom-dialog .el-dialog__body) {
  padding: 0;
  max-height: 380px;
  overflow-y: auto;
}

/* 更新记录表格容器样式 */
.update-log-table-container {
  padding: 0;
  overflow-y: auto;
}

/* ===== 无限滚动加载（货源采搜同类样式） ===== */
.load-more-sentinel {
  padding: 20px 0 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 56px;
}

.load-more-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.load-more-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

.load-more-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4f46e5;
  display: inline-block;
  animation: load-dot-bounce 1.2s ease-in-out infinite;
}

.load-more-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.load-more-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes load-dot-bounce {

  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.5;
  }

  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.load-more-text {
  font-size: 12px;
  color: #9ca3af;
}

.load-more-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.load-more-end {
  font-size: 12px;
  color: #c0c4cc;
  letter-spacing: 0.5px;
}

/* ===== BackTop 样式 ===== */
.backtop-btn {
  width: 40px;
  height: 40px;
  background: #6366f1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  transition: all 0.2s;
}

.backtop-btn:hover {
  background: #4f46e5;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
}

</style>
