import { Request, Response } from 'express';
import * as ozonTypeService from '../services/ozonTypeService';
import logger from '../config/logger';

/**
 * 强制重置批量提取状态（用于清理卡住的任务）
 */
export const resetBatchStatus = async (req: Request, res: Response) => {
  try {
    ozonTypeService.forceResetBatchStatus();
    return res.json({
      success: true,
      message: '已强制重置批量提取状态',
    });
  } catch (error: any) {
    logger.error('重置状态失败:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '重置失败',
    });
  }
};

/**
 * 提取商品类型（单个，兼容旧接口）
 */
export const extractProductType = async (req: Request, res: Response) => {
  try {
    const { productUrl } = req.body;

    if (!productUrl) {
      return res.status(400).json({
        success: false,
        message: '商品链接不能为空',
      });
    }

    const result = await ozonTypeService.extractProductType(productUrl, req.user!.id);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error('提取商品类型失败:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '提取商品类型失败',
    });
  }
};

/**
 * 批量提取商品类型（异步，立即返回）
 */
export const batchExtractTypes = async (req: Request, res: Response) => {
  try {
    const { urls, titles } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'urls 不能为空，需传入商品链接数组',
      });
    }

    const result = await ozonTypeService.batchExtractTypes(urls, titles || {}, req.user!.id);

    return res.json({
      success: true,
      ...result,
      message: result.message || `已开始后台批量提取 ${result.total} 个商品的类型`,
    });
  } catch (error: any) {
    logger.error('批量提取失败:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '批量提取失败',
    });
  }
};

/**
 * 查询批量提取进度
 */
export const getBatchStatus = async (req: Request, res: Response) => {
  try {
    const status = await ozonTypeService.getBatchExtractStatus();
    return res.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    logger.error('查询进度失败:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '查询失败',
    });
  }
};
