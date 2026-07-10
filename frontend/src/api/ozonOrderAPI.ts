import request from './request';
import type { ApiResponse } from '@/types';

export interface OzonOrder {
  id?: number;
  postingNumber: string;
  orderId?: string;
  status: string;
  substatus?: string;
  inProcessAt?: string | null;
  shipmentDate?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  orderCreatedAt?: string | null;
  estimatedDeliveryDate?: string | null;
  trackingNumber?: string;
  deliveryService?: string;
  tplIntegrationType?: string;
  isExpress?: boolean;
  multiBoxQty?: number;
  cancellation?: any;
  customerName?: string;
  customerId?: string;
  deliveryMethod?: string;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  products: Array<{
    sku: string;
    name: string;
    quantity: number;
    price: string;
    image?: string;
  }>;
  totalPrice: string;
  raw?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface OzonOrderListResponse {
  orders: OzonOrder[];
  total: number;
  hasNext: boolean;
  counts?: Record<string, number>;
  lastUpdateTime?: string | null;
}

export interface OzonSyncLog {
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

export interface OzonSyncLogListResponse {
  list: OzonSyncLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OzonCancelReason {
  id: number;
  name: string;
}

export const ozonOrderAPI = {
  getOrders: async (
    storeId: number,
    params: { status?: string; since?: string; to?: string; keyword?: string; limit?: number; offset?: number } = {}
  ): Promise<ApiResponse<OzonOrderListResponse>> => {
    const response = await request.get(`/ozon/orders/${storeId}`, { params });
    return response;
  },

  getOrderDetail: async (storeId: number, postingNumber: string): Promise<ApiResponse<OzonOrder>> => {
    const response = await request.get(`/ozon/orders/${storeId}/${postingNumber}`);
    return response;
  },

  getCancelReasons: async (storeId: number, postingNumber: string): Promise<ApiResponse<OzonCancelReason[]>> => {
    const response = await request.get(`/ozon/orders/${storeId}/${encodeURIComponent(postingNumber)}/cancel-reasons`);
    return response;
  },

  preparePosting: async (storeId: number, postingNumber: string): Promise<ApiResponse<OzonOrder>> => {
    const response = await request.post(`/ozon/orders/${storeId}/${encodeURIComponent(postingNumber)}/prepare`);
    return response;
  },

  cancelPosting: async (
    storeId: number,
    postingNumber: string,
    payload: { cancelReasonId: number; cancelReasonMessage?: string }
  ): Promise<ApiResponse<OzonOrder>> => {
    const response = await request.post(`/ozon/orders/${storeId}/${encodeURIComponent(postingNumber)}/cancel`, payload);
    return response;
  },

  syncOrders: async (storeId: number): Promise<ApiResponse<any>> => {
    const response = await request.post(`/ozon/orders/${storeId}/sync`);
    return response;
  },

  getSyncLogs: async (storeId: number, page = 1, pageSize = 10): Promise<ApiResponse<OzonSyncLogListResponse>> => {
    const response = await request.get(`/ozon/orders/${storeId}/sync-logs?page=${page}&pageSize=${pageSize}`);
    return response;
  },
};
