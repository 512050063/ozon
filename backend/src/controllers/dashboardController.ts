import { Request, Response } from 'express';
import logger from '../config/logger';
import { getDashboardSummary } from '../services/dashboardService';

export const getDashboardSummaryHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    const summary = await getDashboardSummary(userId);
    res.json({
      success: true,
      message: '获取首页数据成功',
      data: summary,
    });
  } catch (error: any) {
    logger.error('获取首页数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '服务器错误',
    });
  }
};
