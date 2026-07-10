import request from './request';
import type { ApiResponse } from '@/types';
import { getFullImageUrl } from '@/utils/common';

export interface SupplySource {
  id: number;
  userId: number;
  alibabaOfferId: string;
  subject: string;
  category: string;
  categoryLeaf: string;
  brand: string;
  descriptionCategoryId: number | null;
  typeId: number | null;
  price: number;
  consignPrice: number;
  image: string;
  images: string[] | null;
  detailUrl: string;
  supplierName: string;
  city: string;
  province: string;
  qualityScore: number;
  qualityDetail: any;
  yxScoreLevel: string;
  tradeServices: string[] | null;
  moq: number;
  boundProductCount?: number;
  hasBoundProducts?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplySourcePayload {
  alibabaOfferId: string;
  subject?: string;
  category?: string;
  categoryLeaf?: string;
  brand?: string;
  descriptionCategoryId?: number | null;
  typeId?: number | null;
  price?: number;
  consignPrice?: number;
  image?: string;
  images?: string[];
  detailUrl?: string;
  supplierName?: string;
  city?: string;
  province?: string;
  qualityScore?: number;
  qualityDetail?: any;
  yxScoreLevel?: string;
  tradeServices?: string[];
  moq?: number;
}

export interface SupplySourceListResponse {
  success: boolean;
  data: SupplySource[];
  total: number;
  page: number;
  limit: number;
  message?: string;
}

const normalizeSupplySource = (source: SupplySource | null): SupplySource | null => {
  if (!source) return source;
  return {
    ...source,
    image: getFullImageUrl(source.image) || source.image,
    images: Array.isArray(source.images)
      ? source.images.map(image => getFullImageUrl(image) || image)
      : source.images,
  };
};

export async function getSupplySourceItems(params?: {
  page?: number;
  limit?: number;
  keyword?: string;
}): Promise<SupplySourceListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.keyword) queryParams.set('keyword', params.keyword);

  const response = await request.get(`/supply-sources?${queryParams.toString()}`);
  if (Array.isArray(response.data)) {
    response.data = response.data.map(normalizeSupplySource);
  }
  return response as SupplySourceListResponse;
}

export async function previewSupplySourceUrl(url: string): Promise<ApiResponse<SupplySource>> {
  const response = await request.post('/supply-sources/preview-url', { url });
  if (response.success && response.data) {
    response.data = normalizeSupplySource(response.data);
  }
  return response;
}

export async function importSupplySourceUrl(
  url: string,
  source?: Partial<SupplySourcePayload>
): Promise<ApiResponse<SupplySource>> {
  const response = await request.post('/supply-sources/from-url', { url, source });
  if (response.success && response.data) {
    response.data = normalizeSupplySource(response.data);
  }
  return response;
}

export async function createSupplySourceItem(source: SupplySourcePayload): Promise<ApiResponse<SupplySource>> {
  const response = await request.post('/supply-sources', { source });
  if (response.success && response.data) {
    response.data = normalizeSupplySource(response.data);
  }
  return response;
}

export async function updateSupplySourceItem(
  id: number,
  source: Partial<SupplySourcePayload>
): Promise<ApiResponse<SupplySource>> {
  const response = await request.put(`/supply-sources/${id}`, { source });
  if (response.success && response.data) {
    response.data = normalizeSupplySource(response.data);
  }
  return response;
}

export async function deleteSupplySourceItem(id: number): Promise<ApiResponse<void>> {
  return request.delete(`/supply-sources/${id}`);
}

export const supplySourceAPI = {
  getSupplySourceItems,
  previewSupplySourceUrl,
  importSupplySourceUrl,
  createSupplySourceItem,
  updateSupplySourceItem,
  deleteSupplySourceItem,
};
