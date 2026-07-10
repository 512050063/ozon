import request from './request';
import type { ApiResponse } from '@/types';

export interface ExtractTypeResult {
  type: string;
  source?: string;
  title?: string;
}

export interface BatchExtractResult {
  total: number;
  started: boolean;
}

export interface BatchStatusResult {
  total: number;
  done: number;
  pending: number;
  error: number;
  running: boolean;
  results: Array<{ url: string; type: string; title?: string; status: string }>;
}

/**
 * 提取Ozon商品类型（单个，兼容旧接口）
 * @param productUrl - 商品链接
 * @returns 商品类型信息
 */
export async function extractProductType(productUrl: string): Promise<ApiResponse<ExtractTypeResult>> {
  const response = await request.post('/ozon/type/extract-type', { productUrl });
  return response;
}

/**
 * 批量提取商品类型（异步，立即返回）
 * @param urls - 商品链接数组
 * @returns { total, started }
 */
export async function batchExtractTypes(urls: string[], titles?: Record<string, string>): Promise<ApiResponse<BatchExtractResult>> {
  const response: any = await request.post('/ozon/type/batch-extract', { urls, titles });
  return {
    ...response,
    data: response.data || {
      total: response.total || 0,
      started: Boolean(response.started),
    },
  };
}

/**
 * 查询批量提取进度
 */
export async function getBatchExtractStatus(): Promise<ApiResponse<BatchStatusResult>> {
  const response: any = await request.get('/ozon/type/batch-status');
  return {
    ...response,
    data: response.data || {
      total: response.total || 0,
      done: response.done || 0,
      pending: Math.max((response.total || 0) - (response.done || 0) - (response.error || 0), 0),
      error: response.error || 0,
      running: Boolean(response.running),
      results: response.results || [],
    },
  };
}

/**
 * 强制重置批量提取状态（清理卡住的任务）
 */
export async function resetBatchExtractStatus(): Promise<ApiResponse<{ message: string }>> {
  const response = await request.post('/ozon/type/reset-batch');
  return response;
}

export const ozonTypeAPI = {
  extractProductType,
  batchExtractTypes,
  getBatchExtractStatus,
  resetBatchExtractStatus,
};
