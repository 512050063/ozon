import { Request, Response } from 'express';
import {
  getPreferenceConfig,
  savePreferenceConfig,
  getCacheInfo,
  clearCache,
} from '../services/ozonPreferenceService';
import { getCachedOzonSearchProducts } from '../services/ozonSearchService';
import { syncOzonCategoriesIncremental } from '../services/ozonCategoryService';
import logger from '../config/logger';

// 获取配置
export async function getConfig(req: Request, res: Response) {
  try {
    const config = await getPreferenceConfig();
    
    res.json({
      success: true,
      data: config,
      message: '获取配置成功',
    });
  } catch (error: any) {
    logger.error('获取Ozon优选配置失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: `获取配置失败: ${error.message}`,
    });
  }
}

// 保存配置
export async function saveConfig(req: Request, res: Response) {
  try {
    const { searchLimit, cacheMaxAge } = req.body;
    
    const config = await savePreferenceConfig(
      searchLimit ? parseInt(searchLimit) : undefined,
      cacheMaxAge ? parseInt(cacheMaxAge) : undefined,
    );
    
    res.json({
      success: true,
      data: config,
      message: '保存配置成功',
    });
  } catch (error: any) {
    logger.error('保存Ozon优选配置失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: `保存配置失败: ${error.message}`,
    });
  }
}

// 类目更新
export async function syncCategories(req: Request, res: Response) {
  try {
    const result = await syncOzonCategoriesIncremental();
    
    res.json({
      success: true,
      data: result,
      message: `类目同步完成：同步 ${result.syncedCount} 条，更新 ${result.updatedCount} 条`,
    });
  } catch (error: any) {
    logger.error('类目同步失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: `类目同步失败: ${error.message}`,
    });
  }
}

// 获取缓存信息
export async function getCacheStatus(req: Request, res: Response) {
  try {
    const cacheInfo = await getCacheInfo();
    
    res.json({
      success: true,
      data: cacheInfo,
      message: '获取缓存信息成功',
    });
  } catch (error: any) {
    logger.error('获取缓存信息失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: `获取缓存信息失败: ${error.message}`,
    });
  }
}

// 获取指定关键词的搜索缓存，不触发真实搜索
export async function getSearchCache(req: Request, res: Response) {
  try {
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    if (!keyword) {
      return res.status(400).json({
        success: false,
        data: [],
        message: '请提供搜索关键词',
      });
    }

    const result = await getCachedOzonSearchProducts(keyword);
    res.json(result);
  } catch (error: any) {
    logger.error('获取搜索缓存失败:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: `获取搜索缓存失败: ${error.message}`,
    });
  }
}

// 清除缓存
export async function clearSearchCache(req: Request, res: Response) {
  try {
    const result = await clearCache();
    
    res.json({
      success: true,
      data: result,
      message: `缓存已清除，释放了 ${result.clearedSize}`,
    });
  } catch (error: any) {
    logger.error('清除缓存失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: `清除缓存失败: ${error.message}`,
    });
  }
}
