import { Request, Response } from 'express';
import logger from '../config/logger';
import {
  deleteSupplySource,
  importSupplySourceFromUrl,
  listSupplySources,
  previewSupplySourceFromUrl,
  updateSupplySource,
  upsertSupplySource,
} from '../services/supplySourceService';

function getUserId(req: Request): number {
  return (req as any).user.id;
}

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('货源ID无效');
  }
  return id;
}

export const getSupplySourceItems = async (req: Request, res: Response) => {
  try {
    const result = await listSupplySources(getUserId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.error('查询货源管理列表失败:', error);
    res.status(500).json({ success: false, message: error.message || '查询货源失败' });
  }
};

export const previewSupplySourceUrl = async (req: Request, res: Response) => {
  try {
    const source = await previewSupplySourceFromUrl(getUserId(req), String(req.body?.url || '').trim());
    res.json({ success: true, data: source, message: '1688货源解析成功' });
  } catch (error: any) {
    logger.error('货源管理解析1688链接失败:', error);
    res.status(400).json({ success: false, message: error.message || '解析货源失败' });
  }
};

export const importSupplySourceUrl = async (req: Request, res: Response) => {
  try {
    const source = await importSupplySourceFromUrl(
      getUserId(req),
      String(req.body?.url || '').trim(),
      req.body?.source || {},
    );
    res.status(201).json({ success: true, data: source, message: '货源已保存' });
  } catch (error: any) {
    logger.error('货源管理导入1688链接失败:', error);
    res.status(400).json({ success: false, message: error.message || '保存货源失败' });
  }
};

export const createSupplySourceItem = async (req: Request, res: Response) => {
  try {
    const source = await upsertSupplySource(getUserId(req), req.body?.source || req.body, req.body?.subject || '');
    res.status(201).json({ success: true, data: source, message: '货源已保存' });
  } catch (error: any) {
    logger.error('货源管理保存货源失败:', error);
    res.status(400).json({ success: false, message: error.message || '保存货源失败' });
  }
};

export const updateSupplySourceItem = async (req: Request, res: Response) => {
  try {
    const source = await updateSupplySource(getUserId(req), parseId(req.params.id), req.body?.source || req.body);
    res.json({ success: true, data: source, message: '货源已更新' });
  } catch (error: any) {
    logger.error('货源管理更新货源失败:', error);
    res.status(error.message === '货源不存在' ? 404 : 400).json({
      success: false,
      message: error.message || '更新货源失败',
    });
  }
};

export const deleteSupplySourceItem = async (req: Request, res: Response) => {
  try {
    await deleteSupplySource(getUserId(req), parseId(req.params.id));
    res.json({ success: true, message: '货源已删除' });
  } catch (error: any) {
    logger.error('货源管理删除货源失败:', error);
    const statusCode = error.message === '货源不存在'
      ? 404
      : error.message === '货源已绑定商品，不能删除'
        ? 409
        : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || '删除货源失败',
    });
  }
};
