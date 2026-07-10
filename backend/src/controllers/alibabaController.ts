import { Request, Response } from 'express';
import logger from '../config/logger';
import {
  searchAlibabaProducts,
  getAlibabaProductDetail,
  getSupplierInfo,
  batchGetAlibabaProducts,
  exchangeToken,
  getTokenStatus,
  getAuthPageHtml,
  loadAlibabaConfig,
  saveAlibabaConfig,
  searchSimilarProductsByImage,
  searchRecommendSameProducts
} from '../services/alibabaService';

/**
 * 搜索1688货源
 */
export const searchAlibabaProductsController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { keyword, page = 1, pageSize = 20, ...filters } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '请输入搜索关键词'
      });
    }

    const result = await searchAlibabaProducts(
      userId,
      keyword as string,
      parseInt(page as string),
      parseInt(pageSize as string),
      filters
    );

    res.json(result);
  } catch (error: any) {
    logger.error('搜索1688货源失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '搜索失败'
    });
  }
};

/**
 * 获取1688商品详情
 */
export const getAlibabaProductDetailController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: '请提供商品ID'
      });
    }

    const result = await getAlibabaProductDetail(userId, productId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || '获取详情失败',
        data: result.data ?? null
      });
    }

    res.json(result);
  } catch (error: any) {
    logger.error('获取1688商品详情失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取详情失败'
    });
  }
};

/**
 * 获取供应商信息
 */
export const getSupplierInfoController = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;

    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: '请提供供应商ID'
      });
    }

    const result = await getSupplierInfo(supplierId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || '获取供应商信息失败',
        data: result.data ?? null
      });
    }

    res.json(result);
  } catch (error: any) {
    logger.error('获取供应商信息失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取供应商信息失败'
    });
  }
};

/**
 * 批量获取商品信息
 */
export const batchGetAlibabaProductsController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供商品ID列表'
      });
    }

    const results = await batchGetAlibabaProducts(userId, productIds);

    res.json({
      success: true,
      message: '批量获取成功',
      data: results
    });
  } catch (error: any) {
    logger.error('批量获取1688商品信息失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '批量获取失败'
    });
  }
};

/**
 * 搜同款 - 图片搜索
 */
export const searchSimilarProductsByImageController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { imageUrl, imageBase64, page = 1, pageSize = 20 } = req.body;

    if (!imageUrl && !imageBase64) {
      return res.status(400).json({
        success: false,
        message: '请提供图片URL或图片Base64编码'
      });
    }

    const result = await searchSimilarProductsByImage(
      userId,
      imageUrl,
      imageBase64,
      parseInt(page as string),
      parseInt(pageSize as string)
    );

    res.json(result);
  } catch (error: any) {
    logger.error('搜同款失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '搜同款失败'
    });
  }
};

/**
 * 搜同类 - 基于关键词搜索同类商品
 */
export const searchRecommendSameProductsController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { keyword, page = 1, pageSize = 20 } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '请提供搜索关键词'
      });
    }

    const result = await searchRecommendSameProducts(
      userId,
      keyword as string,
      parseInt(page as string),
      parseInt(pageSize as string)
    );

    res.json(result);
  } catch (error: any) {
    logger.error('搜同类失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '搜同类失败'
    });
  }
};

/**
 * 获取授权页面
 */
export const getAuthPageController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const html = await getAuthPageHtml(userId);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    logger.error('获取授权页面失败:', error);
    res.status(500).json({
      success: false,
      message: '获取授权页面失败'
    });
  }
};

/**
 * 用授权码换取Token
 */
export const exchangeTokenController = async (req: Request, res: Response) => {
  try {
    // 优先从JWT获取userId；callback.html跨域无JWT时，从state参数解析
    let userId = (req as any).user?.id;
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '请提供授权码'
      });
    }

    if (!userId && state) {
      const stateStr = state as string;
      const parts = stateStr.split(':');
      if (parts.length >= 1) {
        const parsedId = parseInt(parts[0], 10);
        if (!isNaN(parsedId)) {
          userId = parsedId;
        }
      }
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '缺少访问令牌'
      });
    }

    const result = await exchangeToken(userId, code as string);

    if (result.access_token) {
      res.json({
        success: true,
        message: 'Token获取成功',
        data: {
          expiresIn: result.expires_in,
        }
      });
    } else {
      res.json({
        success: false,
        message: result.error_description || result.error || '获取Token失败'
      });
    }
  } catch (error: any) {
    logger.error('换取Token失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '换取Token失败'
    });
  }
};

/**
 * 获取Token状态
 */
export const getTokenStatusController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const status = await getTokenStatus(userId);
    res.json({
      success: true,
      message: '获取成功',
      data: status
    });
  } catch (error: any) {
    logger.error('获取Token状态失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取Token状态失败'
    });
  }
};

/**
 * 获取授权链接信息
 */
export const getAuthorizeInfoController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const config = await loadAlibabaConfig(userId);
    const crypto = require('crypto');

    const appKey = (config.appKey || config.app_key || '').trim();
    const appSecret = (config.appSecret || config.app_secret || '').trim();
    const redirectUri = (config.redirectUri || config.redirect_uri || '').trim();

    const state = `${userId}:${Date.now()}`;

    const standardUrl = `https://auth.1688.com/oauth/authorize?response_type=code&client_id=${appKey}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    const ts = Date.now().toString();
    const managedParams: Record<string, string> = {
      '_aop_timestamp': ts,
      '_aop_timestamp_diff': '3600000',
      'client_id': appKey,
      'redirect_uri': redirectUri,
      'sceneId': 'daily_homepage',
      'state': state,
    };

    const sortedKeys = Object.keys(managedParams).sort();
    let signStr = '';
    for (const key of sortedKeys) {
      signStr += key + managedParams[key];
    }
    const signature = crypto.createHmac('sha1', appSecret).update(signStr).digest('hex').toUpperCase();

    const qsParts: string[] = [];
    for (const key of sortedKeys) {
      qsParts.push(`${key}=${encodeURIComponent(managedParams[key])}`);
    }
    qsParts.push(`_aop_signature=${signature}`);
    const managedUrl = `https://auth.1688.com/oauth/managed?${qsParts.join('&')}`;

    res.json({
      success: true,
      message: '获取成功',
      data: {
        appKey,
        redirectUri,
        standardUrl,
        managedUrl
      }
    });
  } catch (error: any) {
    logger.error('获取授权信息失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取授权信息失败'
    });
  }
};

/**
 * 保存1688配置
 */
export const saveAlibabaConfigController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const config = req.body;

    if (!config.appKey || !config.appSecret) {
      return res.status(400).json({
        success: false,
        message: '请提供App Key和App Secret'
      });
    }

    await saveAlibabaConfig(userId, {
      appKey: config.appKey,
      appSecret: config.appSecret,
      redirectUri: config.redirectUri || 'https://58.87.104.60/callback.html',
      saved_at: new Date().toLocaleString('zh-CN')
    });

    res.json({
      success: true,
      message: '配置保存成功'
    });
  } catch (error: any) {
    logger.error('保存1688配置失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '保存配置失败'
    });
  }
};
