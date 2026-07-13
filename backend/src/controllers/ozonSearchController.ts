import { Request, Response } from 'express';
import { searchOzonProducts } from '../services/ozonSearchService';
import { resolveOzonProductLinkWithDefaultDependencies } from '../services/ozonProductLinkService';
import { createBrowserTask, hasActiveWorkerForUser } from '../services/ozonBrowserTaskService';
import logger from '../config/logger';

const shouldUseLocalWorker = () => process.env.OZON_BROWSER_WORKER_MODE === 'required';
const LOCAL_WORKER_OFFLINE_RESPONSE = {
  success: false,
  code: 'LOCAL_WORKER_OFFLINE',
  message: '本机采集器未在线，请先到 API 配置中更新令牌并启动采集器',
};

export async function searchProducts(req: Request, res: Response) {
  try {
    const { keyword, category } = req.query;
    
    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供搜索关键词'
      });
    }

    if (shouldUseLocalWorker()) {
      const hasActiveWorker = await hasActiveWorkerForUser(req.user!.id);
      if (!hasActiveWorker) {
        return res.status(409).json(LOCAL_WORKER_OFFLINE_RESPONSE);
      }

      const task = await createBrowserTask(req.user!.id, {
        type: 'preference_search',
        payload: {
          keyword,
          category: typeof category === 'string' ? category : '',
        },
        priority: 10,
      });
      return res.json({
        success: false,
        data: [],
        code: 'LOCAL_WORKER_TASK_CREATED',
        taskId: task.id,
        message: '已创建本机采集任务，请保持本机采集器在线',
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

    if (shouldUseLocalWorker()) {
      const hasActiveWorker = await hasActiveWorkerForUser(req.user!.id);
      if (!hasActiveWorker) {
        return res.status(409).json(LOCAL_WORKER_OFFLINE_RESPONSE);
      }

      const task = await createBrowserTask(req.user!.id, {
        type: 'product_by_url',
        payload: { productUrl },
        priority: 20,
      });
      return res.json({
        success: false,
        code: 'LOCAL_WORKER_TASK_CREATED',
        taskId: task.id,
        message: '已创建本机采集任务，请保持本机采集器在线',
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
