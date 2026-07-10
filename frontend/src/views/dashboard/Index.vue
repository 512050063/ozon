<template>
  <MainLayout>
    <div class="dashboard-page p-6 space-y-5">
      <section class="overview-card">
        <div class="overview-content">
          <div class="overview-copy">
            <div class="greeting-card">
              <div :class="['greeting-icon', `greeting-icon--${dashboardGreeting.iconTone}`]">
                <el-icon><component :is="dashboardGreeting.icon" /></el-icon>
              </div>
              <div class="greeting-text">
                <div class="greeting-title-row">
                  <span class="greeting-title">{{ dashboardGreeting.period }}</span>
                  <span class="greeting-date">{{ dashboardGreeting.dateText }}</span>
                </div>
                <p class="greeting-quote">{{ dashboardGreeting.quote }}</p>
              </div>
              <div :class="['greeting-weather', `greeting-weather--${dashboardGreeting.weatherStage}`]" aria-hidden="true">
                <span class="greeting-orbit"></span>
                <span class="greeting-sun"></span>
                <span class="greeting-star greeting-star--one"></span>
                <span class="greeting-star greeting-star--two"></span>
                <span class="greeting-cloud greeting-cloud--main"></span>
                <span class="greeting-cloud greeting-cloud--soft"></span>
              </div>
            </div>
          </div>

          <div class="overview-metrics">
            <div v-for="item in statItems" :key="item.label" class="overview-metric">
              <div :class="['overview-metric-icon', `overview-metric-icon--${item.type || 'total'}`]">
                <el-icon><component :is="item.icon" /></el-icon>
              </div>
              <div>
                <p class="overview-metric-label">{{ item.label }}</p>
                <p class="overview-metric-value">{{ item.value }}</p>
                <p class="overview-metric-sub-label">{{ item.subLabel }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="overview-trend-card">
          <div class="overview-trend-header">
            <div>
              <p class="overview-trend-title">近7日订单</p>
              <p class="overview-trend-subtitle">{{ hasTrendData ? '按日订单量' : '暂无订单数据' }}</p>
            </div>
            <span class="overview-live-badge">实时数据</span>
          </div>
          <div class="overview-bars" aria-hidden="true">
            <span
              v-for="item in overviewTrendBars"
              :key="item.date"
              class="overview-bar"
              :style="{ height: `${item.height}%` }"
            ></span>
          </div>
          <div class="overview-trend-footer">
            <span>今日 {{ todayOrderCount }} 单</span>
            <span>{{ formattedUpdatedAt }}</span>
          </div>
        </div>
      </section>

      <div v-if="loading" class="dashboard-panel h-80 flex items-center justify-center">
        <el-icon class="is-loading text-2xl text-blue-500"><Loading /></el-icon>
        <span class="ml-3 text-sm text-slate-500">正在加载真实运营数据...</span>
      </div>

      <template v-else>
        <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <section class="dashboard-panel trend-panel xl:col-span-3">
            <div class="panel-header">
              <div>
                <h3 class="panel-title">近7日订单趋势</h3>
                <p class="panel-subtitle">按订单创建时间统计，缺失日期自动补零</p>
              </div>
              <span class="panel-badge">真实订单</span>
            </div>

            <div class="trend-panel-body px-6 py-6">
              <div v-if="hasTrendData" class="trend-chart">
                <svg class="w-full h-full" viewBox="0 0 640 220" preserveAspectRatio="none">
                  <g class="chart-grid">
                    <line v-for="y in 5" :key="`grid-${y}`" x1="0" x2="640" :y1="y * 36" :y2="y * 36" />
                  </g>
                  <polyline :points="trendPolyline" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                  <circle
                    v-for="point in trendPoints"
                    :key="point.date"
                    :cx="point.x"
                    :cy="point.y"
                    r="5"
                    fill="#2563eb"
                    stroke="#fff"
                    stroke-width="2"
                  />
                </svg>
                <div class="trend-labels">
                  <span v-for="item in summary.orderTrend" :key="item.date">{{ item.label }}</span>
                </div>
              </div>
              <div v-else class="empty-box trend-empty-box">
                <el-icon><DataLine /></el-icon>
                <span>近7日暂无订单数据</span>
              </div>
            </div>
          </section>

          <section class="dashboard-panel xl:col-span-2">
            <div class="panel-header">
              <div>
                <h3 class="panel-title">商品状态分布</h3>
                <p class="panel-subtitle">基于 Ozon 商品同步后的本地状态</p>
              </div>
            </div>
            <div class="px-6 pt-4 pb-6 space-y-3">
              <div v-for="item in productStatusItems" :key="item.key" class="status-row">
                <div class="flex items-center gap-3">
                  <span class="status-dot" :style="{ background: item.color }"></span>
                  <span class="text-sm font-medium text-slate-700">{{ item.label }}</span>
                </div>
                <div class="flex items-center gap-3 min-w-[140px]">
                  <div class="status-track">
                    <div class="status-fill" :style="{ width: `${item.percent}%`, background: item.color }"></div>
                  </div>
                  <span class="w-8 text-right text-sm font-semibold text-slate-900">{{ item.value }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <section class="dashboard-panel xl:col-span-3">
            <div class="panel-header">
              <div>
                <h3 class="panel-title">最近同步记录</h3>
                <p class="panel-subtitle">商品、订单、类目、财务同步状态</p>
              </div>
            </div>
            <div class="px-6 pt-4 pb-6">
              <div v-if="summary.recentSyncLogs.length" class="space-y-3">
                <div v-for="log in summary.recentSyncLogs" :key="log.id" class="sync-row">
                  <div :class="['sync-icon', log.status === 'success' ? 'sync-icon--success' : 'sync-icon--failed']">
                    <el-icon><CircleCheck v-if="log.status === 'success'" /><Warning v-else /></el-icon>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="text-sm font-semibold text-slate-800 truncate">{{ syncTypeLabel(log.syncType) }}</span>
                      <span :class="['sync-badge', log.status === 'success' ? 'sync-badge--success' : 'sync-badge--failed']">
                        {{ log.status === 'success' ? '成功' : '失败' }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 truncate mt-1">{{ log.message || `${log.storeName} 同步记录` }}</p>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="text-xs text-slate-500">{{ formatRelativeTime(log.createdAt) }}</p>
                    <p class="text-xs text-slate-400 mt-1">{{ log.operatorName }}</p>
                  </div>
                </div>
              </div>
              <div v-else class="empty-box">
                <el-icon><Refresh /></el-icon>
                <span>暂无同步记录</span>
              </div>
            </div>
          </section>

          <section class="dashboard-panel xl:col-span-2">
            <div class="panel-header">
              <div>
                <h3 class="panel-title">需要处理</h3>
                <p class="panel-subtitle">从商品、采集、同步记录中聚合</p>
              </div>
            </div>
            <div class="px-6 pt-4 pb-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
              <div v-for="item in summary.actionItems" :key="item.key" :class="['action-item', `action-item--${item.level}`]">
                <div>
                  <p class="text-sm font-semibold text-slate-800">{{ item.label }}</p>
                  <p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ item.description }}</p>
                </div>
                <span class="action-value">{{ item.value }}</span>
              </div>
            </div>
          </section>
        </div>
      </template>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Box,
  Briefcase,
  CircleCheck,
  CoffeeCup,
  DataLine,
  Goods,
  List,
  Loading,
  Money,
  Refresh,
  Shop,
  ShoppingCart,
  Warning,
} from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
import { dashboardAPI, type DashboardSummary } from '@/api/dashboardAPI';
import { ozonOrderAPI } from '@/api/ozonOrderAPI';
import { ozonProductAPI } from '@/api/ozonProductAPI';
import { getProductSupplyItems, getSupplySources } from '@/api/productSupplyAPI';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';

const emptySummary: DashboardSummary = {
  stats: {
    productSupplyTotal: 0,
    averageProductPrice: 0,
    storeCount: 0,
    totalSalesAmount: 0,
    currency: '₽',
  },
  orderTrend: [],
  productStatus: {
    selling: 0,
    pending: 0,
    error: 0,
    archived: 0,
    autoArchived: 0,
  },
  recentSyncLogs: [],
  actionItems: [],
  updatedAt: '',
};

const loading = ref(true);
const summary = ref<DashboardSummary>(emptySummary);
const { loadStoreContext } = useOzonStoreContext();
const overviewStats = ref({
  sourceCardCount: 0,
  productLibraryListedCount: 0,
  orderCount: 0,
  productManagement: {
    allTotal: 0,
    selling: 0,
    ready: 0,
    pending: 0,
    error: 0,
    unlisted: 0,
    archived: 0,
  },
});

const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(Math.round(value));
const formatMoney = (value: number, currency = '₽') => `${formatNumber(value)} ${currency}`;

const dashboardGreeting = computed(() => {
  const now = new Date();
  const hour = now.getHours();
  const period = hour < 6
    ? '夜深了'
    : hour < 9
      ? '早上好'
      : hour < 12
        ? '上午好'
        : hour < 14
          ? '中午好'
          : hour < 18
            ? '下午好'
            : '晚上好';
  const weatherStage = hour < 6
    ? 'night'
    : hour < 10
      ? 'dawn'
      : hour < 18
        ? 'day'
        : hour < 20
          ? 'dusk'
          : 'night';
  const isCoffeeTime = hour < 10;
  const dateText = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  }).format(now);

  return {
    period,
    dateText,
    weatherStage,
    icon: isCoffeeTime ? CoffeeCup : Briefcase,
    iconTone: isCoffeeTime ? 'coffee' : 'work',
    quote: '对未来的真正慷慨，是把一切都献给现在的行动。',
  };
});

const statItems = computed(() => [
  {
    label: '店铺',
    value: formatNumber(summary.value.stats.storeCount),
    subLabel: '数量',
    type: 'total' as const,
    icon: Shop,
  },
  {
    label: '货源',
    value: formatNumber(overviewStats.value.sourceCardCount),
    subLabel: '商品卡数量',
    type: 'pending' as const,
    icon: Box,
  },
  {
    label: '商品库',
    value: formatNumber(overviewStats.value.productLibraryListedCount),
    subLabel: '已上架数量',
    type: 'cart' as const,
    icon: Goods,
  },
  {
    label: '商品管理',
    value: formatNumber(overviewStats.value.productManagement.selling || summary.value.productStatus.selling),
    subLabel: '在售',
    type: 'money' as const,
    icon: ShoppingCart,
  },
  {
    label: '订单',
    value: formatNumber(overviewStats.value.orderCount),
    subLabel: '订单数量',
    type: 'package' as const,
    icon: List,
  },
  {
    label: '财报',
    value: formatMoney(summary.value.stats.totalSalesAmount, summary.value.stats.currency),
    subLabel: '总计',
    type: 'money' as const,
    icon: Money,
  },
]);

const maxTrendOrders = computed(() => Math.max(...summary.value.orderTrend.map(item => item.orderCount), 1));

const trendPoints = computed(() => {
  const data = summary.value.orderTrend;
  if (data.length === 0) return [];
  const xStep = data.length > 1 ? 640 / (data.length - 1) : 0;
  return data.map((item, index) => ({
    date: item.date,
    x: index * xStep,
    y: 190 - (item.orderCount / maxTrendOrders.value) * 150,
  }));
});

const trendPolyline = computed(() => trendPoints.value.map(point => `${point.x},${point.y}`).join(' '));
const hasTrendData = computed(() => summary.value.orderTrend.some(item => item.orderCount > 0 || item.salesAmount > 0));

const overviewTrendBars = computed(() => {
  const data = summary.value.orderTrend.length ? summary.value.orderTrend : Array.from({ length: 7 }, (_, index) => ({
    date: `empty-${index}`,
    label: '',
    orderCount: 0,
    salesAmount: 0,
  }));
  const max = Math.max(...data.map(item => item.orderCount), 1);
  return data.map(item => ({
    date: item.date,
    height: item.orderCount > 0 ? Math.max(18, Math.round((item.orderCount / max) * 100)) : 12,
  }));
});

const todayOrderCount = computed(() => {
  const latest = summary.value.orderTrend[summary.value.orderTrend.length - 1];
  return latest?.orderCount || 0;
});

const formattedUpdatedAt = computed(() => {
  if (!summary.value.updatedAt) return '刚刚更新';
  const value = formatRelativeTime(summary.value.updatedAt);
  return value === '-' ? '刚刚更新' : `${value}更新`;
});

const productStatusItems = computed(() => {
  const productStatus = overviewStats.value.productManagement;
  const fallback = summary.value.productStatus;
  const status = {
    all: productStatus.allTotal || Object.values(fallback).reduce((sum, value) => sum + value, 0),
    selling: productStatus.selling || fallback.selling,
    ready: productStatus.ready || fallback.pending,
    error: productStatus.error || fallback.error,
    pending: productStatus.pending || 0,
    unlisted: productStatus.unlisted || 0,
    archived: productStatus.archived || fallback.archived,
  };
  const total = Math.max(status.all || 0, 1);
  return [
    { key: 'all', label: '所有', value: status.all, color: '#6366f1' },
    { key: 'selling', label: '在售', value: status.selling, color: '#10b981' },
    { key: 'ready', label: '准备销售', value: status.ready, color: '#3b82f6' },
    { key: 'error', label: '错误', value: status.error, color: '#dc2626' },
    { key: 'pending', label: '待修改', value: status.pending, color: '#f59e0b' },
    { key: 'unlisted', label: '商品已下架', value: status.unlisted, color: '#6b7280' },
    { key: 'archived', label: '档案', value: status.archived, color: '#7c3aed' },
  ].map(item => ({
    ...item,
    percent: Math.round((item.value / total) * 100),
  }));
});

const syncTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    product: '商品同步',
    stock: '库存同步',
    category: '类目同步',
    order: '订单同步',
    finance: '财务同步',
  };
  return map[type] || type;
};

const formatRelativeTime = (value: string) => {
  if (!value) return '-';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '-';
  const diff = Date.now() - time;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(value).toLocaleDateString('zh-CN');
};

const loadDashboard = async () => {
  loading.value = true;
  try {
    const [response, storeContext] = await Promise.all([
      dashboardAPI.getSummary(),
      loadStoreContext(true).catch(() => null),
    ]);
    if (response.success && response.data) {
      summary.value = response.data;
      await loadOverviewStats(storeContext?.resolvedStoreId ?? null);
    } else {
      ElMessage.error(response.message || '首页数据加载失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '首页数据加载失败');
  } finally {
    loading.value = false;
  }
};

const loadOverviewStats = async (storeId: number | null) => {
  const [sourceResult, productLibraryResult, productManagementResult, orderResult] = await Promise.allSettled([
    getSupplySources({ page: 1, limit: 1 }),
    getProductSupplyItems({ page: 1, limit: 1 }),
    storeId ? ozonProductAPI.getLocalProducts(storeId, 1, 1, '', 'all') : Promise.resolve(null),
    storeId ? ozonOrderAPI.getOrders(storeId, { limit: 1, offset: 0 }) : Promise.resolve(null),
  ]);

  const sourceData = sourceResult.status === 'fulfilled' ? sourceResult.value : null;
  const productLibraryData = productLibraryResult.status === 'fulfilled' ? productLibraryResult.value : null;
  const productManagementData = productManagementResult.status === 'fulfilled' ? productManagementResult.value : null;
  const orderData = orderResult.status === 'fulfilled' ? orderResult.value : null;
  const productCounts = productManagementData?.success ? productManagementData.data : null;

  overviewStats.value = {
    sourceCardCount: sourceData?.total || 0,
    productLibraryListedCount: productLibraryData?.stats?.listed || 0,
    orderCount: orderData?.success ? orderData.data?.total || 0 : 0,
    productManagement: {
      allTotal: productCounts?.allTotalCount || productCounts?.totalCount || 0,
      selling: productCounts?.sellingCount || 0,
      ready: productCounts?.readyCount || 0,
      pending: productCounts?.pendingCount || 0,
      error: productCounts?.errorCount || 0,
      unlisted: productCounts?.unlistedCount || 0,
      archived: productCounts?.archivedCount || 0,
    },
  };
};

onMounted(() => {
  loadDashboard();
});
</script>

<style scoped>
.dashboard-page {
  min-height: 100%;
  border-radius: 16px;
  overflow: hidden;
  background-clip: padding-box;
  background:
    radial-gradient(circle at 7% 0%, rgba(59, 130, 246, 0.12), transparent 25%),
    radial-gradient(circle at 88% 7%, rgba(168, 85, 247, 0.08), transparent 23%),
    radial-gradient(circle at 96% 48%, rgba(251, 191, 36, 0.08), transparent 18%),
    linear-gradient(180deg, rgba(248, 251, 255, 0.92), rgba(241, 247, 255, 0.64));
}

.overview-card {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 16px;
  overflow: hidden;
  border: 1px solid rgba(191, 219, 254, 0.74);
  border-radius: 20px;
  background-clip: padding-box;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(248, 251, 255, 0.72)),
    linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(14, 165, 233, 0.05));
  box-shadow: 0 18px 46px rgba(37, 99, 235, 0.09);
  backdrop-filter: blur(14px);
  padding: 20px;
}

.overview-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.52), transparent),
    radial-gradient(circle at 40% -20%, rgba(255, 255, 255, 0.88), transparent 32%);
  opacity: 0.68;
}

.overview-card::after {
  content: '';
  position: absolute;
  right: -46px;
  top: -58px;
  z-index: 0;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.62), transparent 54%),
    linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(14, 165, 233, 0.05));
  pointer-events: none;
}

.overview-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  align-items: stretch;
}

.overview-copy {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: auto;
  padding: 2px 4px 0 2px;
}

.greeting-card {
  position: relative;
  overflow: hidden;
  min-height: 102px;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  border-radius: 16px;
  background:
    radial-gradient(circle at 84% 20%, rgba(251, 191, 36, 0.2), transparent 20%),
    radial-gradient(circle at 94% 70%, rgba(59, 130, 246, 0.1), transparent 26%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(239, 246, 255, 0.52));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  padding: 18px 184px 18px 20px;
}

.greeting-icon {
  position: relative;
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 42px;
  border-radius: 14px;
  background: linear-gradient(145deg, #eff6ff, #ffffff);
  color: #2563eb;
  font-size: 24px;
  box-shadow: inset 0 0 0 1px #dbeafe;
  animation: greetingIconFloat 4.2s ease-in-out infinite;
}

.greeting-icon::after {
  position: absolute;
  inset: 7px;
  content: '';
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.28);
  transform: translate(-8px, -8px);
  opacity: 0;
  animation: greetingIconShine 4.2s ease-in-out infinite;
}

.greeting-icon .el-icon {
  position: relative;
  z-index: 1;
}

.greeting-icon--coffee {
  background: linear-gradient(145deg, #fff7ed, #ffffff);
  color: #c2410c;
  box-shadow: inset 0 0 0 1px #fed7aa;
}

.greeting-icon--work {
  background: linear-gradient(145deg, #eff6ff, #ffffff);
  color: #2563eb;
  box-shadow: inset 0 0 0 1px #bfdbfe;
}

.greeting-text {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.greeting-title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.greeting-title {
  color: #0f172a;
  font-size: 20px;
  font-weight: 850;
  line-height: 1.2;
  white-space: nowrap;
}

.greeting-date {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.greeting-quote {
  margin-top: 6px;
  color: #475569;
  font-size: 13px;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.greeting-weather {
  --greeting-weather-scale: 1;
  position: absolute;
  right: 34px;
  top: 50%;
  width: 130px;
  height: 82px;
  transform: translateY(-50%) scale(var(--greeting-weather-scale));
  pointer-events: none;
  animation: greetingWeatherFloat 6.4s ease-in-out infinite;
}

.greeting-orbit {
  position: absolute;
  right: 2px;
  top: 0;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.16), transparent 62%);
  animation: greetingOrbitPulse 4.8s ease-in-out infinite;
}

.greeting-sun {
  position: absolute;
  right: 10px;
  top: 6px;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 42%, #f59e0b 100%);
  box-shadow:
    0 16px 28px rgba(245, 158, 11, 0.26),
    0 0 0 12px rgba(251, 191, 36, 0.08);
  animation: greetingSunPulse 4.6s ease-in-out infinite;
}

.greeting-star {
  position: absolute;
  display: none;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #fef3c7;
  opacity: 0;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.58);
  animation: greetingStarBlink 2.8s ease-in-out infinite;
}

.greeting-star--one {
  top: 12px;
  left: 24px;
}

.greeting-star--two {
  right: 2px;
  bottom: 24px;
  width: 4px;
  height: 4px;
  animation-delay: 1.1s;
}

.greeting-cloud {
  position: absolute;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14px 28px rgba(148, 163, 184, 0.16);
}

.greeting-cloud::before,
.greeting-cloud::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  background: inherit;
}

.greeting-cloud--main {
  left: 10px;
  bottom: 10px;
  width: 86px;
  height: 28px;
  border-radius: 999px;
  animation: greetingCloudDrift 5.6s ease-in-out infinite;
}

.greeting-cloud--main::before {
  left: 16px;
  bottom: 10px;
  width: 36px;
  height: 36px;
}

.greeting-cloud--main::after {
  right: 10px;
  bottom: 7px;
  width: 30px;
  height: 30px;
}

.greeting-cloud--soft {
  right: 2px;
  bottom: 22px;
  width: 46px;
  height: 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.56);
  box-shadow: 0 12px 22px rgba(148, 163, 184, 0.12);
  animation: greetingCloudDrift 6.8s ease-in-out infinite reverse;
}

.greeting-cloud--soft::before {
  left: 8px;
  bottom: 6px;
  width: 22px;
  height: 22px;
}

.greeting-cloud--soft::after {
  right: 6px;
  bottom: 4px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
}

.greeting-weather--dawn .greeting-sun {
  top: 10px;
  background: linear-gradient(135deg, #fde68a 0%, #fb923c 58%, #f97316 100%);
  box-shadow:
    0 14px 26px rgba(251, 146, 60, 0.25),
    0 0 0 14px rgba(253, 186, 116, 0.1);
}

.greeting-weather--day .greeting-sun {
  background: linear-gradient(135deg, #fef08a 0%, #fbbf24 48%, #f59e0b 100%);
}

.greeting-weather--dusk .greeting-sun {
  top: 13px;
  background: linear-gradient(135deg, #fdba74 0%, #f97316 50%, #e879f9 100%);
  box-shadow:
    0 16px 28px rgba(249, 115, 22, 0.24),
    0 0 0 14px rgba(232, 121, 249, 0.09);
}

.greeting-weather--night .greeting-sun {
  top: 7px;
  right: 16px;
  background: radial-gradient(circle at 36% 32%, #ffffff 0 10px, transparent 11px),
    linear-gradient(135deg, #dbeafe 0%, #93c5fd 52%, #6366f1 100%);
  box-shadow:
    0 15px 28px rgba(79, 70, 229, 0.22),
    0 0 0 12px rgba(147, 197, 253, 0.09);
}

.greeting-weather--night .greeting-star {
  display: block;
  opacity: 0.9;
}

.greeting-weather--night .greeting-cloud {
  background: rgba(226, 232, 240, 0.72);
}

.greeting-weather--dusk .greeting-cloud {
  background: rgba(255, 237, 213, 0.76);
}

@keyframes greetingIconFloat {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-2px);
  }
}

@keyframes greetingIconShine {
  0%,
  70%,
  100% {
    transform: translate(-10px, -10px);
    opacity: 0;
  }

  82% {
    transform: translate(8px, 8px);
    opacity: 0.45;
  }
}

@keyframes greetingWeatherFloat {
  0%,
  100% {
    transform: translateY(-50%) translateX(0) scale(var(--greeting-weather-scale));
  }

  50% {
    transform: translateY(-53%) translateX(4px) scale(var(--greeting-weather-scale));
  }
}

@keyframes greetingOrbitPulse {
  0%,
  100% {
    transform: scale(0.94);
    opacity: 0.62;
  }

  50% {
    transform: scale(1.08);
    opacity: 0.95;
  }
}

@keyframes greetingSunPulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.06);
  }
}

@keyframes greetingCloudDrift {
  0%,
  100% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(-6px);
  }
}

@keyframes greetingStarBlink {
  0%,
  100% {
    transform: scale(0.72);
    opacity: 0.35;
  }

  50% {
    transform: scale(1.18);
    opacity: 0.95;
  }
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.overview-metric {
  position: relative;
  overflow: hidden;
  min-height: 70px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(226, 232, 240, 0.76);
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(248, 250, 252, 0.68));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.045);
  padding: 11px;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.overview-metric::after {
  position: absolute;
  top: -34px;
  right: -28px;
  width: 96px;
  height: 96px;
  content: '';
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.055);
  pointer-events: none;
}

.overview-metric:hover {
  transform: translateY(-2px);
  border-color: rgba(147, 197, 253, 0.9);
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.08);
}

.overview-metric-icon {
  position: relative;
  z-index: 1;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 13px;
  color: #ffffff;
  font-size: 19px;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.16);
}

.overview-metric-icon--total {
  background: linear-gradient(135deg, #38bdf8, #2563eb);
}

.overview-metric-icon--pending {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}

.overview-metric-icon--cart {
  background: linear-gradient(135deg, #fb7185, #ef4444);
}

.overview-metric-icon--money {
  background: linear-gradient(135deg, #22c55e, #0ea5e9);
}

.overview-metric-icon--package {
  background: linear-gradient(135deg, #a78bfa, #7c3aed);
}

.overview-metric-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.overview-metric-value {
  margin-top: 3px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 850;
  line-height: 1;
}

.overview-metric-sub-label {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1;
}

.overview-trend-card {
  position: relative;
  z-index: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
  border: 1px solid rgba(191, 219, 254, 0.78);
  border-radius: 16px;
  background:
    radial-gradient(circle at 88% 16%, rgba(59, 130, 246, 0.14), transparent 38%),
    linear-gradient(180deg, rgba(239, 246, 255, 0.88), rgba(255, 255, 255, 0.76));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
  padding: 15px;
}

.overview-trend-card::after {
  position: absolute;
  right: -36px;
  bottom: -52px;
  width: 138px;
  height: 138px;
  content: '';
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.09);
  pointer-events: none;
}

.overview-trend-header,
.overview-trend-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.overview-trend-title {
  color: #0f172a;
  font-size: 14px;
  font-weight: 800;
}

.overview-trend-subtitle,
.overview-trend-footer {
  color: #64748b;
  font-size: 12px;
}

.overview-live-badge {
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 999px;
  background: linear-gradient(135deg, #dcfce7, #f0fdf4);
  color: #15803d;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.overview-bars {
  height: 92px;
  display: flex;
  align-items: end;
  gap: 9px;
  margin: 16px 2px 12px;
  padding: 0 2px;
}

.overview-bar {
  flex: 1;
  min-width: 10px;
  border-radius: 999px 999px 7px 7px;
  background: linear-gradient(180deg, #60a5fa, #2563eb);
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.16);
  animation: overviewBarGlow 3.8s ease-in-out infinite;
}

.overview-bar:nth-child(2n) {
  animation-delay: 0.4s;
}

.overview-bar:nth-child(3n) {
  animation-delay: 0.8s;
}

.dashboard-panel {
  position: relative;
  border-radius: 16px;
  border: 1px solid rgba(219, 227, 238, 0.9);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.055);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.dashboard-panel::before {
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  content: '';
  background: linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.56), transparent);
  pointer-events: none;
}

.panel-header {
  min-height: 78px;
  padding: 18px 26px;
  border-bottom: 1px solid #eef2f7;
  background:
    radial-gradient(circle at 92% 0%, rgba(191, 219, 254, 0.24), transparent 28%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 251, 255, 0.82) 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.panel-title {
  font-size: 17px;
  line-height: 1.2;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.panel-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 7px;
}

.panel-badge {
  height: 30px;
  padding: 0 12px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  background: linear-gradient(135deg, #eff6ff, #f8fbff);
  box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.72);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.trend-chart {
  position: relative;
  overflow: hidden;
  height: 276px;
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background:
    radial-gradient(circle at 50% 0%, rgba(219, 234, 254, 0.38), transparent 36%),
    linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  padding: 22px 20px 12px;
}

.trend-panel {
  display: flex;
  flex-direction: column;
}

.trend-panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.trend-panel-body .trend-chart,
.trend-empty-box {
  flex: 1;
}

.trend-chart::before {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  transform: translateX(-70%);
  animation: dashboardPanelSweep 7s ease-in-out infinite;
}

.chart-grid line {
  stroke: #e2e8f0;
  stroke-width: 1;
}

.trend-labels {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-top: 10px;
  color: #64748b;
  font-size: 12px;
  text-align: center;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 34px;
  padding: 5px 8px;
  border-radius: 10px;
  transition: background-color 0.18s ease;
}

.status-row:hover {
  background: rgba(248, 250, 252, 0.86);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(226, 232, 240, 0.72);
}

.status-track {
  width: 104px;
  height: 8px;
  border-radius: 999px;
  background: #e9eef6;
  overflow: hidden;
}

.status-fill {
  height: 100%;
  border-radius: inherit;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.12);
}

.sync-row {
  position: relative;
  overflow: hidden;
  min-height: 62px;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.72));
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.sync-row:hover {
  transform: translateY(-1px);
  border-color: rgba(191, 219, 254, 0.92);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.055);
}

.sync-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.62);
}

.sync-icon--success {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #16a34a;
}

.sync-icon--failed {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: #dc2626;
}

.sync-badge {
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
}

.sync-badge--success {
  background: #dcfce7;
  color: #15803d;
}

.sync-badge--failed {
  background: #fee2e2;
  color: #b91c1c;
}

.action-item {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.88);
  border-left-width: 4px;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background:
    radial-gradient(circle at 94% 20%, rgba(219, 234, 254, 0.32), transparent 28%),
    rgba(255, 255, 255, 0.92);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.action-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.055);
}

.action-item--info {
  border-left-color: #3b82f6;
}

.action-item--warning {
  border-left-color: #f59e0b;
}

.action-item--danger {
  border-left-color: #ef4444;
}

.action-value {
  min-width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f1f5f9, #ffffff);
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.empty-box {
  min-height: 220px;
  border-radius: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.58);
  background:
    radial-gradient(circle at 50% 20%, rgba(219, 234, 254, 0.38), transparent 30%),
    #f8fafc;
  color: #64748b;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.empty-box .el-icon {
  font-size: 28px;
  color: #60a5fa;
}

@keyframes overviewBarGlow {
  0%,
  100% {
    filter: saturate(1);
  }

  50% {
    filter: saturate(1.18) brightness(1.04);
  }
}

@keyframes dashboardPanelSweep {
  0%,
  68%,
  100% {
    transform: translateX(-76%);
    opacity: 0;
  }

  82% {
    transform: translateX(76%);
    opacity: 0.72;
  }
}

@media (max-width: 860px) {
  .overview-card {
    grid-template-columns: 1fr;
  }

  .overview-trend-card {
    min-height: 150px;
  }
}

@media (max-width: 720px) {
  .overview-card {
    padding: 16px;
  }

  .overview-metrics {
    grid-template-columns: 1fr;
  }

  .greeting-card {
    min-height: 92px;
    align-items: flex-start;
    padding-right: 88px;
  }

  .greeting-weather {
    --greeting-weather-scale: 0.72;
    right: 12px;
    width: 76px;
    transform-origin: right center;
  }

  .greeting-title-row {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }

  .greeting-quote {
    white-space: normal;
  }
}
</style>
