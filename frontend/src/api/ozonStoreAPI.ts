import request from './request';
import type { ApiResponse } from '@/types';
import type { OzonStore, OzonStoreContext } from '@/types';

export interface CreateOzonStoreRequest {
  apiUrl?: string;
  clientId: string;
  apiKey: string;
}

export interface UpdateOzonStoreRequest {
  apiUrl?: string;
  clientId: string;
  apiKey: string;
}

export interface OzonPushConfig {
  storeId: number;
  pushEnabled: boolean;
  pushUrl: string;
  pushSecretCreatedAt: string | null;
}

export const ozonStoreAPI = {
  // 获取所有Ozon店铺
  getStores: async (): Promise<ApiResponse<OzonStore[]>> => {
    const response = await request.get('/ozon/stores');
    return response;
  },

  // 获取当前店铺上下文
  getStoreContext: async (): Promise<ApiResponse<OzonStoreContext>> => {
    const response = await request.get('/ozon/stores/context/current');
    return response;
  },

  // 设置当前操作店铺
  setCurrentStore: async (id: number): Promise<ApiResponse<OzonStoreContext>> => {
    const response = await request.post(`/ozon/stores/${id}/current`);
    return response;
  },

  // 获取单个Ozon店铺
  getStore: async (id: number): Promise<ApiResponse<OzonStore>> => {
    const response = await request.get(`/ozon/stores/${id}`);
    return response;
  },

  // 创建Ozon店铺
  createStore: async (data: CreateOzonStoreRequest): Promise<ApiResponse<OzonStore>> => {
    const response = await request.post('/ozon/stores', data);
    return response;
  },

  // 删除Ozon店铺
  deleteStore: async (id: number): Promise<ApiResponse<void>> => {
    const response = await request.delete(`/ozon/stores/${id}`);
    return response;
  },

  // 更新Ozon店铺
  updateStore: async (id: number, data: UpdateOzonStoreRequest): Promise<ApiResponse<OzonStore>> => {
    const response = await request.put(`/ozon/stores/${id}`, data);
    return response;
  },

  // 获取 Ozon 推送地址配置
  getPushConfig: async (id: number): Promise<ApiResponse<OzonPushConfig>> => {
    const response = await request.get(`/ozon/stores/${id}/push-config`);
    return response;
  },

  // 重置 Ozon 推送密钥
  resetPushSecret: async (id: number): Promise<ApiResponse<OzonPushConfig>> => {
    const response = await request.post(`/ozon/stores/${id}/push-secret/reset`);
    return response;
  },

  // 测试连接
  testConnection: async (data: { apiUrl?: string; clientId: string; apiKey: string }): Promise<ApiResponse<any>> => {
    const response = await request.post('/ozon/stores/test-connection', data);
    return response;
  },

  // 获取同步日志
  getSyncLogs: async (storeId: number, page: number = 1, pageSize: number = 10): Promise<ApiResponse<any>> => {
    const response = await request.get(`/ozon/stores/${storeId}/sync-logs?page=${page}&pageSize=${pageSize}`);
    return response;
  },

  // 获取 Ozon 错误码映射表
  getErrorCodes: async (): Promise<ApiResponse<any[]>> => {
    const response = await request.get('/ozon/stores/error-codes');
    return response;
  },

  // 翻译单个错误码
  translateError: async (code: string, message?: string): Promise<ApiResponse<any>> => {
    const response = await request.post('/ozon/stores/translate-error', { code, message });
    return response;
  },

  // 批量翻译并缓存 Ozon 错误/状态提示
  translateErrors: async (items: Array<{ code?: string; message?: string; level?: string }>): Promise<ApiResponse<any[]>> => {
    const response = await request.post('/ozon/stores/translate-errors', { items });
    return response;
  },
};
