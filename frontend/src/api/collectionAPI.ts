import request from './request';
import type { ApiResponse } from '@/types';
import type { CollectionItem } from '@/types/warehouse';

export interface CreateCollectionItemRequest {
  name: string;
  description?: string;
  image?: string;
  category?: string;
  brand?: string;
  modelName?: string;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  grossWeight?: number;
  alibabaId: string;
  supplier?: string;
  price: number;
}

export interface UpdateCollectionItemRequest {
  name?: string;
  description?: string;
  image?: string;
  category?: string;
  brand?: string;
  modelName?: string;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  grossWeight?: number;
  alibabaId?: string;
  supplier?: string;
  price?: number;
  isProcessed?: boolean;
}

export const collectionAPI = {
  // 获取采集库列表
  getCollectionItems: async (): Promise<ApiResponse<CollectionItem[]>> => {
    const response = await request.get('/collection');
    return response;
  },

  // 获取单个采集库商品
  getCollectionItem: async (id: number): Promise<ApiResponse<CollectionItem>> => {
    const response = await request.get(`/collection/${id}`);
    return response;
  },

  // 创建采集库商品
  createCollectionItem: async (data: CreateCollectionItemRequest): Promise<ApiResponse<CollectionItem>> => {
    const response = await request.post('/collection', data);
    return response;
  },

  // 更新采集库商品
  updateCollectionItem: async (id: number, data: UpdateCollectionItemRequest): Promise<ApiResponse<CollectionItem>> => {
    const response = await request.put(`/collection/${id}`, data);
    return response;
  },

  // 删除采集库商品
  deleteCollectionItem: async (id: number): Promise<ApiResponse<void>> => {
    const response = await request.delete(`/collection/${id}`);
    return response;
  },

  // 商品入库
  moveToProductLibrary: async (id: number): Promise<ApiResponse<CollectionItem>> => {
    const response = await request.post(`/collection/${id}/move`);
    return response;
  },
};
