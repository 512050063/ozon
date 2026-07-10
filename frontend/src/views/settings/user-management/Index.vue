<template>
  <MainLayout>
    <div class="app-page app-page-stack app-page--fixed user-management-page">
      <!-- 用户列表 -->
      <div class="app-page-card app-page-card--fill user-management-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="app-table-topbar">
          <div class="app-table-topbar__left">
            <AppSearch v-model="searchKeyword" placeholder="搜索用户名、昵称、手机号或角色" @search="handleSearch" />
          </div>
          <div class="app-table-topbar__right">
            <el-button type="primary" class="btn-create" @click="handleAddUser">
              <el-icon class="mr-1"><Plus /></el-icon>
              新增用户
            </el-button>
          </div>
        </div>
        <AppTable :columns="columns" :data="paginatedUsers" :loading="loading" :empty-text="'暂无用户'">
          <template #cell-user="{ row }">
            <div class="flex items-center">
              <el-tooltip :content="getStatusName(row.status)" placement="top">
                <el-badge is-dot :type="getStatusBadgeType(row.status)" class="mr-3">
                  <el-avatar :size="40" :src="row.avatar" :alt="row.nickname || row.username">
                    <el-icon>
                      <User />
                    </el-icon>
                  </el-avatar>
                </el-badge>
              </el-tooltip>
              <div class="text-left">
                <div>
                  {{ row.nickname || row.username }}
                </div>
                <div class="text-[9px] text-slate-400 font-mono">
                  {{ row.username }}
                </div>
              </div>
            </div>
          </template>
          <template #cell-role="{ row }">
            <span :class="[
              'app-table-tag',
              getRoleClass(row.role.code),
            ]">
              {{ row.role.name }}
            </span>
          </template>
          <template #cell-memberLevel="{ row }">
            <span :class="[
              'app-table-tag',
              getMemberLevelClass(row.memberLevel),
            ]">
              {{ getMemberLevelName(row.memberLevel) }}
            </span>
          </template>
          <template #cell-status="{ row }">
            <el-tooltip :content="getStatusTooltip(row)" placement="top">
              <span
                class="user-status-tag"
                :class="[
                  'app-table-tag',
                  getStatusClass(row.status),
                  { 'user-status-tag--disabled': !canToggleUserStatus(row) },
                ]"
                role="button"
                :tabindex="canToggleUserStatus(row) ? 0 : -1"
                :aria-disabled="!canToggleUserStatus(row)"
                @click="openStatusConfirm(row)"
                @keydown.enter.prevent="openStatusConfirm(row)"
                @keydown.space.prevent="openStatusConfirm(row)"
              >
                {{ getStatusName(row.status) }}
              </span>
            </el-tooltip>
          </template>
          <template #cell-phone="{ row }">
            <span v-if="row.phone">
              {{ row.phone }}
            </span>
            <span v-else class="text-slate-400">未绑定</span>
          </template>
          <template #cell-wechat="{ row }">
            <div v-if="row.wechatNickname" class="flex items-center">
              <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                <el-icon class="text-green-600">
                  <User />
                </el-icon>
              </div>
              <span>{{ row.wechatNickname }}</span>
            </div>
            <span v-else class="text-slate-400">未绑定</span>
          </template>
          <template #cell-action="{ row }">
            <div class="flex items-center space-x-2">
              <AppTableButton
                name="edit"
                :disabled="!canEditUser(row)"
                :tooltip="getEditTooltip(row)"
                @click="handleEditUser(row)"
              />
              <AppTableButton
                v-if="canDeleteUser(row)"
                name="delete"
                delete-confirm-text="确定要删除该用户吗？"
                @click="confirmDeleteUser(row.id)"
              />
              <AppTableButton
                v-else
                name="delete"
                disabled
                :tooltip="getDeleteDisabledReason(row)"
              />
            </div>
          </template>
        </AppTable>
        <!-- 分页 -->
        <AppPagination :model-value="currentPage" :total="filteredUsers.length" :page-size="pageSize" @change="handlePageChange" />
      </div>
    </div>
    <!-- 添加/编辑用户弹窗 -->
    <div v-if="dialogVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-8">
        <div class="app-surface-header mb-8">
          <div class="app-surface-icon">
            <el-icon class="text-blue-600 text-2xl">
              <User />
            </el-icon>
          </div>
          <div class="app-surface-title-wrapper">
            <h3 class="app-surface-title">{{ dialogTitle }}</h3>
            <p class="app-surface-subtitle">请填写用户信息</p>
          </div>
        </div>
        <form @submit.prevent="handleFormSubmit" class="px-4">
          <div class="form-item-wrapper">
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">用户名</label>
              <el-input
                v-model="formData.username"
                placeholder="请输入用户名"
                :disabled="formData.id !== null"
                class="input-icon flex-1"
              >
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="error-message-container ml-23">
              <p v-if="errors.username" class="text-xs text-red-500">{{ errors.username }}</p>
            </div>
          </div>
          <div class="form-item-wrapper">
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">密码</label>
              <el-input
                v-model="formData.password"
                type="password"
                placeholder="请输入密码（编辑时为空则不修改密码）"
                show-password
                class="input-icon flex-1"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="error-message-container ml-23">
              <p v-if="errors.password" class="text-xs text-red-500">{{ errors.password }}</p>
            </div>
          </div>
          <div class="form-item-wrapper">
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">昵称</label>
              <el-input
                v-model="formData.nickname"
                placeholder="请输入昵称"
                class="input-icon flex-1"
              >
                <template #prefix>
                  <el-icon><UserFilled /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="error-message-container ml-23">
              <p v-if="errors.nickname" class="text-xs text-red-500">{{ errors.nickname }}</p>
            </div>
          </div>
          <div class="form-item-wrapper">
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">角色</label>
              <el-select
                v-model="formData.roleId"
                placeholder="请选择角色"
                :options="assignableRoles.map(r => ({ label: r.name, value: r.id }))"
                :disabled="isRoleSelectDisabled"
                class="select-base dialog-select flex-1"
                popper-class="dialog-select-popper"
              />
            </div>
            <div class="error-message-container ml-23">
              <p v-if="errors.roleId" class="text-xs text-red-500">{{ errors.roleId }}</p>
            </div>
          </div>
          <div class="form-item-wrapper">
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">会员等级</label>
              <div class="member-level-segmented flex-1" role="radiogroup" aria-label="会员等级">
                <button
                  v-for="option in memberLevelOptions"
                  :key="option.value"
                  type="button"
                  class="member-level-option"
                  :class="{ active: formData.memberLevel === option.value }"
                  role="radio"
                  :aria-checked="formData.memberLevel === option.value"
                  @click="formData.memberLevel = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <div class="error-message-container ml-23">
            </div>
          </div>
          <div class="button-group pt-4 flex gap-3">
            <el-button class="btn-cancel" :disabled="loading" @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" class="btn-confirm" :loading="loading" native-type="submit">{{ loading ? '提交..' : '提交' }}</el-button>
          </div>
        </form>
      </div>
    </div>
    <AppDeleteConfirmDialog
      v-model="statusConfirmVisible"
      title="确认更改状态"
      :message="statusConfirmMessage"
      :confirm-text="statusConfirmText"
      :variant="statusConfirmVariant"
      :icon="statusConfirmIcon"
      :loading="statusChanging"
      @confirm="confirmToggleUserStatus"
    />
  </MainLayout>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { User, UserFilled, Lock, Plus } from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
import { AppDeleteConfirmDialog, AppSearch, AppTable, AppTableButton } from '@/components/ui';
import { userManagementAPI, type UpdateUserRequest } from '@/api/userManagementAPI';
import { roleManagementAPI } from '@/api/roleManagementAPI';
import type { User as UserType, Role } from '@/types';
import { useAuthStore } from '@/store/authStore';
import AppPagination from '@/components/ui/AppPagination.vue';
const authStore = useAuthStore();
// 表格列配置
const columns = [
  { key: 'user', label: '用户信息', align: 'left' as const },
  { key: 'role', label: '角色', align: 'left' as const },
  { key: 'memberLevel', label: '会员等级', align: 'left' as const },
  { key: 'status', label: '状态', align: 'left' as const },
  { key: 'phone', label: '手机号', align: 'left' as const },
  { key: 'wechat', label: '微信', align: 'left' as const },
  { key: 'action', label: '操作', align: 'left' as const },
];

// 数据
const loading = ref(false);
const allUsers = ref<UserType[]>([]);
const searchKeyword = ref('');
const roles = ref<Role[]>([]);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const statusConfirmVisible = ref(false);
const statusConfirmUser = ref<UserType | null>(null);
const statusChanging = ref(false);
const formData = reactive({
  id: null as number | null,
  username: '',
  password: '',
  nickname: '',
  phone: '',
  roleId: 4,
  targetRoleCode: '',
  memberLevel: 'free' as 'free' | 'trial' | 'standard' | 'professional',
});
const memberLevelOptions: Array<{ label: string; value: typeof formData.memberLevel }> = [
  { label: '免费版', value: 'free' },
  { label: '试用版', value: 'trial' },
  { label: '标准版', value: 'standard' },
  { label: '专业版', value: 'professional' },
];
const errors = reactive({
  username: '',
  password: '',
  nickname: '',
  roleId: '',
});

// 分页
const currentPage = ref(1);
const pageSize = 10;
// 计算属性
const filteredUsers = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return allUsers.value;
  }
  return allUsers.value.filter(user => {
    const values = [
      user.username,
      user.nickname,
      user.phone,
      user.wechatNickname,
      user.role?.name,
      user.role?.code,
    ];
    return values.some(value => String(value || '').toLowerCase().includes(keyword));
  });
});
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredUsers.value.slice(start, end);
});
const assignableRoles = computed(() => roles.value.filter(role => role.code !== 'super_admin'));
const statusConfirmText = computed(() => {
  if (!statusConfirmUser.value) return '确认';
  return getStatusChangeActionText(statusConfirmUser.value);
});
const statusConfirmMessage = computed(() => {
  if (!statusConfirmUser.value) return '';
  return getStatusConfirmMessage(statusConfirmUser.value);
});
const statusConfirmVariant = computed<'danger' | 'success' | 'warning'>(() => {
  if (!statusConfirmUser.value) return 'warning';
  if (statusConfirmUser.value.status === 'pending') return 'warning';
  if (statusConfirmUser.value.status === 'active') return 'danger';
  return 'success';
});
const statusConfirmIcon = computed<'disable' | 'success' | 'warning'>(() => {
  if (!statusConfirmUser.value) return 'warning';
  if (statusConfirmUser.value.status === 'pending') return 'warning';
  if (statusConfirmUser.value.status === 'active') return 'disable';
  return 'success';
});
// 分页变化处理
const handlePageChange = (page: number) => {
  currentPage.value = page;
};
const handleSearch = () => {
  currentPage.value = 1;
};
// 加载角色列表
const loadRoles = async () => {
  try {
    const response = await roleManagementAPI.getRoles();
    if (response.success && response.data) {
      roles.value = response.data;
    }
  } catch {
  }
};
// 加载用户列表
const loadUsers = async () => {
  loading.value = true;
  try {
    const response = await userManagementAPI.getUsers();
    if (response.success && response.data) {
      allUsers.value = response.data;
      // 如果当前页超出范围，重置到第一页
      if (currentPage.value > Math.ceil(allUsers.value.length / pageSize)) {
        currentPage.value = 1;
      }
    } else {
      ElMessage.error(response.message || '获取用户列表失败');
    }
  } catch (error) {
  ElMessage.error('请求失败，请重试');
} finally {
  loading.value = false;
}
};
// 清除错误信息
const clearErrors = () => {
  errors.username = '';
  errors.password = '';
  errors.nickname = '';
  errors.roleId = '';
};
// 验证表单
const validateForm = () => {
  clearErrors();
  let isValid = true;
  if (!formData.username.trim()) {
    errors.username = '请输入用户名';
    isValid = false;
  }
  // 只有新增时才需要验证密码（编辑时密码为空则不修改）
  if (!formData.id && !formData.password.trim()) {
    errors.password = '请输入密码';
    isValid = false;
  }
  if (!formData.roleId) {
    errors.roleId = '请选择角色';
    isValid = false;
  }
  return isValid;
};
// 检查用户名是否重复
const isUsernameDuplicate = (username: string, excludeId: number | null = null) => {
  return allUsers.value.some(user =>
    user.username === username && user.id !== excludeId
  );
};
// 打开添加用户弹窗
const handleAddUser = () => {
  formData.id = null;
  formData.username = '';
  formData.password = '';
  formData.nickname = '';
  formData.phone = '';
  formData.roleId = 4;
  formData.targetRoleCode = '';
  formData.memberLevel = 'free';
  clearErrors();
  dialogTitle.value = '新增用户';
  dialogVisible.value = true;
};
// 打开编辑用户弹窗
const handleEditUser = (row: UserType) => {
  formData.id = row.id;
  formData.username = row.username;
  formData.password = '';
  formData.nickname = row.nickname || '';
  formData.phone = row.phone || '';
  formData.roleId = row.roleId;
  formData.targetRoleCode = row.role?.code || '';
  formData.memberLevel = row.memberLevel as 'free' | 'trial' | 'standard' | 'professional';
  clearErrors();
  dialogTitle.value = '编辑用户';
  dialogVisible.value = true;
};

const mergeUserInList = (updatedUser: UserType) => {
  const index = allUsers.value.findIndex(u => u.id === updatedUser.id);
  if (index !== -1) {
    allUsers.value[index] = {
      ...allUsers.value[index],
      ...updatedUser,
    };
  }
};

// 确认删除用户
const confirmDeleteUser = async (userId: number) => {
  try {
    const response = await userManagementAPI.deleteUser(userId);
    if (response.success) {
      ElMessage.success('删除成功');
      // 直接从列表中移除，不触发刷新动画
      const index = allUsers.value.findIndex(u => u.id === userId);
      if (index !== -1) {
        allUsers.value.splice(index, 1);
      }
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
  // 检查用户名重复
  if (isUsernameDuplicate(formData.username, formData.id)) {
    errors.username = '用户名已存在';
    return;
  }
  loading.value = true;
  try {
    let response;
    if (formData.id) {
        // 编辑
        const data: Partial<UpdateUserRequest> = {
          username: formData.username,
          nickname: formData.nickname,
          phone: formData.phone,
          memberLevel: formData.memberLevel,
          memberExpiration: null, // 管理员修改会员等级时到期时间设为永久
        };
        if (!isRoleSelectDisabled.value) {
          data.roleId = formData.roleId;
        }
        response = await userManagementAPI.updateUser(formData.id, data);
        if (response.success) {
          ElMessage.success('更新成功');
          dialogVisible.value = false;
          // 更新列表中的用户信息
          if (response.data) {
            mergeUserInList(response.data);
          }
        } else {
          ElMessage.error(response.message || '操作失败');
        }
      } else {
        // 新增 - 不显示刷新动画，直接添加到列表
        const createPayload: any = {
          username: formData.username,
          password: formData.password,
          nickname: formData.nickname,
          phone: formData.phone,
          memberLevel: formData.memberLevel,
        };
        if (!isRoleSelectDisabled.value) {
          createPayload.roleId = formData.roleId;
        }
        response = await userManagementAPI.createUser(createPayload);
        if (response.success) {
          ElMessage.success('添加成功');
          dialogVisible.value = false;
          // 直接将新用户添加到列表开头，不触发加载动画
          const newUser: UserType = response.data || {
            id: response.data?.id || Date.now(),
            username: formData.username,
            nickname: formData.nickname,
            phone: formData.phone,
            roleId: formData.roleId,
            memberLevel: formData.memberLevel,
            status: response.data?.status || 'active',
            role: roles.value.find(r => r.id === formData.roleId) || { id: formData.roleId, name: '普通用户', code: 'seller', description: null, permissions: [], isSystem: false, userCount: 0, createdAt: '', updatedAt: '' },
            trialExpiration: null,
            memberExpiration: null,
            hasClaimedTrial: false,
            avatar: null,
            wechatOpenid: null,
            wechatNickname: null,
            wechatAvatar: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          allUsers.value.unshift(newUser);
        } else {
          ElMessage.error(response.message || '操作失败');
        }
      }
  } catch (error: any) {
    ElMessage.error(error.message || '请求失败');
  } finally {
    loading.value = false;
  }
};
// 获取会员等级样式
const getMemberLevelClass = (level: string) => {
const classes: Record<string, string> = {
  trial: 'app-table-tag--orange',
  free: 'app-table-tag--info',
  standard: 'app-table-tag--blue',
  professional: 'app-table-tag--purple',
};
return classes[level] || classes.free;
};
// 获取会员等级名称
const getMemberLevelName = (level: string) => {
  const names: Record<string, string> = {
    trial: '试用版',
    free: '免费版',
    standard: '标准版',
    professional: '专业版',
  };
  return names[level] || names.free;
};
// 获取用户状态样式
const getStatusClass = (status: string) => {
const classes: Record<string, string> = {
  pending: 'app-table-tag--warning',
  active: 'app-table-tag--success',
  inactive: 'app-table-tag--danger',
};
return classes[status] || classes.inactive;
};
// 获取用户状态名称
const getStatusName = (status: string) => {
  const names: Record<string, string> = {
    pending: '待审核',
    active: '启用',
    inactive: '禁用',
  };
  return names[status] || status;
};
const getStatusBadgeType = (status: string) => {
  const types: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    active: 'success',
    inactive: 'danger',
  };
  return types[status] || 'info';
};

const getNextUserStatus = (status: string): 'pending' | 'active' | 'inactive' => {
  if (status === 'pending') return 'active';
  if (status === 'active') return 'inactive';
  return 'active';
};

const getStatusChangeActionText = (user: UserType) => {
  const nextStatus = getNextUserStatus(user.status);
  if (nextStatus === 'active' && user.status === 'pending') return '审核通过';
  if (nextStatus === 'inactive') return '禁用';
  return '启用';
};

const getStatusConfirmMessage = (user: UserType) => {
  const action = getStatusChangeActionText(user);
  const displayName = user.nickname || user.username;
  return `确定要${action}用户「${displayName}」吗？`;
};

const getUserPrivilegeLevel = (user: Pick<UserType, 'username' | 'role'> | null | undefined) => {
  if (!user) return 0;
  if (user.role?.code === 'super_admin') return 3;
  if (user.role?.code === 'admin') return 2;
  return 1;
};

const canCurrentUserManageRoles = () => getUserPrivilegeLevel(authStore.user) >= 2;

const isSelfUser = (user: UserType) => {
  return Boolean(authStore.user && authStore.user.id === user.id);
};

const canChangeUserRole = (userId: number | null) => {
  if (!canCurrentUserManageRoles() || authStore.user?.id === userId) return false;
  if (getUserPrivilegeLevel(authStore.user) === 3) return true;
  return userId === null || getRoleLevel(formData.targetRoleCode) < 2;
};

const isRoleSelectDisabled = computed(() => !canChangeUserRole(formData.id));

const canOperateUserByRole = (user: UserType) => {
  if (!authStore.user) return false;

  const currentLevel = getUserPrivilegeLevel(authStore.user);
  if (currentLevel === 3) {
    return true;
  }

  return currentLevel > getUserPrivilegeLevel(user);
};

const canToggleUserStatus = (user: UserType) => {
  if (!authStore.user) {
    return false;
  }

  if (isSelfUser(user)) {
    return false;
  }

  return canOperateUserByRole(user);
};

const getStatusDisabledReason = (user: UserType) => {
  if (!authStore.user) {
    return '未获取到当前登录用户';
  }

  if (isSelfUser(user)) {
    return '不能改变当前登录账号状态';
  }

  if (getUserPrivilegeLevel(authStore.user) <= getUserPrivilegeLevel(user)) {
    return '低权限用户不能操作同级或高权限用户';
  }

  return '当前账号无操作该用户状态的权限';
};

const getStatusTooltip = (user: UserType) => {
  if (!canToggleUserStatus(user)) {
    return getStatusDisabledReason(user);
  }

  return `点击${getStatusChangeActionText(user)}`;
};

const openStatusConfirm = (user: UserType) => {
  if (!canToggleUserStatus(user)) {
    return;
  }

  statusConfirmUser.value = user;
  statusConfirmVisible.value = true;
};

const confirmToggleUserStatus = async () => {
  if (!statusConfirmUser.value) return;

  statusChanging.value = true;
  try {
    const response = await userManagementAPI.toggleUserStatus(statusConfirmUser.value.id);
    if (response.success && response.data) {
      mergeUserInList(response.data);
      ElMessage.success('状态更新成功');
      statusConfirmVisible.value = false;
      statusConfirmUser.value = null;
    } else {
      ElMessage.error(response.message || '状态更新失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '状态更新失败');
  } finally {
    statusChanging.value = false;
  }
};

// 获取角色样式
const getRoleClass = (code: string) => {
const classes: Record<string, string> = {
  super_admin: 'app-table-tag--danger',
  admin: 'app-table-tag--danger',
  operation: 'app-table-tag--purple',
  operator: 'app-table-tag--purple',
  customer_service: 'app-table-tag--blue',
  support: 'app-table-tag--blue',
  seller: 'app-table-tag--success',
  user: 'app-table-tag--success',
};
return classes[code] || classes.seller;
};
const canEditUser = (user: UserType) => {
  if (!authStore.user) {
    return false;
  }
  
  if (isSelfUser(user)) {
    return true;
  }

  return canOperateUserByRole(user);
};

const getEditDisabledReason = (user: UserType) => {
  if (!authStore.user) {
    return '未获取到当前登录用户';
  }

  if (canEditUser(user)) {
    return '';
  }

  if (getUserPrivilegeLevel(authStore.user) <= getUserPrivilegeLevel(user)) {
    return '低权限用户不能编辑同级或高权限用户';
  }

  return '当前账号无编辑该用户的权限';
};

const getEditTooltip = (user: UserType) => {
  return canEditUser(user) ? '编辑' : getEditDisabledReason(user);
};

const canDeleteUser = (user: UserType) => {
  if (!authStore.user) {
    return false;
  }
  
  if (isSelfUser(user)) {
    return false;
  }

  return canOperateUserByRole(user);
};

const getDeleteDisabledReason = (user: UserType) => {
  if (!authStore.user) {
    return '未获取到当前登录用户';
  }

  if (isSelfUser(user)) {
    return '不能删除当前登录账号';
  }

  if (getUserPrivilegeLevel(authStore.user) <= getUserPrivilegeLevel(user)) {
    return '低权限用户不能删除同级或高权限用户';
  }

  return '当前账号无删除该用户的权限';
};
// 页面加载时获取数据
onMounted(() => {
loadRoles();
loadUsers();
});
</script>
<style scoped>
.user-management-card {
  overflow: hidden;
}

.user-management-card :deep(.app-table-wrapper),
.user-management-card :deep(.app-table-container) {
  flex: 1 1 auto;
  min-height: 0;
}

@keyframes shake {

  0%,
  100% {
    transform: translateX(0);
  }

  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-2px);
  }

  20%,
  40%,
  60%,
  80% {
    transform: translateX(2px);
  }
}

.animate-shake {
  animation: shake 0.6s ease-in-out;
}

/* 输入框聚焦动*/
:deep(.el-input__wrapper) {
  transition: all 0.2s ease;
}

/* 表单项间*/
.form-item-wrapper {
  margin-bottom: 8px;
}

/* 文字和文本框左对*/
.ml-23 {
  margin-left: 88px;
  /* w-20 (80px) + gap-2 (8px) = 88px */
}

/* 错误提示容器固定高度，防止弹窗增*/
.error-message-container {
  height: 14px;
  /* 固定高度，足够容纳一行文*/
  display: flex;
  align-items: center;
  padding-top: 2px;
}

.member-level-segmented {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  height: 34px;
  padding: 3px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92), 0 1px 2px rgba(15, 23, 42, 0.04);
}

.member-level-option {
  min-width: 0;
  height: 26px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  line-height: 26px;
  cursor: pointer;
  transition: color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.member-level-option:hover {
  color: #2563eb;
  background: #eff6ff;
}

.member-level-option.active {
  color: #1d4ed8;
  background: #dbeafe;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.14);
}

.member-level-option:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.28);
  outline-offset: 1px;
}

.user-status-tag {
  cursor: pointer;
  user-select: none;
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
}

.user-status-tag:not(.user-status-tag--disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
}

.user-status-tag--disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

/* 确保按钮右对*/
.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
