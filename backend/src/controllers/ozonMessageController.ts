import { Request, Response } from 'express';
import logger from '../config/logger';
import * as ozonMessageService from '../services/ozonMessageService';

const parseStoreId = (value: string) => {
  const storeId = Number(value);
  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw new Error('无效的店铺ID');
  }
  return storeId;
};

export const getConversations = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const data = await ozonMessageService.getConversations(storeId, {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
      unreadOnly: req.query.unreadOnly === 'true',
      channel: typeof req.query.channel === 'string' ? req.query.channel : undefined,
    });

    res.json({
      success: true,
      message: '获取Ozon消息列表成功',
      data,
    });
  } catch (error: any) {
    logger.error('获取Ozon消息列表失败:', error);
    res.status(error.message === 'Ozon店铺不存在' ? 404 : 500).json({
      success: false,
      message: error.message || '获取Ozon消息列表失败',
    });
  }
};

export const getConversationMessages = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: '会话ID不能为空',
      });
    }

    const data = await ozonMessageService.getConversationMessages(storeId, conversationId, {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    res.json({
      success: true,
      message: '获取Ozon会话详情成功',
      data,
    });
  } catch (error: any) {
    logger.error('获取Ozon会话详情失败:', error);
    res.status(error.message === 'Ozon店铺不存在' ? 404 : 500).json({
      success: false,
      message: error.message || '获取Ozon会话详情失败',
    });
  }
};

export const sendReply = async (req: Request, res: Response) => {
  try {
    const storeId = parseStoreId(req.params.storeId);
    const { conversationId } = req.params;
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: '会话ID不能为空',
      });
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        message: '回复内容不能为空',
      });
    }

    await ozonMessageService.sendReply(storeId, conversationId, text);

    res.json({
      success: true,
      message: '回复发送成功',
    });
  } catch (error: any) {
    logger.error('发送Ozon回复失败:', error);
    res.status(error.message === 'Ozon店铺不存在' ? 404 : 500).json({
      success: false,
      message: error.message || '发送Ozon回复失败',
    });
  }
};
