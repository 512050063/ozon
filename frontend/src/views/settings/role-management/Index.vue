<template>
  <MainLayout>
    <div class="app-page app-page-stack app-page--fixed role-management-page">
      <!-- 角色列表 -->
      <div class="app-page-card app-page-card--fill role-management-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="app-table-topbar">
          <div class="app-table-topbar__left">
            <AppSearch v-model="searchKeyword" placeholder="搜索角色名称、代码或描述" @search="handleSearch" />
          </div>
          <div class="app-table-topbar__right">
            <el-button type="primary" class="btn-create" :disabled="!canCreateRole" @click="handleAddRole">
              <el-icon class="mr-1"><Plus /></el-icon>
              添加角色
            </el-button>
          </div>
        </div>
        <AppTable :columns="columns" :data="paginatedRoles" :loading="loading" :empty-text="'暂无角色'">
          <template #cell-role="{ row }">
            <div class="flex items-center">
              <el-avatar :size="40" class="mr-3">
                <el-icon>
                  <UserFilled />
                </el-icon>
              </el-avatar>
              <div class="text-left">
                <div>
                  {{ row.name }}
                </div>
                <div class="text-[9px] text-slate-400 font-mono">
                  {{ row.code }}
                </div>
              </div>
            </div>
          </template>
          <template #cell-description="{ row }">
            <div class="max-w-xs truncate">
              {{ row.description }}
            </div>
          </template>
          <template #cell-userCount="{ row }">
            <span class="app-table-tag app-table-tag--info">
              {{ row.userCount }} 用户
            </span>
          </template>
          <template #cell-permission="{ row }">
            <button
              :disabled="!canManageRole(row)"
              :class="[
                'px-3 py-1.5 rounded-lg flex items-center transition-colors',
                canManageRole(row) ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' : 'text-slate-300 cursor-not-allowed'
              ]"
              @click="handleViewPermissions(row)"
            >
              <el-icon class="w-4 h-4 mr-1">
                <Document />
              </el-icon>
              <span>{{ getPermissionCount(row.permissions || []) }}</span>
            </button>
          </template>
          <template #cell-action="{ row }">
            <div class="flex items-center gap-2">
              <AppTableButton name="edit" :disabled="!canManageRole(row)" :tooltip="getRoleManageDisabledReason(row)" @click="handleEditRole(row)" />
              <AppTableButton v-if="canDeleteRole(row)" name="delete" delete-confirm-text="确定要删除这个角色吗？" @click="confirmDeleteRole(row.id)" />
              <AppTableButton v-else name="delete" disabled
                :tooltip="getRoleDeleteDisabledReason(row)" />
            </div>
          </template>
        </AppTable>
        <!-- 分页 -->
        <AppPagination :model-value="currentPage" :total="total" :page-size="pageSize" @change="handlePageChange" />
      </div>
    </div>
    <!-- 添加/编辑角色弹窗 -->
    <div v-if="dialogVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="dialogVisible = false">
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-8">
        <div class="app-surface-header mb-8">
          <div class="app-surface-icon">
            <el-icon class="text-blue-600 text-2xl">
              <UserFilled />
            </el-icon>
          </div>
          <div class="app-surface-title-wrapper">
            <h3 class="app-surface-title">{{ dialogTitle }}</h3>
            <p class="app-surface-subtitle">请填写角色信息</p>
          </div>
        </div>
        <form @submit.prevent="handleFormSubmit" class="px-4">
          <div class="mb-2">
            <div class="flex items-center gap-2 mb-1">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">角色名称</label>
              <el-input v-model="formData.name" placeholder="请输入角色名称" size="default" clearable class="flex-1">
                <template #prefix>
                  <el-icon>
                    <User />
                  </el-icon>
                </template>
              </el-input>
            </div>
            <div class="min-h-[14px] pl-[88px] text-left">
              <p v-if="errors.name" class="text-xs text-red-500">{{ errors.name }}</p>
            </div>
          </div>
          <div class="mb-2">
            <div class="flex items-center gap-2 mb-1">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">角色代码</label>
              <el-input v-model="formData.code" type="text" :disabled="formData.isSystem" :class="[
                'flex-1',
                formData.isSystem ? 'bg-slate-100 cursor-not-allowed' : ''
              ]" placeholder="输入角色代码" size="default" clearable>
                <template #prefix>
                  <el-icon>
                    <Document />
                  </el-icon>
                </template>
              </el-input>
            </div>
            <div class="min-h-[14px] pl-[88px] text-left">
              <p v-if="errors.code" class="text-xs text-red-500">{{ errors.code }}</p>
            </div>
          </div>
          <div class="mb-2">
            <div class="flex items-center gap-2 mb-1">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">描述</label>
              <el-input
                v-model="formData.description"
                type="textarea"
                placeholder="输入角色描述"
                :rows="3"
                class="textarea-base flex-1"
              />
            </div>
          </div>
          <div class="flex justify-end items-center gap-3 pt-6">
            <el-button class="btn-cancel" :disabled="loading" @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" class="btn-confirm" :loading="loading">{{ loading ? '提交..' : '提交' }}</el-button>
          </div>
        </form>
      </div>
    </div>
    <!-- 权限设置弹窗 -->
    <div v-if="permissionDialogVisible"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="permissionDialogVisible = false">
      <div class="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-8">
        <div class="app-surface-header mb-8">
          <div class="app-surface-icon">
            <el-icon class="text-blue-600 text-2xl">
              <Document />
            </el-icon>
          </div>
          <div class="app-surface-title-wrapper">
            <h3 class="app-surface-title">设置角色权限</h3>
            <p class="app-surface-subtitle">请选择该角色可访问的菜单权限</p>
          </div>
        </div>
        <div class="max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-4 mb-4 text-sm">
          <el-tree :data="menuPermissions" :props="defaultProps" show-checkbox node-key="code"
            :default-expanded-keys="expandedKeys" :default-checked-keys="checkedPermissions"
            :expand-on-click-node="false" @check="handleCheckChange" class="permission-tree" />
        </div>
        <div class="flex justify-end items-center gap-3 pt-6">
          <el-button class="btn-cancel" @click="permissionDialogVisible = false">取消</el-button>
          <el-button type="primary" class="btn-confirm" @click="handlePermissionSubmit">确定</el-button>
        </div>
      </div>
    </div>
  </MainLayout>
</template>
<style scoped>
.role-management-card {
  overflow: hidden;
}

.role-management-card :deep(.app-table-wrapper),
.role-management-card :deep(.app-table-container) {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { UserFilled, Document, Plus, User } from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
import AppPagination from '@/components/ui/AppPagination.vue';
import { AppSearch, AppTable, AppTableButton } from '@/components/ui';
import { roleAPI } from '@/api/roleAPI';
import { useAuthStore } from '@/store/authStore';
const authStore = useAuthStore();
// 表格列配置
const columns = [
  { key: 'role', label: '角色信息', align: 'left' as const },
  { key: 'description', label: '描述', align: 'left' as const },
  { key: 'userCount', label: '用户数量', align: 'left' as const },
  { key: 'permission', label: '权限', align: 'left' as const },
  { key: 'action', label: '操作', align: 'left' as const },
];
// 数据
const loading = ref(false);
const allRoles = ref<any[]>([]);
const searchKeyword = ref('');
const dialogVisible = ref(false);
const dialogTitle = ref('');
const formData = reactive({
  id: null,
  name: '',
  code: '',
  description: '',
  isSystem: false,
});
const errors = reactive({
  name: '',
  code: '',
});
const permissionDialogVisible = ref(false);
const currentRole = ref<any>(null);
const checkedPermissions = ref<string[]>([]);
// 删除相关
// 分页
const currentPage = ref(1);
const pageSize = 10;
// 计算属性
const filteredRoles = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return allRoles.value;
  }
  return allRoles.value.filter(role => {
    const values = [role.name, role.code, role.description];
    return values.some(value => String(value || '').toLowerCase().includes(keyword));
  });
});
const total = computed(() => filteredRoles.value.length);
// 分页后的角色列表
const paginatedRoles = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredRoles.value.slice(start, end);
});
const getRoleLevel = (code?: string | null) => {
  if (code === 'super_admin') return 3;
  if (code === 'admin') return 2;
  return 1;
};
const currentRoleLevel = computed(() => getRoleLevel(authStore.user?.role?.code));
const canCreateRole = computed(() => currentRoleLevel.value >= 2);
const canManageRole = (role: any) => {
  if (currentRoleLevel.value === 3) return true;
  return currentRoleLevel.value === 2 && role.code !== 'super_admin';
};
const canDeleteRole = (role: any) => canManageRole(role) && role.userCount === 0;
const getRoleManageDisabledReason = (role: any) => {
  if (canManageRole(role)) return '';
  if (role.code === 'super_admin') return '管理员不能管理超管角色';
  return '当前账号无角色管理权限';
};
const getRoleDeleteDisabledReason = (role: any) => {
  if (!canManageRole(role)) return getRoleManageDisabledReason(role);
  if (role.userCount > 0) return '角色中有用户，不可删除';
  return '';
};
// 分页变化处理
const handlePageChange = (page: number) => {
  currentPage.value = page;
};
const handleSearch = () => {
  currentPage.value = 1;
};
// 菜单权限树数据
const menuPermissions = ref([
  {
    code: 'dashboard',
    label: '主页信息',
    children: []
  },
  {
    code: 'product-analysis',
    label: '选品分析',
    children: [
      { code: 'product-analysis', label: 'ozon 优化' },
      { code: 'price-management', label: '竞价监控' }
    ]
  },
  {
    code: 'source-collection',
    label: '货源采集',
    children: [
      { code: 'source-collection/product-collection', label: '商品采集' },
      { code: 'source-collection/supply-management', label: '货源管理' }
    ]
  },
  {
    code: 'warehouse',
    label: '本地仓库',
    children: [
      { code: 'warehouse/product-library', label: '商品库' },
      { code: 'warehouse/material-library', label: '素材库' }
    ]
  },
  {
    code: 'ozon',
    label: 'Ozon店铺',
    children: [
      { code: 'ozon/store-management', label: '店铺管理' },
      { code: 'ozon/product-management', label: '商品管理' },
      { code: 'ozon/order-management', label: '订单管理' },
      { code: 'ozon/promotions', label: '促销活动' },
      { code: 'ozon/finance-report', label: '财务报告' },
      { code: 'ozon/pricing', label: '定价策略' }
    ]
  },
  {
    code: 'ozon/customer-service',
    label: '智能客服',
    children: [
      { code: 'ozon/customer-service/auto-reply', label: '自动回复' },
      { code: 'ozon/customer-service/messages', label: '消息中心' }
    ]
  },
  {
    code: 'settings',
    label: '系统设置',
    children: [
      { code: 'settings/account-info', label: '账号信息' },
      { code: 'settings/role-management', label: '角色管理' },
      { code: 'settings/user-management', label: '用户管理' },
      { code: 'settings/payment-records', label: '充值记录' },
      { code: 'settings/api-config', label: 'API配置' }
    ]
  }
]);
// Tree 组件配置
const defaultProps = {
  children: 'children',
  label: 'label'
};
// 默认展开所有带子菜单的父节点
const getParentNodeKeys = (): string[] => {
  const keys: string[] = [];
  const traverse = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        keys.push(node.code);
        traverse(node.children);
      }
    }
  };
  traverse(menuPermissions.value);
  return keys;
};
const expandedKeys = ref(getParentNodeKeys());
// 获取所有有效的叶子权限代码列表（父分组不计入总数）
const getAllValidPermissionCodes = (): string[] => {
  const codes: string[] = [];
  const traverse = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      } else {
        codes.push(node.code);
      }
    }
  };
  traverse(menuPermissions.value);
  return codes;
};
// 过滤掉父分组权限，只保留叶子权限
const filterLeafPermissions = (permissions: string[]): string[] => {
  const validLeafCodes = getAllValidPermissionCodes();
  return normalizeLegacySourceCollectionPermissions(permissions).filter(code => validLeafCodes.includes(code));
};
// 兼容旧角色中的 source-collection 权限，展示和保存时映射为两个新叶子权限
const normalizeLegacySourceCollectionPermissions = (permissions: string[]): string[] => {
  const normalizedPermissions = [...permissions];
  if (normalizedPermissions.includes('source-collection')) {
    if (!normalizedPermissions.includes('source-collection/product-collection')) {
      normalizedPermissions.push('source-collection/product-collection');
    }
    if (!normalizedPermissions.includes('source-collection/supply-management')) {
      normalizedPermissions.push('source-collection/supply-management');
    }
  }
  return normalizedPermissions;
};
// 过滤无效的权限代码
const filterValidPermissions = (permissions: string[]): string[] => {
  const validCodes = getAllValidPermissionCodes();
  const normalizedPermissions = normalizeLegacySourceCollectionPermissions(permissions);
  if (
    !normalizedPermissions.includes('ozon/order-management') &&
    (normalizedPermissions.includes('ozon/product-management') || normalizedPermissions.includes('ozon/pricing'))
  ) {
    normalizedPermissions.push('ozon/order-management');
  }
  if (normalizedPermissions.includes('ozon/customer-service')) {
    if (!normalizedPermissions.includes('ozon/customer-service/auto-reply')) {
      normalizedPermissions.push('ozon/customer-service/auto-reply');
    }
    if (!normalizedPermissions.includes('ozon/customer-service/messages')) {
      normalizedPermissions.push('ozon/customer-service/messages');
    }
  }
  return normalizedPermissions.filter(code => validCodes.includes(code));
};
// 计算角色权限数量，只统计叶子权限
const getPermissionCount = (permissions: string[]) => {
  return filterValidPermissions(permissions).length;
};
// 基础权限（新角色默认权限）
const defaultPermissions = [
  'dashboard',
  'settings/account-info'
];
// 处理 Tree 组件 check 事件（只保留叶子权限，排除父分组）
const handleCheckChange = (_data: any, checkedInfo: any) => {
  checkedPermissions.value = filterLeafPermissions(checkedInfo.checkedKeys);
};
// 权限提交
const handlePermissionSubmit = async () => {
  if (!currentRole.value) return;
  try {
    const response = await roleAPI.updateRole(currentRole.value.id, {
      permissions: filterLeafPermissions(checkedPermissions.value)
    });
    if (response.success) {
      ElMessage.success('权限设置成功');
      permissionDialogVisible.value = false;
      fetchRoles();
      // 刷新菜单栏权限，如果失败则刷新页面
      try {
        await authStore.fetchProfile();
      } catch (e) {
        // 刷新失败，刷新整个页面确保菜单栏正确显示
        window.location.reload();
      }
    } else {
      ElMessage.error(response.message || '操作失败');
    }
  } catch (error) {
    ElMessage.error('请求失败，请重试');
  }
};
// 获取角色列表
const fetchRoles = async () => {
  loading.value = true;
  try {
    const response = await roleAPI.getAllRoles();
    if (response.success && response.data) {
      allRoles.value = response.data.map(role => ({
        ...role,
        permissions: filterValidPermissions(role.permissions || []) // 过滤无效权限
      }));
      // 如果当前页超出范围，重置到第一页
      if (currentPage.value > Math.ceil(allRoles.value.length / pageSize)) {
        currentPage.value = 1;
      }
    } else {
      ElMessage.error(response.message || '获取角色列表失败');
    }
  } catch (error) {
    ElMessage.error('请求失败，请重试');
  } finally {
    loading.value = false;
  }
};
// 页面加载时获取角色列表
onMounted(() => {
  fetchRoles();
});
// 清除错误信息
const clearErrors = () => {
  errors.name = '';
  errors.code = '';
};
// 验证表单
const validateForm = () => {
  clearErrors();
  let isValid = true;
  if (!formData.name.trim()) {
    errors.name = '请输入角色名称';
    isValid = false;
  }
  if (!formData.code.trim()) {
    errors.code = '请输入角色代码';
    isValid = false;
  }
  return isValid;
};
// 检查角色名称是否重复
const isNameDuplicate = (name: string, excludeId: number | null = null) => {
  return allRoles.value.some(role =>
    role.name === name && role.id !== excludeId
  );
};
// 检查角色代码是否重复
const isCodeDuplicate = (code: string, excludeId: number | null = null) => {
  return allRoles.value.some(role =>
    role.code === code && role.id !== excludeId
  );
};
// 打开添加角色弹窗
const handleAddRole = () => {
  if (!canCreateRole.value) {
    ElMessage.error('当前账号无角色管理权限');
    return;
  }
  formData.id = null;
  formData.name = '';
  formData.code = '';
  formData.description = '';
  formData.isSystem = false;
  clearErrors();
  dialogTitle.value = '添加角色';
  dialogVisible.value = true;
};
// 打开编辑角色弹窗
const handleEditRole = (row: any) => {
  if (!canManageRole(row)) {
    ElMessage.error(getRoleManageDisabledReason(row));
    return;
  }
  formData.id = row.id;
  formData.name = row.name;
  formData.code = row.code;
  formData.description = row.description;
  formData.isSystem = row.isSystem;
  clearErrors();
  dialogTitle.value = '编辑角色';
  dialogVisible.value = true;
};
// 打开权限设置弹窗
const handleViewPermissions = (row: any) => {
  if (!canManageRole(row)) {
    ElMessage.error(getRoleManageDisabledReason(row));
    return;
  }
  currentRole.value = row;
  checkedPermissions.value = filterValidPermissions([...(row.permissions || [])]); // 过滤无效权限
  permissionDialogVisible.value = true;
};
// 确认删除角色
const confirmDeleteRole = async (roleId: number) => {
  try {
    const role = allRoles.value.find(item => item.id === roleId);
    if (role && !canDeleteRole(role)) {
      ElMessage.error(getRoleDeleteDisabledReason(role) || '当前角色不可删除');
      return;
    }
    const response = await roleAPI.deleteRole(roleId);
    if (response.success) {
      ElMessage.success('删除成功');
      fetchRoles();
    } else {
      ElMessage.error(response.message || '删除失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败');
  }
};
// 表单提交
const handleFormSubmit = async () => {
  if (!validateForm()) {
    return;
  }
  // 检查名称和代码是否重复
  if (isNameDuplicate(formData.name, formData.id)) {
    errors.name = '角色名称已存在';
    return;
  }
  if (isCodeDuplicate(formData.code, formData.id)) {
    errors.code = '角色代码已存在';
    return;
  }
  loading.value = true;
  try {
    let response;
    if (formData.id) {
      // 编辑
      response = await roleAPI.updateRole(formData.id, {
        name: formData.name,
        code: formData.code,
        description: formData.description
      });
    } else {
      // 新增，带默认权限
      response = await roleAPI.createRole({
        name: formData.name,
        code: formData.code,
        description: formData.description,
        permissions: [...defaultPermissions]
      });
    }
    if (response.success) {
      ElMessage.success(formData.id ? '更新成功' : '添加成功');
      dialogVisible.value = false;
      fetchRoles();
    } else {
      ElMessage.error(response.message || '操作失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '请求失败');
  } finally {
    loading.value = false;
  }
};
</script>
