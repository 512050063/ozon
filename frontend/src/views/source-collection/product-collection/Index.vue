<template>
  <MainLayout>
    <div class="app-page app-page-stack app-page--fixed source-collection-page">
      <!-- 搜索和内容合并容器 -->
      <div class="app-page-card app-page-card--fill source-collection-card bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <!-- 搜索区域 -->
        <div class="source-collection-toolbar h-[100px] border-b border-slate-100 flex items-center px-6 gap-3">
          <el-input
            v-model="searchKeyword"
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
        
        <!-- 内容区域 -->
        <div class="source-collection-body p-8 pb-10">
          <!-- 商品列表（卡片形式） -->
          <div v-if="sourceCollection.length > 0" class="product-grid">
            <div v-for="product in sourceCollection" :key="product.id" class="product-card">
              <div class="card-img-wrap">
                <AppImage
                  :src="product.imageUrl || 'https://neeko-copilot.bytedance.net/api/text_to_imageprompt=product%20photo%20white%20background&image_size=square'"
                  :alt="product.name" fit="cover" lazy class="card-img" @click="handleProductClick(product)">
                </AppImage>
                <!-- 删除按钮（悬浮显示在右上角） -->
                <button @click.stop="showDeleteConfirm(product)" class="delete-btn">
                  <el-icon size="12">
                    <CircleClose />
                  </el-icon>
                </button>
                <!-- 悬浮操作按钮 -->
                <div class="card-actions-overlay">
                  <button @click.stop="findSimilarProducts(product)" class="action-btn">
                    <el-icon size="12">
                      <Search />
                    </el-icon>
                    搜同类
                  </button>
                  <button @click.stop="findSameProducts(product)" class="action-btn">
                    <el-icon size="12">
                      <Search />
                    </el-icon>
                    搜同款
                  </button>
                </div>
              </div>
              <div class="card-body">
                <!-- 第一行：价格 -->
                <div class="price-row">
                  <span class="current-price">¥{{ product.price }}</span>
                  <span v-if="product.originalPrice" class="original-price">¥{{ product.originalPrice }}</span>
                  <span v-if="product.discount" class="discount">-{{ product.discount }}%</span>
                </div>
                <!-- 第二行：商品名称（单行截+ 悬浮提示-->
                <el-tooltip :content="product.name" placement="top" :show-after="300">
                  <div class="name-row" @click="handleProductClick(product)">{{ product.name }}</div>
                </el-tooltip>
                <!-- 第三行：评价评分 + 商品类型（同行） -->
                <div v-if="product.rating !== undefined || product.reviews !== undefined" class="rating-row">
                  <el-icon class="text-yellow-400 fill-yellow-400" size="12">
                    <StarFilled />
                  </el-icon>
                  <span class="rating-value">{{ product.rating !== undefined && product.rating !== null ? product.rating :
                    '4.6'
                  }}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                    class="w-3 h-3 text-gray-400">
                    <path fill-rule="evenodd"
                      d="M5.337 21.718a6.707 6.707 0 0 1-.533-.074.75.75 0 0 1-.44-1.223 3.73 3.73 0 0 0 .814-1.686c.023-.115-.022-.317-.254-.543C3.274 16.587 2.25 14.41 2.25 12c0-5.03 4.428-9 9.75-9s9.75 3.97 9.75 9c0 5.03-4.428 9-9.75 9-.833 0-1.643-.097-2.417-.279a6.721 6.721 0 0 1-4.246.997Z"
                      clip-rule="evenodd" />
                  </svg>
                  <span class="reviews-count">{{ product.reviews !== undefined && product.reviews !== null ? product.reviews
                    :
                    '3614' }} 评价</span>
                  <!-- 商品类型标签（跟在评价后面，不换行） -->
                  <span class="card-category-sep">|</span>
                  <div class="category-inline">
                    <el-tooltip :content="getCategoryTooltip(product)" placement="top" :show-after="300">
                      <span class="category-badge" @click.stop="openCategoryDialog(product)">
                        {{ getCategoryBadgeText(product) }}
                      </span>
                    </el-tooltip>
                    <el-tooltip v-if="product.categoryVerified === true" content="类目已验证" placement="top"><span
                        class="verify-dot verified">
                      </span>
                    </el-tooltip>
                    <el-tooltip v-else-if="product.categoryVerified === false" content="类目未匹配，点击修改" placement="top">
                      <span class="verify-dot unverified"></span>
                    </el-tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- 无限滚动加载区域 -->
          <div v-if="sourceCollection.length > 0">
            <div ref="scrollSentinel" class="load-more-sentinel">
              <LoadingSpinner v-if="loadingMore" text="正在加载更多..." />
              <div v-else-if="!showLoadMore" class="load-more-end">
                已加载全部 {{ sourceCollection.length }} 件商品
              </div>
              <div v-else class="load-more-hint">
                向下滚动加载更多（已显示 {{ sourceCollection.length }} / {{ sourceTotal }}）
              </div>
            </div>
          </div>
          <!-- 空状态-->
          <div v-else class="py-12">
            <AppEmpty title="暂无商品数据" description="请先采集商品到货源库" />
          </div>
        </div>
      </div>
    </div>
    <!-- 同款商品抽屉 -->
    <!-- 相似商品抽屉 -->
    <SimilarProductsDrawer v-model="similarDrawerVisible" :title="drawerTitle" :subtitle="drawerSubtitle"
      :products="similarProducts" :isMockData="isMockData" :isSearching="isSearchingSimilar"
      :isLoadingMore="isLoadingMore" :hasMore="hasMoreSimilar" :loadingDots="loadingDots" :elapsed="searchElapsed"
      :referenceCategoryName="currentReferenceCategoryName" :referenceCategoryId="currentReferenceCategoryId"
      :reference-type-id="currentReferenceTypeId"
      @addToLibrary="addToProductLibrary" @load-more="loadNextSimilarPage" />
    <AppDeleteConfirmDialog
      v-model="deleteConfirmVisible"
      message="确定要删除这件商品吗？"
      @confirm="confirmDelete"
    />
    <!-- Ozon 类目选择弹窗 -->
    <CategorySelectDialog v-model="categoryDialogVisible" :load-tree-data="getCategoryTreeData"
      :initialSearchText="categorySearchText" :initialSelectedId="selectedTypeId"
      :initialSelectedPath="selectedCategoryPath" @select="handleCategoryConfirm" />
  </MainLayout>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import MainLayout from '@/components/MainLayout.vue';
import CategorySelectDialog from '@/components/ui/CategorySelectDialog.vue';
import AppDeleteConfirmDialog from '@/components/ui/AppDeleteConfirmDialog.vue';
import AppEmpty from '@/components/ui/AppEmpty.vue';
import AppImage from '@/components/ui/AppImage.vue';
import SimilarProductsDrawer from './components/SimilarProductsDrawer.vue';
// AppInput 已移除，使用全局CSS样式
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { Search, StarFilled, CircleClose } from '@element-plus/icons-vue';
import { getProductSelections, deleteProductSelection, updateProductSelection } from '@/api/productSelectionAPI';
import { createProductSupplyItem } from '@/api/productSupplyAPI';
import { alibabaAPI } from '@/api/alibabaAPI';
import { ElMessage } from 'element-plus';
import ozonCategoriesRaw from '@/assets/ozonCategories.json';
import { getCategoryLeaf, getCompactCategoryLeaf } from '@/utils/categoryText';
// ---- Ozon 类目级联选择 ----
interface OzonType { type_id: number; type_name: string; disabled: boolean }
interface OzonSubCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonType[] }
interface OzonTopCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonSubCat[] }
const ozonCategories = (ozonCategoriesRaw as any).result as OzonTopCat[];

function buildCollectedModelName(product: any, productName: string) {
  const explicitModel = product.modelName || product.model || product.skuName || product.specName;
  if (explicitModel) return String(explicitModel).trim();
  const sourceId = String(product.id || product.productId || '').trim();
  if (sourceId) return `SRC-${sourceId.slice(-8)}`;
  return String(productName || '').trim().slice(0, 24);
}
// 类目选择弹窗状态
const categoryDialogVisible = ref(false);
const categoryEditingProduct = ref<any>(null);
const selectedTopCatId = ref<number | null>(null);
const selectedSubCatId = ref<number | null>(null);
const selectedTypeId = ref<number | null>(null);
const categorySearchText = ref('');
// 树节点类型
interface TreeNode {
  id: string
  label: string
  typeId?: number
  topCatId: number
  subCatId?: number
  children: TreeNode[]
}
interface CategorySelectionPayload {
  topCatId: number
  subCatId: number
  typeId: number
  fullPath: string
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
// 点击树节点
// 已选路径
const selectedCategoryPath = computed(() => {
  if (!selectedTypeId.value) return '';
  const top = ozonCategories.find(c => c.description_category_id === selectedTopCatId.value);
  if (!top) return '';
  const sub = top.children?.find(s => s.description_category_id === selectedSubCatId.value);
  if (!sub) return '';
  const t = sub.children?.find(x => x.type_id === selectedTypeId.value);
  if (!t) return '';
  return [top.category_name, sub.category_name, t.type_name].filter(Boolean).join(' > ');
});

function getCategoryFullPath(descriptionCategoryId?: number | null, typeId?: number | null, fallback = '') {
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
}

function resolveCategorySelectionFromText(categoryText = '') {
  const normalized = categoryText.trim();
  if (!normalized) return null;
  const parts = normalized.split('>').map(item => item.trim()).filter(Boolean);
  const leaf = parts[parts.length - 1] || normalized;
  const subName = parts.length >= 2 ? parts[parts.length - 2] : '';
  const topName = parts.length >= 3 ? parts[parts.length - 3] : '';

  for (const top of ozonCategories) {
    if (topName && top.category_name.trim() !== topName) continue;
    for (const sub of top.children || []) {
      if (subName && sub.category_name.trim() !== subName) continue;
      const type = sub.children?.find(item => item.type_name.trim() === leaf);
      if (!type) continue;
      return {
        topCatId: top.description_category_id,
        descriptionCategoryId: sub.description_category_id,
        typeId: type.type_id,
        categoryName: [top.category_name, sub.category_name, type.type_name].filter(Boolean).join(' > '),
      };
    }
  }
  return null;
}

function getProductCategoryPath(product: any) {
  const category = product.category ? String(product.category).trim() : '';
  if (category.includes('>')) return category;
  return getCategoryFullPath(product.descriptionCategoryId, product.typeId, category);
}

function getCategoryLeafText(product: any) {
  const storedLeaf = product.categoryLeaf ? String(product.categoryLeaf).trim() : '';
  if (storedLeaf) return storedLeaf;
  const fullPath = getProductCategoryPath(product);
  return getCategoryLeaf(fullPath) || '设置类目';
}

function getCategoryBadgeText(product: any) {
  const leaf = getCategoryLeafText(product);
  return getCompactCategoryLeaf(leaf, 3);
}

function getCategoryTooltip(product: any) {
  return getProductCategoryPath(product) || '设置类目';
}
// 打开类目选择弹窗
function openCategoryDialog(product: any) {
  const resolvedCategory = resolveCategorySelectionFromText(getProductCategoryPath(product));
  categoryEditingProduct.value = product;
  categorySearchText.value = '';
  selectedTopCatId.value = resolvedCategory?.topCatId || null;
  selectedSubCatId.value = Number(product.descriptionCategoryId || resolvedCategory?.descriptionCategoryId || 0) || null;
  selectedTypeId.value = Number(product.typeId || resolvedCategory?.typeId || 0) || null;
  categoryDialogVisible.value = true;
}

// 处理类目选择组件的确认事件
function handleCategoryConfirm(data: CategorySelectionPayload) {
  const product = categoryEditingProduct.value;
  if (!product) return;

  const categoryName = data.fullPath?.trim() || '';
  if (!categoryName) {
    ElMessage.warning('请选择一个类目');
    return;
  }

  updateProductSelection(product.id, {
    category: categoryName,
    categoryLeaf: getCategoryLeaf(categoryName),
    descriptionCategoryId: data.subCatId || null,
    typeId: data.typeId || null,
    categoryVerified: true
  })
    .then(result => {
      if (result.success) {
        product.category = categoryName;
        product.categoryLeaf = getCategoryLeaf(categoryName);
        product.descriptionCategoryId = data.subCatId || null;
        product.typeId = data.typeId || null;
        product.categoryVerified = true;
        ElMessage.success('类目已更新');
      } else {
        ElMessage.error(result.message || '更新失败');
      }
    })
    .catch((e: any) => {
      ElMessage.error(e.message || '更新失败');
    });
}
// 货源采集库（从数据库获取）
const sourceCollection = ref<any[]>([]);
const sourceTotal = ref(0);
const currentPage = ref(1);
const pageSize = ref(15);
const showLoadMore = ref(false);
const loadingMore = ref(false);
const scrollSentinel = ref<HTMLElement | null>(null);
let scrollObserver: IntersectionObserver | null = null;
// 搜索
const searchKeyword = ref('');
// 同款商品抽屉
const similarDrawerVisible = ref(false);
const similarProducts = ref<any[]>([]);
const currentSearchKeyword = ref('');
const isSearchingSimilar = ref(false);
const drawerTitle = ref('');
const drawerSubtitle = computed(() => drawerTitle.value === '同款商品' ? '根据商品图片搜索相同或相近货源' : '根据商品类型搜索相似货源');
const isMockData = ref(false);
const searchElapsed = ref(0);
const loadingDots = ref('搜索');
let searchTimer: ReturnType<typeof setInterval> | null = null;
let dotsTimer: ReturnType<typeof setInterval> | null = null;
// 无限滚动相关
const currentSimilarPage = ref(1);
const similarTotal = ref(0);
const similarUsedKeyword = ref('');
const similarSearchMode = ref<'keyword' | 'image'>('keyword');
const similarImageUrl = ref('');
const isLoadingMore = ref(false);
const hasMoreSimilar = ref(false);
// 参考商品的类目信息（用于采集时传递）
const currentReferenceCategoryName = ref<string>('');
const currentReferenceCategoryId = ref<number | null>(null);
const currentReferenceTypeId = ref<number | null>(null);
async function loadNextSimilarPage() {
  if (isLoadingMore.value || !hasMoreSimilar.value) return;
  isLoadingMore.value = true;
  const nextPage = currentSimilarPage.value + 1;
  try {
    const result = similarSearchMode.value === 'image'
      ? await alibabaAPI.searchByImage(toImageSearchUrl(similarImageUrl.value), undefined, nextPage, 40)
      : await alibabaAPI.searchSimilar(similarUsedKeyword.value, nextPage, 40);
    if (result.success && result.data && result.data.items && result.data.items.length > 0) {
      similarProducts.value = similarProducts.value.concat(result.data.items);
      currentSimilarPage.value = nextPage;
      const loaded = similarProducts.value.length;
      const total = result.data.total || similarTotal.value;
      similarTotal.value = total;
      hasMoreSimilar.value = loaded < total;
    } else {
      hasMoreSimilar.value = false;
    }
  } catch {
    hasMoreSimilar.value = false;
  } finally {
    isLoadingMore.value = false;
  }
}
// 启动搜索计时器和动画
function startSearchTimer() {
  searchElapsed.value = 0;
  loadingDots.value = '搜索';
  searchTimer = setInterval(() => {
    searchElapsed.value++;
  }, 1000);
  // 加载文字动画
  let dotCount = 0;
  dotsTimer = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    loadingDots.value = '搜索 + ' + '.'.repeat(dotCount);
  }, 400);
}
// 停止搜索计时器和动画
function stopSearchTimer() {
  if (searchTimer) {
    clearInterval(searchTimer);
    searchTimer = null;
  }
  if (dotsTimer) {
    clearInterval(dotsTimer);
    dotsTimer = null;
  }
}
// 删除确认
const deleteConfirmVisible = ref(false);
const productToDelete = ref<number | null>(null);
// 格式化供应商等级
// 评分样式
// 检查688授权状态
const checkAlibabaAuth = async (): Promise<boolean> => {
  try {
    const result = await alibabaAPI.getAuthStatus();
    if (result.success && result.data) {
      if (!result.data.hasToken) {
        ElMessage.error('1688 Token未配置，请先在设置页面完成授权');
        return false;
      }
      if (result.data.isExpired) {
        ElMessage.error('1688 Token已过期，请重新授权');
        return false;
      }
      return true;
    }
    ElMessage.error('无法获取1688授权状态');
    return false;
  } catch {
    ElMessage.error('检查1688授权状态失败，请稍后重试');
    return false;
  }
};
// 加载货源采集库（从数据库读取）
const loadSourceCollection = async (append = false) => {
  try {
    if (!append) {
      currentPage.value = 1;
      sourceCollection.value = [];
    }
    const result = await getProductSelections({
      keyword: searchKeyword.value || undefined,
      page: currentPage.value,
      limit: pageSize.value
    });
    if (result.success && result.data) {
      // 后端返回格式: { success: true, data: [...], total, page, limit }
      const items = Array.isArray(result.data) ? result.data : (result.data.data || []);
      const total = Array.isArray(result.data) ? items.length : (result.data.total || items.length);
      if (append) {
        sourceCollection.value = sourceCollection.value.concat(items);
      } else {
        sourceCollection.value = items;
      }
      sourceTotal.value = total;
      showLoadMore.value = sourceCollection.value.length < total;
    } else {
      if (!append) sourceCollection.value = [];
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载货源采集数据失败');
    if (!append) sourceCollection.value = [];
  }
};

// 加载下一页
const loadNextPage = async () => {
  if (loadingMore.value || !showLoadMore.value) return;
  loadingMore.value = true;
  currentPage.value++;
  await loadSourceCollection(true);
  loadingMore.value = false;
};

// IntersectionObserver 设置
const setupScrollObserver = () => {
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }
  if (!scrollSentinel.value || sourceCollection.value.length === 0) return;
  scrollObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && showLoadMore.value && !loadingMore.value) {
        loadNextPage();
      }
    },
    { threshold: 0.1, rootMargin: '100px' }
  );
  scrollObserver.observe(scrollSentinel.value);
};

// 监听数据变化，重新挂载 observer
watch([showLoadMore, () => sourceCollection.value.length], () => {
  setTimeout(() => setupScrollObserver(), 100);
});

// 搜索商品
const searchProductLibrary = () => {
  currentPage.value = 1;
  showLoadMore.value = false;
  loadSourceCollection();
};
// 显示删除确认
const showDeleteConfirm = (product: any) => {
  productToDelete.value = product.id;
  deleteConfirmVisible.value = true;
};
// 点击商品链接
const handleProductClick = (product: any) => {
  if (product.productUrl) {
    window.open(product.productUrl, '_blank');
  }
};
// 确认删除
const confirmDelete = async () => {
  if (!productToDelete.value) return;
  try {
    const result = await deleteProductSelection(productToDelete.value);
    if (result.success) {
      sourceCollection.value = sourceCollection.value.filter(p => p.id !== productToDelete.value);
      ElMessage.success('删除成功');
    } else {
      ElMessage.error(result.message || '删除失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败');
  } finally {
    deleteConfirmVisible.value = false;
    productToDelete.value = null;
  }
};

function getProductCategoryMeta(product: any) {
  const resolvedCategory = resolveCategorySelectionFromText(getProductCategoryPath(product));
  const categoryName = resolvedCategory?.categoryName || getProductCategoryPath(product);
  const subId = Number(product.descriptionCategoryId || resolvedCategory?.descriptionCategoryId || 0) || null;
  const leafTypeId = Number(product.typeId || resolvedCategory?.typeId || 0) || null;
  return {
    categoryName,
    descriptionCategoryId: subId,
    typeId: leafTypeId
  };
}

const mergeProductImages = (...groups: Array<unknown>): string[] => {
  const images: string[] = [];
  const push = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    const url = typeof value === 'object'
      ? String((value as any).url || (value as any).imageUrl || (value as any).image_url || '')
      : String(value || '');
    if (url && !url.includes('bytedance') && !url.includes('neeko-copilot') && !images.includes(url)) {
      images.push(url);
    }
  };
  groups.forEach(push);
  return images;
};

const unwrapDisplayImageUrl = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.pathname === '/api/images/proxy') {
      return parsed.searchParams.get('url') || raw;
    }
  } catch {
  }
  return raw;
};

const isLocalManagedImagePath = (value: string): boolean => {
  return /^\/(?:uploads\/images|images|assets\/images\/product-images)\//.test(value);
};

const getImageSearchOrigin = (): string => {
  const env = import.meta.env as any;
  const apiBaseUrl = env.VITE_API_BASE_URL || (env.DEV ? 'http://localhost:3000/api' : '/api');
  try {
    return new URL(apiBaseUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
};

const toImageSearchUrl = (value: unknown): string => {
  const unwrapped = unwrapDisplayImageUrl(value);
  if (!unwrapped) return '';
  if (isLocalManagedImagePath(unwrapped)) {
    return `${getImageSearchOrigin()}${unwrapped}`;
  }
  try {
    const parsed = new URL(unwrapped, window.location.origin);
    if (isLocalManagedImagePath(parsed.pathname) && parsed.origin === window.location.origin) {
      return `${getImageSearchOrigin()}${parsed.pathname}${parsed.search}`;
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
  }
  return unwrapped;
};

const loadProductDetailImages = async (product: any): Promise<string[]> => {
  const productId = product.id || product.productId;
  if (!productId) return [];
  try {
    const result = await alibabaAPI.getProductDetail(productId);
    if (!result.success || !result.data) return [];
    const detail = result.data as any;
    return mergeProductImages(
      detail.images,
      detail.imageUrls,
      detail.image_urls,
      detail.productImage?.images,
      detail.offerImage?.images,
      detail.imageInfo?.images,
      detail.imageList,
      detail.image,
      detail.imageUrl,
      detail.image_url,
    );
  } catch {
    return [];
  }
};
// 搜同类商品（关键词搜索，用商品类目）
const findSimilarProducts = async (product: any) => {
  const isAuthed = await checkAlibabaAuth();
  if (!isAuthed) return;
  // 校验商品类型是否有效
  const hasNoCategory = !product.category || !product.category.trim();
  const categoryMeta = getProductCategoryMeta(product);
  if (hasNoCategory || product.categoryVerified === false) {
    ElMessage.warning('请先设置并确认商品类型，再进行搜同类操作');
    return;
  }
  // 保存参考商品的类目信息
  if (!categoryMeta.descriptionCategoryId || !categoryMeta.typeId) {
    ElMessage.warning('请先选择商品类目后再搜同类');
    openCategoryDialog(product);
    return;
  }
  currentReferenceCategoryName.value = categoryMeta.categoryName;
  currentReferenceCategoryId.value = categoryMeta.descriptionCategoryId;
  currentReferenceTypeId.value = categoryMeta.typeId;
  // 同类搜索只传末级类型词，避免把完整Ozon类目路径发给1688导致搜索失败或结果过少。
  const categoryLeaf = getCategoryLeafText(product);
  const searchKeyword = categoryLeaf && categoryLeaf !== '设置类目'
    ? categoryLeaf
    : product.name;
  currentSearchKeyword.value = searchKeyword;
  drawerTitle.value = '同类商品';
  similarDrawerVisible.value = true;
  searchSimilarProducts(searchKeyword);
};
// 搜同款商品（图片搜索）
const findSameProducts = async (product: any) => {
  const isAuthed = await checkAlibabaAuth();
  if (!isAuthed) return;
  // 保存参考商品的类目信息
  const categoryMeta = getProductCategoryMeta(product);
  if (product.categoryVerified === false) {
    ElMessage.warning('请先设置并确认商品类型，再进行搜同款操作');
    return;
  }
  if (!categoryMeta.descriptionCategoryId || !categoryMeta.typeId) {
    ElMessage.warning('请先选择商品类目后再搜同款');
    openCategoryDialog(product);
    return;
  }
  currentReferenceCategoryName.value = categoryMeta.categoryName;
  currentReferenceCategoryId.value = categoryMeta.descriptionCategoryId;
  currentReferenceTypeId.value = categoryMeta.typeId;
  currentSearchKeyword.value = product.name;
  drawerTitle.value = '同款商品';
  similarDrawerVisible.value = true;
  // 使用商品图片URL进行图片搜索
  const imageUrl = toImageSearchUrl(mergeProductImages(
    product.images,
    product.imageList,
    product.imageUrl,
    product.image,
    product.image_url,
  )[0]);
  searchSameProductsByImage(imageUrl);
};
// 搜同- 关键词搜索（直接搜商品名，首页后由无限滚动翻页）
const searchSimilarProducts = async (keyword: string) => {
  isSearchingSimilar.value = true;
  similarProducts.value = [];
  currentSimilarPage.value = 1;
  similarUsedKeyword.value = keyword;
  similarSearchMode.value = 'keyword';
  similarImageUrl.value = '';
  hasMoreSimilar.value = false;
  isLoadingMore.value = false;
  isMockData.value = false;
  startSearchTimer();
  try {
    const result = await alibabaAPI.searchSimilar(keyword, 1, 40);
    if (result.success && result.data && result.data.items && result.data.items.length > 0) {
      similarProducts.value = result.data.items;
      // 保存后端实际用的关键词（可能被降级）
      if ((result.data as any).usedKeyword) similarUsedKeyword.value = (result.data as any).usedKeyword;
      const total = result.data.total || result.data.items.length;
      similarTotal.value = total;
      hasMoreSimilar.value = similarProducts.value.length < total;
    } else {
      ElMessage.warning(result.message || '未找到相关商品');
      similarProducts.value = [];
    }
  } catch (error: any) {
    ElMessage.error(error.message || '搜索失败');
    similarProducts.value = [];
  } finally {
    stopSearchTimer();
    isSearchingSimilar.value = false;
  }
};

// 搜同款-图片搜索（用Ozon商品图片URL）
const searchSameProductsByImage = async (imageUrl: string) => {
  const searchImageUrl = toImageSearchUrl(imageUrl);
  isSearchingSimilar.value = true;
  similarProducts.value = [];
  isMockData.value = false;
  currentSimilarPage.value = 1;
  similarSearchMode.value = 'image';
  similarImageUrl.value = searchImageUrl || '';
  similarUsedKeyword.value = '';
  hasMoreSimilar.value = false;
  isLoadingMore.value = false;
  startSearchTimer();
  try {
    if (!searchImageUrl) {
      ElMessage.warning('商品图片为空，无法进行图片搜索');
      return;
    }
    // 调用1688图片搜索API，直接传入Ozon商品图片URL
    const result = await alibabaAPI.searchByImage(searchImageUrl, undefined, 1, 40);
    if (result.success && result.data && result.data.items && result.data.items.length > 0) {
      similarProducts.value = result.data.items;
      const total = result.data.total || result.data.items.length;
      similarTotal.value = total;
      hasMoreSimilar.value = similarProducts.value.length < total;
    } else {
      ElMessage.warning(result.message || '未找到同款商品');
      similarProducts.value = [];
    }
  } catch (error: any) {
    ElMessage.error(error.message || '图片搜索失败');
    similarProducts.value = [];
  } finally {
    stopSearchTimer();
    isSearchingSimilar.value = false;
  }
};
// 生成模拟数据（模拟688 API返回格式）
// 添加到商品库（采集到 ProductSupply，同时保存1688货源信息）
const addToProductLibrary = async (product: any) => {
  try {
    const productName = product.subject || product.name || '';
    const productPrice = typeof product.price === 'number' ? product.price : (parseFloat(product.price) || 0);
    const existingProductImages = mergeProductImages(
      product.images,
      product.imageList,
      product.image,
      product.image_url,
      product.imageUrl,
    );
    const detailImages = existingProductImages.length > 1 ? [] : await loadProductDetailImages(product);
    const allProductImages = mergeProductImages(
      existingProductImages,
      detailImages,
    ).slice(0, 8);
    const productImageUrl = allProductImages[0] || product.image || product.image_url || product.imageUrl || '';
    
    // 构建1688货源数据
    const sourceData = {
      alibabaOfferId: (product.id || product.productId || '').toString(),
      subject: productName,
      price: productPrice,
      consignPrice: product.consignPrice ? parseFloat(product.consignPrice) : 0,
      image: productImageUrl,
      images: allProductImages,
      detailUrl: product.detail_url || product.detailUrl || '',
      supplierName: product.supplier_name || product.supplier?.name || '',
      city: product.city || '',
      province: product.province || '',
      qualityScore: product.quality_score || 0,
      qualityDetail: product.quality_detail || null,
      yxScoreLevel: product.yx_score_level || '',
      tradeServices: product.trade_services || null,
      moq: product.moq || product.minOrder || 1
    };
    
    const referenceCategoryName = product.referenceCategoryName || currentReferenceCategoryName.value;
    const referenceCategoryLeaf = product.referenceCategoryLeaf || getCategoryLeaf(referenceCategoryName);
    const referenceCategoryId = Number(product.referenceCategoryId || currentReferenceCategoryId.value || 0) || null;
    const referenceTypeId = Number(product.referenceTypeId || currentReferenceTypeId.value || 0) || null;
    if (!referenceCategoryName || !referenceCategoryId || !referenceTypeId) {
      ElMessage.warning('缺少商品类目信息，请重新从已设置类目的商品发起搜索');
      return;
    }

    const result = await createProductSupplyItem({
      name: productName,
      modelName: buildCollectedModelName(product, productName),
      price: productPrice,
      imageUrl: productImageUrl,
      images: allProductImages,
      category: referenceCategoryName,
      categoryLeaf: referenceCategoryLeaf,
      brand: '无品牌',
      ozonCategoryId: referenceCategoryId || undefined,
      descriptionCategoryId: referenceCategoryId,
      typeId: referenceTypeId,
      source: {
        ...sourceData,
        category: referenceCategoryName,
        categoryLeaf: referenceCategoryLeaf,
        brand: '无品牌',
        descriptionCategoryId: referenceCategoryId,
        typeId: referenceTypeId,
      }
    });
    
    if (result.success) {
      ElMessage.success('采集成功');
      loadSourceCollection();
    } else {
      ElMessage.error(result.message || '采集失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '采集失败');
  }
};
// 页面加载时初始化
onMounted(() => {
  loadSourceCollection();
});
// 组件卸载时清理滚动监听
onUnmounted(() => {
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }
});
// 抽屉关闭时清理相似商品状态
watch(similarDrawerVisible, (visible) => {
  if (!visible) {
    similarProducts.value = [];
    similarTotal.value = 0;
    hasMoreSimilar.value = false;
    currentSimilarPage.value = 0;
  }
});
</script>
<style scoped>
.source-collection-card {
  overflow: hidden;
}

.source-collection-toolbar {
  flex: 0 0 100px;
}

.source-collection-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.product-grid {
  --product-card-min-width: 188px;
  --product-card-max-width: 214px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--product-card-min-width), var(--product-card-max-width)));
  gap: 14px;
  justify-content: space-between;
  align-items: start;
}

@media (max-width: 720px) {
  .product-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.product-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.card-img-wrap {
  width: 100%;
  height: 128px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.card-img {
  width: 100%;
  height: 128px;
}

.img-placeholder {
  width: 100%;
  height: 128px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.img-placeholder-small {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.delete-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  color: #606266;
}

.product-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #f56c6c;
  color: #fff;
}

.card-actions-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
  pointer-events: auto;
}

.product-card:hover .card-actions-overlay {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 12px;
  font-size: 12px;
  pointer-events: auto;
  cursor: pointer;
  color: #303133;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #fff;
}

.card-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* 价格*/
.price-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.current-price {
  font-size: 17px;
  font-weight: 700;
  color: #e6521d;
}

.original-price {
  font-size: 12px;
  color: #909399;
  text-decoration: line-through;
}

.discount {
  font-size: 12px;
  color: #f56c6c;
}

/* 类型 + 库存合并*/
.category-stock-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 22px;
}

/* 评价行内分类标签（与评分同行*/
.category-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  flex-shrink: 1;
  min-width: 0;
  pointer-events: auto;
  z-index: 10;
}

.card-category-sep {
  color: #dcdfe6;
  font-size: 12px;
  margin: 0 2px;
  user-select: none;
}

/* 类型标签胶囊 */
.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  color: #4f46e5;
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 8px;
  border: 1px solid #c7d2fe;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 50px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.category-part:hover .category-badge {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  border-color: #a5b4fc;
}

/* 验证状态点（红绿点*/
.verify-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.verify-dot.verified {
  background: #22c55e;
}

.verify-dot.unverified {
  background: #ef4444;
}

/* 右侧库存部分 */
.stock-part {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

/* 库存行（兼容旧用法，已不单独使用*/
.stock-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stock-value {
  font-size: 14px;
  font-weight: 600;
  color: #e6521d;
}

.stock-label {
  font-size: 12px;
  color: #909399;
}

/* 商品名称（单行截断） */
.name-row {
  font-size: 12px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  margin-top: 2px;
  text-align: left;
}

.name-row:hover {
  color: #409eff;
}

/* 评价评分*/
.rating-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.rating-value {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}

.reviews-count {
  font-size: 12px;
  color: #909399;
}

.similar-product-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  transition: box-shadow 0.2s;
}

.similar-product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.supplier-city {
  color: #c0c4cc;
}

.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 商品名称：单行省略，悬浮显示全名 */
.product-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.5;
}

/* 评分小标*/
.score-item-small {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f5f7fa;
  color: #606266;
  white-space: nowrap;
}

.score-item-small.score-high {
  background: #f0f9eb;
  color: #67c23a;
}

.score-item-small.score-mid {
  background: #fdf6ec;
  color: #e6a23c;
}

.score-item-small.score-low {
  background: #fef0f0;
  color: #f56c6c;
}

/* 标签间距 */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* 价格样式 */
.price-main {
  font-size: 18px;
  font-weight: 700;
  color: #f56c6c;
  margin-left: 4px;
}

.price-consign {
  font-size: 12px;
  color: #909399;
}

/* ===== 搜索加载动画 ===== */
.search-loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 12px;
}

.search-loading-spinner {
  position: relative;
  width: 64px;
  height: 64px;
  margin-bottom: 8px;
}

.spinner-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 3px solid #e8edf2;
  border-radius: 50%;
}

.spinner-ring-inner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spinner 0.8s linear infinite;
}

.spinner-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #667eea;
}

@keyframes spinner {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.search-loading-text {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  text-align: center;
}

.loading-dots {
  display: inline-block;
  min-width: 72px;
  text-align: left;
}

.search-loading-subtitle {
  font-size: 13px;
  color: #909399;
  text-align: center;
}

.search-loading-time {
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.search-progress-bar {
  width: 240px;
  height: 3px;
  background: #e8edf2;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 2px;
  animation: progress 2s ease-in-out infinite;
}

/* ===== 无限滚动加载 ===== */
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

@keyframes progress {
  0% {
    width: 0%;
    margin-left: 0;
  }

  50% {
    width: 60%;
    margin-left: 0;
  }

  100% {
    width: 100%;
    margin-left: 0;
  }
}

/* ===== Ozon 类目选择弹窗（树形） ===== */
/* 自定义页*/
.cat-dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.cat-dialog-header-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cat-dialog-header-icon svg {
  width: 18px;
  height: 18px;
}

.cat-dialog-header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.cat-search-bar {
  margin-bottom: 12px;
}

.cat-tree-wrap {
  border: 1px solid #e8edf2;
  border-radius: 8px;
  max-height: 360px;
  overflow-y: auto;
  padding: 8px 0;
}

.cat-tree-wrap .el-tree {
  background: transparent;
}

.cat-tree-wrap .el-tree-node__content {
  height: 32px;
  padding-right: 12px;
  font-size: 13px;
}

.cat-tree-wrap .el-tree-node__content:hover {
  background: #f0f4ff;
}

.cat-tree-wrap .el-tree-node.is-current>.el-tree-node__content {
  background: #eef2ff;
  color: #4f46e5;
}

/* 已选路*/
.cat-selected-path {
  margin-top: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 13px;
  color: #374151;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.path-label {
  color: #9ca3af;
  font-size: 12px;
  margin-right: 4px;
}
</style>
