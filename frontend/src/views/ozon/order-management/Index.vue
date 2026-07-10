<template>
  <MainLayout>
    <div class="p-6 order-management-page app-page-stack app-page--fluid">
      <!-- 页头分类标签 -->
      <AppTabs v-model="currentStatusFilter" :tabs="statusTabs" />

      <!-- 搜索和订单列表合并 -->
      <div class="app-page-table-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <!-- 搜索和操作栏 -->
        <div class="app-page-table-toolbar px-6 h-[100px] flex items-center">
          <div class="flex flex-col md:flex-row gap-4 items-center w-full">
            <div class="flex items-center gap-3 flex-1">
              <!-- 搜索 -->
              <div class="search-container">
                <el-input
                  v-model="searchForm.keyword"
                  placeholder="搜索订单号、客户姓名、SKU"
                  clearable
                  class="input-search"
                  @keyup.enter="handleSearch"
                />
                <el-button type="primary" class="btn-search" @click="handleSearch">
                  <el-icon class="mr-1"><Search /></el-icon>
                  搜索
                </el-button>
              </div>
            </div>

            <!-- 更新订单按钮 -->
            <AppUpdateButton
              text="订单更新"
              :loading="isUpdating"
              :last-update-time="lastUpdateTime"
              :update-status="updateStatus === '更新成功' ? 'success' : updateStatus === '更新失败' ? 'error' : 'idle'"
              :fetch-last-update-time="fetchLastUpdateTime"
              :module="ORDER_MANAGEMENT_MODULE"
              :disabled="!selectedStoreId"
              @click="handleUpdateClick"
              @detail="handleDetailClick"
            />
          </div>
        </div>

        <!-- 订单列表 -->
        <div class="app-table-scroll app-page-table-scroll overflow-x-auto">
          <table class="app-table order-table w-full">
            <thead class="bg-slate-50 app-page-table-head">
              <tr>
                <th class="app-table-th center w-16">序号</th>
                <th class="app-table-th w-36">快件编号</th>
                <th class="app-table-th w-28">状态</th>
                <th class="app-table-th w-16">图片</th>
                <th class="app-table-th w-64">数量、货号、商品名称</th>
                <th class="app-table-th w-24 right">价格</th>
                <th class="app-table-th w-40">已接收</th>
                <th class="app-table-th w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              <!-- 首次加载中（无数据时） -->
              <tr v-if="!dataLoaded && orders.length === 0">
                <td colspan="8" class="app-table-td px-4 py-20 text-center" style="border-bottom: none;">
                  <div class="order-table-skeleton">
                    <AppSkeletonLoader variant="order-table" :rows="6" compact />
                  </div>
                </td>
              </tr>
              <!-- 空状态 -->
              <tr v-else-if="dataLoaded && orders.length === 0">
                <td colspan="8" class="app-table-td app-table-empty-cell" style="border-bottom: none;">
                  <AppEmpty title="暂无订单" description="暂无订单数据" variant="table" />
                </td>
              </tr>
              <!-- 订单数据行 -->
              <template v-if="orders.length > 0">
              <tr v-for="(order, index) in orders" :key="order.id || order.postingNumber" class="app-table-row">
                <td class="app-table-td center w-16">{{ index + 1 }}</td>
                <td class="app-table-td w-36">{{ order.postingNumber }}</td>
                <td class="app-table-td w-28">
                  <el-tag class="app-table-tag" :type="getStatusTagType(order.status)" size="small">{{ getStatusLabel(order.status) }}</el-tag>
                </td>
                <td class="app-table-td w-16">
                  <AppImage
                    :src="getFirstProductImage(order)"
                    :alt="getProductNames(order)"
                    fit="cover"
                    class="order-product-image"
                    error-text="加载失败"
                    empty-text="暂无图片"
                  />
                </td>
                <td class="app-table-td w-64">
                  <div class="product-info-container">
                    <div class="product-info-line">
                      <div class="product-info-item" :title="getProductQuantityAndSku(order)">{{ getProductQuantityAndSku(order) }}</div>
                      <el-popover
                        v-if="buildOrderProductDisplay(order, getTranslatedName).count > 1"
                        trigger="hover"
                        placement="right-start"
                        width="340"
                        popper-class="order-product-popover"
                      >
                        <template #reference>
                          <el-tag class="app-table-tag order-product-count-tag" effect="light" type="info">
                            {{ buildOrderProductDisplay(order, getTranslatedName).countLabel }}
                          </el-tag>
                        </template>
                        <div class="order-product-popover-list">
                          <div
                            v-for="(item, itemIndex) in buildOrderProductDisplay(order, getTranslatedName).items"
                            :key="`${item.sku}-${itemIndex}`"
                            class="order-product-popover-item"
                          >
                            <AppImage
                              :src="item.image"
                              :alt="item.name"
                              fit="cover"
                              class="order-product-popover-image"
                              error-text="加载失败"
                              empty-text="暂无图片"
                            />
                            <div class="order-product-popover-text">
                              <div class="order-product-popover-sku">{{ item.quantityText }}</div>
                              <div class="order-product-popover-name">{{ item.name }}</div>
                            </div>
                          </div>
                        </div>
                      </el-popover>
                    </div>
                    <div class="product-info-item" :title="getProductNames(order)">{{ getProductNames(order) }}</div>
                  </div>
                </td>
                <td class="app-table-td w-24 right">{{ formatOrderPrice(order) }}</td>
                <td class="app-table-td w-40">{{ formatDateTime(order.inProcessAt) }}</td>
                <td class="app-table-td w-32">
                  <div class="order-actions">
                    <AppTableButton name="detail" :disabled="isOrderBusy(order)" @click="showOrderDetail(order)" />
                    <el-dropdown
                      trigger="click"
                      popper-class="product-more-dropdown"
                      :disabled="isOrderBusy(order)"
                      @command="(command) => handleOrderMoreCommand(command as OrderAction, order)"
                    >
                      <span class="more-btn-wrapper">
                        <AppTableButton name="more" :disabled="isOrderBusy(order)" />
                      </span>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item v-if="canPreparePosting(order)" command="prepare">
                            <el-icon class="mr-1"><Box /></el-icon>
                            备货
                          </el-dropdown-item>
                          <el-dropdown-item v-if="canCancelPosting(order)" command="cancel">
                            <el-icon class="mr-1"><CloseBold /></el-icon>
                            取消货件
                          </el-dropdown-item>
                          <el-dropdown-item v-if="!canPreparePosting(order) && !canCancelPosting(order)" disabled>
                            暂无可用操作
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </td>
              </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- 分页组件 -->
        <div v-if="dataLoaded && orders.length > 0">
          <AppPagination
            v-model="pagination.page"
            :page-size="PAGINATION_PAGE_SIZE"
            :total="total"
            @change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 订单详情抽屉 -->
    <OrderDetailDrawer v-model:visible="showDrawer" :order="selectedOrder" />

    <AppDialog
      v-model="prepareDialogVisible"
      title="提交备货"
      subtitle="提交后货件将进入等待发运"
      confirm-text="确认备货"
      :confirm-loading="isSelectedOrderSubmitting('prepare')"
      @confirm="confirmPreparePosting"
    >
      <div class="order-action-dialog-body">
        <div class="order-action-row">
          <span>快件编号</span>
          <strong>{{ actionOrder?.postingNumber || '-' }}</strong>
        </div>
        <div class="order-action-note">提交前系统会重新获取 Ozon 最新状态，状态不符合时会阻止提交。</div>
      </div>
    </AppDialog>

    <AppDialog
      v-model="cancelDialogVisible"
      title="取消货件"
      subtitle="请选择 Ozon 返回的取消原因"
      confirm-text="确认取消"
      :loading="cancelReasonsLoading"
      loading-text="正在获取取消原因..."
      loading-variant="form"
      :confirm-disabled="!selectedCancelReasonId"
      :confirm-loading="isSelectedOrderSubmitting('cancel')"
      @confirm="confirmCancelPosting"
    >
      <div class="order-action-dialog-body">
        <div class="order-action-row">
          <span>快件编号</span>
          <strong>{{ actionOrder?.postingNumber || '-' }}</strong>
        </div>
        <el-form label-position="top" class="order-cancel-form">
          <el-form-item label="取消原因">
            <el-select
              v-model="selectedCancelReasonId"
              placeholder="请选择取消原因"
              filterable
              class="w-full"
            >
              <el-option
                v-for="reason in cancelReasons"
                :key="reason.id"
                :label="reason.name"
                :value="reason.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="cancelReasonMessage"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="可选"
            />
          </el-form-item>
        </el-form>
        <div v-if="!cancelReasons.length && !cancelReasonsLoading" class="order-action-note">
          未获取到取消原因，请先确认 Ozon 后台是否允许取消该货件。
        </div>
      </div>
    </AppDialog>

    <!-- 同步日志弹窗 -->
    <AppDetailDialog
      v-model="showSyncLogModal"
      title="订单更新记录"
      :data="syncLogList"
      :total="syncLogTotal"
      :current-page="syncLogPage"
      :page-size="syncLogPageSize"
      :fetching="syncLogLoading"
      @page-change="fetchSyncLogs"
    />
    <!-- 回到顶部按钮 -->
    <el-backtop :right="30" :bottom="80" :visibility-height="400">
      <div class="backtop-btn">
        <el-icon>
          <ArrowUp />
        </el-icon>
      </div>
    </el-backtop>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import MainLayout from '@/components/MainLayout.vue';
import OrderDetailDrawer from './components/OrderDetailDrawer.vue';
import { ArrowUp, Box, CloseBold, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { AppDialog, AppTabs, AppTableButton, AppUpdateButton, AppEmpty, AppImage, AppSkeletonLoader } from '@/components/ui';
import AppPagination from '@/components/ui/AppPagination.vue';
import AppDetailDialog from '@/components/ui/AppDetailDialog.vue';
import { ozonOrderAPI, type OzonCancelReason, type OzonOrder } from '@/api/ozonOrderAPI';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
import { useUpdateStore } from '@/store/updateStore';
import { useProductNameTranslations } from '@/composables/useProductNameTranslations';
import { buildOrderProductDisplay } from './orderProductDisplay.js';

const selectedStoreId = ref<number | null>(null);
const { loadStoreContext, storeContext } = useOzonStoreContext();
const { getTranslatedName, resolveNames } = useProductNameTranslations();
const currentStoreId = computed(() => storeContext.value?.resolvedStoreId ?? null);
const storeContextReady = ref(false);

// 全局更新状态管理
const updateStore = useUpdateStore();
const ORDER_MANAGEMENT_MODULE = 'order-management';

// 更新订单相关
const isUpdating = computed(() => updateStore.isUpdating(ORDER_MANAGEMENT_MODULE));
const lastUpdateTime = ref<string | Date | null>(null);
const updateStatus = ref<string>('');
const showSyncLogModal = ref(false);
const syncLogList = ref<any[]>([]);
const syncLogTotal = ref(0);
const syncLogPage = ref(1);
const syncLogPageSize = ref(6);
const syncLogLoading = ref(false);

// 监听同步日志弹窗打开事件（必须在变量声明之后）
watch(showSyncLogModal, async (newVal) => {
  if (newVal) {
    syncLogPage.value = 1;
    await fetchSyncLogs(1);
  }
});

// Tab 状态（使用 reactive 使其响应式）
const statusTabs = reactive([
  { value: 'all', label: '所有', count: 0, color: '#6366f1' },
  { value: 'awaiting_packaging', label: '等待备货', count: 0, color: '#3b82f6' },
  { value: 'awaiting_deliver', label: '等待发运', count: 0, color: '#f59e0b' },
  { value: 'delivering', label: '运输中', count: 0, color: '#10b981' },
  { value: 'dispute', label: '具争议', count: 0, color: '#dc2626' },
  { value: 'delivered', label: '已签收', count: 0, color: '#10b981' },
  { value: 'cancelled', label: '已取消', count: 0, color: '#6b7280' },
]);
const currentStatusFilter = ref('all');

// Tab切换监听
watch(currentStatusFilter, () => {
  pagination.page = 1;
  loadOrders();
});

// 搜索表单
const searchForm = reactive({
  keyword: '',
});

// 搜索
const handleSearch = () => {
  pagination.page = 1;
  loadOrders();
};

// 订单列表
const orders = ref<OzonOrder[]>([]);
const total = ref(0);
const loading = ref(false);
const dataLoaded = ref(false);  // 数据是否已加载完成（控制首次加载动画）
const loadingMore = ref(false); // 是否正在加载更多
const showLoadMore = ref(true); // 是否显示加载更多区域
const scrollSentinel = ref<HTMLElement | null>(null); // 滚动哨兵元素

// 常量
const INFINITE_SCROLL_LIMIT = 10; // 无限滚动最大行数
const PAGINATION_PAGE_SIZE = 20;  // 分页每页数量

// 分页
const pagination = reactive({
  page: 1,
  pageSize: PAGINATION_PAGE_SIZE,
});

// 抽屉
const showDrawer = ref(false);
const selectedOrder = ref<OzonOrder | null>(null);

type OrderAction = 'prepare' | 'cancel' | 'detail';

const prepareDialogVisible = ref(false);
const cancelDialogVisible = ref(false);
const actionOrder = ref<OzonOrder | null>(null);
const orderActionLoading = reactive<Record<string, OrderAction | undefined>>({});
const cancelReasons = ref<OzonCancelReason[]>([]);
const cancelReasonsLoading = ref(false);
const selectedCancelReasonId = ref<number | null>(null);
const cancelReasonMessage = ref('');

// Tab 颜色映射

// Tab 切换

const resetOrderState = () => {
  orders.value = [];
  total.value = 0;
  dataLoaded.value = true;
};

const syncSelectedStoreContext = () => {
  selectedStoreId.value = storeContext.value?.resolvedStoreId ?? null;
};

const loadSelectedStoreContext = async () => {
  try {
    const context = await loadStoreContext(true);
    syncSelectedStoreContext();
    if (context?.resolvedStoreId) {
      if (!isUpdating.value) {
        await loadOrders();
      }
    } else {
      resetOrderState();
    }
  } catch {
  } finally {
    storeContextReady.value = true;
  }
};

// 获取客户姓名

// 获取商品名称
const getProductNames = (order: OzonOrder): string => {
  const display = buildOrderProductDisplay(order, getTranslatedName);
  if (display.count === 0) return '-';
  return display.primaryName || '-';
};

const collectOrderProductNames = (items: OzonOrder[]) => {
  const names: string[] = [];
  for (const order of items) {
    const products = order.raw?.products || order.products || [];
    for (const product of products) {
      if (product?.name) names.push(product.name);
    }
  }
  return names;
};

// 获取商品总数

// 获取商品数量和SKU
const getProductQuantityAndSku = (order: OzonOrder): string => {
  const display = buildOrderProductDisplay(order, getTranslatedName);
  if (display.count === 0) return '-';
  return display.primaryLine || '-';
};

// 格式化订单价格（用于列表显示，取商品价格 CNY）
const formatOrderPrice = (order: OzonOrder): string => {
  const products = order.raw?.products || order.products || [];
  if (products.length === 0) return '-';
  
  // 取第一个商品的价格（商品定价货币，通常是 CNY）
  const price = Number(products[0].price || 0);
  const currency = products[0]?.currency_code || 'CNY';
  const symbol = currency === 'CNY' ? '￥' : currency === 'RUB' ? '₽' : '';
  return `${symbol}${price.toFixed(2)}`;
};

// 获取同步日志
const fetchSyncLogs = async (page: number = 1) => {
  if (!currentStoreId.value) return;
  syncLogLoading.value = true;
  try {
    const response = await ozonOrderAPI.getSyncLogs(currentStoreId.value, page, syncLogPageSize.value);
    if (response.success && response.data) {
      syncLogList.value = response.data.list;
      syncLogTotal.value = response.data.total;
      syncLogPage.value = response.data.page;
    }
  } catch {
  } finally {
    syncLogLoading.value = false;
  }
};

// 获取订单总价（从 financial_data.products 计算）

// 格式化价格

// 格式化日期时间
const formatDateTime = (val: any): string => {
  if (!val) return '-';
  try {
    const d = new Date(val);
    return d.toLocaleString('zh-CN');
  } catch {
    return String(val);
  }
};

// 状态标签类型
const getStatusTagType = (status: string): string => {
  const map: Record<string, string> = {
    'awaiting_packaging': 'warning',
    'awaiting_deliver': 'info',
    'delivering': 'primary',
    'delivered': 'success',
    'cancelled': 'danger',
    'dispute': 'warning',
  };
  return map[status] || 'info';
};

// 状态标签文本
const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    'awaiting_packaging': '等待备货',
    'awaiting_deliver': '等待发运',
    'delivering': '运输中',
    'delivered': '已签收',
    'cancelled': '已取消',
    'dispute': '纠纷',
    'arbitration': '纠纷',
    'client_arbitration': '纠纷',
    'driver_pickup': '运输中',
    'pending': '待处理',
    'processing': '处理中',
  };
  return map[status] || status;
};

const canPreparePosting = (order: OzonOrder) => order.status === 'awaiting_packaging';

const canCancelPosting = (order: OzonOrder) => !['delivered', 'cancelled'].includes(order.status);

const getOrderActionKey = (order: OzonOrder) => order.postingNumber;

const isOrderBusy = (order: OzonOrder) => Boolean(orderActionLoading[getOrderActionKey(order)]);

const isSelectedOrderSubmitting = (action: OrderAction) => {
  return Boolean(actionOrder.value && orderActionLoading[actionOrder.value.postingNumber] === action);
};

const setOrderActionLoading = (order: OzonOrder, action: OrderAction) => {
  orderActionLoading[getOrderActionKey(order)] = action;
};

const clearOrderActionLoading = (order: OzonOrder) => {
  delete orderActionLoading[getOrderActionKey(order)];
};

const getErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const refreshAfterOrderAction = async (updatedOrder?: OzonOrder) => {
  if (updatedOrder?.postingNumber) {
    const index = orders.value.findIndex(order => order.postingNumber === updatedOrder.postingNumber);
    if (index >= 0) {
      orders.value.splice(index, 1, updatedOrder);
      void resolveNames(collectOrderProductNames(orders.value));
    }
  }
  await loadOrders();
};

const openPrepareDialog = (order: OzonOrder) => {
  actionOrder.value = order;
  prepareDialogVisible.value = true;
};

const handleOrderMoreCommand = (command: OrderAction, order: OzonOrder) => {
  if (command === 'prepare') {
    openPrepareDialog(order);
    return;
  }

  if (command === 'cancel') {
    void openCancelDialog(order);
  }
};

const confirmPreparePosting = async () => {
  if (!currentStoreId.value || !actionOrder.value) {
    ElMessage.warning('请先选择订单');
    return;
  }

  const order = actionOrder.value;
  setOrderActionLoading(order, 'prepare');
  try {
    const response = await ozonOrderAPI.preparePosting(currentStoreId.value, order.postingNumber);
    if (response.success) {
      ElMessage.success(response.message || '备货提交成功');
      prepareDialogVisible.value = false;
      actionOrder.value = null;
      await refreshAfterOrderAction(response.data);
    } else {
      ElMessage.error(response.message || '备货提交失败');
    }
  } catch (error: any) {
    ElMessage.error(getErrorMessage(error, '备货提交失败'));
  } finally {
    clearOrderActionLoading(order);
  }
};

const openCancelDialog = async (order: OzonOrder) => {
  if (!currentStoreId.value) {
    ElMessage.warning('请先在顶部选择当前操作店铺');
    return;
  }

  actionOrder.value = order;
  selectedCancelReasonId.value = null;
  cancelReasonMessage.value = '';
  cancelReasons.value = [];
  cancelDialogVisible.value = true;
  cancelReasonsLoading.value = true;

  try {
    const response = await ozonOrderAPI.getCancelReasons(currentStoreId.value, order.postingNumber);
    if (response.success && response.data) {
      cancelReasons.value = response.data;
    } else {
      ElMessage.error(response.message || '获取取消原因失败');
    }
  } catch (error: any) {
    ElMessage.error(getErrorMessage(error, '获取取消原因失败'));
  } finally {
    cancelReasonsLoading.value = false;
  }
};

const confirmCancelPosting = async () => {
  if (!currentStoreId.value || !actionOrder.value) {
    ElMessage.warning('请先选择订单');
    return;
  }

  if (!selectedCancelReasonId.value) {
    ElMessage.warning('请选择取消原因');
    return;
  }

  const order = actionOrder.value;
  setOrderActionLoading(order, 'cancel');
  try {
    const response = await ozonOrderAPI.cancelPosting(currentStoreId.value, order.postingNumber, {
      cancelReasonId: selectedCancelReasonId.value,
      cancelReasonMessage: cancelReasonMessage.value.trim() || undefined,
    });
    if (response.success) {
      ElMessage.success(response.message || '取消货件提交成功');
      cancelDialogVisible.value = false;
      actionOrder.value = null;
      await refreshAfterOrderAction(response.data);
    } else {
      ElMessage.error(response.message || '取消货件失败');
    }
  } catch (error: any) {
    ElMessage.error(getErrorMessage(error, '取消货件失败'));
  } finally {
    clearOrderActionLoading(order);
  }
};

const getFirstProductImage = (order: OzonOrder): string | undefined => {
  const display = buildOrderProductDisplay(order, getTranslatedName);
  return display.primaryImage || undefined;
};


// 加载订单列表
const loadOrders = async (isLoadMore = false) => {
  if (!currentStoreId.value) {
    return;
  }
  if (!isLoadMore) {
    loading.value = true;
    dataLoaded.value = false;
  } else {
    loadingMore.value = true;
  }
  try {
    const status = currentStatusFilter.value === 'all' ? undefined : currentStatusFilter.value;
    const response = await ozonOrderAPI.getOrders(currentStoreId.value, {
      keyword: searchForm.keyword || undefined,
      status: status,
      limit: pagination.pageSize,
      offset: (pagination.page - 1) * pagination.pageSize,
    });
    if (response.success && response.data) {
      if (isLoadMore) {
        // 追加模式
        orders.value = [...orders.value, ...(response.data.orders || [])];
      } else {
        orders.value = response.data.orders || [];
      }
      void resolveNames(collectOrderProductNames(orders.value));
      total.value = response.data.total || 0;
      
      // 更新 Tab 统计（后端返回 counts 字段）
      if (response.data.counts) {
        const c = response.data.counts;
        statusTabs[0].count = c.all || 0;                                    // 所有
        statusTabs[1].count = c.awaiting_packaging || 0;                     // 等待备货
        statusTabs[2].count = c.awaiting_deliver || 0;                       // 等待发运
        statusTabs[3].count = (c.delivering || 0) + (c.driver_pickup || 0);   // 运输中（合并）
        statusTabs[4].count = (c.arbitration || 0) + (c.client_arbitration || 0); // 具争议（合并）
        statusTabs[5].count = c.delivered || 0;                              // 已签收
        statusTabs[6].count = c.cancelled || 0;                              // 已取消
      }
      
      // 检查是否超过无限滚动限制
      if (orders.value.length >= INFINITE_SCROLL_LIMIT) {
        showLoadMore.value = false;
      }
    } else {
      if (!isLoadMore) {
        orders.value = [];
        total.value = 0;
      }
    }
  } catch {
    if (!isLoadMore) {
      orders.value = [];
      total.value = 0;
    }
  } finally {
    loading.value = false;
    loadingMore.value = false;
    dataLoaded.value = true;
  }
};

const normalizeSyncLogStatus = (status: unknown): 'idle' | 'success' | 'error' => {
  const value = String(status || '').trim().toLowerCase();
  if (!value) return 'idle';
  if (['success', 'succeeded', 'ok', 'SUCCESS'.toLowerCase(), '更新成功', '成功'].includes(value)) {
    return 'success';
  }
  if (['failed', 'fail', 'error', 'FAILED'.toLowerCase(), '更新失败', '失败'].includes(value)) {
    return 'error';
  }
  return 'error';
};

// 获取最新更新时间和状态（完全依赖同步日志）
const fetchLastUpdateTime = async (): Promise<{ lastUpdateTime: string | Date; status: 'idle' | 'success' | 'error' }> => {
  if (!currentStoreId.value) {
    return { lastUpdateTime: '', status: 'idle' };
  }
  try {
    // 获取最后一条同步日志
    const logResponse = await ozonOrderAPI.getSyncLogs(currentStoreId.value, 1, 1);
    if (logResponse.success && logResponse.data && logResponse.data.list.length > 0) {
      const lastLog = logResponse.data.list[0];
      return {
        lastUpdateTime: lastLog.createdAt || '',
        status: normalizeSyncLogStatus(lastLog.status)
      };
    }
    
    // 无日志记录
    return {
      lastUpdateTime: '',
      status: 'idle'
    };
  } catch {
    return {
      lastUpdateTime: '',
      status: 'idle'
    };
  }
};

// 更新按钮点击处理
const handleUpdateClick = (_clickTime: Date) => {
  handleUpdateOrders();
};

// 详情按钮点击处理（打开同步日志弹窗）
const handleDetailClick = (_clickTime: Date) => {
  showSyncLogModal.value = true;
};

// 更新订单
const handleUpdateOrders = async () => {
  if (!currentStoreId.value) {
    ElMessage.warning('请先在顶部选择当前操作店铺');
    return;
  }
  // 使用全局状态管理更新状态
  updateStore.startUpdate(ORDER_MANAGEMENT_MODULE, {
    scope: 'global',
    statusText: '正在更新',
    progress: 0,
  });
  const progressTimer = setInterval(() => {
    const meta = updateStore.getModuleMeta(ORDER_MANAGEMENT_MODULE);
    if (meta.progress < 90) {
      const next = Math.min(90, meta.progress + 12);
      updateStore.setUpdateProgress(ORDER_MANAGEMENT_MODULE, next);
    }
  }, 600);
  try {
    const response = await ozonOrderAPI.syncOrders(currentStoreId.value);
    clearInterval(progressTimer);
    updateStore.setUpdateProgress(ORDER_MANAGEMENT_MODULE, 100);
    if (response.success) {
      ElMessage.success('订单更新成功');
      // 更新最后更新时间
      lastUpdateTime.value = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      ElMessage.error('订单更新失败');
    }
  } catch (error) {
    clearInterval(progressTimer);
    ElMessage.error('更新订单失败');
  } finally {
    updateStore.stopUpdate(ORDER_MANAGEMENT_MODULE);
  }
};

// 分页大小改变

// 页码改变
const handlePageChange = (page: number) => {
  pagination.page = page;
  loadOrders();
};

// 显示订单详情
const showOrderDetail = async (order: OzonOrder) => {
  if (!currentStoreId.value) {
    ElMessage.warning('请先在顶部选择当前操作店铺');
    return;
  }

  setOrderActionLoading(order, 'detail');
  try {
    const response = await ozonOrderAPI.getOrderDetail(currentStoreId.value, order.postingNumber);
    if (response.success && response.data) {
      selectedOrder.value = response.data;
      showDrawer.value = true;
    } else {
      ElMessage.error(response.message || '获取订单详情失败');
    }
  } catch (error: any) {
    ElMessage.error(getErrorMessage(error, '获取订单详情失败'));
  } finally {
    clearOrderActionLoading(order);
  }
};

// 无限滚动：使用 IntersectionObserver 监听哨兵元素
const setupScrollObserver = () => {
  if (!scrollSentinel.value) return;
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // 哨兵进入视口且满足条件时触发
        if (entry.isIntersecting && showLoadMore.value && !loadingMore.value && !loading.value && dataLoaded.value) {
          loadNextPage();
        }
      });
    },
    {
      rootMargin: '200px', // 提前 200px 触发
      threshold: 0,
    }
  );
  
  observer.observe(scrollSentinel.value);
};

// 加载下一页
const loadNextPage = async () => {
  if (loadingMore.value || loading.value) return;
  pagination.page++;
  await loadOrders(true);
};

// 监听数据变化，设置滚动观察器
watch([showLoadMore, () => orders.value.length, dataLoaded], () => {
  if (dataLoaded.value && orders.value.length > 0 && showLoadMore.value) {
    nextTick().then(setupScrollObserver);
  }
});

watch(
  () => storeContext.value?.resolvedStoreId ?? null,
  async (nextStoreId, prevStoreId) => {
    syncSelectedStoreContext();
    if (!storeContextReady.value || nextStoreId === prevStoreId) {
      return;
    }

    pagination.page = 1;
    if (nextStoreId) {
      if (!isUpdating.value) {
        await loadOrders();
      }
    } else {
      resetOrderState();
    }
  }
);

watch(isUpdating, async (updating, wasUpdating) => {
  if (!wasUpdating || updating || !currentStoreId.value) {
    return;
  }

  pagination.page = 1;
  await loadOrders();
});

// 初始化时加载
onMounted(() => {
  void loadSelectedStoreContext();
  // 初始化最后更新时间（可以从API获取）
  const now = new Date();
  lastUpdateTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
});
</script>

<style scoped>
/* 表格表头 */
.order-table {
  min-width: 1040px;
}

.app-table-th {
  padding: 12px 14px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.025em;
  border-bottom: 1px solid #f1f5f9;
  background-color: #f8fafc;
}

.app-table-th.center {
  text-align: center;
}

.app-table-th.right {
  text-align: right;
}

/* 表格单元格 */
.app-table-td {
  padding: 11px 14px;
  text-align: left;
  font-size: 12px;
  font-weight: 400;
  color: #2b3747;
  border-bottom: 1px solid #f1f5f9;
}

/* 商品信息容器 */
.product-info-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-info-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.product-info-item {
  font-size: 13px;
  color: #2b3747;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 256px;
  cursor: default;
}

.order-product-count-tag {
  flex-shrink: 0;
  min-width: 44px;
  cursor: default;
}

.app-table-td.center {
  text-align: center;
}

.app-table-td.right {
  text-align: right;
}

.order-product-image,
.order-image-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  vertical-align: middle;
}

.order-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #94a3b8;
}

.order-image-placeholder .el-icon {
  font-size: 18px;
}

.order-table-skeleton {
  min-height: 260px;
  padding: 6px 0;
}

.order-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  white-space: nowrap;
}

.order-action-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 360px;
}

.order-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  font-size: 13px;
  color: #64748b;
}

.order-action-row strong {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.order-action-note {
  line-height: 1.6;
  font-size: 12px;
  color: #64748b;
}

.order-cancel-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-cancel-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.order-cancel-form :deep(.el-form-item__label) {
  padding-bottom: 6px;
  line-height: 1.3;
  font-size: 12px;
  color: #475569;
}

.order-product-popover-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 0;
}

.order-product-popover-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.order-product-popover-image {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.order-product-popover-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-product-popover-sku {
  font-size: 13px;
  color: #1e293b;
  line-height: 1.35;
  word-break: break-word;
}

.order-product-popover-name {
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
  white-space: normal;
  word-break: break-word;
}

/* 加载更多区域 */
.load-more-sentinel {
  padding: 16px;
  text-align: center;
}

.load-more-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
}

.load-more-dots {
  display: inline-flex;
  gap: 6px;
}

.load-more-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #94a3b8;
  animation: loadMoreDot 1s infinite ease-in-out both;
}

.load-more-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.load-more-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes loadMoreDot {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.load-more-text {
  font-size: 13px;
  color: #94a3b8;
}

.load-more-hint {
  font-size: 13px;
  color: #cbd5e1;
  padding: 10px 0;
}

/* ===== BackTop 样式 ===== */
.backtop-btn {
  width: 40px;
  height: 40px;
  background: #6366f1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  transition: all 0.3s ease;
}

.backtop-btn:hover {
  background: #4f46e5;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
}
</style>

<style>
.more-btn-wrapper {
  display: inline-flex;
  cursor: pointer;
}

.order-product-popover {
  max-width: 380px;
}

.product-more-dropdown .el-dropdown-menu {
  background-color: #000000 !important;
  border: 1px solid #333333 !important;
  border-radius: 8px !important;
  padding: 4px 0 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
}

.product-more-dropdown .el-dropdown-menu__item {
  color: #e5e7eb !important;
}

.product-more-dropdown .el-dropdown-menu__item:hover,
.product-more-dropdown .el-dropdown-menu__item:focus,
.product-more-dropdown .el-dropdown-menu__item:focus-visible,
.product-more-dropdown .el-dropdown-menu__item.is-focused {
  background-color: #1f2937 !important;
  color: #ffffff !important;
  outline: none !important;
}

.product-more-dropdown .el-dropdown-menu__item .el-icon {
  color: #9ca3af;
  margin-right: 6px;
}

.product-more-dropdown .el-dropdown-menu__item:hover .el-icon,
.product-more-dropdown .el-dropdown-menu__item:focus .el-icon,
.product-more-dropdown .el-dropdown-menu__item:focus-visible .el-icon,
.product-more-dropdown .el-dropdown-menu__item.is-focused .el-icon {
  color: #60a5fa;
}

.product-more-dropdown .el-popper__arrow::before {
  background-color: #000000 !important;
  border-color: #333333 !important;
}
</style>
