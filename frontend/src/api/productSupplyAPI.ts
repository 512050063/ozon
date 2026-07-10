import request from './request';
import type { ApiResponse } from '@/types';
import { getFullImageUrl } from '@/utils/common';
import type { OzonStore } from '@/types';
import type { PricingStrategy } from './pricingAPI';

// 1688货源信息
export interface SupplySource {
  id: number;
  userId: number;
  alibabaOfferId: string;
  subject: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface ProductSupplyItem {
  id: number;
  userId: number;
  name: string;
  category: string;
  categoryLeaf?: string;
  brand: string;
  modelName: string;
  offerId: string | null;
  sku: string | null;
  alibabaId: string | null;
  supplier: string;
  price: number;
  oldPrice: number | null;
  packageLength: number | null;
  packageWidth: number | null;
  packageHeight: number | null;
  grossWeight: number | null;
  status: string;
  imageUrl: string;
  images?: any[] | null;
  ozonCategoryId: number | null;
  barcode: string | null;
  descriptionCategoryId: number | null;
  typeId: number | null;
  attributes?: Record<string, any> | null;
  variantAttributes?: any[] | null;
  hiddenAttributes?: Record<string, any> | null;
  templateSnapshot?: ProductSupplyTemplate | null;
  variantSummary?: string | null;
  description: string;
  supplySourceId: number | null;
  supplySource: SupplySource | null;
  ozonTaskId: string | null;
  listingError: string | null;
  lastListingStoreId?: number | null;
  lastPricingStrategyId?: number | null;
  lastListingFinalPrice?: number | null;
  listingCheckSummary?: any;
  listingSubmittedAt: string | null;
  listedAt: string | null;
  listingReady?: boolean;
  listingMissingFields?: string[] | null;
  listingValidationMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductTemplateAttributeValue {
  id?: number;
  valueId?: number;
  value: string;
  [key: string]: any;
}

export interface ProductTemplateAttribute {
  id: number;
  name: string;
  description: string;
  type: 'string' | 'textarea' | 'select' | 'number' | 'boolean';
  is_required: boolean;
  dictionary_id: number;
  group_id: number | null;
  group_name: string | null;
  is_collection: boolean;
  is_dependent: boolean;
  is_aspect?: boolean;
  category_dependent?: boolean;
  attribute_complex_id?: number;
  complex_is_collection?: boolean;
  precision: number | null;
  max_value_count?: number | null;
  values?: ProductTemplateAttributeValue[];
  section: 'variant' | 'hidden';
  displaySection?: 'commonVariant' | 'sku' | 'hidden';
  isSkuDimension: boolean;
}

export interface ProductSupplyTemplate {
  descriptionCategoryId: number;
  typeId: number | null;
  language: string;
  variantAttributes: ProductTemplateAttribute[];
  commonVariantAttributes?: ProductTemplateAttribute[];
  hiddenAttributes: ProductTemplateAttribute[];
  skuDimensionCandidates: ProductTemplateAttribute[];
  requiredAttributeIds: number[];
  rawAttributes: any[];
  source: 'cache' | 'ozon' | 'generated';
  cachedAt: string;
}

export interface ProductSupplySkuPayload {
  offerId: string;
  sku: string;
  barcode?: string;
  price: number;
  oldPrice?: number | null;
  variantAttributes: Array<{
    attributeId: number;
    name: string;
    value: string;
    valueId?: number;
  }>;
  attributes: Record<string, any>;
}

export interface ProductSupplyBatchCreatePayload {
  base: {
    name: string;
    category: string;
    categoryLeaf?: string;
    brand: string;
    modelName: string;
    description: string;
    imageUrl: string;
    images: any[];
    price: number;
    oldPrice?: number | null;
    packageLength?: number | null;
    packageWidth?: number | null;
    packageHeight?: number | null;
    grossWeight?: number | null;
    descriptionCategoryId?: number | null;
    typeId?: number | null;
    attributes: Record<string, any>;
    hiddenAttributes: Record<string, any>;
  };
  skus: ProductSupplySkuPayload[];
  templateSnapshot?: ProductSupplyTemplate | null;
}

export interface ProductSupplyListResponse {
  success: boolean;
  data: ProductSupplyItem[];
  total: number;
  stats?: {
    total: number;
    pending: number;
    listing: number;
    pendingAndListing: number;
    listed: number;
    failed: number;
  };
  page: number;
  limit: number;
}

export interface SupplySourceListResponse {
  success: boolean;
  data: SupplySource[];
  total: number;
  page: number;
  limit: number;
  message?: string;
}

export interface ProductSupplyListingCheck {
  key: string;
  group: '基础信息' | '尺寸重量' | '模板信息' | '上架参数';
  label: string;
  status: 'pass' | 'warning' | 'error';
  message: string;
}

export interface ProductSupplyListingPricing {
  productPrice: number;
  suggestedPrice: number;
  finalPrice: number | null;
  currencyCode: string;
  strategyId: number | null;
  strategyName: string;
  breakdown: Array<{
    key: string;
    label: string;
    amount: number;
  }>;
}

export interface ProductSupplyListingPreview {
  product: ProductSupplyItem;
  stores: Pick<OzonStore, 'id' | 'name' | 'status'>[];
  pricingStrategies: PricingStrategy[];
  pricing: ProductSupplyListingPricing;
  checks: ProductSupplyListingCheck[];
  canSubmit: boolean;
  blockingCount: number;
  warningCount: number;
}

export interface ProductSupplyListingPayload {
  storeId: number;
  pricingStrategyId: number;
  finalPrice: number;
}

const normalizeImageList = (images?: any[] | null) => {
  if (!Array.isArray(images)) {
    return images;
  }

  return images.map(item => {
    if (typeof item === 'string') {
      return getFullImageUrl(item) || item;
    }

    if (item && typeof item === 'object') {
      return {
        ...item,
        fileUrl: getFullImageUrl(item.fileUrl) || item.fileUrl,
        url: getFullImageUrl(item.url) || item.url,
        imageUrl: getFullImageUrl(item.imageUrl) || item.imageUrl,
      };
    }

    return item;
  });
};

const normalizeSupplySource = (source: SupplySource | null): SupplySource | null => {
  if (!source) {
    return source;
  }

  return {
    ...source,
    image: getFullImageUrl(source.image) || source.image,
    images: Array.isArray(source.images)
      ? source.images.map(image => getFullImageUrl(image) || image)
      : source.images,
  };
};

const normalizeListingError = (error: unknown): string | null => {
  if (error === null || error === undefined || error === '') return null;
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (trimmed === '[object Object]') {
      return '历史错误信息无法解析，请重新查询状态或重新提交后查看最新错误原因';
    }
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return normalizeListingError(JSON.parse(trimmed));
      } catch {
        return error;
      }
    }
    return error;
  }
  if (Array.isArray(error)) {
    return error.map(normalizeListingError).filter(Boolean).join('; ') || null;
  }
  if (typeof error === 'object') {
    const value = error as Record<string, any>;
    const directMessage = value.message || value.error || value.reason || value.description || value.detail;
    if (directMessage) return normalizeListingError(directMessage);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(error);
};

const normalizeProductSupplyItem = (item: ProductSupplyItem): ProductSupplyItem => ({
  ...item,
  imageUrl: getFullImageUrl(item.imageUrl) || item.imageUrl,
  images: normalizeImageList(item.images),
  supplySource: normalizeSupplySource(item.supplySource),
  listingError: normalizeListingError(item.listingError),
});

// 创建时的货源数据格式
export interface CreateSourceData {
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

export type UpdateSupplySourceData = CreateSourceData;

export async function createProductSupplyItem(data: {
  name: string;
  category?: string;
  categoryLeaf?: string;
  brand?: string;
  modelName?: string;
  offerId?: string;
  sku?: string;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string;
  ozonCategoryId?: number;
  description?: string;
  barcode?: string;
  descriptionCategoryId?: number | null;
  typeId?: number | null;
  images?: any[];
  attributes?: Record<string, any>;
  variantAttributes?: any[];
  hiddenAttributes?: Record<string, any>;
  templateSnapshot?: ProductSupplyTemplate | null;
  variantSummary?: string | null;
  source?: CreateSourceData;
} | ProductSupplyBatchCreatePayload): Promise<ApiResponse<ProductSupplyItem | ProductSupplyItem[]>> {
  const response = await request.post('/product-supply', data);
  if (response.success && response.data) {
    response.data = Array.isArray(response.data)
      ? response.data.map(normalizeProductSupplyItem)
      : normalizeProductSupplyItem(response.data);
  }
  return response;
}

export async function getProductSupplyTemplate(params: {
  descriptionCategoryId: number;
  typeId?: number | null;
  language?: string;
  forceRefresh?: boolean;
  cacheOnly?: boolean;
}): Promise<ApiResponse<ProductSupplyTemplate | null>> {
  const response = await request.get('/product-supply/templates', { params });
  return response;
}

export async function getProductSupplyItems(params?: {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: string;
}): Promise<ProductSupplyListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.keyword) queryParams.set('keyword', params.keyword);
  if (params?.status) queryParams.set('status', params.status);

  const response = await request.get(`/product-supply?${queryParams.toString()}`);
  if (Array.isArray(response.data)) {
    response.data = response.data.map(normalizeProductSupplyItem);
  }
  return response;
}

export async function getProductSupplyItemById(id: number): Promise<ApiResponse<ProductSupplyItem>> {
  const response = await request.get(`/product-supply/${id}`);
  if (response.success && response.data) {
    response.data = normalizeProductSupplyItem(response.data);
  }
  return response;
}

export async function updateProductSupplyItem(
  id: number,
  data: {
    name?: string;
    category?: string;
    categoryLeaf?: string;
    brand?: string;
    modelName?: string;
    offerId?: string | null;
    sku?: string | null;
    alibabaId?: string;
    supplier?: string;
    price?: number;
    oldPrice?: number | null;
    status?: string;
    imageUrl?: string;
    packageLength?: number | null;
    packageWidth?: number | null;
    packageHeight?: number | null;
    grossWeight?: number | null;
    ozonCategoryId?: number | null;
    description?: string;
    barcode?: string | null;
    descriptionCategoryId?: number | null;
    typeId?: number | null;
    images?: any[] | null;
    attributes?: Record<string, any> | null;
    variantAttributes?: any[] | null;
    hiddenAttributes?: Record<string, any> | null;
    templateSnapshot?: ProductSupplyTemplate | null;
    variantSummary?: string | null;
  }
): Promise<ApiResponse<ProductSupplyItem>> {
  const response = await request.put(`/product-supply/${id}`, data);
  if (response.success && response.data) {
    response.data = normalizeProductSupplyItem(response.data);
  }
  return response;
}

export async function updateProductSupplySource(
  id: number,
  source: UpdateSupplySourceData
): Promise<ApiResponse<ProductSupplyItem>> {
  const response = await request.put(`/product-supply/${id}/source`, { source });
  if (response.success && response.data) {
    response.data = normalizeProductSupplyItem(response.data);
  }
  return response;
}

export async function getSupplySources(params?: {
  page?: number;
  limit?: number;
  keyword?: string;
}): Promise<SupplySourceListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.keyword) queryParams.set('keyword', params.keyword);

  const response = await request.get(`/product-supply/sources?${queryParams.toString()}`);
  if (Array.isArray(response.data)) {
    response.data = response.data.map(normalizeSupplySource);
  }
  return response as SupplySourceListResponse;
}

export async function importProductSupplySourceFromUrl(
  id: number,
  url: string
): Promise<ApiResponse<ProductSupplyItem> & { source?: SupplySource }> {
  const response = await request.post(`/product-supply/${id}/source/from-url`, { url });
  if (response.success && response.data) {
    response.data = normalizeProductSupplyItem(response.data);
  }
  if (response.success && response.source) {
    response.source = normalizeSupplySource(response.source);
  }
  return response;
}

export async function previewProductSupplySourceFromUrl(
  url: string
): Promise<ApiResponse<SupplySource>> {
  const response = await request.post('/product-supply/source/preview-url', { url });
  if (response.success && response.data) {
    response.data = normalizeSupplySource(response.data);
  }
  return response;
}

export async function unbindProductSupplySource(id: number): Promise<ApiResponse<ProductSupplyItem>> {
  const response = await request.delete(`/product-supply/${id}/source`);
  if (response.success && response.data) {
    response.data = normalizeProductSupplyItem(response.data);
  }
  return response;
}

export async function deleteProductSupplyItem(id: number): Promise<ApiResponse<void>> {
  const response = await request.delete(`/product-supply/${id}`);
  return response;
}

export async function listingPreview(
  id: number,
  data?: Partial<ProductSupplyListingPayload>
): Promise<ApiResponse<ProductSupplyListingPreview>> {
  const response = await request.post(`/product-supply/${id}/listing-preview`, data || {});
  if (response.success && response.data?.product) {
    response.data.product = normalizeProductSupplyItem(response.data.product);
  }
  return response;
}

// 上架商品到Ozon
export async function listToOzon(
  id: number,
  data: ProductSupplyListingPayload
): Promise<ApiResponse<ProductSupplyItem> & { taskId?: string }> {
  const response = await request.post(`/product-supply/${id}/list-to-ozon`, data);
  if (response.success && response.data) {
    response.data = normalizeProductSupplyItem(response.data);
  }
  return response;
}

// 查询上架任务状态
export async function checkListingStatus(id: number): Promise<ApiResponse<ProductSupplyItem> & { taskStatus?: string; items?: any[] }> {
  const response = await request.get(`/product-supply/${id}/listing-status`);
  if (response.success && response.data) {
    response.data = normalizeProductSupplyItem(response.data);
  }
  return response;
}

export const productSupplyAPI = {
  createProductSupplyItem,
  getProductSupplyTemplate,
  getProductSupplyItems,
  getProductSupplyItemById,
  updateProductSupplyItem,
  getSupplySources,
  previewProductSupplySourceFromUrl,
  importProductSupplySourceFromUrl,
  deleteProductSupplyItem,
  listingPreview,
  listToOzon,
  checkListingStatus,
};
