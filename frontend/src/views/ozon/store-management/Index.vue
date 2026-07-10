<template>
  <MainLayout>
    <div class="app-page store-management-page">
      <div class="store-management-panel">
        <!-- 搜索参数 + 店铺列表 -->
        <div class="store-management-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <!-- 搜索参数 -->
          <div class="px-6 h-[100px] flex items-center">
            <div class="flex flex-col md:flex-row gap-4 items-center w-full">
              <div class="search-container">
                <el-input
                v-model="searchKeyword"
                placeholder="搜索店铺..."
                clearable
                class="input-search"
                @keyup.enter="searchStores"
              />
                <el-button type="primary" class="btn-search" @click="searchStores">
                  <el-icon class="mr-1"><Search /></el-icon>
                  搜索
                </el-button>
              </div>
              <div class="flex-1"></div>
              <el-button type="primary" class="btn-create" @click="showAddDialog = true">
                <el-icon class="mr-1"><Plus /></el-icon>
                添加店铺
              </el-button>
            </div>
          </div>
          <!-- 店铺列表 -->
          <AppTable :columns="columns" :data="paginatedStores" :loading="loading" :empty-text="'暂无Ozon店铺'">
            <template #cell-name="{ row }">
              <span>{{ row.name }}</span>
            </template>
            <template #cell-clientId="{ row }">
              <span>{{ row.clientId }}</span>
            </template>
            <template #cell-country="{ row }">
              <span>{{ getCountryName(row.country) }}</span>
            </template>
            <template #cell-currency="{ row }">
              <span>{{ row.currency || 'CNY' }}</span>
            </template>
            <template #cell-productCount="{ row }">
              <span>{{ row.productCount || 0 }}</span>
            </template>
            <template #cell-memberLevel="{ row }">
              <span :class="[
                'app-table-tag',
                row.isPremium ? 'app-table-tag--purple' : 'app-table-tag--info',
              ]">
                {{ row.isPremium ? '高级会员' : '普通会员' }}
              </span>
            </template>
            <template #cell-status="{ row }">
              <span :class="[
                'app-table-tag',
                row.status === 'active'
                  ? 'app-table-tag--success'
                  : 'app-table-tag--warning',
              ]">
                {{ row.status === 'active' ? '正常' : '暂停' }}
              </span>
            </template>
            <template #cell-action="{ row }">
              <div class="flex items-center flex-wrap gap-2">
                <AppTableButton name="detail" @click="handleDetail(row)" />
                <el-tooltip placement="bottom" effect="dark">
                  <template #content>
                    <div class="update-tooltip-content">
                      <div class="tooltip-row">
                        <span class="tooltip-label">最近更新时间：</span>
                        <span class="tooltip-status">{{ formatSyncTime(row.lastSyncAt) || '暂无更新' }}</span>
                      </div>
                    </div>
                  </template>
                  <AppTableButton
                    name="update"
                    :loading="updatingStoreId === row.id"
                    :disabled="updatingStoreId === row.id"
                    tooltip-disabled
                    @click="updateStore(row)"
                  />
                </el-tooltip>
                <AppTableButton name="delete" delete-confirm-text="确定要删除该店铺吗？" @click="deleteStore(row)" />
              </div>
            </template>
          </AppTable>
          <AppPagination
            :model-value="currentPage"
            :total="filteredStores.length"
            :page-size="pageSize"
            @change="handlePageChange"
          />
        </div>
      </div>
    </div>
    <!-- 添加店铺对话-->
    <div v-if="showAddDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-8">
        <div class="app-surface-header mb-8">
          <div class="app-surface-icon">
            <el-icon class="text-blue-600 text-2xl">
              <Shop />
            </el-icon>
          </div>
          <div class="app-surface-title-wrapper">
            <h3 class="app-surface-title">添加Ozon店铺</h3>
            <p class="app-surface-subtitle">请填写店铺API信息</p>
          </div>
        </div>
        <form @submit.prevent="handleAddStore" class="px-4">
          <div class="form-item-wrapper">
            <div class="flex items-center gap-2 mb-1.5">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">API地址</label><el-input
                v-model="addStoreForm.apiUrl" placeholder="请输入API地址" size="default" clearable class="flex-1"><template
                  #prefix><el-icon>
                    <Link />
                  </el-icon></template></el-input>
            </div>
            <div class="error-message-container ml-23">
              <p v-if="errors.apiUrl" class="text-xs text-red-500">
                {{ errors.apiUrl }}
              </p>
            </div>
          </div>
          <div class="form-item-wrapper">
            <div class="flex items-center gap-2 mb-1.5">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">Client-Id</label><el-input
                v-model="addStoreForm.clientId" placeholder="请输入Client-Id" size="default" clearable
                class="flex-1"><template #prefix><el-icon><svg xmlns="http://www.w3.org/2000/svg" fill="none"
                      viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg></el-icon></template></el-input>
            </div>
            <div class="error-message-container ml-23">
              <p v-if="errors.clientId" class="text-xs text-red-500">
                {{ errors.clientId }}
              </p>
            </div>
          </div>
          <div class="form-item-wrapper">
            <div class="flex items-center gap-2 mb-1.5">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">API-Key</label><el-input
                v-model="addStoreForm.apiKey" type="password" placeholder="请输入API-Key" size="default" show-password
                clearable class="flex-1"><template #prefix><el-icon>
                    <Lock />
                  </el-icon></template></el-input>
            </div>
            <div class="error-message-container ml-23">
              <p v-if="errors.apiKey" class="text-xs text-red-500">
                {{ errors.apiKey }}
              </p>
            </div>
          </div>
          <div class="button-group pt-3 flex justify-end gap-3">
            <el-button type="default" class="btn-cancel" :disabled="adding" @click="handleCloseAddDialog">
              取消
            </el-button>
            <el-button type="primary" class="btn-confirm" :disabled="adding" @click="handleAddStore">
              {{ adding ? '添加..' : '添加' }}
            </el-button>
          </div>
        </form>
      </div>
    </div>
    <!-- 查看店铺详情抽屉 -->
    <div class="store-drawer-scope">
      <StoreDetailDrawer
        v-model:visible="showViewDialog"
        :storeData="viewingStore"
      />
    </div>
  </MainLayout>
</template>
<script lang="ts">
// 模块级状态：跨页面导航不丢失（组件卸载后仍保持更新状态）
import { ref as moduleRef } from 'vue';
const updatingStoreId = moduleRef<number | null>(null);
</script>
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Link, Lock, Plus, Search, Shop } from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
import AppPagination from '@/components/ui/AppPagination.vue';
import { AppTableButton, AppTable } from '@/components/ui';
import StoreDetailDrawer from './components/StoreDetailDrawer.vue';
import { ozonStoreAPI } from '@/api/ozonStoreAPI';
import { ozonProductAPI } from '@/api/ozonProductAPI';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
import type { OzonStore } from '@/types';
// 表格列配置
const columns = [
  { key: 'name', label: '店铺', align: 'left' as const },
  { key: 'clientId', label: '店铺ID', align: 'left' as const },
  { key: 'country', label: '国家', align: 'left' as const },
  { key: 'currency', label: '货币', align: 'left' as const },
  { key: 'productCount', label: '在售商品', align: 'left' as const },
  { key: 'memberLevel', label: '会员类型', align: 'left' as const },
  { key: 'status', label: '店铺状态', align: 'left' as const },
  { key: 'action', label: '操作', align: 'left' as const },
];
// 搜索参数
const searchKeyword = ref('');
// 分页
const currentPage = ref(1);
const pageSize = ref(10);
// 分页后的店铺列表
const paginatedStores = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredStores.value.slice(start, end);
});
// 页面变化
const handlePageChange = (page: number) => {
  currentPage.value = page;
};
// 页面大小变化
// 加载状态
const loading = ref(false);
// 对话框状
const showViewDialog = ref(false);
const showAddDialog = ref(false);
// 保存状
const adding = ref(false);
const { applyStoreContext, loadStoreContext } = useOzonStoreContext();
// updatingStoreId 已在模块级 <script> 中定义，跨页面保持状态
// 查看的店铺 ̄̈
const viewingStore = ref<OzonStore | null>(null);
// 总评分（计算属性）
// 添加店铺表单数据
const addStoreForm = reactive({
  apiUrl: 'https://api-seller.ozon.ru/v1/seller/info',
  clientId: '',
  apiKey: '',
});
// 错误信息
const errors = reactive({
  apiUrl: '',
  clientId: '',
  apiKey: '',
});
// 店铺数据
const stores = ref<OzonStore[]>([]);
// 过滤后的店铺列表
const filteredStores = computed(() => {
  return stores.value.filter(store =>
    store.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    store.storeId.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    (store.legalName?.toLowerCase().includes(searchKeyword.value.toLowerCase()) ?? false)
  );
});
// 加载店铺列表
const loadStores = async () => {
  loading.value = true;
  try {
    const storeResponse = await ozonStoreAPI.getStores();

    if (storeResponse.success && storeResponse.data) {
      stores.value = storeResponse.data;
      const currentStore = storeResponse.data.find(store => store.isCurrent) || null;

      if (currentStore) {
        applyStoreContext({
          currentOzonStoreId: currentStore.id,
          resolvedStoreId: currentStore.id,
          store: currentStore,
        });
      } else {
        await loadStoreContext(true);
      }
    } else {
      ElMessage.error(storeResponse.message || '获取店铺列表失败');
    }
  } catch (error) {
    ElMessage.error('请求失败，请重试');
  } finally {
    loading.value = false;
  }
};
// 搜索店铺
const searchStores = () => {
  currentPage.value = 1; // 搜索时重置到第一
};
// 查看店铺
const viewStore = (store: OzonStore) => {
  // 直接设置数据和显示抽屉
  viewingStore.value = store;
  showViewDialog.value = true;
};
// 编辑店铺
// 查看详情
const handleDetail = (store: OzonStore) => {
  viewStore(store);
};
// 更新店铺
const UPDATE_TIMEOUT = 120000; // 2分钟安全超时
const updateStore = async (store: OzonStore) => {
  // 防止重复点击（页面切回后按钮仍禁用，但防止意外调用）
  if (updatingStoreId.value === store.id) return;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    updatingStoreId.value = store.id;
    // 安全超时：防止请求挂起导致按钮永远无法恢复
    timeoutId = setTimeout(() => {
      if (updatingStoreId.value === store.id) {
        updatingStoreId.value = null;
        ElMessage.warning('更新超时，请重试');
      }
    }, UPDATE_TIMEOUT);
    const response = await ozonStoreAPI.updateStore(store.id, {
      apiUrl: store.apiUrl,
      clientId: store.clientId,
      apiKey: store.apiKey,
    });
    if (response.success) {
      await ozonProductAPI.syncProducts(store.id);
      ElMessage.success('更新成功');
      await loadStores();
    } else {
      ElMessage.error(response.message || '更新失败');
    }
  } catch (error) {
    ElMessage.error('请求失败，请重试');
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    updatingStoreId.value = null;
  }
};
// 确认删除店铺
// 删除店铺
const deleteStore = async (store: OzonStore) => {
  try {
    const response = await ozonStoreAPI.deleteStore(store.id);
    if (response.success) {
      ElMessage.success('删除成功');
      await loadStores();
    } else {
      ElMessage.error(response.message || '删除失败');
    }
  } catch (error) {
    ElMessage.error('请求失败，请重试');
  }
};

// 关闭查看对话
// 格式化日期（只显示年月日
// 格式化日期时间（显示年月日时分秒
// 计算评分值（0-100的百分比转换为十分制
// 获取评分 tooltip 内容
// 切换评分详情显示
// 俄语指标名称翻译为中
// 切换原始数据显示
// 文本a
// 国家代码转名
const getCountryName = (code: string | null | undefined): string => {
  const countryMap: Record<string, string> = {
    'CHN': '中国',
    'RUS': '俄罗',
    'USA': '美国',
    'GBR': '英国',
    'DEU': '德国',
    'FRA': '法国',
    'JPN': '日本',
    'KOR': '韩国',
    'IND': '印度',
    'BRA': '巴西',
  };
  return countryMap[code || ''] || code || '-';
};

// 格式化同步时间
const formatSyncTime = (time: string | null): string => {
  if (!time) return '';
  const d = new Date(time);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}`;
};

// 更新按钮 tooltip
// 清除错误信息
const clearErrors = () => {
  errors.apiUrl = '';
  errors.clientId = '';
  errors.apiKey = '';
};
// 验证表单
const validateForm = () => {
  clearErrors();
  let isValid = true;
  if (!addStoreForm.apiUrl.trim()) {
    errors.apiUrl = '请输入API地址';
    isValid = false;
  }
  if (!addStoreForm.clientId.trim()) {
    errors.clientId = '请输入Client-Id';
    isValid = false;
  }
  if (!addStoreForm.apiKey.trim()) {
    errors.apiKey = '请输入API-Key';
    isValid = false;
  }
  return isValid;
};
// 处理添加店铺
const handleAddStore = async () => {
  if (!validateForm()) {
    return;
  }
  try {
    // 检查是否已存在相同的店
    const duplicate = stores.value.some(store =>
      store.clientId === addStoreForm.clientId ||
      store.apiUrl === addStoreForm.apiUrl
    );
    if (duplicate) {
      ElMessage.error('该店铺信息已存在');
      return;
    }
    adding.value = true;
    // 测试连接
    const testResponse = await ozonStoreAPI.testConnection(addStoreForm);
    if (!testResponse.success) {
      ElMessage.error(testResponse.message || '连接Ozon平台失败');
      adding.value = false;
      return;
    }
    // 连接成功，创建店
    const createResponse = await ozonStoreAPI.createStore(addStoreForm);
    if (createResponse.success) {
      ElMessage.success('添加店铺成功');
      showAddDialog.value = false;
      addStoreForm.apiUrl = 'https://api-seller.ozon.ru/v1/seller/info';
      addStoreForm.clientId = '';
      addStoreForm.apiKey = '';
      clearErrors();
      await loadStores();
    } else {
      ElMessage.error(createResponse.message || '添加店铺失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '请求失败');
  } finally {
    adding.value = false;
  }
};
// 关闭添加对话
const handleCloseAddDialog = () => {
  showAddDialog.value = false;
  addStoreForm.apiUrl = 'https://api-seller.ozon.ru/v1/seller/info';
  addStoreForm.clientId = '';
  addStoreForm.apiKey = '';
  clearErrors();
};
// 页面加载时获取数
onMounted(() => {
  loadStores();
});
</script>
<style scoped>
.store-management-page {
  display: flex;
}

.store-management-panel,
.store-management-card {
  width: 100%;
  min-height: var(--app-page-min-height);
  box-sizing: border-box;
}

.store-management-card {
  display: flex;
  flex-direction: column;
}

.store-management-card :deep(.app-table-wrapper),
.store-management-card :deep(.app-table-container) {
  flex: 1;
}

/* 表单样式 */
.form-item-wrapper {
  margin-bottom: 8px;
}

/* 文字和文本框左对*/
.ml-23 {
  margin-left: 88px;
  /* w-20 (80px) + gap-2 (8px) = 88px */
}

/* 错 ̄ ̄提öo定高o12ֹ11a增*/
.error-message-container {
  height: 14px;
  /* o定高o13够1o3̧行文字 */
  display: flex;
  align-items: center;
  padding-top: 2px;
}

/* 确保按钮右对*/
.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Tooltip 样式 */
.update-tooltip-content {
  min-width: 180px;
  font-size: 12px;
  line-height: 1.6;
  padding: 4px 0;
}

.tooltip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.tooltip-label {
  color: #9ca3af;
}

.tooltip-status {
  color: #ffffff;
  font-weight: 500;
}

.tooltip-title {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 6px;
}

.tooltip-value {
  color: #ffffff;
  font-weight: 500;
}

</style>
