import { Request, Response } from 'express';
import { searchOzonProducts } from '../services/ozonSearchService';
import { resolveOzonProductLinkWithDefaultDependencies } from '../services/ozonProductLinkService';
import logger from '../config/logger';

export async function searchProducts(req: Request, res: Response) {
  try {
    const { keyword, category } = req.query;
    
    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供搜索关键词'
      });
    }

    const result = await searchOzonProducts(keyword, typeof category === 'string' ? category : undefined);
    
    res.json(result);
  } catch (error: any) {
    logger.error('搜索商品失败:', error);
    res.status(500).json({
      success: false,
      message: `搜索失败: ${error.message}`
    });
  }
}

export async function getProductByUrl(req: Request, res: Response) {
  try {
    const { productUrl } = req.body || {};

    if (!productUrl || typeof productUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: '商品链接不能为空'
      });
    }

    const result = await resolveOzonProductLinkWithDefaultDependencies(productUrl);
    return res.json(result);
  } catch (error: any) {
    const message = error?.message || '链接解析失败';
    const status = /Cookie|链接|不能为空|有效/.test(message) ? 400 : 500;
    return res.status(status).json({
      success: false,
      message
    });
  }
}
