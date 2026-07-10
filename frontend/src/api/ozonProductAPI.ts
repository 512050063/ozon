import request from './request';
import type { ApiResponse } from '@/types';

export interface OzonProductLimitBucket {
  limit: number | null;
  used: number | null;
  remaining: number | null;
  resetAt: string | null;
}

export interface OzonProductLimits {
  total: OzonProductLimitBucket;
  dailyCreate: OzonProductLimitBucket;
  dailyUpdate: OzonProductLimitBucket;
  operationLimits: Array<OzonProductLimitBucket & { type: string; raw: any }>;
  raw: any;
}

export const ozonProductAPI = {
  // 获取产品ID列表（旧方法，保留兼容性）
  getProductIdsByStoreId: async (storeId: number, limit?: number, offset?: number): Promise<ApiResponse<number[]>> => {
    const params: Record<string, any> = {};
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;
    const response = await request.get(`/ozon/stores/${storeId}/product-ids`, { params });
    return response;
  },

  // 获取产品详情列表（旧方法，保留兼容性）
  getProductDetailsByStoreId: async (
    storeId: number,
    productIds: number[],
    offset?: number,
    limit?: number
  ): Promise<ApiResponse<any[]>> => {
    const response = await request.post(`/ozon/stores/${storeId}/product-details`, {
      productIds,
      offset,
      limit,
    });
    return response;
  },

  // 同步产品到本地数据库
  syncProducts: async (storeId: number): Promise<ApiResponse<any>> => {
    const response = await request.post(`/ozon/stores/${storeId}/sync-products`);
    return response;
  },

  // 获取本地数据库中的产品列表（带分页）
  getLocalProducts: async (
    storeId: number,
    page: number = 1,
    pageSize: number = 6,
    keyword: string = '',
    status: string = 'all'
  ): Promise<ApiResponse<any>> => {
    const params: Record<string, any> = { page, pageSize };
    if (keyword) params.keyword = keyword;
    if (status && status !== 'all') params.status = status;
    const response = await request.get(`/ozon/stores/${storeId}/local-products`, { params });
    return response;
  },

  // 获取 Ozon 商品创建/更新额度
  getProductLimits: async (storeId: number): Promise<ApiResponse<OzonProductLimits>> => {
    const response = await request.get(`/ozon/stores/${storeId}/product-limits`);
    return response;
  },

  // 删除本地数据库中的产品
  deleteLocalProduct: async (storeId: number, productId: number): Promise<ApiResponse<any>> => {
    const response = await request.delete(`/ozon/stores/${storeId}/local-products/${productId}`);
    return response;
  },

  // 一键上架商品到Ozon
  listProduct: async (
    storeId: number,
    productId: number,
    price?: number,
    stock?: number
  ): Promise<ApiResponse<any>> => {
    const response = await request.post(`/ozon/stores/${storeId}/list-product`, {
      productId,
      price,
      stock,
    });
    return response;
  },

  // 更新Ozon商品价格（支持4个价格字段）
  updatePrice: async (
    storeId: number,
    productId: string,
    price: number,
    currencyCode?: string,
    oldPrice?: number,
    minPrice?: number,
    premiumPrice?: number
  ): Promise<ApiResponse<any>> => {
    const response = await request.put(`/ozon/stores/${storeId}/products/${productId}/price`, {
      price,
      currencyCode,
      oldPrice,
      minPrice,
      premiumPrice,
    });
    return response;
  },

  // 更新Ozon商品库存（支持双仓库）
  updateStock: async (storeId: number, productId: string, stock: number, fboStock?: number): Promise<ApiResponse<any>> => {
    const response = await request.put(`/ozon/stores/${storeId}/products/${productId}/stock`, {
      stock,
      fboStock,
    });
    return response;
  },

  // 归档Ozon商品
  archiveProduct: async (storeId: number, productId: string): Promise<ApiResponse<any>> => {
    const response = await request.post(`/ozon/stores/${storeId}/products/${productId}/archive`);
    return response;
  },

  // 取消归档Ozon商品
  unarchiveProduct: async (storeId: number, productId: string): Promise<ApiResponse<any>> => {
    const response = await request.post(`/ozon/stores/${storeId}/products/${productId}/unarchive`);
    return response;
  },

  // 更新Ozon商品信息（名称、描述、图片、属性、价格等）
  updateProduct: async (storeId: number, productId: string, productData: Record<string, any>): Promise<ApiResponse<any>> => {
    const response = await request.put(`/ozon/stores/${storeId}/products/${productId}`, productData);
    return response;
  },

  // 同步库存从Ozon到本地
  syncStock: async (storeId: number): Promise<ApiResponse<any>> => {
    const response = await request.post(`/ozon/stores/${storeId}/sync-stock`);
    return response;
  },

  // 获取单个商品详情（从Ozon API）
  getProductDetail: async (storeId: number, productId: string): Promise<ApiResponse<any>> => {
    const response = await request.get(`/ozon/stores/${storeId}/products/${productId}/detail`);
    return response;
  },

  // 操作前校验商品是否仍存在，并刷新本地快照
  validateProduct: async (storeId: number, productId: string): Promise<ApiResponse<any>> => {
    const response = await request.post(`/ozon/stores/${storeId}/products/${productId}/validate`);
    return response;
  },

  // 获取最后商品同步更新时间
  getLastUpdateTime: async (storeId: number): Promise<ApiResponse<any>> => {
    return request.get(`/ozon/stores/${storeId}/local-products`, {
      params: { page: 1, pageSize: 1 }
    });
  },

  // 解析当前页商品名称中文翻译（数据库持久缓存 + 月度额度控制）
  resolveProductNameTranslations: async (texts: string[]): Promise<ApiResponse<any>> => {
    return request.post('/translations/product-names/resolve', {
      texts,
      sourceLang: 'ru',
      targetLang: 'zh',
    });
  },
};

// 保存分析商品到数据库
export async function saveOzonProduct(data: Record<string, any>): Promise<ApiResponse<any>> {
  const response = await request.post('/ozon/products/save', data);
  return response;
}
