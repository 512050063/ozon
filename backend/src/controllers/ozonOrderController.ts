import { Request, Response } from 'express';
import logger from '../config/logger';
import * as ozonOrderService from '../services/ozonOrderService';

const parseStoreId = (value: string) => {
  const storeId = Number(value);
  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw new Error('无效的店铺ID');
  }
  return storeId;
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const data = await ozonOrderService.getOrders(storeId, {
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      since: typeof req.query.since === 'string' ? req.query.since : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
      keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });

    res.json({
      success: true,
      message: '获取Ozon订单成功',
      data,
    });
  } catch (error: any) {
    logger.error('获取Ozon订单失败:', error);
    res.status(error.message === 'Ozon店铺不存在' ? 404 : 500).json({
      success: false,
      message: error.message || '获取Ozon订单失败',
    });
  }
};

export const getOrderDetail = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const { postingNumber } = req.params;

    if (!postingNumber) {
      return res.status(400).json({
        success: false,
        message: '订单号不能为空',
      });
    }

    const data = await ozonOrderService.getOrderDetail(storeId, postingNumber);

    res.json({
      success: true,
      message: '获取Ozon订单详情成功',
      data,
    });
  } catch (error: any) {
    logger.error('获取Ozon订单详情失败:', error);
    res.status(error.message === '订单不存在' ? 404 : error.message === 'Ozon店铺不存在' ? 404 : 500).json({
      success: false,
      message: error.message || '获取Ozon订单详情失败',
    });
  }
};

export const getCancelReasons = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const { postingNumber } = req.params;

    if (!postingNumber) {
      return res.status(400).json({
        success: false,
        message: '订单号不能为空',
      });
    }

    const data = await ozonOrderService.getCancelReasons(storeId, postingNumber);

    res.json({
      success: true,
      message: '获取取消原因成功',
      data,
    });
  } catch (error: any) {
    logger.error('获取Ozon订单取消原因失败:', error);
    res.status(error.message === 'Ozon店铺不存在' ? 404 : 500).json({
      success: false,
      message: error.message || '获取取消原因失败',
    });
  }
};

export const preparePosting = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const { postingNumber } = req.params;

    if (!postingNumber) {
      return res.status(400).json({
        success: false,
        message: '订单号不能为空',
      });
    }

    const data = await ozonOrderService.preparePosting(storeId, postingNumber);

    res.json({
      success: true,
      message: '备货提交成功，订单状态已同步',
      data,
    });
  } catch (error: any) {
    logger.error('Ozon订单备货失败:', error);
    res.status(error.message === 'Ozon店铺不存在' ? 404 : 500).json({
      success: false,
      message: error.message || '备货提交失败',
    });
  }
};

export const cancelPosting = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const { postingNumber } = req.params;
    const cancelReasonId = Number(req.body?.cancelReasonId ?? req.body?.cancel_reason_id);
    const cancelReasonMessage = typeof req.body?.cancelReasonMessage === 'string'
      ? req.body.cancelReasonMessage
      : typeof req.body?.cancel_reason_message === 'string'
        ? req.body.cancel_reason_message
        : undefined;

    if (!postingNumber) {
      return res.status(400).json({
        success: false,
        message: '订单号不能为空',
      });
    }

    const data = await ozonOrderService.cancelPosting(storeId, postingNumber, cancelReasonId, cancelReasonMessage);

    res.json({
      success: true,
      message: '取消货件提交成功，订单状态已同步',
      data,
    });
  } catch (error: any) {
    logger.error('取消Ozon货件失败:', error);
    res.status(error.message === 'Ozon店铺不存在' ? 404 : 500).json({
      success: false,
      message: error.message || '取消货件失败',
    });
  }
};

export const syncOrders = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const userId = (req as any).user?.id;
    const data = await ozonOrderService.syncOrdersToDatabase(storeId, userId);

    res.json({
      success: true,
      message: `订单同步成功，新增 ${data.syncedCount} 个订单，更新 ${data.updatedCount} 个订单`,
      data,
    });
  } catch (error: any) {
    logger.error('同步Ozon订单失败:', error);
    res.status(error.message === 'Ozon店铺不存在' ? 404 : 500).json({
      success: false,
      message: error.message || '同步Ozon订单失败',
    });
  }
};

export const getOrderSyncLogs = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10;
    const data = await ozonOrderService.getOrderSyncLogs(storeId, page, pageSize);

    res.json({
      success: true,
      message: '获取订单同步日志成功',
      data,
    });
  } catch (error: any) {
    logger.error('获取订单同步日志失败:', error);
    res.status(error.message === 'Ozon店铺不存在' ? 404 : 500).json({
      success: false,
      message: error.message || '获取订单同步日志失败',
    });
  }
};
