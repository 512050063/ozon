import { Request, Response } from 'express';
import logger from '../config/logger';
import * as ozonPromotionService from '../services/ozonPromotionService';

const parseStoreId = (value: string) => {
  const storeId = Number(value);
  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw new Error('无效的店铺ID');
  }
  return storeId;
};

const parseActionId = (value: string) => {
  const actionId = Number(value);
  if (!Number.isInteger(actionId) || actionId <= 0) {
    throw new Error('无效的活动ID');
  }
  return actionId;
};

const parseProductId = (value: string) => {
  const productId = Number(value);
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new Error('无效的商品ID');
  }
  return productId;
};

const parsePaging = (req: Request) => ({
  limit: req.query.limit ? Number(req.query.limit) : undefined,
  offset: req.query.offset ? Number(req.query.offset) : undefined,
});

const sendError = (res: Response, error: any, fallback: string) => {
  const message = error.message || fallback;
  res.status(message.includes('不存在') ? 404 : message.includes('无效') ? 400 : 500).json({
    success: false,
    message,
  });
};

export const getPromotions = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const shouldRecordLog = req.query.sync === 'true' || req.query.sync === '1';
    const data = await ozonPromotionService.getPromotions(storeId, {
      recordLog: shouldRecordLog,
      userId: req.user?.id || null,
    });
    res.json({ success: true, message: '获取促销活动成功', data });
  } catch (error: any) {
    logger.error('获取Ozon促销活动失败:', error);
    sendError(res, error, '获取促销活动失败');
  }
};

export const getPromotionSyncLogs = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10;
    const data = await ozonPromotionService.getPromotionSyncLogs(storeId, page, pageSize);
    res.json({ success: true, message: '获取活动更新日志成功', data });
  } catch (error: any) {
    logger.error('获取Ozon活动更新日志失败:', error);
    sendError(res, error, '获取活动更新日志失败');
  }
};

export const getPromotionProducts = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const actionId = parseActionId(req.params.actionId);
    const { limit, offset } = parsePaging(req);
    const data = await ozonPromotionService.getPromotionProducts(storeId, actionId, limit, offset);
    res.json({ success: true, message: '获取活动商品成功', data });
  } catch (error: any) {
    logger.error('获取Ozon活动商品失败:', error);
    sendError(res, error, '获取活动商品失败');
  }
};

export const getPromotionCandidates = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const actionId = parseActionId(req.params.actionId);
    const { limit, offset } = parsePaging(req);
    const data = await ozonPromotionService.getPromotionCandidates(storeId, actionId, limit, offset);
    res.json({ success: true, message: '获取可添加商品成功', data });
  } catch (error: any) {
    logger.error('获取Ozon活动候选商品失败:', error);
    sendError(res, error, '获取可添加商品失败');
  }
};

export const activatePromotionProduct = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const actionId = parseActionId(req.params.actionId);
    const data = await ozonPromotionService.activatePromotionProduct(storeId, actionId, {
      productId: Number(req.body?.productId ?? req.body?.product_id),
      actionPrice: Number(req.body?.actionPrice ?? req.body?.action_price),
      stock: req.body?.stock === undefined ? undefined : Number(req.body.stock),
    });
    res.json({
      success: data.success,
      message: data.message || (data.success ? '商品已加入活动' : '商品加入活动失败'),
      data,
    });
  } catch (error: any) {
    logger.error('Ozon活动添加商品失败:', error);
    sendError(res, error, '商品加入活动失败');
  }
};

export const deactivatePromotionProduct = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const actionId = parseActionId(req.params.actionId);
    const productId = parseProductId(req.params.productId);
    const data = await ozonPromotionService.deactivatePromotionProduct(storeId, actionId, productId);
    res.json({
      success: data.success,
      message: data.message || (data.success ? '商品已移出活动' : '商品移出活动失败'),
      data,
    });
  } catch (error: any) {
    logger.error('Ozon活动移出商品失败:', error);
    sendError(res, error, '商品移出活动失败');
  }
};
