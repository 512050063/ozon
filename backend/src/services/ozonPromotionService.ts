import prisma from '../config/database';
import logger from '../config/logger';
import { normalizeOzonImageUrlForDisplay } from '../utils/ozonImageUrl';
import { extractCategoryLeaf } from '../utils/productCategory';
import { loadOzonCategories, resolveCategorySelection } from './ozonCategorySelectionService';

const OZON_ACTIONS_API = 'https://api-seller.ozon.ru/v1/actions';
const OZON_ACTION_PRODUCTS_API = 'https://api-seller.ozon.ru/v1/actions/products';
const OZON_ACTION_CANDIDATES_API = 'https://api-seller.ozon.ru/v1/actions/candidates';
const OZON_ACTION_ACTIVATE_API = 'https://api-seller.ozon.ru/v1/actions/products/activate';
const OZON_ACTION_DEACTIVATE_API = 'https://api-seller.ozon.ru/v1/actions/products/deactivate';

type OzonStoreCredentials = {
  id: number;
  clientId: string;
  apiKey: string;
};

export type PromotionProductInput = {
  productId: number;
  actionPrice: number;
  stock?: number;
};

type PromotionSyncOptions = {
  userId?: number | null;
  recordLog?: boolean;
};

const ozonApiRequest = async (
  url: string,
  clientId: string,
  apiKey: string,
  method: 'GET' | 'POST' = 'POST',
  data?: any,
) => {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Client-Id': clientId,
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: method === 'POST' ? JSON.stringify(data || {}) : undefined,
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(parsed?.message || parsed?.error || `Ozon API request failed: ${response.status}`);
    }

    return parsed;
  } catch (error: any) {
    logger.error('Ozon promotion API request failed:', error);
    throw error;
  }
};

const getStoreCredentials = async (storeId: number): Promise<OzonStoreCredentials> => {
  const store = await prisma.ozonStore.findUnique({
    where: { id: storeId },
    select: { id: true, clientId: true, apiKey: true },
  });

  if (!store) throw new Error('Ozon店铺不存在');
  if (!store.clientId || !store.apiKey) throw new Error('Ozon店铺API凭证不完整');
  return store;
};

const parsePositiveInt = (value: unknown, label: string): number => {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${label}无效`);
  }
  return numberValue;
};

const parsePositiveNumber = (value: unknown, label: string): number => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${label}必须大于0`);
  }
  return numberValue;
};

const normalizeLimit = (limit?: number) => {
  const value = Number(limit || 50);
  if (!Number.isFinite(value)) return 50;
  return Math.min(1000, Math.max(1, Math.floor(value)));
};

const normalizeOffset = (offset?: number) => {
  const value = Number(offset || 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const normalizeRows = (response: any): any[] => {
  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.result?.items)) return response.result.items;
  if (Array.isArray(response?.result?.products)) return response.result.products;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.products)) return response.products;
  if (Array.isArray(response?.actions)) return response.actions;
  return [];
};

const getTotal = (response: any, rows: any[]) => {
  const value = response?.result?.total ?? response?.total ?? response?.result?.count ?? response?.count;
  const total = Number(value);
  return Number.isFinite(total) ? total : rows.length;
};

const collectOperationErrors = (value: any): string[] => {
  if (!value) return [];
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(item => collectOperationErrors(item));
  if (typeof value !== 'object') return [];

  const message = value.message || value.error || value.reason || value.description || value.error_message || value.errorMessage;
  const nested = [
    value.errors,
    value.error_reasons,
    value.errorReasons,
    value.rejected,
    value.failed,
    value.failures,
    value.result?.errors,
    value.result?.rejected,
  ].flatMap(item => collectOperationErrors(item));

  return [
    ...(message ? [String(message)] : []),
    ...nested,
  ];
};

const normalizeOperationResult = (response: any, successMessage: string) => {
  const errors = Array.from(new Set(collectOperationErrors(response)));
  return {
    success: errors.length === 0,
    message: errors.length > 0 ? errors.join('\n') : successMessage,
    errors,
    raw: response,
  };
};

const normalizeProductImage = (product: any): string => {
  const primary = product?.primaryImage || product?.primary_image;
  if (primary) return normalizeOzonImageUrlForDisplay(String(primary));
  const images = Array.isArray(product?.images) ? product.images : [];
  const firstImage = images.find((item: any) => typeof item === 'string' && item);
  return firstImage ? normalizeOzonImageUrlForDisplay(firstImage) : '';
};

const parseJsonObject = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? value : {};
};

const toPositiveNumber = (value: unknown): number | null => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

const resolvePromotionProductCategory = (localProduct: any, row: any) => {
  const raw = parseJsonObject(localProduct?.ozonOriginalData);
  const descriptionCategoryId = toPositiveNumber(
    localProduct?.descriptionCategoryId ??
    raw?.description_category_id ??
    raw?.descriptionCategoryId ??
    localProduct?.ozonCategoryId
  );
  const typeId = toPositiveNumber(
    localProduct?.typeId ??
    raw?.type_id ??
    raw?.typeId
  );
  const fallbackCategory = localProduct?.category || row?.category || row?.category_name || row?.categoryName || '';
  const selection = resolveCategorySelection(
    loadOzonCategories(),
    descriptionCategoryId,
    typeId,
    fallbackCategory
  );
  const category = selection.fullPath || fallbackCategory;
  const categoryLeaf = category
    ? extractCategoryLeaf(category)
    : (localProduct?.categoryLeaf || row?.category_leaf || row?.categoryLeaf || row?.type_name || row?.typeName || '');

  return {
    category,
    categoryLeaf,
    descriptionCategoryId,
    typeId,
  };
};

const enrichPromotionProducts = async (storeId: number, rows: any[]) => {
  const productIds = Array.from(new Set(rows
    .map(row => String(row?.id ?? row?.product_id ?? row?.productId ?? '').trim())
    .filter(Boolean)));

  if (productIds.length === 0) return rows;

  const warehouseItems = await prisma.warehouseItem.findMany({
    where: {
      ozonStoreId: storeId,
      ozonProductId: { in: productIds },
    },
    include: {
      product: true,
    },
  });

  const warehouseItemByOzonId = new Map<string, any>();
  for (const item of warehouseItems) {
    if (item.product) {
      warehouseItemByOzonId.set(String(item.ozonProductId), item);
    }
  }

  return rows.map(row => {
    const productId = String(row?.id ?? row?.product_id ?? row?.productId ?? '');
    const warehouseItem = warehouseItemByOzonId.get(productId);
    const localProduct = warehouseItem?.product;
    const localRaw = parseJsonObject(localProduct?.ozonOriginalData);
    const category = resolvePromotionProductCategory(localProduct, row);
    const titleOriginal = localProduct?.titleOriginal || row?.name || row?.title || '';
    const titleTranslated = localProduct?.titleTranslated || row?.name_zh || row?.nameZh || '';
    const minActionPrice = Number(
      row?.min_action_price ??
      row?.minActionPrice ??
      row?.min_price_for_action ??
      row?.minPriceForAction ??
      row?.action_min_price ??
      row?.actionMinPrice ??
      0
    );
    const minPrice = Number(
      row?.min_price ??
      row?.minPrice ??
      localRaw?.min_price ??
      localRaw?.minPrice ??
      localProduct?.minPrice ??
      0
    );
    const maxActionPrice = Number(
      row?.max_action_price ??
      row?.maxActionPrice ??
      row?.max_price_for_action ??
      row?.maxPriceForAction ??
      row?.action_max_price ??
      row?.actionMaxPrice ??
      0
    );
    const priceMinElastic = Number(
      row?.price_min_elastic ??
      row?.priceMinElastic ??
      0
    );
    const priceMaxElastic = Number(
      row?.price_max_elastic ??
      row?.priceMaxElastic ??
      0
    );
    return {
      ...row,
      id: Number(row?.id ?? row?.product_id ?? row?.productId ?? 0),
      productId,
      offerId: localProduct?.offerId || row?.offer_id || row?.offerId || '',
      sku: localProduct?.ozonSku || row?.sku || '',
      name: titleOriginal,
      nameOriginal: titleOriginal,
      nameZh: titleTranslated,
      titleOriginal,
      titleTranslated,
      category: category.category,
      categoryLeaf: category.categoryLeaf,
      descriptionCategoryId: category.descriptionCategoryId,
      typeId: category.typeId,
      image: normalizeProductImage(localProduct),
      price: Number(row?.price ?? localProduct?.price ?? 0),
      minPrice,
      actionPrice: Number(row?.action_price ?? row?.actionPrice ?? 0),
      minActionPrice,
      maxActionPrice,
      priceMinElastic,
      priceMaxElastic,
      stock: Number(row?.stock ?? localProduct?.totalStock ?? 0),
      minStock: Number(row?.min_stock ?? row?.minStock ?? 0),
      stockFbo: Number(localProduct?.stockFbo ?? 0),
      stockFbs: Number(localProduct?.stockFbs ?? warehouseItem?.inventoryQuantity ?? 0),
      totalStock: Number(localProduct?.totalStock ?? warehouseItem?.inventoryQuantity ?? 0),
      warehouseInventoryQuantity: Number(warehouseItem?.inventoryQuantity ?? 0),
      oldPrice: localProduct?.oldPrice ?? row?.old_price ?? row?.oldPrice ?? null,
      productPromotions: Array.isArray(localRaw?.promotions) ? localRaw.promotions : [],
      productStocks: localRaw?.stocks || null,
      productTypeId: category.typeId || localRaw?.type_id || localRaw?.typeId || null,
      raw: row,
    };
  });
};

const serializePromotionSyncLog = (log: any) => ({
  id: log.id,
  syncType: log.syncType,
  status: log.status,
  syncedCount: log.syncedCount,
  updatedCount: log.updatedCount,
  deletedCount: log.deletedCount,
  message: log.message || '',
  userName: log.user?.nickname || log.user?.username || '系统',
  storeName: log.ozonStore?.name || '未知店铺',
  createdAt: log.createdAt?.toISOString() || '',
});

export const getPromotions = async (storeId: number, options: PromotionSyncOptions = {}) => {
  const store = await getStoreCredentials(storeId);
  try {
    const response = await ozonApiRequest(OZON_ACTIONS_API, store.clientId, store.apiKey, 'GET');
    const actions = normalizeRows(response);
    const total = getTotal(response, actions);

    if (options.recordLog) {
      await prisma.syncLog.create({
        data: {
          ozonStoreId: storeId,
          userId: options.userId || null,
          syncType: 'promotion',
          syncedCount: total,
          updatedCount: 0,
          deletedCount: 0,
          status: 'success',
          message: `促销活动同步成功，共获取 ${total} 条活动`,
        },
      });
    }

    return {
      actions,
      total,
      raw: response,
    };
  } catch (error: any) {
    if (options.recordLog) {
      await prisma.syncLog.create({
        data: {
          ozonStoreId: storeId,
          userId: options.userId || null,
          syncType: 'promotion',
          syncedCount: 0,
          updatedCount: 0,
          deletedCount: 0,
          status: 'failed',
          message: error.message || '促销活动同步失败',
        },
      });
    }
    throw error;
  }
};

export const getPromotionSyncLogs = async (storeId: number, page: number, pageSize: number) => {
  const currentPage = Math.max(1, Math.floor(Number(page) || 1));
  const currentPageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize) || 10)));
  const where = { ozonStoreId: storeId, syncType: 'promotion' };
  const [logs, total] = await Promise.all([
    prisma.syncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * currentPageSize,
      take: currentPageSize,
      include: {
        user: { select: { username: true, nickname: true } },
        ozonStore: { select: { name: true } },
      },
    }),
    prisma.syncLog.count({ where }),
  ]);

  return {
    list: logs.map(serializePromotionSyncLog),
    total,
    page: currentPage,
    pageSize: currentPageSize,
  };
};

export const getPromotionProducts = async (storeId: number, actionId: number, limit?: number, offset?: number) => {
  const store = await getStoreCredentials(storeId);
  const normalizedActionId = parsePositiveInt(actionId, '活动ID');
  const response = await ozonApiRequest(OZON_ACTION_PRODUCTS_API, store.clientId, store.apiKey, 'POST', {
    action_id: normalizedActionId,
    limit: normalizeLimit(limit),
    offset: normalizeOffset(offset),
  });
  const rows = normalizeRows(response);
  return {
    products: await enrichPromotionProducts(storeId, rows),
    total: getTotal(response, rows),
    raw: response,
  };
};

export const getPromotionCandidates = async (storeId: number, actionId: number, limit?: number, offset?: number) => {
  const store = await getStoreCredentials(storeId);
  const normalizedActionId = parsePositiveInt(actionId, '活动ID');
  const response = await ozonApiRequest(OZON_ACTION_CANDIDATES_API, store.clientId, store.apiKey, 'POST', {
    action_id: normalizedActionId,
    limit: normalizeLimit(limit),
    offset: normalizeOffset(offset),
  });
  const rows = normalizeRows(response);
  return {
    products: await enrichPromotionProducts(storeId, rows),
    total: getTotal(response, rows),
    raw: response,
  };
};

export const activatePromotionProduct = async (
  storeId: number,
  actionId: number,
  input: PromotionProductInput,
) => {
  const store = await getStoreCredentials(storeId);
  const normalizedActionId = parsePositiveInt(actionId, '活动ID');
  const productId = parsePositiveInt(input.productId, '商品ID');
  const actionPrice = parsePositiveNumber(input.actionPrice, '活动价格');
  const stockValue = Number(input.stock ?? 0);
  const stock = Number.isFinite(stockValue) ? Math.max(0, Math.floor(stockValue)) : 0;

  const response = await ozonApiRequest(OZON_ACTION_ACTIVATE_API, store.clientId, store.apiKey, 'POST', {
    action_id: normalizedActionId,
    products: [{
      product_id: productId,
      action_price: actionPrice,
      stock,
    }],
  });

  return normalizeOperationResult(response, '商品已加入活动');
};

export const deactivatePromotionProduct = async (
  storeId: number,
  actionId: number,
  productId: number,
) => {
  const store = await getStoreCredentials(storeId);
  const normalizedActionId = parsePositiveInt(actionId, '活动ID');
  const normalizedProductId = parsePositiveInt(productId, '商品ID');

  const response = await ozonApiRequest(OZON_ACTION_DEACTIVATE_API, store.clientId, store.apiKey, 'POST', {
    action_id: normalizedActionId,
    product_ids: [normalizedProductId],
  });

  return normalizeOperationResult(response, '商品已移出活动');
};
