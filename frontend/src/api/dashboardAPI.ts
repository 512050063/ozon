import request from './request';
import type { ApiResponse } from '@/types';

export type DashboardProductStatus = 'selling' | 'pending' | 'error' | 'archived' | 'autoArchived';

export interface DashboardSummary {
  stats: {
    productSupplyTotal: number;
    averageProductPrice: number;
    storeCount: number;
    totalSalesAmount: number;
    currency: string;
  };
  orderTrend: Array<{
    date: string;
    label: string;
    orderCount: number;
    salesAmount: number;
  }>;
  productStatus: Record<DashboardProductStatus, number>;
  recentSyncLogs: Array<{
    id: number;
    syncType: string;
    status: string;
    message: string;
    storeName: string;
    operatorName: string;
    createdAt: string;
  }>;
  actionItems: Array<{
    key: string;
    label: string;
    value: number;
    description: string;
    level: 'info' | 'warning' | 'danger';
  }>;
  updatedAt: string;
}

export const dashboardAPI = {
  getSummary: async (): Promise<ApiResponse<DashboardSummary>> => {
    return request.get('/dashboard/summary');
  },
};
