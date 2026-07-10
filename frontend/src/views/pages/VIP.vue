<template>
  <div class="vip-wrapper">
    <!-- 当前订阅状态栏 -->
    <div class="current-plan-banner">
      <div class="current-plan-left">
        <div class="current-plan-avatar">
          <img src="/src/assets/images/platform/VIP1.png" alt="当前订阅" class="w-7 h-7 object-contain" />
        </div>
        <div class="current-plan-copy">
          <h3 class="current-plan-title">当前订阅：{{ currentMemberLevel }}</h3>
          <p class="current-plan-expire">到期时间：{{ expirationDateDisplay }}</p>
        </div>
      </div>
      <button @click="showPaymentRecords" class="payment-records-btn">
        充值记录
      </button>
    </div>

    <!-- 套餐卡片列表 -->
    <div class="plans-grid">

      <!-- 免费版 -->
      <div :class="['plan-inner plan-card--free', currentMemberLevel === '免费版' ? 'plan-inner--active' : '']">
        <!-- 价格区 -->
        <div class="plan-price-area plan-price-area--free">
          <div class="plan-visual">
            <img src="/src/assets/images/membership/mf_t.png" alt="免费版" class="plan-visual-img" />
            <span class="plan-visual-title">免费版</span>
          </div>
          <div class="plan-price-left">
            <div class="plan-price">
              <span class="plan-price-text text-slate-700">永久</span>
              <span class="plan-price-unit text-slate-400">免费</span>
            </div>
          </div>
        </div>
        <!-- 权益列表 -->
        <ul class="plan-features">
          <li class="plan-feature-item">
            <svg class="plan-check text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            基础功能
          </li>
          <li class="plan-feature-item">
            <svg class="plan-check text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            最多100个商品
          </li>
          <li class="plan-feature-item">
            <svg class="plan-check text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            基础数据分析
          </li>
        </ul>
        <!-- 按钮 -->
        <div class="plan-btn-area">
          <button disabled :class="['plan-btn', currentMemberLevel === '免费版' ? 'plan-btn--current' : 'plan-btn--subscribed']">
            {{ currentMemberLevel === '免费版' ? '当前订阅' : '已订阅' }}
          </button>
        </div>
      </div>

      <!-- 试用版 -->
      <div :class="['plan-inner plan-card--trial', currentMemberLevel === '试用版' ? 'plan-inner--active plan-inner--trial' : '']">
        <!-- 价格区 -->
        <div :class="['plan-price-area', currentMemberLevel === '试用版' ? 'plan-price-area--trial-active' : 'plan-price-area--trial']">
          <div class="plan-visual">
            <img src="/src/assets/images/membership/sy_t.png" alt="试用版" class="plan-visual-img" />
            <span class="plan-visual-title">试用版</span>
          </div>
          <div class="plan-price-left">
            <div class="plan-price">
              <span :class="['plan-price-text', currentMemberLevel === '试用版' ? 'text-orange-600' : 'text-orange-500']">3天试用</span>
              <span class="plan-price-unit text-orange-400">限时</span>
            </div>
          </div>
        </div>
        <!-- 权益列表 -->
        <ul class="plan-features">
          <li class="plan-feature-item">
            <svg class="plan-check text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            体验全部高级功能
          </li>
          <li class="plan-feature-item">
            <svg class="plan-check text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            最多100个商品
          </li>
          <li class="plan-feature-item">
            <svg class="plan-check text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0" />
            </svg>
            试用期限3天
          </li>
        </ul>
        <!-- 按钮 -->
        <div class="plan-btn-area">
          <button v-if="currentMemberLevel === '免费版' && !hasClaimedTrial" @click="handleClaimTrial"
            class="plan-btn plan-btn--trial">
            {{ isClaimingTrial ? '领取中...' : '免费领取' }}
          </button>
          <button v-else-if="currentMemberLevel === '试用版'" disabled class="plan-btn plan-btn--current plan-btn--current-trial">
            当前订阅
          </button>
          <button v-else disabled class="plan-btn plan-btn--subscribed">
            已领取
          </button>
        </div>
      </div>

      <!-- 标准版 -->
      <div :class="['plan-inner plan-card--standard', (currentMemberLevel === '标准' || currentMemberLevel === '标准版') ? 'plan-inner--active plan-inner--standard' : '']">
        <!-- 价格区 -->
        <div :class="['plan-price-area', (currentMemberLevel === '标准' || currentMemberLevel === '标准版') ? 'plan-price-area--standard-active' : 'plan-price-area--standard']">
          <div class="plan-visual">
            <img src="/src/assets/images/membership/bz_t.png" alt="标准版" class="plan-visual-img" />
            <span class="plan-visual-title">标准版</span>
          </div>
          <div class="plan-price-left">
            <div class="plan-price">
              <span :class="['plan-price-main', (currentMemberLevel === '标准' || currentMemberLevel === '标准版') ? 'text-blue-700' : 'text-blue-600']">¥99</span>
              <span class="plan-price-period text-slate-400">/月</span>
            </div>
          </div>
        </div>
        <!-- 权益列表 -->
        <ul class="plan-features">
          <li class="plan-feature-item">
            <svg class="plan-check text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            所有免费功能
          </li>
          <li class="plan-feature-item">
            <svg class="plan-check text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            最多1000个商品
          </li>
          <li class="plan-feature-item">
            <svg class="plan-check text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            高级选品分析
          </li>
          <li class="plan-feature-item">
            <svg class="plan-check text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            优先客服支持
          </li>
        </ul>
        <!-- 按钮 -->
        <div class="plan-btn-area">
          <button v-if="currentMemberLevel === '标准' || currentMemberLevel === '标准版'" disabled
            class="plan-btn plan-btn--current plan-btn--current-standard">
            当前订阅
          </button>
          <button v-else-if="currentMemberLevel === '专业版'" disabled
            class="plan-btn plan-btn--subscribed">
            已订阅
          </button>
          <button v-else @click="showPaymentModal('标准版')" class="plan-btn plan-btn--standard">
            订阅开通
          </button>
        </div>
      </div>

      <!-- 专业版 -->
      <div :class="['plan-inner plan-card--pro', currentMemberLevel === '专业版' ? 'plan-inner--active plan-inner--pro' : '']">
        <span class="plan-recommend-badge">推荐</span>
        <!-- 价格区 -->
        <div :class="['plan-price-area', currentMemberLevel === '专业版' ? 'plan-price-area--pro-active' : 'plan-price-area--pro']">
          <div class="plan-visual">
            <img src="/src/assets/images/membership/zy_t.png" alt="专业版" class="plan-visual-img" />
            <span class="plan-visual-title">专业版</span>
          </div>
          <div class="plan-price-left">
            <div class="plan-price">
              <span :class="['plan-price-main', currentMemberLevel === '专业版' ? 'text-purple-700' : 'text-purple-600']">¥299</span>
              <span class="plan-price-period text-slate-400">/月</span>
            </div>
          </div>
        </div>
        <!-- 权益列表 -->
        <ul class="plan-features">
          <li class="plan-feature-item">
            <svg class="plan-check text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            所有标准版功能
          </li>
          <li class="plan-feature-item">
            <svg class="plan-check text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            无限商品数量
          </li>
          <li class="plan-feature-item">
            <svg class="plan-check text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            智能客服功能
          </li>
          <li class="plan-feature-item">
            <svg class="plan-check text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            专属客户经理
          </li>
        </ul>
        <!-- 按钮 -->
        <div class="plan-btn-area">
          <button v-if="currentMemberLevel === '专业版'" disabled
            class="plan-btn plan-btn--current plan-btn--current-pro">
            当前订阅
          </button>
          <button v-else @click="showPaymentModal('专业版')" class="plan-btn plan-btn--pro">
            订阅开通
          </button>
        </div>
      </div>
    </div>

    <!-- 支付弹窗 -->
    <div v-if="showPaymentModalVisible"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showPaymentModalVisible = false">
      <div class="payment-modal bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl relative">
        <!-- 套餐标签图标 -->
        <div :class="[
          'absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg z-10',
          getPlanBadgeClass(paymentPlan)
        ]">
          <span class="text-white text-xs font-bold">{{ getPlanBadgeText(paymentPlan) }}</span>
        </div>
        <!-- 弹窗页头 -->
        <div class="app-surface-header mb-4">
          <div class="app-surface-icon">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div class="app-surface-title-wrapper">
            <h3 class="app-surface-title">订阅支付</h3>
            <p class="app-surface-subtitle">扫描二维码完成支付</p>
          </div>
        </div>
        <!-- 二维码区域 -->
        <div class="text-center mb-6">
          <div
            class="w-48 h-48 bg-slate-100 rounded-lg mx-auto flex items-center justify-center border-2 border-dashed border-slate-300 cursor-pointer hover:bg-slate-200 transition-colors"
            @click="handleClosePaymentModal">
            <span class="text-slate-400">点击支付</span>
          </div>
          <p class="text-xs text-slate-500 mt-2">微信/支付宝扫码支付</p>
        </div>
      </div>
    </div>

    <!-- 充值记录弹窗 -->
    <AppDialog
      v-model="showPaymentRecordsDialogVisible"
      title="个人充值记录"
      subtitle="查看会员套餐充值记录"
      :icon="Document"
      :show-footer="false"
      overlay-class="payment-records-overlay"
      content-class="payment-records-app-dialog"
    >
      <div v-if="isLoadingPaymentRecords" class="payment-records-state">
        <svg class="animate-spin w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        <span class="ml-2 text-slate-500">加载中..</span>
      </div>
      <div v-else-if="paymentRecords.length === 0" class="payment-records-state flex-col">
        <svg class="w-20 h-20 text-slate-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="text-lg font-medium text-slate-800 mb-1">暂无充值记录</h3>
      </div>
      <div v-else class="payment-records-table-container">
        <div class="payment-records-table-scroll">
          <table class="payment-records-table">
            <thead class="payment-records-head">
              <tr>
                <th class="payment-records-th payment-records-col-index">序号</th>
                <th class="payment-records-th">套餐类型</th>
                <th class="payment-records-th">支付金额</th>
                <th class="payment-records-th">支付状态</th>
                <th class="payment-records-th">支付方式</th>
                <th class="payment-records-th">创建时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(record, index) in paymentRecords" :key="record.id"
                class="app-table-row payment-records-row">
                <td class="payment-records-td"><span class="payment-records-index">{{ (paymentRecordsPage - 1) * paymentRecordsPageSize + index + 1 }}</span></td>
                <td class="payment-records-td">
                  <span :class="['px-2 py-0.5 text-[11px] font-medium rounded-full', getPlanTypeClass(record.planType)]">
                    {{ getPlanTypeName(record.planType) }}
                  </span>
                </td>
                <td class="payment-records-td"><span class="payment-records-amount">¥{{ formatAmount(record.amount) }}</span></td>
                <td class="payment-records-td"><el-tag type="success" size="small">成功</el-tag></td>
                <td class="payment-records-td"><span class="payment-records-text">{{ getPaymentMethodName(record.paymentMethod) }}</span></td>
                <td class="payment-records-td"><span class="payment-records-text">{{ formatPaymentDate(record.createdAt) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <AppPagination :model-value="paymentRecordsPage" :total="paymentRecordsTotal" :page-size="paymentRecordsPageSize" @change="fetchPaymentRecords" />
      </div>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/store/authStore';
import { ElMessage } from 'element-plus';
import { Document } from '@element-plus/icons-vue';
import * as membershipAPI from '@/api/membershipAPI';
import { paymentRecordAPI } from '@/api/paymentRecordAPI';
import AppDialog from '@/components/ui/AppDialog.vue';
import AppPagination from '@/components/ui/AppPagination.vue';
import { appConfirm } from '@/utils/appConfirm';

const authStore = useAuthStore();

// 弹窗状态
const showPaymentModalVisible = ref(false);
const paymentPlan = ref('');
const showPaymentRecordsDialogVisible = ref(false);

// 加载状态
const isClaimingTrial = ref(false);
const isUpgrading = ref(false);
const isLoadingPaymentRecords = ref(false);
const paymentRecords = ref<any[]>([]);

// 充值记录分页
const paymentRecordsPage = ref(1);
const paymentRecordsPageSize = ref(6);
const paymentRecordsTotal = ref(0);

// 试用相关状态
const hasClaimedTrial = ref(false);

// 计算到期时间
const expirationDateDisplay = computed(() => {
  if (!authStore.user) return ' ';
  if (authStore.user.memberLevel === 'trial' && authStore.user.trialExpiration) {
    const date = new Date(authStore.user.trialExpiration);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }
  if ((authStore.user.memberLevel === 'standard' || authStore.user.memberLevel === 'professional') && authStore.user.memberExpiration) {
    const date = new Date(authStore.user.memberExpiration);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }
  return '永久';
});

// 获取当前订阅等级
const currentMemberLevel = computed(() => {
  if (!authStore.user) return '免费版';
  const level = authStore.user.memberLevel;
  const levelMap: Record<string, string> = {
    trial: '试用版',
    free: '免费版',
    standard: '标准版',
    professional: '专业版',
  };
  return levelMap[level || 'free'] || '免费版';
});

// 显示支付弹窗
const showPaymentModal = (plan: string) => {
  showPaymentRecordsDialogVisible.value = false;
  paymentPlan.value = plan;
  showPaymentModalVisible.value = true;
};

// 关闭支付弹窗（视为支付成功）
const handleClosePaymentModal = async () => {
  if (isUpgrading.value) return;
  isUpgrading.value = true;
  try {
    const planMap: Record<string, 'standard' | 'professional'> = {
      '标准版': 'standard',
      '专业版': 'professional'
    };
    const plan = planMap[paymentPlan.value];
    if (!plan) { ElMessage.error('无效的套餐类型'); return; }
    const response = await membershipAPI.upgradeMembership(plan);
    if (response.success) {
      ElMessage.success('会员升级成功');
      await authStore.fetchCurrentUser();
    } else {
      ElMessage.error(response.message || '升级失败');
    }
  } catch (error: any) {
    console.error('升级会员失败:', error);
    ElMessage.error(error.message || '升级失败');
  } finally {
    isUpgrading.value = false;
    showPaymentModalVisible.value = false;
  }
};

// 领取试用
const handleClaimTrial = async () => {
  if (isClaimingTrial.value) return;
  try {
    await appConfirm({
      title: '领取试用',
      message: '确认领取 3 天试用会员吗？',
      confirmText: '确认领取',
      cancelText: '取消',
      variant: 'success',
      icon: 'success',
    });
  } catch {
    return;
  }
  isClaimingTrial.value = true;
  try {
    const response = await membershipAPI.claimTrial();
    if (response.success) {
      ElMessage.success(response.message || '试用会员领取成功');
      hasClaimedTrial.value = true;
      await authStore.fetchCurrentUser();
    } else {
      ElMessage.error(response.message || '领取失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '领取失败');
  } finally {
    isClaimingTrial.value = false;
  }
};

// 显示充值记录
const showPaymentRecords = async () => {
  showPaymentModalVisible.value = false;
  showPaymentRecordsDialogVisible.value = true;
  paymentRecordsPage.value = 1;
  await fetchPaymentRecords(1);
};

// 获取充值记录
const fetchPaymentRecords = async (page: number) => {
  isLoadingPaymentRecords.value = true;
  paymentRecordsPage.value = page;
  try {
    const response = await paymentRecordAPI.getMyPaymentRecords({ page, limit: paymentRecordsPageSize.value });
    if (response.success && response.data) {
      const dataList = Array.isArray(response.data.data) ? response.data.data : [];
      paymentRecords.value = dataList.filter((record: any) => record.status === 'success');
      paymentRecordsTotal.value = response.data.pagination?.total || paymentRecords.value.length;
    } else {
      ElMessage.error(response.message || '获取充值记录失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取充值记录失败');
  } finally {
    isLoadingPaymentRecords.value = false;
  }
};

const getPlanTypeClass = (planType: string) => {
  const classes: Record<string, string> = {
    trial: 'bg-orange-100 text-orange-800',
    free: 'bg-slate-100 text-slate-800',
    standard: 'bg-blue-100 text-blue-800',
    professional: 'bg-purple-100 text-purple-800',
  };
  return classes[planType] || 'bg-slate-100 text-slate-800';
};

const getPlanTypeName = (planType: string) => {
  const names: Record<string, string> = {
    trial: '试用版', free: '免费版', standard: '标准版', professional: '专业版',
  };
  return names[planType] || '未知';
};

const getPlanBadgeClass = (plan: string) => {
  const classes: Record<string, string> = {
    '试用版': 'bg-orange-500', '标准版': 'bg-blue-500', '专业版': 'bg-purple-500',
  };
  return classes[plan] || 'bg-slate-500';
};

const getPlanBadgeText = (plan: string) => {
  const texts: Record<string, string> = {
    '试用版': '试用', '标准版': '标准', '专业版': '专业',
  };
  return texts[plan] || plan;
};

const getPaymentMethodName = (method: string) => {
  if (!method) return '未选择';
  const names: Record<string, string> = { wechat: '微信', alipay: '支付宝', card: '银行' };
  return names[method] || method;
};

const formatAmount = (amount: unknown): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount ?? ''));
  if (num === 0) return '0.00';
  if (!num || !isFinite(num)) return '0.00';
  return num.toFixed(2);
};

const formatPaymentDate = (dateString?: string | null): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

onMounted(() => {
  void (async () => {
    try {
      const response = await membershipAPI.getMembershipInfo();
      if (response.success && response.data && authStore.user) {
        authStore.user.hasClaimedTrial = response.data.hasClaimedTrial;
        authStore.user.trialExpiration = response.data.trialExpiration || null;
        authStore.user.memberExpiration = response.data.memberExpiration || null;
        hasClaimedTrial.value = response.data.hasClaimedTrial;
      }
    } catch (error) {
      console.error('获取会员信息失败:', error);
    }
  })();
});

watch(() => authStore.user, (newUser) => {
  if (newUser) hasClaimedTrial.value = newUser.hasClaimedTrial || false;
}, { immediate: true });
</script>

<style scoped>
/* =========== 整体包装 =========== */
.vip-wrapper {
  padding: 0;
}

/* =========== 当前订阅状态栏 =========== */
.current-plan-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%);
  border: 1px solid #dbeafe;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 14px;
}

.current-plan-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.current-plan-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #bfdbfe, #ddd6fe);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.current-plan-copy {
  min-width: 0;
  text-align: left;
}

.current-plan-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.current-plan-expire {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0 0;
}

.payment-records-btn {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 2px 0;
  border-radius: 0;
  box-shadow: none;
  white-space: nowrap;
  transition: all 0.2s;
}
.payment-records-btn:hover {
  color: #1d4ed8;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* =========== 套餐网格 =========== */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

/* =========== 套餐卡片 =========== */
.plan-inner {
  --plan-accent: #64748b;
  --plan-accent-soft: rgba(100, 116, 139, 0.12);
  --plan-accent-border: rgba(100, 116, 139, 0.18);
  --plan-hero-bg: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), #ffffff 62%),
    #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 18px;
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 330px;
  height: 100%;
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 22px -16px rgba(15, 23, 42, 0.28);
}

.plan-inner > * {
  position: relative;
  z-index: 1;
}

.plan-inner:hover {
  box-shadow:
    0 18px 34px -22px rgba(15, 23, 42, 0.42),
    0 8px 18px -16px var(--plan-accent);
  border-color: var(--plan-accent-border);
  transform: translateY(-4px);
}

.plan-inner::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.9), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.36), transparent 42%);
  opacity: 0.7;
}

.plan-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
}

.plan-card--free {
  --plan-accent: #64748b;
  --plan-accent-soft: rgba(100, 116, 139, 0.1);
  --plan-accent-border: rgba(100, 116, 139, 0.2);
  --plan-hero-bg: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.plan-card--trial {
  --plan-accent: #f97316;
  --plan-accent-soft: rgba(249, 115, 22, 0.11);
  --plan-accent-border: rgba(249, 115, 22, 0.22);
  --plan-hero-bg: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
}

.plan-card--standard {
  --plan-accent: #2563eb;
  --plan-accent-soft: rgba(37, 99, 235, 0.11);
  --plan-accent-border: rgba(37, 99, 235, 0.22);
  --plan-hero-bg: linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%);
}

.plan-card--pro {
  --plan-accent: #7c3aed;
  --plan-accent-soft: rgba(124, 58, 237, 0.13);
  --plan-accent-border: rgba(124, 58, 237, 0.26);
  --plan-hero-bg: linear-gradient(135deg, #faf5ff 0%, #ddd6fe 100%);
}

.plan-recommend-badge {
  position: absolute;
  top: 15px;
  right: 14px;
  z-index: 2;
  padding: 3px 9px;
  border-radius: 999px;
  color: #6d28d9;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(243, 232, 255, 0.92)),
    #f5f3ff;
  border: 1px solid rgba(196, 181, 253, 0.58);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 8px 18px rgba(124, 58, 237, 0.16);
  font-size: 11px;
  line-height: 16px;
  font-weight: 800;
  pointer-events: none;
}

/* 当前套餐 */
.plan-inner--active {
  border-color: rgba(226, 232, 240, 0.72);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, var(--plan-accent) 6%, #ffffff) 100%),
    #ffffff;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--plan-accent) 10%, transparent),
    0 14px 28px -22px color-mix(in srgb, var(--plan-accent) 42%, rgba(15, 23, 42, 0.26));
}

.plan-inner--active::before {
  background:
    linear-gradient(115deg, transparent 0%, transparent 28%, rgba(255, 255, 255, 0.7) 42%, transparent 56%, transparent 100%),
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--plan-accent) 16%, transparent), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), transparent 46%);
  background-size: 260% 100%, 100% 100%, 100% 100%;
  opacity: 0.78;
  animation: planActiveSheen 4.8s ease-in-out infinite;
}

.plan-inner--active::after {
  inset: auto 28px 12px;
  height: 28px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--plan-accent) 14%, transparent);
  filter: blur(16px);
  opacity: 0.28;
  animation: planActiveGlow 2.8s ease-in-out infinite;
}

.plan-inner--active .plan-visual {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 18px 20px -22px var(--plan-accent),
    0 0 0 1px color-mix(in srgb, var(--plan-accent) 14%, transparent);
}

.plan-inner--active .plan-btn--current {
  position: relative;
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.76),
    0 8px 16px -14px var(--plan-accent);
}

.plan-inner--active .plan-btn--current::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 0%, transparent 34%, rgba(255, 255, 255, 0.5) 48%, transparent 62%, transparent 100%);
  transform: translateX(-120%);
  animation: planButtonSheen 3.8s ease-in-out infinite;
}

.plan-inner--active.plan-card--pro .plan-recommend-badge {
  animation: planBadgePulse 2.6s ease-in-out infinite;
}

/* =========== 价格区域 =========== */
.plan-price-area {
  position: relative;
  z-index: 1;
  margin: 12px 12px 10px;
  padding: 0 0 10px;
  border: 0;
  border-radius: 15px;
  background: transparent;
  overflow: visible;
}

.plan-visual {
  width: 100%;
  height: 82px;
  margin-bottom: 18px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: visible;
  background:
    radial-gradient(circle at 50% 24%, rgba(255, 255, 255, 0.78), transparent 34%),
    var(--plan-hero-bg);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.65),
    0 18px 20px -22px var(--plan-accent);
}

.plan-visual-img {
  width: 58px;
  height: 58px;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 12px 12px rgba(15, 23, 42, 0.12));
  transform: translateY(-5px);
}

.plan-visual-title {
  position: absolute;
  left: 13px;
  bottom: 8px;
  color: var(--plan-accent);
  font-size: 12px;
  line-height: 16px;
  font-weight: 800;
  letter-spacing: 0;
}

.plan-price-left {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0 2px;
}

.plan-name {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: var(--plan-accent);
  text-transform: uppercase;
  letter-spacing: 0;
  text-align: left;
}

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  text-align: left;
}

.plan-price-text {
  color: #1e293b;
  font-size: 21px;
  font-weight: 850;
}

.plan-price-unit {
  font-size: 13px;
  font-weight: 700;
}

.plan-price-main {
  color: var(--plan-accent) !important;
  font-size: 30px;
  font-weight: 900;
  line-height: 1;
}

.plan-price-period {
  font-size: 13px;
}

/* =========== 权益列表 =========== */
.plan-features {
  flex: 1;
  list-style: none;
  position: relative;
  z-index: 1;
  padding: 0 18px;
  margin: 0 0 16px 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.plan-feature-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #475569;
  line-height: 1.35;
  text-align: left;
}

.plan-check {
  width: 14px;
  height: 14px;
  margin-right: 8px;
  flex-shrink: 0;
  color: var(--plan-accent) !important;
}

/* =========== 按钮 =========== */
.plan-btn-area {
  margin-top: auto;
  position: relative;
  z-index: 1;
  padding: 0 20px 18px;
}

.plan-btn {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0;
}

/* 当前订阅按钮样式 */
.plan-btn--current {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0.18)),
    color-mix(in srgb, var(--plan-accent) 13%, #ffffff);
  color: var(--plan-accent);
  cursor: not-allowed;
  border-color: color-mix(in srgb, var(--plan-accent) 26%, #e2e8f0);
}

.plan-btn--current-trial {
  color: #c2410c;
}

.plan-btn--current-standard {
  color: #1d4ed8;
}

.plan-btn--current-pro {
  color: #6d28d9;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.22)),
    #f3e8ff;
  border-color: #d8b4fe;
}

/* 已订阅/已领取 */
.plan-btn--subscribed {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
  border-color: #e2e8f0;
}

/* 可操作按钮 */
.plan-btn--trial {
  background: linear-gradient(135deg, #fb923c, #f97316);
  color: #ffffff;
  box-shadow: 0 10px 18px -14px #f97316;
}
.plan-btn--trial:hover { transform: translateY(-1px); box-shadow: 0 14px 22px -16px #f97316; }

.plan-btn--standard {
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  color: #ffffff;
  box-shadow: 0 10px 18px -14px #2563eb;
}
.plan-btn--standard:hover { transform: translateY(-1px); box-shadow: 0 14px 22px -16px #2563eb; }

.plan-btn--pro {
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  color: #ffffff;
  box-shadow: 0 10px 18px -14px #7c3aed;
}
.plan-btn--pro:hover { transform: translateY(-1px); box-shadow: 0 14px 22px -16px #7c3aed; }

@keyframes planActiveSheen {
  0%, 45% {
    background-position: 120% 0, 0 0, 0 0;
  }
  70%, 100% {
    background-position: -120% 0, 0 0, 0 0;
  }
}

@keyframes planActiveGlow {
  0%, 100% {
    opacity: 0.28;
    transform: scaleX(0.82);
  }
  50% {
    opacity: 0.46;
    transform: scaleX(1);
  }
}

@keyframes planButtonSheen {
  0%, 52% {
    transform: translateX(-120%);
  }
  78%, 100% {
    transform: translateX(120%);
  }
}

@keyframes planBadgePulse {
  0%, 100% {
    transform: translateY(0);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.82),
      0 8px 18px rgba(124, 58, 237, 0.16);
  }
  50% {
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.88),
      0 10px 22px rgba(124, 58, 237, 0.24);
  }
}

/* =========== 充值记录弹窗 =========== */
:global(.payment-records-overlay) {
  z-index: 12000 !important;
}

:global(.payment-records-app-dialog) {
  position: relative;
  z-index: 1;
  width: min(840px, calc(100vw - var(--app-dialog-edge, 48px))) !important;
  max-height: min(560px, calc(100vh - 84px));
  border-radius: 4px !important;
}

:global(.payment-records-app-dialog .app-dialog-header) {
  min-height: 110px;
  padding: 22px 28px 18px;
}

:global(.payment-records-app-dialog .dialog-icon-wrapper) {
  width: 48px;
  height: 48px;
  flex-basis: 48px;
}

:global(.payment-records-app-dialog .dialog-icon) {
  font-size: 24px;
}

:global(.payment-records-app-dialog .dialog-title) {
  font-size: 18px;
  line-height: 24px;
}

:global(.payment-records-app-dialog .dialog-subtitle) {
  font-size: 12px;
  line-height: 18px;
}

:global(.payment-records-app-dialog .app-dialog-body) {
  display: flex;
  min-height: 0;
  overflow: hidden;
  padding: 0 0 14px;
  background: rgba(255, 255, 255, 0.92);
}

.payment-records-state {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 300px;
  padding: 24px;
}

.payment-records-table-container {
  --payment-records-head-height: 38px;
  --payment-records-row-height: 50px;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
}

.payment-records-table-scroll {
  flex: 0 0 auto;
  height: calc(var(--payment-records-head-height) + var(--payment-records-row-height) * 6);
  overflow: hidden;
  border-bottom: 1px solid rgba(226, 232, 240, 0.38);
  background: rgba(255, 255, 255, 0.96);
}

.payment-records-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

.payment-records-head {
  position: sticky;
  top: 0;
  z-index: 1;
  height: var(--payment-records-head-height);
  background: rgba(248, 250, 252, 0.96);
  border-bottom: 1px solid rgba(226, 232, 240, 0.92);
}

.payment-records-th {
  height: var(--payment-records-head-height);
  padding: 0 14px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  text-align: left;
  white-space: nowrap;
}

.payment-records-col-index {
  width: 74px;
  text-align: center;
}

.payment-records-th:last-child {
  width: 188px;
}

.payment-records-row {
  height: var(--payment-records-row-height);
  border-bottom: 1px solid rgba(241, 245, 249, 0.92);
  background: rgba(255, 255, 255, 0.96);
  transition: background-color 0.18s ease;
}

.payment-records-row:hover {
  background: #f8fafc;
}

.payment-records-td {
  height: var(--payment-records-row-height);
  padding: 0 14px;
  color: #334155;
  font-size: 12px;
  line-height: 18px;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.payment-records-td:last-child {
  width: 188px;
}

.payment-records-td:first-child {
  text-align: center;
}

.payment-records-index {
  color: #64748b;
  font-size: 12px;
}

.payment-records-amount {
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.payment-records-text {
  color: #475569;
  font-size: 12px;
}

.payment-records-table-container :deep(.app-pagination) {
  flex: 0 0 auto;
  min-height: 52px;
}

:deep(.el-tag) {
  padding: 2px 6px;
  font-size: 11px;
  height: auto;
}
</style>
