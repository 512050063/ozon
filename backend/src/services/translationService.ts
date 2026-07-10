import axios from 'axios';
import prisma from '../config/database';
import logger from '../config/logger';
import crypto from 'crypto';

// 翻译API配置
const BAIDU_TRANSLATE_API = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
const BAIDU_APP_ID = process.env.BAIDU_APP_ID || '';
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY || '';

type TranslationProviderConfig = {
  provider: 'tencent' | 'baidu';
  url?: string;
  appId?: string;
  secretId?: string;
  secretKey?: string;
};

export type ProductNameTranslationStatus = 'cached' | 'translated' | 'skipped' | 'quota_exceeded' | 'failed';

export interface ProductNameTranslationItem {
  sourceText: string;
  translatedText: string;
  status: ProductNameTranslationStatus;
  error?: string;
}

export interface ProductNameTranslationResult {
  items: ProductNameTranslationItem[];
  sourceLang: string;
  targetLang: string;
  translationConfigured: boolean;
  quotaExceeded: boolean;
  monthlyLimitChars: number;
  monthlyUsedChars: number;
  requestedChars: number;
}

export interface ResolveProductNameTranslationsCoreOptions {
  texts: string[];
  sourceLang: string;
  targetLang: string;
  now: Date;
  monthlyLimitChars: number;
  getCachedTranslations: (texts: string[]) => Promise<Map<string, string>>;
  providerAvailable: () => Promise<boolean>;
  getMonthlyUsage: () => Promise<number>;
  addMonthlyUsage: (chars: number) => Promise<void>;
  translateMissingTexts: (texts: string[]) => Promise<Map<string, string>>;
  saveCachedTranslations: (items: Array<{ originalText: string; translatedText: string }>) => Promise<void>;
}

const PRODUCT_NAME_CACHE_EXPIRES_AT = new Date('2099-12-31T23:59:59.000Z');
const DEFAULT_TRANSLATION_MONTHLY_LIMIT_CHARS = 5_000_000;

// 支持的语言
const LANGUAGES = {
  'ru': '俄语',
  'en': '英语',
  'zh': '中文',
  'es': '西班牙语',
  'fr': '法语',
  'de': '德语',
};

export function normalizeTranslationText(text: string): string {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function createTranslationCacheHash(text: string): string {
  return crypto.createHash('sha256').update(normalizeTranslationText(text), 'utf8').digest('hex');
}

function containsChinese(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}

function getTranslationMonth(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function countTranslationChars(texts: string[]): number {
  return texts.reduce((total, text) => total + Array.from(text).length, 0);
}

export async function resolveProductNameTranslationsCore(
  options: ResolveProductNameTranslationsCoreOptions
): Promise<ProductNameTranslationResult> {
  const uniqueTexts = Array.from(new Set(
    options.texts
      .map(normalizeTranslationText)
      .filter(text => text && !containsChinese(text))
  ));

  const emptyResult = {
    items: [] as ProductNameTranslationItem[],
    sourceLang: options.sourceLang,
    targetLang: options.targetLang,
    translationConfigured: true,
    quotaExceeded: false,
    monthlyLimitChars: options.monthlyLimitChars,
    monthlyUsedChars: 0,
    requestedChars: 0,
  };

  if (uniqueTexts.length === 0) {
    return emptyResult;
  }

  const cachedTranslations = await options.getCachedTranslations(uniqueTexts);
  const items: ProductNameTranslationItem[] = [];
  const missingTexts: string[] = [];

  for (const text of uniqueTexts) {
    const cached = normalizeTranslationText(cachedTranslations.get(text) || '');
    if (cached) {
      items.push({
        sourceText: text,
        translatedText: cached,
        status: 'cached',
      });
    } else {
      missingTexts.push(text);
    }
  }

  if (missingTexts.length === 0) {
    return {
      ...emptyResult,
      items,
    };
  }

  const translationConfigured = await options.providerAvailable();
  if (!translationConfigured) {
    return {
      ...emptyResult,
      items: [
        ...items,
        ...missingTexts.map(text => ({
          sourceText: text,
          translatedText: '',
          status: 'skipped' as ProductNameTranslationStatus,
          error: 'translation_api_not_configured',
        })),
      ],
      translationConfigured: false,
    };
  }

  const requestedChars = countTranslationChars(missingTexts);
  const monthlyUsedChars = await options.getMonthlyUsage();
  if (monthlyUsedChars + requestedChars > options.monthlyLimitChars) {
    return {
      ...emptyResult,
      items: [
        ...items,
        ...missingTexts.map(text => ({
          sourceText: text,
          translatedText: '',
          status: 'quota_exceeded' as ProductNameTranslationStatus,
          error: 'monthly_translation_quota_exceeded',
        })),
      ],
      quotaExceeded: true,
      monthlyUsedChars,
      requestedChars,
    };
  }

  const translatedMap = await options.translateMissingTexts(missingTexts);
  const translatedItems: ProductNameTranslationItem[] = [];
  const cacheItems: Array<{ originalText: string; translatedText: string }> = [];

  for (const text of missingTexts) {
    const translatedText = normalizeTranslationText(translatedMap.get(text) || '');
    if (translatedText && translatedText !== text) {
      translatedItems.push({
        sourceText: text,
        translatedText,
        status: 'translated',
      });
      cacheItems.push({
        originalText: text,
        translatedText,
      });
    } else {
      translatedItems.push({
        sourceText: text,
        translatedText: translatedText || '',
        status: 'failed',
        error: 'empty_or_same_translation',
      });
    }
  }

  if (cacheItems.length > 0) {
    await options.saveCachedTranslations(cacheItems);
    await options.addMonthlyUsage(requestedChars);
  }

  return {
    ...emptyResult,
    items: [...items, ...translatedItems],
    monthlyUsedChars,
    requestedChars,
  };
}

// 产品状态翻译映射
const PRODUCT_STATUS_TRANSLATIONS: Record<string, Record<string, string>> = {
  'ru': {
    'price_sent': '价格已发送',
    'on_sale': '在售',
    'draft': '草稿',
    'archived': '已归档',
    'unknown': '未知'
  },
  'en': {
    'price_sent': 'Price Sent',
    'on_sale': 'On Sale',
    'draft': 'Draft',
    'archived': 'Archived',
    'unknown': 'Unknown'
  },
  'zh': {
    'price_sent': '价格已发送',
    'on_sale': '在售',
    'draft': '草稿',
    'archived': '已归档',
    'unknown': '未知'
  }
};

/**
 * 翻译文本
 */
export async function translateText(
  text: string,
  from: string = 'ru',
  to: string = 'zh',
  userId?: number
): Promise<string> {
  const normalizedText = normalizeTranslationText(text);
  // 如果文本为空，直接返回
  if (!normalizedText) {
    return '';
  }

  // 如果源语言和目标语言相同，直接返回原文
  if (from === to) {
    return normalizedText;
  }
  const originalHash = createTranslationCacheHash(normalizedText);

  // 检查翻译缓存
  const cachedTranslation = await prisma.translationCache.findFirst({
    where: {
      originalHash,
      sourceLang: from,
      targetLang: to,
      expiresAt: { gt: new Date() }
    }
  });

  if (cachedTranslation) {
    // 更新使用计数
    await prisma.translationCache.update({
      where: { id: cachedTranslation.id },
      data: { usageCount: { increment: 1 } }
    });
    return cachedTranslation.translatedText;
  }

  const providerConfig = await resolveTranslationProviderConfig(userId);
  if (!providerConfig) {
    logger.warn('翻译API未配置，返回原文');
    return normalizedText;
  }

  try {
    const translatedText = providerConfig.provider === 'tencent'
      ? await translateWithTencent(normalizedText, from, to, providerConfig)
      : await translateWithBaidu(normalizedText, from, to, providerConfig);

    const normalizedTranslatedText = normalizeTranslationText(translatedText);
    if (!normalizedTranslatedText || normalizedTranslatedText === normalizedText) {
      return normalizedText;
    }

    await prisma.translationCache.upsert({
      where: {
        originalHash_sourceLang_targetLang: {
          originalHash,
          sourceLang: from,
          targetLang: to,
        },
      },
      update: {
        originalText: normalizedText,
        translatedText: normalizedTranslatedText,
        service: providerConfig.provider,
        usageCount: { increment: 1 },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        originalText: normalizedText,
        originalHash,
        translatedText: normalizedTranslatedText,
        sourceLang: from,
        targetLang: to,
        service: providerConfig.provider,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return normalizedTranslatedText;
  } catch (error: any) {
    logger.error('翻译API调用失败:', error.message);
    return normalizedText;
  }
}

/**
 * 生成翻译API签名
 */
function generateBaiduSign(appId: string, text: string, salt: string, secretKey: string): string {
  const str = `${appId}${text}${salt}${secretKey}`;
  return crypto.createHash('md5').update(str).digest('hex');
}

async function resolveTranslationProviderConfig(userId?: number): Promise<TranslationProviderConfig | null> {
  if (Number.isFinite(Number(userId))) {
    const apiConfig = await prisma.apiConfig.findFirst({
      where: {
        userId: Number(userId),
        platform: 'translation',
        status: 'valid',
      },
    });

    const config = apiConfig?.config as any;
    if (config?.secretId && config?.secretKey) {
      return {
        provider: 'tencent',
        url: config.url,
        secretId: String(config.secretId),
        secretKey: String(config.secretKey),
      };
    }

    if (config?.appId && config?.secretKey) {
      return {
        provider: 'baidu',
        url: config.url,
        appId: String(config.appId),
        secretKey: String(config.secretKey),
      };
    }
  }

  if (BAIDU_APP_ID && BAIDU_SECRET_KEY) {
    return {
      provider: 'baidu',
      appId: BAIDU_APP_ID,
      secretKey: BAIDU_SECRET_KEY,
    };
  }

  return null;
}

async function getCachedTranslationMap(
  texts: string[],
  sourceLang: string,
  targetLang: string
): Promise<Map<string, string>> {
  if (texts.length === 0) return new Map();
  const normalizedTexts = texts.map(normalizeTranslationText).filter(Boolean);
  const hashes = normalizedTexts.map(createTranslationCacheHash);
  if (hashes.length === 0) return new Map();

  const placeholders = hashes.map(() => '?').join(', ');
  const cachedRows = await prisma.$queryRawUnsafe<Array<{ id: number; originalText: string; translatedText: string }>>(
    `SELECT id, originalText, translatedText
     FROM translation_cache
     WHERE originalHash IN (${placeholders})
       AND sourceLang = ?
       AND targetLang = ?
       AND expiresAt > ?`,
    ...hashes,
    sourceLang,
    targetLang,
    new Date()
  );

  if (cachedRows.length > 0) {
    await prisma.translationCache.updateMany({
      where: { id: { in: cachedRows.map(row => row.id) } },
      data: { usageCount: { increment: 1 } },
    });
  }

  return new Map(
    cachedRows
      .map(row => [normalizeTranslationText(row.originalText), normalizeTranslationText(row.translatedText)] as const)
      .filter(([, translatedText]) => Boolean(translatedText))
  );
}

async function saveProductNameTranslationCache(
  items: Array<{ originalText: string; translatedText: string }>,
  sourceLang: string,
  targetLang: string,
  provider: string
): Promise<void> {
  for (const item of items) {
    const originalText = normalizeTranslationText(item.originalText);
    const translatedText = normalizeTranslationText(item.translatedText);
    if (!originalText || !translatedText) continue;
    const originalHash = createTranslationCacheHash(originalText);
    await prisma.$executeRawUnsafe(
      `INSERT INTO translation_cache
        (originalText, originalHash, translatedText, sourceLang, targetLang, service, usageCount, expiresAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        originalText = VALUES(originalText),
        translatedText = VALUES(translatedText),
        service = VALUES(service),
        usageCount = usageCount + 1,
        expiresAt = VALUES(expiresAt),
        updatedAt = NOW()`,
      originalText,
      originalHash,
      translatedText,
      sourceLang,
      targetLang,
      provider,
      PRODUCT_NAME_CACHE_EXPIRES_AT
    );
  }
}

async function getMonthlyTranslationUsage(
  userId: number,
  provider: string,
  month: string
): Promise<number> {
  const usage = await prisma.translationUsageMonthly.findUnique({
    where: {
      userId_provider_month: {
        userId,
        provider,
        month,
      },
    },
    select: {
      usedChars: true,
    },
  });

  return usage?.usedChars || 0;
}

async function addMonthlyTranslationUsage(
  userId: number,
  provider: string,
  month: string,
  chars: number,
  limitChars: number
): Promise<void> {
  await prisma.translationUsageMonthly.upsert({
    where: {
      userId_provider_month: {
        userId,
        provider,
        month,
      },
    },
    update: {
      usedChars: { increment: chars },
      limitChars,
    },
    create: {
      userId,
      provider,
      month,
      usedChars: chars,
      limitChars,
    },
  });
}

export async function resolveProductNameTranslations(
  texts: string[],
  userId: number,
  options: {
    sourceLang?: string;
    targetLang?: string;
    monthlyLimitChars?: number;
    now?: Date;
  } = {}
): Promise<ProductNameTranslationResult> {
  const sourceLang = options.sourceLang || 'ru';
  const targetLang = options.targetLang || 'zh';
  const now = options.now || new Date();
  const monthlyLimitChars = options.monthlyLimitChars || DEFAULT_TRANSLATION_MONTHLY_LIMIT_CHARS;
  let providerConfig: TranslationProviderConfig | null | undefined;
  const getProviderConfig = async () => {
    if (providerConfig === undefined) {
      providerConfig = await resolveTranslationProviderConfig(userId);
    }
    return providerConfig;
  };

  return resolveProductNameTranslationsCore({
    texts,
    sourceLang,
    targetLang,
    now,
    monthlyLimitChars,
    getCachedTranslations: uniqueTexts => getCachedTranslationMap(uniqueTexts, sourceLang, targetLang),
    providerAvailable: async () => Boolean(await getProviderConfig()),
    getMonthlyUsage: async () => {
      const config = await getProviderConfig();
      if (!config) return 0;
      return getMonthlyTranslationUsage(userId, config.provider, getTranslationMonth(now));
    },
    addMonthlyUsage: async chars => {
      const config = await getProviderConfig();
      if (!config) return;
      await addMonthlyTranslationUsage(
        userId,
        config.provider,
        getTranslationMonth(now),
        chars,
        monthlyLimitChars
      );
    },
    translateMissingTexts: async uniqueTexts => {
      const config = await getProviderConfig();
      const translatedEntries: Array<[string, string]> = [];
      if (!config) return new Map();

      for (const text of uniqueTexts) {
        const translatedText = config.provider === 'tencent'
          ? await translateWithTencent(text, sourceLang, targetLang, config)
          : await translateWithBaidu(text, sourceLang, targetLang, config);
        translatedEntries.push([text, translatedText]);
      }

      return new Map(translatedEntries);
    },
    saveCachedTranslations: async items => {
      const config = await getProviderConfig();
      if (!config) return;
      await saveProductNameTranslationCache(items, sourceLang, targetLang, config.provider);
    },
  });
}

async function translateWithBaidu(
  text: string,
  from: string,
  to: string,
  config: TranslationProviderConfig
): Promise<string> {
  const appId = config.appId || '';
  const secretKey = config.secretKey || '';
  const salt = Date.now().toString();
  const response = await axios.get(config.url || BAIDU_TRANSLATE_API, {
    params: {
      q: text,
      from,
      to,
      appid: appId,
      salt,
      sign: generateBaiduSign(appId, text, salt, secretKey),
    },
  });

  return response.data?.trans_result?.[0]?.dst || text;
}

async function translateWithTencent(
  text: string,
  from: string,
  to: string,
  config: TranslationProviderConfig
): Promise<string> {
  const secretId = config.secretId || '';
  const secretKey = config.secretKey || '';
  const region = 'ap-guangzhou';
  const service = 'tmt';
  const version = '2018-03-21';
  const action = 'TextTranslate';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().substring(0, 10);
  const endpoint = normalizeTranslationEndpoint(config.url, `https://${service}.tencentcloudapi.com/`);
  const host = new URL(endpoint).host;
  const payload = {
    SourceText: text,
    Source: from === 'zh' ? 'zh' : from,
    Target: to === 'zh' ? 'zh' : to,
    ProjectId: 0,
  };
  const payloadStr = JSON.stringify(payload);
  const algorithm = 'TC3-HMAC-SHA256';
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const hashedRequestPayload = crypto.createHash('sha256').update(payloadStr).digest('hex');
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;
  const secretDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest();
  const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
  const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await axios.post(endpoint, payload, {
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      Host: host,
      'X-TC-Action': action,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Version': version,
      'X-TC-Region': region,
    },
  });

  return response.data?.Response?.TargetText || text;
}

function normalizeTranslationEndpoint(url: string | undefined, fallback: string): string {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) return fallback;
  const withProtocol = /^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`;
  return withProtocol.endsWith('/') ? withProtocol : `${withProtocol}/`;
}

/**
 * 翻译产品状态
 */
export async function translateProductStatus(
  status: string,
  targetLang: string = 'zh',
  userId?: number
): Promise<string> {
  // 首先检查是否有直接的翻译映射
  const targetTranslations = PRODUCT_STATUS_TRANSLATIONS[targetLang];
  if (targetTranslations && targetTranslations[status]) {
    return targetTranslations[status];
  }

  // 如果没有直接映射，尝试翻译
  return await translateText(status, 'ru', targetLang, userId);
}

/**
 * 翻译产品名称
 */
export async function translateProductName(
  name: string,
  targetLang: string = 'zh',
  userId?: number
): Promise<string> {
  return await translateText(name, 'ru', targetLang, userId);
}

/**
 * 批量翻译文本
 */
export async function translateBatchText(
  texts: string[],
  from: string = 'ru',
  to: string = 'zh',
  userId?: number
): Promise<string[]> {
  const promises = texts.map(text => translateText(text, from, to, userId));
  return await Promise.all(promises);
}

/**
 * 清理过期的翻译缓存
 */
export async function cleanExpiredTranslations(): Promise<void> {
  try {
    const expiredCount = await prisma.translationCache.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    if (expiredCount.count > 0) {
      logger.info(`清理了 ${expiredCount.count} 条过期的翻译缓存`);
    }
  } catch (error: any) {
    logger.error('清理翻译缓存失败:', error.message);
  }
}
