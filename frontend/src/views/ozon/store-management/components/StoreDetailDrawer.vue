<template>
  <el-drawer
    v-model="visible"
    title="店铺详情"
    direction="rtl"
    size="60%"
    :show-close="false"
    :lock-scroll="false"
    @close="$emit('update:visible', false)"
  >
    <template #header>
      <div class="app-surface-header app-surface-header--drawer">
        <div class="app-surface-icon">
          <el-icon class="text-blue-600 text-lg">
            <Shop />
          </el-icon>
        </div>
        <div class="app-surface-title-wrapper">
          <span class="app-surface-title">店铺详情</span>
          <span v-if="storeData" class="app-surface-subtitle">{{ storeData.name }}</span>
        </div>
      </div>
    </template>
    <div v-if="storeData" class="app-drawer-content app-drawer-sections">
      <!-- 基本信息 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-slate-700 mb-3 flex items-center">
          <span class="w-1 h-4 bg-blue-500 rounded mr-2"></span>
          基本信息
        </h4>
        <div class="grid grid-cols-2 gap-x-8 gap-y-2">
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">店铺ID</span>
            <span class="text-xs text-slate-900 break-all">{{ storeData.clientId }}</span>
          </div>
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">店铺名称</span>
            <span class="text-xs text-slate-900">{{ storeData.name }}</span>
          </div>
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">公司全称</span>
            <span class="text-xs text-slate-900 truncate" :title="storeData.legalName ?? undefined">
              {{ (storeData.legalName || '暂无').slice(0, 20) }}
            </span>
          </div>
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">税务登记</span>
            <span class="text-xs text-slate-900">{{ storeData.taxNumber || '暂无' }}</span>
          </div>
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">所有权形式</span>
            <span class="text-xs text-slate-900">{{ storeData.ownershipForm || '暂无' }}</span>
          </div>
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">税务系统</span>
            <span class="text-xs text-slate-900">{{ translateTaxSystem(storeData.taxSystem ?? undefined) }}</span>
          </div>
        </div>
      </div>
      <!-- 结算信息 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-slate-700 mb-3 flex items-center">
          <span class="w-1 h-4 bg-green-500 rounded mr-2"></span>
          结算信息
        </h4>
        <div class="grid grid-cols-2 gap-x-8 gap-y-2">
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">结算国家</span>
            <span class="text-xs text-slate-900">{{ translateCountry(storeData.country || '') }}</span>
          </div>
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">结算货币</span>
            <span class="text-xs text-slate-900">{{ storeData.currency || '-' }}</span>
          </div>
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">会员类型</span>
            <span :class="['px-2 py-0.5 text-xs font-medium rounded-full', storeData.isPremium ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600']">
              {{ storeData.isPremium ? '高级会员' : '普通会员' }}
            </span>
          </div>
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">订阅类型</span>
            <span class="text-xs text-slate-900">{{ translateSubscriptionType(storeData.subscriptionType ?? undefined) }}</span>
          </div>
        </div>
      </div>
      <!-- 指标评分 -->
      <div v-if="storeData.ratings && storeData.ratings.length > 0" class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-slate-700 mb-3 flex items-center">
          <span class="w-1 h-4 bg-orange-500 rounded mr-2"></span>
          指标评分
        </h4>
        <div class="flex items-center mb-4 pb-3 border-b border-slate-200">
          <span class="text-xs text-slate-500">综合评分</span>
          <div class="flex items-center gap-3 ml-auto">
            <el-rate :model-value="overallRating" :max="5" disabled show-score text-color="#ff9900"
              :score-template="`${overallRating.toFixed(2)}`" size="small" />
            <span class="text-xs text-slate-500">({{ storeData.ratings.filter((r: { status: string }) => r.status === 'OK').length }}/{{ storeData.ratings.length }})</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-x-8 gap-y-2 max-h-[400px] overflow-y-auto">
          <div v-for="(rating, index) in storeData.ratings" :key="index"
            class="flex items-center justify-between p-2 bg-white rounded border border-slate-100">
            <div class="flex items-center gap-2">
              <span :class="['w-2 h-2 rounded-full', rating.status === 'OK' ? 'bg-green-500' : rating.status === 'UNKNOWN' ? 'bg-slate-300' : 'bg-red-500']"></span>
              <span class="text-xs text-slate-600 truncate" :title="rating.name">{{ translateRating(rating.name) }}</span>
            </div>
            <span class="text-sm font-medium" :class="getRatingColorClass(rating)">{{ formatRatingValue(rating) }}</span>
          </div>
        </div>
      </div>
      <!-- 时间信息 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-slate-700 mb-3 flex items-center">
          <span class="w-1 h-4 bg-slate-500 rounded mr-2"></span>时间信息
        </h4>
        <div class="grid grid-cols-2 gap-x-8 gap-y-2">
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">创建时间</span>
            <span class="text-xs text-slate-900">{{ formatDate(storeData.createdAt) }}</span>
          </div>
          <div class="flex items-start justify-between">
            <span class="text-xs text-slate-500">更新时间</span>
            <span class="text-xs text-slate-900">{{ formatDate(storeData.updatedAt) }}</span>
          </div>
        </div>
      </div>
      <!-- 推送配置 -->
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-slate-700 mb-3 flex items-center">
          <span class="w-1 h-4 bg-cyan-500 rounded mr-2"></span>
          推送配置
        </h4>
        <div class="push-config-row">
          <el-input
            :model-value="pushUrl"
            readonly
            class="push-url-input"
            placeholder="点击右侧按钮获取并复制推送地址"
          />
          <el-button type="primary" class="btn-search push-copy-button" :loading="copyingPushUrl" @click="copyPushUrl">
            复制推送地址
          </el-button>
        </div>
      </div>
      <!-- 原始数据（可折叠） -->
      <div v-if="storeData.rawApiData" class="bg-slate-50 rounded-lg p-4">
        <div class="flex items-center justify-between cursor-pointer" @click="toggleRawData">
          <h4 class="text-sm font-semibold text-slate-700 flex items-center">
            <span class="w-1 h-4 bg-slate-500 rounded mr-2"></span>原始API数据
          </h4>
          <el-icon class="text-slate-400 transition-transform" :class="{ 'rotate-180': showRawData }">
            <ArrowDown />
          </el-icon>
        </div>
        <div v-if="showRawData" class="mt-3">
          <pre class="text-xs text-slate-600 bg-white p-3 rounded border border-slate-200 overflow-x-auto max-h-[300px] overflow-y-auto text-left">
{{ JSON.stringify(storeData.rawApiData, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Shop, ArrowDown } from '@element-plus/icons-vue';
import { ozonStoreAPI } from '@/api/ozonStoreAPI';
import { translateRating, translateCountry, translateTaxSystem, translateSubscriptionType } from '@/utils/translation';

interface StoreData {
  id: number;
  clientId: string;
  name: string;
  legalName?: string | null;
  taxNumber?: string | null;
  ownershipForm?: string | null;
  taxSystem?: string | number | null;
  country?: string | null;
  currency?: string | null;
  isPremium?: boolean;
  subscriptionType?: string | number | null;
  ratings?: Array<{ name: string; value: number; status: string }>;
  createdAt?: string;
  updatedAt?: string;
  rawApiData?: any;
}

interface Props {
  visible: boolean;
  storeData: StoreData | null;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  storeData: null,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const showRawData = ref(false);
const pushUrl = ref('');
const copyingPushUrl = ref(false);

const visible = computed({
  get: () => props.visible,
  set: (val) => {
    if (!val) {
      showRawData.value = false;
    }
    emit('update:visible', val);
  },
});

const storeData = computed(() => props.storeData);

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 本地 HTTP 或浏览器权限限制时走兼容复制。
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'readonly');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error('复制失败');
  }
};

const loadPushUrl = async () => {
  if (!storeData.value?.id) return;
  try {
    const response = await ozonStoreAPI.getPushConfig(storeData.value.id);
    if (response.success && response.data?.pushUrl) {
      pushUrl.value = response.data.pushUrl;
    } else {
      pushUrl.value = '';
    }
  } catch {
    pushUrl.value = '';
  }
};

const copyPushUrl = async () => {
  if (!storeData.value?.id || copyingPushUrl.value) return;
  copyingPushUrl.value = true;
  try {
    if (!pushUrl.value) {
      await loadPushUrl();
    }
    if (!pushUrl.value) {
      ElMessage.error('获取推送地址失败');
      return;
    }
    await copyText(pushUrl.value);
    ElMessage.success('推送地址已复制');
  } catch {
    ElMessage.error('复制失败，请重试');
  } finally {
    copyingPushUrl.value = false;
  }
};

watch(
  () => props.storeData?.id,
  () => {
    pushUrl.value = '';
    if (props.visible) {
      loadPushUrl();
    }
  },
);

watch(
  () => props.visible,
  (visibleValue) => {
    if (visibleValue) {
      loadPushUrl();
    } else {
      pushUrl.value = '';
    }
  },
);

const getRatingNumericValue = (r: any): number | null => {
  if (typeof r.value === 'number') return r.value;
  if (r.current_value && typeof r.current_value.value === 'number') return r.current_value.value;
  return null;
};

const overallRating = computed(() => {
  if (!storeData.value?.ratings?.length) return 0;
  const validRatings = storeData.value.ratings.filter((r: any) => r.status === 'OK' && getRatingNumericValue(r) !== null);
  if (validRatings.length === 0) return 0;
  const sum = validRatings.reduce((s: number, r: any) => s + (getRatingNumericValue(r) ?? 0), 0);
  const avg = sum / validRatings.length;
  return avg > 5 ? (avg / 100) * 5 : avg;
});

// 使用统一的翻译函数

const getRatingColorClass = (rating: any) => {
  if (rating.status !== 'OK') return 'text-slate-400';
  const val = getRatingNumericValue(rating);
  if (val === null) return 'text-slate-400';
  const normalized = val > 5 ? val / 20 : val;
  if (normalized >= 4.5) return 'text-green-600';
  if (normalized >= 3) return 'text-orange-500';
  return 'text-red-500';
};

const formatRatingValue = (rating: any) => {
  if (rating.status !== 'OK') return 'N/A';
  const val = getRatingNumericValue(rating);
  if (val === null) return 'N/A';
  return val.toFixed(2);
};

const formatDate = (val?: string) => {
  if (!val) return '-';
  return new Date(val).toLocaleString('zh-CN');
};

const toggleRawData = () => {
  showRawData.value = !showRawData.value;
};
</script>

<style scoped>
.push-config-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.push-url-input :deep(.el-input__wrapper) {
  background: #ffffff;
}

.push-copy-button {
  min-width: 112px;
}
</style>
