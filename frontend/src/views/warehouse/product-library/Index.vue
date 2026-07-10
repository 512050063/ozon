<template>
  <MainLayout>
    <div class="p-6 product-library-page app-page-stack app-page--fluid">
      <!-- 统计信息 -->
      <ProductLibraryStats
        :total="libraryStats.total"
        :pendingCount="libraryStats.pendingAndListing"
        :listingCount="libraryStats.listing"
        :listedCount="libraryStats.listed"
        :failedCount="libraryStats.failed"
        :activeStatus="statsActiveStatus"
        @filter-change="handleStatsFilterChange"
      />
      <!-- 搜索和表格合并 -->
      <div class="product-library-card app-page-table-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <!-- 搜索栏 -->
        <div class="app-page-table-toolbar p-6 border-b border-slate-100 h-[100px] flex items-center">
          <div class="flex flex-col md:flex-row gap-4 items-center w-full">
            <div class="flex items-center gap-3 flex-1 w-full md:w-auto">
              <el-select
                v-model="selectedStatus"
                :options="statusOptions"
                placeholder="请选择"
                clearable
                class="select-base"
                popper-class="select-base-popper"
                @change="handleStatusChange"
              >
                <template #prefix>
                  <el-icon><Management /></el-icon>
                </template>
              </el-select>
              <div class="search-container">
                <el-input
                  v-model="productSearchKeyword"
                  placeholder="搜索商品库商品..."
                  clearable
                  class="input-search"
                  @keyup.enter="searchProductLibrary"
                />
                <el-button type="primary" class="btn-search" @click="searchProductLibrary">
                  <el-icon class="mr-1"><Search /></el-icon>
                  搜索
                </el-button>
              </div>
            </div>
            <OzonProductLimitPill
              mode="create"
              :limits="productLimits"
              :loading="productLimitsLoading"
              :error="productLimitsError"
            />
            <el-button type="primary" class="btn-create" @click="openAddDrawer">
              <el-icon class="mr-1"><Plus /></el-icon>
              添加商品
            </el-button>
          </div>
        </div>
        <!-- 商品库列表-->
        <ProductLibraryList 
          :product-library="productLibrary" 
          :loading="showTableSkeleton"
          :search-keyword="productSearchKeyword"
          :current-page="currentPage" 
          :page-size="pageSize" 
          :status-filter="apiStatusFilter" 
          :total="total"
          @view-source="viewSource"
          @delete="handleDelete" 
          @edit="handleEdit"
          @edit-source="openSourceDialog"
          @list-to-ozon="handleListToOzon"
          @check-status="handleCheckListingStatus"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange" 
        />
      </div>
      <!-- 添加/编辑商品抽屉 -->
      <AddProductDrawer 
        ref="addProductDrawerRef"
        v-model="addDrawerVisible" 
        :initial-data="editingData"
        :existing-alibaba-ids="productLibrary.map((item: ProductSupplyItem) => item.offerId || item.alibabaId || '')" 
        @submit="handleAddProductSubmit" 
      />
      <ProductListingDialog
        v-model="listingDialogVisible"
        :product="listingProduct"
        @submitted="handleListingSubmitted"
        @edit-check="handleListingCheckEdit"
      />
      <AppDialog
        v-model="sourceDialogVisible"
        :title="sourceEditingProduct?.supplySource ? '编辑货源绑定' : '绑定货源'"
        subtitle="从已保存的1688货源中选择并绑定"
        :icon="Link"
        :show-footer="false"
        content-class="source-binding-dialog-panel"
      >
        <div class="source-dialog">
          <div class="source-section">
            <div class="source-section-title">
              <div class="source-section-title-label">
                <span class="source-section-title-bar"></span>
                <span>当前绑定</span>
              </div>
              <button
                v-if="sourceEditingProduct?.supplySource"
                class="source-unbind-small"
                :class="{ 'source-unbind-small-active': pendingSourceAction === 'unbind' }"
                @click="markSourceUnbind"
              >
                {{ pendingSourceAction === 'unbind' ? '已解绑' : '解绑' }}
              </button>
            </div>
            <div class="source-current">
              <template v-if="sourceEditingProduct?.supplySource && pendingSourceAction !== 'unbind'">
                <button class="source-current-main source-current-link" @click="openSourceDetailUrl(sourceEditingProduct.supplySource)">
                  <AppImage
                    v-if="sourceEditingProduct.supplySource.image"
                    :src="sourceEditingProduct.supplySource.image"
                    class="source-current-image"
                    error-text="加载失败"
                    empty-text="暂无图片"
                  />
                  <div v-else class="source-card-placeholder">1688</div>
                  <div class="min-w-0 flex-1">
                    <div class="source-current-title">{{ sourceEditingProduct.supplySource.subject || '1688货源' }}</div>
                    <div class="source-current-meta">
                      {{ sourceEditingProduct.supplySource.supplierName || '未知供应商' }}
                      <span>¥{{ formatSourceMoney(sourceEditingProduct.supplySource.price) }}</span>
                    </div>
                  </div>
                </button>
              </template>
              <div v-else class="source-empty-current">
                {{ pendingSourceAction === 'unbind' ? '已选择解绑，点击确定后生效' : '当前未绑定1688货源' }}
              </div>
            </div>
          </div>

          <div class="source-section source-method-section">
            <div class="source-method-divider" aria-hidden="true"></div>
            <div class="source-dialog-fixed-body">
              <div class="source-search-row">
                <el-input
                  v-model="sourceExistingKeyword"
                  placeholder="搜索1688货源标题、供应商或商品ID"
                  clearable
                  @keyup.enter="() => loadSupplySources()"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-button class="source-action-button" :loading="sourceListLoading" @click="loadSupplySources">搜索</el-button>
              </div>

              <div class="source-list">
                <AppSkeletonLoader v-if="sourceListLoading" variant="card" :rows="3" compact />
                <template v-else>
                  <button
                    v-for="source in sourceExistingList"
                    :key="source.id"
                    :class="['source-card', selectedSourceKey === `existing:${source.id}` ? 'source-card-active' : '']"
                    @click="selectExistingSource(source)"
                  >
                    <AppImage v-if="source.image" :src="source.image" class="source-card-image" error-text="加载失败" empty-text="暂无图片" />
                    <div v-else class="source-card-placeholder">1688</div>
                    <div class="source-card-body">
                      <div class="source-card-title" :title="source.subject">{{ source.subject || '未命名货源' }}</div>
                      <div class="source-card-meta">
                        <span>{{ source.supplierName || '未知供应商' }}</span>
                        <span>¥{{ formatSourceMoney(source.price) }}</span>
                        <span>{{ source.alibabaOfferId }}</span>
                      </div>
                    </div>
                    <span v-if="selectedSourceKey === `existing:${source.id}`" class="source-card-check">
                      <el-icon><Check /></el-icon>
                    </span>
                  </button>
                  <div v-if="sourceExistingList.length === 0" class="source-empty-state">
                    暂无已保存货源
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="source-dialog-footer">
            <el-button class="btn-cancel" :disabled="sourceSubmitting" @click="sourceDialogVisible = false">取消</el-button>
            <el-button
              type="primary"
              class="btn-confirm"
              :disabled="!pendingSourceAction || sourceSubmitting"
              @click="handleSourceConfirm"
            >
              {{ sourceSubmitting ? '提交中...' : '确定' }}
            </el-button>
          </div>
        </template>
      </AppDialog>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import MainLayout from '@/components/MainLayout.vue';
import { Search, Plus, Management, Link, Check } from '@element-plus/icons-vue';
import AppDialog from '@/components/ui/AppDialog.vue';
import AppImage from '@/components/ui/AppImage.vue';
import AppSkeletonLoader from '@/components/ui/AppSkeletonLoader.vue';
import { OzonProductLimitPill } from '@/components/ui';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
import { ozonProductAPI, type OzonProductLimits } from '@/api/ozonProductAPI';
import ProductLibraryStats from './components/ProductLibraryStats.vue';
import ProductLibraryList from './components/ProductLibraryList.vue';
import AddProductDrawer from './components/AddProductDrawer.vue';
import ProductListingDialog from './components/ProductListingDialog.vue';
import {
  getAlibabaSourceDetailUrl,
  sourceToPayload,
} from './sourceBindingUtils';
import { getCategoryLeaf } from '@/utils/categoryText';
// AppInput 已移除，使用全局CSS样式
import {
  getProductSupplyItems,
  createProductSupplyItem,
  updateProductSupplyItem,
  updateProductSupplySource,
  getSupplySources,
  unbindProductSupplySource,
  deleteProductSupplyItem,
  checkListingStatus,
  type ProductSupplyItem,
  type ProductSupplyListingCheck,
  type SupplySource,
  type UpdateSupplySourceData,
} from '@/api/productSupplyAPI';

// 搜索关键词
const productSearchKeyword = ref('');

// 筛选条件
const STATUS_ALL = 'all';
type ProductLibraryStatusFilter = typeof STATUS_ALL | 'pending' | 'listed' | 'failed';
type ProductLibraryStatsStatus = '' | 'pending' | 'listed' | 'failed';

const selectedStatus = ref<ProductLibraryStatusFilter>('pending');
const statsActiveStatus = computed<ProductLibraryStatsStatus>(() => (
  selectedStatus.value === STATUS_ALL ? '' : selectedStatus.value
));
const apiStatusFilter = computed(() => (
  selectedStatus.value === STATUS_ALL ? '' : selectedStatus.value
));

// 分页
const currentPage = ref(1);
const pageSize = ref(10);

// 数据加载状态
const loading = ref(false);
const dataLoaded = ref(false);
const showTableSkeleton = computed(() => loading.value && !dataLoaded.value);
const { loadStoreContext } = useOzonStoreContext();
const productLimits = ref<OzonProductLimits | null>(null);
const productLimitsLoading = ref(false);
const productLimitsError = ref('');

// 添加商品抽屉
const addDrawerVisible = ref(false);
const addProductDrawerRef = ref<InstanceType<typeof AddProductDrawer> | null>(null);
const editingProductId = ref<number | null>(null);
const listingDialogVisible = ref(false);
const listingProduct = ref<ProductSupplyItem | null>(null);
const sourceDialogVisible = ref(false);
const sourceSubmitting = ref(false);
const sourceEditingProduct = ref<ProductSupplyItem | null>(null);
const sourceExistingKeyword = ref('');
const sourceExistingList = ref<SupplySource[]>([]);
const sourceListLoading = ref(false);
const pendingSourceAction = ref<'bind' | 'unbind' | null>(null);
const pendingSource = ref<UpdateSupplySourceData | null>(null);
const selectedSourceKey = ref('');

// 商品库数据
const productLibrary = ref<ProductSupplyItem[]>([]);
const total = ref(0);
const libraryStats = ref({
  total: 0,
  pending: 0,
  listing: 0,
  pendingAndListing: 0,
  listed: 0,
  failed: 0,
});

// 编辑数据
const editingData = computed(() => {
  if (editingProductId.value === null) return undefined;
  return productLibrary.value.find(item => item.id === editingProductId.value) as any;
});

// 打开添加抽屉
const openAddDrawer = () => {
  editingProductId.value = null;
  addDrawerVisible.value = true;
};

// 状态下拉选项
const statusOptions = [
  { value: STATUS_ALL, label: '所有' },
  { value: 'pending', label: '待上架' },
  { value: 'listed', label: '已上架' },
  { value: 'failed', label: '错误' },
];

const normalizeStatusFilter = (status: ProductLibraryStatusFilter | '' | null | undefined): ProductLibraryStatusFilter => {
  return status ? status : STATUS_ALL;
};

const loadProductLimits = async () => {
  productLimitsLoading.value = true;
  productLimitsError.value = '';
  try {
    const context = await loadStoreContext(true);
    const storeId = context?.resolvedStoreId ?? null;
    if (!storeId) {
      productLimits.value = null;
      productLimitsError.value = '未选择 Ozon 店铺';
      return;
    }
    const response = await ozonProductAPI.getProductLimits(storeId);
    if (response.success) {
      productLimits.value = response.data || null;
    } else {
      productLimits.value = null;
      productLimitsError.value = response.message || 'Ozon 商品添加额度未知';
    }
  } catch (error: any) {
    productLimits.value = null;
    productLimitsError.value = error.message || 'Ozon 商品添加额度未知';
  } finally {
    productLimitsLoading.value = false;
  }
};

// 加载商品库数据
const loadProductLibrary = async () => {
  loading.value = true;
  dataLoaded.value = false;
  try {
    const result = await getProductSupplyItems({
      page: currentPage.value,
      limit: pageSize.value,
      keyword: productSearchKeyword.value || undefined,
      status: selectedStatus.value === STATUS_ALL ? undefined : selectedStatus.value
    });
    
    if (result.success && result.data) {
      productLibrary.value = result.data;
      total.value = result.total || 0;
      if (result.stats) {
        libraryStats.value = {
          total: result.stats.total || 0,
          pending: result.stats.pending || 0,
          listing: result.stats.listing || 0,
          pendingAndListing: result.stats.pendingAndListing || 0,
          listed: result.stats.listed || 0,
          failed: result.stats.failed || 0,
        };
      }
      resumeListingPolling();
    }
  } catch {
    ElMessage.error('加载失败，请重试');
  } finally {
    dataLoaded.value = true;
    loading.value = false;
  }
};

// 处理添加商品提交
const handleAddProductSubmit = async (data: any) => {
  try {
    if (data.base && Array.isArray(data.skus)) {
      const result = await createProductSupplyItem(data);
      if (result.success) {
        const count = Array.isArray(result.data) ? result.data.length : data.skus.length;
        ElMessage.success(`商品添加成功，已生成 ${count} 条 SKU 记录`);
        addDrawerVisible.value = false;
        await loadProductLibrary();
      } else {
        ElMessage.error(result.message || '添加失败');
      }
      return;
    }

    // Map form data to ProductSupply format
    const supplyData = {
      name: data.name,
      category: data.category || '',
      categoryLeaf: data.categoryLeaf || getCategoryLeaf(data.category),
      brand: data.brand || '',
      modelName: data.modelName || '',
      offerId: data.offerId || undefined,
      sku: data.sku || undefined,
      alibabaId: data.alibabaId || undefined, // Only send if provided (edit mode)
      barcode: data.barcode || undefined,
      price: parseFloat(data.price?.toString() || '0'),
      oldPrice: data.oldPrice ?? null,
      imageUrl: data.image || data.imageUrl || '',
      images: data.images || undefined,
      description: data.description || '',
      packageLength: data.packageLength,
      packageWidth: data.packageWidth,
      packageHeight: data.packageHeight,
      grossWeight: data.grossWeight,
      descriptionCategoryId: data.descriptionCategoryId || null,
      typeId: data.typeId || null,
      attributes: data.attributes || {},
      variantAttributes: data.variantAttributes || [],
      hiddenAttributes: data.hiddenAttributes || {},
      templateSnapshot: data.templateSnapshot || null,
      variantSummary: data.variantSummary || '',
      status: data.status || 'pending'
    };

    if (editingProductId.value !== null) {
      // 编辑模式：更新现有商品
      const existingItem = productLibrary.value.find(item => item.id === editingProductId.value);
      if (!existingItem) {
        ElMessage.error('未找到要编辑的商品');
        return;
      }
      
      const result = await updateProductSupplyItem(editingProductId.value, supplyData);
      if (result.success) {
        ElMessage.success('商品编辑成功');
        addDrawerVisible.value = false;
        setTimeout(() => {
          editingProductId.value = null;
        }, 300);
        await loadProductLibrary();
      } else {
        ElMessage.error(result.message || '编辑失败');
      }
    } else {
      // 新增模式：添加新商品（不传 alibabaId，后端自动生成 offerId/sku）
      delete supplyData.alibabaId;
      const result = await createProductSupplyItem(supplyData);
      if (result.success) {
        ElMessage.success('商品添加成功');
        addDrawerVisible.value = false;
        await loadProductLibrary();
      } else {
        ElMessage.error(result.message || '添加失败');
      }
    }
  } catch (error: any) {
    ElMessage.warning(error.message || '操作失败，请重试');
  }
};

// 搜索商品
const searchProductLibrary = () => {
  currentPage.value = 1;
  loadProductLibrary();
};

// 状态变化
const handleStatusChange = (status?: ProductLibraryStatusFilter | '') => {
  selectedStatus.value = normalizeStatusFilter(status ?? selectedStatus.value);
  currentPage.value = 1;
  loadProductLibrary();
};

const handleStatsFilterChange = (status: '' | 'pending' | 'listed' | 'failed') => {
  const nextStatus = status || STATUS_ALL;
  if (selectedStatus.value === nextStatus) return;
  selectedStatus.value = nextStatus;
  currentPage.value = 1;
  loadProductLibrary();
};

// 页面变化
const handlePageChange = (page: number) => {
  currentPage.value = page;
  loadProductLibrary();
};

// 页面大小变化
const handlePageSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadProductLibrary();
};

const viewSource = (_product: any) => {};

// 编辑操作
const isProductActionLocked = (product: ProductSupplyItem) => ['listing', 'listed'].includes(product.status);

const handleEdit = (product: any) => {
  if (isProductActionLocked(product)) {
    ElMessage.warning(product.status === 'listing' ? '上架中商品禁止编辑' : '已上架商品禁止编辑');
    return;
  }
  editingProductId.value = product.id;
  addDrawerVisible.value = true;
};

// 删除操作
const handleDelete = async (product: any) => {
  if (isProductActionLocked(product)) {
    ElMessage.warning(product.status === 'listing' ? '上架中商品禁止删除' : '已上架商品禁止删除');
    return;
  }
  try {
    const result = await deleteProductSupplyItem(product.id);
    if (result.success) {
      ElMessage.success('商品删除成功');
      await loadProductLibrary();
    } else {
      ElMessage.error(result.message || '删除失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败，请重试');
  }
};

const openSourceDialog = (product: ProductSupplyItem) => {
  sourceEditingProduct.value = product;
  sourceExistingKeyword.value = '';
  pendingSourceAction.value = null;
  pendingSource.value = null;
  selectedSourceKey.value = '';
  sourceDialogVisible.value = true;
  loadSupplySources();
};

const formatSourceMoney = (value: number | null | undefined) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(2) : '0.00';
};

const normalizeListingErrorText = (error: unknown) => {
  if (error === null || error === undefined || error === '') return '';
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    return error.map(normalizeListingErrorText).filter(Boolean).join('; ');
  }
  if (typeof error === 'object') {
    const value = error as Record<string, any>;
    const directMessage = value.message || value.error || value.reason || value.description || value.detail;
    if (directMessage) return normalizeListingErrorText(directMessage);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(error);
};

const selectExistingSource = (source: SupplySource) => {
  pendingSourceAction.value = 'bind';
  pendingSource.value = sourceToPayload(source);
  selectedSourceKey.value = `existing:${source.id}`;
};

const markSourceUnbind = () => {
  pendingSourceAction.value = 'unbind';
  pendingSource.value = null;
  selectedSourceKey.value = '';
};

const openSourceDetailUrl = (source: SupplySource | UpdateSupplySourceData) => {
  const url = getAlibabaSourceDetailUrl(source);
  if (!url) {
    ElMessage.warning('当前货源没有可打开的1688链接');
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

const loadSupplySources = async () => {
  sourceListLoading.value = true;
  try {
    const result = await getSupplySources({
      page: 1,
      limit: 20,
      keyword: sourceExistingKeyword.value.trim() || undefined,
    });
    if (result.success) {
      sourceExistingList.value = result.data || [];
    } else {
      ElMessage.error(result.message || '货源列表加载失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '货源列表加载失败');
  } finally {
    sourceListLoading.value = false;
  }
};

const handleSourceConfirm = async () => {
  if (!sourceEditingProduct.value || !pendingSourceAction.value) return;
  sourceSubmitting.value = true;
  try {
    const result = pendingSourceAction.value === 'unbind'
      ? await unbindProductSupplySource(sourceEditingProduct.value.id)
      : await updateProductSupplySource(sourceEditingProduct.value.id, pendingSource.value as UpdateSupplySourceData);

    if (result.success) {
      ElMessage.success(pendingSourceAction.value === 'unbind' ? '货源绑定已解绑' : '货源绑定已保存');
      sourceDialogVisible.value = false;
      await loadProductLibrary();
    } else {
      ElMessage.error(result.message || '货源绑定保存失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '货源绑定保存失败');
  } finally {
    sourceSubmitting.value = false;
  }
};

// 轮询管理：Map<productId, { timer, attempts }>
const pollingTasks = new Map<number, { timer: ReturnType<typeof setInterval>; attempts: number }>();
const MAX_POLL_ATTEMPTS = 30; // 最多轮询30次（30分钟）
const POLL_INTERVAL = 60000; // 1分钟间隔

type ListingStatusCheckOptions = {
  notify?: boolean;
  reload?: boolean;
};

// 上架商品到Ozon
const handleListToOzon = async (product: ProductSupplyItem) => {
  listingProduct.value = product;
  listingDialogVisible.value = true;
};

const handleListingSubmitted = async ({ taskId }: { taskId?: string }) => {
  const productId = listingProduct.value?.id;
  listingDialogVisible.value = false;
  if (!productId) {
    await loadProductLibrary();
    return;
  }
  await loadProductLibrary();
  if (taskId) {
    startPolling(productId);
  }
};

const handleListingCheckEdit = async (check: ProductSupplyListingCheck) => {
  const product = listingProduct.value;
  listingDialogVisible.value = false;
  if (!product) return;
  editingProductId.value = product.id;
  addDrawerVisible.value = true;
  await nextTick();
  window.setTimeout(() => {
    addProductDrawerRef.value?.focusListingCheck?.(check);
  }, 350);
};

const checkListingStatusOnce = async (
  productId: number,
  options: ListingStatusCheckOptions = {},
): Promise<string | null> => {
  const { notify = true, reload = true } = options;
  const result = await checkListingStatus(productId);

  if (result.success && result.data) {
    const newStatus = result.data.status;
    if (newStatus === 'listing') {
      if (notify) {
        ElMessage.info('Ozon仍在处理中，继续等待...');
      }
    } else if (newStatus === 'listed') {
      if (notify) {
        ElMessage.success('商品已成功提交到Ozon平台');
      }
      stopPolling(productId);
    } else if (newStatus === 'failed') {
      if (notify) {
        ElMessage.error(`上架失败: ${normalizeListingErrorText(result.data.listingError) || '未知错误'}`);
      }
      stopPolling(productId);
    }

    if (reload) {
      await loadProductLibrary();
    }
    return newStatus;
  }

  if (notify) {
    ElMessage.warning(result.message || '查询失败');
  }
  return null;
};

// 开始轮询任务状态
const startPolling = (productId: number, options: { announce?: boolean } = {}) => {
  const { announce = true } = options;
  // 如果已有轮询，先停止
  if (pollingTasks.has(productId)) {
    return;
  }

  let attempts = 0;
  const runCheck = async () => {
    attempts++;
    try {
      const newStatus = await checkListingStatusOnce(productId, { notify: announce, reload: true });
      // 状态已确定（不再是listing），停止轮询
      if (newStatus && newStatus !== 'listing') {
        return;
      }
      // 超过最大次数，停止轮询
      if (attempts >= MAX_POLL_ATTEMPTS) {
        stopPolling(productId);
        if (announce) {
          ElMessage.warning('轮询已达上限，请手动查询状态');
        }
      }
    } catch {
      // 轮询出错不停止，继续重试
    }
  };

  const timer = setInterval(runCheck, POLL_INTERVAL);

  pollingTasks.set(productId, { timer, attempts });
  void runCheck();
  if (announce) {
    ElMessage.info('已开启状态轮询（每1分钟一次）');
  }
};

const resumeListingPolling = () => {
  productLibrary.value
    .filter(product => product.status === 'listing' && product.ozonTaskId)
    .forEach(product => {
      startPolling(product.id, { announce: false });
    });
};

// 停止轮询
const stopPolling = (productId: number) => {
  const task = pollingTasks.get(productId);
  if (task) {
    clearInterval(task.timer);
    pollingTasks.delete(productId);
  }
};

// 手动查询上架状态
const handleCheckListingStatus = async (product: ProductSupplyItem) => {
  try {
    const newStatus = await checkListingStatusOnce(product.id);
    if (newStatus === 'listing' && !pollingTasks.has(product.id)) {
      startPolling(product.id);
    }
  } catch (error: any) {
    ElMessage.error(error.message || '查询失败');
  }
};

// 组件卸载时清理所有轮询
onBeforeUnmount(() => {
  pollingTasks.forEach((task) => clearInterval(task.timer));
  pollingTasks.clear();
});

// 页面加载时初始化数据
onMounted(() => {
  loadProductLibrary();
  void loadProductLimits();
});
</script>

<style scoped>
.product-library-page {
  gap: 0;
}

.product-library-card {
  overflow: hidden;
}

:global(.source-binding-dialog-panel) {
  width: min(700px, calc(100vw - var(--app-dialog-edge, 48px))) !important;
  height: min(790px, calc(100vh - 64px));
}

:global(.source-binding-dialog-panel .app-dialog-body) {
  display: flex;
  min-height: 0;
  padding: 20px 24px 0;
  overflow: hidden;
}

.source-dialog {
  display: flex;
  min-height: 0;
  width: 100%;
  flex: 1 1 auto;
  flex-direction: column;
}

.source-section + .source-section {
  margin-top: 18px;
}

.source-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
  margin-bottom: 12px;
}

.source-section-title-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  line-height: 20px;
}

.source-section-title-bar {
  width: 4px;
  height: 20px;
  border-radius: 999px;
  background: #3b82f6;
  flex: 0 0 auto;
}

.source-unbind-small {
  height: 24px;
  padding: 0 9px;
  border: 1px solid #fecaca;
  border-radius: 6px;
  background: #fff7f7;
  color: #dc2626;
  font-size: 12px;
  line-height: 22px;
}

.source-unbind-small:hover,
.source-unbind-small-active {
  border-color: #fca5a5;
  background: #fee2e2;
}

.source-current {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 12px;
  min-height: 80px;
  display: flex;
  align-items: center;
}

.source-current-main {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
}

.source-current-link {
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.18s ease;
}

.source-current-link:hover {
  background: #eff6ff;
}

.source-current-image {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  border-radius: 8px;
  object-fit: cover;
  background: #e2e8f0;
}

.source-current-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.source-current-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #64748b;
}

.source-empty-current {
  width: 100%;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

.source-method-section {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.source-method-divider {
  height: 1px;
  margin: 4px 0 14px;
  background: #e2e8f0;
}

.source-dialog-fixed-body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: hidden;
}

.source-search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  margin-bottom: 12px;
}

.source-action-button {
  min-width: 72px;
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.24);
}

.source-action-button:hover,
.source-action-button:focus {
  background: #2563eb;
  color: #ffffff;
  border: none;
}

.source-list {
  min-height: 0;
  max-height: none;
  flex: 1 1 auto;
  overflow-y: auto;
  padding-right: 4px;
}

.source-card {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
  transition: all 0.18s ease;
}

.source-card + .source-card {
  margin-top: 8px;
}

.source-card:hover,
.source-card-active {
  border-color: #93c5fd;
  background: #eff6ff;
}

.source-card-check {
  position: absolute;
  right: 7px;
  bottom: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #2563eb;
  color: #ffffff;
  font-size: 11px;
  box-shadow: 0 2px 5px rgba(37, 99, 235, 0.24);
}

.source-card-check :deep(.el-icon) {
  font-size: 11px;
}

.source-card-image,
.source-card-placeholder {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  border-radius: 8px;
}

.source-card-image {
  object-fit: cover;
  background: #f1f5f9;
}

.source-card-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dbeafe;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.source-card-body {
  min-width: 0;
  flex: 1;
}

.source-card-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.source-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.source-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 190px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
  font-size: 13px;
}

.source-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}
</style>
