import prisma from '../config/database';
import logger from '../config/logger';
import { normalizeOzonImageUrlForDisplay } from '../utils/ozonImageUrl';
import { createTranslationCacheHash, normalizeTranslationText, translateText } from './translationService';

const OZON_POSTING_LIST_API = 'https://api-seller.ozon.ru/v3/posting/fbs/list';
const OZON_POSTING_GET_API = 'https://api-seller.ozon.ru/v3/posting/fbs/get';
const OZON_POSTING_SHIP_API = 'https://api-seller.ozon.ru/v4/posting/fbs/ship';
const OZON_POSTING_CANCEL_API = 'https://api-seller.ozon.ru/v2/posting/fbs/cancel';
const OZON_POSTING_CANCEL_REASONS_API = 'https://api-seller.ozon.ru/v2/posting/fbs/cancel-reason/list';
const DEFAULT_ORDER_LOOKBACK_DAYS = 120;
const OZON_ORDER_WINDOW_DAYS = 30;
const OZON_SYNC_LIMIT = 1000;

interface OrderListParams {
  status?: string;
  since?: string;
  to?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

const ORDER_STATUSES = [
  'awaiting_registration',
  'acceptance_in_progress',
  'awaiting_approve',
  'awaiting_packaging',
  'awaiting_deliver',
  'arbitration',
  'client_arbitration',
  'delivering',
  'driver_pickup',
  'delivered',
  'cancelled',
];

const STATUS_GROUPS: Record<string, string[]> = {
  dispute: ['arbitration', 'client_arbitration'],
  delivering: ['delivering', 'driver_pickup'],
};

const PREPARE_ALLOWED_STATUSES = ['awaiting_packaging'];
const TERMINATED_ORDER_STATUSES = ['delivered', 'cancelled'];

export interface OzonCancelReason {
  id: number;
  name: string;
}

const CANCELLATION_TEXT_TRANSLATIONS: Record<string, string> = {
  'покупатель отменил заказ': '买家取消订单',
  'вы не отгрузили заказ вовремя': '您未按时发货',
  'клиент': '客户',
  'покупатель': '买家',
  'client': '客户',
  'buyer': '买家',
  'seller': '卖家',
  'продавец': '卖家',
  'ozon': 'Ozon',
};

const ozonApiRequest = async (
  url: string,
  clientId: string,
  apiKey: string,
  data: any,
): Promise<any> => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Client-Id': clientId,
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const text = await response.text();
    const parsedData = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const message = parsedData?.message || parsedData?.error || `Ozon API request failed: ${response.status}`;
      throw new Error(message);
    }

    return parsedData;
  } catch (error: any) {
    logger.error('Ozon order API request failed:', error);
    throw error;
  }
};

const getStoreCredentials = async (storeId: number) => {
  const store = await prisma.ozonStore.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      userId: true,
      clientId: true,
      apiKey: true,
    },
  });

  if (!store) {
    throw new Error('Ozon店铺不存在');
  }

  if (!store.clientId || !store.apiKey) {
    throw new Error('Ozon店铺API凭证不完整');
  }

  return store;
};

const persistLocalCancellationTranslation = async (originalText: string, translatedText: string) => {
  const normalizedOriginal = normalizeTranslationText(originalText);
  const normalizedTranslated = normalizeTranslationText(translatedText);
  if (!normalizedOriginal || !normalizedTranslated) return;

  await prisma.translationCache.upsert({
    where: {
      originalHash_sourceLang_targetLang: {
        originalHash: createTranslationCacheHash(normalizedOriginal),
        sourceLang: 'ru',
        targetLang: 'zh',
      },
    },
    update: {
      originalText: normalizedOriginal,
      translatedText: normalizedTranslated,
      service: 'local',
      usageCount: { increment: 1 },
      expiresAt: new Date('2099-12-31T23:59:59.000Z'),
    },
    create: {
      originalText: normalizedOriginal,
      originalHash: createTranslationCacheHash(normalizedOriginal),
      translatedText: normalizedTranslated,
      sourceLang: 'ru',
      targetLang: 'zh',
      service: 'local',
      expiresAt: new Date('2099-12-31T23:59:59.000Z'),
    },
  });
};

const translateCancellationText = async (value: any, userId?: number | null) => {
  const originalText = normalizeTranslationText(String(value || ''));
  if (!originalText) return '';

  const localTranslation = CANCELLATION_TEXT_TRANSLATIONS[originalText.toLowerCase()];
  if (localTranslation) {
    await persistLocalCancellationTranslation(originalText, localTranslation);
    return localTranslation;
  }

  const translatedText = await translateText(originalText, 'ru', 'zh', userId || undefined);
  return normalizeTranslationText(translatedText);
};

const enrichCancellationTranslations = async (cancellation: any, userId?: number | null) => {
  if (!cancellation || typeof cancellation !== 'object') {
    return cancellation || null;
  }

  const nextCancellation = { ...cancellation };
  if (nextCancellation.cancel_reason && !nextCancellation.cancel_reason_zh) {
    const translatedReason = await translateCancellationText(nextCancellation.cancel_reason, userId);
    if (translatedReason && translatedReason !== normalizeTranslationText(String(nextCancellation.cancel_reason))) {
      nextCancellation.cancel_reason_zh = translatedReason;
    }
  }

  if (nextCancellation.cancellation_initiator && !nextCancellation.cancellation_initiator_zh) {
    const translatedInitiator = await translateCancellationText(nextCancellation.cancellation_initiator, userId);
    if (translatedInitiator && translatedInitiator !== normalizeTranslationText(String(nextCancellation.cancellation_initiator))) {
      nextCancellation.cancellation_initiator_zh = translatedInitiator;
    }
  }

  if (nextCancellation.cancellation_type && !nextCancellation.cancellation_type_zh) {
    const translatedType = await translateCancellationText(nextCancellation.cancellation_type, userId);
    if (translatedType && translatedType !== normalizeTranslationText(String(nextCancellation.cancellation_type))) {
      nextCancellation.cancellation_type_zh = translatedType;
    }
  }

  return nextCancellation;
};

const enrichOrderCancellationTranslations = async (detail: any, userId?: number | null) => {
  if (!detail || typeof detail !== 'object') {
    return detail;
  }

  const cancellation = await enrichCancellationTranslations(detail.cancellation, userId);
  if (cancellation === detail.cancellation) {
    return detail;
  }

  return {
    ...detail,
    cancellation,
  };
};

const normalizeProduct = (product: any) => ({
  sku: String(product.sku || product.offer_id || product.product_id || ''),
  name: product.name || product.offer_id || '商品',
  quantity: Number(product.quantity || 0),
  price: String(product.price || product.currency_price || ''),
});

export const buildPreparePostingPayload = (postingNumber: string, products: any[]) => {
  const packageProducts = (Array.isArray(products) ? products : [])
    .map((product: any) => ({
      product_id: Number(product.product_id ?? product.productId ?? product.sku),
      quantity: Number(product.quantity || 0),
    }))
    .filter((product: { product_id: number; quantity: number }) => (
      Number.isInteger(product.product_id) && product.product_id > 0 && product.quantity > 0
    ));

  if (packageProducts.length === 0) {
    throw new Error('货件商品明细为空，无法提交备货');
  }

  return {
    posting_number: postingNumber,
    packages: [
      {
        products: packageProducts,
      },
    ],
    with: {
      additional_data: true,
    },
  };
};

export const assertPreparePostingAllowed = (order: { status?: string }) => {
  if (!PREPARE_ALLOWED_STATUSES.includes(order.status || '')) {
    throw new Error('只有等待备货状态的货件可以提交备货');
  }
};

export const assertCancelPostingAllowed = (order: { status?: string }) => {
  if (TERMINATED_ORDER_STATUSES.includes(order.status || '')) {
    throw new Error('当前货件状态不能取消');
  }
};

export const normalizeCancelReasons = (response: any): OzonCancelReason[] => {
  const source = Array.isArray(response?.result)
    ? response.result
    : Array.isArray(response?.result?.reasons)
      ? response.result.reasons
      : Array.isArray(response?.reasons)
        ? response.reasons
        : [];

  return source
    .map((item: any) => ({
      id: Number(item.id ?? item.cancel_reason_id ?? item.reason_id),
      name: String(item.name ?? item.cancel_reason ?? item.reason ?? ''),
    }))
    .filter((item: OzonCancelReason) => Number.isInteger(item.id) && item.id > 0 && item.name);
};

const normalizeOrder = (order: any) => {
  const products = Array.isArray(order.products) ? order.products.map(normalizeProduct) : [];
  const financialProducts = order.financial_data?.products || [];

  return {
    postingNumber: String(order.posting_number || order.postingNumber || ''),
    orderId: String(order.order_id || ''),
    status: order.status || '',
    substatus: order.substatus || '',
    inProcessAt: order.in_process_at || order.inProcessAt || null,
    shipmentDate: order.shipment_date || order.shipmentDate || null,
    deliveredAt: order.delivered_at || null,
    cancelledAt: order.cancelled_at || null,
    orderCreatedAt: order.created_at || null,
    estimatedDeliveryDate: order.estimated_delivery_date || null,
    trackingNumber: order.tracking_number || '',
    deliveryService: order.delivery_service?.name || '',
    tplIntegrationType: order.tpl_integration_type || '',
    isExpress: Boolean(order.is_express),
    multiBoxQty: order.multi_box_qty || 1,
    cancellation: order.cancellation || null,
    customerName: order.customer?.name || order.addressee?.name || '',
    customerId: String(order.customer?.customer_id || ''),
    deliveryMethod: order.delivery_method?.name || order.deliveryMethod || '',
    weight: order.weight || null,
    length: order.dimensions?.length || null,
    width: order.dimensions?.width || null,
    height: order.dimensions?.height || null,
    products,
    totalPrice: products.reduce((sum: number, product: any) => {
      const financialProduct = financialProducts.find((item: any) => String(item.product_id || item.sku || '') === product.sku);
      const price = Number(product.price || financialProduct?.price || financialProduct?.old_price || 0);
      return sum + price * product.quantity;
    }, 0).toFixed(2),
    raw: order,
  };
};

const fetchOrderDetail = async (clientId: string, apiKey: string, postingNumber: string) => {
  const response = await ozonApiRequest(OZON_POSTING_GET_API, clientId, apiKey, {
    posting_number: postingNumber,
    with: {
      analytics_data: true,
      barcodes: true,
      financial_data: true,
      product_exemplars: true,
      related_postings: true,
      translit: true,
    },
  });

  return response.result || response;
};

const toDateBoundary = (value: string | undefined, endOfDay: boolean) => {
  const date = value ? new Date(value) : new Date();
  if (!value && !endOfDay) {
    date.setDate(date.getDate() - DEFAULT_ORDER_LOOKBACK_DAYS);
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

const createDateWindows = (sinceValue?: string, toValue?: string) => {
  const windows: Array<{ since: string; to: string }> = [];
  let cursor = toDateBoundary(sinceValue, false);
  const end = toDateBoundary(toValue, true);

  while (cursor <= end) {
    const windowEnd = new Date(cursor);
    windowEnd.setDate(windowEnd.getDate() + OZON_ORDER_WINDOW_DAYS - 1);
    windowEnd.setHours(23, 59, 59, 999);

    windows.push({
      since: cursor.toISOString(),
      to: new Date(Math.min(windowEnd.getTime(), end.getTime())).toISOString(),
    });

    cursor = new Date(windowEnd);
    cursor.setMilliseconds(cursor.getMilliseconds() + 1);
  }

  return windows;
};

const toNullableDate = (value: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildOrderDatabaseData = async (storeId: number, detail: any, userId?: number | null) => {
  const enrichedDetail = await enrichOrderCancellationTranslations(detail, userId);
  const normalized = normalizeOrder(enrichedDetail);
  return {
    ozonStoreId: storeId,
    postingNumber: normalized.postingNumber,
    orderId: normalized.orderId || null,
    status: normalized.status || '',
    substatus: normalized.substatus || null,
    inProcessAt: toNullableDate(normalized.inProcessAt),
    shipmentDate: toNullableDate(normalized.shipmentDate),
    deliveredAt: toNullableDate(normalized.deliveredAt),
    cancelledAt: toNullableDate(normalized.cancelledAt),
    orderCreatedAt: toNullableDate(normalized.orderCreatedAt),
    estimatedDeliveryDate: toNullableDate(normalized.estimatedDeliveryDate),
    trackingNumber: normalized.trackingNumber || null,
    deliveryService: normalized.deliveryService || null,
    tplIntegrationType: normalized.tplIntegrationType || null,
    isExpress: normalized.isExpress,
    multiBoxQty: normalized.multiBoxQty || 1,
    cancellation: normalized.cancellation,
    customerName: normalized.customerName || null,
    customerId: normalized.customerId || null,
    deliveryMethod: normalized.deliveryMethod || null,
    weight: normalized.weight === null ? null : Number(normalized.weight),
    length: normalized.length === null ? null : Number(normalized.length),
    width: normalized.width === null ? null : Number(normalized.width),
    height: normalized.height === null ? null : Number(normalized.height),
    products: normalized.products,
    totalPrice: Number(normalized.totalPrice || 0),
    raw: enrichedDetail,
  };
};

const saveRemoteOrderDetail = async (storeId: number, detail: any, userId?: number | null) => {
  const data = await buildOrderDatabaseData(storeId, detail, userId);
  if (!data.postingNumber) {
    throw new Error('Ozon返回的订单号为空');
  }

  const order = await prisma.ozonOrder.upsert({
    where: {
      ozonStoreId_postingNumber: {
        ozonStoreId: storeId,
        postingNumber: data.postingNumber,
      },
    },
    update: data,
    create: data,
  });

  return serializeOrder(order);
};

const normalizeProductImageFields = (product: any) => {
  if (!product || typeof product !== 'object') {
    return product;
  }

  const normalized = { ...product };
  for (const field of ['image', 'primary_image', 'imageUrl', 'image_url']) {
    const value = normalized[field];
    if (Array.isArray(value)) {
      normalized[field] = value.map(normalizeOzonImageUrlForDisplay);
    } else if (value) {
      normalized[field] = normalizeOzonImageUrlForDisplay(value);
    }
  }
  return normalized;
};

const normalizeOrderImagesForDisplay = (order: any) => ({
  ...order,
  products: Array.isArray(order.products) ? order.products.map(normalizeProductImageFields) : order.products,
  raw: order.raw ? {
    ...order.raw,
    products: Array.isArray(order.raw.products) ? order.raw.products.map(normalizeProductImageFields) : order.raw.products,
  } : order.raw,
});

const serializeOrder = (order: any) => {
  const normalizedOrder = normalizeOrderImagesForDisplay(order);
  return {
    id: normalizedOrder.id,
    postingNumber: normalizedOrder.postingNumber,
    orderId: normalizedOrder.orderId || '',
    status: normalizedOrder.status,
    substatus: normalizedOrder.substatus || '',
    inProcessAt: normalizedOrder.inProcessAt || null,
    shipmentDate: normalizedOrder.shipmentDate || null,
    deliveredAt: normalizedOrder.deliveredAt || null,
    cancelledAt: normalizedOrder.cancelledAt || null,
    orderCreatedAt: normalizedOrder.orderCreatedAt || null,
    estimatedDeliveryDate: normalizedOrder.estimatedDeliveryDate || null,
    trackingNumber: normalizedOrder.trackingNumber || '',
    deliveryService: normalizedOrder.deliveryService || '',
    tplIntegrationType: normalizedOrder.tplIntegrationType || '',
    isExpress: normalizedOrder.isExpress || false,
    multiBoxQty: normalizedOrder.multiBoxQty || 1,
    cancellation: normalizedOrder.cancellation || null,
    customerName: normalizedOrder.customerName || '',
    customerId: normalizedOrder.customerId || '',
    deliveryMethod: normalizedOrder.deliveryMethod || '',
    weight: normalizedOrder.weight,
    length: normalizedOrder.length,
    width: normalizedOrder.width,
    height: normalizedOrder.height,
    products: normalizedOrder.products || [],
    totalPrice: Number(normalizedOrder.totalPrice || 0).toFixed(2),
    raw: normalizedOrder.raw,
    createdAt: normalizedOrder.createdAt?.toISOString?.() || '',
    updatedAt: normalizedOrder.updatedAt?.toISOString?.() || '',
  };
};

const getProductIdentifiers = (product: any): string[] => (
  [product?.product_id, product?.sku, product?.offer_id]
    .filter(value => value !== null && value !== undefined && value !== '')
    .map(value => String(value))
);

const getProductImage = (product: { primaryImage?: string | null; images?: any }) => {
  if (typeof product.primaryImage === 'string' && product.primaryImage) {
    return normalizeOzonImageUrlForDisplay(product.primaryImage);
  }
  const images = Array.isArray(product.images) ? product.images : [];
  const image = images.find((value: any) => typeof value === 'string' && value) || '';
  return normalizeOzonImageUrlForDisplay(image);
};

const enrichOrdersWithProductImages = async (storeId: number, orders: any[]) => {
  const identifiers = Array.from(new Set(orders.flatMap(order => {
    const products = Array.isArray(order.products) ? order.products : [];
    const rawProducts = Array.isArray(order.raw?.products) ? order.raw.products : [];
    return [...products, ...rawProducts].flatMap(getProductIdentifiers);
  })));

  if (identifiers.length === 0) {
    return orders;
  }

  const [warehouseItems, products] = await Promise.all([
    prisma.warehouseItem.findMany({
      where: {
        ozonStoreId: storeId,
        ozonProductId: { in: identifiers },
      },
      include: {
        product: {
          select: {
            ozonProductId: true,
            ozonSku: true,
            offerId: true,
            primaryImage: true,
            images: true,
          },
        },
      },
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { ozonProductId: { in: identifiers } },
          { ozonSku: { in: identifiers } },
          { offerId: { in: identifiers } },
        ],
      },
      select: {
        ozonProductId: true,
        ozonSku: true,
        offerId: true,
        primaryImage: true,
        images: true,
      },
    }),
  ]);

  const imageByIdentifier = new Map<string, string>();
  const addProductImage = (product: {
    ozonProductId?: string | null;
    ozonSku?: string | null;
    offerId?: string | null;
    primaryImage?: string | null;
    images?: any;
  }) => {
    const image = getProductImage(product);
    if (!image) {
      return;
    }
    for (const identifier of [product.ozonProductId, product.ozonSku, product.offerId]) {
      if (identifier) {
        imageByIdentifier.set(String(identifier), image);
      }
    }
  };

  for (const product of products) {
    addProductImage(product);
  }
  for (const item of warehouseItems) {
    if (item.product) {
      addProductImage(item.product);
    }
    const image = item.product ? getProductImage(item.product) : '';
    if (image) {
      imageByIdentifier.set(String(item.ozonProductId), image);
    }
  }

  return orders.map(order => {
    const enrichProduct = (product: any) => {
      const image = getProductIdentifiers(product)
        .map(identifier => imageByIdentifier.get(identifier))
        .find(Boolean);
      return image ? { ...product, image } : product;
    };
    return {
      ...order,
      products: (Array.isArray(order.products) ? order.products : []).map(enrichProduct),
      raw: order.raw ? {
        ...order.raw,
        products: Array.isArray(order.raw.products) ? order.raw.products.map(enrichProduct) : order.raw.products,
      } : order.raw,
    };
  });
};

const buildStatusWhere = (status?: string) => {
  if (!status) {
    return undefined;
  }

  const groupedStatuses = STATUS_GROUPS[status];
  return groupedStatuses ? { in: groupedStatuses } : status;
};

const getOrderProductsForSearch = (order: any): any[] => {
  const normalizedProducts = Array.isArray(order?.products) ? order.products : [];
  const rawProducts = Array.isArray(order?.raw?.products) ? order.raw.products : [];
  return [...normalizedProducts, ...rawProducts];
};

const containsKeyword = (value: any, keyword: string): boolean => {
  if (value === null || value === undefined) return false;
  return String(value).toLowerCase().includes(keyword);
};

const matchesOrderKeyword = (order: any, keyword: string): boolean => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;

  if (
    containsKeyword(order.postingNumber, normalizedKeyword) ||
    containsKeyword(order.customerName, normalizedKeyword) ||
    containsKeyword(order.deliveryMethod, normalizedKeyword) ||
    containsKeyword(order.orderId, normalizedKeyword) ||
    containsKeyword(order.trackingNumber, normalizedKeyword)
  ) {
    return true;
  }

  return getOrderProductsForSearch(order).some((product: any) => (
    containsKeyword(product?.sku, normalizedKeyword) ||
    containsKeyword(product?.offer_id, normalizedKeyword) ||
    containsKeyword(product?.product_id, normalizedKeyword) ||
    containsKeyword(product?.name, normalizedKeyword) ||
    containsKeyword(product?.offer_name, normalizedKeyword)
  ));
};

const getOrderCounts = async (storeId: number) => {
  const counts: Record<string, number> = { all: 0 };
  for (const status of ORDER_STATUSES) {
    counts[status] = await prisma.ozonOrder.count({
      where: { ozonStoreId: storeId, status },
    });
    counts.all += counts[status];
  }
  return counts;
};

export const syncOrdersToDatabase = async (storeId: number, userId?: number) => {
  const store = await getStoreCredentials(storeId);
  const dateWindows = createDateWindows();
  const postings = new Map<string, any>();

  try {
    for (const status of ORDER_STATUSES) {
      for (const window of dateWindows) {
        let ozonOffset = 0;
        let hasMore = true;

        while (hasMore) {
          const response = await ozonApiRequest(OZON_POSTING_LIST_API, store.clientId, store.apiKey, {
            dir: 'DESC',
            filter: {
              since: window.since,
              to: window.to,
              status,
            },
            limit: OZON_SYNC_LIMIT,
            offset: ozonOffset,
            with: {
              analytics_data: true,
              financial_data: true,
            },
          });
          const items = response.result?.postings || response.postings || [];
          for (const item of items) {
            const postingNumber = String(item.posting_number || item.postingNumber || '');
            if (postingNumber) {
              postings.set(postingNumber, item);
            }
          }
          hasMore = items.length === OZON_SYNC_LIMIT;
          ozonOffset += OZON_SYNC_LIMIT;
        }
      }
    }

    let syncedCount = 0;
    let updatedCount = 0;

    for (const posting of postings.values()) {
      const postingNumber = String(posting.posting_number || posting.postingNumber || '');
      if (!postingNumber) {
        continue;
      }

      const detail = await fetchOrderDetail(store.clientId, store.apiKey, postingNumber);
      const normalized = normalizeOrder(detail);
      const existing = await prisma.ozonOrder.findUnique({
        where: {
          ozonStoreId_postingNumber: {
            ozonStoreId: storeId,
            postingNumber,
          },
        },
      });
      const data = await buildOrderDatabaseData(storeId, detail, userId || store.userId);

      if (existing) {
        if (existing.status === 'delivered') {
          continue;
        }

        await prisma.ozonOrder.update({
          where: { id: existing.id },
          data,
        });

        if (existing.status !== data.status) {
          updatedCount++;
        }
      } else {
        await prisma.ozonOrder.create({ data });
        syncedCount++;
      }
    }

    await prisma.syncLog.create({
      data: {
        ozonStoreId: storeId,
        userId: userId || null,
        syncType: 'order',
        syncedCount,
        updatedCount,
        deletedCount: 0,
        status: 'success',
        message: `订单同步成功，新增 ${syncedCount} 个订单，更新 ${updatedCount} 个订单`,
      },
    });

    return {
      syncedCount,
      updatedCount,
      deletedCount: 0,
      totalFetched: postings.size,
    };
  } catch (error: any) {
    await prisma.syncLog.create({
      data: {
        ozonStoreId: storeId,
        userId: userId || null,
        syncType: 'order',
        syncedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        status: 'failed',
        message: error.message || '订单同步失败',
      },
    });
    throw error;
  }
};

export const getOrders = async (storeId: number, params: OrderListParams) => {
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  const where: any = { ozonStoreId: storeId };
  const statusWhere = buildStatusWhere(params.status);

  if (statusWhere) {
    where.status = statusWhere;
  }

  const keyword = params.keyword?.trim();

  if (params.since || params.to) {
    where.inProcessAt = {};
    if (params.since) {
      where.inProcessAt.gte = new Date(params.since);
    }
    if (params.to) {
      where.inProcessAt.lte = new Date(params.to);
    }
  }

  const [counts, lastSyncLog] = await Promise.all([
    getOrderCounts(storeId),
    prisma.syncLog.findFirst({
      where: { ozonStoreId: storeId, syncType: 'order', status: 'success' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  let orders: any[] = [];
  let total = 0;

  if (keyword) {
    const matchedOrders = (await prisma.ozonOrder.findMany({
      where,
      orderBy: { inProcessAt: 'desc' },
    })).filter(order => matchesOrderKeyword(order, keyword));

    total = matchedOrders.length;
    orders = matchedOrders.slice(offset, offset + limit);
  } else {
    [orders, total] = await Promise.all([
      prisma.ozonOrder.findMany({
        where,
        orderBy: { inProcessAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.ozonOrder.count({ where }),
    ]);
  }

  const enrichedOrders = await enrichOrdersWithProductImages(storeId, orders);

  return {
    orders: enrichedOrders.map(serializeOrder),
    total,
    hasNext: total > offset + limit,
    counts,
    lastUpdateTime: lastSyncLog?.createdAt?.toISOString() || null,
  };
};

export const getOrderDetail = async (storeId: number, postingNumber: string) => {
  const order = await prisma.ozonOrder.findUnique({
    where: {
      ozonStoreId_postingNumber: {
        ozonStoreId: storeId,
        postingNumber,
      },
    },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  let orderForDisplay = order;
  const translatedRaw = await enrichOrderCancellationTranslations(order.raw);
  const translatedCancellation = translatedRaw?.cancellation || order.cancellation;
  if (JSON.stringify(translatedRaw) !== JSON.stringify(order.raw) || JSON.stringify(translatedCancellation) !== JSON.stringify(order.cancellation)) {
    orderForDisplay = await prisma.ozonOrder.update({
      where: { id: order.id },
      data: {
        raw: translatedRaw,
        cancellation: translatedCancellation,
      },
    });
  }

  const [enrichedOrder] = await enrichOrdersWithProductImages(storeId, [orderForDisplay]);
  return serializeOrder(enrichedOrder);
};

export const getOrderSyncLogs = async (storeId: number, page: number, pageSize: number) => {
  const where = { ozonStoreId: storeId, syncType: 'order' };
  const [logs, total] = await Promise.all([
    prisma.syncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { username: true, nickname: true } },
        ozonStore: { select: { name: true } },
      },
    }),
    prisma.syncLog.count({ where }),
  ]);

  return {
    list: logs.map(log => ({
      id: log.id,
      syncType: log.syncType,
      status: log.status,
      syncedCount: log.syncedCount,
      updatedCount: log.updatedCount,
      deletedCount: log.deletedCount,
      message: log.message || '',
      userName: log.user?.nickname || log.user?.username || '未知用户',
      storeName: log.ozonStore?.name || '未知店铺',
      createdAt: log.createdAt?.toISOString() || '',
    })),
    total,
    page,
    pageSize,
  };
};

export const getRemoteOrderDetail = async (storeId: number, postingNumber: string) => {
  const store = await getStoreCredentials(storeId);
  const response = await ozonApiRequest(OZON_POSTING_GET_API, store.clientId, store.apiKey, {
    posting_number: postingNumber,
    with: {
      analytics_data: true,
      financial_data: true,
      translit: true,
    },
  });

  return normalizeOrder(response.result || response);
};

export const getCancelReasons = async (storeId: number, postingNumber: string) => {
  const store = await getStoreCredentials(storeId);
  const response = await ozonApiRequest(OZON_POSTING_CANCEL_REASONS_API, store.clientId, store.apiKey, {
    posting_number: postingNumber,
  });

  return normalizeCancelReasons(response);
};

export const preparePosting = async (storeId: number, postingNumber: string) => {
  const store = await getStoreCredentials(storeId);
  const beforeResponse = await ozonApiRequest(OZON_POSTING_GET_API, store.clientId, store.apiKey, {
    posting_number: postingNumber,
    with: {
      analytics_data: true,
      financial_data: true,
      translit: true,
    },
  });
  const beforeDetail = beforeResponse.result || beforeResponse;
  assertPreparePostingAllowed({ status: beforeDetail.status });

  await ozonApiRequest(
    OZON_POSTING_SHIP_API,
    store.clientId,
    store.apiKey,
    buildPreparePostingPayload(postingNumber, beforeDetail.products || []),
  );

  const afterDetail = await fetchOrderDetail(store.clientId, store.apiKey, postingNumber);
  return saveRemoteOrderDetail(storeId, afterDetail, store.userId);
};

export const cancelPosting = async (
  storeId: number,
  postingNumber: string,
  cancelReasonId: number,
  cancelReasonMessage?: string,
) => {
  if (!Number.isInteger(cancelReasonId) || cancelReasonId <= 0) {
    throw new Error('请选择取消原因');
  }

  const store = await getStoreCredentials(storeId);
  const beforeResponse = await ozonApiRequest(OZON_POSTING_GET_API, store.clientId, store.apiKey, {
    posting_number: postingNumber,
    with: {
      analytics_data: true,
      financial_data: true,
      translit: true,
    },
  });
  const beforeDetail = beforeResponse.result || beforeResponse;
  assertCancelPostingAllowed({ status: beforeDetail.status });

  await ozonApiRequest(OZON_POSTING_CANCEL_API, store.clientId, store.apiKey, {
    posting_number: postingNumber,
    cancel_reason_id: cancelReasonId,
    cancel_reason_message: cancelReasonMessage?.trim() || undefined,
  });

  const afterDetail = await fetchOrderDetail(store.clientId, store.apiKey, postingNumber);
  return saveRemoteOrderDetail(storeId, afterDetail, store.userId);
};
