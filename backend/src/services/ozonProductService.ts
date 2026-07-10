import prisma from '../config/database';
import logger from '../config/logger';
import { hasProductErrors, getProductErrors } from './attributeValidationService';
import { extractAndStoreErrorCodes } from './ozonErrorCodeService';
import { replaceImageReferences } from './imageAssetService';
import { isManagedImagePath, resolvePublicAssetUrl } from './publicAssetUrlService';

// 商品状态枚举
export const ProductStatus = {
  LISTED: 'listed',           // 在售
  SELLING: 'selling',         // 销售中
  PENDING: 'pending',         // 待审核
  READY: 'ready',             // 已创建待上架
  DRAFT: 'draft',             // 草稿
  ARCHIVED: 'archived',       // 已归档
  ERROR: 'error',             // 错误
  MODERATING: 'moderating',   // 审核中
  UNLISTED: 'unlisted',       // 商品已下架
  UNKNOWN: 'unknown',         // 未知
} as const;

export type ProductStatusType = typeof ProductStatus[keyof typeof ProductStatus];

// 状态映射表（从Ozon状态到本地状态）
export const STATUS_MAP: Record<string, ProductStatusType> = {
  'price_sent': ProductStatus.LISTED,
  'on_sale': ProductStatus.SELLING,
  'draft': ProductStatus.DRAFT,
  'archived': ProductStatus.ARCHIVED,
  'unknown': ProductStatus.UNKNOWN,
  'new': ProductStatus.PENDING,
  'moderating': ProductStatus.MODERATING,
};

// 转换BigInt为字符串的辅助函数
const convertBigIntToString = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // 处理Date对象
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(convertBigIntToString);
    }

    const result: any = {};
    for (const key in obj) {
      result[key] = convertBigIntToString(obj[key]);
    }
    return result;
  }

  return obj;
};
// import { translateProductName, translateProductStatus } from './translationService';

// Ozon API配置
const OZON_PRODUCT_LIST_API = 'https://api-seller.ozon.ru/v3/product/list';
const OZON_PRODUCT_INFO_API = 'https://api-seller.ozon.ru/v3/product/info/list';
const OZON_PRODUCT_INFO_LIMIT_API = 'https://api-seller.ozon.ru/v4/product/info/limit';
const OZON_PRODUCT_INFO_ATTRIBUTES_API = 'https://api-seller.ozon.ru/v4/product/info/attributes';
const OZON_WAREHOUSE_LIST_API = 'https://api-seller.ozon.ru/v2/warehouse/list';
const OZON_PRODUCT_STOCKS_BY_WAREHOUSE_FBS_API = 'https://api-seller.ozon.ru/v2/product/info/stocks-by-warehouse/fbs';

// Ozon API请求函数
async function ozonApiRequest(
  url: string,
  clientId: string,
  apiKey: string,
  method: 'GET' | 'POST' = 'GET',
  data?: any
): Promise<any> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Client-Id': clientId,
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      throw new Error(`Ozon API request failed: ${response.status} ${response.statusText} ${responseText}`);
    }

    return await response.json();
  } catch (error: any) {
    logger.error('Ozon API request failed:', error);
    throw error;
  }
}

// 解析价格
function parsePrice(product: any): number {
  // 检查 price 字段类型
  if (typeof product.price === 'number') {
    return product.price;
  }

  if (typeof product.price === 'string') {
    // 字符串转数字
    const price = parseFloat(product.price);
    return isNaN(price) ? 0 : price;
  }

  if (typeof product.price === 'object') {
    return product.price.price || product.price.old_price || 0;
  }

  return 0;
}

// 辅助函数：截断超长字符串到指定长度
const truncateStr = (str: string | null | undefined, maxLen: number): string | null => {
  if (!str) return null;
  return str.length > maxLen ? str.substring(0, maxLen) : str;
};

function getStockRows(product: any): any[] {
  const stocksRaw = product.stocks || [];
  if (Array.isArray(stocksRaw)) return stocksRaw;
  if (stocksRaw && typeof stocksRaw === 'object') {
    if (Array.isArray(stocksRaw.stocks)) return stocksRaw.stocks;
    if (stocksRaw.stocks && typeof stocksRaw.stocks === 'object') return [stocksRaw.stocks];
  }
  return [];
}

function getStockSource(stock: any): string {
  return String(
    stock?.source ||
    stock?.type ||
    stock?.delivery_schema ||
    stock?.schema ||
    stock?.sale_schema ||
    stock?.stock_type ||
    ''
  ).toLowerCase();
}

function isFboStockRow(stock: any): boolean {
  const source = getStockSource(stock);
  return source.includes('fbo') || source.includes('fbp');
}

function isFbsStockRow(stock: any): boolean {
  const source = getStockSource(stock);
  return source.includes('fbs') || source.includes('rfbs') || source === 'sds';
}

function getStockPresent(stock: any): number {
  const value = stock?.present ?? stock?.stock ?? stock?.quantity ?? stock?.available ?? stock?.available_stock;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function summarizeStockBySchema(product: any): { stockFbo: number; stockFbs: number; totalStock: number } {
  const stocksArr = getStockRows(product);
  let stockFbo = 0;
  let stockFbs = 0;
  let uncategorized = 0;
  let uncategorizedMergedIntoFbs = false;

  for (const stock of stocksArr) {
    const present = getStockPresent(stock);
    if (isFboStockRow(stock)) {
      stockFbo += present;
    } else if (isFbsStockRow(stock)) {
      stockFbs += present;
    } else {
      uncategorized += present;
    }
  }

  if (stockFbs === 0 && uncategorized > 0) {
    stockFbs = uncategorized;
    uncategorizedMergedIntoFbs = true;
  }

  return {
    stockFbo,
    stockFbs,
    totalStock: stockFbo + stockFbs + (uncategorizedMergedIntoFbs ? 0 : uncategorized),
  };
}

type OzonWarehouseContext = {
  fbpWarehouseName?: string;
  warehouseNameById: Map<string, string>;
};

const getWarehouseId = (stock: any): string => {
  const value = stock?.warehouse_id ?? stock?.warehouseId;
  return value === undefined || value === null || value === '' ? '' : String(value);
};

const getWarehouseName = (stock: any): string => {
  const value = stock?.warehouse_name ?? stock?.warehouseName ?? stock?.name;
  return value === undefined || value === null || value === '' ? '' : String(value);
};

function normalizeApiRows(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.result)) return value.result;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.products)) return value.products;
  if (Array.isArray(value.warehouses)) return value.warehouses;
  if (Array.isArray(value.stocks)) return value.stocks;
  if (value.result && typeof value.result === 'object') {
    return normalizeApiRows(value.result);
  }
  return [];
}

export type OzonProductLimitBucket = {
  limit: number | null;
  used: number | null;
  remaining: number | null;
  resetAt: string | null;
};

export type OzonProductLimits = {
  total: OzonProductLimitBucket;
  dailyCreate: OzonProductLimitBucket;
  dailyUpdate: OzonProductLimitBucket;
  operationLimits: Array<OzonProductLimitBucket & {
    type: string;
    raw: any;
  }>;
  raw: any;
};

function firstFiniteNumber(...values: any[]): number | null {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return null;
}

function pickLimitSource(root: any, keys: string[]): any {
  for (const key of keys) {
    const value = root?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function normalizeLimitBucket(value: any): OzonProductLimitBucket {
  const source = value && typeof value === 'object' ? value : {};
  const limit = firstFiniteNumber(
    source.limit,
    source.max,
    source.total,
    source.quota,
    source.value,
  );
  const used = firstFiniteNumber(
    source.used,
    source.usage,
    source.current,
    source.count,
    source.consumed,
  );
  const explicitRemaining = firstFiniteNumber(
    source.remaining,
    source.left,
    source.available,
    source.rest,
    source.balance,
  );
  const remaining = explicitRemaining !== null
    ? explicitRemaining
    : (limit !== null && used !== null ? Math.max(0, limit - used) : null);
  const resetAt = source.resetAt || source.reset_at || source.resetTime || source.reset_time || null;
  return {
    limit,
    used,
    remaining,
    resetAt: resetAt ? String(resetAt) : null,
  };
}

function normalizeOperationType(value: any): string {
  return String(value || '').trim().toLowerCase();
}

function matchOperationBucket(operationLimits: OzonProductLimits['operationLimits'], operation: 'create' | 'update'): OzonProductLimitBucket | null {
  const keywords = operation === 'create'
    ? ['create', 'add', 'import', 'upload', 'new']
    : ['update', 'edit', 'change', 'modify'];
  const match = operationLimits.find(item => keywords.some(keyword => item.type.includes(keyword)));
  return match || null;
}

export function normalizeOzonProductLimits(apiData: any): OzonProductLimits {
  const root = apiData?.result && typeof apiData.result === 'object'
    ? apiData.result
    : (apiData || {});
  const operationSource = pickLimitSource(root, ['operation_limits', 'operationLimits', 'operations']) || [];
  const operationLimits = (Array.isArray(operationSource) ? operationSource : [])
    .map((item: any) => ({
      ...normalizeLimitBucket(item),
      type: normalizeOperationType(item.operation_type || item.operationType || item.type || item.name || item.code),
      raw: item,
    }));

  const total = normalizeLimitBucket(pickLimitSource(root, ['total', 'total_limit', 'totalLimit', 'assortment', 'assortment_limit']));
  const dailyCreateFromRoot = normalizeLimitBucket(pickLimitSource(root, [
    'daily_create',
    'dailyCreate',
    'daily_create_limit',
    'dailyCreateLimit',
    'create',
    'create_limit',
  ]));
  const dailyUpdateFromRoot = normalizeLimitBucket(pickLimitSource(root, [
    'daily_update',
    'dailyUpdate',
    'daily_update_limit',
    'dailyUpdateLimit',
    'update',
    'update_limit',
  ]));

  return {
    total,
    dailyCreate: dailyCreateFromRoot.remaining !== null ? dailyCreateFromRoot : (matchOperationBucket(operationLimits, 'create') || dailyCreateFromRoot),
    dailyUpdate: dailyUpdateFromRoot.remaining !== null ? dailyUpdateFromRoot : (matchOperationBucket(operationLimits, 'update') || dailyUpdateFromRoot),
    operationLimits,
    raw: apiData || null,
  };
}

export function assertOzonProductOperationLimit(limits: OzonProductLimits | null | undefined, operation: 'create' | 'update'): void {
  const bucket = operation === 'create' ? limits?.dailyCreate : limits?.dailyUpdate;
  if (!bucket || bucket.remaining === null) return;
  if (bucket.remaining > 0) return;
  const label = operation === 'create' ? '创建' : '更新';
  const resetText = bucket.resetAt ? `，重置时间：${bucket.resetAt}` : '';
  throw new Error(`今日 Ozon 商品${label}额度已用完${resetText}`);
}

export async function getOzonProductLimits(store: any): Promise<OzonProductLimits> {
  const apiData = await ozonApiRequest(
    OZON_PRODUCT_INFO_LIMIT_API,
    store.clientId,
    store.apiKey,
    'POST',
    {}
  );
  return normalizeOzonProductLimits(apiData);
}

async function getOzonWarehouseContext(store: any): Promise<OzonWarehouseContext> {
  const context: OzonWarehouseContext = {
    warehouseNameById: new Map<string, string>(),
  };

  try {
    const apiData = await ozonApiRequest(
      OZON_WAREHOUSE_LIST_API,
      store.clientId,
      store.apiKey,
      'POST',
      {}
    );
    const warehouses = normalizeApiRows(apiData);

    for (const warehouse of warehouses) {
      const id = getWarehouseId(warehouse);
      const name = getWarehouseName(warehouse);
      if (id && name) {
        context.warehouseNameById.set(id, name);
      }
      if (!context.fbpWarehouseName && name) {
        context.fbpWarehouseName = name;
      }
    }
  } catch (error: any) {
    logger.warn(`获取Ozon仓库列表失败，将使用默认仓库名称: ${error.message}`);
  }

  return context;
}

type OzonStockRequestItem = {
  productId: string;
  sku?: string;
  offerId?: string;
};

type OzonFbsStockTarget = {
  offerId: string;
  warehouseId: string;
};

type OzonFbsStockRequestPayload = {
  limit: number;
  sku?: number[];
  offer_id?: string[];
};

function normalizeOzonSku(value: any): number | null {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '0') return null;
  if (!/^\d+$/.test(raw)) return null;
  const sku = Number(raw);
  return Number.isSafeInteger(sku) && sku > 0 ? sku : null;
}

function normalizeOzonOfferId(value: any): string {
  return String(value ?? '').trim();
}

export function buildFbsStocksByWarehouseRequest(
  items: OzonStockRequestItem[]
): {
  payload: OzonFbsStockRequestPayload | null;
  productIdBySku: Map<string, string>;
  productIdByOfferId: Map<string, string>;
} {
  const productIdBySku = new Map<string, string>();
  const productIdByOfferId = new Map<string, string>();
  const skuList: number[] = [];
  const offerIdList: string[] = [];
  const seenSku = new Set<number>();
  const seenOfferId = new Set<string>();

  for (const item of items) {
    const sku = normalizeOzonSku(item.sku);
    if (sku !== null) {
      productIdBySku.set(String(sku), item.productId);
      if (!seenSku.has(sku)) {
        seenSku.add(sku);
        skuList.push(sku);
      }
      continue;
    }

    const offerId = normalizeOzonOfferId(item.offerId);
    if (offerId) {
      productIdByOfferId.set(offerId, item.productId);
      if (!seenOfferId.has(offerId)) {
        seenOfferId.add(offerId);
        offerIdList.push(offerId);
      }
    }
  }

  if (skuList.length > 0) {
    const sku = skuList.slice(0, 1000);
    return {
      payload: { limit: sku.length, sku },
      productIdBySku,
      productIdByOfferId,
    };
  }

  if (offerIdList.length > 0) {
    const offer_id = offerIdList.slice(0, 1000);
    return {
      payload: { limit: offer_id.length, offer_id },
      productIdBySku,
      productIdByOfferId,
    };
  }

  return {
    payload: null,
    productIdBySku,
    productIdByOfferId,
  };
}

async function getFbsStocksByWarehouse(
  store: any,
  items: OzonStockRequestItem[]
): Promise<Map<string, any[]>> {
  const result = new Map<string, any[]>();
  if (items.length === 0) return result;

  const { payload, productIdBySku, productIdByOfferId } = buildFbsStocksByWarehouseRequest(items);
  if (!payload) {
    logger.warn(`跳过FBS分仓库存查询：没有有效的 sku/offer_id，items=${items.length}`);
    return result;
  }

  try {
    logger.info(`查询FBS分仓库存: mode=${payload.sku ? 'sku' : 'offer_id'}, count=${payload.sku?.length || payload.offer_id?.length || 0}`);
    const apiData = await ozonApiRequest(
      OZON_PRODUCT_STOCKS_BY_WAREHOUSE_FBS_API,
      store.clientId,
      store.apiKey,
      'POST',
      payload
    );
    const rows = normalizeApiRows(apiData);

    for (const row of rows) {
      const productId = (
        row?.product_id ??
        row?.productId ??
        productIdBySku.get(String(row?.sku ?? '')) ??
        productIdByOfferId.get(String(row?.offer_id ?? row?.offerId ?? ''))
      );
      if (!productId) continue;
      const key = String(productId);
      const nextRows = result.get(key) || [];
      nextRows.push(row);
      result.set(key, nextRows);
    }
  } catch (error: any) {
    logger.warn(`获取FBS分仓库存失败，将使用商品详情库存: ${error.message}`);
  }

  return result;
}

async function getFbsStockTargetForUpdate(
  store: any,
  productId: string
): Promise<OzonFbsStockTarget> {
  const item = await prisma.warehouseItem.findFirst({
    where: {
      ozonStoreId: store.id,
      ozonProductId: String(productId),
    },
    include: {
      product: true,
    },
  });

  const raw = item?.product?.ozonOriginalData as any;
  const offerId = String(
    raw?.offer_id ||
    raw?.offerId ||
    item?.product?.offerId ||
    ''
  ).trim();

  if (!offerId) {
    throw new Error('缺少 offer_id，无法更新 FBS 库存');
  }

  const sku = raw?.sku || item?.product?.ozonSku || undefined;
  const fbsStocksByProductId = await getFbsStocksByWarehouse(store, [{
    productId: String(productId),
    sku: sku ? String(sku) : undefined,
    offerId,
  }]);
  const fbsRows = fbsStocksByProductId.get(String(productId)) || [];
  const fbsRow = fbsRows.find(row => getWarehouseId(row)) || fbsRows[0];
  const warehouseId = getWarehouseId(fbsRow);

  if (!warehouseId) {
    throw new Error('缺少 FBS 仓库ID，无法更新库存');
  }

  return {
    offerId,
    warehouseId,
  };
}

function normalizeStockDetailRow(row: any, context?: OzonWarehouseContext): any {
  const warehouseId = getWarehouseId(row);
  const warehouseName = getWarehouseName(row) || (warehouseId ? context?.warehouseNameById.get(warehouseId) : '');

  return {
    ...row,
    source: row?.source || row?.type || 'fbs',
    present: row?.present ?? row?.stock ?? row?.quantity ?? row?.available ?? row?.available_stock ?? 0,
    reserved: row?.reserved ?? row?.reserved_stock ?? row?.reserve ?? 0,
    ...(warehouseId ? { warehouse_id: warehouseId } : {}),
    ...(warehouseName ? { warehouse_name: warehouseName } : {}),
  };
}

function enrichProductWarehouseStocks(
  product: any,
  context?: OzonWarehouseContext,
  fbsWarehouseRows: any[] = []
): any {
  const enrichedProduct = { ...(product || {}) };
  const stockRows = getStockRows(enrichedProduct).map(stock => normalizeStockDetailRow(stock, context));
  const fbsRows = fbsWarehouseRows.map(row => normalizeStockDetailRow(row, context));
  const hasFbsWarehouseRows = fbsRows.length > 0;

  if (hasFbsWarehouseRows) {
    const nonFbsRows = stockRows.filter(stock => !isFbsStockRow(stock));
    if (!nonFbsRows.some(isFboStockRow) && context?.fbpWarehouseName) {
      nonFbsRows.push({
        source: 'fbp',
        present: 0,
        reserved: 0,
        warehouse_name: context.fbpWarehouseName,
      });
    }
    enrichedProduct.stocks = {
      ...(isPlainObject(enrichedProduct.stocks) ? enrichedProduct.stocks : {}),
      stocks: [...nonFbsRows, ...fbsRows],
      has_stock: [...nonFbsRows, ...fbsRows].some(stock => getStockPresent(stock) > 0),
    };
    return enrichedProduct;
  }

  const rowsWithFallbackName = stockRows;

  if (!rowsWithFallbackName.some(isFboStockRow) && context?.fbpWarehouseName) {
    rowsWithFallbackName.push({
      source: 'fbp',
      present: 0,
      reserved: 0,
      warehouse_name: context.fbpWarehouseName,
    });
  }

  if (rowsWithFallbackName.length > 0) {
    enrichedProduct.stocks = {
      ...(isPlainObject(enrichedProduct.stocks) ? enrichedProduct.stocks : {}),
      stocks: rowsWithFallbackName,
      has_stock: rowsWithFallbackName.some(stock => getStockPresent(stock) > 0),
    };
  }

  return enrichedProduct;
}

function getProductVisibility(product: any): string | null {
  if (product.is_archived || product.is_autoarchived) return 'ARCHIVED';
  if (product.visibility && ['VISIBLE', 'INVISIBLE', 'ARCHIVED', 'EMPTY'].includes(product.visibility)) {
    return product.visibility;
  }
  const availabilities = product.availabilities || [];
  const hasAvailable = Array.isArray(availabilities) && availabilities.some((a: any) => a.availability === 'AVAILABLE');
  return hasAvailable ? 'VISIBLE' : 'INVISIBLE';
}

function buildOzonProductData(product: any) {
  const ozonProductId = String(product.product_id);
  const { stockFbo, stockFbs, totalStock } = summarizeStockBySchema(product);
  const visibility = getProductVisibility(product);
  product.visibility = visibility;

  const errors = product.errors || [];
  const hasErrors = errors.some((e: any) => {
    const level = e?.level || e?.texts?.level;
    return level === 'ERROR_LEVEL_ERROR';
  });
  const hasWarnings = errors.some((e: any) => {
    const level = e?.level || e?.texts?.level;
    return level === 'ERROR_LEVEL_WARNING';
  });

  return {
    data: {
      ozonProductId,
      offerId: product.offer_id ? String(product.offer_id) : ozonProductId,
      ozonSku: truncateStr(product.sku?.toString(), 191),
      titleOriginal: product.name ? product.name.substring(0, 191) : '',
      titleTranslated: '',
      descriptionOriginal: truncateStr(product.description, 500),
      descriptionTranslated: null,
      price: parsePrice(product),
      category: 'ozon_product',
      ozonCategoryId: product.description_category_id ? BigInt(product.description_category_id) : null,
      primaryImage: truncateStr(Array.isArray(product.primary_image) ? product.primary_image[0] : product.primary_image, 500),
      images: product.images || null,
      isArchived: product.is_archived || false,
      isAutoArchived: product.is_autoarchived || false,
      statusName: truncateStr(product.statuses?.status_name, 100),
      statusZh: null,
      ozonCreatedAt: product.created_at ? new Date(product.created_at) : null,
      ozonUpdatedAt: product.updated_at ? new Date(product.updated_at) : null,
      stockFbo,
      stockFbs,
      totalStock,
      visibility,
      hasErrors,
      hasWarnings,
      minPrice: product.min_price ? parseFloat(product.min_price) : null,
      oldPrice: product.old_price ? parseFloat(product.old_price) : null,
      currencyCode: truncateStr(product.currency_code, 10),
      vat: truncateStr(product.vat, 50),
      ozonOriginalData: product || null,
    },
    stock: parseStock(product),
    warehouseStatus: parseWarehouseStatus(product),
  };
}

function isPlainObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasMeaningfulValue(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return value !== '';
}

export function mergeOzonProductDetails(listProduct: any, detailProduct?: any): any {
  const merged = { ...(listProduct || {}) };
  if (!detailProduct) return merged;

  for (const [key, value] of Object.entries(detailProduct)) {
    if (hasMeaningfulValue(value) || !hasMeaningfulValue(merged[key])) {
      merged[key] = value;
    }
  }

  if (!hasMeaningfulValue(merged.product_id) && hasMeaningfulValue(listProduct?.product_id)) {
    merged.product_id = listProduct.product_id;
  }
  if (!hasMeaningfulValue(merged.offer_id) && hasMeaningfulValue(listProduct?.offer_id)) {
    merged.offer_id = listProduct.offer_id;
  }
  if (!hasMeaningfulValue(merged.sku) && hasMeaningfulValue(listProduct?.sku)) {
    merged.sku = listProduct.sku;
  }

  return merged;
}

function hasRichOzonProductDetails(product: any): boolean {
  if (!product) return false;
  return Boolean(
    hasMeaningfulValue(product.attributes) ||
    hasMeaningfulValue(product.dimensions) ||
    hasMeaningfulValue(product.dimension) ||
    hasMeaningfulValue(product.dimensions_info) ||
    hasMeaningfulValue(product.depth) ||
    hasMeaningfulValue(product.length) ||
    hasMeaningfulValue(product.width) ||
    hasMeaningfulValue(product.height) ||
    hasMeaningfulValue(product.weight)
  );
}

function parseOzonOriginalData(value: any): any {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? value : {};
}

export function resolveOzonProductCategoryDisplayName(product: any, categories: Record<string, string>): string {
  const raw = parseOzonOriginalData(product?.ozonOriginalData);
  const typeId = toPositiveInteger(raw?.type_id ?? raw?.typeId);
  const descriptionCategoryId = toPositiveInteger(raw?.description_category_id ?? raw?.descriptionCategoryId);
  const ozonCategoryId = product?.ozonCategoryId !== null && product?.ozonCategoryId !== undefined
    ? String(product.ozonCategoryId)
    : '';

  if (typeId && categories[String(typeId)]) return categories[String(typeId)];
  if (descriptionCategoryId && categories[String(descriptionCategoryId)]) return categories[String(descriptionCategoryId)];
  if (ozonCategoryId && categories[ozonCategoryId]) return categories[ozonCategoryId];
  return '-';
}

// 解析产品状态
function parseStatus(product: any): string {
  if (product.statuses) {
    if (Array.isArray(product.statuses) && product.statuses.length > 0) {
      return product.statuses[0].status || 'unknown';
    }
    if (typeof product.statuses === 'object') {
      return product.statuses.status || 'unknown';
    }
  }
  return 'unknown';
}

/**
 * 解析仓库商品状态 - 综合多个字段判断（参考 OEasy 项目实现）
 * 优先级：error > visibility > status
 * 
 * 状态对应关系（与 Ozon 后台保持一致）：
 * - 销售中: visibility=VISIBLE 且无错误
 * - 准备销售: visibility=INVISIBLE 且无错误
 * - 错误: 有 errors 或 status_failed
 * - 待修改: visibility=EMPTY 或验证失败
 * - 商品已下架: visibility=INVISIBLE（有库存但未上架）
 * - 档案: visibility=ARCHIVED
 */
function parseWarehouseStatus(product: any): ProductStatusType {
  // 1. 检查是否有错误（优先级最高）
  // Ozon 后台的"错误"状态主要基于 errors 字段
  if (hasProductErrors(product)) {
    return ProductStatus.ERROR;
  }

  // 2. 获取 visibility 字段（优先使用）
  const visibility = product.visibility;
  
  // 3. 获取 statuses 字段
  const statuses = product.statuses;
  const status = statuses ? (Array.isArray(statuses) ? statuses[0]?.status : statuses.status) : null;
  const statusFailed = statuses ? (Array.isArray(statuses) ? statuses[0]?.status_failed : statuses.status_failed) : null;
  const validationStatus = statuses ? (Array.isArray(statuses) ? statuses[0]?.validation_status : statuses.validation_status) : null;
  const moderateStatus = statuses ? (Array.isArray(statuses) ? statuses[0]?.moderate_status : statuses.moderate_status) : null;

  // 4. 检查 status_failed（Ozon 后台将有失败原因的商品归为"错误"）
  // 例外：如果 status_name 是"不出售"/"Не продается"，说明商品已下架（如违反复制禁令），不应归类为"错误"
  if (statusFailed && statusFailed !== '' && statusFailed !== 'none') {
    const statusNameForCheck = statuses ? (Array.isArray(statuses) ? statuses[0]?.status_name : statuses.status_name) : null;
    const isNotForSale = statusNameForCheck === '不出售' || statusNameForCheck === 'Не продается';
    if (!isNotForSale) {
      return ProductStatus.ERROR;
    }
    // 如果是不出售状态且有 status_failed，继续往下判断（会在 INVISIBLE 分支中归类为 UNLISTED）
  }

  // 5. 检查验证失败
  if (validationStatus === 'failed') {
    return ProductStatus.ERROR;
  }

  // 6. 根据 visibility 判断状态（与 Ozon 后台一致）
  switch (visibility) {
    case 'VISIBLE':
      // 可见 = 销售中
      return ProductStatus.SELLING;
    
    case 'INVISIBLE':
      // 不可见需要区分"准备销售"和"商品已下架"
      // 商品已下架：status_name 为"不出售"/"Не продается"（Ozon不强制要求status_failed）
      {
        const statusName = statuses ? (Array.isArray(statuses) ? statuses[0]?.status_name : statuses.status_name) : null;
        const isNotForSale = statusName === '不出售' || statusName === 'Не продается';
        if (isNotForSale) {
          return ProductStatus.UNLISTED;
        }
      }
      // 其他不可见 = 准备销售（可能未上架）
      return ProductStatus.PENDING;
    
    case 'ARCHIVED':
      // 归档 = 档案
      return ProductStatus.ARCHIVED;
    
    case 'EMPTY':
      // 空 = 待修改（无库存或未完成）
      return ProductStatus.READY;
  }

  // 7. 如果没有 visibility，回退到状态判断
  if (status === 'on_sale' || status === 'price_sent') {
    // 在售状态
    if (validationStatus === 'success' || moderateStatus === 'approved') {
      return ProductStatus.SELLING;
    }
    return ProductStatus.LISTED;
  }

  if (status === 'archived') {
    return ProductStatus.ARCHIVED;
  }

  if (status === 'draft') {
    return ProductStatus.DRAFT;
  }

  if (status === 'new' || validationStatus === 'pending') {
    return ProductStatus.PENDING;
  }

  if (moderateStatus === 'pending' || moderateStatus === 'moderating' || status === 'moderating') {
    return ProductStatus.MODERATING;
  }

  // 默认状态
  return ProductStatus.READY;
}

// 解析库存
function parseStock(product: any): number {
  if (product.stocks) {
    // 检查是否是嵌套结构 stocks.stocks
    if (typeof product.stocks === 'object' && product.stocks.stocks) {
      if (Array.isArray(product.stocks.stocks)) {
        return product.stocks.stocks.reduce((total: number, stock: any) => {
          return total + (stock.present || 0);
        }, 0);
      }
      if (typeof product.stocks.stocks === 'object') {
        return product.stocks.stocks.present || 0;
      }
    }

    // 处理直接结构
    if (Array.isArray(product.stocks)) {
      return product.stocks.reduce((total: number, stock: any) => {
        return total + (stock.present || 0);
      }, 0);
    }
    if (typeof product.stocks === 'object') {
      return product.stocks.present || 0;
    }
  }
  return 0;
}

/**
 * 获取店铺所有产品ID（参考 OEasy 项目，同时获取 ALL 和 ARCHIVED）
 */
export async function getOzonProductIds(
  store: any,
  limit: number = 1000,
  offset: number = 0
): Promise<number[]> {
  const allProductIds: number[] = [];
  
  // 参考 OEasy 项目：需要同时获取 ALL 和 ARCHIVED 两种可见性的商品
  // 使用 last_id 分页方式（参考项目使用的方式）
  for (const visibility of ['ALL', 'ARCHIVED']) {
    let lastId = "";
    let hasMore = true;
    let pageNum = 0;
    
    while (hasMore) {
      pageNum++;
      const requestBody: any = {
        limit: limit,
        filter: {
          visibility: visibility,
        },
      };
      // 首次请求不传 last_id，后续请求使用 API 返回的游标
      if (lastId) {
        requestBody.last_id = lastId;
      }
      
      logger.info(`[Sync] 请求产品列表 visibility=${visibility} page=${pageNum} lastId="${lastId}"`);
      
      const apiData = await ozonApiRequest(
        OZON_PRODUCT_LIST_API,
        store.clientId,
        store.apiKey,
        'POST',
        requestBody
      );

      // 诊断日志：输出 API 返回的完整结构（仅第一页）
      if (pageNum === 1) {
        logger.info(`[Sync] API原始响应结构 (visibility=${visibility}): keys=${Object.keys(apiData || {}).join(',')}`);
        if (apiData?.result) {
          logger.info(`[Sync] result.keys: ${Object.keys(apiData.result).join(',')}`);
          logger.info(`[Sync] result.total: ${apiData.result.total}, items数量: ${apiData.result.items?.length || 0}`);
        }
        if (apiData?.error) {
          logger.error(`[Sync] Ozon API返回错误 (visibility=${visibility}): ${JSON.stringify(apiData.error)}`);
        }
      }

      if (apiData && apiData.result && Array.isArray(apiData.result.items)) {
        const items = apiData.result.items;
        logger.info(`[Sync] 获取到 ${items.length} 个产品ID (visibility=${visibility}, page=${pageNum})`);
        const ids = items.map((item: any) => item.product_id);
        allProductIds.push(...ids);
        
        // 使用 API 返回的 last_id 进行分页（Ozon API v3 使用 base64 编码的游标）
        // last_id = "bnVzbA==" 表示没有更多数据
        const responseLastId = apiData.result.last_id;
        hasMore = items.length === limit && items.length > 0 && responseLastId && responseLastId !== 'bnVzbA==';
        lastId = responseLastId || '';
        
        logger.info(`[Sync] last_id="${lastId}", hasMore=${hasMore}, items.length=${items.length}`);
      } else {
        logger.warn(`[Sync] visibility=${visibility} API返回无result.items，停止分页: ${JSON.stringify(apiData).substring(0, 500)}`);
        hasMore = false;
      }
    }
    
    logger.info(`[Sync] visibility=${visibility} 共获取 ${allProductIds.length} 个产品ID`);
  }

  logger.info(`[Sync] 最终产品ID总数: ${allProductIds.length}`);
  return allProductIds;
}

/**
 * 获取产品详情列表
 */
export async function getOzonProductDetails(
  store: any,
  productIds: number[]
): Promise<any[]> {
  logger.info(`[Sync] 请求产品详情, 数量: ${productIds.length}, 首批ID: [${productIds.slice(0, 5).join(',')}]`);
  
  const apiData = await ozonApiRequest(
    OZON_PRODUCT_INFO_API,
    store.clientId,
    store.apiKey,
    'POST',
    {
      product_id: productIds,
      limit: productIds.length,
      offset: 0,
    }
  );

  let productDetails: any[] = [];
  try {
    if (apiData && apiData.result && Array.isArray(apiData.result.items)) {
      productDetails = apiData.result.items;
      logger.info(`[Sync] 获取到产品详情: ${productDetails.length} 个`);
    } else if (apiData && Array.isArray(apiData.items)) {
      productDetails = apiData.items;
      logger.info(`[Sync] 获取到产品详情(alternative): ${productDetails.length} 个`);
    } else if (Array.isArray(apiData)) {
      productDetails = apiData;
      logger.info(`[Sync] 获取到产品详情(direct): ${productDetails.length} 个`);
    } else {
      logger.error('[Sync] API返回的数据格式无效, keys:', Object.keys(apiData || {}).join(','));
      if (apiData?.error) {
        logger.error('[Sync] Ozon API错误:', JSON.stringify(apiData.error));
      }
      throw new Error('API返回的数据格式无效');
    }
  } catch (error) {
    logger.error('解析产品详情失败:', error);
    throw new Error('解析产品详情失败');
  }

  // v3/product/info/list 可能不返回 product_id，但会返回 id；不能用数组索引盲目兜底，
  // 否则 Ozon 返回顺序变化时会把详情写到错误商品上。
  if (Array.isArray(productDetails)) {
    productDetails = productDetails.map(product => {
      const productId = product.product_id || product.id;
      return productId ? { ...product, product_id: productId } : product;
    });
  }

  return productDetails;
}

/**
 * 获取 Ozon 商品富属性详情。列表详情不返回 attributes 和尺寸重量，
 * 编辑页依赖这些字段回填模板属性，因此同步时需要额外合并。
 */
export async function getOzonProductAttributeDetails(
  store: any,
  productIds: number[]
): Promise<any[]> {
  if (!Array.isArray(productIds) || productIds.length === 0) return [];

  const apiData = await ozonApiRequest(
    OZON_PRODUCT_INFO_ATTRIBUTES_API,
    store.clientId,
    store.apiKey,
    'POST',
    {
      filter: {
        product_id: productIds.map(id => Number(id)).filter(Number.isFinite),
        visibility: 'ALL',
      },
      limit: Math.min(Math.max(productIds.length, 1), 1000),
    }
  );

  if (apiData?.result && Array.isArray(apiData.result)) {
    return apiData.result;
  }
  if (apiData?.result?.items && Array.isArray(apiData.result.items)) {
    return apiData.result.items;
  }
  if (Array.isArray(apiData?.items)) {
    return apiData.items;
  }
  return [];
}

function mergeOzonAttributeDetails(products: any[], attributeDetails: any[]): any[] {
  const detailsByProductId = new Map<string, any>();
  for (const detail of attributeDetails || []) {
    const productId = detail?.product_id ?? detail?.id;
    if (productId !== undefined && productId !== null) {
      detailsByProductId.set(String(productId), detail);
    }
  }

  return products.map(product => {
    const detail = detailsByProductId.get(String(product?.product_id));
    return detail ? mergeOzonProductDetails(product, detail) : product;
  });
}

/**
 * 同步产品到本地数据库（增量更新）
 */
export async function syncProductsToDatabase(
  storeId: number,
  userId?: number
): Promise<{ syncedCount: number; updatedCount: number; deletedCount: number; failCount: number; isInitial: boolean }> {
  try {
    const store = await prisma.ozonStore.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      throw new Error('店铺不存在');
    }

    logger.info(`开始增量同步店铺 ${store.name} 的产品数据...`);

    // 获取本地已有的产品映射（ozonProductId -> productId）
    const existingProducts = await prisma.warehouseItem.findMany({
      where: { ozonStoreId: storeId },
      select: { ozonProductId: true, productId: true, status: true }
    });
    
    const existingMap = new Map<string, { productId: number; status: string }>();
    for (const item of existingProducts) {
      if (item.ozonProductId) {
        existingMap.set(item.ozonProductId, { productId: item.productId, status: item.status });
      }
    }

    logger.info(`本地已存在 ${existingMap.size} 个产品`);

    // 获取所有产品ID（getOzonProductIds 内部已处理 ALL 和 ARCHIVED 两种可见性的分页获取）
    const limit = 1000;

    logger.info('开始从Ozon获取产品ID...');
    const allProductIds = await getOzonProductIds(store, limit);
    logger.info(`从Ozon总共获取到 ${allProductIds.length} 个产品ID（包含 ALL 和 ARCHIVED 状态）`);
    const warehouseContext = await getOzonWarehouseContext(store);

    // 标记需要删除的产品（本地存在但Ozon返回中没有）
    const ozonProductIdSet = new Set(allProductIds.map(id => id.toString()));
    const productsToDelete = existingProducts.filter(item => 
      item.ozonProductId && !ozonProductIdSet.has(item.ozonProductId)
    );

    // 分批获取产品详情
    const batchSize = 30;
    const batches = [];
    for (let i = 0; i < allProductIds.length; i += batchSize) {
      batches.push(allProductIds.slice(i, i + batchSize));
    }

    let syncedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    let batchFailCount = 0;
    let productFailCount = 0;
    const failedProductIds: { id: string; reason: string }[] = [];

    logger.info(`[Sync] 开始分批处理, 总批次: ${batches.length}`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`[Sync] 正在同步第 ${i + 1}/${batches.length} 批产品 (${batch.length}个ID)...`);

      try {
        let products = await getOzonProductDetails(store, batch);
        logger.info(`[Sync] 第 ${i + 1} 批获取到产品详情：${products.length} 个`);
        try {
          const attributeDetails = await getOzonProductAttributeDetails(store, batch);
          products = mergeOzonAttributeDetails(products, attributeDetails);
          logger.info(`[Sync] 第 ${i + 1} 批合并商品富属性：${attributeDetails.length} 个`);
        } catch (detailError: any) {
          logger.warn(`[Sync] 第 ${i + 1} 批商品富属性获取失败，将仅保存列表详情: ${detailError.message}`);
        }
        const fbsStocksByProductId = await getFbsStocksByWarehouse(
          store,
          products.map((product: any) => ({
            productId: String(product.product_id),
            sku: product.sku ? String(product.sku) : undefined,
            offerId: product.offer_id ? String(product.offer_id) : undefined,
          }))
        );

        // 提取并存储错误码到数据库
        if (products.length > 0) {
          await extractAndStoreErrorCodes(products);
        }

        for (const product of products) {
          const ozonProductId = product.product_id.toString();
          
          try {
            const productWithWarehouseStocks = enrichProductWarehouseStocks(
              product,
              warehouseContext,
              fbsStocksByProductId.get(ozonProductId) || []
            );
            const { data: productData, stock, warehouseStatus } = buildOzonProductData(productWithWarehouseStocks);

            const existing = existingMap.get(ozonProductId);

            if (existing) {
              // 获取现有产品的更新时间进行比较
              const existingProduct = await prisma.product.findUnique({
                where: { id: existing.productId },
                select: {
                  ozonUpdatedAt: true,
                }
              });

              // 判断产品数据是否有变化（通过比对更新时间）
              // 注意：如果现有产品没有新字段（visibility、totalStock等），也需要更新
              const existingFullProduct = await prisma.product.findUnique({
                where: { id: existing.productId },
                select: {
                  ozonUpdatedAt: true,
                  visibility: true,
                  totalStock: true,
                  hasErrors: true,
                  hasWarnings: true,
                }
              });
              
              // 获取接口返回的更新时间
              const apiUpdatedAt = product.updated_at ? new Date(product.updated_at) : null;
              
              // Ozon 的归档、错误、SKU、库存等字段不一定会推动 updated_at。
              // 商品管理依赖本地快照展示和统计，因此每次同步都覆盖本地 Ozon 快照。
              const hasProductChanged = true;

              // 判断仓库状态是否有变化
              const hasWarehouseChanged = existing.status !== warehouseStatus;

              if (hasProductChanged) {
                // 更新已有产品
                await prisma.product.update({
                  where: { id: existing.productId },
                  data: productData
                });
              }

              if (hasWarehouseChanged || hasProductChanged) {
                // 更新仓库商品状态和库存（状态变化或产品更新时都更新库存）
                await prisma.warehouseItem.update({
                  where: { 
                    id: (await prisma.warehouseItem.findFirst({
                      where: { productId: existing.productId, ozonStoreId: storeId },
                      select: { id: true }
                    }))!.id
                  },
                  data: { 
                    status: warehouseStatus,
                    inventoryQuantity: stock 
                  }
                });
              }

              // 只有当数据真正发生变化时才计入更新数量
              if (hasProductChanged || hasWarehouseChanged) {
                updatedCount++;
              }
            } else {
              // 新增产品
              const productRecord = await prisma.product.create({
                data: productData
              });

              await prisma.warehouseItem.create({
                data: {
                  productId: productRecord.id,
                  ozonStoreId: storeId,
                  ozonProductId: ozonProductId,
                  status: warehouseStatus,
                  inventoryQuantity: stock
                }
              });

              syncedCount++;
            }
          } catch (productError: any) {
            // 单个产品处理失败不影响同批次其他产品
            productFailCount++;
            const reason = productError.code 
              ? `Prisma ${productError.code}: ${productError.meta?.column_name || productError.message?.substring(0, 100)}`
              : productError.message?.substring(0, 100);
            failedProductIds.push({ id: ozonProductId, reason });
            logger.error(`[Sync] 产品 ${ozonProductId} (${product.name || 'N/A'}) 同步失败: ${productError.message?.substring(0, 200)}`);
          }
        }

        // 避免API调用过快
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (batchError: any) {
        // API 调用失败（整批无法获取详情）
        batchFailCount++;
        logger.error(`[Sync] 第 ${i + 1} 批产品详情获取失败:`, batchError.message, batchError.stack);
        // 继续处理下一批，不中断整个同步
      }
    }

    if (productFailCount > 0) {
      logger.warn(`[Sync] ${productFailCount} 个产品同步失败，失败ID: ${failedProductIds.map(f => f.id).join(', ')}`);
    }
    if (batchFailCount > 0) {
      logger.warn(`[Sync] ${batchFailCount} 批次获取失败`);
    }

    // 删除本地存在但Ozon返回中没有的产品
    if (productsToDelete.length > 0) {
      const productIdsToDelete = productsToDelete.map(item => item.productId);
      
      // 删除OzonListing关联记录
      await prisma.ozonListing.deleteMany({
        where: {
          warehouseItem: {
            productId: { in: productIdsToDelete },
            ozonStoreId: storeId
          }
        }
      });

      // 删除WarehouseItem记录
      const deleteWarehouseResult = await prisma.warehouseItem.deleteMany({
        where: {
          productId: { in: productIdsToDelete },
          ozonStoreId: storeId
        }
      });

      // 删除Product记录
      await prisma.product.deleteMany({
        where: {
          id: { in: productIdsToDelete },
          category: 'ozon_product'
        }
      });

      deletedCount = deleteWarehouseResult.count;
      logger.info(`删除 ${deletedCount} 个已不存在于Ozon的产品`);
    }

    logger.info(`[Sync] 同步完成: 新增 ${syncedCount} 个产品，更新 ${updatedCount} 个产品，删除 ${deletedCount} 个产品` + 
      (productFailCount > 0 ? `，失败 ${productFailCount} 个` : '') +
      (batchFailCount > 0 ? `，失败批次 ${batchFailCount}` : ''));
    if (productFailCount > 0) {
      logger.warn(`[Sync] 失败产品详情: ${JSON.stringify(failedProductIds.slice(0, 20))}${failedProductIds.length > 20 ? '...' : ''}`);
    }

    // 验证：查询同步后数据库中的产品总数
    const totalAfterSync = await prisma.warehouseItem.count({ where: { ozonStoreId: storeId } });
    logger.info(`[Sync] 同步后数据库中warehouseItems总数: ${totalAfterSync}, 更新前: ${existingMap.size}`);

    // 统计各状态商品数量
    const statusCounts = await prisma.warehouseItem.groupBy({
      by: ['status'],
      where: { ozonStoreId: storeId },
      _count: { id: true }
    });

    const statusCountMap = new Map<string, number>();
    for (const item of statusCounts) {
      statusCountMap.set(item.status, item._count.id);
    }

    const listedCount = (statusCountMap.get(ProductStatus.LISTED) || 0) + 
                        (statusCountMap.get(ProductStatus.SELLING) || 0);
    const pendingCount = statusCountMap.get(ProductStatus.PENDING) || 0;
    const moderatingCount = statusCountMap.get(ProductStatus.MODERATING) || 0;
    const readyCount = statusCountMap.get(ProductStatus.READY) || 0;
    const draftCount = statusCountMap.get(ProductStatus.DRAFT) || 0;
    const archivedCount = statusCountMap.get(ProductStatus.ARCHIVED) || 0;
    const errorCount = statusCountMap.get(ProductStatus.ERROR) || 0;
    const unlistedCount = statusCountMap.get(ProductStatus.UNLISTED) || 0;

    logger.info(`状态统计 - 在售: ${listedCount}, 待审核: ${pendingCount}, 审核中: ${moderatingCount}, 待上架: ${readyCount}, 草稿: ${draftCount}, 归档: ${archivedCount}, 错误: ${errorCount}, 已下架: ${unlistedCount}`);

    // 更新店铺的 productCount 字段（在售商品数量）
    await prisma.ozonStore.update({
      where: { id: storeId },
      data: { productCount: listedCount }
    });

    logger.info(`更新店铺在售商品数量: ${listedCount}`);

    // 记录同步日志（包含详细状态统计）
    await prisma.syncLog.create({
      data: {
        ozonStoreId: storeId,
        userId,
        syncType: 'product',
        syncedCount,
        updatedCount,
        deletedCount,
        status: 'success',
        message: `同步完成: 新增 ${syncedCount}, 更新 ${updatedCount}, 删除 ${deletedCount}${productFailCount > 0 ? `, 失败 ${productFailCount}` : ''}。状态统计: 在售 ${listedCount}, 待审核 ${pendingCount}, 审核中 ${moderatingCount}, 待上架 ${readyCount}, 草稿 ${draftCount}, 归档 ${archivedCount}, 错误 ${errorCount}, 已下架 ${unlistedCount}`
      }
    });

    return {
      syncedCount,
      updatedCount,
      deletedCount,
      failCount: productFailCount + batchFailCount,
      isInitial: existingMap.size === 0
    };
  } catch (error: any) {
    logger.error('同步产品失败:', error.message);
    
    // 记录失败日志
    await prisma.syncLog.create({
      data: {
        ozonStoreId: storeId,
        userId,
        syncType: 'product',
        status: 'failed',
        message: error.message
      }
    });
    
    throw error;
  }
}

/**
 * 从本地数据库获取产品列表（参考 OEasy 项目实现）
 */
export async function getProductsFromDatabase(
  storeId: number,
  offset: number = 0,
  limit: number = 10,
  status?: string,
  keyword?: string
): Promise<{ items: any[]; totalCount: number; allTotalCount: number; sellingCount: number; pendingCount: number; errorCount: number; readyCount: number; unlistedCount: number; archivedCount: number; lastUpdateTime: Date | null }> {
  try {
    // 构建where条件
    const whereCondition: any = { ozonStoreId: storeId };
    
    // 状态映射（与 Ozon 后台保持一致）
    // 销售中: selling（status_name="Продается"）
    // 准备销售: ready（status_name="Готов к продаже" 或有WARNING错误）
    // 错误: error（有ERROR级别错误）
    // 待修改: moderating（只有WARNING级别错误）
    // 商品已下架: unlisted（status_name="不出售"且有停止原因）
    // 档案: archived（is_archived=true）
    if (status && status !== 'all') {
      const statusMap: Record<string, string[]> = {
        'selling': ['selling', 'listed'],     // 销售中
        'pending': ['pending'],               // 准备销售 -> pending状态
        'error': ['error'],                   // 错误
        'ready': ['ready'],                   // 保留旧映射兼容
        'moderating': ['ready', 'moderating'], // 待修改 -> ready+moderating
        'unlisted': ['unlisted'],             // 商品已下架
        'archived': ['archived'],             // 档案
      };
      
      if (statusMap[status]) {
        whereCondition.status = { in: statusMap[status] };
      } else {
        whereCondition.status = status;
      }
    }

    logger.info(`[DB Query] storeId: ${storeId}, keyword: "${keyword || ''}", status: "${status || 'all'}"`);

    // 获取各状态数量（使用新表结构的字段）
    const warehouseItemsWithProduct = await prisma.warehouseItem.findMany({
      where: { ozonStoreId: storeId },
      include: { product: true }
    });
    
    // 统计各状态数量（与 Ozon 后台保持一致）
    let sellingCount = 0;
    let pendingCount = 0;
    let errorCount = 0;
    let readyCount = 0;
    let unlistedCount = 0;
    let archivedCount = 0;
    let nonArchivedCount = 0;
    
    for (const item of warehouseItemsWithProduct) {
      const product = item.product;
      if (!product) continue;
      
      // 使用新表结构的字段
      const isArchived = product.isArchived;
      const hasErrors = product.hasErrors;
      const hasWarnings = product.hasWarnings;
      const visibility = product.visibility;
      const statusName = product.statusName;
      const totalStock = product.totalStock;
      const hasNoStock = totalStock === 0;
      
      // 解析原始数据获取额外信息
      const originalData = parseOzonOriginalData(product.ozonOriginalData);
      
      // 获取 status_failed（用于判断商品已下架）
      const statuses = originalData?.statuses;
      let hasStatusFailed = false;
      if (statuses) {
        const statusFailed = Array.isArray(statuses) ? statuses[0]?.status_failed : statuses.status_failed;
        hasStatusFailed = statusFailed && statusFailed !== '' && statusFailed !== 'none';
      }
      
      // 只有WARNING级别错误（没有ERROR错误，但有WARNING错误）
      const hasWarningOnly = hasWarnings && !hasErrors;
      
      // 获取status_failed（用于判断商品已下架）
      const statusFailed = originalData?.statuses?.status_failed || (Array.isArray(statuses) ? statuses[0]?.status_failed : (statuses?.status_failed || null));
      
      const isSelling = statusName === 'Продается' || statusName === '袩褉芯写邪械褌褋褟'; // 俄语"销售中"（处理乱码情况）
      const ozonSku = product.ozonSku;
      const hasSku = ozonSku && ozonSku !== '0';
      const isNotForSale = statusName === '不出售' || statusName === 'Не продается' || statusName === '袧械 锌褉芯写邪械褌褋褟';
      const isReadyForSaleStatus = statusName === 'Готов к продаже' || statusName === '袚芯褌芯胁 泻 锌褉芯写邪卸械';
      
      // Ozon 后台各 Tab 不是互斥状态：
      // 销售中/准备销售主要看 status_name，错误/待修改按 errors.level 单独统计。
      
      // 使用新表结构的isArchived字段判断归档状态（与Ozon后台一致）
      if (isArchived) {
        archivedCount++;
      } else {
        nonArchivedCount++;
      }
      
      if (!isArchived && isSelling) {
        sellingCount++;
      }

      if (!isArchived && isReadyForSaleStatus) {
        readyCount++;
      }

      if (!isArchived && hasErrors) {
        errorCount++;
      }

      if (!isArchived && hasWarningOnly) {
        pendingCount++;
      }

      if (!isArchived && isNotForSale && !hasErrors && !hasWarnings) {
        unlistedCount++;
      }
    }

    // 获取产品列表（数据库层按归档状态和关键词过滤，减少数据传输量）
    // 构建 product 过滤条件
    const productFilter: any = {
      isArchived: status === 'archived' ? true : false
    };
    
    // 添加关键词过滤（搜索商品名称、翻译名称）
    if (keyword) {
      productFilter.OR = [
        { titleOriginal: { contains: keyword } },
        { titleTranslated: { contains: keyword } },
      ];
    }
    
    const allWarehouseItems = await prisma.warehouseItem.findMany({
      where: {
        ozonStoreId: storeId,
        product: productFilter
      },
      include: { product: true },
      orderBy: { createdAt: 'desc' }
    });
    
    logger.info(`[DB Query] allWarehouseItems数量: ${allWarehouseItems.length}, filter: ${JSON.stringify(productFilter)}`);
    
    // 根据状态参数过滤商品列表（使用 Product 字段直接判断，与计数条件完全一致）
    let filteredItems = allWarehouseItems.filter(item => {
      const product = item.product;
      if (!product) return false;
      const isArchived = product.isArchived;
      const hasErrors = product.hasErrors;
      const hasWarnings = product.hasWarnings;
      const statusName = product.statusName;
      const ozonSku = product.ozonSku;
      const hasWarningOnly = hasWarnings && !hasErrors;
      const hasSku = ozonSku && ozonSku !== '0';
      const isSelling = statusName === 'Продается' || statusName === '袩褉芯写邪械褌褋褟';
      const isNotForSale = statusName === '不出售' || statusName === 'Не продается' || statusName === '袧械 锌褉芯写邪械褌褋褟';
      const isReadyForSaleStatus = statusName === 'Готов к продаже' || statusName === '袚芯褌芯胁 泻 锌褉芯写邪卸械';
      const isUnlisted = isNotForSale && !isArchived && !hasErrors && !hasWarnings;
      
      switch (status) {
        case 'selling':
          return !isArchived && isSelling;
        case 'pending':
          return !isArchived && isReadyForSaleStatus;
        case 'error':
          return !isArchived && hasErrors;
        case 'moderating':
          return !isArchived && hasWarningOnly;
        case 'unlisted':
          return isUnlisted;
        case 'archived':
          return isArchived;
        case 'all':
        default:
          return !isArchived;
      }
    });
    
    const totalCount = filteredItems.length;
    
    // 应用分页
    const warehouseItems = filteredItems.slice(offset, offset + limit);

    // 获取所有商品的 description_category_id 和 type_id 用于批量查询类目。
    // 列表展示与 Ozon 后台一致，优先显示 type_id 对应的商品类型。
    const categoryIds: bigint[] = [];
    for (const item of warehouseItems) {
      const ids = [
        item.product?.ozonCategoryId,
        parseOzonOriginalData(item.product?.ozonOriginalData)?.type_id,
      ];
      for (const id of ids) {
        if (id === null || id === undefined || id === '') continue;
        try {
          const bigintId = typeof id === 'bigint' ? id : BigInt(id);
          categoryIds.push(bigintId);
        } catch (e) {
          logger.warn(`无法转换类目ID: ${id}`);
        }
      }
    }

    // 批量查询类目信息
    const categories: Record<string, string> = {};
    if (categoryIds.length > 0) {
      const categoryRecords = await prisma.ozonCategory.findMany({
        where: { ozonId: { in: categoryIds } },
        select: { ozonId: true, name: true, path: true }
      });
      for (const cat of categoryRecords) {
        const key = cat.ozonId.toString();
        categories[key] = cat.path ? `${cat.path}/${cat.name}` : cat.name;
      }
    }

    // 转换为产品列表 - 处理BigInt
    const items = warehouseItems.map(item => {
      const categoryName = item.product
        ? resolveOzonProductCategoryDisplayName(item.product, categories)
        : '-';
      
      // 判断归档类型（根据用户规则）
      // isArchived==1的商品显示在档案tab中
      // isAutoArchived==1表示自动归档，isAutoArchived==0表示手动归档（档案）
      let archiveType = null;
      let archiveReason = null;
      let finalStatus = mapStatusToFrontend(item.status);
      let finalStatusZh = getStatusZh(finalStatus);
      
      if (item.product && item.product.isArchived === true) {
        // 归档商品强制显示为归档状态
        finalStatus = 'archived';
        finalStatusZh = item.product.isAutoArchived === true ? '自动归档' : '档案';
        
        if (item.product.isAutoArchived === true) {
          archiveType = 'auto'; // 自动归档
          archiveReason = '我们自动隐藏了该商品，因为它不符合绩效标准';
        } else {
          archiveType = 'manual'; // 手动归档
          archiveReason = '商品已被隐藏，买家看到它的状态为"无现货"';
        }
      }
      
      // 当按Tab筛选时，强制同步 finalStatusZh（确保前端显示正确文本）
      if (status === 'moderating' && finalStatus === 'ready') {
        // ready WS under 待修改 tab → force status for correct Chinese display
        finalStatusZh = '待修改';
      }
      
      // 获取 offerId（数据库必填字段，优先 Product 表，兼容旧数据从原始数据提取）
      let dbOfferId: string = item.product?.offerId || String(item.ozonProductId);
      if (item.product?.ozonOriginalData) {
        try {
          const raw = typeof item.product.ozonOriginalData === 'string'
            ? JSON.parse(item.product.ozonOriginalData)
            : item.product.ozonOriginalData;
          if (raw?.offer_id) dbOfferId = String(raw.offer_id);
        } catch { /* ignore parse errors */ }
      }

      return {
        id: item.id,
        productId: item.ozonProductId,
        offerId: dbOfferId,
        name: item.product?.titleOriginal || '',
        nameZh: '', // 留空，前端后续添加翻译功能
        price: item.product?.price || 0,
        status: finalStatus,
        statusZh: finalStatusZh,
        stock: item.inventoryQuantity,
        createdAt: item.product?.ozonCreatedAt || item.createdAt, // 优先显示Ozon创建时间
        ozonCreatedAt: item.product?.ozonCreatedAt, // Ozon平台创建时间
        localCreatedAt: item.createdAt, // 本系统创建时间
        categoryName: categoryName,
        archiveType: archiveType, // 添加归档类型：manual(手动归档) / auto(自动归档)
        archiveReason: archiveReason, // 添加归档原因提示
        product: item.product ? convertBigIntToString(item.product) : null
      };
    });

    // 获取最后更新时间（从同步日志表获取）
    const lastSyncResult = await prisma.syncLog.findFirst({
      where: { ozonStoreId: storeId, syncType: 'product', status: 'success' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    return { 
      items, 
      totalCount,
      allTotalCount: nonArchivedCount,
      sellingCount,
      pendingCount,
      errorCount,
      readyCount,
      unlistedCount,
      archivedCount,
      lastUpdateTime: lastSyncResult?.createdAt || null
    };
  } catch (error: any) {
    logger.error('获取本地产品列表失败:', error.message);
    throw error;
  }
}

/**
 * 映射后端状态到前端状态
 */
function mapStatusToFrontend(status: string): string {
  const statusMap: Record<string, string> = {
    'listed': 'selling',
    'selling': 'selling',
    'ready': 'ready',
    'pending': 'pending',
    'error': 'error',
    'failed': 'error',
    'rejected': 'error',
    'moderating': 'moderating',
    'analyzing': 'moderating',
    'unlisted': 'unlisted',
    'not_selling': 'unlisted',
    'archived': 'archived',
  };
  return statusMap[status] || status;
}

/**
 * 获取中文状态（与 Ozon 后台保持一致）
 */
function getStatusZh(status: string): string {
  const map: Record<string, string> = {
    'selling': '销售中',
    'listed': '销售中',
    'pending': '准备销售',
    'ready': '待修改',
    'error': '错误',
    'moderating': '待修改',
    'unlisted': '商品已下架',
    'archived': '档案',
    'draft': '草稿',
    'failed': '失败'
  };
  return map[status] || '未知';
}

/**
 * 删除产品
 */
export async function deleteProductFromDatabase(id: number): Promise<void> {
  try {
    // 首先查找warehouseItem
    const warehouseItem = await prisma.warehouseItem.findUnique({
      where: { id }
    });

    if (!warehouseItem) {
      throw new Error('产品不存在');
    }

    // 删除关联的product
    if (warehouseItem.productId) {
      await prisma.product.delete({
        where: { id: warehouseItem.productId }
      });
    }

    // 删除warehouseItem
    await prisma.warehouseItem.delete({
      where: { id }
    });
  } catch (error: any) {
    logger.error('删除产品失败:', error.message);
    throw error;
  }
}

// Ozon商品上架API
const OZON_PRODUCT_IMPORT_API = 'https://api-seller.ozon.ru/v3/product/import';
const OZON_PRODUCT_PRICE_API = 'https://api-seller.ozon.ru/v1/product/import/prices';
const OZON_NO_BRAND_DICTIONARY_VALUE_ID = 126745801;
const OZON_NO_BRAND_DICTIONARY_VALUE = 'Нет бренда';
const OZON_PRODUCT_STOCK_API = 'https://api-seller.ozon.ru/v2/products/stocks';
const OZON_PRODUCT_INFO_API_V2 = 'https://api-seller.ozon.ru/v2/product/info';
const OZON_PRODUCT_ARCHIVE_API = 'https://api-seller.ozon.ru/v1/product/archive';
const OZON_PRODUCT_UNARCHIVE_API = 'https://api-seller.ozon.ru/v1/product/unarchive';

/**
 * 一键上架商品到Ozon
 * @param store - Ozon店铺信息
 * @param productData - 商品数据
 * @returns 上架结果
 */
export async function listProductToOzon(
  store: any,
  productData: any
): Promise<any> {
  try {
    logger.info(`开始上架商品到Ozon: ${productData.titleOriginal}`);

    // 构建商品上架请求数据
    const importData = {
      category_id: productData.ozonCategoryId || productData.categoryId,
      name: productData.titleOriginal,
      description: productData.descriptionOriginal || ' ',
      images: productData.images || [],
      attributes: productData.attributes || [],
      offer_id: `OFFER_${Date.now()}`,
      price: productData.price || 0,
      stock: productData.stock || 1,
      currency_code: productData.currencyCode || 'RUB',
      vat: productData.vat || 0,
    };

    logger.info(`上架请求数据: ${JSON.stringify(importData)}`);

    const apiData = await ozonApiRequest(
      OZON_PRODUCT_IMPORT_API,
      store.clientId,
      store.apiKey,
      'POST',
      importData
    );

    logger.info(`上架API返回结果: ${JSON.stringify(apiData)}`);

    if (apiData.result && apiData.result.product_id) {
      // 上架成功，更新本地数据库状态
      return {
        success: true,
        productId: apiData.result.product_id.toString(),
        offerId: apiData.result.offer_id,
        message: '商品上架成功'
      };
    } else {
      throw new Error(apiData.message || '上架失败');
    }
  } catch (error: any) {
    logger.error('上架商品失败:', error.message);
    throw error;
  }
}

// Ozon商品导入任务状态查询API
const OZON_PRODUCT_IMPORT_INFO_API = 'https://api-seller.ozon.ru/v1/product/import/info';

function hasOzonAttributeValue(value: any): boolean {
  if (value === false || value === 0) return true;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') {
    return value.value !== undefined || value.valueId !== undefined || value.id !== undefined;
  }
  return value !== undefined && value !== null && value !== '';
}

function normalizeAttributeMetadataList(productData: any): Array<Record<string, any>> {
  const templateSnapshot = productData?.templateSnapshot;
  if (!templateSnapshot || typeof templateSnapshot !== 'object') {
    return [];
  }

  const groups = [
    templateSnapshot.baseAttributes,
    templateSnapshot.variantAttributes,
    templateSnapshot.commonVariantAttributes,
    templateSnapshot.hiddenAttributes,
    templateSnapshot.skuDimensionCandidates,
    templateSnapshot.rawAttributes,
  ];

  return groups.flatMap(group => Array.isArray(group) ? group : []).filter(Boolean);
}

function buildAttributeMetadataMap(productData: any): Map<number, Record<string, any>> {
  const metadata = new Map<number, Record<string, any>>();
  for (const item of normalizeAttributeMetadataList(productData)) {
    const id = Number(item?.id);
    if (Number.isFinite(id) && !metadata.has(id)) {
      metadata.set(id, item);
    }
  }
  return metadata;
}

function normalizeOzonAttributeName(value: any): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .trim();
}

function isBrandAttribute(attributeMeta?: Record<string, any> | null): boolean {
  const name = normalizeOzonAttributeName(attributeMeta?.name);
  return Boolean(name && (name.includes('品牌') || name === 'brand' || name.includes('бренд')));
}

function isBrandAttributeId(attributeId: number): boolean {
  return attributeId === 85;
}

function isModelNameAttribute(attributeId: number, attributeMeta?: Record<string, any> | null): boolean {
  const name = normalizeOzonAttributeName(attributeMeta?.name);
  if (attributeId === 9048 || attributeId === 12141) return true;
  return Boolean(name && (
    name.includes('型号名称') ||
    name.includes('模型名称') ||
    name.includes('名称模板的模型名称') ||
    name.includes('modelname') ||
    name.includes('modelnamefornametemplate') ||
    name.includes('названиемодели')
  ));
}

function isNoBrandValue(value: any): boolean {
  const normalized = normalizeOzonAttributeName(value);
  return normalized === '无品牌' || normalized === 'нетбренда' || normalized === 'nobrand';
}

function findTemplateDictionaryValue(attributeMeta: Record<string, any> | null | undefined, value: any) {
  const text = String(value || '').trim();
  if (!text || !Array.isArray(attributeMeta?.values)) return null;
  const normalized = normalizeOzonAttributeName(text);
  return attributeMeta.values.find((item: any) => {
    const itemValue = String(item?.value || '').trim();
    return normalizeOzonAttributeName(itemValue) === normalized;
  }) || null;
}

type ImportDictionaryValue = {
  ozonAttributeId: number;
  valueId: number;
  value: string;
};

function findCachedDictionaryValue(dictionaryValues: ImportDictionaryValue[] | undefined, attributeId: number, value: any) {
  const text = String(value || '').trim();
  if (!text || !Array.isArray(dictionaryValues) || dictionaryValues.length === 0) return null;
  const normalized = normalizeOzonAttributeName(text);
  return dictionaryValues.find(item => {
    return Number(item.ozonAttributeId) === Number(attributeId)
      && normalizeOzonAttributeName(item.value) === normalized;
  }) || null;
}

function buildBaseFieldAttributeValue(
  attributeMeta: Record<string, any>,
  value: any,
  attributeId: number,
  dictionaryValues?: ImportDictionaryValue[],
) {
  const text = String(value || '').trim();
  if (!text) return null;
  const dictionaryValueId = value && typeof value === 'object'
    ? value.valueId ?? value.id ?? value.dictionary_value_id
    : null;
  if (dictionaryValueId !== undefined && dictionaryValueId !== null && dictionaryValueId !== '') {
    return {
      valueId: Number(dictionaryValueId),
      value: text,
    };
  }
  const dictionaryValue = findTemplateDictionaryValue(attributeMeta, text);
  if (dictionaryValue?.id !== undefined && dictionaryValue.id !== null && dictionaryValue.id !== '') {
    return {
      valueId: dictionaryValue.id,
      value: dictionaryValue.value || text,
    };
  }
  const cachedDictionaryValue = findCachedDictionaryValue(dictionaryValues, attributeId, text);
  if (cachedDictionaryValue) {
    return {
      valueId: cachedDictionaryValue.valueId,
      value: cachedDictionaryValue.value || text,
    };
  }
  if (isBrandAttribute(attributeMeta) && isNoBrandValue(text)) {
    return {
      valueId: OZON_NO_BRAND_DICTIONARY_VALUE_ID,
      value: OZON_NO_BRAND_DICTIONARY_VALUE,
    };
  }
  return { value: text };
}

function addBaseFieldOzonAttributes(
  target: Map<number, Array<Record<string, any>>>,
  productData: any,
  attributeMetaMap: Map<number, Record<string, any>>,
  dictionaryValues?: ImportDictionaryValue[],
) {
  for (const [attributeId, meta] of attributeMetaMap.entries()) {
    if (target.has(attributeId)) continue;
    if (isBrandAttribute(meta)) {
      addOzonAttribute(
        target,
        attributeId,
        buildBaseFieldAttributeValue(meta, productData.brand, attributeId, dictionaryValues),
        meta,
      );
      continue;
    }
    if (isModelNameAttribute(attributeId, meta)) {
      addOzonAttribute(
        target,
        attributeId,
        buildBaseFieldAttributeValue(meta, productData.modelName || productData.offerId, attributeId, dictionaryValues),
        meta,
      );
    }
  }
}

function isUrlLikeAttribute(attributeMeta?: Record<string, any> | null): boolean {
  if (!attributeMeta) return false;
  const text = [
    attributeMeta.name,
    attributeMeta.description,
    attributeMeta.group_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /(https?:\/\/|url|链接|link|pdf|文件|video|mp4|mov)/i.test(text);
}

function isValidExternalUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return Boolean(url.hostname && url.hostname.includes('.'));
  } catch {
    return false;
  }
}

function toOzonAttributeValues(value: any, attributeMeta?: Record<string, any> | null): Array<Record<string, any>> {
  if (!hasOzonAttributeValue(value)) return [];
  if (Array.isArray(value)) {
    return value.flatMap(item => toOzonAttributeValues(item, attributeMeta));
  }
  if (value && typeof value === 'object') {
    const valueText = value.value !== undefined && value.value !== null ? String(value.value) : '';
    const dictionaryValueId = value.valueId ?? value.id;
    const result: Record<string, any> = {};
    if (dictionaryValueId !== undefined && dictionaryValueId !== null && dictionaryValueId !== '') {
      result.dictionary_value_id = Number(dictionaryValueId);
    }
    if (valueText) {
      if (isUrlLikeAttribute(attributeMeta) && !isValidExternalUrl(valueText)) {
        return [];
      }
      result.value = valueText;
    }
    return Object.keys(result).length > 0 ? [result] : [];
  }

  const valueText = String(value);
  if (isUrlLikeAttribute(attributeMeta) && !isValidExternalUrl(valueText)) {
    return [];
  }
  return [{ value: valueText }];
}

function normalizeAttributeValueForImport(
  attributeMeta: Record<string, any> | null | undefined,
  value: any,
): any {
  if (!hasOzonAttributeValue(value)) return null;

  if (Array.isArray(value)) {
    const normalized = value
      .map(item => normalizeAttributeValueForImport(attributeMeta, item))
      .flat()
      .filter(Boolean);
    return normalized.length > 0 ? normalized : null;
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.value)) {
      const normalized = value.value
        .map((item: any) => normalizeAttributeValueForImport(attributeMeta, item))
        .flat()
        .filter(Boolean);
      return normalized.length > 0 ? normalized : null;
    }

    const rawValue = value.value !== undefined && value.value !== null ? String(value.value).trim() : '';
    const rawValueId = value.valueId ?? value.id ?? value.dictionary_value_id;
    const result: Record<string, any> = {};

    if (rawValueId !== undefined && rawValueId !== null && rawValueId !== '') {
      result.valueId = Number(rawValueId);
    }
    if (rawValue) {
      if (isUrlLikeAttribute(attributeMeta) && !isValidExternalUrl(rawValue)) {
        return null;
      }
      result.value = rawValue;
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  const text = String(value).trim();
  if (!text) return null;
  if (attributeMeta?.type === 'boolean') {
    if (/^(1|true|yes|y|是|有|可|对|启用|打开)$/i.test(text)) {
      return { value: 'true' };
    }
    if (/^(0|false|no|n|否|无|不可|关|关闭)$/i.test(text)) {
      return { value: 'false' };
    }
  }
  if (isUrlLikeAttribute(attributeMeta) && !isValidExternalUrl(text)) {
    return null;
  }
  return { value: text };
}

function addOzonAttribute(
  target: Map<number, Array<Record<string, any>>>,
  attributeId: any,
  value: any,
  attributeMeta?: Record<string, any> | null
) {
  const id = Number(attributeId);
  if (!Number.isFinite(id)) return;
  const values = toOzonAttributeValues(value, attributeMeta);
  if (values.length === 0) return;
  const current = target.get(id) || [];
  target.set(id, [...current, ...values]);
}

function ensureBaseOzonAttributesPresent(
  attributes: Array<{ id: number; values: Array<Record<string, any>> }>,
  productData: any,
): Array<{ id: number; values: Array<Record<string, any>> }> {
  const result = Array.isArray(attributes) ? [...attributes] : [];
  const existingIds = new Set(result.map(item => Number(item?.id)).filter(id => Number.isFinite(id)));
  const pushFallback = (attributeId: number, value: any) => {
    const text = String(value || '').trim();
    if (!text || existingIds.has(attributeId)) return;
    if (attributeId === 85 && isNoBrandValue(text)) {
      result.push({
        id: attributeId,
        values: [{ dictionary_value_id: OZON_NO_BRAND_DICTIONARY_VALUE_ID, value: OZON_NO_BRAND_DICTIONARY_VALUE }],
      });
      existingIds.add(attributeId);
      return;
    }
    result.push({
      id: attributeId,
      values: [{ value: text }],
    });
    existingIds.add(attributeId);
  };

  pushFallback(85, productData?.brand || '无品牌');
  pushFallback(9048, productData?.modelName || productData?.offerId);

  return result;
}

export function enrichOzonProductAttributesForImport(
  productData: any,
  dictionaryValues: ImportDictionaryValue[] = [],
): Array<{ id: number; values: Array<Record<string, any>> }> {
  const attributes = new Map<number, Array<Record<string, any>>>();
  const attributeMetaMap = buildAttributeMetadataMap(productData);

  const addRecord = (record: any) => {
    if (!record) return;
    if (Array.isArray(record)) {
      for (const item of record) {
        const attributeId = item.id ?? item.attribute_id ?? item.attributeId;
        const attributeMeta = attributeMetaMap.get(Number(attributeId));
        if (isBrandAttributeId(Number(attributeId)) || isBrandAttribute(attributeMeta) || isModelNameAttribute(Number(attributeId), attributeMeta)) {
          continue;
        }
        addOzonAttribute(attributes, attributeId, normalizeAttributeValueForImport(attributeMeta, item.values ?? item.value), attributeMeta);
      }
      return;
    }
    if (typeof record === 'object') {
      for (const [attributeId, value] of Object.entries(record)) {
        const attributeMeta = attributeMetaMap.get(Number(attributeId));
        if (isBrandAttributeId(Number(attributeId)) || isBrandAttribute(attributeMeta) || isModelNameAttribute(Number(attributeId), attributeMeta)) {
          continue;
        }
        addOzonAttribute(attributes, attributeId, normalizeAttributeValueForImport(attributeMeta, value), attributeMeta);
      }
    }
  };

  addRecord(productData.attributes);
  addRecord(productData.hiddenAttributes);
  if (Array.isArray(productData.variantAttributes)) {
    for (const item of productData.variantAttributes) {
      const attributeMeta = attributeMetaMap.get(Number(item.attributeId));
      addOzonAttribute(attributes, item.attributeId, normalizeAttributeValueForImport(attributeMeta, {
        value: item.value,
        valueId: item.valueId,
      }), attributeMeta);
    }
  }

  addBaseFieldOzonAttributes(attributes, productData, attributeMetaMap, dictionaryValues);

  const result = Array.from(attributes.entries()).map(([id, values]) => ({ id, values }));
  return ensureBaseOzonAttributesPresent(result, productData);
}

export function buildOzonProductAttributesForImport(productData: any): Array<{ id: number; values: Array<Record<string, any>> }> {
  return enrichOzonProductAttributesForImport(productData);
}

async function loadImportDictionaryValues(productData: any): Promise<ImportDictionaryValue[]> {
  const descriptionCategoryId = Number(productData?.descriptionCategoryId);
  if (!Number.isFinite(descriptionCategoryId)) return [];

  const attributeMetaMap = buildAttributeMetadataMap(productData);
  const requestedValues: Array<{ attributeId: number; value: string }> = [];
  for (const [attributeId, meta] of attributeMetaMap.entries()) {
    if (isBrandAttribute(meta) && productData?.brand) {
      requestedValues.push({ attributeId, value: String(productData.brand).trim() });
    } else if (isModelNameAttribute(attributeId, meta) && (productData?.modelName || productData?.offerId)) {
      requestedValues.push({ attributeId, value: String(productData.modelName || productData.offerId).trim() });
    }
  }
  const normalizedRequests = requestedValues
    .filter(item => item.value)
    .filter((item, index, array) => {
      const key = `${item.attributeId}:${normalizeOzonAttributeName(item.value)}`;
      return array.findIndex(other => `${other.attributeId}:${normalizeOzonAttributeName(other.value)}` === key) === index;
    });
  if (normalizedRequests.length === 0) return [];

  const ozonAttributeIds = Array.from(new Set(normalizedRequests.map(item => item.attributeId)));
  const typeId = productData?.typeId !== undefined && productData?.typeId !== null ? Number(productData.typeId) : null;
  const attributes = await prisma.ozonCategoryAttribute.findMany({
    where: {
      descriptionCategoryId,
      ozonAttributeId: { in: ozonAttributeIds },
      ...(Number.isFinite(typeId) ? { typeId } : {}),
    },
    select: {
      ozonAttributeId: true,
      attributeValues: {
        select: {
          valueId: true,
          value: true,
        },
      },
    },
  });

  const result: ImportDictionaryValue[] = [];
  for (const attribute of attributes) {
    const requestsForAttribute = normalizedRequests.filter(item => item.attributeId === attribute.ozonAttributeId);
    for (const value of attribute.attributeValues) {
      const matched = requestsForAttribute.some(request => {
        return normalizeOzonAttributeName(request.value) === normalizeOzonAttributeName(value.value);
      });
      if (matched) {
        result.push({
          ozonAttributeId: attribute.ozonAttributeId,
          valueId: value.valueId,
          value: value.value,
        });
      }
    }
  }
  return result;
}

export function assertRequiredOzonAttributesForImport(
  productData: any,
  attributes: Array<{ id: number; values: Array<Record<string, any>> }>,
) {
  const requiredIds = Array.isArray(productData?.templateSnapshot?.requiredAttributeIds)
    ? productData.templateSnapshot.requiredAttributeIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
    : [];
  if (requiredIds.length === 0) return;

  const submittedIds = new Set(attributes.map(item => Number(item.id)));
  const missingRequiredIds = requiredIds.filter((id: number) => !submittedIds.has(id));
  if (missingRequiredIds.length > 0) {
    throw new Error(`上架失败：Ozon 必填属性未进入提交数据（属性ID：${missingRequiredIds.join(', ')}），请先完善商品模板属性后重试`);
  }
}

function toOzonStringNumber(value: any, fallback: number | string = 0): string {
  const numberValue = value === undefined || value === null || value === '' ? fallback : value;
  return String(numberValue);
}

function pickFirstMeaningful(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function toPositiveNumber(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function toPositiveInteger(value: any): number | null {
  const numberValue = toPositiveNumber(value);
  return numberValue !== null && Number.isSafeInteger(numberValue) ? numberValue : null;
}

function toNonNegativeInteger(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) && numberValue >= 0 ? numberValue : null;
}

function normalizeOzonCurrencyCode(value: any, fallback = 'RUB'): string {
  const currencyCode = String(value || '').trim().toUpperCase();
  const fallbackCurrencyCode = String(fallback || '').trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(currencyCode)) return currencyCode;
  return /^[A-Z]{3}$/.test(fallbackCurrencyCode) ? fallbackCurrencyCode : 'RUB';
}

function summarizeOzonImportItem(item: any) {
  return {
    product_id: item.product_id,
    description_category_id: item.description_category_id,
    type_id: item.type_id,
    offer_id: item.offer_id,
    name: item.name,
    price: item.price,
    old_price: item.old_price,
    min_price: item.min_price,
    currency_code: item.currency_code,
    vat: item.vat,
    imagesCount: Array.isArray(item.images) ? item.images.length : 0,
    hasPrimaryImage: Boolean(item.primary_image),
    attributesCount: Array.isArray(item.attributes) ? item.attributes.length : 0,
    depth: item.depth,
    width: item.width,
    height: item.height,
    weight: item.weight,
  };
}

async function getLocalOzonProductRawData(productId: string): Promise<any> {
  const product = await prisma.product.findUnique({
    where: { ozonProductId: String(productId) },
    select: {
      offerId: true,
      ozonSku: true,
      price: true,
      oldPrice: true,
      currencyCode: true,
      vat: true,
      primaryImage: true,
      images: true,
      ozonCategoryId: true,
      ozonOriginalData: true,
    },
  });

  if (!product) return {};
  const raw = product.ozonOriginalData && typeof product.ozonOriginalData === 'object'
    ? product.ozonOriginalData as any
    : {};

  return {
    ...raw,
    offer_id: raw.offer_id || product.offerId,
    sku: raw.sku || product.ozonSku,
    price: pickFirstMeaningful(raw.price, product.price),
    old_price: pickFirstMeaningful(raw.old_price, product.oldPrice),
    currency_code: raw.currency_code || product.currencyCode,
    vat: raw.vat || product.vat,
    primary_image: raw.primary_image || product.primaryImage,
    images: raw.images || product.images,
    description_category_id: pickFirstMeaningful(raw.description_category_id, product.ozonCategoryId),
  };
}

export function buildOzonImportUpdateItem(productData: any, localRaw: any = {}) {
  const images = Array.isArray(productData.images) && productData.images.length > 0
    ? productData.images
    : (Array.isArray(localRaw.images) ? localRaw.images : []);
  const primaryImage = pickFirstMeaningful(productData.imageUrl, images[0], localRaw.primary_image, localRaw.primaryImage);
  const fullImages = primaryImage && !images.includes(primaryImage) ? [primaryImage, ...images] : images;
  const descriptionCategoryId = toPositiveNumber(pickFirstMeaningful(
    productData.descriptionCategoryId,
    productData.description_category_id,
    localRaw.description_category_id
  ));
  const typeId = toPositiveNumber(pickFirstMeaningful(productData.typeId, productData.type_id, localRaw.type_id));
  const price = toOzonStringNumber(pickFirstMeaningful(productData.price, localRaw.price));
  const oldPrice = pickFirstMeaningful(productData.oldPrice, localRaw.old_price);
  const minPrice = pickFirstMeaningful(productData.minPrice, localRaw.min_price);

  return {
    product_id: Number(productData.productId),
    description_category_id: descriptionCategoryId,
    type_id: typeId,
    name: pickFirstMeaningful(productData.name, localRaw.name),
    description: pickFirstMeaningful(productData.description, localRaw.description, ' '),
    primary_image: primaryImage || '',
    images: fullImages,
    attributes: Array.isArray(productData.attributes) && productData.attributes.length > 0
      ? productData.attributes
      : (Array.isArray(localRaw.attributes) ? localRaw.attributes : []),
    offer_id: pickFirstMeaningful(productData.offerId, localRaw.offer_id),
    price,
    old_price: oldPrice ? toOzonStringNumber(oldPrice) : undefined,
    min_price: minPrice ? toOzonStringNumber(minPrice) : undefined,
    currency_code: normalizeOzonCurrencyCode(productData.currencyCode || localRaw.currency_code),
    vat: productData.vat || localRaw.vat || '0',
    depth: toPositiveNumber(pickFirstMeaningful(productData.packageLength, localRaw.depth, localRaw.package_length)) || 0,
    width: toPositiveNumber(pickFirstMeaningful(productData.packageWidth, localRaw.width, localRaw.package_width)) || 0,
    height: toPositiveNumber(pickFirstMeaningful(productData.packageHeight, localRaw.height, localRaw.package_height)) || 0,
    dimension_unit: localRaw.dimension_unit || 'mm',
    weight: toPositiveNumber(pickFirstMeaningful(productData.grossWeight, localRaw.weight, localRaw.gross_weight)) || 0,
    weight_unit: localRaw.weight_unit || 'g',
  };
}

export function validateOzonImportUpdateItem(item: any) {
  const errors: string[] = [];
  if (!toPositiveNumber(item.product_id)) errors.push('product_id 必须大于 0');
  if (!toPositiveNumber(item.description_category_id)) errors.push('description_category_id 必须大于 0');
  if (!toPositiveNumber(item.type_id)) errors.push('type_id 必须大于 0');
  if (!item.offer_id) errors.push('offer_id 不能为空');
  if (typeof item.price !== 'string' || !item.price) errors.push('price 必须是非空字符串');
  if (!item.primary_image) errors.push('primary_image 不能为空');
  if (!Array.isArray(item.images) || item.images.length === 0) errors.push('images 不能为空');
  if (!toPositiveNumber(item.depth)) errors.push('depth 必须大于 0');
  if (!toPositiveNumber(item.width)) errors.push('width 必须大于 0');
  if (!toPositiveNumber(item.height)) errors.push('height 必须大于 0');
  if (!toPositiveNumber(item.weight)) errors.push('weight 必须大于 0');
  if (!Array.isArray(item.attributes) || item.attributes.length === 0) errors.push('attributes 不能为空');
  return errors;
}

function normalizeOzonImageUrl(value: any): string {
  if (!value) return '';
  const url = typeof value === 'string'
    ? value
    : value.fileUrl || value.url || value.imageUrl || '';
  const normalized = String(url || '').trim();
  if (!normalized || /^https?:\/\//i.test(normalized)) return normalized;

  const publicImageBaseUrl = (process.env.PUBLIC_IMAGE_BASE_URL || '').trim().replace(/\/+$/, '');
  if (publicImageBaseUrl && normalized.startsWith('/')) {
    return `${publicImageBaseUrl}${normalized}`;
  }

  return normalized;
}

export function normalizeOzonImageUrlForImport(value: any): string {
  const normalized = normalizeOzonImageUrl(value);
  if (!normalized) return '';

  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\/images\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return normalized.replace(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i, '');
    }
  }

  return normalized;
}

async function buildOzonImageUrls(productData: any): Promise<string[]> {
  const rawImages = [
    productData.imageUrl,
    ...(Array.isArray(productData.images) ? productData.images : []),
  ];
  const normalizedUrls = rawImages.map(normalizeOzonImageUrlForImport).filter(Boolean);
  const requireHttps = process.env.NODE_ENV === 'production';
  const urls = normalizedUrls.map(url => {
    if (/^https?:\/\//i.test(url)) {
      return resolvePublicAssetUrl(url, { requireHttps });
    }

    if (isManagedImagePath(url)) {
      return resolvePublicAssetUrl(url, { requireHttps });
    }

    throw new Error(`商品图片必须是系统可管理路径或公网地址，当前图片地址无效：${url}`);
  });

  return Array.from(new Set(urls));
}

async function getProductImageIdsByUrls(imageUrls: string[]): Promise<number[]> {
  if (imageUrls.length === 0) {
    return [];
  }

  const lookupUrls = Array.from(new Set(imageUrls.flatMap(url => {
    const values = [url];
    try {
      const parsed = new URL(url);
      values.push(`${parsed.pathname}${parsed.search}${parsed.hash}`);
    } catch {
      // Relative image paths are already included as-is.
    }
    return values.filter(Boolean);
  })));

  const records = await prisma.image.findMany({
    where: {
      bizType: 'product',
      fileUrl: {
        in: lookupUrls,
      },
    },
    select: {
      id: true,
    },
  });

  return records.map(record => record.id);
}

export async function resolveProductImagesForOzon(productData: any): Promise<{ imageUrls: string[]; imageIds: number[] }> {
  const imageUrls = await buildOzonImageUrls(productData);
  const imageIds = await getProductImageIdsByUrls(imageUrls);
  return { imageUrls, imageIds };
}

export async function replaceProductImageUsageReferences(input: {
  userId: number;
  refType: string;
  refId: number;
  imageIds: number[];
}) {
  return replaceImageReferences(prisma, {
    userId: input.userId,
    refType: input.refType,
    refId: input.refId,
    imageIds: input.imageIds,
    keyBuilder: (_imageId, index) => `image:${index}`,
  });
}

function imageUrlsChanged(productData: any, imageUrls: string[]): boolean {
  const currentUrls = [
    normalizeOzonImageUrlForImport(productData.imageUrl),
    ...(Array.isArray(productData.images) ? productData.images.map(normalizeOzonImageUrlForImport) : []),
  ].filter(Boolean);

  if (currentUrls.length !== imageUrls.length) return true;
  return currentUrls.some((url, index) => url !== imageUrls[index]);
}

function normalizeOzonApiErrorMessage(error: any): string {
  if (error === null || error === undefined || error === '') return '未知错误';
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    return error.map(normalizeOzonApiErrorMessage).filter(Boolean).join('; ') || '未知错误';
  }
  if (typeof error === 'object') {
    const directMessage = error.message || error.error || error.reason || error.description || error.detail;
    if (directMessage) return normalizeOzonApiErrorMessage(directMessage);
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export function buildOzonProductImportItem(
  productData: any,
  imageUrls: string[],
  ozonAttributes: any[],
  currencyCode: string
) {
  return {
    description_category_id: productData.descriptionCategoryId ? Number(productData.descriptionCategoryId) : null,
    type_id: productData.typeId ? Number(productData.typeId) : null,
    name: '',
    description: productData.description || ' ',
    primary_image: imageUrls[0] || '',
    images: imageUrls,
    attributes: ozonAttributes,
    offer_id: productData.offerId,
    price: toOzonStringNumber(productData.price),
    stock: productData.stock || 1,
    currency_code: currencyCode,
    vat: '0',
    depth: productData.packageLength || 0,
    width: productData.packageWidth || 0,
    height: productData.packageHeight || 0,
    dimension_unit: 'mm',
    weight: productData.grossWeight || 0,
    weight_unit: 'g',
  };
}

/**
 * 提交商品到Ozon（异步），返回 task_id
 */
export async function submitProductImport(
  store: any,
  productData: any
): Promise<any> {
  try {
    logger.info(`提交商品到Ozon: ${productData.name}`);
    const { imageUrls, imageIds } = await resolveProductImagesForOzon(productData);

    if (productData.id && imageUrlsChanged(productData, imageUrls)) {
      try {
        await prisma.productSupply.update({
          where: { id: Number(productData.id) },
          data: {
            imageUrl: imageUrls[0] || '',
            images: imageUrls,
          },
        });
      } catch (syncError: any) {
        logger.warn(`商品图片公网地址回写失败, 商品ID: ${productData.id}, 错误: ${syncError.message}`);
      }
    }

    const dictionaryValues = await loadImportDictionaryValues(productData);
    const ozonAttributes = enrichOzonProductAttributesForImport(productData, dictionaryValues);
    assertRequiredOzonAttributesForImport(productData, ozonAttributes);
    const currencyCode = normalizeOzonCurrencyCode(productData.currencyCode || store.currency, 'CNY');

    const importData = {
      items: [buildOzonProductImportItem(productData, imageUrls, ozonAttributes, currencyCode)]
    };

    logger.info(`上架规范化属性: ${JSON.stringify(ozonAttributes)}`);
    logger.info(`上架请求数据: ${JSON.stringify(importData)}`);

    const apiData = await ozonApiRequest(
      OZON_PRODUCT_IMPORT_API,
      store.clientId,
      store.apiKey,
      'POST',
      importData
    );

    logger.info(`上架API返回结果: ${JSON.stringify(apiData)}`);

    if (apiData.result && apiData.result.task_id) {
      return {
        success: true,
        taskId: apiData.result.task_id.toString(),
        offerId: importData.items[0].offer_id,
        imageUrls,
        imageIds,
        message: '商品已提交，等待处理'
      };
    } else if (apiData.result && apiData.result.product_id) {
      return {
        success: true,
        taskId: null,
        productId: apiData.result.product_id.toString(),
        offerId: importData.items[0].offer_id,
        imageUrls,
        imageIds,
        message: '商品已创建'
      };
    } else {
      const errorMessage = normalizeOzonApiErrorMessage(apiData.message || apiData.error || apiData.errors || '提交失败');
      logger.warn(`Ozon 上架返回非预期结果: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    logger.error('提交商品到Ozon失败:', normalizeOzonApiErrorMessage(error));
    throw error;
  }
}

/**
 * 查询商品导入任务状态
 */
export async function checkImportTask(
  store: any,
  taskId: string
): Promise<any> {
  try {
    logger.info(`查询导入任务状态, taskId: ${taskId}`);

    const apiData = await ozonApiRequest(
      OZON_PRODUCT_IMPORT_INFO_API,
      store.clientId,
      store.apiKey,
      'POST',
      { task_id: parseInt(taskId) }
    );

    logger.info('任务状态查询结果:', JSON.stringify(apiData));

    if (apiData.result) {
      const items = apiData.result.items || [];
      return {
        success: true,
        status: apiData.result.status || 'unknown',
        message: apiData.result.message || apiData.message || apiData.error || null,
        items: items.map((item: any) => ({
          offerId: item.offer_id,
          productId: item.product_id,
          status: item.status,
          errors: item.errors || [],
          errorMessage: item.error_message || item.message || item.error || null,
        }))
      };
    } else {
      return {
        success: false,
        status: 'unknown',
        message: apiData.message || '查询失败'
      };
    }
  } catch (error: any) {
    logger.error('查询导入任务状态失败:', error.message);
    throw error;
  }
}

/**
 * 更新Ozon商品价格
 * @param store - Ozon店铺信息
 * @param productId - 商品ID
 * @param price - 价格
 * @param currencyCode - 货币代码
 * @returns 更新结果
 */
export async function updateOzonProductPrice(
  store: any,
  productId: string,
  price: number,
  currencyCode: string = 'RUB',
  oldPrice?: number,
  minPrice?: number,
  premiumPrice?: number
): Promise<any> {
  try {
    const normalizedProductId = toPositiveInteger(productId);
    const normalizedPrice = toPositiveNumber(price);
    if (!normalizedProductId) {
      throw new Error('商品ID无效，无法更新价格');
    }
    if (!normalizedPrice) {
      throw new Error('价格必须大于 0');
    }
    const normalizedCurrencyCode = normalizeOzonCurrencyCode(currencyCode);
    logger.info(`更新Ozon商品价格: productId=${productId}, price=${normalizedPrice}, oldPrice=${oldPrice}, minPrice=${minPrice}, premiumPrice=${premiumPrice}, currency=${normalizedCurrencyCode}`);

    const priceInfo: any = {
      price: String(normalizedPrice),
      currency_code: normalizedCurrencyCode,
    };
    // 折扣前价格（划线价）
    if (oldPrice !== undefined && oldPrice > 0) {
      priceInfo.old_price = oldPrice.toString();
    }
    // 最低价格
    if (minPrice !== undefined && minPrice > 0) {
      priceInfo.min_price = minPrice.toString();
    }
    // 成本价（VIP价格）
    if (premiumPrice !== undefined && premiumPrice > 0) {
      priceInfo.premium_price = premiumPrice.toString();
    }

    const priceData = {
      prices: [{
        product_id: normalizedProductId,
        ...priceInfo,
      }],
    };

    const apiData = await ozonApiRequest(
      OZON_PRODUCT_PRICE_API,
      store.clientId,
      store.apiKey,
      'POST',
      priceData
    );

    logger.info('价格更新API返回结果:', apiData);

    const result = apiData.result || {};
    const resultRows = Array.isArray(result) ? result : [];
    const errors = resultRows.length > 0
      ? resultRows.flatMap((row: any) => Array.isArray(row?.errors) ? row.errors : [])
      : (Array.isArray(result.errors) ? result.errors : []);
    const updatedCount = resultRows.length > 0
      ? resultRows.filter((row: any) => row?.updated === true).length
      : Number(result.updated_count ?? result.updatedCount ?? 0);
    if (errors.length > 0) {
      const firstError = errors[0];
      const errorMessage = firstError?.message || firstError?.error || firstError?.code || '价格更新失败';
      throw new Error(errorMessage);
    }

    if (apiData.result && (updatedCount > 0 || errors.length === 0)) {
      return {
        success: true,
        message: '价格更新成功'
      };
    } else {
      throw new Error(apiData.message || '价格更新失败');
    }
  } catch (error: any) {
    logger.error('更新Ozon商品价格失败:', error.message);
    throw error;
  }
}

/**
 * 更新Ozon商品库存
 * @param store - Ozon店铺信息
 * @param productId - 商品ID
 * @param stock - 库存数量
 * @returns 更新结果
 */
export async function updateOzonProductStock(
  store: any,
  productId: string,
  stock: number
): Promise<any> {
  try {
    const normalizedProductId = toPositiveInteger(productId);
    const normalizedStock = toNonNegativeInteger(stock);
    if (!normalizedProductId) {
      throw new Error('商品ID无效，无法更新库存');
    }
    if (normalizedStock === null) {
      throw new Error('库存必须是非负整数');
    }
    logger.info(`更新Ozon商品FBS库存: productId=${productId}, stock=${normalizedStock}`);
    const stockTarget = await getFbsStockTargetForUpdate(store, productId);
    const warehouseId = toPositiveInteger(stockTarget.warehouseId);
    if (!warehouseId) {
      throw new Error('FBS 仓库ID无效，无法更新库存');
    }

    const stockData = {
      stocks: [{
        offer_id: stockTarget.offerId,
        stock: normalizedStock,
        warehouse_id: warehouseId,
      }],
    };

    const apiData = await ozonApiRequest(
      OZON_PRODUCT_STOCK_API,
      store.clientId,
      store.apiKey,
      'POST',
      stockData
    );

    logger.info('库存更新API返回结果:', apiData);

    const result = apiData.result || {};
    const resultRows = Array.isArray(result) ? result : [];
    const errors = resultRows.length > 0
      ? resultRows.flatMap((row: any) => Array.isArray(row?.errors) ? row.errors : [])
      : (Array.isArray(result.errors) ? result.errors : []);
    const updatedCount = resultRows.length > 0
      ? resultRows.filter((row: any) => row?.updated === true).length
      : Number(result.updated_count ?? result.updatedCount ?? 0);
    if (errors.length > 0) {
      const firstError = errors[0];
      const errorMessage = firstError?.message || firstError?.error || firstError?.code || '库存更新失败';
      throw new Error(errorMessage);
    }

    if (apiData.result && (updatedCount > 0 || errors.length === 0)) {
      return {
        success: true,
        message: '库存更新成功'
      };
    } else {
      throw new Error(apiData.message || '库存更新失败');
    }
  } catch (error: any) {
    logger.error('更新Ozon商品库存失败:', error.message);
    throw error;
  }
}

/**
 * 归档Ozon商品
 * @param store - Ozon店铺信息
 * @param productId - 商品ID
 * @returns 归档结果
 */
export async function archiveOzonProduct(
  store: any,
  productId: string
): Promise<any> {
  try {
    const normalizedProductId = toPositiveInteger(productId);
    if (!normalizedProductId) {
      throw new Error('商品ID无效，无法归档');
    }
    logger.info(`归档Ozon商品: productId=${productId}`);

    const existingProduct = await prisma.product.findUnique({
      where: { ozonProductId: productId },
      select: { isArchived: true },
    });

    if (existingProduct?.isArchived) {
      return {
        success: true,
        message: '商品已归档',
        alreadyArchived: true,
      };
    }

    const archiveData = {
      product_id: [normalizedProductId]
    };

    const apiData = await ozonApiRequest(
      OZON_PRODUCT_ARCHIVE_API,
      store.clientId,
      store.apiKey,
      'POST',
      archiveData
    );

    logger.info('归档API返回结果:', apiData);

    if (apiData.result) {
      // 更新本地数据库归档状态
      const product = await prisma.product.findUnique({
        where: { ozonProductId: productId }
      });
      if (product) {
        await prisma.product.update({
          where: { ozonProductId: productId },
          data: {
            isArchived: true,
            visibility: 'ARCHIVED',
          }
        });
      }
      return {
        success: true,
        message: '归档成功'
      };
    } else {
      throw new Error(apiData.message || '归档失败');
    }
  } catch (error: any) {
    logger.error('归档Ozon商品失败:', error.message);
    throw error;
  }
}

/**
 * 取消归档Ozon商品
 * @param store - Ozon店铺信息
 * @param productId - 商品ID
 * @returns 取消归档结果
 */
export async function unarchiveOzonProduct(
  store: any,
  productId: string
): Promise<any> {
  try {
    const normalizedProductId = toPositiveInteger(productId);
    if (!normalizedProductId) {
      throw new Error('商品ID无效，无法取消归档');
    }
    logger.info(`取消归档Ozon商品: productId=${productId}`);

    const existingProduct = await prisma.product.findUnique({
      where: { ozonProductId: productId },
      select: { isArchived: true },
    });

    if (existingProduct && !existingProduct.isArchived) {
      return {
        success: true,
        message: '商品已取消归档',
        alreadyUnarchived: true,
      };
    }

    const unarchiveData = {
      product_id: [normalizedProductId]
    };

    const apiData = await ozonApiRequest(
      OZON_PRODUCT_UNARCHIVE_API,
      store.clientId,
      store.apiKey,
      'POST',
      unarchiveData
    );

    logger.info('取消归档API返回结果:', apiData);

    if (apiData.result) {
      // 更新本地数据库归档状态
      const product = await prisma.product.findUnique({
        where: { ozonProductId: productId }
      });
      if (product) {
        await prisma.product.update({
          where: { ozonProductId: productId },
          data: {
            isArchived: false,
            visibility: 'VISIBLE',
          }
        });
      }
      return {
        success: true,
        message: '取消归档成功'
      };
    } else {
      throw new Error(apiData.message || '取消归档失败');
    }
  } catch (error: any) {
    logger.error('取消归档Ozon商品失败:', error.message);
    throw error;
  }
}

/**
 * 更新Ozon商品信息
 * @param store - Ozon店铺信息
 * @param productData - 商品数据
 * @returns 更新结果
 */
export async function updateOzonProduct(
  store: any,
  productData: any
): Promise<any> {
  try {
    logger.info(`更新Ozon商品信息: productId=${productData.productId}, name=${productData.name}`);

    const localRaw = await getLocalOzonProductRawData(String(productData.productId));
    const updateItem = buildOzonImportUpdateItem(productData, localRaw);
    const validationErrors = validateOzonImportUpdateItem(updateItem);
    if (validationErrors.length > 0) {
      logger.warn(`商品更新数据校验失败: ${JSON.stringify({
        productId: productData.productId,
        validationErrors,
        item: summarizeOzonImportItem(updateItem),
      })}`);
      throw new Error(`商品更新数据不完整: ${validationErrors.join('；')}`);
    }

    // 构建商品更新请求数据
    const updateData = {
      items: [updateItem]
    };

    logger.info(`更新请求摘要: ${JSON.stringify(summarizeOzonImportItem(updateItem))}`);

    const apiData = await ozonApiRequest(
      OZON_PRODUCT_IMPORT_API,
      store.clientId,
      store.apiKey,
      'POST',
      updateData
    );

    logger.info(`更新API返回结果: ${JSON.stringify(apiData)}`);

    if (apiData.result && apiData.result.task_id) {
      return {
        success: true,
        taskId: apiData.result.task_id.toString(),
        message: '商品更新已提交，等待处理'
      };
    } else if (apiData.result && apiData.result.product_id) {
      return {
        success: true,
        productId: apiData.result.product_id.toString(),
        message: '商品更新成功'
      };
    } else {
      throw new Error(apiData.message || '更新失败');
    }
  } catch (error: any) {
    logger.error('更新Ozon商品失败:', error.message);
    throw error;
  }
}

export async function dryRunUpdateOzonProductPayload(productData: any): Promise<any> {
  const localRaw = await getLocalOzonProductRawData(String(productData.productId));
  const item = buildOzonImportUpdateItem(productData, localRaw);
  return {
    item,
    validationErrors: validateOzonImportUpdateItem(item),
  };
}

/**
 * 从 Ozon API 刷新单个商品，并覆盖本地商品管理列表数据。
 */
export async function refreshSingleOzonProduct(
  store: any,
  productId: string
): Promise<any> {
  logger.info(`刷新单个Ozon商品到本地: storeId=${store.id}, productId=${productId}`);
  const products = await getOzonProductDetails(store, [parseInt(productId)]);
  const product = products.find((item: any) => String(item.product_id) === String(productId)) || products[0];

  if (!product || String(product.product_id) !== String(productId)) {
    throw new Error('Ozon API未返回商品详情');
  }

  let detailProduct: any = null;
  try {
    const attributeDetails = await getOzonProductAttributeDetails(store, [parseInt(productId)]);
    detailProduct = attributeDetails[0] || null;
  } catch (error: any) {
    logger.warn(`获取Ozon商品富属性失败，将尝试单品详情接口: productId=${productId}, error=${error.message}`);
  }

  if (!hasRichOzonProductDetails(detailProduct)) {
    try {
      detailProduct = mergeOzonProductDetails(
        detailProduct || {},
        await getSingleOzonProductDetail(store, productId)
      );
      if (!hasRichOzonProductDetails(detailProduct) && product.offer_id) {
        const offerDetail = await getSingleOzonProductDetail(store, productId, String(product.offer_id));
        if (hasRichOzonProductDetails(offerDetail)) {
          detailProduct = offerDetail;
        }
      }
    } catch (error: any) {
      logger.warn(`获取Ozon商品富详情失败，将仅保存列表详情: productId=${productId}, error=${error.message}`);
    }
  }

  const mergedProduct = mergeOzonProductDetails(product, detailProduct);
  const warehouseContext = await getOzonWarehouseContext(store);
  const fbsStocksByProductId = await getFbsStocksByWarehouse(store, [{
    productId: String(productId),
    sku: mergedProduct.sku ? String(mergedProduct.sku) : undefined,
    offerId: mergedProduct.offer_id ? String(mergedProduct.offer_id) : undefined,
  }]);
  const enrichedProduct = enrichProductWarehouseStocks(
    mergedProduct,
    warehouseContext,
    fbsStocksByProductId.get(String(productId)) || []
  );

  const { data: productData, stock, warehouseStatus } = buildOzonProductData({
    ...enrichedProduct,
    product_id: enrichedProduct.product_id || product.product_id || parseInt(productId),
  });

  const productRecord = await prisma.product.upsert({
    where: { ozonProductId: String(productId) },
    update: productData,
    create: productData,
  });

  await prisma.warehouseItem.upsert({
    where: {
      ozonProductId_ozonStoreId: {
        ozonProductId: String(productId),
        ozonStoreId: store.id,
      },
    },
    update: {
      productId: productRecord.id,
      status: warehouseStatus,
      inventoryQuantity: stock,
    },
    create: {
      productId: productRecord.id,
      ozonStoreId: store.id,
      ozonProductId: String(productId),
      status: warehouseStatus,
      inventoryQuantity: stock,
    },
  });

  return {
    product: productRecord,
    warehouseStatus,
    inventoryQuantity: stock,
  };
}

export async function getLocalOzonProductSnapshot(
  storeId: number,
  productId: string
): Promise<any> {
  const item = await prisma.warehouseItem.findFirst({
    where: {
      ozonStoreId: storeId,
      ozonProductId: String(productId),
    },
    include: {
      product: true,
    },
  });

  if (!item || !item.product) {
    return null;
  }

  let offerId = item.product.offerId || item.ozonProductId;
  const raw = item.product.ozonOriginalData as any;
  if (raw?.offer_id) offerId = String(raw.offer_id);

  let status = mapStatusToFrontend(item.status);
  let statusZh = getStatusZh(status);
  let archiveType = null;
  let archiveReason = null;

  if (item.product.isArchived) {
    status = 'archived';
    statusZh = item.product.isAutoArchived ? '自动归档' : '档案';
    archiveType = item.product.isAutoArchived ? 'auto' : 'manual';
    archiveReason = item.product.isAutoArchived
      ? '我们自动隐藏了该商品，因为它不符合绩效标准'
      : '商品已被隐藏，买家看到它的状态为"无现货"';
  }

  return {
    id: item.id,
    productId: item.ozonProductId,
    offerId,
    name: item.product.titleOriginal || '',
    nameZh: '',
    price: item.product.price || 0,
    status,
    statusZh,
    stock: item.inventoryQuantity,
    createdAt: item.product.ozonCreatedAt || item.createdAt,
    ozonCreatedAt: item.product.ozonCreatedAt,
    localCreatedAt: item.createdAt,
    categoryName: '-',
    archiveType,
    archiveReason,
    product: convertBigIntToString(item.product),
  };
}

/**
 * 同步库存从Ozon到本地数据库
 * @param storeId - 店铺ID
 * @returns 同步结果
 */
export async function syncStockFromOzon(
  storeId: number
): Promise<{ success: boolean; syncedCount: number; message: string }> {
  try {
    const store = await prisma.ozonStore.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      throw new Error('店铺不存在');
    }

    logger.info(`开始从Ozon同步库存: 店铺ID=${storeId}`);

    // 获取本地产品列表
    const warehouseItems = await prisma.warehouseItem.findMany({
      where: { ozonStoreId: storeId },
      include: { product: true }
    });

    let syncedCount = 0;
    const warehouseContext = await getOzonWarehouseContext(store);

    for (const item of warehouseItems) {
      if (!item.ozonProductId) continue;

      try {
        // 获取商品详情（包含库存信息）
        const productDetails = await getOzonProductDetails(
          store,
          [parseInt(item.ozonProductId)]
        );

        if (productDetails.length > 0) {
          const productDetail = productDetails[0];
          const fbsStocksByProductId = await getFbsStocksByWarehouse(store, [{
            productId: String(item.ozonProductId),
            sku: productDetail.sku ? String(productDetail.sku) : item.product?.ozonSku || undefined,
            offerId: productDetail.offer_id ? String(productDetail.offer_id) : item.product?.offerId || undefined,
          }]);
          const productWithWarehouseStocks = enrichProductWarehouseStocks(
            productDetail,
            warehouseContext,
            fbsStocksByProductId.get(String(item.ozonProductId)) || []
          );
          const stock = parseStock(productWithWarehouseStocks);

          // 更新本地库存
          await prisma.warehouseItem.update({
            where: { id: item.id },
            data: { inventoryQuantity: stock }
          });

          // 更新产品表中的库存信息
          const { stockFbo, stockFbs, totalStock } = summarizeStockBySchema(productWithWarehouseStocks);
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stockFbo,
              stockFbs,
              totalStock,
              ozonOriginalData: productWithWarehouseStocks,
            }
          });

          syncedCount++;
        }
      } catch (error: any) {
        logger.warn(`同步库存失败 - productId=${item.ozonProductId}: ${error.message}`);
      }

      // 添加延迟，避免API调用过快
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    logger.info(`库存同步完成: 成功同步 ${syncedCount} 个商品`);

    return {
      success: true,
      syncedCount,
      message: `成功同步 ${syncedCount} 个商品库存`
    };
  } catch (error: any) {
    logger.error('同步库存失败:', error.message);
    return {
      success: false,
      syncedCount: 0,
      message: `同步库存失败: ${error.message}`
    };
  }
}

/**
 * 获取单个商品详情
 * @param store - Ozon店铺信息
 * @param productId - 商品ID
 * @returns 商品详情
 */
export async function getSingleOzonProductDetail(
  store: any,
  productId: string,
  offerId?: string
): Promise<any> {
  try {
    const payload: any = offerId
      ? { offer_id: offerId }
      : { product_id: parseInt(productId) };
    const apiData = await ozonApiRequest(
      OZON_PRODUCT_INFO_API_V2,
      store.clientId,
      store.apiKey,
      'POST',
      payload
    );

    if (apiData.result) {
      return apiData.result;
    } else {
      throw new Error(apiData.message || '获取商品详情失败');
    }
  } catch (error: any) {
    logger.error('获取Ozon商品详情失败:', error.message);
    throw error;
  }
}
