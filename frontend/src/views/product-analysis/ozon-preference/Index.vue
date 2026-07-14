<template>
  <MainLayout>
    <div class="app-page app-page-stack app-page--fluid ozon-preference-page">
      <!-- 搜索模块和产品列表合并 -->
      <div class="app-page-card ozon-preference-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <!-- 搜索区域 -->
        <div class="search-section">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <!-- 类别选择文本框 -->
              <div class="app-dropdown-search">
                <el-input v-model="categoryText" placeholder="选择类别" readonly @click="openCategoryDialog"
                  class="category-input">
                  <template #prefix>
                    <el-icon>
                      <Postcard />
                    </el-icon>
                  </template>
                  <template #suffix>
                    <button v-if="categoryText" class="category-clear-btn" @click.stop="clearCategory" title="清空">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </template>
                </el-input>
              </div>

              <!-- 搜索框 -->
              <el-input v-model="searchKeyword" placeholder="输入关键字搜索..." size="default"
                @keyup.enter="handleSearchFromTab" class="search-input" clearable>
                <template #prefix>
                  <el-icon>
                    <Search />
                  </el-icon>
                </template>
              </el-input>

              <!-- 搜索按钮 -->
              <button class="ozon-pref-search-btn" @click="handleSearchFromTab" :disabled="!canSearch">
                <el-icon class="mr-1">
                  <Search />
                </el-icon>搜索
              </button>
            </div>

            <el-button type="primary" class="btn-create btn-manual-add" @click="openManualAddDialog">
              <el-icon class="mr-1">
                <Plus />
              </el-icon>
              手动添加
            </el-button>
          </div>
        </div>

        <!-- 分类选择弹窗 -->
        <CategorySelectDialog v-model="categoryDialogVisible" :load-tree-data="getCategoryTreeData"
          :initial-cascader-value="internalCascaderValue" title="选择商品类型" @select="handleCategorySelectFromTab" />

        <!-- 产品列表 -->
        <div class="relative preference-results-area">
          <!-- 搜索进度覆盖层 -->
          <ProgressOverlay
            :isLoading="isLoading"
            :progress="searchProgress"
            :stage="searchProgressStage"
            :title="searchProgressCopy.title"
            :subtitle="searchProgressCopy.subtitle"
          />

          <ProductList :products="displayProducts" :isExtractingTypes="isExtractingTypes"
            :extractCompleted="extractCompleted" :extractedCount="extractedCount" :extractTotal="extractTotal"
            :savingProductId="savingProductId" :loading="tableLoading" @saveProduct="saveProductToDatabase" />

          <!-- 懒加载哨兵 -->
          <div v-if="displayProducts.length > 0" ref="loadMoreSentinel" class="h-10 flex items-center justify-center">
            <div v-if="isLoadingMore" class="preference-load-more-hint flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              加载更多...
            </div>
            <div v-else-if="hasMoreProducts" class="preference-load-more-hint">
              下拉加载更多
            </div>
            <div v-else-if="displayProducts.length > 0" class="preference-load-more-end">
              已加载全部 {{ displayProducts.length }} 条
            </div>
          </div>
        </div>
      </div>
      <el-backtop target=".page-content-shell" :right="30" :bottom="80" :visibility-height="360">
        <div class="backtop-btn">
          <el-icon>
            <ArrowUp />
          </el-icon>
        </div>
      </el-backtop>
    </div>

    <AppDialog
      v-model="manualDialogVisible"
      title="手动添加 Ozon 商品"
      subtitle="输入 Ozon 商品链接，解析后保存到货源采集"
      :icon="Link"
      confirm-text="保存"
      confirm-loading-text="保存中..."
      :confirm-loading="manualSaving"
      :confirm-disabled="!manualParsedProduct || manualParsing"
      :cancel-disabled="manualParsing || manualSaving"
      content-class="manual-add-dialog-panel"
      @confirm="saveManualProduct"
      @cancel="resetManualDialog"
    >
      <div class="manual-add-dialog">
        <div class="manual-url-row">
          <el-input
            v-model="manualProductUrl"
            placeholder="请输入 Ozon 商品链接"
            :disabled="manualParsing || manualSaving"
            clearable
            @keyup.enter="parseManualProductUrl"
          >
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
          <el-button
            type="primary"
            class="manual-parse-button"
            :loading="manualParsing"
            :disabled="!manualProductUrl.trim() || manualSaving"
            @click="parseManualProductUrl"
          >
            解析
          </el-button>
        </div>

        <div class="manual-content-area">
          <div v-if="manualParsing" class="manual-progress">
            <div class="manual-spinner"></div>
            <div class="manual-progress-copy">
              <div class="manual-progress-title">链接解析中，请勿关闭</div>
              <div class="manual-progress-text">{{ manualProgressText }}</div>
            </div>
          </div>

          <div v-if="manualParsedProduct" class="manual-product-card">
            <img v-if="manualParsedProduct.imageUrl" :src="manualParsedProduct.imageUrl" :alt="manualParsedProduct.name" />
            <div v-else class="manual-product-placeholder">
              <el-icon><Box /></el-icon>
            </div>
            <div class="manual-product-info">
              <a :href="manualParsedProduct.productUrl" target="_blank" class="manual-product-title" :title="manualParsedProduct.name">
                {{ manualParsedProduct.name }}
              </a>
              <div class="manual-product-meta">
                <span :title="manualParsedProduct.id">货号：{{ manualParsedProduct.id }}</span>
                <span v-if="manualParsedProduct.productType" :title="manualParsedProduct.productType">类目：{{ manualParsedProduct.productType }}</span>
                <span v-else class="manual-product-warning">类目获取失败</span>
              </div>
              <div class="manual-product-stats">
                <span class="manual-price">¥{{ manualParsedProduct.price.toFixed(2) }}</span>
                <span v-if="manualParsedProduct.originalPrice > manualParsedProduct.price" class="manual-original-price">
                  ¥{{ manualParsedProduct.originalPrice.toFixed(2) }}
                </span>
                <span>评价 {{ manualParsedProduct.reviewCount }}</span>
                <span>评分 {{ manualParsedProduct.rating || '-' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppDialog>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue';
import MainLayout from '@/components/MainLayout.vue';
import CategorySelectDialog from '@/components/ui/CategorySelectDialog.vue';
import AppDialog from '@/components/ui/AppDialog.vue';
import ProductList from './components/ProductList.vue';
import ProgressOverlay from './components/ProgressOverlay.vue';
import { ElMessage } from 'element-plus';
import { ArrowUp, Box, Link, Plus, Search, Postcard } from '@element-plus/icons-vue';
import ozonCategoriesRaw from '@/assets/ozonCategories.json';
import { searchOzonProducts, getCachedOzonProducts, batchExtractTypes, getBatchExtractStatus, getOzonProductByUrl, getOzonBrowserTask, normalizeOzonProducts } from '@/api/ozonCrawlerAPI';
import { resetBatchExtractStatus } from '@/api/ozonTypeAPI';
import { createProductSelection } from '@/api/productSelectionAPI';
import {
  clearSearchProgressState,
  getSearchProgressCopy,
  readSearchProgressState,
  writeSearchProgressState,
  type SearchProgressStage,
} from './searchProgressState';

// Ozon 类目数据
interface OzonType { type_id: number; type_name: string; disabled: boolean }
interface OzonSubCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonType[] }
interface OzonTopCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonSubCat[] }
const ozonCategories = (ozonCategoriesRaw as any).result as OzonTopCat[];

// 类目树节点类型
interface TreeNode {
  id: string
  label: string
  typeId?: number
  topCatId: number
  subCatId?: number
  children: TreeNode[]
}

// 构建 el-tree 数据
function buildCategoryTree(cats: OzonTopCat[]): TreeNode[] {
  if (!cats || cats.length === 0) return [];
  return cats.filter(c => !c.disabled).map(top => ({
    id: `top-${top.description_category_id}`,
    label: top.category_name,
    topCatId: top.description_category_id,
    children: top.children.filter(s => !s.disabled).map(sub => ({
      id: sub.description_category_id != null ? `sub-${sub.description_category_id}` : `sub-${Math.random().toString(36).slice(2)}`,
      label: sub.category_name,
      topCatId: top.description_category_id,
      subCatId: sub.description_category_id,
      children: sub.children.filter(t => !t.disabled).map(t => ({
        id: `type-${t.type_id}`,
        label: t.type_name,
        typeId: t.type_id,
        topCatId: top.description_category_id,
        subCatId: sub.description_category_id,
        children: []
      }))
    }))
  }));
}

let cachedCategoryTreeData: TreeNode[] | null = null;
const getCategoryTreeData = () => {
  if (!cachedCategoryTreeData) {
    cachedCategoryTreeData = buildCategoryTree(ozonCategories);
  }
  return cachedCategoryTreeData;
};

// 本地产品类型接口
interface ProductWithType {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  productUrl: string;
  stock: number;
  productType: string;
  typeErrorMessage?: string;
}

interface ProductSelectionSavePayload extends ProductWithType {
  descriptionCategoryId?: number | null;
  typeId?: number | null;
}

type TypeExtractionResult = { url: string; type: string; title?: string; status: string; message?: string };

// 搜索相关状态
const searchKeyword = ref('');
const selectedSubCategory = ref('');

// 分类选择弹窗
const categoryDialogVisible = ref(false);
const categoryText = ref('');
const internalCascaderValue = ref<number[]>([]);
const selectedDescriptionCategoryId = ref<number | null>(null);
const selectedTypeId = ref<number | null>(null);
const canSearch = computed(() => Boolean(searchKeyword.value.trim() || categoryText.value.trim()));

// 产品列表状态
const products = ref<ProductWithType[]>([]);
const isLoading = ref(false);
const isInitializingProducts = ref(true);
const tableSkeletonHold = ref(false);
const searchProgress = ref(0);
const searchProgressStage = ref<SearchProgressStage>('startup');
const searchProgressCopy = computed(() => getSearchProgressCopy(searchProgressStage.value));
const tableLoading = computed(() => isLoading.value || isInitializingProducts.value || tableSkeletonHold.value);
const currentPage = ref(1);
const pageSize = 20;
const isLoadingMore = ref(false);
const hasMoreProducts = ref(false);
const loadMoreSentinel = ref<HTMLElement | null>(null);
let loadMoreObserver: IntersectionObserver | null = null;
const MIN_TABLE_SKELETON_MS = 520;
let tableSkeletonTimer: ReturnType<typeof setTimeout> | null = null;

const holdTableSkeleton = (duration = MIN_TABLE_SKELETON_MS) => {
  if (tableSkeletonTimer) {
    clearTimeout(tableSkeletonTimer);
  }
  tableSkeletonHold.value = true;
  tableSkeletonTimer = setTimeout(() => {
    tableSkeletonHold.value = false;
    tableSkeletonTimer = null;
  }, duration);
};

// 类型提取状态
const isExtractingTypes = ref(false);
const extractCompleted = ref(false);
const extractedCount = ref(0);
const extractTotal = ref(0);
let activeExtractRunId = 0;

// 保存状态
const savingProductId = ref<string | null>(null);

const manualDialogVisible = ref(false);
const manualProductUrl = ref('');
const manualParsing = ref(false);
const manualSaving = ref(false);
const manualProgressText = ref('');
const manualParsedProduct = ref<ProductSelectionSavePayload | null>(null);

// localStorage 持久化 key
const EXTRACT_STATE_KEY = 'pa_extract_state';

const persistSearchProgress = (
  keyword: string,
  category: string | undefined,
  stage: SearchProgressStage,
  progress: number,
  startedAt: number,
) => {
  searchProgressStage.value = stage;
  searchProgress.value = Math.max(searchProgress.value, Math.min(100, Math.round(progress)));
  writeSearchProgressState(localStorage, {
    keyword,
    category,
    stage,
    progress: searchProgress.value,
    startedAt,
    updatedAt: Date.now(),
  });
};

const clearPersistedSearchProgress = () => {
  clearSearchProgressState(localStorage);
};

const getSearchCache = async (keyword: string): Promise<ProductWithType[] | null> => {
  try {
    const response = await getCachedOzonProducts(keyword);
    if (!response.success || !response.fromCache || !Array.isArray(response.data) || response.data.length === 0) return null;
    return response.data.map(toProductWithType);
  } catch {
    return null;
  }
};

// 清除所有搜索缓存
const clearAllSearchCache = () => {
  localStorage.removeItem('pa_search_keyword');
  localStorage.removeItem('pa_category_path');
  localStorage.removeItem(EXTRACT_STATE_KEY);
  clearPersistedSearchProgress();
};

const isLanguageCurrencyWarning = (message?: string) => {
  const text = String(message || '');
  return /语言|货币|人民币|卢布|中文|CNY|RUB/i.test(text);
};

const resetManualDialog = () => {
  if (manualParsing.value || manualSaving.value) {
    return;
  }
  manualProductUrl.value = '';
  manualProgressText.value = '';
  manualParsedProduct.value = null;
};

const openManualAddDialog = async () => {
  resetManualDialog();
  manualDialogVisible.value = true;
};

const parseManualProductUrl = async () => {
  const productUrl = manualProductUrl.value.trim();
  if (!productUrl) {
    ElMessage.warning('请输入 Ozon 商品链接');
    return;
  }

  manualParsing.value = true;
  manualParsedProduct.value = null;
  manualProgressText.value = '校验链接';

  try {
    await new Promise(resolve => setTimeout(resolve, 200));
    manualProgressText.value = '获取商品信息';
    const response = await getOzonProductByUrl(productUrl);
    if (response.code === 'LOCAL_WORKER_TASK_CREATED' && response.taskId) {
      manualProgressText.value = '本机采集器执行中';
      const product = await waitForWorkerProductByUrl(response.taskId);
      manualParsedProduct.value = {
        ...product,
        productType: product.productType || '',
        descriptionCategoryId: product.descriptionCategoryId ?? null,
        typeId: product.typeId ?? null,
      };
      manualProgressText.value = '解析完成';
      ElMessage.success('链接解析成功');
      return;
    }
    manualProgressText.value = '获取类型';

    if (!response.success || !response.data) {
      ElMessage.error(response.message || '链接解析失败');
      return;
    }

    manualParsedProduct.value = {
      ...response.data,
      productType: response.data.productType || '',
      descriptionCategoryId: response.data.descriptionCategoryId ?? null,
      typeId: response.data.typeId ?? null,
    };
    manualProgressText.value = '解析完成';
    ElMessage.success('链接解析成功');
  } catch (error: any) {
    ElMessage.error(error.message || '链接解析失败');
  } finally {
    manualParsing.value = false;
  }
};

// 计算显示的产品（分页）
const displayProducts = computed(() => {
  return products.value.slice(0, currentPage.value * pageSize);
});

// 组件挂载时初始化
onMounted(() => {
  holdTableSkeleton();
  void (async () => {
  try {
  // localStorage 恢复搜索条件
  const storedKeyword = localStorage.getItem('pa_search_keyword');
  if (storedKeyword) searchKeyword.value = storedKeyword;
  // 按当前keyword恢复商品快照，过期时间以 Ozon 优选配置为准
  if (storedKeyword) {
    const cached = await getSearchCache(storedKeyword);
    if (cached) {
      products.value = cached;
      hasMoreProducts.value = cached.length > pageSize;
      extractCompleted.value = cached.every(p => !!p.productType && p.productType !== '待分类');
      // 从后端持久化类型缓存恢复 productType（解决刷新后类型丢失）
      if (products.value.length > 0) {
        try {
          const statusResp = await getBatchExtractStatus();
          if (statusResp.success && statusResp.data?.results) {
            applyTypeResultsToProducts(statusResp.data.results);
            extractCompleted.value = products.value.every(p => !!p.productType && p.productType !== '待分类');
          }
        } catch {
          // 类型缓存恢复失败不阻塞商品列表展示。
        }
      }
    }
  }

  // 检测是否有未完成的搜索（切换页面后恢复）
  const searchState = readSearchProgressState(localStorage);
  if (searchState) {
    if (searchState.keyword === storedKeyword) {
      isLoading.value = true;
      searchProgressStage.value = searchState.stage;
      searchProgress.value = searchState.progress;
      // 自动重新触发搜索，恢复同一关键词、类目和进度文案
      handleSearch(searchState.keyword, searchState.category, searchState);
    } else {
      clearPersistedSearchProgress();
    }
  }

  // 恢复未完成的类型提取任务（仅当关键词匹配当前搜索时）
  const extractStateRaw = localStorage.getItem(EXTRACT_STATE_KEY);
  if (extractStateRaw) {
    try {
      const state = JSON.parse(extractStateRaw);
      // 只恢复当前关键词的提取任务；其他关键词的提取状态丢弃
      if (state.extracting && state.keyword && state.keyword === searchKeyword.value && Date.now() - state.timestamp < 3600000) {
        resumeTypeExtraction(state);
      } else {
        localStorage.removeItem(EXTRACT_STATE_KEY);
      }
    } catch {
      localStorage.removeItem(EXTRACT_STATE_KEY);
    }
  }

  setupLoadMoreObserver();
  } finally {
    isInitializingProducts.value = false;
  }
  })();
});

onUnmounted(() => {
  if (loadMoreObserver) { loadMoreObserver.disconnect(); loadMoreObserver = null; }
  if (tableSkeletonTimer) { clearTimeout(tableSkeletonTimer); tableSkeletonTimer = null; }
});

watch(searchKeyword, (val) => { localStorage.setItem('pa_search_keyword', val); });

// 懒加载观察器
const setupLoadMoreObserver = () => {
  if (loadMoreObserver) loadMoreObserver.disconnect();
  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasMoreProducts.value && !isLoadingMore.value && !isLoading.value) {
        loadMoreProducts();
      }
    },
    { rootMargin: '200px' }
  );
  if (loadMoreSentinel.value) loadMoreObserver.observe(loadMoreSentinel.value);
};

const loadMoreProducts = async () => {
  if (isLoadingMore.value || !hasMoreProducts.value) return;
  isLoadingMore.value = true;
  const nextPage = currentPage.value + 1;
  const maxItems = nextPage * pageSize;
  if (maxItems >= products.value.length) {
    currentPage.value = nextPage;
    hasMoreProducts.value = false;
    isLoadingMore.value = false;
    return;
  }
  currentPage.value = nextPage;
  hasMoreProducts.value = products.value.length > currentPage.value * pageSize;
  isLoadingMore.value = false;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getUrlPathname = (url: string) => {
  try { return new URL(url).pathname; } catch { return url; }
};

const toProductWithType = (item: any): ProductWithType => ({
  id: item.id || `SKU${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  name: item.name || item.title || '',
  price: item.price || 0,
  originalPrice: item.originalPrice || 0,
  discount: item.discount || 0,
  rating: item.rating || 0,
  reviewCount: item.reviewCount || 0,
  imageUrl: item.imageUrl || '',
  productUrl: item.productUrl || '',
  stock: item.stock || 0,
  productType: item.productType || '',
  typeErrorMessage: item.typeErrorMessage || '',
});

const extractProductsFromWorkerResult = (result: any) => {
  const json = result?.json || result;
  const products = json?.products || json?.data || [];
  return Array.isArray(products) ? normalizeOzonProducts(products).map(toProductWithType) : [];
};

const waitForWorkerSearchProducts = async (taskId: number, keyword: string, category: string | undefined, startedAt: number) => {
  for (let i = 0; i < 120; i++) {
    const taskResp = await getOzonBrowserTask(taskId);
    const task = taskResp.data;
    if (!taskResp.success || !task) {
      throw new Error(taskResp.message || '本机采集任务不存在');
    }

    if (task.status === 'success') {
      const workerProducts = extractProductsFromWorkerResult(task.result);
      if (workerProducts.length === 0) {
        throw new Error('本机采集完成，但未获取到商品数据');
      }
      return workerProducts;
    }

    if (['failed', 'cancelled', 'expired'].includes(task.status)) {
      throw new Error(task.errorMessage || '本机采集任务失败');
    }

    const progress = Math.min(88, 64 + i * 0.3);
    persistSearchProgress(keyword, category, 'fetching', progress, startedAt);
    await sleep(2000);
  }

  throw new Error('本机采集任务超时，请确认采集器是否在线');
};

const extractProductFromWorkerResult = (result: any) => {
  const json = result?.json || result;
  const product = json?.product || json?.data || null;
  if (!product) return null;
  return normalizeOzonProducts([product]).map(toProductWithType)[0] || null;
};

const waitForWorkerProductByUrl = async (taskId: number) => {
  for (let i = 0; i < 120; i++) {
    const taskResp = await getOzonBrowserTask(taskId);
    const task = taskResp.data;
    if (!taskResp.success || !task) {
      throw new Error(taskResp.message || '本机采集任务不存在');
    }

    if (task.status === 'success') {
      const product = extractProductFromWorkerResult(task.result);
      if (!product) {
        throw new Error('本机采集完成，但未获取到商品数据');
      }
      return product;
    }

    if (['failed', 'cancelled', 'expired'].includes(task.status)) {
      throw new Error(task.errorMessage || '本机采集任务失败');
    }

    manualProgressText.value = i % 2 === 0 ? '本机采集器获取商品信息' : '等待 Ozon 页面返回数据';
    await sleep(2000);
  }

  throw new Error('本机采集任务超时，请确认采集器是否在线');
};

const findProductIndexByUrl = (url: string) => {
  let idx = products.value.findIndex(p => p.productUrl === url);
  if (idx !== -1) return idx;
  const urlPath = getUrlPathname(url);
  return products.value.findIndex(p => getUrlPathname(p.productUrl) === urlPath);
};

const hasDetailTitle = (title?: string) => {
  const value = String(title || '').trim();
  return value.length > 1 && !/^(本周折扣|还剩\d+件?|[\d\s]+评价积分|\d+分钟内|一小时内)$/.test(value);
};

const applyTypeResultsToProducts = (results: TypeExtractionResult[]) => {
  let applied = 0;
  const resultMap = new Map<string, TypeExtractionResult>();
  for (const result of results) {
    resultMap.set(result.url, result);
    resultMap.set(getUrlPathname(result.url), result);
  }

  products.value = products.value.map((product) => {
    const r = resultMap.get(product.productUrl) || resultMap.get(getUrlPathname(product.productUrl));
    if (!r) return product;

    let nextProduct = product;
    let changed = false;
    if (r.title && hasDetailTitle(r.title) && nextProduct.name !== r.title.trim()) {
      nextProduct = { ...nextProduct, name: r.title.trim() };
      changed = true;
    }
    if (r.status === 'done' && r.type && (nextProduct.productType !== r.type || nextProduct.typeErrorMessage)) {
      nextProduct = { ...nextProduct, productType: r.type, typeErrorMessage: '' };
      changed = true;
    } else if (r.status === 'error') {
      const message = r.message || '类型获取失败';
      if (!nextProduct.productType && nextProduct.typeErrorMessage !== message) {
        nextProduct = { ...nextProduct, typeErrorMessage: message };
        changed = true;
      }
    } else if (r.status === 'pending' && nextProduct.typeErrorMessage) {
      nextProduct = { ...nextProduct, typeErrorMessage: '' };
      changed = true;
    }
    if (changed) applied++;
    return nextProduct;
  });
  return applied;
};

const restoreProductTypesFromCache = async () => {
  if (products.value.length === 0) return 0;
  const statusResp = await getBatchExtractStatus();
  if (!statusResp.success || !statusResp.data?.results) return 0;
  return applyTypeResultsToProducts(statusResp.data.results);
};

const renderProducts = (items: ProductWithType[]) => {
  products.value = items;
  currentPage.value = 1;
  hasMoreProducts.value = items.length > pageSize;
  isLoadingMore.value = false;
  extractedCount.value = 0;
  extractTotal.value = 0;
  extractCompleted.value = items.every(p => !!p.productType && p.productType !== '待分类');
  if (items.length > 0) {
    void nextTick(() => setupLoadMoreObserver());
  }
};

const updateExtractState = (keyword: string, category: string | undefined, total: number, results: TypeExtractionResult[]) => {
  localStorage.setItem(EXTRACT_STATE_KEY, JSON.stringify({
    keyword,
    category,
    extracting: true,
    total,
    extractedUrls: results.filter(r => r.status === 'done' && r.type).map(r => r.url),
    timestamp: Date.now(),
  }));
};

const pollTypeExtraction = async (keyword: string, category: string | undefined, runId: number, cachedDone: number) => {
  let pollCount = 0;
  while (pollCount < 120) {
    await sleep(2000);
    if (runId !== activeExtractRunId) return;

    const statusResp = await getBatchExtractStatus();
    if (statusResp.success && statusResp.data) {
      const processed = statusResp.data.done + statusResp.data.error;
      extractedCount.value = Math.min(extractTotal.value, cachedDone + processed);

      if (statusResp.data.results) {
        applyTypeResultsToProducts(statusResp.data.results);
        updateExtractState(keyword, category, extractTotal.value, statusResp.data.results);
      }

      if (!statusResp.data.running || processed >= statusResp.data.total) break;
    }
    pollCount++;
  }

  if (pollCount >= 120) {
    ElMessage.warning('类型提取超时，部分商品类型可能未获取');
  }
};

const startBackgroundTypeExtraction = async (keyword: string, category: string | undefined, sourceProducts: ProductWithType[]) => {
  const urlsToExtract = sourceProducts
    .filter(p => !p.productType && p.productUrl)
    .map(p => p.productUrl);

  if (urlsToExtract.length === 0) {
    extractCompleted.value = true;
    return;
  }

  const runId = ++activeExtractRunId;

  try {
    const cacheStatus = await getBatchExtractStatus();
    const cachedResults = new Map<string, TypeExtractionResult>();
    if (cacheStatus.success && cacheStatus.data?.results) {
      for (const r of cacheStatus.data.results) {
        if ((r.status === 'done' && r.type) || hasDetailTitle(r.title)) {
          cachedResults.set(r.url, r);
          cachedResults.set(getUrlPathname(r.url), r);
        }
      }
    }

    let cachedDone = 0;
    const needExtract: string[] = [];
    const cachedToApply: TypeExtractionResult[] = [];
    for (const url of urlsToExtract) {
      const cached = cachedResults.get(url) || cachedResults.get(getUrlPathname(url));
      if (cached) {
        if (findProductIndexByUrl(url) !== -1) {
          cachedToApply.push(cached);
          cachedDone++;
        }
      } else {
        const idx = findProductIndexByUrl(url);
        if (idx !== -1) {
          products.value[idx].typeErrorMessage = '';
        }
        needExtract.push(url);
      }
    }
    if (cachedToApply.length > 0) {
      applyTypeResultsToProducts(cachedToApply);
    }

    extractedCount.value = cachedDone;

    if (needExtract.length === 0) {
      extractCompleted.value = true;
      return;
    }

    extractTotal.value = needExtract.length;
    isExtractingTypes.value = true;
    extractCompleted.value = false;
    localStorage.setItem(EXTRACT_STATE_KEY, JSON.stringify({
      keyword,
      category,
      extracting: true,
      total: needExtract.length,
      extractedUrls: [] as string[],
      timestamp: Date.now(),
    }));

    const fallbackTitles = needExtract.reduce<Record<string, string>>((acc, url) => {
      const idx = findProductIndexByUrl(url);
      const product = idx === -1 ? sourceProducts.find(p => p.productUrl === url) : products.value[idx];
      if (product?.name) acc[url] = product.name;
      return acc;
    }, {});
    const batchResult = await batchExtractTypes(needExtract, fallbackTitles);
    if (!batchResult.success) {
      throw new Error(batchResult.message || '类型提取启动失败');
    }
    if (!batchResult.data?.started) {
      await restoreProductTypesFromCache();
      ElMessage.warning(batchResult.data?.message || batchResult.message || '类型提取未启动');
      return;
    }
    await pollTypeExtraction(keyword, category, runId, cachedDone);
  } catch (extractError: any) {
    ElMessage.warning(extractError.message || '类型后台提取失败，稍后可重新搜索');
  } finally {
    if (runId === activeExtractRunId) {
      isExtractingTypes.value = false;
      extractCompleted.value = true;
      localStorage.removeItem(EXTRACT_STATE_KEY);
    }
  }
};

// 处理搜索
const handleSearch = async (keyword: string, category?: string, restoredState?: ReturnType<typeof readSearchProgressState>) => {
  if (!keyword.trim()) { ElMessage.warning('请输入搜索关键字'); return; }
  holdTableSkeleton();
  isLoading.value = true;
  const cachedProducts = await getSearchCache(keyword);
  if (cachedProducts) {
    activeExtractRunId++;
    clearPersistedSearchProgress();
    isLoading.value = false;
    renderProducts(cachedProducts);
    await restoreProductTypesFromCache();
    extractCompleted.value = products.value.every(p => !!p.productType && p.productType !== '待分类');
    if (!extractCompleted.value) {
      void startBackgroundTypeExtraction(keyword, category, products.value);
    }
    return;
  }

  const startedAt = restoredState?.startedAt || Date.now();
  const initialProgress = restoredState?.progress ?? 0;

  isLoading.value = true;
  searchProgress.value = initialProgress;
  searchProgressStage.value = restoredState?.stage || 'startup';
  persistSearchProgress(keyword, category, 'startup', Math.max(initialProgress, 8), startedAt);

  persistSearchProgress(keyword, category, 'environment', 18, startedAt);

  products.value = [];
  currentPage.value = 1;
  hasMoreProducts.value = false;
  isLoadingMore.value = false;
  extractCompleted.value = false;
  extractedCount.value = 0;
  extractTotal.value = 0;
  isExtractingTypes.value = false;
  localStorage.setItem('pa_search_keyword', keyword);
  // 重置显示，等搜索结果回来再写缓存

  const progressTimer = setInterval(() => {
    const maxProgress = searchProgressStage.value === 'environment' ? 62 : 88;
    if (searchProgress.value < maxProgress) {
      persistSearchProgress(
        keyword,
        category,
        searchProgressStage.value,
        Math.min(maxProgress, searchProgress.value + Math.random() * 8),
        startedAt,
      );
    }
  }, 700);

  try {
    // 终止正在运行的类型提取脚本（避免新旧商品 URL 不匹配导致"类目获取失败"）
    activeExtractRunId++;
    try { await resetBatchExtractStatus(); } catch { /* 忽略 */ }

    // 调用真实搜索 API
    const searchResponse = await searchOzonProducts(keyword, category);
    if (searchResponse.code === 'LOCAL_WORKER_TASK_CREATED' && searchResponse.taskId) {
      ElMessage.info(searchResponse.message || '本机采集器执行中');
      persistSearchProgress(keyword, category, 'fetching', 64, startedAt);
      const workerProducts = await waitForWorkerSearchProducts(searchResponse.taskId, keyword, category, startedAt);
      renderProducts(workerProducts);
      persistSearchProgress(keyword, category, 'parsing', 82, startedAt);
      extractCompleted.value = workerProducts.every(p => !!p.productType && p.productType !== '待分类');
      if (!extractCompleted.value) {
        void startBackgroundTypeExtraction(keyword, category, workerProducts);
      }
      return;
    }
    if (searchResponse.code === 'COOKIE_EXPIRED' || (searchResponse.success === false && searchResponse.message?.includes('授权过期'))) {
      ElMessage.warning('本机采集器授权状态异常，请检查采集器运行环境');
      clearAllSearchCache();
      return;
    }
    if (searchResponse.success === false && isLanguageCurrencyWarning(searchResponse.message)) {
      ElMessage.warning(searchResponse.message || '请确认 Ozon 页面语言为中文、货币为人民币');
      return;
    }
    persistSearchProgress(keyword, category, 'fetching', 64, startedAt);
    persistSearchProgress(keyword, category, 'parsing', 72, startedAt);
    if (searchResponse.success && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
      const realProducts = searchResponse.data.map(toProductWithType);
      renderProducts(realProducts);
      persistSearchProgress(keyword, category, 'parsing', 82, startedAt);

      extractCompleted.value = realProducts.every(p => !!p.productType && p.productType !== '待分类');
      if (!extractCompleted.value) {
        void startBackgroundTypeExtraction(keyword, category, realProducts);
      }
    } else {
      products.value = [];
      hasMoreProducts.value = false;
      persistSearchProgress(keyword, category, 'parsing', 100, startedAt);
      ElMessage.info(searchResponse.message || '未搜索到相关商品');
    }
  } catch (error: any) {
    const errData = error.response?.data || error;
    if (errData?.code === 'COOKIE_EXPIRED') {
      ElMessage.warning('本机采集器授权状态异常，请检查采集器运行环境');
      clearAllSearchCache();
    } else if (isLanguageCurrencyWarning(errData?.message || error.message)) {
      ElMessage.warning(errData?.message || error.message || '请确认 Ozon 页面语言为中文、货币为人民币');
    } else {
      ElMessage.error(error.message || '搜索失败');
    }
  } finally {
    clearInterval(progressTimer);
    isLoading.value = false;
    searchProgress.value = 100;
    clearPersistedSearchProgress(); // 搜索完成，清除进行中状态
  }
};

// el-select @cascader-change 回调：value 是选中的叶子节点 id（number），或 null（清空）

// 搜索方法（从AppSearchTabs迁移）
const handleSearchFromTab = () => {
  const textKeyword = searchKeyword.value.trim();
  const categoryKeyword = categoryText.value.trim();
  const keyword = textKeyword || categoryKeyword;
  if (!keyword) return;
  handleSearch(keyword, textKeyword ? undefined : selectedSubCategory.value || categoryKeyword);
};

// 打开分类选择弹窗
const openCategoryDialog = () => {
  categoryDialogVisible.value = true;
};

// 清空分类
const clearCategory = () => {
  categoryText.value = '';
  internalCascaderValue.value = [];
  selectedSubCategory.value = '';
  selectedDescriptionCategoryId.value = null;
  selectedTypeId.value = null;
};

// 处理分类选择（从AppSearchTabs迁移）
const handleCategorySelectFromTab = (data: { topCatId: number; subCatId: number; typeId: number; fullPath: string }) => {
  const pathParts = data.fullPath.split(' > ');
  categoryText.value = pathParts[pathParts.length - 1] || data.fullPath;
  const pathArray = [data.topCatId, data.subCatId, data.typeId].filter(id => id > 0);
  internalCascaderValue.value = pathArray;
  selectedSubCategory.value = categoryText.value;
  selectedDescriptionCategoryId.value = data.subCatId || null;
  selectedTypeId.value = data.typeId || null;
  categoryDialogVisible.value = false;
};

const saveProductToDatabase = async (product: ProductSelectionSavePayload) => {
  savingProductId.value = product.id;
  try {
    const result = await createProductSelection({
      name: product.name,
      ozonId: product.id,
      category: product.productType || '',
      descriptionCategoryId: product.descriptionCategoryId ?? selectedDescriptionCategoryId.value ?? null,
      typeId: product.typeId ?? selectedTypeId.value ?? null,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      rating: product.rating,
      sales: 0,
      stock: product.stock,
      reviews: product.reviewCount,
      imageUrl: product.imageUrl,
      productUrl: product.productUrl,
    });

    if (result.success) {
      ElMessage.success(result.message || `商品 ${product.id} 保存成功`);
    } else {
      ElMessage.error(result.message || '保存失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    savingProductId.value = null;
  }
};

const saveManualProduct = async () => {
  if (!manualParsedProduct.value) {
    ElMessage.warning('请先解析商品链接');
    return;
  }

  manualSaving.value = true;
  try {
    await saveProductToDatabase(manualParsedProduct.value);
    manualDialogVisible.value = false;
    resetManualDialog();
  } finally {
    manualSaving.value = false;
  }
};

// 恢复未完成的类型提取任务（刷新后自动继续）
const resumeTypeExtraction = async (state: { keyword: string; total: number; extractedUrls: string[] }) => {
  // 找出未提取类型的商品（只处理当前keyword的）
  const pendingProducts = products.value.filter(p => !p.productType || p.productType === '待分类');
  if (pendingProducts.length === 0) {
    localStorage.removeItem(EXTRACT_STATE_KEY);
    return;
  }

  const urlsToExtract = pendingProducts.map(p => p.productUrl).filter(Boolean);
  if (urlsToExtract.length === 0) return;

  void startBackgroundTypeExtraction(state.keyword, undefined, pendingProducts);
};
</script>

<style scoped>
.ozon-preference-card {
  display: flex;
  flex-direction: column;
  min-height: var(--app-page-min-height);
  overflow: hidden;
}

/* 搜索区域 */
.search-section {
  display: flex;
  align-items: center;
  height: var(--app-search-toolbar-height, 100px);
  padding: 0 28px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(to right, #ffffff, #f8fafc);
}

.search-section > div {
  width: 100%;
}

.preference-results-area {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 440px;
  overflow: visible;
}

.preference-load-more-hint,
.preference-load-more-end {
  font-size: 12px;
  line-height: 18px;
  font-weight: 400;
  color: #c0c4cc;
}

.preference-load-more-end {
  letter-spacing: 0.5px;
}

/* ===== BackTop 样式：同步商品管理 ===== */
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

/* 类别选择文本框 */
.app-dropdown-search {
  width: 160px;
}

.app-dropdown-search :deep(.el-input__wrapper) {
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  height: 32px !important;
  min-height: 32px !important;
  box-shadow: none !important;
  background-color: #ffffff;
  padding-left: 12px;
  padding-right: 36px;
}

.app-dropdown-search :deep(.el-input__wrapper:hover) {
  border-color: #bfdbfe;
}

.app-dropdown-search :deep(.el-input__wrapper.is-focus) {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
}

.app-dropdown-search :deep(.el-input__prefix) {
  color: #64748b;
}

.app-dropdown-search :deep(.el-input__inner) {
  height: 32px !important;
  line-height: 32px !important;
  font-size: 12px;
  color: #1e293b;
  cursor: pointer;
}

.app-dropdown-search :deep(.el-input__inner[readonly]) {
  background-color: transparent;
}

/* 清空按钮 */
.category-clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s ease;
  z-index: 1;
}

.category-clear-btn:hover {
  background: #ffffff;
  color: #dc2626;
}

.category-clear-btn svg {
  width: 12px;
  height: 12px;
}

/* 搜索输入框 */
.search-input {
  width: 220px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  height: 32px !important;
  min-height: 32px !important;
  box-shadow: none;
}

.search-input :deep(.el-input__wrapper:hover) {
  border-color: #bfdbfe;
}

.search-input :deep(.el-input__wrapper.is-focus) {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.search-input :deep(.el-input__inner) {
  height: 32px !important;
  line-height: 32px !important;
  font-size: 12px;
}

/* 搜索按钮 */
.ozon-pref-search-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 12px;
  font-size: 12px !important;
  font-weight: 500;
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  user-select: none;
  line-height: 32px !important;
  min-width: 64px;
}

.ozon-pref-search-btn .el-icon {
  font-size: 13px;
}

.ozon-pref-search-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
}

.ozon-pref-search-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.25);
}

.ozon-pref-search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-manual-add {
  height: 32px !important;
  min-height: 32px !important;
  min-width: 92px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  border-radius: 6px !important;
  white-space: nowrap;
}

.btn-manual-add:hover {
  transform: none;
}

.btn-manual-add .el-icon {
  font-size: 13px;
}

:global(.manual-add-dialog-panel) {
  width: min(600px, calc(100vw - var(--app-dialog-edge, 48px))) !important;
  max-width: min(600px, calc(100vw - var(--app-dialog-edge, 48px))) !important;
  height: 480px;
  max-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

:global(.manual-add-dialog-panel .app-dialog-header) {
  margin-bottom: 0;
}

:global(.manual-add-dialog-panel .app-dialog-body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 22px 30px 0;
}

:global(.manual-add-dialog-panel .app-dialog-footer) {
  margin-top: 0;
  padding: 16px 30px 20px;
  flex-shrink: 0;
}

.manual-add-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.manual-url-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.manual-url-row :deep(.el-input__wrapper) {
  height: 32px !important;
  min-height: 32px !important;
  border-radius: 6px;
  box-shadow: 0 0 0 1px #dbe3ee inset;
}

.manual-url-row :deep(.el-input__inner) {
  height: 32px !important;
  line-height: 32px !important;
  font-size: 12px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manual-url-row :deep(.el-input__prefix) {
  color: #94a3b8;
}

.manual-parse-button {
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 12px;
  font-size: 12px;
  border-radius: 6px;
}

.manual-content-area {
  min-height: 180px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
}

.manual-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  color: #1d4ed8;
  min-width: 0;
}

.manual-progress-copy {
  min-width: 0;
}

.manual-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #bfdbfe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.manual-progress-title {
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manual-progress-text {
  font-size: 12px;
  color: #3b82f6;
  text-align: left;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manual-product-card {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  min-width: 0;
  overflow: hidden;
}

.manual-product-card img,
.manual-product-placeholder {
  width: 84px;
  height: 84px;
  border-radius: 8px;
  object-fit: cover;
  background: #f1f5f9;
}

.manual-product-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.manual-product-info {
  min-width: 0;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.manual-product-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #2563eb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manual-product-meta,
.manual-product-stats {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
  min-width: 0;
  overflow: hidden;
}

.manual-product-meta span,
.manual-product-stats span {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 20px;
  flex-shrink: 1;
}

.manual-price {
  font-size: 14px;
  font-weight: 700;
  color: #dc2626;
  flex-shrink: 0;
}

.manual-original-price {
  color: #94a3b8;
  text-decoration: line-through;
  flex-shrink: 0;
}

.manual-product-warning {
  color: #ef4444;
}

</style>
