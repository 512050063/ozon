<template>
  <MainLayout>
    <div class="app-page app-page-stack app-page--fixed supply-management-page">
      <div class="app-page-card app-page-card--fill supply-management-card bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="supply-toolbar">
          <div class="supply-search-group">
            <el-input
              v-model="keyword"
              placeholder="搜索1688货源标题、供应商或商品ID"
              clearable
              class="input-search header-search-input"
              @keyup.enter="handleSearch"
            />
            <el-button type="primary" class="btn-search" :loading="loading" @click="handleSearch">
              <el-icon class="mr-1"><Search /></el-icon>
              搜索
            </el-button>
          </div>
          <el-button type="primary" class="btn-create" @click="openAddDialog">
            <el-icon class="mr-1"><Plus /></el-icon>
            添加货源
          </el-button>
        </div>

        <div class="supply-source-body">
          <AppSkeletonLoader v-if="loading" variant="card" :rows="5" compact />
          <template v-else>
            <template v-if="sources.length > 0">
              <div class="supply-source-grid">
                <article v-for="source in sources" :key="source.id" class="supply-source-card">
                  <div
                    class="supply-source-image-wrap"
                    @mouseenter="startImageCarousel(source)"
                    @mouseleave="stopImageCarousel(source)"
                  >
                    <div v-if="getSourceImages(source).length > 0" class="supply-source-carousel-strip" :style="getCarouselStripStyle(source)">
                      <img
                        v-for="(imageUrl, imageIndex) in getSourceImages(source)"
                        :key="`${source.id}-${imageIndex}`"
                        :src="toDisplayImageUrl(imageUrl)"
                        class="supply-source-image"
                        :alt="source.subject"
                      />
                    </div>
                    <div v-else class="supply-source-placeholder">1688</div>
                    <div v-if="getSourceImages(source).length > 1" class="supply-source-image-dots">
                      <span
                        v-for="(_, imageIndex) in getSourceImages(source).slice(0, 5)"
                        :key="imageIndex"
                        class="supply-source-image-dot"
                        :class="{ active: (imageCarouselIndexes[source.id] || 0) === imageIndex }"
                      ></span>
                    </div>
                  </div>
                  <div class="supply-source-info">
                    <button
                      type="button"
                      class="source-title-link"
                      :title="source.subject"
                      @click="openSourceDetailUrl(source)"
                    >
                      {{ source.subject || '未命名货源' }}
                    </button>
                    <div class="source-badge-row">
                      <span class="source-price-box">¥{{ formatMoney(source.price) }}</span>
                      <span class="source-consign-price">代发 ¥{{ formatMoney(source.consignPrice || source.price) }}</span>
                    </div>
                    <div class="source-score-row">
                      <span>综合 {{ formatScore(source.qualityScore) }}</span>
                      <span>商品 {{ formatScore(getQualityDetailValue(source, 'product')) }}</span>
                      <span>物流 {{ formatScore(getQualityDetailValue(source, 'logistics')) }}</span>
                    </div>
                  </div>
                  <div class="supply-source-actions">
                    <AppTableButton
                      name="delete"
                      :disabled="isSourceDeleteDisabled(source)"
                      delete-confirm-text="确定删除该货源吗？"
                      @click="handleDelete(source)"
                    />
                  </div>
                </article>
              </div>
              <div ref="scrollSentinel" class="load-more-sentinel">
                <LoadingSpinner v-if="loadingMore" text="正在加载更多..." />
                <div v-else-if="!hasMoreSources" class="load-more-end">
                  已加载全部 {{ sources.length }} 个货源
                </div>
                <div v-else class="load-more-hint">
                  向下滚动加载更多（已显示 {{ sources.length }} / {{ total }}）
                </div>
              </div>
            </template>
            <AppEmpty v-else title="暂无货源" description="可以通过1688链接添加货源" />
          </template>
        </div>
      </div>
    </div>

    <AppDialog
      v-model="sourceDialogVisible"
      title="添加货源"
      subtitle="输入1688链接解析后保存到货源管理"
      :icon="Goods"
      content-class="supply-source-dialog"
      :confirm-loading="submitting"
      :confirm-disabled="!canSubmitSource"
      @confirm="handleDialogConfirm"
      @cancel="resetDialog"
    >
      <div class="source-dialog-form">
        <div class="source-form-row">
          <el-input
            v-model="urlInput"
            placeholder="粘贴1688商品详情链接，或直接输入1688商品ID"
            clearable
            @keyup.enter="handlePreviewUrl"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <button class="source-action-button" type="button" :disabled="urlPreviewLoading" @click="handlePreviewUrl">
            {{ urlPreviewLoading ? '解析中' : '解析' }}
          </button>
        </div>
        <div class="source-preview-box">
          <AppSkeletonLoader v-if="urlPreviewLoading" variant="card" :rows="2" compact />
          <template v-else>
            <button
              v-if="previewSource"
              type="button"
              class="source-preview-card"
              @mouseenter="startPreviewImageCarousel"
              @mouseleave="stopPreviewImageCarousel"
              @click="openSourceDetailUrl(previewSource)"
            >
              <div class="source-preview-image-wrap">
                <div v-if="previewSourceImages.length > 0" class="source-preview-carousel-strip" :style="getPreviewCarouselStripStyle()">
                  <img
                    v-for="(imageUrl, imageIndex) in previewSourceImages"
                    :key="`preview-${imageIndex}`"
                    :src="toDisplayImageUrl(imageUrl)"
                    class="source-preview-image"
                    :alt="previewSource.subject"
                  />
                </div>
                <div v-else class="source-preview-placeholder">1688</div>
                <div v-if="previewSourceImages.length > 1" class="source-preview-image-dots">
                  <span
                    v-for="(_, imageIndex) in previewSourceImages.slice(0, 5)"
                    :key="imageIndex"
                    class="source-preview-image-dot"
                    :class="{ active: previewImageIndex === imageIndex }"
                  ></span>
                </div>
              </div>
              <div class="source-preview-main">
                <div class="source-preview-title" :title="previewSource.subject">
                  {{ previewSource.subject || '未命名货源' }}
                </div>
                <div class="source-preview-price-row">
                  <span class="source-preview-price">¥{{ formatMoney(previewSource.price) }}</span>
                  <span class="source-preview-consign-price">代发 ¥{{ formatMoney(previewSource.consignPrice || previewSource.price) }}</span>
                </div>
                <div class="source-preview-score-row">
                  <span>综合 {{ formatScore(previewSource.qualityScore) }}</span>
                  <span>商品 {{ formatScore(getQualityDetailValue(previewSource as SupplySource, 'product')) }}</span>
                  <span>物流 {{ formatScore(getQualityDetailValue(previewSource as SupplySource, 'logistics')) }}</span>
                </div>
              </div>
            </button>
            <div v-else class="source-empty-state">输入链接后点击解析，解析结果会显示在这里</div>
          </template>
        </div>
        <div class="source-category-row">
          <div class="source-category-main">
            <span class="source-category-label">商品类目</span>
            <span class="source-category-value" :class="{ empty: !selectedCategoryPath }">
              {{ selectedCategoryPath || '请选择 Ozon 商品类目' }}
            </span>
          </div>
          <button class="source-category-button" type="button" @click="openCategoryDialog">
            选择
          </button>
        </div>
      </div>
    </AppDialog>

    <CategorySelectDialog
      v-model="categoryDialogVisible"
      :load-tree-data="getCategoryTreeData"
      :initialSearchText="categorySearchText"
      :initialSelectedId="selectedTypeId"
      :initialSelectedPath="selectedCategoryPath"
      @select="handleCategorySelect"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Goods, Plus, Search } from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
import CategorySelectDialog from '@/components/ui/CategorySelectDialog.vue';
import { AppDialog, AppEmpty, AppSkeletonLoader, AppTableButton } from '@/components/ui';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import ozonCategoriesRaw from '@/assets/ozonCategories.json';
import {
  deleteSupplySourceItem,
  getSupplySourceItems,
  importSupplySourceUrl,
  previewSupplySourceUrl,
  type SupplySource,
  type SupplySourcePayload,
} from '@/api/supplySourceAPI';
import { getCategoryLeaf } from '@/utils/categoryText';
import { toDisplayImageUrl } from '@/utils/imageUrl';

const keyword = ref('');
const sources = ref<SupplySource[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const currentPage = ref(1);
const pageSize = 20;
const total = ref(0);
const hasMoreSources = ref(false);
const scrollSentinel = ref<HTMLElement | null>(null);
let scrollObserver: IntersectionObserver | null = null;

const sourceDialogVisible = ref(false);
const submitting = ref(false);
const urlPreviewLoading = ref(false);
const urlInput = ref('');
const previewSource = ref<SupplySource | null>(null);
const categoryDialogVisible = ref(false);
const categorySearchText = ref('');
const selectedCategoryPath = ref('');
const selectedTopCatId = ref<number | null>(null);
const selectedSubCatId = ref<number | null>(null);
const selectedTypeId = ref<number | null>(null);
const imageCarouselIndexes = ref<Record<number, number>>({});
const imageCarouselTimers = new Map<number, number>();
const previewImageIndex = ref(0);
let previewImageCarouselTimer: number | null = null;

const canSubmitSource = computed(() => Boolean(
  previewSource.value
  && selectedCategoryPath.value
  && selectedSubCatId.value
  && selectedTypeId.value,
));

interface OzonType { type_id: number; type_name: string; disabled: boolean }
interface OzonSubCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonType[] }
interface OzonTopCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonSubCat[] }
interface TreeNode {
  id: string;
  label: string;
  typeId?: number;
  topCatId: number;
  subCatId?: number;
  children: TreeNode[];
}
interface CategorySelectionPayload {
  topCatId: number;
  subCatId: number;
  typeId: number;
  fullPath: string;
}

const ozonCategories = (ozonCategoriesRaw as any).result as OzonTopCat[];
let cachedCategoryTreeData: TreeNode[] | null = null;

function buildCategoryTree(cats: OzonTopCat[]): TreeNode[] {
  if (!cats || cats.length === 0) return [];
  return cats.filter(c => !c.disabled).map(top => ({
    id: `top-${top.description_category_id}`,
    label: top.category_name,
    topCatId: top.description_category_id,
    children: top.children.filter(s => !s.disabled).map(sub => ({
      id: `sub-${sub.description_category_id}`,
      label: sub.category_name,
      topCatId: top.description_category_id,
      subCatId: sub.description_category_id,
      children: sub.children.filter(t => !t.disabled).map(t => ({
        id: `type-${t.type_id}`,
        label: t.type_name,
        typeId: t.type_id,
        topCatId: top.description_category_id,
        subCatId: sub.description_category_id,
        children: [],
      })),
    })),
  }));
}

const getCategoryTreeData = () => {
  if (!cachedCategoryTreeData) {
    cachedCategoryTreeData = buildCategoryTree(ozonCategories);
  }
  return cachedCategoryTreeData;
};

const openCategoryDialog = () => {
  categorySearchText.value = '';
  categoryDialogVisible.value = true;
};

const handleCategorySelect = (data: CategorySelectionPayload) => {
  selectedTopCatId.value = data.topCatId;
  selectedSubCatId.value = data.subCatId;
  selectedTypeId.value = data.typeId;
  selectedCategoryPath.value = data.fullPath;
  categoryDialogVisible.value = false;
};

const formatMoney = (value: number | string | null | undefined) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const formatScore = (value: unknown) => {
  const score = Number(value || 0);
  return Number.isFinite(score) ? score.toFixed(1) : '0.0';
};

const getQualityDetailValue = (source: SupplySource, key: 'product' | 'logistics') => {
  const detail = source.qualityDetail || {};
  if (key === 'product') {
    return detail.productScore ?? detail.product_score ?? detail.product ?? detail.goodsScore ?? detail.goods_score ?? 0;
  }
  return detail.logisticsScore ?? detail.logistics_score ?? detail.logistics ?? detail.deliveryScore ?? detail.delivery_score ?? 0;
};

const isSourceDeleteDisabled = (source: SupplySource) => {
  return Boolean(source.hasBoundProducts || Number(source.boundProductCount || 0) > 0);
};

const getSourceImages = (source: SupplySource) => {
  const images = Array.isArray(source.images) ? source.images.filter(Boolean) : [];
  if (source.image && !images.includes(source.image)) {
    images.unshift(source.image);
  }
  return images;
};

const previewSourceImages = computed(() => previewSource.value ? getSourceImages(previewSource.value) : []);

const getCarouselStripStyle = (source: SupplySource): Record<string, string> => {
  const index = imageCarouselIndexes.value[source.id] || 0;
  return {
    transform: `translateX(-${index * 100}%)`,
  };
};

const stopImageCarousel = (source: SupplySource) => {
  const timer = imageCarouselTimers.get(source.id);
  if (timer) {
    window.clearInterval(timer);
    imageCarouselTimers.delete(source.id);
  }
};

const startImageCarousel = (source: SupplySource) => {
  const images = getSourceImages(source);
  if (images.length <= 1 || imageCarouselTimers.has(source.id)) return;

  const timer = window.setInterval(() => {
    const currentIndex = imageCarouselIndexes.value[source.id] || 0;
    imageCarouselIndexes.value = {
      ...imageCarouselIndexes.value,
      [source.id]: (currentIndex + 1) % images.length,
    };
  }, 900);
  imageCarouselTimers.set(source.id, timer);
};

const getPreviewCarouselStripStyle = (): Record<string, string> => ({
  transform: `translateX(-${previewImageIndex.value * 100}%)`,
});

const stopPreviewImageCarousel = () => {
  if (!previewImageCarouselTimer) return;
  window.clearInterval(previewImageCarouselTimer);
  previewImageCarouselTimer = null;
};

const startPreviewImageCarousel = () => {
  if (previewSourceImages.value.length <= 1 || previewImageCarouselTimer) return;
  previewImageCarouselTimer = window.setInterval(() => {
    previewImageIndex.value = (previewImageIndex.value + 1) % previewSourceImages.value.length;
  }, 900);
};

const getSourceDetailUrl = (source: Partial<SupplySource | SupplySourcePayload>) => {
  if (source.detailUrl) return source.detailUrl;
  if (source.alibabaOfferId) return `https://detail.1688.com/offer/${source.alibabaOfferId}.html`;
  return '';
};

const openSourceDetailUrl = (source: Partial<SupplySource | SupplySourcePayload>) => {
  const url = getSourceDetailUrl(source);
  if (!url) return;
  window.open(url, '_blank');
};

const loadSources = async (append = false) => {
  if (append) {
    loadingMore.value = true;
  } else {
    loading.value = true;
    currentPage.value = 1;
    sources.value = [];
    hasMoreSources.value = false;
  }
  try {
    const result = await getSupplySourceItems({
      page: currentPage.value,
      limit: pageSize,
      keyword: keyword.value.trim(),
    });
    if (!result.success) {
      ElMessage.error(result.message || '获取货源失败');
      return;
    }
    const items = result.data || [];
    sources.value = append ? sources.value.concat(items) : items;
    total.value = result.total || 0;
    hasMoreSources.value = sources.value.length < total.value;
  } catch (error: any) {
    ElMessage.error(error.message || '获取货源失败');
  } finally {
    if (append) {
      loadingMore.value = false;
    } else {
      loading.value = false;
    }
    setupScrollObserver();
  }
};

const loadNextPage = async () => {
  if (loading.value || loadingMore.value || !hasMoreSources.value) return;
  currentPage.value += 1;
  await loadSources(true);
};

const setupScrollObserver = async () => {
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }
  await nextTick();
  if (!scrollSentinel.value || sources.value.length === 0) return;
  scrollObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasMoreSources.value && !loadingMore.value) {
        loadNextPage();
      }
    },
    { threshold: 0.1, rootMargin: '100px' },
  );
  scrollObserver.observe(scrollSentinel.value);
};

const handleSearch = () => {
  loadSources();
};

const resetDialog = () => {
  urlInput.value = '';
  previewSource.value = null;
  previewImageIndex.value = 0;
  stopPreviewImageCarousel();
  categoryDialogVisible.value = false;
  categorySearchText.value = '';
  selectedCategoryPath.value = '';
  selectedTopCatId.value = null;
  selectedSubCatId.value = null;
  selectedTypeId.value = null;
};

const openAddDialog = () => {
  resetDialog();
  sourceDialogVisible.value = true;
};

const handlePreviewUrl = async () => {
  const url = urlInput.value.trim();
  if (!url) {
    ElMessage.warning('请输入1688商品链接或商品ID');
    return;
  }
  urlPreviewLoading.value = true;
  previewSource.value = null;
  previewImageIndex.value = 0;
  stopPreviewImageCarousel();
  try {
    const result = await previewSupplySourceUrl(url);
    if (!result.success || !result.data) {
      ElMessage.error(result.message || '解析失败');
      return;
    }
    previewSource.value = result.data;
  } catch (error: any) {
    ElMessage.error(error.message || '解析失败');
  } finally {
    urlPreviewLoading.value = false;
  }
};

const handleDialogConfirm = async () => {
  submitting.value = true;
  try {
    const url = urlInput.value.trim();
    if (!previewSource.value || !url) {
      ElMessage.warning('请先解析1688货源');
      return;
    }
    if (!selectedSubCatId.value || !selectedTypeId.value || !selectedCategoryPath.value) {
      ElMessage.warning('请选择商品类目');
      return;
    }
    const result = await importSupplySourceUrl(url, {
      category: selectedCategoryPath.value,
      categoryLeaf: getCategoryLeaf(selectedCategoryPath.value),
      brand: '无品牌',
      descriptionCategoryId: selectedSubCatId.value,
      typeId: selectedTypeId.value,
    });
    if (!result.success) {
      ElMessage.error(result.message || '保存失败');
      return;
    }
    ElMessage.success('货源已保存');
    sourceDialogVisible.value = false;
    resetDialog();
    await loadSources();
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (source: SupplySource) => {
  if (isSourceDeleteDisabled(source)) {
    ElMessage.warning('该货源已绑定商品，不能删除');
    return;
  }
  try {
    const result = await deleteSupplySourceItem(source.id);
    if (!result.success) {
      ElMessage.error(result.message || '删除失败');
      return;
    }
    ElMessage.success('货源已删除');
    await loadSources();
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败');
  }
};

onMounted(() => {
  loadSources();
});

watch([hasMoreSources, () => sources.value.length], () => {
  setupScrollObserver();
});

onBeforeUnmount(() => {
  imageCarouselTimers.forEach(timer => window.clearInterval(timer));
  imageCarouselTimers.clear();
  stopPreviewImageCarousel();
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }
});
</script>

<style scoped>
.supply-management-card {
  overflow: hidden;
}

.supply-source-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 24px;
}

.supply-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  height: 100px;
  padding: 0 30px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(to right, #ffffff, #f8fafc);
  flex: 0 0 100px;
}

.supply-search-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.header-search-input {
  width: 320px;
}

.supply-source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}

.supply-source-card {
  position: relative;
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 12px;
  min-height: 126px;
  padding: 12px;
  padding-right: 48px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.supply-source-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.supply-source-image-wrap {
  position: relative;
  width: 108px;
  height: 108px;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
}

.supply-source-carousel-strip {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease;
}

.supply-source-image,
.supply-source-placeholder {
  width: 108px;
  height: 108px;
  flex: 0 0 100%;
  object-fit: cover;
  background: #f1f5f9;
}

.supply-source-image-dots {
  position: absolute;
  bottom: 5px;
  left: 50%;
  display: flex;
  gap: 4px;
  transform: translateX(-50%);
  pointer-events: none;
}

.supply-source-image-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.56);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
}

.supply-source-image-dot.active {
  background: #ffffff;
  box-shadow: 0 1px 5px rgba(15, 23, 42, 0.26);
}

.supply-source-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  font-weight: 700;
}

.supply-source-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.source-title-link {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: #0f172a;
  text-align: left;
  cursor: pointer;
}

.source-title-link:hover {
  color: #2563eb;
}

.source-badge-row,
.source-score-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.source-badge-row {
  flex-wrap: wrap;
}

.source-score-row {
  flex-wrap: nowrap;
  white-space: nowrap;
}

.source-price-box {
  height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 4px 0 0 4px;
  background: #fff1f2;
  color: #e11d48;
  font-size: 16px;
  font-weight: 700;
}

.source-consign-price {
  height: 28px;
  display: inline-flex;
  align-items: center;
  margin-left: -8px;
  padding: 0 10px;
  border-radius: 0 4px 4px 0;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
}

.source-score-row span {
  height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 7px;
  border-radius: 4px;
  background: #eef2ff;
  color: #475569;
  font-size: 11px;
}

.supply-source-actions {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  justify-content: flex-end;
}

.load-more-sentinel {
  min-height: 56px;
  padding: 20px 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.load-more-hint,
.load-more-end {
  font-size: 12px;
  color: #94a3b8;
}

.source-dialog-form {
  min-height: 0;
}

.source-form-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.source-category-row {
  margin-top: 12px;
  min-height: 42px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.source-category-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.source-category-label {
  flex: 0 0 auto;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.source-category-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #0f172a;
  font-size: 12px;
}

.source-category-value.empty {
  color: #94a3b8;
}

.source-category-button {
  height: 26px;
  padding: 0 12px;
  border: 1px solid #bfdbfe;
  border-radius: 7px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
}

.source-category-button:hover {
  background: #dbeafe;
}

.source-action-button {
  min-width: 72px;
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: #ffffff;
  font-size: 12px;
  cursor: pointer;
}

.source-action-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.source-preview-box {
  margin-top: 16px;
  min-height: 134px;
  display: flex;
  align-items: stretch;
}

.source-preview-card {
  width: 100%;
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.source-preview-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.source-preview-image-wrap {
  position: relative;
  width: 108px;
  height: 108px;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
}

.source-preview-carousel-strip {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease;
}

.source-preview-image,
.source-preview-placeholder {
  width: 108px;
  height: 108px;
  flex: 0 0 100%;
  object-fit: cover;
  background: #f1f5f9;
}

.source-preview-image-dots {
  position: absolute;
  bottom: 5px;
  left: 50%;
  display: flex;
  gap: 4px;
  transform: translateX(-50%);
  pointer-events: none;
}

.source-preview-image-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.56);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
}

.source-preview-image-dot.active {
  background: #ffffff;
  box-shadow: 0 1px 5px rgba(15, 23, 42, 0.26);
}

.source-preview-placeholder,
.source-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 12px;
}

.source-empty-state {
  width: 100%;
  min-height: 84px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

.source-preview-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.source-preview-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #0f172a;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
}

.source-preview-price-row,
.source-preview-score-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.source-preview-price-row {
  flex-wrap: wrap;
}

.source-preview-price {
  height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 4px 0 0 4px;
  background: #fff1f2;
  color: #e11d48;
  font-size: 16px;
  font-weight: 700;
}

.source-preview-consign-price {
  height: 28px;
  display: inline-flex;
  align-items: center;
  margin-left: -8px;
  padding: 0 10px;
  border-radius: 0 4px 4px 0;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
}

.source-preview-score-row {
  flex-wrap: nowrap;
  white-space: nowrap;
}

.source-preview-score-row span {
  height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 7px;
  border-radius: 4px;
  background: #eef2ff;
  color: #475569;
  font-size: 11px;
}

:global(.supply-source-dialog) {
  width: min(560px, calc(100vw - var(--app-dialog-edge, 48px))) !important;
  max-width: min(560px, calc(100vw - var(--app-dialog-edge, 48px))) !important;
}

@media (max-width: 900px) {
  .supply-toolbar {
    align-items: flex-start;
    height: 100px;
    padding: 20px;
  }

  .header-search-input {
    width: min(100%, 350px);
  }

  .supply-source-grid {
    grid-template-columns: 1fr;
  }

  .supply-source-card {
    grid-template-columns: 96px minmax(0, 1fr);
  }

  .supply-source-image-wrap,
  .supply-source-image,
  .supply-source-placeholder {
    width: 96px;
    height: 96px;
  }
}
</style>
