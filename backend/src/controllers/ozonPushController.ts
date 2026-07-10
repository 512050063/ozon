import crypto from 'crypto';
import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

function normalizePayloadItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.result)) return payload.result;
  return [payload];
}

function pickString(...values: any[]) {
  const value = values.find(item => typeof item === 'string' && item.trim());
  return value ? value.trim() : null;
}

function getEventType(payload: any) {
  return pickString(
    payload?.notification_type,
    payload?.notificationType,
    payload?.event_type,
    payload?.eventType,
    payload?.type,
    payload?.message_type,
    payload?.messageType
  );
}

function getObjectId(payload: any) {
  return pickString(
    payload?.object_id,
    payload?.objectId,
    payload?.posting_number,
    payload?.postingNumber,
    payload?.chat_id,
    payload?.chatId,
    payload?.message_id,
    payload?.messageId,
    payload?.sku,
    payload?.product_id,
    payload?.productId
  );
}

function getEventKey(payload: any) {
  const explicitKey = pickString(
    payload?.event_id,
    payload?.eventId,
    payload?.notification_id,
    payload?.notificationId,
    payload?.message_id,
    payload?.messageId,
    payload?.id
  );
  if (explicitKey) return explicitKey;

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

function getSourceIp(req: Request) {
  return pickString(
    req.headers['x-forwarded-for']?.toString().split(',')[0],
    req.headers['x-real-ip']?.toString(),
    req.ip,
    req.socket.remoteAddress
  );
}

export const receiveOzonPush = async (req: Request, res: Response) => {
  const storeId = Number(req.params.storeId);
  const { secret } = req.params;

  if (!Number.isInteger(storeId) || storeId <= 0 || !secret) {
    return res.status(400).json({
      success: false,
      message: '无效的推送地址',
    });
  }

  try {
    const store = await prisma.ozonStore.findFirst({
      where: {
        id: storeId,
        pushSecret: secret,
        pushEnabled: true,
      },
      select: {
        id: true,
      },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: '推送地址无效或已停用',
      });
    }

    const payloadItems = normalizePayloadItems(req.body);
    const sourceIp = getSourceIp(req);
    const headers = {
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'content-type': req.headers['content-type'],
    };

    for (const payload of payloadItems) {
      const eventKey = getEventKey(payload);
      await prisma.ozonPushEvent.upsert({
        where: {
          ozonStoreId_eventKey: {
            ozonStoreId: store.id,
            eventKey,
          },
        },
        create: {
          ozonStoreId: store.id,
          eventKey,
          eventType: getEventType(payload),
          objectId: getObjectId(payload),
          payload,
          headers,
          sourceIp,
          status: 'received',
        },
        update: {
          payload,
          headers,
          sourceIp,
          eventType: getEventType(payload),
          objectId: getObjectId(payload),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'received',
    });
  } catch (error: any) {
    logger.error('接收 Ozon 推送失败:', error);
    return res.status(500).json({
      success: false,
      message: '接收推送失败',
    });
  }
};
