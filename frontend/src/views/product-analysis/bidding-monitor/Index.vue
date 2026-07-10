<template>
  <MainLayout>
    <div class="app-page app-page-stack bidding-monitor-page">
      <StatCardGrid :items="statItems" />
      <!-- Tab 容器 -->
      <div class="app-page-card bidding-monitor-card bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5">
        <!-- Tab 头部 -->
        <div class="tab-header">
          <div class="flex items-center gap-10 h-full">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              @click="handleTabChange(tab.value)"
              :class="[
                'relative h-full cursor-pointer transition-all duration-200 text-sm flex items-center border-b-2 border-transparent whitespace-nowrap',
                activeTab === tab.value ? 'text-blue-600 font-semibold' : 'text-slate-500 font-medium hover:text-slate-900'
              ]"
            >
              <span
                v-if="activeTab === tab.value"
                class="absolute left-0 right-0 bottom-0 h-1 rounded-t-full bg-blue-600"
              ></span>
              <span class="tab-label">
                <el-icon v-if="tab.icon">
                  <component :is="tab.icon" />
                </el-icon>
                {{ tab.label }}
              </span>
              <span
                v-if="tab.count !== undefined"
                :class="[
                  'ml-1.5 min-w-[20px] h-5 px-1.5 rounded-md text-xs inline-flex items-center justify-center',
                  activeTab === tab.value ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                ]"
              >
                {{ tab.count }}
              </span>
            </button>
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="p-5">
          <!-- 价格策略 -->
          <div v-if="activeTab === 'strategy'" class="space-y-5">
          <div class="flex items-center justify-between gap-4">
            <div class="text-left">
              <h3 class="text-base font-bold text-slate-900">
                价格策略设置
              </h3>
              <p class="text-xs text-slate-500 mt-1">
                配置不同商品场景下的加价规则
              </p>
            </div>
            <el-button type="primary" class="btn-create" @click="openAddStrategyModal">
              <el-icon class="mr-1"><Plus /></el-icon>
              添加策略
            </el-button>
          </div>
          <AppEmpty v-if="strategies.length === 0" title="暂无价格策略" description="暂无价格策略">
            <template #action>
              <el-button type="primary" class="btn-create" @click="openAddStrategyModal">
                <el-icon class="mr-1"><Plus /></el-icon>
                添加策略
              </el-button>
            </template>
          </AppEmpty>
          <div v-else class="space-y-3">
            <div v-for="strategy in strategies" :key="strategy.id"
              class="rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:bg-slate-50"
              :class="strategy.isActive ? 'border-blue-200' : ''">
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-3 min-w-0 text-left">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    :class="strategy.isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'">
                    <el-icon size="16" v-if="strategy.isActive">
                      <CircleCheck />
                    </el-icon>
                    <el-icon size="16" v-else>
                      <CircleClose />
                    </el-icon>
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-sm font-semibold text-slate-900 truncate">
                      {{ strategy.name }}
                    </h4>
                    <p class="text-xs text-slate-500 mt-1 truncate">
                      {{ strategy.description }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span class="app-table-tag"
                    :class="strategy.type === 'fixed' ? 'app-table-tag--blue' : 'app-table-tag--purple'">
                    {{ strategy.type === 'fixed' ? '固定加价' : '百分比加价' }}
                  </span>
                  <span class="w-12 text-center text-xs font-semibold text-slate-700">
                    {{ strategy.type === 'fixed' ? strategy.value + ' Р' : strategy.value + '%' }}
                  </span>
                  <span class="app-table-tag"
                    :class="strategy.isActive ? 'app-table-tag--success' : 'app-table-tag--info'">
                    {{ strategy.isActive ? '启用' : '禁用' }}
                  </span>
                  <button @click="toggleStrategy(strategy.id)"
                    class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                    <el-icon size="15" v-if="strategy.isActive">
                      <CircleCheck />
                    </el-icon>
                    <el-icon size="15" v-else>
                      <CircleClose />
                    </el-icon>
                  </button>
                  <button @click="editStrategy(strategy)"
                    class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                    <el-icon size="15">
                      <EditPen />
                    </el-icon>
                  </button>
                  <button @click="deleteStrategy(strategy.id)"
                    class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                    <el-icon size="15">
                      <Delete />
                    </el-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        <!-- 价格历史 -->
        <div v-if="activeTab === 'history'" class="space-y-5">
          <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            <div class="text-left">
              <h3 class="text-base font-bold text-slate-900">
                价格历史记录
              </h3>
              <p class="text-xs text-slate-500 mt-1">
                追踪商品价格调整与操作记录</p>
            </div>
          </div>
          <AppTable :columns="priceHistoryColumns" :data="priceHistory" :empty-text="'暂无价格历史记录'">
            <template #cell-productName="{ row }">
              <div class="flex items-center gap-2.5 text-left">
                <div class="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <el-icon class="text-blue-600" size="15">
                    <Box />
                  </el-icon>
                </div>
                <div class="min-w-0">
                  <div class="text-[12px] leading-[18px] font-semibold text-slate-900 truncate">
                    {{ row.productName }}
                  </div>
                  <div class="text-[11px] leading-[16px] text-slate-500">
                    {{ row.productId }}
                  </div>
                </div>
              </div>
            </template>
            <template #cell-oldPrice="{ row }">
              <span class="text-[12px] text-slate-600">{{ row.oldPrice }} Р</span>
            </template>
            <template #cell-newPrice="{ row }">
              <span class="text-[12px] font-semibold" :class="row.changeType === 'increase' ? 'text-red-600' : 'text-green-600'">
                {{ row.newPrice }} Р
              </span>
            </template>
            <template #cell-changePercent="{ row }">
              <span class="app-table-tag"
                :class="row.changeType === 'increase' ? 'app-table-tag--danger' : 'app-table-tag--success'">
                {{ row.changeType === 'increase' ? '+' : '' }}{{ row.changePercent }}%
              </span>
            </template>
            <template #cell-changeTime="{ row }">
              <span class="text-[12px] text-slate-600">{{ row.changeTime }}</span>
            </template>
            <template #cell-operator="{ row }">
              <span class="text-[12px] text-slate-600">{{ row.operator }}</span>
            </template>
          </AppTable>
          <AppPagination v-if="totalRecords > 0" :model-value="currentPage" :total="totalRecords" :page-size="pageSize" @change="handlePageChange" />
        </div>

        <!-- 价格预警 -->
        <div v-if="activeTab === 'alert'" class="space-y-5">
          <div class="flex items-center justify-between gap-4">
            <div class="text-left">
              <h3 class="text-base font-bold text-slate-900">
                价格预警设置
              </h3>
              <p class="text-xs text-slate-500 mt-1">
                配置成本、售价与利润率预警阈值</p>
            </div>
            <el-button type="primary" class="btn-create" @click="openAddAlertModal">
              <el-icon class="mr-1"><Plus /></el-icon>
              添加预警
            </el-button>
          </div>
          <AppEmpty v-if="alertRules.length === 0" title="暂无预警规则" description="暂无预警规则">
            <template #action>
              <el-button type="primary" class="btn-create" @click="openAddAlertModal">
                <el-icon class="mr-1"><Plus /></el-icon>
                添加预警
              </el-button>
            </template>
          </AppEmpty>
          <div v-else class="space-y-3">
            <div v-for="rule in alertRules" :key="rule.id"
              class="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 transition-colors">
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0 text-left">
                  <h4 class="text-sm font-semibold text-slate-900">
                    {{ rule.name }}
                  </h4>
                  <p class="text-xs text-slate-500 mt-1">
                    {{ rule.condition }}：{{ rule.threshold }} Р
                    <span v-if="rule.type === 'margin'">
                      （利润率低于 {{ rule.marginThreshold }}%）</span>
                  </p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span class="app-table-tag"
                    :class="rule.isActive ? 'app-table-tag--success' : 'app-table-tag--info'">
                    {{ rule.isActive ? '启用' : '禁用' }}
                  </span>
                  <button @click="toggleAlertRule(rule.id)"
                    class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                    <el-icon size="15" v-if="rule.isActive">
                      <CircleCheck />
                    </el-icon>
                    <el-icon size="15" v-else>
                      <CircleClose />
                    </el-icon>
                  </button>
                  <button @click="deleteAlertRule(rule.id)"
                    class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                    <el-icon size="15">
                      <Delete />
                    </el-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="pt-1 space-y-3">
            <div class="text-left">
              <h3 class="text-base font-bold text-slate-900">
                预警商品
              </h3>
              <p class="text-xs text-slate-500 mt-1">
                当前触发规则的商品列</p>
            </div>
            <AppEmpty v-if="alertProducts.length === 0" title="暂无预警商品" description="暂无预警商品" />
            <div v-else class="space-y-3">
              <div v-for="item in alertProducts" :key="item.id"
                class="flex items-center justify-between gap-4 bg-red-50/70 border border-red-100 rounded-xl px-4 py-3">
                <div class="flex items-center gap-3 min-w-0 text-left">
                  <div class="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <el-icon class="text-red-600" size="16">
                      <Warning />
                    </el-icon>
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-sm font-semibold text-slate-900 truncate">
                      {{ item.name }}
                    </h4>
                    <p class="text-xs text-red-600 mt-1">
                      {{ item.alertReason }}
                    </p>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="text-sm font-bold text-red-600">
                    {{ item.currentPrice }} Р
                  </p>
                  <p class="text-xs text-slate-500 mt-1">
                    阈{{ item.threshold }} Р
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <StrategyDialog
        v-model:visible="strategyModalVisible"
        v-model:form-data="strategyForm"
        @save="saveStrategy"
      />
      <AlertRuleDialog
        v-model:visible="alertModalVisible"
        v-model:form-data="alertForm"
        @save="saveAlertRule"
      />
    </div>
  </MainLayout>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import MainLayout from '@/components/MainLayout.vue';
import AppPagination from '@/components/ui/AppPagination.vue';
import StatCardGrid from '@/components/ui/StatCardGrid.vue';
import StrategyDialog from './components/StrategyDialog.vue';
import AlertRuleDialog from './components/AlertRuleDialog.vue';
import { Plus, EditPen, Delete, CircleCheck, CircleClose, Box, TrendCharts, Timer, Notification, Warning, Histogram, Goods } from '@element-plus/icons-vue';
import { AppTable, AppEmpty } from '@/components/ui';
// 价格历史表格列配置
const priceHistoryColumns = [
  { key: 'productName', label: '商品名称', align: 'left' as const },
  { key: 'oldPrice', label: '原价', align: 'left' as const },
  { key: 'newPrice', label: '新价', align: 'left' as const },
  { key: 'changePercent', label: '变动幅度', align: 'left' as const },
  { key: 'changeTime', label: '操作时间', align: 'left' as const },
  { key: 'operator', label: '操作', align: 'left' as const },
];
// 标签页
const activeTab = ref('strategy');
const tabs = [
  { label: '价格策略', value: 'strategy', icon: TrendCharts, count: undefined },
  { label: '价格历史', value: 'history', icon: Timer, count: undefined },
  { label: '价格预警', value: 'alert', icon: Notification, count: undefined },
];
// Tab 切换处理
const handleTabChange = (value: string) => {
  activeTab.value = value;
};
// 搜索和筛选
const currentPage = ref(1);
const pageSize = 10;
const totalRecords = ref(25);
// 分页处理
const handlePageChange = (page: number) => {
  currentPage.value = page;
};
// 统计数据
const stats = computed(() => ({
  totalProducts: 156,
  avgPrice: 1289,
  alertCount: 3,
  profitRate: 32.5
}));
// 统计卡片配置
const statItems = computed(() => [
  {
    label: '商品总数',
    value: stats.value.totalProducts,
    type: 'total' as const,
    icon: Goods,
  },
  {
    label: '平均售价',
    value: `${stats.value.avgPrice} Р`,
    type: 'package' as const,
    icon: TrendCharts,
  },
  {
    label: '预警商品',
    value: stats.value.alertCount,
    type: 'growth' as const,
    icon: Warning,
  },
  {
    label: '利润',
    value: `${stats.value.profitRate}%`,
    type: 'listed' as const,
    icon: Histogram,
  },
]);
// 价格策略列表
const strategies = ref([
  {
    id: 1,
    name: '标准加价策略',
    description: '适用于常规商品的标准加价策略',
    type: 'percentage',
    value: 30,
    isActive: true
  },
  {
    id: 2,
    name: '促销策略',
    description: '促销期间使用的加价策',
    type: 'percentage',
    value: 15,
    isActive: false
  },
  {
    id: 3,
    name: 'VIP专属策略',
    description: 'VIP客户专属加价策略',
    type: 'fixed',
    value: 500,
    isActive: true
  },
  {
    id: 4,
    name: '新品策略',
    description: '新品上市初期策略',
    type: 'percentage',
    value: 45,
    isActive: false
  }
]);
// 价格历史记录
const priceHistory = ref([
  {
    id: 1,
    productId: 'P001',
    productName: '智能手表',
    oldPrice: 2899,
    newPrice: 2999,
    changeType: 'increase',
    changePercent: 3.45,
    changeTime: '2024-01-15 14:30:00',
    operator: 'admin'
  },
  {
    id: 2,
    productId: 'P002',
    productName: '无线蓝牙耳机',
    oldPrice: 1399,
    newPrice: 1299,
    changeType: 'decrease',
    changePercent: -7.15,
    changeTime: '2024-01-15 10:20:00',
    operator: 'admin'
  },
  {
    id: 3,
    productId: 'P003',
    productName: '便携充电',
    oldPrice: 799,
    newPrice: 899,
    changeType: 'increase',
    changePercent: 12.52,
    changeTime: '2024-01-14 16:45:00',
    operator: 'user1'
  },
  {
    id: 4,
    productId: 'P004',
    productName: '运动T恤',
    oldPrice: 449,
    newPrice: 399,
    changeType: 'decrease',
    changePercent: -11.13,
    changeTime: '2024-01-14 09:15:00',
    operator: 'admin'
  },
  {
    id: 5,
    productId: 'P005',
    productName: '化妆刷套',
    oldPrice: 549,
    newPrice: 599,
    changeType: 'increase',
    changePercent: 9.11,
    changeTime: '2024-01-13 11:30:00',
    operator: 'user2'
  }
]);
// 预警规则列表
const alertRules = ref([
  {
    id: 1,
    name: '成本价预',
    condition: '成本价高',
    threshold: 500,
    type: 'cost',
    isActive: true
  },
  {
    id: 2,
    name: '售价预警',
    condition: '售价低于',
    threshold: 100,
    type: 'price',
    isActive: true
  },
  {
    id: 3,
    name: '利润率预',
    condition: '利润率低',
    threshold: 20,
    marginThreshold: 20,
    type: 'margin',
    isActive: false
  }
]);
// 预警商品列表
const alertProducts = ref([
  {
    id: 1,
    name: '数据',
    currentPrice: 199,
    threshold: 200,
    alertReason: '售价低于预警阈值',
  },
  {
    id: 2,
    name: '游戏手柄',
    currentPrice: 899,
    threshold: 800,
    alertReason: '成本价高于预警阈值',
  },
  {
    id: 3,
    name: '手机',
    currentPrice: 299,
    threshold: 300,
    alertReason: '售价低于预警阈值',
  }
]);
// 策略表单
const strategyModalVisible = ref(false);
const strategyForm = ref({
  name: '',
  type: 'percentage' as 'fixed' | 'percentage',
  value: 0,
  description: ''
});
// 预警规则表单
const alertModalVisible = ref(false);
const alertForm = ref({
  name: '',
  condition: 'cost_high' as 'cost_high' | 'price_low' | 'margin_low',
  threshold: 0
});
// 打开添加策略弹窗
const openAddStrategyModal = () => {
  strategyForm.value = {
    name: '',
    type: 'percentage',
    value: 0,
    description: ''
  };
  strategyModalVisible.value = true;
};
// 保存策略
const saveStrategy = () => {
  const newStrategy = {
    id: Date.now(),
    ...strategyForm.value,
    isActive: false
  };
  strategies.value.push(newStrategy);
  strategyModalVisible.value = false;
};
// 切换策略状态
const toggleStrategy = (id: number) => {
  const strategy = strategies.value.find(s => s.id === id);
  if (strategy) {
    strategy.isActive = !strategy.isActive;
  }
};
// 编辑策略
const editStrategy = (strategy: any) => {
  strategyForm.value = { ...strategy };
  strategyModalVisible.value = true;
};
// 删除策略
const deleteStrategy = (id: number) => {
  strategies.value = strategies.value.filter(s => s.id !== id);
};
// 打开添加预警规则弹窗
const openAddAlertModal = () => {
  alertForm.value = {
    name: '',
    condition: 'cost_high',
    threshold: 0
  };
  alertModalVisible.value = true;
};
// 保存预警规则
const saveAlertRule = () => {
  const conditionLabels: Record<string, string> = {
    cost_high: '成本价高',
    price_low: '售价低于',
    margin_low: '利润率低',
  };
  const newRule = {
    id: Date.now(),
    name: alertForm.value.name,
    condition: conditionLabels[alertForm.value.condition],
    threshold: alertForm.value.threshold,
    type: alertForm.value.condition === 'margin_low' ? 'margin' : 'price',
    isActive: true
  };
  alertRules.value.push(newRule);
  alertModalVisible.value = false;
};
// 切换预警规则状态
const toggleAlertRule = (id: number) => {
  const rule = alertRules.value.find(r => r.id === id);
  if (rule) {
    rule.isActive = !rule.isActive;
  }
};
// 删除预警规则
const deleteAlertRule = (id: number) => {
  alertRules.value = alertRules.value.filter(r => r.id !== id);
};
</script>
<style scoped>
.bidding-monitor-page {
  gap: 0;
}

.bidding-monitor-card {
  min-height: var(--app-page-min-height);
  overflow: hidden;
}

.bidding-monitor-card > .p-5 {
  min-height: 0;
}

.price-management-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 20px;
  border-bottom: 1px solid #e2e8f0;
}

.price-management-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.price-management-tabs :deep(.el-tabs__item) {
  height: 56px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

.price-management-tabs :deep(.el-tabs__item.is-active) {
  color: #2563eb;
  font-weight: 700;
}

.price-management-tabs :deep(.el-tabs__item.is-active::before) {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background-color: #2563eb;
  border-radius: 999px;
}

.price-management-tabs :deep(.el-tabs__active-bar) {
  height: 2px;
  border-radius: 999px;
  background-color: #2563eb;
}

/* Tab 头部样式 */
.tab-header {
  padding: 0 20px;
  margin-bottom: 0;
  display: flex;
  justify-content: flex-start;
  height: 64px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
