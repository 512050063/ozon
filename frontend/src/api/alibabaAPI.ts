import request from './request';
import type { ApiResponse } from '@/types';

export interface AlibabaProduct {
  id: string;
  productId: string;
  name: string;
  category: string;
  price: string;
  originalPrice: string;
  moq: number;
  minOrder: number;
  supplier: {
    id: string;
    name: string;
    level: string;
    responseRate: string;
  };
  sales: number;
  rating: string;
  shipping: string;
  image: string;
  images: string[];
  location: string;
  isGoldSupplier: boolean;
  isTradeAssurance: boolean;
  deliveryTime: string;
  specs: Array<{ name: string; value: string | string[] }>;
}

export interface AlibabaProductDetail extends Omit<AlibabaProduct, 'shipping'> {
  description: string;
  reviews: number;
  shipping: {
    method: string[];
    freeShippingThreshold: number;
    estimatedDays: string;
  };
  supplier: {
    id: string;
    name: string;
    level: string;
    responseRate: string;
    phone: string;
    contact: string;
    location: string;
    establishedYear: number;
    employeeCount: number;
    certifications: string[];
  };
  variants: Array<{ name: string; options: string[] }>;
  certifications: string[];
  paymentMethods: string[];
  returnPolicy: string;
  isVerified: boolean;
}

export interface SupplierInfo {
  id: string;
  name: string;
  level: string;
  responseRate: string;
  phone: string;
  contact: string;
  location: string;
  establishedYear: number;
  employeeCount: number;
  certifications: string[];
  mainProducts: string[];
  annualRevenue: string;
  exportMarkets: string[];
  goldSupplierSince: number;
  onTimeDeliveryRate: string;
  productQualityRating: string;
}

export interface SearchResult {
  items: AlibabaProduct[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AlibabaAuthStatus {
  hasToken: boolean;
  isExpired: boolean;
  obtainedAt?: string;
  remainingSeconds?: number;
  expiresAt?: string;
}

export interface AlibabaAuthorizeInfo {
  appKey: string;
  redirectUri: string;
  standardUrl: string;
  managedUrl: string;
}

export const alibabaAPI = {
  // 搜索1688货源（关键词搜索）
  searchProducts: async (
    keyword: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: Record<string, any>
  ): Promise<ApiResponse<SearchResult>> => {
    const params: Record<string, any> = { keyword, page, pageSize, ...filters };
    const response = await request.get('/alibaba/search', { params });
    return response;
  },

  // 获取商品详情
  getProductDetail: async (productId: string): Promise<ApiResponse<AlibabaProductDetail>> => {
    const response = await request.get(`/alibaba/products/${productId}`);
    return response;
  },

  // 获取供应商信息
  getSupplierInfo: async (supplierId: string): Promise<ApiResponse<SupplierInfo>> => {
    const response = await request.get(`/alibaba/suppliers/${supplierId}`);
    return response;
  },

  // 批量获取商品信息
  batchGetProducts: async (productIds: string[]): Promise<ApiResponse<any[]>> => {
    const response = await request.post('/alibaba/batch', { productIds });
    return response;
  },

  // 搜同款 - 图片搜索
  searchByImage: async (
    imageUrl?: string,
    imageBase64?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ApiResponse<SearchResult>> => {
    const response = await request.post('/alibaba/search/image', {
      imageUrl,
      imageBase64,
      page,
      pageSize,
    });
    return response;
  },

  // 搜同类 - 基于关键词搜索同类商品
  searchSimilar: async (
    keyword: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ApiResponse<SearchResult>> => {
    const params = { keyword, page, pageSize };
    const response = await request.get('/alibaba/search/similar', { params });
    return response;
  },

  getAuthStatus: async (): Promise<ApiResponse<AlibabaAuthStatus>> => {
    const response = await request.get('/alibaba/auth/status');
    return response;
  },

  getAuthorizeInfo: async (): Promise<ApiResponse<AlibabaAuthorizeInfo>> => {
    const response = await request.get('/alibaba/auth/authorize');
    return response;
  },

  exchangeToken: async (code: string): Promise<ApiResponse<any>> => {
    const response = await request.get(`/alibaba/auth/token?code=${encodeURIComponent(code)}`);
    return response;
  },
};
