import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { ApiResponse } from '@/types';
import { appAlert } from '@/utils/appConfirm';

const defaultBaseURL = (import.meta.env as any).DEV ? 'http://localhost:3000/api' : '/api';
const baseURL = (import.meta.env as any).VITE_API_BASE_URL || defaultBaseURL;
const SESSION_KICKED = 'SESSION_KICKED';
let sessionKickPromptVisible = false;

const showSessionKickedPrompt = async (message: string) => {
  localStorage.removeItem('token');
  if (sessionKickPromptVisible) return;
  sessionKickPromptVisible = true;
  try {
    await appAlert({
      title: '登录状态已失效',
      message: message || '您的账号已在其他位置登录，当前登录已失效。',
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

const request: AxiosInstance = axios.create({
  baseURL,
  timeout: 300000, // 5分钟超时，支持大数据同步
});

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 禁用缓存，确保每次都从服务器获取最新数据
    config.headers['Cache-Control'] = 'no-cache';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';

    // 如果是 FormData 类型的请求，不设置 Content-Type，让浏览器自动处理
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 返回 response.data 而不是完整的 response
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;
    return data;
  },
  async (error) => {
    const { response } = error;


    // 401 未授权 - 清除 token 并跳转到登录页
    if (response?.status === 401 && response.data?.code === SESSION_KICKED) {
      void showSessionKickedPrompt(response.data?.message);
    } else if (response?.status === 401) {
      localStorage.removeItem('token');
      // 延迟跳转，让其他处理逻辑先完成
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
    }

    // 不在这里删除token，让业务逻辑（如fetchProfile的catch块）来处理
    // 这样可以确保token的删除逻辑集中管理

    // 正确提取错误消息，防止显示完整的堆栈信息
    let errorMessage = '请求失败';

    if (response?.data) {
      if (typeof response.data === 'string') {
        errorMessage = response.data;
      } else if (response.data.message) {
        errorMessage = response.data.message;
      } else if (response.data.error) {
        errorMessage = response.data.error;
      }
    } else {
      errorMessage = error.message || '请求失败';
    }

    // 保留原始错误的 response 属性，让上层代码能检测 401 状态
    const customError = new Error(errorMessage);
    customError.name = 'ApiError';
    if (response) {
      (customError as any).response = response;
    }
    return Promise.reject(customError);
  }
);

// 创建一个包装函数，确保返回正确的类型
const apiRequest = {
  get: async <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
    return request.get(url, config) as Promise<ApiResponse<T>>;
  },
  post: async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
    return request.post(url, data, config) as Promise<ApiResponse<T>>;
  },
  put: async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
    return request.put(url, data, config) as Promise<ApiResponse<T>>;
  },
  patch: async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
    return request.patch(url, data, config) as Promise<ApiResponse<T>>;
  },
  delete: async <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
    return request.delete(url, config) as Promise<ApiResponse<T>>;
  },
};

export default apiRequest;
