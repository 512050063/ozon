<template>
  <el-drawer
    v-model="drawerVisible"
    :size="720"
    placement="right"
    :show-close="false"
    class="similar-products-drawer"
    body-class="similar-products-drawer-body"
  >
    <template #header>
      <div class="app-surface-header app-surface-header--drawer">
        <div class="app-surface-icon">
          <el-icon class="text-blue-600 text-lg"><Search /></el-icon>
        </div>
        <div class="app-surface-title-wrapper">
          <span class="app-surface-title">{{ title }}</span>
          <span class="app-surface-subtitle">{{ subtitle }}</span>
        </div>
      </div>
    </template>

    <div class="similar-drawer-body">
      <!-- 模拟数据提示 -->
      <el-alert
        v-if="isMockData"
        title="当前使用演示数据，请在系统设置中配置1688 API密钥以获取真实数据"
        type="warning"
        :closable="false"
        show-icon
        class="similar-drawer-alert"
      />

      <!-- 商品列表 -->
      <div v-if="products.length > 0" class="space-y-4">
        <div v-for="product in products" :key="product.id" class="similar-product-card">
          <div class="flex items-start gap-4">
            <!-- 商品主图 -->
            <div
              class="flex-shrink-0 w-24 h-24 bg-slate-100 rounded-lg overflow-hidden relative similar-img-wrap"
              @mouseenter="startCarousel(product)"
              @mouseleave="stopCarousel(product)"
            >
              <div class="carousel-strip" :style="carouselStripStyle(product)">
                <img
                  v-for="(imgUrl, idx) in getCarouselImages(product)"
                  :key="idx"
                  :src="toDisplayImageUrl(imgUrl)"
                  :alt="product.subject || product.name"
                  class="carousel-slide-img"
                />
              </div>
              <!-- 占位图 -->
              <div v-if="!getCarouselImages(product)[0]" class="img-placeholder-small">
                <el-icon size="24" color="#c0c4cc"><Picture /></el-icon>
              </div>
              <!-- 多图指示器 -->
              <div v-if="getCarouselImages(product).length > 1" class="img-dots">
                <span
                  v-for="(_, idx) in getCarouselImages(product).slice(0, 5)"
                  :key="idx"
                  class="img-dot"
                  :class="{ active: getCarouselIndex(product) === idx }"
                ></span>
              </div>
            </div>

            <div class="flex-1 min-w-0 text-left">
              <!-- 商品名称 -->
              <a
                v-if="product.detail_url || product.detailUrl"
                :href="product.detail_url || product.detailUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="product-name block text-sm font-medium text-slate-800 hover:text-blue-600 mb-2"
                :title="product.subject || product.name"
              >
                {{ product.subject || product.name }}
              </a>
              <span
                v-else
                class="product-name block text-sm font-medium text-slate-800 mb-2"
                :title="product.subject || product.name"
              >
                {{ product.subject || product.name }}
              </span>

              <!-- 标签 + 价格 -->
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <el-tag v-if="hasQualityTag(product)" size="small" type="success" effect="plain">
                  质优
                </el-tag>
                <span class="price-main">
                  ¥{{ typeof product.price === 'number' ? product.price.toFixed(2) : (parseFloat(product.price) || 0).toFixed(2) }}
                </span>
                <span v-if="product.consignPrice" class="price-consign">
                  代发 ¥{{ typeof product.consignPrice === 'number' ? product.consignPrice.toFixed(2) : parseFloat(product.consignPrice).toFixed(2) }}
                </span>
              </div>

              <!-- 评分 + 店铺信息 -->
              <div class="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                <template v-if="product.quality_detail && Object.keys(product.quality_detail).length > 0">
                  <span v-if="product.quality_detail.compositeScore" class="score-item-small" :class="scoreClass(product.quality_detail.compositeScore)">
                    综合 {{ product.quality_detail.compositeScore.toFixed(1) }}
                  </span>
                  <span v-if="product.quality_detail.goodsScore" class="score-item-small" :class="scoreClass(product.quality_detail.goodsScore)">
                    商品 {{ product.quality_detail.goodsScore.toFixed(1) }}
                  </span>
                  <span v-if="product.quality_detail.logisticsScore" class="score-item-small" :class="scoreClass(product.quality_detail.logisticsScore)">
                    物流 {{ product.quality_detail.logisticsScore.toFixed(1) }}
                  </span>
                  <span class="mx-1 text-slate-300">|</span>
                </template>
                <el-icon size="12"><Shop /></el-icon>
                <span class="truncate max-w-[160px]">{{ product.supplier_name || product.supplier?.name || '1688供应商' }}</span>
                <span v-if="product.city || product.location" class="supplier-city">· {{ product.city || product.location }}</span>
              </div>
            </div>

            <div class="flex-shrink-0">
              <el-button type="primary" @click="handleAddToLibrary(product)" class="rounded-lg" size="small">
                <el-icon class="mr-1"><Plus /></el-icon>
                采集
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-else-if="isSearching" class="search-loading-container">
        <div class="search-orbit-loader" aria-hidden="true">
          <span class="search-orbit-ring"></span>
          <span class="search-orbit-dot dot-one"></span>
          <span class="search-orbit-dot dot-two"></span>
          <span class="search-orbit-dot dot-three"></span>
          <el-icon class="search-orbit-icon"><Search /></el-icon>
        </div>
        <div class="search-progress-track" aria-hidden="true">
          <span class="search-progress-fill"></span>
        </div>
        <p class="search-loading-subtitle">正在1688搜索{{ title === '同款商品' ? '同款' : '同类' }}商品</p>
        <p class="search-loading-time" v-if="elapsed > 0">已搜索{{ elapsed }}秒</p>
      </div>

      <!-- 无结果 -->
      <AppEmpty v-else title="未找到同款商品" description="未找到同款商品" />

      <!-- 无限滚动哨兵 -->
      <div ref="sentinelRef" class="load-more-sentinel">
        <div v-if="isLoadingMore" class="load-more-spinner">
          <div class="load-more-dots">
            <span></span><span></span><span></span>
          </div>
          <span class="load-more-text">加载更多商品...</span>
        </div>
        <div v-else-if="!hasMore && products.length > 0" class="load-more-end">
          已加载全部 {{ products.length }} 件商品
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { Search, Picture, Shop, Plus } from '@element-plus/icons-vue';
import AppEmpty from '@/components/ui/AppEmpty.vue';
import { toDisplayImageUrl } from '@/utils/imageUrl';

// Props
interface Props {
  modelValue: boolean;
  title: string;
  subtitle: string;
  products: any[];
  isMockData: boolean;
  isSearching: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadingDots: string;
  elapsed: number;
  referenceCategoryName?: string;
  referenceCategoryId?: number | null;
  referenceTypeId?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  title: '同款商品',
  subtitle: '',
  products: () => [],
  isMockData: false,
  isSearching: false,
  isLoadingMore: false,
  hasMore: true,
  loadingDots: '',
  elapsed: 0,
  referenceCategoryName: '',
  referenceCategoryId: null,
  referenceTypeId: null,
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'load-more': [];
  addToLibrary: [product: any];
  carouselStart: [product: any];
  carouselStop: [product: any];
}>();

// 双向绑定桥接：modelValue prop → el-drawer v-model
const drawerVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
});

// 无限滚动哨兵 ref
const sentinelRef = ref<HTMLElement | null>(null);
let loadMoreObserver: IntersectionObserver | null = null;

// 设置 IntersectionObserver
const setupObserver = () => {
  cleanupObserver();
  nextTick(() => {
    if (!sentinelRef.value) return;
    loadMoreObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && props.hasMore && !props.isLoadingMore && !props.isSearching) {
          emit('load-more');
        }
      },
      { threshold: 0.1 }
    );
    loadMoreObserver.observe(sentinelRef.value);
  });
};

// 清理 IntersectionObserver
const cleanupObserver = () => {
  if (loadMoreObserver) {
    loadMoreObserver.disconnect();
    loadMoreObserver = null;
  }
};

// 抽屉打开时设置 observer
watch(drawerVisible, (visible) => {
  if (visible) {
    setupObserver();
  } else {
    cleanupObserver();
  }
});

// 商品列表变化时重新设置 observer（DOM 可能已更新）
watch(() => props.products.length, () => {
  if (drawerVisible.value) {
    setupObserver();
  }
});

onUnmounted(() => {
  cleanupObserver();
});

// 轮播索引映射
const carouselIndexes = ref<Map<string, number>>(new Map());

// 获取轮播图片
const getCarouselImages = (product: any): string[] => {
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
    if (url && !images.includes(url)) images.push(url);
  };
  push(product.images);
  push(product.imageList);
  push(product.offerImage?.images);
  push(product.imageInfo?.images);
  push(product.imgUrl);
  push(product.primaryImage);
  push(product.image);
  push(product.image_url);
  push(product.imageUrl);
  push(product.offerImage?.imageUrl);
  push(product.imageInfo?.imageUrl);
  return images;
};

// 获取轮播索引
const getCarouselIndex = (product: any): number => {
  return carouselIndexes.value.get(product.id) || 0;
};

// 轮播样式
const carouselStripStyle = (product: any): Record<string, string> => {
  const index = getCarouselIndex(product);
  return {
    transform: `translateX(-${index * 96}px)`,
  };
};

// 开始轮播
const startCarousel = (product: any) => {
  emit('carouselStart', product);
};

// 停止轮播
const stopCarousel = (product: any) => {
  emit('carouselStop', product);
};

const hasQualityTag = (product: any): boolean => {
  const score = Number(product.quality_score || product.qualityScore || 0);
  return Number.isFinite(score) && score >= 4;
};

// 评分样式类
const scoreClass = (score: number): string => {
  if (score >= 4.5) return 'score-high';
  if (score >= 4) return 'score-good';
  return 'score-normal';
};

// 添加到商品库（附带参考商品的类目信息）
const handleAddToLibrary = (product: any) => {
  emit('addToLibrary', {
    ...product,
    referenceCategoryName: props.referenceCategoryName,
    referenceCategoryId: props.referenceCategoryId,
    referenceTypeId: props.referenceTypeId
  });
};

// 暴露方法给父组件
defineExpose({
  setCarouselIndex: (productId: string, index: number) => {
    carouselIndexes.value.set(productId, index);
  },
});
</script>

<style scoped>
:global(.similar-products-drawer-body) {
  padding: 26px 30px 32px !important;
}

.similar-drawer-body {
  box-sizing: border-box;
  min-height: 100%;
  padding: 0;
}

.similar-drawer-alert {
  margin-bottom: 16px;
}

.similar-product-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.similar-product-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.similar-img-wrap {
  position: relative;
  overflow: hidden;
}

.carousel-strip {
  display: flex;
  transition: transform 0.3s ease;
}

.carousel-slide-img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  flex-shrink: 0;
}

.img-placeholder-small {
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
}

.img-dots {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
}

.img-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
}

.img-dot.active {
  background: #fff;
}

.product-name {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.price-main {
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
}

.price-consign {
  font-size: 12px;
  color: #64748b;
  margin-left: 8px;
}

.score-item-small {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.score-high {
  background: #dcfce7;
  color: #16a34a;
}

.score-good {
  background: #fef3c7;
  color: #d97706;
}

.score-normal {
  background: #f1f5f9;
  color: #64748b;
}

.supplier-city {
  color: #94a3b8;
}

.search-loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  padding: 48px 24px;
}

.search-orbit-loader {
  position: relative;
  width: 118px;
  height: 118px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-orbit-ring {
  position: absolute;
  inset: 13px;
  border-radius: 50%;
  border: 1px solid rgba(37, 99, 235, 0.16);
  background:
    radial-gradient(circle at center, rgba(239, 246, 255, 0.95) 0%, rgba(239, 246, 255, 0.72) 48%, rgba(255, 255, 255, 0) 70%),
    conic-gradient(from 0deg, rgba(37, 99, 235, 0.08), rgba(20, 184, 166, 0.46), rgba(37, 99, 235, 0.08));
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.12);
  animation: searchOrbitSpin 2.4s linear infinite;
}

.search-orbit-icon {
  position: relative;
  z-index: 2;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  font-size: 25px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 10px 22px rgba(37, 99, 235, 0.18);
}

.search-orbit-dot {
  position: absolute;
  z-index: 3;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.12);
  animation: searchPulseDot 1.6s ease-in-out infinite;
}

.search-orbit-dot.dot-one {
  top: 17px;
  right: 31px;
}

.search-orbit-dot.dot-two {
  right: 18px;
  bottom: 34px;
  background: #14b8a6;
  box-shadow: 0 0 0 5px rgba(20, 184, 166, 0.13);
  animation-delay: 0.22s;
}

.search-orbit-dot.dot-three {
  left: 27px;
  bottom: 24px;
  background: #60a5fa;
  box-shadow: 0 0 0 5px rgba(96, 165, 250, 0.14);
  animation-delay: 0.44s;
}

@keyframes searchOrbitSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes searchPulseDot {
  0%,
  100% {
    transform: scale(0.78);
    opacity: 0.45;
  }

  45% {
    transform: scale(1.08);
    opacity: 1;
  }
}

.search-progress-track {
  position: relative;
  width: 168px;
  height: 6px;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(226, 232, 240, 0.7), rgba(219, 234, 254, 0.92), rgba(226, 232, 240, 0.7));
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.06);
}

.search-progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 54%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0), rgba(37, 99, 235, 0.78), rgba(20, 184, 166, 0.78), rgba(37, 99, 235, 0));
  box-shadow: 0 0 16px rgba(37, 99, 235, 0.22);
  animation: searchProgressSweep 1.7s ease-in-out infinite;
}

@keyframes searchProgressSweep {
  0% {
    transform: translateX(-105%);
    opacity: 0.38;
  }

  45% {
    opacity: 1;
  }

  100% {
    transform: translateX(205%);
    opacity: 0.38;
  }
}

.search-loading-subtitle {
  margin-top: 12px;
  font-size: 14px;
  color: #64748b;
  text-align: center;
}

.search-loading-time {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}

.load-more-sentinel {
  padding: 16px;
  text-align: center;
}

.load-more-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.load-more-dots {
  display: flex;
  gap: 4px;
}

.load-more-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  animation: bounce 1.4s ease-in-out infinite;
}

.load-more-dots span:nth-child(1) { animation-delay: 0s; }
.load-more-dots span:nth-child(2) { animation-delay: 0.2s; }
.load-more-dots span:nth-child(3) { animation-delay: 0.4s; }

.load-more-text {
  font-size: 14px;
  color: #64748b;
}

.load-more-end {
  font-size: 13px;
  color: #94a3b8;
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>
