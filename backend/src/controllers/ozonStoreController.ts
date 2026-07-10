import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import logger from '../config/logger';
import {
  syncProductsToDatabase,
  getProductsFromDatabase,
  deleteProductFromDatabase,
  listProductToOzon,
  updateOzonProductPrice,
  updateOzonProductStock,
  syncStockFromOzon,
  getSingleOzonProductDetail,
  archiveOzonProduct,
  unarchiveOzonProduct,
  updateOzonProduct,
  resolveProductImagesForOzon,
  replaceProductImageUsageReferences,
  refreshSingleOzonProduct,
  getLocalOzonProductSnapshot,
  getOzonProductLimits,
  assertOzonProductOperationLimit
} from '../services/ozonProductService';
import { getErrorCodes, translateAndStoreOzonMessages, translateErrorCode } from '../services/ozonErrorCodeService';
import {
  getUserOwnedStoreById,
  resolveUserStoreContext,
} from '../services/ozonStoreContextService';

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

// 简单的内存缓存实现
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 60000; // 1分钟缓存，避免频繁调用API
const DEFAULT_OZON_PUSH_PUBLIC_BASE_URL = 'http://58.87.104.60';

// 设置缓存
const setCache = (key: string, data: any) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

// 获取缓存
const getCache = (key: string) => {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data;
  }
  cache.delete(key);
  return null;
};

// 清空缓存
const clearCache = (keyPrefix?: string) => {
  if (keyPrefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

function createOzonPushSecret() {
  return crypto.randomBytes(24).toString('hex');
}

function getPublicBaseUrl(req: Request) {
  const configured = process.env.OZON_PUSH_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || process.env.APP_PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, '');

  const forwardedProto = req.headers['x-forwarded-proto']?.toString().split(',')[0];
  const proto = forwardedProto || req.protocol || 'http';
  const host = req.headers['x-forwarded-host']?.toString().split(',')[0] || req.headers.host;
  if (host && !/^localhost(:|$)|127\.0\.0\.1(:|$)/.test(host)) {
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  return DEFAULT_OZON_PUSH_PUBLIC_BASE_URL;
}

function getOzonPushUrl(req: Request, store: { id: number; pushSecret?: string | null }) {
  if (!store.pushSecret) return null;
  return `${getPublicBaseUrl(req)}/api/ozon/push/receive/${store.id}/${store.pushSecret}`;
}

async function ensureOzonPushSecret(storeId: number) {
  const store = await prisma.ozonStore.findUnique({
    where: { id: storeId },
  });

  if (!store) return null;
  if (store.pushSecret) return store;

  return prisma.ozonStore.update({
    where: { id: storeId },
    data: {
      pushSecret: createOzonPushSecret(),
      pushSecretCreatedAt: new Date(),
      pushEnabled: true,
    },
  });
}

// Ozon API请求函数
const ozonApiRequest = async (
  url: string,
  clientId: string,
  apiKey: string,
  method: 'GET' | 'POST' = 'GET',
  data?: any
): Promise<any> => {
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
      throw new Error(`Ozon API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    logger.error('Ozon API request failed:', error);
    throw error;
  }
};

// 解析Ozon API返回的店铺数据
const parseOzonStoreData = (apiData: any) => {
  const company = apiData.company || {};
  const subscription = apiData.subscription || {};
  
  return {
    // 基础信息
    name: company.name || 'Ozon店铺',
    storeId: company.inn || '',
    address: '',
    legalName: company.legal_name || '',
    taxNumber: company.inn || '',
    currency: company.currency || 'CNY',
    country: company.country || 'CHN',
    
    // 订阅信息
    isPremium: subscription.is_premium || false,
    subscriptionType: subscription.type || 'UNSPECIFIED',
    
    // 评级信息
    ratings: apiData.ratings || [],
    
    // 公司详细信息
    ownershipForm: company.ownership_form || '',
    taxSystem: company.tax_system || 'UNSPECIFIED',
    
    // 产品数量（暂未获取）
    productCount: 0,
    
    // 原始API数据（用于详情页展示）
    rawApiData: apiData,
  };
};

// 获取所有Ozon店铺
export const getOzonStores = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userContext = userId ? await resolveUserStoreContext(userId) : null;
    const stores = await prisma.ozonStore.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 批量获取每个店铺的最近同步时间（一次查询，避免 N+1）
    const storeIds = stores.map((s: any) => s.id);
    const allLogs = await prisma.syncLog.findMany({
      where: {
        ozonStoreId: { in: storeIds },
        syncType: 'product',
      },
      orderBy: { createdAt: 'desc' },
      select: { ozonStoreId: true, createdAt: true },
    });
    // 每个店铺只保留最近一条
    const lastSyncMap = new Map<number, string>();
    for (const log of allLogs) {
      if (!lastSyncMap.has(log.ozonStoreId)) {
        lastSyncMap.set(log.ozonStoreId, (log as any).createdAt.toISOString());
      }
    }
    const storesWithSync = stores.map((s: any) => ({
      ...s,
      lastSyncAt: lastSyncMap.get(s.id) || null,
      isCurrent: userContext?.currentOzonStoreId === s.id,
    }));

    res.json({
      success: true,
      message: '获取Ozon店铺成功',
      data: storesWithSync,
    });
  } catch (error: any) {
    logger.error('获取Ozon店铺失败:', error);
    const status = error.message === '店铺不存在或无权限访问' ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message || '服务器错误',
    });
  }
};

export const getOzonStoreContext = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未登录',
      });
    }

    const context = await resolveUserStoreContext(userId);

    res.json({
      success: true,
      message: '获取当前店铺上下文成功',
      data: {
        currentOzonStoreId: context.currentOzonStoreId,
        resolvedStoreId: context.resolvedStoreId,
        store: context.resolvedStore,
      },
    });
  } catch (error: any) {
    logger.error('获取当前店铺上下文失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取当前店铺上下文失败',
    });
  }
};

export const setCurrentOzonStore = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const storeId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未登录',
      });
    }

    if (!Number.isInteger(storeId) || storeId <= 0) {
      return res.status(400).json({
        success: false,
        message: '无效的店铺ID',
      });
    }

    await getUserOwnedStoreById(userId, storeId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentOzonStoreId: storeId,
      },
    });

    const context = await resolveUserStoreContext(userId);

    res.json({
      success: true,
      message: '当前操作店铺设置成功',
      data: {
        currentOzonStoreId: context.currentOzonStoreId,
        resolvedStoreId: context.resolvedStoreId,
        store: context.resolvedStore,
      },
    });
  } catch (error: any) {
    logger.error('设置当前操作店铺失败:', error);
    const status = error.message === '店铺不存在或无权限访问' ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message || '设置当前操作店铺失败',
    });
  }
};

// 获取单个Ozon店铺
export const getOzonStore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const storeId = parseInt(id);

    const store = userId
      ? await getUserOwnedStoreById(userId, storeId)
      : await prisma.ozonStore.findUnique({
        where: {
          id: storeId,
        },
      });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    res.json({
      success: true,
      message: '获取Ozon店铺成功',
      data: store,
    });
  } catch (error: any) {
    logger.error('获取Ozon店铺失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 创建Ozon店铺
export const createOzonStore = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      apiUrl = 'https://api-seller.ozon.ru/v1/seller/info',
      clientId,
      apiKey,
    } = req.body;

    // 调用Ozon API获取店铺信息
    const apiData = await ozonApiRequest(apiUrl, clientId, apiKey, 'POST', {});

    // 解析API返回的数据
    const storeData = parseOzonStoreData(apiData);

    const now = new Date();
    const store = await prisma.ozonStore.create({
      data: {
        ...storeData,
        userId: userId ?? null,
        apiUrl: apiUrl as any,
        clientId,
        apiKey,
        pushSecret: createOzonPushSecret(),
        pushSecretCreatedAt: now,
        pushEnabled: true,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    });

    if (userId) {
      await prisma.user.updateMany({
        where: {
          id: userId,
          currentOzonStoreId: null,
        },
        data: {
          currentOzonStoreId: store.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: '创建Ozon店铺成功',
      data: store,
    });
  } catch (error: any) {
    logger.error('创建Ozon店铺失败:', error);
    res.status(500).json({
      success: false,
      message: `创建店铺失败: ${error.message}`,
    });
  }
};

export const getOzonStorePushConfig = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const storeId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未登录',
      });
    }

    if (!Number.isInteger(storeId) || storeId <= 0) {
      return res.status(400).json({
        success: false,
        message: '无效的店铺ID',
      });
    }

    await getUserOwnedStoreById(userId, storeId);
    const store = await ensureOzonPushSecret(storeId);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    return res.json({
      success: true,
      message: '获取推送地址成功',
      data: {
        storeId: store.id,
        pushEnabled: store.pushEnabled,
        pushUrl: getOzonPushUrl(req, store),
        pushSecretCreatedAt: store.pushSecretCreatedAt,
      },
    });
  } catch (error: any) {
    logger.error('获取 Ozon 推送配置失败:', error);
    const status = error.message === '店铺不存在或无权限访问' ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || '获取推送配置失败',
    });
  }
};

export const resetOzonPushSecret = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const storeId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未登录',
      });
    }

    if (!Number.isInteger(storeId) || storeId <= 0) {
      return res.status(400).json({
        success: false,
        message: '无效的店铺ID',
      });
    }

    await getUserOwnedStoreById(userId, storeId);
    const store = await prisma.ozonStore.update({
      where: { id: storeId },
      data: {
        pushSecret: createOzonPushSecret(),
        pushSecretCreatedAt: new Date(),
        pushEnabled: true,
      },
    });

    return res.json({
      success: true,
      message: '推送密钥已重置，请同步更新 Ozon 后台通知地址',
      data: {
        storeId: store.id,
        pushEnabled: store.pushEnabled,
        pushUrl: getOzonPushUrl(req, store),
        pushSecretCreatedAt: store.pushSecretCreatedAt,
      },
    });
  } catch (error: any) {
    logger.error('重置 Ozon 推送密钥失败:', error);
    const status = error.message === '店铺不存在或无权限访问' ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || '重置推送密钥失败',
    });
  }
};

// 更新Ozon店铺
export const updateOzonStore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const storeId = parseInt(id);

    // 检查店铺是否存在
    const existingStore = userId
      ? await getUserOwnedStoreById(userId, storeId)
      : await prisma.ozonStore.findUnique({
        where: {
          id: storeId,
        },
      });

    if (!existingStore) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    // 通过API获取最新店铺信息
    const apiData = await ozonApiRequest(
      existingStore.apiUrl as string,
      existingStore.clientId,
      existingStore.apiKey,
      'POST',
      {}
    );

    const storeData = parseOzonStoreData(apiData);

    const store = await prisma.ozonStore.update({
      where: { id: storeId },
      data: {
        ...storeData,
        apiUrl: existingStore.apiUrl as any,
        clientId: existingStore.clientId,
        apiKey: existingStore.apiKey,
      },
    });

    res.json({
      success: true,
      message: '更新Ozon店铺成功',
      data: store,
    });
  } catch (error: any) {
    logger.error('更新Ozon店铺失败:', error);
    const status = error.message === '店铺不存在或无权限访问' ? 404 : 500;
    res.status(status).json({
      success: false,
      message: `更新店铺失败: ${error.message}`,
    });
  }
};

// 删除Ozon店铺
export const deleteOzonStore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const storeId = parseInt(id);

    // 检查店铺是否存在
    const store = userId
      ? await getUserOwnedStoreById(userId, storeId)
      : await prisma.ozonStore.findUnique({
        where: {
          id: storeId,
        },
      });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    await prisma.$transaction(async (tx) => {
      const userWhere = userId ? { id: userId } : {};

      await tx.user.updateMany({
        where: {
          ...userWhere,
          currentOzonStoreId: storeId,
        },
        data: {
          currentOzonStoreId: null,
        },
      });

      await tx.ozonStore.delete({
        where: { id: storeId },
      });
    });

    res.json({
      success: true,
      message: '删除Ozon店铺成功',
    });
  } catch (error: any) {
    logger.error('删除Ozon店铺失败:', error);
    const status = error.message === '店铺不存在或无权限访问' ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message || '服务器错误',
    });
  }
};

// 获取店铺产品ID列表（代理API，带缓存）
export const getOzonProductIdsByStoreId = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { limit = 30, offset = 0 } = req.query; // 默认一次获取30条记录

    // 检查店铺是否存在
    const store = await prisma.ozonStore.findUnique({
      where: {
        id: parseInt(storeId),
      },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    // 尝试从缓存获取
    const cacheKey = `product_ids_${storeId}_${limit}_${offset}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      return res.json({
        success: true,
        message: '从缓存获取产品ID列表成功',
        data: cachedData,
      });
    }

    // 调用Ozon API获取产品列表
    const apiData = await ozonApiRequest(
      'https://api-seller.ozon.ru/v3/product/list',
      store.clientId,
      store.apiKey,
      'POST',
      {
        dir: 'asc',
        filter: {
          visibility: 'ALL',
        },
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sort: 'product_id',
      }
    );

    // 安全提取产品ID
    let productIds: number[] = [];
    if (apiData && apiData.result && apiData.result.items) {
      productIds = apiData.result.items.map((item: any) => item.product_id);
    }

    // 缓存数据
    setCache(cacheKey, productIds);

    res.json({
      success: true,
      message: '获取产品ID列表成功',
      data: productIds,
    });
  } catch (error: any) {
    logger.error('获取Ozon产品ID列表失败:', error);
    res.status(500).json({
      success: false,
      message: `获取产品ID列表失败: ${error.message}`,
    });
  }
};

// 获取产品详情列表（代理API）
export const getOzonProductDetails = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { productIds, offset = 0, limit = 6 } = req.body;

    // 检查店铺是否存在
    const store = await prisma.ozonStore.findUnique({
      where: {
        id: parseInt(storeId),
      },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    // 如果没有提供产品ID，返回空数组
    if (!productIds || productIds.length === 0) {
      return res.json({
        success: true,
        message: '未提供产品ID',
        data: [],
      });
    }

    // 切片获取指定范围的产品ID
    const start = parseInt(offset as string);
    const end = start + parseInt(limit as string);
    const productIdsToFetch = productIds.slice(start, end);

    logger.info('请求产品详情参数:', { productIdsToFetch, offset, limit });

    // 调用Ozon API获取产品详情
    const apiData = await ozonApiRequest(
      'https://api-seller.ozon.ru/v3/product/info/list',
      store.clientId,
      store.apiKey,
      'POST',
      {
        product_id: productIdsToFetch,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      }
    );

    logger.info('Ozon API返回的原始数据:', JSON.stringify(apiData, null, 2));

    // 安全提取产品详情
    let productDetails: any[] = [];
    try {
      if (apiData && apiData.result && Array.isArray(apiData.result.items)) {
        productDetails = apiData.result.items;
      } else if (apiData && Array.isArray(apiData.items)) {
        productDetails = apiData.items;
      } else if (Array.isArray(apiData)) {
        productDetails = apiData;
      } else {
        logger.error('API返回的数据格式无效:', apiData);
        return res.status(400).json({
          success: false,
          message: 'API返回的数据格式无效',
        });
      }
    } catch (error) {
      logger.error('解析产品详情失败:', error);
      return res.status(500).json({
        success: false,
        message: '解析产品详情失败',
      });
    }

    logger.info('解析后的产品详情:', productDetails);

    res.json({
      success: true,
      message: '获取产品详情成功',
      data: productDetails,
    });
  } catch (error: any) {
    logger.error('获取Ozon产品详情失败:', error);
    res.status(500).json({
      success: false,
      message: `获取产品详情失败: ${error.message}`,
    });
  }
};

// 同步产品到本地数据库（用于首次获取和刷新）
export const syncOzonProducts = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const userId = (req as any).user?.id;

    // 检查店铺是否存在
    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    logger.info(`开始同步店铺 ${store.name} 的产品数据`);

    const result = await syncProductsToDatabase(parseInt(storeId), userId);

    let msg = `产品同步成功，新增 ${(result as any).syncedCount} 个产品，更新 ${(result as any).updatedCount} 个产品，删除 ${(result as any).deletedCount || 0} 个产品`;
    if ((result as any).failCount > 0) {
      msg += `，${(result as any).failCount} 个产品同步失败（详情见后端日志）`;
    }

    res.json({
      success: true,
      message: msg,
      data: result,
    });

    logger.info(`店铺 ${store.name} 产品同步完成`);
  } catch (error: any) {
    logger.error('同步Ozon产品失败:', error);
    res.status(500).json({
      success: false,
      message: `同步产品失败: ${error.message}`,
    });
  }
};

// 获取本地数据库中的产品列表（带分页）
export const getLocalOzonProducts = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { page = 1, pageSize = 6, keyword = '', status = 'all' } = req.query;

    // 检查店铺是否存在
    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const limit = parseInt(pageSize as string);

    // 调用服务函数获取产品列表（包含类目名称 + 关键词过滤由数据库层完成）
    const statusStr = typeof status === 'string' ? status : undefined;
    const keywordStr = typeof keyword === 'string' && keyword.trim() ? keyword.trim() : undefined;
    const result = await getProductsFromDatabase(parseInt(storeId), offset, limit, statusStr, keywordStr);

    res.json({
      success: true,
      message: '获取产品列表成功',
      data: {
        items: result.items,
        totalCount: result.totalCount,
        allTotalCount: result.allTotalCount,
        sellingCount: result.sellingCount,
        pendingCount: result.pendingCount,
        errorCount: result.errorCount,
        readyCount: result.readyCount,
        unlistedCount: result.unlistedCount,
        archivedCount: result.archivedCount,
        page: parseInt(page as string),
        pageSize: limit,
        lastUpdateTime: result.lastUpdateTime
      }
    });
  } catch (error: any) {
    logger.error('获取本地Ozon产品失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 删除本地数据库中的产品
export const deleteLocalOzonProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    await deleteProductFromDatabase(parseInt(productId));

    res.json({
      success: true,
      message: '删除产品成功',
    });
  } catch (error: any) {
    logger.error('删除本地Ozon产品失败:', error);
    res.status(500).json({
      success: false,
      message: `删除产品失败: ${error.message}`,
    });
  }
};

// 获取状态的中文名称
const getStatusZh = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待处理',
    'analyzing': '分析中',
    'ready': '准备就绪',
    'listed': '在售',
    'failed': '不出售',
    'unknown': '未创建'
  };
  return statusMap[status] || status;
};

// 测试连接
export const testOzonConnection = async (req: Request, res: Response) => {
  try {
    const { apiUrl = 'https://api-seller.ozon.ru/v1/seller/info', clientId, apiKey } = req.body;

    // 调用Ozon API测试连接
    const apiData = await ozonApiRequest(apiUrl, clientId, apiKey, 'POST', {});

    res.json({
      success: true,
      message: '连接Ozon平台成功',
      data: parseOzonStoreData(apiData),
    });
  } catch (error: any) {
    logger.error('测试Ozon连接失败:', error);
    res.status(400).json({
      success: false,
      message: `连接Ozon平台失败: ${error.message}`,
    });
  }
};

// 一键上架商品到Ozon
export const listProductToOzonController = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { productId, price, stock } = req.body;

    // 检查店铺是否存在
    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    // 获取本地商品数据
    const warehouseItem = await prisma.warehouseItem.findUnique({
      where: { id: productId },
      include: { product: true },
    });

    if (!warehouseItem) {
      return res.status(404).json({
        success: false,
        message: '商品不存在',
      });
    }

    const productData = {
      ...warehouseItem.product,
      stock: stock || warehouseItem.inventoryQuantity,
      price: price || warehouseItem.product.price,
    };

    // 调用上架服务
    const result = await listProductToOzon(store, productData);

    if (result.success) {
      // 更新本地数据库状态
      await prisma.warehouseItem.update({
        where: { id: productId },
        data: {
          status: 'listed',
          ozonProductId: result.productId,
        },
      });

      await prisma.product.update({
        where: { id: warehouseItem.productId },
        data: {
          ozonProductId: result.productId,
        },
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: any) {
    logger.error('上架商品到Ozon失败:', error);
    res.status(500).json({
      success: false,
      message: `上架商品失败: ${error.message}`,
    });
  }
};

// 更新Ozon商品价格
export const updateOzonProductPriceController = async (req: Request, res: Response) => {
  try {
    const { storeId, productId } = req.params;
    const { price, currencyCode, oldPrice, minPrice, premiumPrice } = req.body;

    // 检查店铺是否存在
    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    // 调用价格更新服务
    const result = await updateOzonProductPrice(store, productId, price, currencyCode, oldPrice, minPrice, premiumPrice);

    try {
      await refreshSingleOzonProduct(store, productId);
    } catch (syncError: any) {
      logger.warn(`价格更新成功但刷新本地商品失败: productId=${productId}, error=${syncError.message}`);
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    logger.error('更新Ozon商品价格失败:', error);
    res.status(500).json({
      success: false,
      message: `更新价格失败: ${error.message}`,
    });
  }
};

// 更新Ozon商品库存
export const updateOzonProductStockController = async (req: Request, res: Response) => {
  try {
    const { storeId, productId } = req.params;
    const { stock } = req.body;

    // 检查店铺是否存在
    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    // Ozon库存API仅更新卖家仓/FBS库存，FBP/FBO库存由平台仓同步返回，只读。
    const result = await updateOzonProductStock(store, productId, stock);

    try {
      await refreshSingleOzonProduct(store, productId);
    } catch (syncError: any) {
      logger.warn(`库存更新成功但刷新本地商品失败: productId=${productId}, error=${syncError.message}`);
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    logger.error('更新Ozon商品库存失败:', error);
    res.status(500).json({
      success: false,
      message: `更新库存失败: ${error.message}`,
    });
  }
};

export const getOzonProductLimitsController = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    const limits = await getOzonProductLimits(store);
    res.json({
      success: true,
      message: '获取 Ozon 商品额度成功',
      data: limits,
    });
  } catch (error: any) {
    logger.error('获取Ozon商品额度失败:', error);
    res.status(500).json({
      success: false,
      message: `获取商品额度失败: ${error.message}`,
    });
  }
};

// 归档Ozon商品
export const archiveOzonProductController = async (req: Request, res: Response) => {
  try {
    const { storeId, productId } = req.params;

    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    const result = await archiveOzonProduct(store, productId);

    if (!(result as any).alreadyArchived) {
      try {
        await refreshSingleOzonProduct(store, productId);
      } catch (syncError: any) {
        logger.warn(`归档成功但刷新本地商品失败: productId=${productId}, error=${syncError.message}`);
      }
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    logger.error('归档Ozon商品失败:', error);
    res.status(500).json({
      success: false,
      message: `归档失败: ${error.message}`,
    });
  }
};

// 取消归档Ozon商品
export const unarchiveOzonProductController = async (req: Request, res: Response) => {
  try {
    const { storeId, productId } = req.params;

    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    const result = await unarchiveOzonProduct(store, productId);

    if (!(result as any).alreadyUnarchived) {
      try {
        await refreshSingleOzonProduct(store, productId);
      } catch (syncError: any) {
        logger.warn(`取消归档成功但刷新本地商品失败: productId=${productId}, error=${syncError.message}`);
      }
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    logger.error('取消归档Ozon商品失败:', error);
    res.status(500).json({
      success: false,
      message: `取消归档失败: ${error.message}`,
    });
  }
};

// 更新Ozon商品信息
export const updateOzonProductController = async (req: Request, res: Response) => {
  try {
    const { storeId, productId } = req.params;
    const userId = (req as any).user?.id;
    const productData = { ...req.body, productId, userId };

    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    try {
      const limits = await getOzonProductLimits(store);
      assertOzonProductOperationLimit(limits, 'update');
    } catch (limitError: any) {
      if (String(limitError?.message || '').includes('额度已用完')) {
        return res.status(429).json({
          success: false,
          message: limitError.message,
        });
      }
      logger.warn(`获取商品更新额度失败，继续提交商品更新: ${limitError.message}`);
    }

    const convertedImages = await resolveProductImagesForOzon(productData);
    const result = await updateOzonProduct(store, {
      ...productData,
      imageUrl: convertedImages.imageUrls[0] || '',
      images: convertedImages.imageUrls,
    });

    if (Number.isFinite(Number(userId))) {
      await replaceProductImageUsageReferences({
        userId: Number(userId),
        refType: 'ozon_product',
        refId: Number(productId),
        imageIds: convertedImages.imageIds,
      });
    }

    try {
      await refreshSingleOzonProduct(store, productId);
    } catch (syncError: any) {
      logger.warn(`商品更新提交成功但刷新本地商品失败: productId=${productId}, error=${syncError.message}`);
    }

    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: any) {
    logger.error('更新Ozon商品信息失败:', error);
    res.status(500).json({
      success: false,
      message: `更新商品失败: ${error.message}`,
    });
  }
};

// 操作前校验商品是否仍存在，并刷新本地快照
export const validateOzonProductController = async (req: Request, res: Response) => {
  try {
    const { storeId, productId } = req.params;
    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    await refreshSingleOzonProduct(store, productId);
    const snapshot = await getLocalOzonProductSnapshot(parseInt(storeId), productId);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: '商品本地快照不存在',
      });
    }

    res.json({
      success: true,
      message: '商品状态已校验',
      data: snapshot,
    });
  } catch (error: any) {
    const message = error.message || '商品校验失败';
    logger.error('操作前校验Ozon商品失败:', error);
    res.status(409).json({
      success: false,
      message: message.includes('404') || message.includes('not found')
        ? '该商品已在 Ozon 后台删除或不可访问'
        : `商品校验失败: ${message}`,
    });
  }
};

// 同步库存从Ozon到本地
export const syncStockFromOzonController = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;

    // 调用库存同步服务
    const result = await syncStockFromOzon(parseInt(storeId));

    res.json({
      success: result.success,
      message: result.message,
      data: {
        syncedCount: result.syncedCount,
      },
    });
  } catch (error: any) {
    logger.error('同步Ozon库存失败:', error);
    res.status(500).json({
      success: false,
      message: `同步库存失败: ${error.message}`,
    });
  }
};

// 获取单个商品详情（从Ozon API）
export const getOzonProductDetailController = async (req: Request, res: Response) => {
  try {
    const { storeId, productId } = req.params;

    // 检查店铺是否存在
    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    // 获取商品详情
    const productDetail = await getSingleOzonProductDetail(store, productId);   

    res.json({
      success: true,
      message: '获取商品详情成功',
      data: productDetail,
    });
  } catch (error: any) {
    logger.error('获取Ozon商品详情失败:', error);
    res.status(500).json({
      success: false,
      message: `获取商品详情失败: ${error.message}`,
    });
  }
};

// 获取 Ozon 错误码映射表
export const getOzonErrorCodes = async (req: Request, res: Response) => {
  try {
    const errorCodes = await getErrorCodes();
    res.json({
      success: true,
      message: '获取错误码映射成功',
      data: errorCodes,
    });
  } catch (error: any) {
    logger.error('获取错误码映射失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 翻译单个错误码
export const translateOzonErrorCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { code, message, level } = req.body;
    const translatedItems = await translateAndStoreOzonMessages([{ code, message, level }], userId ? Number(userId) : undefined);
    const zhMessage = translatedItems[0]?.messageZh || translateErrorCode(code, message);
    res.json({
      success: true,
      data: { code, messageZh: zhMessage },
    });
  } catch (error: any) {
    logger.error('翻译错误码失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 批量翻译并缓存 Ozon 错误/状态提示
export const translateOzonErrorCodes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const translatedItems = await translateAndStoreOzonMessages(items, userId ? Number(userId) : undefined);
    res.json({
      success: true,
      data: translatedItems,
    });
  } catch (error: any) {
    logger.error('批量翻译错误码失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};
// 获取店铺同步日志（同时包含该店铺的产品日志 + ozonStoreId=0 的类目日志）
export const getSyncLogs = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    const pageNum = parseInt(page.toString());
    const pageSizeNum = parseInt(pageSize.toString());

    // 检查店铺是否存在
    const store = await prisma.ozonStore.findUnique({
      where: { id: parseInt(storeId) },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Ozon店铺不存在',
      });
    }

    // 查询该店铺的产品日志 + 所有类目日志（类目更新是全局操作，不绑定店铺）
    const whereClause: any = {
      OR: [
        { ozonStoreId: parseInt(storeId) },
        { syncType: 'category' },
      ],
    };

    // 计算总数
    const total = await prisma.syncLog.count({ where: whereClause });

    // 获取同步日志（关联用户表获取昵称）
    const logs = await prisma.syncLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
      include: {
        user: {
          select: {
            username: true,
            nickname: true,
          },
        },
        ozonStore: {
          select: {
            name: true,
          },
        },
      },
    }) as Array<any>;

    // 转换数据并补齐日志模板需要的字段
    const result = logs.map((log) => {
      const data = convertBigIntToString(log);
      return {
        ...data,
        userName: log.user?.nickname || log.user?.username || (log.syncType === 'category' ? '系统' : '未知用户'),
        operatorName: log.user?.nickname || log.user?.username || (log.syncType === 'category' ? '系统' : '未知用户'),
        storeName: log.ozonStore?.name || store.name || '未知店铺',
      };
    });

    res.json({
      success: true,
      message: '获取同步日志成功',
      data: {
        list: result,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
      },
    });
  } catch (error: any) {
    logger.error('获取同步日志失败:', error);
    res.status(500).json({
      success: false,
      message: `获取同步日志失败: ${error.message}`,
    });
  }
};
