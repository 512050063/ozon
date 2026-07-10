import request from './request';
import type { ApiResponse } from '@/types';

export interface OzonPromotion {
  id: number;
  title: string;
  date_start?: string;
  date_end?: string;
  is_participating?: boolean;
  potential_products_count?: number;
  participating_products_count?: number;
  banned_products_count?: number;
  action_type?: string;
  discount_type?: string;
  discount_value?: number;
  description?: string;
  [key: string]: any;
}

export interface OzonPromotionProduct {
  id: number;
  productId: string;
  offerId?: string;
  sku?: string;
  name?: string;
  category?: string;
  categoryLeaf?: string;
  image?: string;
  price?: number;
  actionPrice?: number;
  maxActionPrice?: number;
  stock?: number;
  minStock?: number;
  raw?: any;
  [key: string]: any;
}

export interface OzonPromotionListResponse {
  actions: OzonPromotion[];
  total: number;
  raw?: any;
}

export interface OzonPromotionProductsResponse {
  products: OzonPromotionProduct[];
  total: number;
  raw?: any;
}

export interface OzonPromotionSyncLog {
  id: number;
  syncType: string;
  status: string;
  syncedCount: number;
  updatedCount: number;
  deletedCount: number;
  message: string;
  userName: string;
  storeName: string;
  createdAt: string;
}

export interface OzonPromotionSyncLogListResponse {
  list: OzonPromotionSyncLog[];
  total: number;
  page: number;
  pageSize: number;
}

export const ozonPromotionAPI = {
  getPromotions: async (
    storeId: number,
    params: { sync?: boolean } = {},
  ): Promise<ApiResponse<OzonPromotionListResponse>> => {
    return request.get(`/ozon/promotions/${storeId}`, { params });
  },

  getSyncLogs: async (
    storeId: number,
    page = 1,
    pageSize = 10,
  ): Promise<ApiResponse<OzonPromotionSyncLogListResponse>> => {
    return request.get(`/ozon/promotions/${storeId}/sync-logs`, { params: { page, pageSize } });
  },

  getPromotionProducts: async (
    storeId: number,
    actionId: number,
    params: { limit?: number; offset?: number } = {},
  ): Promise<ApiResponse<OzonPromotionProductsResponse>> => {
    return request.get(`/ozon/promotions/${storeId}/${actionId}/products`, { params });
  },

  getPromotionCandidates: async (
    storeId: number,
    actionId: number,
    params: { limit?: number; offset?: number } = {},
  ): Promise<ApiResponse<OzonPromotionProductsResponse>> => {
    return request.get(`/ozon/promotions/${storeId}/${actionId}/candidates`, { params });
  },

  activateProduct: async (
    storeId: number,
    actionId: number,
    payload: { productId: number; actionPrice: number; stock?: number },
  ): Promise<ApiResponse<any>> => {
    return request.post(`/ozon/promotions/${storeId}/${actionId}/products`, payload);
  },

  deactivateProduct: async (
    storeId: number,
    actionId: number,
    productId: number,
  ): Promise<ApiResponse<any>> => {
    return request.delete(`/ozon/promotions/${storeId}/${actionId}/products/${productId}`);
  },
};
