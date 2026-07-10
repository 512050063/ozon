import request from './request';
import type { ApiResponse } from '@/types';

export interface PaymentRecord {
  id: number;
  userId: number;
  amount: number;
  planType: string;
  status: string;
  paymentMethod?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    username: string;
    nickname?: string;
    phone?: string;
  };
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetPaymentRecordsParams {
  page?: number;
  limit?: number;
  username?: string;
}

export interface CreatePaymentRecordRequest {
  userId?: number;
  amount: number;
  planType: string;
  status?: string;
  paymentMethod?: string;
  transactionId?: string;
}

export interface UpdatePaymentRecordRequest {
  status?: string;
  paymentMethod?: string;
  transactionId?: string;
}

export interface PaymentRecordStats {
  totalCount: number;
  successCount: number;
  totalAmount: number;
  paidUserCount: number;
}

export const paymentRecordAPI = {
  // 管理员获取所有支付记录
  getAllPaymentRecords: async (
    params?: GetPaymentRecordsParams
  ): Promise<
    ApiResponse<{
      data: PaymentRecord[];
      stats: PaymentRecordStats;
      pagination: PaginationInfo;
    }>
  > => {
    const response = await request.get('/payment-records/all', { params });
    return response;
  },

  // 用户获取自己的支付记录
  getMyPaymentRecords: async (
    params?: GetPaymentRecordsParams
  ): Promise<
    ApiResponse<{
      data: PaymentRecord[];
      pagination: PaginationInfo;
    }>
  > => {
    const response = await request.get('/payment-records/my', { params });
    return response;
  },

  // 获取单个支付记录详情
  getPaymentRecordById: async (id: number): Promise<ApiResponse<PaymentRecord>> => {
    const response = await request.get(`/payment-records/${id}`);
    return response;
  },

  // 创建支付记录
  createPaymentRecord: async (data: CreatePaymentRecordRequest): Promise<ApiResponse<PaymentRecord>> => {
    const response = await request.post('/payment-records', data);
    return response;
  },

  // 更新支付记录
  updatePaymentRecord: async (id: number, data: UpdatePaymentRecordRequest): Promise<ApiResponse<PaymentRecord>> => {
    const response = await request.put(`/payment-records/${id}`, data);
    return response;
  },

  // 删除支付记录
  deletePaymentRecord: async (id: number): Promise<ApiResponse<void>> => {
    const response = await request.delete(`/payment-records/${id}`);
    return response;
  },
};
