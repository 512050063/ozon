import prisma from '../config/database';
import logger from '../config/logger';
import { translateText } from './translationService';

// 已知 Ozon 错误码中文映射表（持续补充）
const KNOWN_ERROR_CODES: Record<string, string> = {
  // 商品属性相关
  'ERR_ATTRIBUTE_REQUIRED': '缺少必填属性',
  'ERR_ATTRIBUTE_INVALID': '属性值无效',
  'ERR_ATTRIBUTE_VALUE_NOT_ALLOWED': '属性值不被允许',
  'ERR_ATTRIBUTE_MAX_LENGTH': '属性值超出最大长度',
  'ERR_ATTRIBUTE_MIN_LENGTH': '属性值小于最小长度',
  'ERR_ATTRIBUTE_TYPE_MISMATCH': '属性类型不匹配',
  'ERR_ATTRIBUTE_PATTERN': '属性值格式不正确',
  'error_attribute_values_out_of_range': '属性值不是最新值，请重新选择属性值',
  'BR_hashtags_symbols_validation': '标签只能包含字母、数字、井号和下划线，请用空格分隔多个标签',
  
  // 图片相关
  'ERR_IMAGE_REQUIRED': '缺少商品图片',
  'ERR_IMAGE_INVALID': '图片无效',
  'ERR_IMAGE_SIZE': '图片尺寸不符合要求',
  'ERR_IMAGE_COUNT': '图片数量不符合要求',
  'ERR_IMAGE_URL': '图片链接无效',
  'ERR_IMAGE_BACKGROUND': '图片背景不符合要求',
  
  // 价格相关
  'ERR_PRICE_INVALID': '价格设置无效',
  'ERR_PRICE_MIN': '价格低于最低限制',
  'ERR_PRICE_MAX': '价格超过最高限制',
  'ERR_PRICE_CURRENCY': '货币代码无效',
  
  // 商品名称/描述相关
  'ERR_NAME_REQUIRED': '缺少商品名称',
  'ERR_NAME_TOO_LONG': '商品名称过长',
  'ERR_NAME_INVALID_CHARS': '商品名称包含无效字符',
  'ERR_NAME_BRAND_VIOLATION': '商品名称包含品牌违规内容',
  'ERR_DESCRIPTION_REQUIRED': '缺少商品描述',
  'ERR_DESCRIPTION_TOO_LONG': '商品描述过长',
  'ERR_DESCRIPTION_INVALID': '商品描述无效',
  
  // 类目相关
  'ERR_CATEGORY_REQUIRED': '类目未设置',
  'ERR_CATEGORY_INVALID': '类目无效',
  'ERR_CATEGORY_NOT_ALLOWED': '该类目不接受商品',
  
  // 商品类型/变体
  'ERR_TYPE_REQUIRED': '商品类型未设置',
  'ERR_TYPE_INVALID': '商品类型无效',
  'ERR_VARIANT_INVALID': '商品变体设置无效',
  
  // SKU / Offer ID
  'ERR_SKU_REQUIRED': '缺少 SKU',
  'ERR_SKU_DUPLICATE': 'SKU 重复',
  'ERR_OFFER_ID_DUPLICATE': 'Offer ID 重复',
  
  // 品牌/型号
  'ERR_BRAND_REQUIRED': '缺少品牌信息',
  'ERR_BRAND_INVALID': '品牌信息无效',
  'ERR_MODEL_REQUIRED': '缺少型号信息',
  
  // 包材/物流
  'ERR_PACKAGE_DIMENSIONS': '包裹尺寸信息不完整',
  'ERR_WEIGHT_REQUIRED': '缺少重量信息',
  'ERR_WEIGHT_INVALID': '重量信息无效',
  
  // 商品状态
  'ERR_PRODUCT_BLOCKED': '商品已被平台封禁',
  'ERR_PRODUCT_ARCHIVED': '商品已归档',
  'ERR_PRODUCT_DUPLICATE': '商品重复',
  'SPU_ALREADY_EXISTS_IN_ANOTHER_ACCOUNT': '该商品 SPU 已存在于另一个账号',
  'ERR_VIOLATION': '违反平台规则',
  'ERR_COPY_PROHIBITION': '违反复制禁令',

  // Ozon 状态提示
  'STATUS_NAME:Продается': '在售',
  'STATUS_NAME:Готов к продаже': '准备出售',
  'STATUS_NAME:Не продается': '不出售',
  'STATUS_DESCRIPTION:Не обновлен': '未更新',
  'STATUS_DESCRIPTION:Не создан': '未创建',
  'STATUS_DESCRIPTION:Не прошел валидацию': '未通过验证',
  'STATUS_DESCRIPTION:Нет на складе': '没有库存',
  'STATUS_TOOLTIP:Нет на складе': '没有库存',
  'STATUS_TOOLTIP:Можно создать новую поставку или указать количество на своем складе': '可以创建新的供货，或填写自己仓库中的库存数量',
  'STATUS_TOOLTIP:Нет на складе Можно создать новую поставку или указать количество на своем складе': '没有库存。可以创建新的供货，或填写自己仓库中的库存数量',
  'Не удалось обновить товар — покупатели видят его без изменений. Опубликуйте карточку заново: нажмите на три точки → Редактировать товар → Отправить': '未能更新商品，买家仍看到未变更的版本。请重新发布商品：点击三个点 → 编辑商品 → 发送',
  'STATUS_DESCRIPTION:Убран из продажи': '已从销售中移除',
  'STATUS_DESCRIPTION:Убран из продажи по причине нарушения правил': '因违反规则已从销售中移除',
  'STATUS_DESCRIPTION:Товар отклонен модератором': '商品已被审核员拒绝',
  'STATUS_DESCRIPTION:Товар заблокирован': '商品已被封禁',
  'STATUS_DESCRIPTION:Товар архивирован': '商品已归档',
  'STATUS_FAILED:declined': '被平台拒绝',
  'STATUS_FAILED:rejected': '审核未通过',
  'STATUS_FAILED:violation_copy_prohibition': '违反复制禁令',
  'STATUS_FAILED:violation': '违反平台规则',
  'STATUS_FAILED:blocked': '已被封禁',
  'STATUS_FAILED:out_of_stock': '缺货',
  'STATUS_FAILED:not_for_sale': '不出售',
  'STATUS_FAILED:imported': '未通过验证',
  'STATUS_FAILED:moderated': '待重新发布',
  
  // 通用
  'ERR_INTERNAL': 'Ozon 平台内部错误',
  'ERR_VALIDATION': '数据验证失败',
  'ERR_UNKNOWN': '未知错误',
};

const truncateErrorText = (value: string | undefined | null, maxLength = 191): string => {
  if (!value) return '';
  return value.length > maxLength ? value.slice(0, maxLength) : value;
};

type CachedOzonErrorTranslation = {
  code?: string | null;
  messageRu?: string | null;
  messageZh?: string | null;
};

type OzonTranslationRequestItem = {
  code?: string;
  message?: string;
  level?: string;
};

const normalizeTranslationKey = (value: string | undefined | null): string => {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
};

const isChineseText = (value: string | undefined | null): boolean => /[\u4e00-\u9fff]/.test(String(value || ''));

const translateKnownValidationMessage = (message: string | undefined | null): string => {
  const text = String(message || '').trim();
  if (!text) return '';
  const outOfRangeMatch = text.match(/^'([^']+)'\s+is\s+out\s+of\s+range\s+\(min:\s*([^,]+),\s*max:\s*([^)]+)\)$/i);
  if (outOfRangeMatch) {
    const attributeMap: Record<string, string> = {
      density: '密度',
    };
    const attributeName = attributeMap[outOfRangeMatch[1]] || outOfRangeMatch[1];
    return `${attributeName} 超出允许范围，最小值 ${outOfRangeMatch[2]}，最大值 ${outOfRangeMatch[3]}`;
  }
  return '';
};

/**
 * 翻译 Ozon 错误码为中文
 */
export function translateErrorCode(code: string, russianMessage?: string): string {
  // 优先使用已知映射
  if (KNOWN_ERROR_CODES[code]) {
    return KNOWN_ERROR_CODES[code];
  }
  const normalizedCode = normalizeTranslationKey(code);
  const normalizedKnownCode = Object.keys(KNOWN_ERROR_CODES).find(key => normalizeTranslationKey(key) === normalizedCode);
  if (normalizedKnownCode) {
    return KNOWN_ERROR_CODES[normalizedKnownCode];
  }
  
  // 检查前缀匹配
  const prefix = code?.split('_').slice(0, 2).join('_');
  if (prefix && KNOWN_ERROR_CODES[prefix]) {
    return KNOWN_ERROR_CODES[prefix];
  }

  const patternTranslation = translateKnownValidationMessage(russianMessage);
  if (patternTranslation) return patternTranslation;
  
  // 使用俄语原文或错误码本身
  return russianMessage || code || '未知错误';
}

export function resolveOzonErrorTranslation(
  code: string,
  russianMessage?: string,
  cachedTranslations: CachedOzonErrorTranslation[] = []
): string {
  const normalizedCode = normalizeTranslationKey(code);
  const normalizedMessage = normalizeTranslationKey(russianMessage);

  if (normalizedCode) {
    const byCode = cachedTranslations.find(item =>
      normalizeTranslationKey(item.code) === normalizedCode && item.messageZh
    );
    if (byCode?.messageZh) return byCode.messageZh;
  }

  if (normalizedMessage) {
    const byMessage = cachedTranslations.find(item =>
      normalizeTranslationKey(item.messageRu) === normalizedMessage && item.messageZh
    );
    if (byMessage?.messageZh) return byMessage.messageZh;
  }

  return translateErrorCode(code, russianMessage);
}

export function buildOzonTranslationItems(items: OzonTranslationRequestItem[]): Required<OzonTranslationRequestItem>[] {
  const result = new Map<string, Required<OzonTranslationRequestItem>>();

  for (const item of items) {
    const message = String(item.message || '').trim();
    const inputCode = String(item.code || '').trim();
    if (!inputCode && !message) continue;

    const code = inputCode || `TEXT:${message}`;
    const normalizedCode = normalizeTranslationKey(code);
    if (!normalizedCode || result.has(normalizedCode)) continue;

    result.set(normalizedCode, {
      code,
      message,
      level: String(item.level || 'STATUS_INFO'),
    });
  }

  return Array.from(result.values());
}

export async function translateAndStoreOzonMessages(items: OzonTranslationRequestItem[], userId?: number): Promise<any[]> {
  const translationItems = buildOzonTranslationItems(items);
  if (translationItems.length === 0) return [];

  const existing = await prisma.ozonErrorCode.findMany({
    where: {
      code: { in: translationItems.map(item => truncateErrorText(item.code)) },
    },
  });
  const existingByCode = new Map(existing.map(item => [item.code, item]));
  const responseItems: any[] = [];

  for (const item of translationItems) {
    const code = truncateErrorText(item.code);
    const messageRu = truncateErrorText(item.message);
    const existingTranslation = existingByCode.get(code);
    let messageZh = existingTranslation?.messageZh || resolveOzonErrorTranslation(code, messageRu, existing);

    if (!messageZh || !isChineseText(messageZh) || messageZh === messageRu || messageZh === code) {
      messageZh = await translateText(messageRu || code.replace(/^TEXT:/, ''), 'ru', 'zh', userId);
    }

    if (!isChineseText(messageZh)) {
      messageZh = '';
    }

    const saved = await upsertOzonErrorTranslation({
      code,
      messageRu,
      messageZh,
      level: item.level,
    });

    responseItems.push({
      id: saved.id,
      code: saved.code,
      messageRu: saved.messageRu,
      messageZh: saved.messageZh,
      level: saved.level,
    });
  }

  return responseItems;
}

/**
 * 从产品数据中提取并存储错误码
 */
export async function extractAndStoreErrorCodes(products: any[]): Promise<void> {
  try {
    const errorCodes = new Map<string, { code: string; messageRu: string; level: string }>();
    
    for (const product of products) {
      const errors = product.errors || [];
      if (!Array.isArray(errors)) continue;
      
      for (const error of errors) {
        const code = error.code || error.texts?.code;
        if (!code) continue;
        
        const messageRu = error.message || error.texts?.message || '';
        const level = error.level || error.texts?.level || 'ERROR_LEVEL_ERROR';
        
        if (!errorCodes.has(code)) {
          errorCodes.set(code, { code, messageRu, level });
        }
      }

      const statuses = product.statuses ? (Array.isArray(product.statuses) ? product.statuses : [product.statuses]) : [];
      for (const status of statuses) {
        const statusFields = [
          { prefix: 'STATUS_NAME', value: status?.status_name, level: 'STATUS_INFO' },
          { prefix: 'STATUS_DESCRIPTION', value: status?.status_description, level: 'STATUS_INFO' },
          { prefix: 'STATUS_TOOLTIP', value: status?.status_tooltip, level: 'STATUS_INFO' },
          { prefix: 'STATUS_FAILED', value: status?.status_failed, level: 'STATUS_WARNING' },
        ];

        for (const field of statusFields) {
          const value = String(field.value || '').trim();
          if (!value || value === 'none') continue;
          const code = `${field.prefix}:${value}`;
          if (!errorCodes.has(code)) {
            errorCodes.set(code, {
              code,
              messageRu: value,
              level: field.level,
            });
          }
        }
      }
    }
    
    const cachedTranslations = errorCodes.size > 0
      ? await prisma.ozonErrorCode.findMany({
          where: {
            code: { in: Array.from(errorCodes.keys()) },
          },
          select: {
            code: true,
            messageRu: true,
            messageZh: true,
          },
        })
      : [];

    // 批量 upsert 错误码
    for (const [, errorInfo] of errorCodes) {
      const messageRu = truncateErrorText(errorInfo.messageRu);
      const messageZh = truncateErrorText(resolveOzonErrorTranslation(errorInfo.code, errorInfo.messageRu, cachedTranslations));
      
      await prisma.ozonErrorCode.upsert({
        where: { code: errorInfo.code },
        update: {
          messageRu,
          messageZh,
          level: errorInfo.level,
        },
        create: {
          code: errorInfo.code,
          messageRu,
          messageZh,
          level: errorInfo.level,
        },
      });
    }
    
    if (errorCodes.size > 0) {
      logger.info(`[ErrorCode] 同步了 ${errorCodes.size} 个错误码`);
    }
  } catch (error: any) {
    logger.warn(`[ErrorCode] 提取错误码失败: ${error.message}`);
    // 不中断同步流程
  }
}

/**
 * 获取所有错误码映射
 */
export async function getErrorCodes(): Promise<any[]> {
  const codes = await prisma.ozonErrorCode.findMany({
    orderBy: { code: 'asc' },
  });
  
  return codes.map(c => ({
    id: c.id,
    code: c.code,
    messageRu: c.messageRu,
    messageZh: c.messageZh,
    level: c.level,
  }));
}

export async function upsertOzonErrorTranslation(input: {
  code: string;
  messageRu?: string;
  messageZh?: string;
  level?: string;
}): Promise<any> {
  const code = truncateErrorText(input.code || input.messageRu || 'ERR_UNKNOWN');
  const messageRu = truncateErrorText(input.messageRu || '');
  const resolvedMessageZh = input.messageZh ?? resolveOzonErrorTranslation(code, messageRu);
  const messageZh = truncateErrorText(isChineseText(resolvedMessageZh) ? resolvedMessageZh : '');
  const level = truncateErrorText(input.level || 'ERROR_LEVEL_ERROR', 64);

  return prisma.ozonErrorCode.upsert({
    where: { code },
    update: {
      messageRu,
      messageZh,
      level,
    },
    create: {
      code,
      messageRu,
      messageZh,
      level,
    },
  });
}

/**
 * 根据产品原始数据获取中文错误列表
 */
export function getProductChineseErrors(product: any): Array<{ code: string; message: string; level: string }> {
  const errors = product?.errors || [];
  if (!Array.isArray(errors)) return [];
  
  return errors
    .filter((e: any) => (e.level || e.texts?.level) === 'ERROR_LEVEL_ERROR')
    .map((e: any) => {
      const code = e.code || e.texts?.code || '';
      return {
        code,
        message: translateErrorCode(code, e.message || e.texts?.message || ''),
        level: e.level || e.texts?.level || '',
      };
    });
}

/**
 * 根据产品原始数据获取中文警告列表
 */
export function getProductChineseWarnings(product: any): Array<{ code: string; message: string; level: string }> {
  const errors = product?.errors || [];
  if (!Array.isArray(errors)) return [];
  
  return errors
    .filter((e: any) => (e.level || e.texts?.level) === 'ERROR_LEVEL_WARNING')
    .map((e: any) => {
      const code = e.code || e.texts?.code || '';
      return {
        code,
        message: translateErrorCode(code, e.message || e.texts?.message || ''),
        level: e.level || e.texts?.level || '',
      };
    });
}
