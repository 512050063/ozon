<template>
  <div class="app-table-wrapper app-table-wrapper--embedded preference-product-table" :class="{ 'app-table-wrapper--fill-empty': products.length === 0 }">
    <div class="app-table-scroll overflow-x-auto">
      <table class="app-table preference-table-grid">
        <colgroup>
          <col class="preference-col-index" />
          <col class="preference-col-product" />
          <col class="preference-col-code" />
          <col class="preference-col-price" />
          <col class="preference-col-review" />
          <col class="preference-col-rating" />
          <col class="preference-col-action" />
        </colgroup>
        <thead class="app-table-header">
        <tr>
          <th class="app-table-th center">序号</th>
          <th class="app-table-th left">
            商品信息
          </th>
          <th class="app-table-th left">货号</th>
          <th class="app-table-th left">价格</th>
          <th class="app-table-th left">评价</th>
          <th class="app-table-th left">评分</th>
          <th class="app-table-th left">操作</th>
        </tr>
      </thead>
      <tbody class="app-table-body">
        <tr v-if="showSkeleton">
          <td colspan="7" class="app-table-td preference-skeleton-cell">
            <div class="preference-table-skeleton" aria-label="正在加载优选商品">
              <AppSkeletonLoader variant="table" :rows="6" :columns="7" compact />
            </div>
          </td>
        </tr>
        <template v-else>
          <tr v-for="(product, index) in products" :key="product.id" class="app-table-row">
            <td class="app-table-td center">
              <span class="preference-index">{{ index + 1 }}</span>
            </td>
            <td class="app-table-td left">
              <div class="preference-product-cell">
                <div class="preference-product-image">
                  <AppImage :src="product.imageUrl" :alt="product.name" fit="cover" />
                </div>
                <div class="min-w-0 flex-1">
                  <el-tooltip :content="product.name" placement="top" :show-after="300">
                    <a
                      :href="product.productUrl"
                      target="_blank"
                      class="preference-product-name"
                    >
                      {{ product.name }}
                    </a>
                  </el-tooltip>
                  <div class="flex items-center gap-1">
                    <span v-if="product.productType && product.productType !== '待分类'" class="app-table-tag app-table-tag--info preference-type-pill">
                      {{ product.productType }}
                    </span>
                    <span v-else-if="!extractCompleted" class="flex items-center gap-1 text-xs text-blue-500">
                      <span class="w-3 h-3 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></span>
                      类目获取中
                    </span>
                    <span v-else class="text-xs text-red-400">类目获取失败</span>
                  </div>
                </div>
              </div>
            </td>
            <td class="app-table-td left">
              <span class="preference-code">{{ product.id }}</span>
            </td>
            <td class="app-table-td left">
              <div>
                <span class="preference-price">¥{{ product.price.toFixed(2) }}</span>
                <span v-if="product.originalPrice && product.originalPrice > product.price" class="text-xs text-slate-400 line-through ml-2">
                  ¥{{ product.originalPrice.toFixed(2) }}
                </span>
              </div>
              <div v-if="product.discount && product.discount > 0" class="text-xs text-red-500">
                折扣: -{{ product.discount }}%
              </div>
            </td>
            <td class="app-table-td left">
              <span class="preference-code">{{ product.reviewCount }}</span>
            </td>
            <td class="app-table-td left">
              <div class="flex items-center gap-1">
                <el-icon class="text-yellow-400"><StarFilled /></el-icon>
                <span class="preference-code">{{ product.rating }}</span>
              </div>
            </td>
            <td class="app-table-td left">
              <div class="flex items-center space-x-2">
                <AppTableButton name="save" :loading="savingProductId === product.id" :disabled="!product.productType || product.productType === '待分类'" @click="handleSave(product)" />
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    </div>
    <div v-if="!showSkeleton && products.length === 0" class="app-table-empty">
      <AppEmpty title="暂无产品" description="请尝试其他搜索条件" variant="table" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { StarFilled } from '@element-plus/icons-vue';
import AppEmpty from '@/components/ui/AppEmpty.vue';
import AppImage from '@/components/ui/AppImage.vue';
import AppSkeletonLoader from '@/components/ui/AppSkeletonLoader.vue';
import AppTableButton from '@/components/ui/AppTableButton.vue';

// 产品类型接口
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
}

// Props
interface Props {
  products: ProductWithType[];
  isExtractingTypes: boolean;
  extractCompleted: boolean;
  extractedCount: number;
  extractTotal: number;
  savingProductId: string | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  products: () => [],
  isExtractingTypes: false,
  extractCompleted: false,
  extractedCount: 0,
  extractTotal: 0,
  savingProductId: null,
  loading: false,
});

const initialSkeletonPending = ref(true);
let initialSkeletonTimer: ReturnType<typeof setTimeout> | null = null;

const clearInitialSkeletonTimer = () => {
  if (initialSkeletonTimer) {
    clearTimeout(initialSkeletonTimer);
    initialSkeletonTimer = null;
  }
};

watch(
  () => [props.loading, props.products.length] as const,
  ([loading, rowCount], [wasLoading] = [false, 0]) => {
    clearInitialSkeletonTimer();

    if (loading) {
      initialSkeletonPending.value = true;
      return;
    }

    if (rowCount > 0) {
      initialSkeletonPending.value = false;
      return;
    }

    if (wasLoading || initialSkeletonPending.value) {
      initialSkeletonTimer = setTimeout(() => {
        initialSkeletonPending.value = false;
        initialSkeletonTimer = null;
      }, 520);
    }
  },
  { immediate: true }
);

onBeforeUnmount(clearInitialSkeletonTimer);

const showSkeleton = computed(() => props.loading || (initialSkeletonPending.value && props.products.length === 0));

// Emits
const emit = defineEmits<{
  saveProduct: [product: ProductWithType];
}>();

// 保存处理
const handleSave = (product: ProductWithType) => {
  emit('saveProduct', product);
};
</script>

<style scoped>
.preference-product-table {
  min-height: 0;
  background: transparent !important;
}

.preference-skeleton-cell {
  padding: 0;
  border-bottom: none;
}

.preference-table-skeleton {
  min-height: 360px;
  padding: 10px 18px 18px;
}

.preference-table-grid {
  table-layout: fixed;
  min-width: 940px;
}

.preference-col-index {
  width: 64px;
}

.preference-col-product {
  width: 34%;
}

.preference-col-code {
  width: 17%;
}

.preference-col-price {
  width: 13%;
}

.preference-col-review {
  width: 10%;
}

.preference-col-rating {
  width: 10%;
}

.preference-col-action {
  width: 96px;
}

.preference-product-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.preference-product-image {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  overflow: hidden;
  border-radius: 8px;
  background: #f6f8fb;
}

.preference-product-name {
  display: block;
  max-width: 100%;
  margin-bottom: 5px;
  overflow: hidden;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preference-product-name:hover {
  color: #1d4ed8;
}

.preference-type-pill {
  max-width: 160px;
  min-width: 44px;
}

.preference-index {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.preference-code {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  color: #334155;
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preference-price {
  color: #dc2626;
  font-size: 12px;
  font-weight: 700;
}
</style>
