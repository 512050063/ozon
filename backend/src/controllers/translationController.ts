import { Request, Response } from 'express';
import logger from '../config/logger';
import { resolveProductNameTranslations } from '../services/translationService';

export async function resolveProductNameTranslationsController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未登录',
      });
    }

    const texts = Array.isArray(req.body?.texts) ? req.body.texts : [];
    const sourceLang = typeof req.body?.sourceLang === 'string' ? req.body.sourceLang : 'ru';
    const targetLang = typeof req.body?.targetLang === 'string' ? req.body.targetLang : 'zh';

    const result = await resolveProductNameTranslations(
      texts.map((text: unknown) => String(text || '')),
      userId,
      {
        sourceLang,
        targetLang,
      }
    );

    return res.json({
      success: true,
      message: '商品名称翻译解析完成',
      data: result,
    });
  } catch (error: any) {
    logger.error('商品名称翻译解析失败:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '商品名称翻译解析失败',
    });
  }
}
