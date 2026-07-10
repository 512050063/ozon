import request from './request';
import type { ApiResponse } from '@/types';
import { getFullImageUrl } from '@/utils/common';

export interface ProductSelection {
  id: number;
  userId: number;
  name: string;
  ozonId: string;
  category: string;
  categoryLeaf?: string;
  descriptionCategoryId?: number | null;
  typeId?: number | null;
  brand: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  sales: number;
  stock: number;
  reviews: number;
  imageUrl?: string;
  productUrl?: string;
  status: string;
  categoryVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSelectionListResponse {
  data: ProductSelection[];
  total: number;
  page: number;
  limit: number;
}

const normalizeProductSelection = (product: ProductSelection): ProductSelection => ({
  ...product,
  imageUrl: getFullImageUrl(product.imageUrl) || product.imageUrl,
});

export async function createProductSelection(data: {
  name: string;
  ozonId: string;
  category?: string;
  categoryLeaf?: string;
  descriptionCategoryId?: number | null;
  typeId?: number | null;
  brand?: string;
  price?: number;
  originalPrice?: number;
  discount?: number;
  rating?: number;
  sales?: number;
  stock?: number;
  reviews?: number;
  imageUrl?: string;
  productUrl?: string;
}): Promise<ApiResponse<ProductSelection>> {
  const response = await request.post('/product-selection/products/selection', data);
  if (response.success && response.data) {
    response.data = normalizeProductSelection(response.data);
  }
  return response;
}

export async function getProductSelections(params?: {
  page?: number;
  limit?: number;
  keyword?: string;
  category?: string;
}): Promise<ApiResponse<ProductSelectionListResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.keyword) queryParams.set('keyword', params.keyword);
  if (params?.category) queryParams.set('category', params.category);

  const url = queryParams.toString()
    ? `/product-selection/products/selection?${queryParams.toString()}`
    : '/product-selection/products/selection';
  const response = await request.get<any>(url);

  if (response.success && Array.isArray(response.data)) {
    return {
      ...response,
      data: {
        data: response.data.map(normalizeProductSelection),
        total: response.total ?? response.data.length,
        page: response.page ?? params?.page ?? 1,
        limit: response.limit ?? params?.limit ?? response.data.length,
      },
    };
  }

  if (response.success && response.data?.data) {
    response.data.data = response.data.data.map(normalizeProductSelection);
  }

  return response;
}

export async function getProductSelectionById(id: number): Promise<ApiResponse<ProductSelection>> {
  const response = await request.get(`/product-selection/products/selection/${id}`);
  if (response.success && response.data) {
    response.data = normalizeProductSelection(response.data);
  }
  return response;
}

export async function updateProductSelection(
  id: number,
  data: {
    name?: string;
    category?: string;
    categoryLeaf?: string;
    descriptionCategoryId?: number | null;
    typeId?: number | null;
    brand?: string;
    price?: number;
    originalPrice?: number;
    discount?: number;
    rating?: number;
    sales?: number;
    imageUrl?: string;
    productUrl?: string;
    status?: string;
    categoryVerified?: boolean;
  }
): Promise<ApiResponse<ProductSelection>> {
  const response = await request.put(`/product-selection/products/selection/${id}`, data);
  if (response.success && response.data) {
    response.data = normalizeProductSelection(response.data);
  }
  return response;
}

export async function deleteProductSelection(id: number): Promise<ApiResponse<void>> {
  const response = await request.delete(`/product-selection/products/selection/${id}`);
  return response;
}

export const productSelectionAPI = {
  createProductSelection,
  getProductSelections,
  getProductSelectionById,
  updateProductSelection,
  deleteProductSelection,
};
