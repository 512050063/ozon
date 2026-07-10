<template>
  <MainLayout>
    <div class="app-page app-page-stack auto-reply-page">
      <!-- 统计模块（全部、店铺、商品、禁用） -->
      <StatCardGrid :items="stats" />

      <!-- 搜索和表格合并 -->
      <div class="app-page-card auto-reply-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <!-- 搜索栏 -->
        <div class="auto-reply-search h-[100px] p-6 border-b border-slate-100 flex items-center">
          <div class="flex flex-col md:flex-row gap-4 items-center w-full">
            <div class="flex-1 w-full">
              <div class="search-container">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索关键词"
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
            <el-button type="primary" class="btn-create" @click="openAdd">
              <el-icon class="mr-1"><Plus /></el-icon>
              添加关键词
            </el-button>
          </div>
        </div>

        <!-- 表格 -->
          <AppTable :columns="columns" :data="rules" :loading="loading" :empty-text="'暂无关键词规则，点击右上角添加关键词创建'">
            <template #cell-type="{ row }">
              <span
                :class="[
                  'app-table-tag',
                  row.type === 'store'
                    ? 'app-table-tag--blue'
                    : 'app-table-tag--purple'
                ]"
              >
                {{ row.type === 'store' ? '店铺' : '商品' }}
              </span>
            </template>
            <template #cell-keyword="{ row }">
              <span class="app-table-tag app-table-tag--info max-w-[150px] truncate" :title="row.keyword">
                {{ row.keyword }}
              </span>
            </template>
            <template #cell-replyContent="{ row }">
              <span class="max-w-[200px] truncate" :title="row.replyContent">{{ row.replyContent }}</span>
            </template>
            <template #cell-productSelection="{ row }">
              <img
                v-if="row.type === 'product' && row.productSelection && row.productSelection.imageUrl"
                :src="row.productSelection.imageUrl"
                class="w-6 h-6 rounded object-cover"
                :alt="row.productSelection.name"
                :title="row.productSelection.name"
              />
              <span v-else>-</span>
            </template>
            <template #cell-enabled="{ row }">
              <span
                :class="[
                  'app-table-tag app-table-tag--clickable',
                  row.enabled
                    ? 'app-table-tag--success'
                    : 'app-table-tag--warning'
                ]"
                @click="toggleEnabled(row)"
              >
                {{ row.enabled ? '启用' : '禁用' }}
              </span>
            </template>
            <template #cell-action="{ row }">
              <div class="flex items-center space-x-2">
                <AppTableButton name="edit" @click="handleEdit(row)" />
                <AppTableButton name="delete" delete-confirm-text="确定要删除该规则吗？" @click="handleDelete(row.id)" />
              </div>
            </template>
          </AppTable>
        
        <!-- 分页 -->
        <AppPagination
          v-model="currentPage"
          :total="total"
          :page-size="pageSize"
          @change="handlePageChange"
        />
      </div>

      <!-- 添加/编辑对话框 -->
      <KeywordDialog
        v-model:visible="dialogVisible"
        v-model:form-data="currentForm"
        :is-edit="isEdit"
        :saving="saving"
        :icon="DocumentCopy"
        @save="handleSave"
      />
    </div>
  </MainLayout>
</template>

<style scoped>
.auto-reply-page {
  height: var(--app-page-min-height);
  min-height: 0;
  overflow: visible;
  gap: 0;
}

.auto-reply-card {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.auto-reply-search {
  flex-shrink: 0;
}

.auto-reply-page :deep(.stat-card-grid) {
  flex-shrink: 0;
}

.auto-reply-card :deep(.app-table-wrapper),
.auto-reply-card :deep(.app-table-container) {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.auto-reply-card :deep(.app-table-scroll) {
  min-height: 0;
  overflow-x: auto;
  overflow-y: visible;
}

.auto-reply-card :deep(.app-pagination) {
  flex-shrink: 0;
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Files, Box, Shop, Sunset, DocumentCopy, Plus, Search } from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
import { AppTableButton, AppTable, AppPagination, StatCardGrid } from '@/components/ui';
import KeywordDialog from './components/KeywordDialog.vue';
import { autoReplyAPI, type AutoReplyRule } from '@/api/autoReplyAPI';

// 表格列配置
const columns = [
  { key: 'type', label: '类型', align: 'left' as const },
  { key: 'keyword', label: '关键词', align: 'left' as const },
  { key: 'replyContent', label: '回复内容', align: 'left' as const },
  { key: 'productSelection', label: '关联商品', align: 'left' as const },
  { key: 'enabled', label: '状态', align: 'left' as const },
  { key: 'action', label: '操作', align: 'left' as const },
];

// 数据状态
const allRules = ref<AutoReplyRule[]>([]);
const loading = ref(false);
const saving = ref(false);

// 搜索状态
const searchKeyword = ref('');

// 分页状态
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

// 统计数据（全部、店铺、商品、禁用/启用）
const rules = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return allRules.value.slice(start, start + pageSize.value);
});
const storeCount = computed(() => allRules.value.filter(r => r.type === 'store').length);
const productCount = computed(() => allRules.value.filter(r => r.type === 'product').length);
const disabledCount = computed(() => allRules.value.filter(r => !r.enabled).length);
const enabledCount = computed(() => allRules.value.filter(r => r.enabled).length);

// 统计卡片配置
const stats = computed(() => [
  { label: '全部', value: total.value, type: 'total' as const, icon: Files },
  { label: '店铺', value: storeCount.value, type: 'pending' as const, icon: Shop },
  { label: '商品', value: productCount.value, type: 'listed' as const, icon: Box },
  { label: '禁用/启用', value: `${disabledCount.value}/${enabledCount.value}`, type: 'growth' as const, icon: Sunset },
]);

// 对话框状态
const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);
const currentForm = ref({
  type: 'store' as 'store' | 'product',
  keyword: '',
  replyContent: '',
  enabled: true,
  priority: 0,
  productSelectionId: null as number | null,
});

// 加载规则列表
const fetchRules = async (page = 1, keyword = '') => {
  loading.value = true;
  try {
    const res = await autoReplyAPI.getRules(page, pageSize.value, keyword);
    if (res.success && res.data) {
      allRules.value = Array.isArray(res.data) ? res.data : [];
      total.value = allRules.value.length;
      const totalPages = Math.max(Math.ceil(total.value / pageSize.value), 1);
      if (currentPage.value > totalPages) {
        currentPage.value = totalPages;
      }
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '加载关键词规则失败');
  } finally {
    loading.value = false;
  }
};

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1;
  fetchRules(1, searchKeyword.value);
};

// 分页处理
const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchRules(page, searchKeyword.value);
};

// 打开添加对话框
const openAdd = () => {
  isEdit.value = false;
  editingId.value = null;
  currentForm.value = {
    type: 'store',
    keyword: '',
    replyContent: '',
    enabled: true,
    priority: 0,
    productSelectionId: null,
  };
  dialogVisible.value = true;
};

// 编辑规则
const handleEdit = (rule: AutoReplyRule) => {
  isEdit.value = true;
  editingId.value = rule.id;
  currentForm.value = {
    type: rule.type,
    keyword: rule.keyword,
    replyContent: rule.replyContent,
    enabled: rule.enabled,
    priority: rule.priority,
    productSelectionId: rule.productSelectionId,
  };
  dialogVisible.value = true;
};

// 保存（新增或编辑）
const handleSave = async () => {
  if (!currentForm.value.keyword.trim()) {
    ElMessage.warning('请输入关键词');
    return;
  }
  if (!currentForm.value.replyContent.trim()) {
    ElMessage.warning('请输入回复内容');
    return;
  }
  if (currentForm.value.type === 'product' && !currentForm.value.productSelectionId) {
    ElMessage.warning('商品类型规则必须关联一个商品');
    return;
  }

  saving.value = true;
  try {
    if (isEdit.value && editingId.value !== null) {
      const res = await autoReplyAPI.updateRule(editingId.value, currentForm.value);
      if (res.success) {
        ElMessage.success('更新成功');
        dialogVisible.value = false;
        await fetchRules(currentPage.value, searchKeyword.value);
      } else {
        ElMessage.error(res.message || '更新失败');
      }
    } else {
      const res = await autoReplyAPI.createRule(currentForm.value);
      if (res.success) {
        ElMessage.success('添加成功');
        dialogVisible.value = false;
        await fetchRules(currentPage.value, searchKeyword.value);
      } else {
        ElMessage.error(res.message || '添加失败');
      }
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '操作失败');
  } finally {
    saving.value = false;
  }
};

// 删除规则
const handleDelete = async (id: number) => {
  try {
    const res = await autoReplyAPI.deleteRule(id);
    if (res.success) {
      ElMessage.success('删除成功');
      await fetchRules(currentPage.value, searchKeyword.value);
    } else {
      ElMessage.error(res.message || '删除失败');
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败');
  }
};

// 快速切换启用/禁用状态
const toggleEnabled = async (rule: AutoReplyRule) => {
  try {
    const res = await autoReplyAPI.updateRule(rule.id, {
      enabled: !rule.enabled,
    });
    if (res.success) {
      rule.enabled = !rule.enabled;
      ElMessage.success(rule.enabled ? '已启用' : '已禁用');
    } else {
      ElMessage.error(res.message || '状态更新失败');
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '状态更新失败');
  }
};

onMounted(() => {
  fetchRules();
});
</script>
