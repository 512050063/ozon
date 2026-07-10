import request from './request';
import type { ApiResponse } from '@/types';
import { getFullImageUrl } from '@/utils/common';

export interface Image {
  id: number;
  userId: number;
  bizType: 'avatar' | 'product';
  provider: 'local';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isUsed?: boolean; // 图片是否被使用
}

type ImageSource = 'local';

export interface ImageStats {
  total: number;
  todayCount: number;
  totalSize: number;
  totalStorage: number;
  usedStorage: number;
  availableStorage: number;
}

export interface ImageListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  source?: ImageSource;
  bizType?: 'avatar' | 'product';
  usedStatus?: 'used' | 'unused';
}

export interface ImageListResponse {
  images: Image[];
  total: number;
  page: number;
  pageSize: number;
}

const API_BASE = '/images';

const normalizeImage = (image: Image): Image => ({
  ...image,
  fileUrl: getFullImageUrl(image.fileUrl) || image.fileUrl,
  thumbnailUrl: getFullImageUrl(image.thumbnailUrl) || image.thumbnailUrl,
});

export const getImages = async (params?: ImageListParams): Promise<ApiResponse<ImageListResponse>> => {
  const response = await request.get(API_BASE, { params });
  if (response.success && response.data?.images) {
    response.data.images = response.data.images.map(normalizeImage);
  }
  return response;
};

export const getImageStats = async (params?: { source?: ImageSource; bizType?: 'avatar' | 'product' }): Promise<ApiResponse<ImageStats>> => {
  return request.get(`${API_BASE}/stats`, { params });
};

export const uploadImage = async (
  file: File,
  source: ImageSource = 'local',
  bizType: 'avatar' | 'product' = 'product',
): Promise<ApiResponse<Image>> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bizType', bizType);

  const response = await request.post(`${API_BASE}/upload?source=${source}`, formData);
  if (response.success && response.data) {
    response.data = normalizeImage(response.data);
  }
  return response;
};

export const deleteImage = async (id: number, source: ImageSource = 'local'): Promise<ApiResponse<void>> => {
  return request.delete(`${API_BASE}/${id}?source=${source}`);
};

export const batchDeleteImages = async (ids: number[], source: ImageSource = 'local'): Promise<ApiResponse<void>> => {
  return request.delete(`${API_BASE}/batch?source=${source}`, {
    data: { ids },
  });
};

// 检查图片是否被使用
export const checkImageUsage = async (id: number): Promise<ApiResponse<{ isUsed: boolean }>> => {
  return request.get(`${API_BASE}/${id}/usage`);
};

// 批量检查图片是否被使用
export const checkBatchImageUsage = async (ids: number[]): Promise<ApiResponse<Array<{ imageId: number; isUsed: boolean }>>> => {
  return request.post(`${API_BASE}/batch/usage`, { ids });
};










