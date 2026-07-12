import request from './request';
import type { ApiResponse } from '@/types';

export interface ApiConfig {
  id: number;
  platform: string;
  config: any;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateApiConfigRequest {
  config: any;
  status?: string;
}

export const apiConfigAPI = {
  // 获取所有API配置
  getConfigs: async (): Promise<ApiResponse<ApiConfig[]>> => {
    const response = await request.get('/api-configs');
    return response;
  },

  // 获取单个API配置
  getConfig: async (platform: string): Promise<ApiResponse<ApiConfig>> => {
    const response = await request.get(`/api-configs/${platform}`);
    return response;
  },

  // 更新或创建API配置
  updateConfig: async (platform: string, data: UpdateApiConfigRequest): Promise<ApiResponse<ApiConfig>> => {
    const response = await request.put(`/api-configs/${platform}`, data);
    return response;
  },

  // 删除API配置
  deleteConfig: async (platform: string): Promise<ApiResponse<void>> => {
    const response = await request.delete(`/api-configs/${platform}`);
    return response;
  },

  // 测试API连接
  testConnection: async (platform: string): Promise<ApiResponse<any>> => {
    const response = await request.post(`/api-configs/${platform}/test`);
    return response;
  },

  // 更新Ozon店铺商品类目树（清空现有数据后重新导入）
  updateOzonCategoryTree: async (): Promise<ApiResponse<any>> => {
    const response = await request.post('/ozon/categories/sync');
    return response;
  },

};
