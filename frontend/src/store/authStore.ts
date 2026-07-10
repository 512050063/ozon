import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authAPI } from '@/api/authAPI';
import type { User } from '@/types';
import { appAlert } from '@/utils/appConfirm';

const ACTIVE_SESSION_EXISTS = 'ACTIVE_SESSION_EXISTS';
const SESSION_KICKED = 'SESSION_KICKED';
const DEVICE_ID_KEY = 'ozon:device-id';
const SESSION_CHECK_INTERVAL_MS = 60 * 1000;

let sessionMonitorTimer: number | null = null;
let sessionKickPromptVisible = false;

const getDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    const randomValue = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    deviceId = `web-${randomValue}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const errorCode = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  const normalizePermissions = (permissions: unknown): string[] => {
    if (Array.isArray(permissions)) {
      return permissions.filter((item): item is string => typeof item === 'string');
    }
    if (typeof permissions === 'string') {
      try {
        const parsed = JSON.parse(permissions);
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const normalizeUser = (userData: User): User => ({
    ...userData,
    role: {
      ...userData.role,
      permissions: normalizePermissions((userData.role as any)?.permissions),
    },
  });

  // 登录
  const login = async (username: string, password: string, options: { force?: boolean } = {}) => {
    isLoading.value = true;
    error.value = null;
    errorCode.value = null;
    try {
      const response = await authAPI.login({
        username,
        password,
        force: options.force,
        deviceId: getDeviceId(),
      });
      if (response.success && response.data) {
        token.value = response.data.token;
        user.value = normalizeUser(response.data.user);
        localStorage.setItem('token', response.data.token);
        startSessionMonitor();
        return true;
      } else {
        // 设置错误信息，即使没有抛出异常
        error.value = response.message || '登录失败';
        errorCode.value = response.code || null;
        return false;
      }
    } catch (err: any) {
      error.value = err.message || '登录失败';
      errorCode.value = err.response?.data?.code || null;
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // 注册
  const register = async (username: string, password: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.register({ username, password });
      if (response.success) {
        return true;
      } else {
        // 设置错误信息，即使没有抛出异常
        error.value = response.message || '注册失败';
        return false;
      }
    } catch (err: any) {
      error.value = err.message || '注册失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // 忘记密码
  const verifyForgotPasswordCode = async (username: string, phone: string, verificationCode: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.verifyForgotPasswordCode({ username, phone, verificationCode });
      if (response.success && response.data?.resetToken) {
        return response.data.resetToken;
      }
      error.value = response.message || '身份验证失败';
      return '';
    } catch (err: any) {
      error.value = err.message || '身份验证失败';
      return '';
    } finally {
      isLoading.value = false;
    }
  };

  const forgotPassword = async (resetToken: string, newPassword: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.forgotPassword({ resetToken, newPassword });
      if (response.success) {
        return true;
      } else {
        // 设置错误信息，即使没有抛出异常
        error.value = response.message || '密码重置失败';
        return false;
      }
    } catch (err: any) {
      error.value = err.message || '密码重置失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // 修改密码
  const changePassword = async (oldPassword: string, newPassword: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.changePassword({ oldPassword, newPassword });
      if (response.success) {
        return true;
      } else {
        error.value = response.message || '密码修改失败';
        throw new Error(response.message || '密码修改失败');
      }
    } catch (err: any) {
      error.value = err.message || '密码修改失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 登出
  const logout = () => {
    stopSessionMonitor();
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
  };

  const logoutRemote = async () => {
    try {
      if (token.value) {
        await authAPI.logout();
      }
    } catch {
      // 本地退出优先，远端退出失败不阻塞用户操作。
    } finally {
      logout();
    }
  };

  // 使用token和用户信息直接登录（用于微信扫码登录）
  const loginWithToken = (authToken: string, userData: User) => {
    token.value = authToken;
    user.value = normalizeUser(userData);
    localStorage.setItem('token', authToken);
    startSessionMonitor();
  };

  const handleSessionKicked = async (message = '您的账号已在其他位置登录，当前登录已失效。') => {
    stopSessionMonitor();
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');

    if (sessionKickPromptVisible) return;
    sessionKickPromptVisible = true;
    try {
      await appAlert({
        title: '登录状态已失效',
        message,
        confirmText: '确定',
        variant: 'warning',
        icon: 'warning',
      });
    } finally {
      sessionKickPromptVisible = false;
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
    }
  };

  const checkSessionStatus = async () => {
    if (!token.value || document.hidden) return;
    try {
      const response = await authAPI.checkSessionStatus();
      const status = response.data?.status;
      if (status && status !== 'active') {
        await handleSessionKicked('您的账号已在其他位置登录，当前登录已失效。');
      }
    } catch (err: any) {
      if (err.response?.data?.code === SESSION_KICKED) {
        await handleSessionKicked(err.response.data.message);
      }
    }
  };

  function stopSessionMonitor() {
    if (sessionMonitorTimer) {
      window.clearInterval(sessionMonitorTimer);
      sessionMonitorTimer = null;
    }
  }

  function startSessionMonitor() {
    stopSessionMonitor();
    if (!token.value) return;
    sessionMonitorTimer = window.setInterval(() => {
      void checkSessionStatus();
    }, SESSION_CHECK_INTERVAL_MS);
  }

  // 获取用户信息
  const fetchProfile = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.getProfile();
      if (response.success && response.data) {
        user.value = normalizeUser(response.data);
      }
    } catch (err: any) {
      error.value = err.message;
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      isLoading.value = false;
    }
  };

  // 别名，保持与前端代码一致
  const fetchCurrentUser = fetchProfile;

  // 更新用户资料
  const updateProfile = async (data: {
    username?: string;
    nickname?: string;
    phone?: string;
    email?: string;
    avatar?: string;
    code?: string;
    unbind?: boolean;
  }) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.updateProfile(data);
      if (response.success && response.data) {
        user.value = { ...user.value, ...response.data };
        return true;
      } else {
        error.value = response.message || '更新失败';
        throw new Error(response.message || '更新失败');
      }
    } catch (err: any) {
      error.value = err.message || '更新失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 上传头像
  const uploadAvatar = async (file: File) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.uploadAvatar(file);
      if (response.success && response.data) {
        if (response.data.user) {
          user.value = response.data.user;
        } else if (response.data.avatar) {
          if (user.value) {
            user.value = { ...user.value, avatar: response.data.avatar as string };
          }
        }
        return true;
      }
      error.value = response.message || '上传失败';
      throw new Error(response.message || '上传失败');
    } catch (err: any) {
      error.value = err.message || '上传失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteAvatarHistoryItem = async (avatar: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.deleteAvatarHistoryItem(avatar);
      if (response.success && response.data) {
        user.value = { ...user.value, ...response.data };
        return true;
      }
      error.value = response.message || '删除失败';
      throw new Error(response.message || '删除失败');
    } catch (err: any) {
      error.value = err.message || '删除失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 微信解绑
  const unbindWechat = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.unbindWechat();
      if (response.success && user.value) {
        user.value = {
          ...user.value,
          wechatOpenid: null,
          wechatNickname: null,
          wechatAvatar: null,
        } as User;
        return true;
      }
      return false;
    } catch (err: any) {
      error.value = err.message || '解绑失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // 发送验证码
  const sendVerificationCode = async (phone: string, scene = 'bind_phone', username?: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.sendVerificationCode(phone, scene, username);
      if (response.success) {
        return response;
      }
      error.value = response.message || '发送失败';
      return response;
    } catch (err: any) {
      error.value = err.message || '发送失败';
      return {
        success: false,
        message: error.value,
        data: err.response?.data?.data,
        code: err.response?.data?.code,
      };
    } finally {
      isLoading.value = false;
    }
  };

  // 绑定手机
  const bindPhone = async (phone: string, code: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.updateProfile({ phone, code });
      if (response.success && response.data) {
        user.value = { ...user.value, ...response.data };
        return true;
      } else {
        error.value = response.message || '绑定失败';
        throw new Error(response.message || '绑定失败');
      }
    } catch (err: any) {
      error.value = err.message || '绑定失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 解绑手机
  const unbindPhone = async (phone: string, code: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.updateProfile({ phone, code, unbind: true });
      if (response.success && response.data) {
        user.value = { ...user.value, ...response.data };
        return true;
      } else {
        error.value = response.message || '解绑失败';
        throw new Error(response.message || '解绑失败');
      }
    } catch (err: any) {
      error.value = err.message || '解绑失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 从本地存储恢复认证状态
  const restoreAuth = async () => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      token.value = savedToken;
      await fetchProfile();
      if (token.value) startSessionMonitor();
    }
  };

  return {
    token,
    user,
    isLoading,
    error,
    errorCode,
    isAuthenticated,
    login,
    register,
    logout,
    logoutRemote,
    startSessionMonitor,
    stopSessionMonitor,
    handleSessionKicked,
    fetchProfile,
    fetchCurrentUser,
    restoreAuth,
    loginWithToken,
    updateProfile,
    uploadAvatar,
    deleteAvatarHistoryItem,
    unbindWechat,
    sendVerificationCode,
    bindPhone,
    unbindPhone,
    forgotPassword,
    verifyForgotPasswordCode,
    changePassword,
  };
});
