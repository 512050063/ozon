import logger from '../config/logger';
import prisma from '../config/database';
import { encrypt, decrypt } from '../utils/crypto';
import * as iconv from 'iconv-lite';

/**
 * 将关键词转成GBK编码的URL参数（1688搜索页要求GBK）
 */
function encodeKeywordForSearch(keyword: string): string {
  const gbkBuf = iconv.encode(keyword, 'gbk');
  return Array.from(gbkBuf)
    .map((b: number) => '%' + b.toString(16).toUpperCase().padStart(2, '0'))
    .join('');
}

// 1688搜索API配置
const ALIBABA_SEARCH_API = 'https://api-seller.alibaba.com/openapi/param2/1/cn.alibaba.open/alibaba.search.product/1';

// 1688授权相关配置
const ALIBABA_AUTH_URL = 'https://auth.1688.com/oauth/authorize';
const ALIBABA_TOKEN_URL = 'https://auth.1688.com/oauth/token';

// ---------- 搜索缓存（用于详情接口降级，对齐测试项目） ----------
const searchCache: Map<string, any> = new Map();
const SEARCH_CACHE_MAX_SIZE = 1000;

function cacheSearchResult(productId: string, rawData: any) {
  if (searchCache.size >= SEARCH_CACHE_MAX_SIZE) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(productId, rawData);
}

function getCachedProduct(productId: string): any | null {
  return searchCache.get(productId) || null;
}

function buildDetailFromCache(raw: any): any {
  const subject = raw.get?.('subject') || raw.subject || '';

  let price = 0;
  const priceInfo = raw.get?.('offerPrice') || raw.get?.('priceInfo') || raw.offerPrice || raw.priceInfo || {};
  if (typeof priceInfo === 'object') {
    price = parseFloat(priceInfo.price || priceInfo.startPrice || 0) || 0;
  }

  let imageUrl = '';
  const imgInfo = raw.get?.('offerImage') || raw.get?.('imageInfo') || raw.offerImage || raw.imageInfo || {};
  if (typeof imgInfo === 'object') {
    imageUrl = imgInfo.imageUrl || imgInfo.url || '';
  }

  let companyName = '';
  const companyInfo = raw.get?.('companyInfo') || raw.get?.('supplierInfo') || raw.companyInfo || raw.supplierInfo || {};
  if (typeof companyInfo === 'object') {
    companyName = companyInfo.companyName || companyInfo.name || '';
  }

  const numericId = raw.get?.('offerId') || raw.offerId || '';
  const openId = raw.get?.('openOfferId') || raw.openOfferId || '';
  const detailUrlRaw = raw.get?.('detailUrl') || raw.get?.('detail_url') || raw.detailUrl || raw.detail_url || '';

  let productId = String(numericId || openId || '');
  let detailUrl = '';
  if (numericId) {
    detailUrl = `https://detail.1688.com/offer/${numericId}.html`;
  } else if (openId) {
    // 加密 openId 无法构造浏览器可直接访问的URL（会404）
    detailUrl = '';
  } else if (detailUrlRaw) {
    detailUrl = detailUrlRaw;
  }

  return {
    productId,
    subject,
    description: '',
    price,
    currency: 'CNY',
    image_urls: imageUrl ? [imageUrl] : [],
    detail_url: detailUrl,
    detailUrl,
    min_order: 1,
    supplier_name: companyName,
    attributes: {},
    category: '',
    category_name: '',
    found: true,
    sku_list: [],
    _from_cache: true,
  };
}

const PLATFORM = '1688';

/**
 * 从数据库加载1688配置（仅含 appKey/appSecret/redirectUri 等静态配置，不含token）
 */
export async function loadAlibabaConfig(userId: number): Promise<any> {
  try {
    const record = await prisma.apiConfig.findFirst({
      where: { platform: PLATFORM },
      orderBy: { updatedAt: 'desc' },
    });
    if (record && record.config) {
      const cfg = record.config as any;
      return {
        appKey: cfg.appKey || cfg.app_key || '',
        appSecret: cfg.appSecret || cfg.app_secret || '',
        redirectUri: cfg.redirectUri || cfg.redirect_uri || 'https://58.87.104.60/callback.html',
        ...cfg
      };
    }
    return {};
  } catch (error) {
    logger.error('从数据库加载1688配置失败:', error);
    return {};
  }
}

/**
 * 保存1688配置到数据库（仅保存 appKey/appSecret/redirectUri 等静态配置）
 * 不再存储 accessToken 等动态凭证到 config JSON
 */
export async function saveAlibabaConfig(userId: number, config: any): Promise<void> {
  try {
    // 过滤掉token相关字段，只保留静态配置
    const { accessToken, access_token, tokenExpiresIn, expires_in,
            tokenObtainedAt, obtained_at, tokenType, token_type, ...staticConfig } = config as any;

    const existing = await prisma.apiConfig.findFirst({
      where: { platform: PLATFORM },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) {
      // 合并时也排除已有config中的token字段
      const existingConfig = existing.config as any;
      const { accessToken: _at, access_token: _at2, tokenExpiresIn: _tei, expires_in: _ei,
              tokenObtainedAt: _toa, obtained_at: _oa, tokenType: _tt, token_type: _tt2,
              ...existingStatic } = existingConfig || {};

      await prisma.apiConfig.update({
        where: { id: existing.id },
        data: { config: { ...existingStatic, ...staticConfig } }
      });
    } else {
      await prisma.apiConfig.create({
        data: { userId, platform: PLATFORM, config: staticConfig }
      });
    }
  } catch (error) {
    logger.error('保存1688配置到数据库失败:', error);
  }
}

/**
 * 从 user_tokens 表加载Token（解密后返回）
 */
export async function loadToken(userId: number): Promise<{ access_token: string; expires_in: number; obtained_at: number } | null> {
  try {
    const record = await prisma.userToken.findFirst({
      where: { platform: PLATFORM },
      orderBy: { updatedAt: 'desc' },
    });
    if (!record) return null;

    const accessToken = decrypt(record.accessToken);
    return {
      access_token: accessToken,
      expires_in: Math.floor((record.expiresAt.getTime() - record.obtainedAt.getTime()) / 1000),
      obtained_at: Math.floor(record.obtainedAt.getTime() / 1000),
    };
  } catch (error) {
    logger.error('从数据库加载Token失败:', error);
    return null;
  }
}

/**
 * 保存Token到 user_tokens 表（加密存储）
 */
export async function saveToken(userId: number, tokenData: any): Promise<void> {
  try {
    const accessToken = tokenData.access_token;
    const expiresIn = parseInt(tokenData.expires_in) || 3600;
    const obtainedAt = new Date(); // 当前时间
    const expiresAt = new Date(obtainedAt.getTime() + expiresIn * 1000);

    const encryptedToken = encrypt(accessToken);

    const existing = await prisma.userToken.findFirst({
      where: { platform: PLATFORM },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      await prisma.userToken.update({
        where: { id: existing.id },
        data: {
          accessToken: encryptedToken,
          expiresAt,
          obtainedAt,
        }
      });
    } else {
      await prisma.userToken.create({
        data: {
          userId,
          platform: PLATFORM,
          accessToken: encryptedToken,
          expiresAt,
          obtainedAt,
        }
      });
    }

    logger.info(`Token已保存到user_tokens表, userId=${userId}, 过期时间=${expiresAt.toISOString()}`);
  } catch (error) {
    logger.error('保存Token到数据库失败:', error);
    throw error;
  }
}

/**
 * 生成授权链接
 */
export async function generateAuthUrl(userId: number): Promise<string> {
  const config = await loadAlibabaConfig(userId);
  const appKey = config.appKey || config.app_key || '';
  const redirectUri = config.redirectUri || config.redirect_uri || '';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: appKey,
    redirect_uri: redirectUri,
    state: 'random_state'
  });
  return `${ALIBABA_AUTH_URL}?${params.toString()}`;
}

/**
 * 用授权码换取Token
 */
export async function exchangeToken(userId: number, code: string): Promise<any> {
  const config = await loadAlibabaConfig(userId);
  const appKey = config.appKey || config.app_key || '';
  const appSecret = config.appSecret || config.app_secret || '';
  const redirectUri = config.redirectUri || config.redirect_uri || '';

  try {
    const response = await fetch(ALIBABA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: appKey,
        client_secret: appSecret,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();

    if (data.access_token) {
      data.obtained_at = Math.floor(Date.now() / 1000);
      await saveToken(userId, data);
    }

    return data;
  } catch (error: any) {
    logger.error('换取Token失败:', error);
    throw new Error(`换取Token失败: ${error.message}`);
  }
}

/**
 * 获取Token状态（前端专用，不返回 accessToken 明文）
 */
export async function getTokenStatus(userId: number): Promise<any> {
  try {
    const record = await prisma.userToken.findFirst({
      where: { platform: PLATFORM },
      orderBy: { updatedAt: 'desc' },
    });

    if (!record) {
      return {
        hasToken: false,
        isExpired: true,
        message: '未配置Token'
      };
    }

    const now = new Date();
    const isExpired = now > record.expiresAt;
    const remainingSeconds = Math.max(0, Math.floor((record.expiresAt.getTime() - now.getTime()) / 1000));

    return {
      hasToken: true,
      isExpired,
      remainingSeconds,
      obtainedAt: record.obtainedAt.toISOString(),
      expiresAt: record.expiresAt.toISOString(),
      message: isExpired ? 'Token已过期，请重新授权' : 'Token有效'
    };
  } catch (error) {
    logger.error('获取Token状态失败:', error);
    return {
      hasToken: false,
      isExpired: true,
      message: '获取Token状态失败'
    };
  }
}

const GW_BASE = 'https://gw.open.1688.com/openapi';

/**
 * 从1688详情链接中提取数字offerId
 * 只匹配标准格式，避免从非商品URL中错误提取数字
 * 例: https://detail.1688.com/offer/123456789.html -> "123456789"
 * 也兼容: offerId=123456789, id=123456789
 */
function extractNumericIdFromUrl(url: string): string {
  if (!url) return '';
  // 标准格式: /offer/123456789.html
  const m1 = url.match(/\/offer\/(\d{6,18})\.html/);
  if (m1) return m1[1];
  // query参数: offerId=123456789 或 id=123456789
  const m2 = url.match(/[?&](?:offerId|offer_id|id)=(\d{6,18})/);
  if (m2) return m2[1];
  // 不再从URL任意位置匹配纯数字，避免误判（如时间戳、统计ID等）
  return '';
}

/**
 * 生成1688 param2 HMAC-SHA1签名
 * 规则: 签名串 = urlPath + 排序后的key+value拼接
 * urlPath = param2/1/{namespace}/{api}/{appKey}
 */
function generateSignature(
  namespace: string,
  api: string,
  appKey: string,
  appSecret: string,
  params: Record<string, any>
): string {
  const crypto = require('crypto');
  const urlPath = `param2/1/${namespace}/${api}/${appKey}`;
  const sortedKeys = Object.keys(params).sort();
  let paramStr = '';
  for (const key of sortedKeys) {
    paramStr += key + String(params[key]);
  }
  const signRaw = urlPath + paramStr;
  return crypto.createHmac('sha1', appSecret).update(signRaw).digest('hex').toUpperCase();
}

/**
 * 调用1688 param2 接口（通用封装）
 * 对齐Python AOP SDK：使用POST + form-urlencoded，参数放body
 */
export async function call1688Api(
  userId: number,
  namespace: string,
  api: string,
  params: Record<string, any>
): Promise<any> {
  const config = await loadAlibabaConfig(userId);
  const appKey = (config.appKey || config.app_key || '').trim();
  const appSecret = (config.appSecret || config.app_secret || '').trim();

  if (!appKey || !appSecret) {
    throw new Error('未配置 App Key 或 App Secret，请先在设置页面填写并保存');
  }

  const urlPath = `param2/1/${namespace}/${api}/${appKey}`;
  const reqUrl = `${GW_BASE}/${urlPath}`;

  const signature = generateSignature(namespace, api, appKey, appSecret, params);

  // 构造 form body（参数 + 签名）
  const bodyParams: Record<string, string> = { _aop_signature: signature };
  for (const [k, v] of Object.entries(params)) {
    bodyParams[k] = String(v);
  }

  const body = new URLSearchParams(bodyParams).toString();

  logger.info(`[1688] POST ${namespace}/${api}`);
  logger.info(`[1688] 请求URL: ${reqUrl}`);
  logger.info(`[1688] 请求Body: ${body}`);
  logger.info(`[1688] 签名参数: ${JSON.stringify(params)}`);

  const response = await fetch(reqUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'Keep-Alive',
    },
    body,
  });

  const data = await response.json();

  // 错误处理
  if (data.error_response) {
    const err = data.error_response;
    logger.warn(`[1688] 接口返回error_response: ${JSON.stringify(err).substring(0, 1000)}`);
    throw new Error(`1688接口错误 ${err.code || ''}: ${err.zh_desc || err.msg || err.sub_msg || JSON.stringify(err)}`);
  }
  if (data.exception) {
    logger.warn(`[1688] 接口返回exception: ${JSON.stringify(data).substring(0, 1000)}`);
    throw new Error(`1688接口异常: ${data.error_message || JSON.stringify(data)}`);
  }

  logger.info(`[1688] 响应键: ${Object.keys(data).join(',')}`);
  if (data.result) {
    const resultKeys = Object.keys(data.result);
    logger.info(`[1688] result 键: ${resultKeys.join(',')} 类型: ${Array.isArray(data.result) ? 'array' : typeof data.result}`);
    if (data.result.result !== undefined && !Array.isArray(data.result)) {
      logger.info(`[1688] result.result 类型: ${Array.isArray(data.result.result) ? 'array' : typeof data.result.result} 长度: ${Array.isArray(data.result.result) ? data.result.result.length : 'N/A'}`);
      // 如果是商品列表，打印第一条原始数据供调试
      if (Array.isArray(data.result.result) && data.result.result.length > 0 && api === 'product.keyword.search') {
        const p0 = data.result.result[0];
        logger.info(`[1688][DEBUG] keyword.search 第一条商品: ${JSON.stringify(p0).substring(0, 600)}`);
      }
    }
    // 如果result里只有success没有result数组，打印完整result供排查
    if (resultKeys.length <= 2 && !resultKeys.includes('result')) {
      logger.info(`[1688] result完整内容: ${JSON.stringify(data.result).substring(0, 500)}`);
    }
  }

  return data;
}

/**
 * 调用1688 param2 接口（GET方式，参数放query string）
 * 对标Python参考项目 _invoke() 函数：GET + query string
 * 某些搜索接口在GET方式下关键词参数才能正确生效
 */
export async function call1688ApiGet(
  userId: number,
  namespace: string,
  api: string,
  params: Record<string, any>
): Promise<any> {
  const config = await loadAlibabaConfig(userId);
  const appKey = (config.appKey || config.app_key || '').trim();
  const appSecret = (config.appSecret || config.app_secret || '').trim();

  if (!appKey || !appSecret) {
    throw new Error('未配置 App Key 或 App Secret，请先在设置页面填写并保存');
  }

  const urlPath = `param2/1/${namespace}/${api}/${appKey}`;
  const reqUrl = `${GW_BASE}/${urlPath}`;

  const signature = generateSignature(namespace, api, appKey, appSecret, params);

  // 构造 query string（参数 + 签名），对标Python requests.get(req_url, params=qs)
  const qs: Record<string, string> = { _aop_signature: signature };
  for (const [k, v] of Object.entries(params)) {
    qs[k] = String(v);
  }

  const queryString = new URLSearchParams(qs).toString();
  const fullUrl = `${reqUrl}?${queryString}`;

  logger.info(`[1688] GET ${namespace}/${api}`);
  logger.info(`[1688] 请求URL: ${fullUrl}`);
  logger.info(`[1688] 签名参数: ${JSON.stringify(params)}`);

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      'Connection': 'Keep-Alive',
    },
  });

  const data = await response.json();

  // 错误处理（和POST版本一致）
  if (data.error_response) {
    const err = data.error_response;
    logger.warn(`[1688] GET接口返回error_response: ${JSON.stringify(err).substring(0, 1000)}`);
    throw new Error(`1688接口错误 ${err.code || ''}: ${err.zh_desc || err.msg || err.sub_msg || JSON.stringify(err)}`);
  }
  if (data.exception) {
    logger.warn(`[1688] GET接口返回exception: ${JSON.stringify(data).substring(0, 1000)}`);
    throw new Error(`1688接口异常: ${data.error_message || JSON.stringify(data)}`);
  }

  logger.info(`[1688] GET响应键: ${Object.keys(data).join(',')}`);

  return data;
}

/**
 * 从1688响应中尝试提取商品列表（兼容多种返回结构）
 */
function extractProductsFromResponse(data: any): any[] {
  // 结构1: { result: { success: true, result: [...] } }
  if (data.result && data.result.success && Array.isArray(data.result.result)) {
    return data.result.result;
  }
  // 结构2: { result: { result: [...] } } (没有success标志)
  if (data.result && Array.isArray(data.result.result)) {
    return data.result.result;
  }
  // 结构3: { result: [...] } (result直接是数组)
  if (Array.isArray(data.result)) {
    return data.result;
  }
  // 结构4: 搜索API特殊结构，result里有 productList / offerList / items
  if (data.result && typeof data.result === 'object') {
    const possibleKeys = ['productList', 'offerList', 'items', 'offerList', 'data', 'offers', 'productlist', 'offerlist'];
    for (const key of possibleKeys) {
      if (Array.isArray(data.result[key])) {
        return data.result[key];
      }
    }
  }
  // 结构5: 公开图搜返回结构 { imageSearchResult: [...], success: true }
  if (Array.isArray(data.imageSearchResult)) {
    return data.imageSearchResult;
  }
  // 结构6: 外层以接口名+_response包裹
  const respKey = Object.keys(data).find(k => k.endsWith('_response'));
  if (respKey && data[respKey]) {
    const inner = data[respKey];
    if (Array.isArray(inner.result)) return inner.result;
    if (inner.result && Array.isArray(inner.result.result)) return inner.result.result;
    if (inner.result && typeof inner.result === 'object') {
      for (const key of ['productList', 'offerList', 'items', 'data', 'offers']) {
        if (Array.isArray(inner.result[key])) return inner.result[key];
      }
    }
    if (Array.isArray(inner.imageSearchResult)) {
      return inner.imageSearchResult;
    }
  }
  return [];
}

/**
 * 解析商品列表（兼容多种1688 API返回格式）
 */
function parseProductList(items: any[]): any[] {
  return items.map((p: any) => {
    // 标题（兼容多种字段名）
    const subject = p.subject || p.title || p.name || p.productTitle || p.product_title || p.offerSubject || '';

    // 价格（兼容多种字段名）
    let price = 0;
    let consignPrice = 0;
    const priceInfo = p.offerPrice || p.priceInfo || p.priceRange || {};
    if (typeof priceInfo === 'object') {
      price = parseFloat(priceInfo.price || priceInfo.startPrice || 0) || 0;
      consignPrice = parseFloat(priceInfo.consignPrice || 0) || 0;
    }
    if (!price) price = parseFloat(p.price || 0) || 0;

    // 图片（兼容多种字段名：offerImage.imageUrl / image / images / imageList）
    let imageUrl = '';
    const allImages: string[] = [];

    // 辅助：把一个值推入 allImages（去重）
    const pushImg = (v: any) => {
      const s = typeof v === 'object'
        ? (v?.url || v?.imageUrl || v?.image_url || v?.imgUrl || v?.src || '')
        : String(v || '');
      if (s && !allImages.includes(s)) allImages.push(s);
    };

    // 公开图搜直接返回 image 字符串
    const directImageCandidates = [
      p.image,
      p.image_url,
      p.imageUrl,
      p.imgUrl,
      p.mainImage,
      p.main_image,
      p.primaryImage,
      p.picUrl,
      p.pic_url,
      p.thumbnail,
    ];
    for (const imageCandidate of directImageCandidates) {
      if (typeof imageCandidate === 'string' && imageCandidate.trim()) {
        imageUrl = imageCandidate.trim();
        pushImg(imageUrl);
        break;
      }
    }
    // offerImage / imageInfo 对象结构（通常只有一张）
    if (!imageUrl) {
      const imgInfo = p.offerImage || p.imageInfo || {};
      if (typeof imgInfo === 'object') {
        imageUrl = imgInfo.imageUrl || imgInfo.image_url || imgInfo.url || imgInfo.imgUrl || '';
        if (imageUrl) pushImg(imageUrl);
      }
    }
    // images / imageList 数组结构（多张主图）
    const rawImgs = p.images || p.imageList || p.imageUrls || p.image_urls || p.picUrls || [];
    if (Array.isArray(rawImgs) && rawImgs.length > 0) {
      if (!imageUrl) {
        const img0 = rawImgs[0];
        imageUrl = typeof img0 === 'object' ? (img0.url || img0.imageUrl || '') : String(img0);
      }
      for (const img of rawImgs) pushImg(img);
    }
    // offerImage.images 子数组（部分接口格式）
    const offerImgArr = (p.offerImage || p.imageInfo || {})?.images;
    if (Array.isArray(offerImgArr)) {
      for (const img of offerImgArr) pushImg(img);
    }
    // 若 allImages 仍为空但 imageUrl 有值，补入
    if (allImages.length === 0 && imageUrl) allImages.push(imageUrl);

    // 供应商
    let companyName = '';
    let city = '';
    let province = '';
    const companyInfo = p.companyInfo || p.supplierInfo || {};
    if (typeof companyInfo === 'object') {
      companyName = companyInfo.companyName || companyInfo.name || '';
      city = companyInfo.city || '';
      province = companyInfo.province || '';
    }

    // 质量评分
    const quality = p.qualityEvaluation || {};
    let qualityScore = 0;
    const qualityDetail: Record<string, number> = {};
    if (typeof quality === 'object') {
      qualityScore = parseFloat(quality.compositeScore || 0) || 0;
      for (const k of ['compositeScore', 'consultationScore', 'disputeScore', 'logisticsScore', 'goodsScore', 'returnScore']) {
        if (quality[k] != null) qualityDetail[k] = parseFloat(quality[k]) || 0;
      }
    }

    // 服务标签
    const tradeServices: string[] = [];
    for (const svc of (p.offerTradeServiceInfo || [])) {
      if (typeof svc === 'object' && svc.enable) {
        tradeServices.push(svc.serviceName || '');
      }
    }

    // ID和链接（兼容多种字段名）
    const openOfferId = p.openOfferId || p.open_offer_id || '';
    let numericOfferId = p.offerId || p.offer_id || p.productId || p.product_id || '';

    // detailUrl 可能出现在多种字段名中（尽量找全）
    const urlCandidates = [
      p.detailUrl, p.detail_url, p.url, p.link, p.href,
      p.productUrl, p.product_url, p.offerUrl, p.offer_url,
      p.pcUrl, p.pc_url, p.mobileUrl, p.mobile_url,
      p.encryptPcUrl, p.encrypt_pc_url,
    ];
    let detailUrlRaw = '';
    for (const u of urlCandidates) {
      if (typeof u === 'string' && u.trim()) {
        detailUrlRaw = u.trim();
        break;
      }
    }

    // 尝试从 detailUrlRaw 提取数字offerId
    const numericFromUrl = extractNumericIdFromUrl(detailUrlRaw);
    if (!numericOfferId && numericFromUrl) numericOfferId = numericFromUrl;

    // 也尝试从其他数字字段直接获取
    if (!numericOfferId) {
      for (const k of ['offerId', 'offer_id', 'productId', 'product_id', 'id', 'Id', 'ID']) {
        const v = p[k];
        if (v && /^\d{6,15}$/.test(String(v))) {
          numericOfferId = String(v);
          break;
        }
      }
    }

    const productId = numericOfferId ? String(numericOfferId) : (openOfferId ? String(openOfferId) : '');

    let detailUrl = '';
    if (numericOfferId) {
      detailUrl = `https://detail.1688.com/offer/${numericOfferId}.html`;
    } else if (openOfferId) {
      // 加密 openOfferId 无法构造浏览器可直接访问的URL（会404）
      // 保持 detailUrl 为空，让前端 openProductUrl 走详情API解析
      detailUrl = '';
    } else if (detailUrlRaw) {
      // 直接使用原始URL（测试项目不过滤加密/跳转链接）
      detailUrl = detailUrlRaw;
    }

    // 缓存原始数据供详情接口降级使用（对齐测试项目 _cache_search_result）
    if (productId) {
      cacheSearchResult(productId, p);
    }
    if (openOfferId && openOfferId !== productId) {
      cacheSearchResult(openOfferId, p);
    }

    return {
      id: productId,
      productId,
      subject,
      name: subject,
      price,
      consignPrice,
      currency: 'CNY',
      image: imageUrl,
      image_url: imageUrl,
      images: allImages,
      detail_url: detailUrl,
      detailUrl,
      supplier_name: companyName,
      supplier: { name: companyName },
      city,
      province,
      location: province || city,
      quality_score: qualityScore,
      quality_detail: qualityDetail,
      yx_score_level: p.yxScoreLevel || '',
      trade_services: tradeServices,
      moq: p.minOrderQuantity || 1,
      minOrder: p.minOrderQuantity || 1,
    };
  });
}

/**
 * 用商品详情接口补全图搜结果中缺失的字段（质量评分、公司信息等）
 * 图搜API只返回基础字段，详情接口返回完整数据
 */
async function enrichProductsWithDetail(userId: number, products: any[]): Promise<any[]> {
  if (!products || products.length === 0) return products;

  // 对所有有ID的商品调用详情接口补全（包括加密openOfferId）
  // getAlibabaProductDetail 已支持加密openOfferId：
  //   1. product.search.queryProductDetail (支持openOfferId参数)
  //   2. AlibabaFenxiaoProductInfoGet (通过encryptPcUrl重定向解析真实数字ID和详情URL)
  //   3. alibaba.product.get (备选)
  // 搜索API虽然已返回部分字段，但加密ID商品的 detail_url 可能缺失，
  // 需要详情接口补全——这是本函数的首要目的
  const idsToEnrich: string[] = [];
  const indexMap: number[] = [];
  for (let i = 0; i < products.length; i++) {
    const pid = products[i].id;
    if (pid && String(pid).trim()) {
      idsToEnrich.push(String(pid));
      indexMap.push(i);
    }
  }

  if (idsToEnrich.length === 0) {
    logger.info('[enrich] 无有效ID，跳过补全');
    return products;
  }

  logger.info(`[enrich] 准备补全 ${idsToEnrich.length} 条商品详情`);

  try {
    const detailResults = await batchGetAlibabaProducts(userId, idsToEnrich);

    for (let i = 0; i < detailResults.length; i++) {
      const detail = detailResults[i];
      const targetIdx = indexMap[i];
      if (!detail.success || !detail.data) continue;

      const d = detail.data;
      const p = products[targetIdx];

      // 补全供应商信息
      if (d.companyInfo) {
        p.supplier_name = d.companyInfo.companyName || d.companyInfo.name || p.supplier_name;
        p.city = d.companyInfo.city || p.city;
        p.province = d.companyInfo.province || p.province;
        p.location = p.province || p.city;
        p.supplier = { name: p.supplier_name };
      }

      // 补全质量评分
      if (d.qualityEvaluation) {
        p.quality_score = parseFloat(d.qualityEvaluation.compositeScore || 0) || p.quality_score;
        p.quality_detail = {};
        for (const k of ['compositeScore', 'consultationScore', 'disputeScore', 'logisticsScore', 'goodsScore', 'returnScore']) {
          if (d.qualityEvaluation[k] != null) {
            p.quality_detail[k] = parseFloat(d.qualityEvaluation[k]) || 0;
          }
        }
      }

      // 补全服务标签
      if (Array.isArray(d.offerTradeServiceInfo) && d.offerTradeServiceInfo.length > 0) {
        p.trade_services = d.offerTradeServiceInfo
          .filter((svc: any) => svc && svc.enable)
          .map((svc: any) => svc.serviceName || '');
      }

      // 补全运费/代发价
      if (d.consignPrice && !p.consignPrice) {
        p.consignPrice = parseFloat(d.consignPrice) || 0;
      }

      // 补全买家保障
      if (d.yxScoreLevel) {
        p.yx_score_level = d.yxScoreLevel;
      }

      // 补全起订量
      if (d.minOrderQuantity) {
        p.moq = d.minOrderQuantity;
        p.minOrder = d.minOrderQuantity;
      }

      // 补全详情页链接（只写有效的标准URL，避免加密/跳转链接覆盖）
      const detailOfferId = d.offerId ? String(d.offerId) : '';
      const resolvedDetailUrl = d.detailUrl || d.detail_url || d.promotionUrl || '';
      const isValidDetailUrl = /^https?:\/\/detail\.1688\.com\/offer\/\d+\.html/.test(resolvedDetailUrl);
      if (isValidDetailUrl) {
        p.detail_url = resolvedDetailUrl;
        p.detailUrl = resolvedDetailUrl;
      } else if (detailOfferId && /^\d+$/.test(detailOfferId)) {
        // 仅当 offerId 为纯数字时才构造 detail.1688.com URL
        const builtUrl = `https://detail.1688.com/offer/${detailOfferId}.html`;
        p.detail_url = builtUrl;
        p.detailUrl = builtUrl;
      }
      // 如果 resolvedDetailUrl 不是标准格式且无法构造数字URL，保留搜索时的原值（可能为空）
      // 同时更新 id 和 productId（如果API返回了数字ID）
      if (detailOfferId && /^\d+$/.test(detailOfferId) && (!p.id || !/^\d+$/.test(String(p.id)))) {
        p.id = detailOfferId;
        p.productId = detailOfferId;
      }

      products[targetIdx] = p;
    }

    logger.info(`[enrich] 补全完成`);
  } catch (e: any) {
    logger.warn(`[enrich] 详情补全失败（非关键错误）: ${e.message}`);
  }

  return products;
}

/**
 * 搜索1688货源（使用主站关键词搜索接口 product.keyword.search）
 * 对齐Python参考项目 _sdk_search() + /search 端点逻辑
 */
export async function searchAlibabaProducts(
  userId: number,
  keyword: string,
  page: number = 1,
  pageSize: number = 20,
  filters: any = {}
): Promise<any> {
  try {
    logger.info(`搜索1688货源: keyword=${keyword}, page=${page}, pageSize=${pageSize}`);

    const token = await loadToken(userId);

    if (!token || !token.access_token) {
      return {
        success: false,
        message: '未配置1688授权Token，请先在设置页面完成授权',
        data: { items: [], total: 0, page, pageSize }
      };
    }

    // 使用智能关键词降级搜索（解决1688某些长/混合关键词返回 success=false 的问题）
    const searchResult = await tryKeywordSearchWithFallback(userId, keyword, page, pageSize);

    if (!searchResult) {
      return {
        success: true,
        message: '未找到相关商品',
        data: { items: [], total: 0, page, pageSize }
      };
    }

    const { data, isCrossSearch } = searchResult;
    let productsRaw: any[];
    let total: number;

    if (isCrossSearch) {
      productsRaw = extractCrossProductList(data);
      const r = data.result || {};
      total = r.totalCount || r.total || productsRaw.length;
    } else {
      productsRaw = extractProductsFromResponse(data);
      const pageInfo = (data.result && !Array.isArray(data.result) && data.result.pageInfo) || {};
      total = pageInfo.totalRecords || productsRaw.length;
    }

    logger.info(`关键词搜索解析到 ${productsRaw.length} 条商品`);

    if (!Array.isArray(productsRaw) || productsRaw.length === 0) {
      return {
        success: true,
        message: '未找到相关商品',
        data: { items: [], total: 0, page, pageSize }
      };
    }

    let formattedItems = parseProductList(productsRaw);

    // 按相关性排序，提升搜索质量
    formattedItems = filterRelevanceWithFallback(formattedItems, keyword);

    return {
      success: true,
      message: '搜索成功',
      data: { items: formattedItems, total, page, pageSize }
    };
  } catch (error: any) {
    logger.error('搜索1688货源失败:', error);
    return {
      success: false,
      message: `搜索失败: ${error.message}`,
      data: { items: [], total: 0, page, pageSize }
    };
  }
}

/**
 * 从 encryptPcUrl 静态解析数字offerId（无需HTTP请求）
 * 策略1: URL路径中直接包含 /offer/数字ID
 * 策略2: URL中解码后的query参数包含 /offer/数字ID
 * 策略3: URL query参数中有 offerId=数字ID
 */
function extractNumericIdFromEncryptPcUrl(encryptPcUrl: string): string {
  if (!encryptPcUrl) return '';

  // 策略1: URL路径中直接有 /offer/数字ID
  const directMatch = encryptPcUrl.match(/\/offer\/(\d+)\.html/);
  if (directMatch) return directMatch[1];

  // 策略2: URL decode后的参数中有 /offer/数字ID
  try {
    const decoded = decodeURIComponent(encryptPcUrl);
    const decodedMatch = decoded.match(/\/offer\/(\d+)\.html/);
    if (decodedMatch) return decodedMatch[1];
  } catch {}

  // 策略3: query参数中有 offerId
  try {
    const url = new URL(encryptPcUrl);
    const offerIdParam = url.searchParams.get('offerId') || url.searchParams.get('offer_id') || url.searchParams.get('id');
    if (offerIdParam && /^\d+$/.test(offerIdParam)) return offerIdParam;

    // 策略4: 遍历所有参数，找到值中包含 /offer/数字ID 的参数
    for (const [, val] of url.searchParams.entries()) {
      try {
        const decoded2 = decodeURIComponent(val);
        const m = decoded2.match(/\/offer\/(\d+)\.html/);
        if (m) return m[1];
        // 纯数字且长度合理（1688 offerId通常10-15位）
        if (/^\d{8,15}$/.test(decoded2)) return decoded2;
      } catch {}
    }
  } catch {}

  return '';
}

/**
 * 追踪 encryptPcUrl 重定向，获取真实商品详情页URL和数字offerId
 * 优先策略: 从URL静态解析（无需HTTP请求）
 * 降级策略: 追踪HTTP重定向（需服务器可访问1688）
 */
async function resolveEncryptPcUrl(encryptPcUrl: string): Promise<{ detailUrl: string; numericId: string } | null> {
  if (!encryptPcUrl) return null;

  // 优先：从URL本身静态提取数字ID（无需HTTP请求，最可靠）
  const staticId = extractNumericIdFromEncryptPcUrl(encryptPcUrl);
  if (staticId) {
    const detailUrl = `https://detail.1688.com/offer/${staticId}.html`;
    logger.info(`[detail] encryptPcUrl静态提取数字ID: ${staticId}`);
    return { detailUrl, numericId: staticId };
  }

  // 降级：HTTP追踪重定向（服务器侧可能因无登录态失败）
  try {
    const response = await fetch(encryptPcUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    const finalUrl = response.url;
    if (finalUrl && finalUrl.includes('detail.1688.com')) {
      const m = finalUrl.match(/\/offer\/(\d+)\.html/);
      if (m) {
        logger.info(`[detail] encryptPcUrl HTTP重定向解析成功: ${m[1]}`);
        return { detailUrl: finalUrl, numericId: m[1] };
      }
    }
    // HTTP追踪失败（如跳到wrongpage.html），返回null由上层处理
    logger.warn(`[detail] encryptPcUrl HTTP重定向未获得detail.1688.com URL, finalUrl=${finalUrl?.substring(0, 80)}`);
    return null;
  } catch (e: any) {
    logger.warn(`[detail] 追踪encryptPcUrl重定向失败: ${e.message}`);
    return null;
  }
}

/**
 * 获取商品详情（多接口fallback链）
 * 对齐Python参考项目 product detail fallback chain
 * 尝试1: product.search.queryProductDetail
 * 尝试2: AlibabaFenxiaoProductInfoGet (通过encryptPcUrl解析真实URL)
 * 尝试3: alibaba.product.get
 */
export async function getAlibabaProductDetail(userId: number, productId: string): Promise<any> {
  try {
    logger.info(`获取1688商品详情: productId=${productId}`);

    const token = await loadToken(userId);

    if (!token || !token.access_token) {
      logger.warn('未找到有效Token，无法获取1688商品详情');
      return { success: false, message: '未配置1688授权Token，请先在设置页面完成授权', data: null };
    }

    const isNumericId = /^\d+$/.test(productId);
    let detailData: any = null;
    const debugLogs: any[] = [];

    // ====== 尝试1: 跨境商详接口 (product.search.queryProductDetail) ======
    try {
      const paramKey = isNumericId ? 'offerId' : 'openOfferId';
      const params = {
        offerDetailParam: JSON.stringify({ [paramKey]: productId }),
        access_token: token.access_token,
      };
      const data = await call1688Api(userId, 'com.alibaba.fenxiao.crossborder', 'product.search.queryProductDetail', params);
      const result1 = data.result || {};
      debugLogs.push({ api: 'queryProductDetail', paramKey, success: result1.success, hasResult: !!result1.result });
      if (result1.success && result1.result) {
        const r1 = result1.result;
        // 提取多图：productImage.images
        const extractedImageUrls: string[] = [];
        const pImg = r1.productImage || {};
        if (Array.isArray(pImg.images)) {
          for (const u of pImg.images) {
            if (typeof u === 'string' && u && !extractedImageUrls.includes(u)) extractedImageUrls.push(u);
          }
        }
        detailData = { ...r1, imageUrls: extractedImageUrls };
        logger.info(`[detail] success via queryProductDetail, ${paramKey}=${productId}, images=${extractedImageUrls.length}`);
      }
    } catch (e: any) {
      debugLogs.push({ api: 'queryProductDetail', error: e.message });
      logger.warn(`[detail] queryProductDetail failed: ${e.message}`);
    }

    // ====== 尝试2: 分销详情接口 (AlibabaFenxiaoProductInfoGet) ======
    // 对 openOfferId 特别有效：通过 encryptPcUrl 重定向解析真实数字ID
    if (!detailData) {
      try {
        const params2 = {
          offerId: isNumericId ? productId : '0',
          openOfferId: isNumericId ? '' : productId,
          access_token: token.access_token,
        };
        const data2 = await call1688Api(userId, 'com.alibaba.fenxiao', 'AlibabaFenxiaoProductInfoGet', params2);
        debugLogs.push({ api: 'AlibabaFenxiaoProductInfoGet', hasProductInfo: !!data2.productInfo });
        const pi = data2.productInfo || {};
        if (pi && Object.keys(pi).length > 0) {
          // 追踪 encryptPcUrl 重定向获取数字ID和正确链接
          let numericId = '';
          let detailUrl = '';
          const productUrl = pi.productUrl || {};
          const encryptPc = typeof productUrl === 'object' ? (productUrl.encryptPcUrl || '') : '';
          if (encryptPc) {
            const resolved = await resolveEncryptPcUrl(encryptPc);
            if (resolved) {
              detailUrl = resolved.detailUrl;
              numericId = resolved.numericId;
              logger.info(`[detail] encryptPcUrl resolved: numericId=${numericId}, url=${detailUrl}`);
            } else {
              // 服务器端无法解析encryptPcUrl（需要浏览器登录态）
              // 不要直接把加密链接返回给前端，因为它在浏览器中也无法直接访问（会404）
              // detailUrl 保持为空，让前端 openProductUrl 走其他逻辑处理
              logger.info(`[detail] encryptPcUrl 无法解析，detailUrl留空待前端处理: ${encryptPc.substring(0, 80)}...`);
            }
          }

          // 价格
          let price = 0;
          const saleInfo = pi.productSaleInfo || {};
          if (typeof saleInfo === 'object') {
            const ranges = saleInfo.priceRanges || [];
            if (Array.isArray(ranges) && ranges.length > 0) {
              price = parseFloat(ranges[0].price || 0) || 0;
            }
          }
          if (!price) {
            price = parseFloat(pi.referencePrice || 0) || 0;
          }

          // 图片
          const imageUrls: string[] = [];
          const imgInfo = pi.productImage || {};
          if (typeof imgInfo === 'object' && Array.isArray(imgInfo.images)) {
            for (const u of imgInfo.images) {
              if (typeof u === 'string' && u && !imageUrls.includes(u)) imageUrls.push(u);
            }
          }

          detailData = {
            offerId: numericId || productId,
            subject: pi.subject || '',
            description: pi.description || '',
            price,
            imageUrls,
            detailUrl,
            detail_url: detailUrl,
            minOrderQuantity: (typeof saleInfo === 'object' ? saleInfo.minOrderQuantity : null) || 1,
            supplierInfo: { companyName: pi.supplierLoginId || '' },
            categoryId: pi.categoryID || '',
            categoryName: pi.categoryName || '',
            _from_fenxiao_api: true,
          };
          logger.info(`[detail] success via AlibabaFenxiaoProductInfoGet, numericId=${numericId}, productId=${productId}`);
        }
      } catch (e: any) {
        debugLogs.push({ api: 'AlibabaFenxiaoProductInfoGet', error: e.message });
        logger.warn(`[detail] AlibabaFenxiaoProductInfoGet failed: ${e.message}`);
      }
    }

    // ====== 尝试3: 通用商品接口 (alibaba.product.get) ======
    if (!detailData) {
      try {
        const params3 = {
          productId,
          access_token: token.access_token,
        };
        const data3 = await call1688Api(userId, 'com.alibaba.product', 'alibaba.product.get', params3);
        debugLogs.push({ api: 'alibaba.product.get', hasResult: !!data3 });
        if (data3 && data3.productInfo) {
          const pi = data3.productInfo;
          detailData = {
            offerId: pi.id || productId,
            subject: pi.subject || '',
            description: pi.description || '',
            categoryId: pi.categoryID || '',
          };
          logger.info(`[detail] success via alibaba.product.get`);
        }
      } catch (e: any) {
        debugLogs.push({ api: 'alibaba.product.get', error: e.message });
        logger.warn(`[detail] alibaba.product.get failed: ${e.message}`);
      }
    }

    // 返回结果
    if (detailData) {
      const resolvedOfferId = detailData.offerId || detailData.id || '';
      // 对齐测试项目：不过滤URL，直接返回API给出的原始URL
      // 浏览器有1688登录态时，加密/跳转链接也能正确解析
      let resolvedUrl = detailData.detailUrl || detailData.detail_url || '';
      if (!resolvedUrl && resolvedOfferId && /^\d+$/.test(resolvedOfferId)) {
        resolvedUrl = `https://detail.1688.com/offer/${resolvedOfferId}.html`;
      }
      // 真实图片：imageUrls（详情接口字段）优先；否则降级到mock
      const realImages: string[] = (detailData.imageUrls && detailData.imageUrls.length > 0)
        ? detailData.imageUrls
        : [];
      return {
        success: true,
        message: '获取成功',
        data: {
          ...detailData,
          productId: resolvedOfferId || productId,
          id: resolvedOfferId || productId,
          offerId: resolvedOfferId || undefined,
          detailUrl: resolvedUrl,
          detail_url: resolvedUrl,
          images: realImages,
        }
      };
    }

    // ====== 降级：从搜索缓存获取基础信息（对齐测试项目 _get_cached_product） ======
    const cached = getCachedProduct(productId);
    if (cached) {
      logger.info(`[detail] 详情API均未返回，从搜索缓存降级返回基础信息，productId=${productId}`);
      return { success: true, message: '从搜索缓存获取基础信息', data: buildDetailFromCache(cached) };
    }

    logger.warn(`[detail] 所有详情接口均未返回数据且无缓存，debug=${JSON.stringify(debugLogs)}`);
    return { success: false, message: '获取详情失败，且搜索缓存中没有可用基础信息', data: null };
  } catch (error: any) {
    logger.error('获取1688商品详情失败:', error);
    // catch中也尝试缓存降级
    const cached = getCachedProduct(productId);
    if (cached) {
      logger.info(`[detail] 异常后从搜索缓存降级，productId=${productId}`);
      return { success: true, message: '从搜索缓存获取基础信息', data: buildDetailFromCache(cached) };
    }
    return { success: false, message: `获取详情失败: ${error.message}`, data: null };
  }
}

/**
 * 获取供应商信息
 * @param supplierId - 供应商ID
 * @returns 供应商信息
 */
export async function getSupplierInfo(supplierId: string): Promise<any> {
  try {
    logger.info(`获取供应商信息: supplierId=${supplierId}`);
    return {
      success: false,
      message: '供应商详情接口尚未接入真实1688数据源',
      data: null
    };
  } catch (error: any) {
    logger.error('获取供应商信息失败:', error);
    throw new Error(`获取供应商失败: ${error.message}`);
  }
}

/**
 * 批量获取商品信息
 * @param productIds - 商品ID列表
 * @returns 商品信息列表
 */
export async function batchGetAlibabaProducts(userId: number, productIds: string[]): Promise<any[]> {
  try {
    logger.info(`批量获取1688商品信息: productIds=${productIds}`);

    const results = await Promise.all(
      productIds.map(id => getAlibabaProductDetail(userId, id))
    );

    return results.map(r => ({
      success: r.success,
      data: r.data
    }));
  } catch (error: any) {
    logger.error('批量获取1688商品信息失败:', error);
    throw new Error(`批量获取失败: ${error.message}`);
  }
}

const MAX_IMAGE_SEARCH_BYTES = 8 * 1024 * 1024;

const normalizeImageSearchUrl = (value?: string): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw, 'http://localhost');
    if (parsed.pathname === '/api/images/proxy') {
      return parsed.searchParams.get('url') || raw;
    }
  } catch {
  }
  return raw;
};

const getImageFetchReferer = (imageUrl: string): string => {
  try {
    const parsed = new URL(imageUrl);
    if (/(^|\.)alicdn\.com$/i.test(parsed.hostname)) return 'https://detail.1688.com/';
  } catch {
  }
  return 'https://www.ozon.ru/';
};

const fetchImageAsBase64 = async (imageUrl: string): Promise<string> => {
  const normalizedUrl = normalizeImageSearchUrl(imageUrl);
  const parsed = new URL(normalizedUrl);
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error('图片地址不是有效的公网URL');
  }
  const response = await fetch(normalizedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Referer': getImageFetchReferer(normalizedUrl),
    },
  });
  if (!response.ok) {
    throw new Error(`图片下载失败: HTTP ${response.status}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !contentType.startsWith('image/')) {
    throw new Error('远程地址不是图片');
  }
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_IMAGE_SEARCH_BYTES) {
    throw new Error('图片过大');
  }
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_SEARCH_BYTES) {
    throw new Error('图片过大');
  }
  return Buffer.from(arrayBuffer).toString('base64');
};

/**
 * 搜同款 - 基于图片URL搜索同款商品
 * 对齐Python参考项目 _sdk_image_search：使用 ProductSearchImageQueryBasicParam
 * 接口: product.search.imageQueryBasic
 * 参数: searchParam = JSON.stringify({ imageAddress, beginPage, pageSize })
 * 注意：imageUrl必须是公网可访问地址（不能是localhost/内网IP）
 */
export async function searchSimilarProductsByImage(
  userId: number,
  imageUrl?: string,
  imageBase64?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<any> {
  try {
    const normalizedImageUrl = normalizeImageSearchUrl(imageUrl);
    logger.info(`搜同款: imageUrl=${normalizedImageUrl}, page=${page}, pageSize=${pageSize}`);

    const token = await loadToken(userId);

    if (!token || !token.access_token) {
      return {
        success: false,
        message: '未配置1688授权Token，请先在设置页面完成授权',
        data: { items: [], total: 0, page, pageSize }
      };
    }

    if (!normalizedImageUrl && !imageBase64) {
      return {
        success: false,
        message: '请提供图片URL或Base64数据',
        data: { items: [], total: 0, page, pageSize }
      };
    }

    try {
      // === 对齐原项目：使用 imageQueryBasic + searchParam + imageAddress ===
      const imagePayload: Record<string, any> = { beginPage: page, pageSize };
      // 原项目用的是 imageAddress，不是 imageUrl
      if (normalizedImageUrl) imagePayload.imageAddress = normalizedImageUrl;
      if (imageBase64) imagePayload.imgBase64 = imageBase64;

      // 对齐SDK: need_timestamp=false, 不需要 _aop_timestamp
      const params: Record<string, any> = {
        searchParam: JSON.stringify(imagePayload),
        access_token: token.access_token,
      };

      const data = await call1688Api(
        userId,
        'com.alibaba.fenxiao.crossborder',
        'product.search.imageQueryBasic',
        params
      );

      // === 对齐原项目 _parse_image_search_response 解析逻辑 ===
      const resultInfo = data.result || {};
      const successCode = String(resultInfo.code || '');
      const isSuccess = resultInfo.success === true && (successCode === '200' || successCode === 'SUCCESS');

      if (!isSuccess) {
        const msg = resultInfo.message || resultInfo.msg || resultInfo.sub_msg || '未知错误';
        const code = resultInfo.code !== undefined ? String(resultInfo.code) : (resultInfo.error_code || 'unknown');
        // 打印完整响应用于排查
        logger.warn(`[image-search] 1688跨境图搜返回非成功: code=${code}, msg=${msg}`);
        logger.warn(`[image-search] resultInfo完整内容: ${JSON.stringify(resultInfo).substring(0, 2000)}`);
        logger.warn(`[image-search] data完整键: ${Object.keys(data).join(',')}`);
        throw new Error(`图搜API返回错误: code=${code}, msg=${msg}`);
      }

      // 图搜result可能分两种格式：
      // 1. 有结果时 resultInfo.result 是商品列表
      // 2. 无结果时 resultInfo.result 是分页对象 {"totalRecords": 0, ...}
      const inner = resultInfo.result || {};
      let productsRaw: any[] = [];
      let rawTotal = 0;
      if (Array.isArray(inner)) {
        productsRaw = inner;
        rawTotal = productsRaw.length;
      } else if (typeof inner === 'object' && inner !== null) {
        productsRaw = Array.isArray(inner.result) ? inner.result : [];
        rawTotal = inner.totalRecords || productsRaw.length;
      }

      logger.info(`跨境图搜解析到 ${productsRaw.length} 条商品`);

      if (!Array.isArray(productsRaw) || productsRaw.length === 0) {
        throw new Error('跨境图搜返回空数据');
      }

      let formattedItems = parseProductList(productsRaw);

      // 图搜API返回字段较少，用商品详情接口补全质量评分、公司信息等
      formattedItems = await enrichProductsWithDetail(userId, formattedItems);

      return {
        success: true,
        message: '搜同款成功',
        data: { items: formattedItems, total: rawTotal, page, pageSize }
      };
    } catch (e: any) {
      logger.warn(`跨境图搜失败，降级到公开图搜接口: ${e.message}`);
      if (normalizedImageUrl && !imageBase64) {
        try {
          logger.warn('[image-search] URL图搜失败，尝试下载图片并使用Base64重试跨境图搜');
          const retryBase64 = await fetchImageAsBase64(normalizedImageUrl);
          const retryPayload: Record<string, any> = {
            beginPage: page,
            pageSize,
            imgBase64: retryBase64,
          };
          const retryData = await call1688Api(
            userId,
            'com.alibaba.fenxiao.crossborder',
            'product.search.imageQueryBasic',
            {
              searchParam: JSON.stringify(retryPayload),
              access_token: token.access_token,
            }
          );
          const retryResultInfo = retryData.result || {};
          const retryCode = String(retryResultInfo.code || '');
          const retrySuccess = retryResultInfo.success === true && (retryCode === '200' || retryCode === 'SUCCESS');
          if (!retrySuccess) {
            const retryMsg = retryResultInfo.message || retryResultInfo.msg || retryResultInfo.sub_msg || '未知错误';
            throw new Error(`Base64图搜API返回错误: code=${retryCode || 'unknown'}, msg=${retryMsg}`);
          }
          const retryInner = retryResultInfo.result || {};
          const retryProductsRaw = Array.isArray(retryInner)
            ? retryInner
            : (Array.isArray(retryInner.result) ? retryInner.result : []);
          const retryTotal = Array.isArray(retryInner) ? retryProductsRaw.length : (retryInner.totalRecords || retryProductsRaw.length);
          if (retryProductsRaw.length > 0) {
            let retryItems = parseProductList(retryProductsRaw);
            retryItems = await enrichProductsWithDetail(userId, retryItems);
            return {
              success: true,
              message: '搜同款成功（Base64重试）',
              data: { items: retryItems, total: retryTotal, page, pageSize }
            };
          }
          throw new Error('Base64图搜返回空数据');
        } catch (retryError: any) {
          logger.warn(`[image-search] Base64重试失败: ${retryError.message}`);
        }
      }
      // 降级到公开图片相似搜接口
      let fallbackError = '';
      try {
        const params2: Record<string, any> = {
          access_token: token.access_token,
        };
        // 公开图搜参数是扁平的，字段名是 imgUrl（不是 imageUrl）
        if (normalizedImageUrl) params2.imgUrl = normalizedImageUrl;
        if (imageBase64) params2.imgBase64 = imageBase64;

        const data2 = await call1688Api(
          userId,
          'com.alibaba.product',
          'alibaba.public.image.similar.offer.search',
          params2
        );

        const productsRaw2 = extractProductsFromResponse(data2);
        logger.info(`公开图搜解析到 ${productsRaw2.length} 条商品`);

        if (Array.isArray(productsRaw2) && productsRaw2.length > 0) {
          let formattedItems2 = parseProductList(productsRaw2);
          // 补全商品详情
          formattedItems2 = await enrichProductsWithDetail(userId, formattedItems2);
          return {
            success: true,
            message: '搜同款成功（公开图搜）',
            data: { items: formattedItems2, total: productsRaw2.length, page, pageSize }
          };
        } else {
          fallbackError = '公开图搜返回空结果';
        }
      } catch (e2: any) {
        fallbackError = e2.message;
        logger.error(`公开图搜也失败: ${e2.message}`);
      }

      return {
        success: false,
        message: `图搜失败: ${e.message}${fallbackError ? ' (降级: ' + fallbackError + ')' : ''}`,
        data: { items: [], total: 0, page, pageSize }
      };
    }
  } catch (error: any) {
    logger.error('搜同款失败:', error);
    return {
      success: false,
      message: `搜同款失败: ${error.message}`,
      data: { items: [], total: 0, page, pageSize }
    };
  }
}

/**
 * 从商品名称中提取可用于1688搜索的关键词
 *
 * 【重要】fenxiao 分销版搜索（核心策略）对关键词极敏感：
 *   - 只接受 2-4 字简短中文核心词（如"耳机""蓝牙耳机"）
 *   - 超过4字（如"耳机带麦克风"）、含英文（如"Honor 耳机"）均返回0结果
 *   - 主站搜索（兜底策略）对关键词更宽容
 *
 * 策略：短核心词优先（供fenxiao使用），完整候选在后（供主站回退）
 */
function extractSearchKeywords(name: string): string[] {
  const raw = name.trim();
  if (!raw) return [''];

  // 提取中文片段
  const chineseSegments = raw.match(/[\u4e00-\u9fff]+/g);
  const chineseStr = chineseSegments ? chineseSegments.join('') : '';

  // 提取英文/数字片段（型号、品牌等）
  const englishMatches = raw.match(/[a-zA-Z][a-zA-Z0-9\-]*/g);
  const englishStr = englishMatches ? englishMatches.join(' ') : '';

  // 描述性后缀词（颜色/尺寸/材质/场景等 - 不应作为核心搜索词）
  const descriptors = [
    '浅绿色', '深绿色', '浅蓝色', '深蓝色', '浅红色', '深红色', '浅黄色', '深黄色',
    '浅灰色', '深灰色', '浅紫色', '深紫色', '浅粉色', '深粉色',
    '黑色', '白色', '红色', '蓝色', '绿色', '黄色', '紫色', '粉色', '灰色', '橙色', '棕色', '金色', '银色', '透明', '彩色', '迷彩', '纯色',
    '大号', '中号', '小号', '加大', '加长', '超大', '迷你', '微型', '小型', '大型',
    '塑料', '金属', '硅胶', '橡胶', '尼龙', '布艺', '皮革', '铝合金', '不锈钢',
    '新款', '经典', '时尚', '商务', '运动', '游戏', '电竞', '专业', '家用', '办公', '户外', '便携', '无线', '有线'
  ];

  // 非品类功能词（像"带麦克风""带灯""带锁"等"带X"模式，不是品类词）
  const nonCategoryWords = ['带麦克风', '带话筒', '带灯', '带锁', '带盖', '带轮'];

  // === 步骤1: 提取核心品类词 ===
  // 从所有中文片段中找最可能的品类词（而不是只从末尾取）
  // 品类词特征：2-4字、非描述词、非功能词、靠近产品名末尾
  const coreCategoryTerms: string[] = [];
  if (chineseSegments && chineseSegments.length > 0) {
    // 收集所有有效的非描述词片段（跳过单字片段）
    const validSegments: { seg: string; index: number }[] = [];
    for (let i = 0; i < chineseSegments.length; i++) {
      const seg = chineseSegments[i];
      if (descriptors.includes(seg)) continue;
      if (nonCategoryWords.includes(seg)) continue;
      if (seg.length < 2) continue; // 跳过单字片段
      validSegments.push({ seg, index: i });
    }

    // 优选2-4字完整片段作为品类词，同时对长片段提取末尾短词
    const shortValid = validSegments.filter(s => s.seg.length >= 2 && s.seg.length <= 4);
    const longValid = validSegments.filter(s => s.seg.length > 4);

    // 先处理长片段：提取末尾2字作为品类候选（如"蓝牙无线耳机"→"耳机"、"休闲皮鞋"→"皮鞋"）
    // 只提取2字，避免"线耳机""闲皮鞋"等无意义3字组合
    for (const { seg } of longValid) {
      const core = seg.slice(-2);
      if (core.length >= 2 && !descriptors.includes(core) && !coreCategoryTerms.includes(core)) {
        coreCategoryTerms.push(core);
      }
    }

    // 再处理短片段（2-4字完整片段），按位置倒序排列
    const candidateSegments = [...shortValid].sort((a, b) => b.index - a.index);
    for (const { seg } of candidateSegments) {
      if (!coreCategoryTerms.includes(seg)) {
        coreCategoryTerms.push(seg);
      }
    }

    // 如果短片段也没有，用所有有效片段（按位置倒序）
    if (coreCategoryTerms.length === 0) {
      for (const { seg } of validSegments.sort((a, b) => b.index - a.index)) {
        if (!coreCategoryTerms.includes(seg)) {
          coreCategoryTerms.push(seg);
        }
      }
    }

    // 添加修饰词+品类词组合（如"蓝牙"+耳机="蓝牙耳机"）
    if (coreCategoryTerms.length > 0) {
      const mainCore = coreCategoryTerms[0]; // 最短核心词
      // 找到包含这个核心词的片段在原数组中的位置
      let coreIndex = -1;
      for (let i = chineseSegments.length - 1; i >= 0; i--) {
        if (chineseSegments[i].includes(mainCore)) {
          coreIndex = i;
          break;
        }
      }
      if (coreIndex > 0) {
        const prevSeg = chineseSegments[coreIndex - 1];
        if (!descriptors.includes(prevSeg) && !nonCategoryWords.includes(prevSeg) && prevSeg.length >= 2) {
          const combined = prevSeg + chineseSegments[coreIndex];
          if (combined.length <= 6 && !coreCategoryTerms.includes(combined)) {
            coreCategoryTerms.push(combined);
          }
        }
      }
    }

    // 最终回退：如果完全没有提取到品类词
    if (coreCategoryTerms.length === 0) {
      for (const seg of chineseSegments) {
        if (!descriptors.includes(seg) && seg.length >= 2) {
          if (!coreCategoryTerms.includes(seg)) {
            coreCategoryTerms.push(seg);
          }
        }
      }
    }
  }

  // === 步骤2: 构建候选列表（fenxiao友好的短词优先）===
  const candidates: string[] = [];

  // 优先级1: 核心品类词（2字优先，fenxiao最友好；其次3字）
  const sortedCores = [...coreCategoryTerms].sort((a, b) => {
    // 2字词优先级最高（最常见的品类词：耳机、皮鞋、手表、手机等）
    // 3字词其次（充电线、连衣裙、手机壳等）
    const scoreA = a.length === 2 ? 0 : a.length === 3 ? 1 : a.length;
    const scoreB = b.length === 2 ? 0 : b.length === 3 ? 1 : b.length;
    return scoreA - scoreB;
  });
  for (const term of sortedCores) {
    if (!candidates.includes(term)) {
      candidates.push(term);
    }
  }

  // 优先级2: 核心品类词 + 英文品牌名（主站友好）
  if (coreCategoryTerms.length > 0 && englishMatches && englishMatches.length > 0) {
    const brand = englishMatches[0]; // 第一个英文词通常是品牌
    const core = sortedCores[0];
    if (core && brand.length <= 15) {
      const brandCore = `${brand} ${core}`;
      if (!candidates.includes(brandCore)) {
        candidates.push(brandCore);
      }
    }
  }

  // 优先级3: 去掉描述词后的中文核心（主站友好）
  let withoutDesc = chineseStr;
  for (let i = 0; i < 5; i++) {
    let removed = false;
    for (const desc of descriptors) {
      if (withoutDesc.endsWith(desc)) {
        withoutDesc = withoutDesc.slice(0, -desc.length);
        removed = true;
        break;
      }
    }
    if (!removed) break;
  }
  withoutDesc = withoutDesc.trim();
  if (withoutDesc && withoutDesc.length >= 2 && !candidates.includes(withoutDesc)) {
    candidates.push(withoutDesc);
  }

  // 优先级4: 核心品类词较短组合（fenxiao备用）
  // 如"蓝牙耳机"（修饰词+品类词）
  for (const term of coreCategoryTerms) {
    if (term.length >= 3 && term.length <= 6 && !candidates.includes(term)) {
      // 已在上面的 sortedCores 中处理过了，这里跳过
    }
  }

  // 优先级5: 纯中文完整字符串
  if (chineseStr && !candidates.includes(chineseStr) && chineseStr !== raw) {
    candidates.push(chineseStr);
  }

  // 优先级6: 中文+英文混合
  const mixed = (chineseStr + (englishStr ? ' ' + englishStr : '')).trim();
  if (mixed && !candidates.includes(mixed) && mixed !== raw) {
    candidates.push(mixed);
  }

  // 优先级7: 原始完整名称（最后兜底）
  if (!candidates.includes(raw)) {
    candidates.push(raw);
  }

  // 过滤无意义关键词
  return candidates.filter(c => {
    if (!c || c.trim().length === 0) return false;
    if (descriptors.includes(c.trim())) return false;
    if (c.trim().length < 2) return false;
    return true;
  });
}

/**
 * 按相关性对搜索结果排序
 * 标题包含越多原始关键词的，排名越靠前
 */
function filterRelevanceWithFallback(products: any[], originalKeyword: string): any[] {
  const keywordLower = originalKeyword.toLowerCase();
  const keywordChinese = (originalKeyword.match(/[\u4e00-\u9fff]+/g) || []).join('');
  // 动态提取所有2字+中文词作为匹配特征（不再硬编码品类词）
  const keywordSegs = originalKeyword.match(/[\u4e00-\u9fff]{2,}/g) || [];

  // 动态提取核心关键词（末尾2-3字，通常是品类词如"耳机""衣服""充电器"等）
  let coreTerms: string[] = [];
  if (keywordChinese.length >= 2) {
    for (const len of [3, 2]) {
      if (keywordChinese.length >= len) {
        coreTerms.push(keywordChinese.slice(-len));
      }
    }
  }

  // 从原始关键词中提取英文/数字型号词
  const modelMatches = originalKeyword.match(/[a-zA-Z0-9]{2,}/g) || [];
  const modelTerms = modelMatches.filter(m => !/^\d+$/.test(m)); // 排除纯数字

  // 打分 + 排序；先把高相关结果排前面，再按可用数量决定是否过滤。
  const scoredProducts = [...products]
    .map(p => {
      const title = (p.subject || p.name || p.productTitle || '').toLowerCase();
      const titleCh = (title.match(/[\u4e00-\u9fff]+/g) || []).join('');

      let score = 0;

      // 完整关键词匹配（最高权重）
      if (title.includes(keywordLower)) score += 30;
      if (keywordChinese && titleCh.includes(keywordChinese)) score += 20;

      // 动态核心词匹配（品类词，如末尾2-3字）
      for (const term of coreTerms) {
        if (titleCh.includes(term)) score += 5;
      }

      // 型号词匹配（品牌/型号信息）
      for (const term of modelTerms) {
        if (title.includes(term.toLowerCase())) score += 3;
      }

      // 中文分词匹配（每个2字+中文词）
      for (const seg of keywordSegs) {
        if (titleCh.includes(seg)) score += 2;
      }

      return { ...p, _score: score };
    })
    .sort((a, b) => {
      if (a._score === b._score) {
        const salesA = parseInt(a.saleQuantity || a.sales || 0);
        const salesB = parseInt(b.saleQuantity || b.sales || 0);
        return salesB - salesA;
      }
      return b._score - a._score;
    });

  const matchedProducts = scoredProducts.filter(p => p._score >= 2);
  if (matchedProducts.length > 0) {
    return matchedProducts.map(({ _score, ...product }) => product);
  }

  logger.warn(`[1688搜索] 相关性过滤后无匹配结果，丢弃 ${products.length} 条疑似随机结果`);
  return [];
}

/**
 * 从跨境搜索接口响应中提取商品列表
 * alibaba.cross.product.search 返回真实数字offerId，
 * 响应结构：{ result: { data: [...], totalCount, ... } } 或 { result: [...] }
 */
function extractCrossProductList(data: any): any[] {
  const r = data.result || {};
  // 结构1: { result: { data: [...] } }
  if (Array.isArray(r.data)) return r.data;
  // 结构2: { result: { result: [...] } }
  if (Array.isArray(r.result)) return r.result;
  // 结构3: result 直接是数组
  if (Array.isArray(r)) return r;
  // 结构4: productList
  if (Array.isArray(r.productList)) return r.productList;
  if (Array.isArray(r.offerList)) return r.offerList;
  return [];
}

/**
 * 尝试用多个降级关键词搜索，返回第一个成功的结果
 *
 * 策略优先级设计（按能否直接获取数字offerId排序）：
 *
 *   策略1: alibaba.cross.product.search（跨境接口）
 *     - 返回真实数字offerId，可直接构造 detail.1688.com URL
 *     - 本AppKey无此权限，通常跳过
 *
 *   策略2: com.alibaba.fenxiao/product.keywords.search（分销版词搜）★ 核心策略
 *     - 返回数字offerId，可直接构造商品链接，无需额外API解析
 *     - 仅使用GET方式（POST已确认会忽略关键词返回随机热门商品）
 *
 *   策略3: product.keyword.search（主站通用搜索）★ 最后兜底
 *     - 仅返回加密 openOfferId，不返回 detailUrl、不返回数字 offerId
 *     - 需要 AlibabaFenxiaoProductInfoGet 才能解析加密ID，但本AppKey(2613751)无此权限
 *     - 因此主站搜索结果中的商品链接会使用加密ID构造，点击会404
 *     - 仅当分销版搜索完全不可用时才作为兜底
 */
async function tryKeywordSearchWithFallback(
  userId: number,
  keyword: string,
  page: number,
  pageSize: number
): Promise<{ data: any; usedKeyword: string; isCrossSearch?: boolean; isFenxiaoSearch?: boolean } | null> {
  const candidates = extractSearchKeywords(keyword);
  logger.info(`[1688搜索] 关键词候选: ${candidates.map(k => `"${k}"`).join(' -> ')}`);

  const token = await loadToken(userId);
  const accessToken = token?.access_token || '';

  // === 策略1：分销版词搜（返回数字offerId，可直接构造URL）★ 核心策略 ===
  // 注意：已跳过跨境接口(alibaba.cross.product.search)，该AppKey无此权限，始终返回Unsupport API
  logger.info('[1688搜索] 尝试分销版关键词搜索');
  for (const kw of candidates) {
    try {
      const searchPayload = { keywords: kw, beginPage: page, pageSize };
      const params: Record<string, any> = {
        param: JSON.stringify(searchPayload),
        access_token: accessToken,
      };

      // 仅使用GET。POST已确认可能忽略关键词返回随机热门商品，不能作为同类搜索兜底。
      let data: any;
      try {
        data = await call1688ApiGet(userId, 'com.alibaba.fenxiao', 'product.keywords.search', params);
      } catch (getErr: any) {
        logger.warn(`[1688搜索] 分销版GET失败: ${getErr.message}，继续下一个候选`);
        continue;
      }

      const resultInfo = data.result || {};
      // DEBUG: 查看分销版API实际返回结构
      const methodLabel = 'GET';
      logger.info(`[1688搜索][FENXIAO_DEBUG/${methodLabel}] 关键词="${kw}" resultInfo keys: ${Object.keys(resultInfo).join(',')}`);
      logger.info(`[1688搜索][FENXIAO_DEBUG/${methodLabel}] 关键词="${kw}" resultInfo.success=${resultInfo.success}, type=${typeof resultInfo.success}`);
      if (resultInfo.result) {
        logger.info(`[1688搜索][FENXIAO_DEBUG/${methodLabel}] 关键词="${kw}" resultInfo.result is Array: ${Array.isArray(resultInfo.result)}, length: ${Array.isArray(resultInfo.result) ? resultInfo.result.length : 'N/A'}`);
      } else {
        logger.info(`[1688搜索][FENXIAO_DEBUG/${methodLabel}] 关键词="${kw}" resultInfo.result 不存在或为空`);
      }
      // 打印 pageInfo 查看 totalCount
      if (resultInfo.pageInfo) {
        logger.info(`[1688搜索][FENXIAO_DEBUG/${methodLabel}] 关键词="${kw}" pageInfo: ${JSON.stringify(resultInfo.pageInfo)}`);
      } else {
        logger.info(`[1688搜索][FENXIAO_DEBUG/${methodLabel}] 关键词="${kw}" pageInfo 不存在`);
      }
      // 打印完整 resultInfo（截断到1500字符）
      logger.info(`[1688搜索][FENXIAO_DEBUG/${methodLabel}] 关键词="${kw}" 完整resultInfo: ${JSON.stringify(resultInfo).substring(0, 1500)}`);
      const productsRaw = resultInfo.success ? (resultInfo.result || []) : [];

      if (resultInfo.success === true && Array.isArray(productsRaw) && productsRaw.length > 0) {
        logger.info(`[1688搜索] 分销版接口 关键词 "${kw}" 搜索成功，返回 ${productsRaw.length} 条`);
        if (productsRaw[0]) {
          logger.info(`[1688搜索][DEBUG] 分销版接口第一条: ${JSON.stringify(productsRaw[0]).substring(0, 800)}`);
        }
        return { data, usedKeyword: kw, isCrossSearch: false, isFenxiaoSearch: true };
      }

      logger.info(`[1688搜索] 分销版接口 关键词 "${kw}" 返回空或失败，继续降级`);
    } catch (e: any) {
      logger.warn(`[1688搜索] 分销版接口 关键词 "${kw}" 搜索异常: ${e.message}`);
    }
  }

  // === 策略3：主站关键词搜索（仅返回加密openOfferId，无法解析为有效URL，最后兜底）===
  logger.info('[1688搜索] 分销版全部失败，降级到主站关键词搜索（注意：结果中的商品链接将无法点击）');
  for (const kw of candidates) {
    try {
      const searchPayload = { keywords: kw, beginPage: page, pageSize };
      const params: Record<string, any> = {
        param: JSON.stringify(searchPayload),
        access_token: accessToken,
      };

      const data = await call1688Api(userId, 'com.alibaba.product', 'product.keyword.search', params);
      const resultInfo = data.result || {};
      const productsRaw = resultInfo.success ? (resultInfo.result || []) : [];

      if (resultInfo.success === true && Array.isArray(productsRaw) && productsRaw.length > 0) {
        logger.info(`[1688搜索] 主站接口 关键词 "${kw}" 搜索成功，返回 ${productsRaw.length} 条`);
        if (productsRaw[0]) {
          logger.info(`[1688搜索][DEBUG] 主站接口第一条原始数据: ${JSON.stringify(productsRaw[0]).substring(0, 800)}`);
        }
        logger.warn(`[1688搜索] ⚠️ 主站搜索结果使用加密openOfferId构造URL，点击将404。请检查AppKey是否具备AlibabaFenxiaoProductInfoGet权限`);
        return { data, usedKeyword: kw, isCrossSearch: false };
      }

      logger.info(`[1688搜索] 主站接口 关键词 "${kw}" 返回空或失败，继续降级`);
    } catch (e: any) {
      logger.warn(`[1688搜索] 主站接口 关键词 "${kw}" 搜索异常: ${e.message}`);
    }
  }

  return null;
}

/**
 * 搜同类 - 基于关键词搜索同类商品
 * 对齐Python参考项目 _sdk_search：使用 product.keyword.search 主站接口
 * 由于Ozon商品没有1688的offerId，无法使用CPS推荐接口，
 * 因此直接用商品名作为关键词调用主站搜索接口。
 * 
 * 增强：智能关键词提取 + 降级搜索（应对1688某些混合/长词组合返回success=false的情况）
 */
export async function searchRecommendSameProducts(
  userId: number,
  keyword: string,
  page: number = 1,
  pageSize: number = 20
): Promise<any> {
  try {
    logger.info(`搜同类: keyword=${keyword}, page=${page}, pageSize=${pageSize}`);

    const token = await loadToken(userId);

    if (!token || !token.access_token) {
      return {
        success: false,
        message: '未配置1688授权Token，请先在设置页面完成授权',
        data: { items: [], total: 0, page, pageSize }
      };
    }

    if (!keyword || !keyword.trim()) {
      return {
        success: false,
        message: '商品名称为空，无法搜索同类商品',
        data: { items: [], total: 0, page, pageSize }
      };
    }

    const result = await tryKeywordSearchWithFallback(userId, keyword, page, pageSize);

    if (!result) {
      return {
        success: true,
        message: '未找到相关商品',
        data: { items: [], total: 0, page, pageSize }
      };
    }

    const { data, usedKeyword, isCrossSearch } = result;
    let productsRaw: any[];
    let total: number;

    if (isCrossSearch) {
      // 跨境接口：直接从响应中提取商品列表
      productsRaw = extractCrossProductList(data);
      const r = data.result || {};
      total = r.totalCount || r.total || productsRaw.length;
    } else {
      // 主站接口
      const resultInfo = data.result || {};
      productsRaw = resultInfo.result || [];
      const pageInfo = resultInfo.pageInfo || {};
      total = pageInfo.totalRecords || productsRaw.length;
    }

    let formattedItems = parseProductList(productsRaw);

    // enrichProductsWithDetail 对所有有ID的商品（包括加密openOfferId）尝试补全
    // 通过 getAlibabaProductDetail → AlibabaFenxiaoProductInfoGet → encryptPcUrl 解析真实URL
    // 补全失败的商品保留原搜索结果的字段
    formattedItems = await enrichProductsWithDetail(userId, formattedItems);

    // 按相关性排序，提升搜索质量
    formattedItems = filterRelevanceWithFallback(formattedItems, keyword);

    return {
      success: true,
      message: usedKeyword ? `搜同类成功（关键词: ${usedKeyword}）` : '搜同类成功',
      data: { items: formattedItems, total, page, pageSize, usedKeyword: usedKeyword || keyword }
    };
  } catch (error: any) {
    logger.error('搜同类失败:', error);
    return {
      success: false,
      message: `搜同类失败: ${error.message}`,
      data: { items: [], total: 0, page, pageSize }
    };
  }
}

/**
 * 获取授权页面HTML
 */
export async function getAuthPageHtml(userId: number): Promise<string> {
  const tokenStatus = await getTokenStatus(userId);
  const authUrl = await generateAuthUrl(userId);
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>1688授权</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      box-sizing: border-box;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #ff6b6b, #ee5a24);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 15px;
      font-size: 28px;
      font-weight: bold;
      color: white;
    }
    .title {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a2e;
      margin: 0;
    }
    .subtitle {
      color: #666;
      margin: 8px 0 0;
      font-size: 14px;
    }
    .step {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      border-left: 4px solid #667eea;
    }
    .step-title {
      font-weight: 600;
      color: #1a1a2e;
      margin: 0 0 12px;
      font-size: 16px;
    }
    .step-desc {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 16px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      font-size: 14px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }
    .btn-success {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
    }
    .btn-success:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(17, 153, 142, 0.4);
    }
    .input-group {
      margin-bottom: 16px;
    }
    .input-label {
      display: block;
      font-size: 14px;
      color: #333;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .input-field {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
      box-sizing: border-box;
      font-family: monospace;
    }
    .input-field:focus {
      outline: none;
      border-color: #667eea;
    }
    .status {
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    .status.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .status.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .status.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }
    .copy-hint {
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }
    .timer {
      font-family: monospace;
      font-size: 14px;
    }
    code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
      color: #c7254e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">1688</div>
      <h1 class="title">1688开放平台授权</h1>
      <p class="subtitle">获取API访问权限</p>
    </div>

    ${tokenStatus.hasToken ? `
    <div class="status ${tokenStatus.isExpired ? 'error' : 'success'}">
      <p><strong>${tokenStatus.message}</strong></p>
      ${!tokenStatus.isExpired ? `<p class="timer">剩余有效期: ${formatSeconds(tokenStatus.remainingSeconds)}</p>` : ''}
    </div>
    ` : ''}

    <div class="step">
      <h3 class="step-title">步骤1：获取授权链接</h3>
      <p class="step-desc">点击下方按钮，在新标签页中完成1688账号登录和授权。</p>
      <button class="btn btn-primary" onclick="window.open('${authUrl}', '_blank')">
        跳转授权页面
      </button>
    </div>

    <div class="step">
      <h3 class="step-title">步骤2：粘贴回调URL</h3>
      <p class="step-desc">完成授权后，复制浏览器地址栏中的URL（包含 <code>code=</code> 参数），粘贴到下方输入框中。</p>
      <div class="input-group">
        <label class="input-label">回调URL</label>
        <input type="text" id="callbackUrl" class="input-field" placeholder="例如: https://xxx/callback?code=xxx&state=xxx">
      </div>
      <button class="btn btn-success" onclick="exchangeToken()">
        换取 Token
      </button>
      <p class="copy-hint">提示：授权成功后地址栏会跳转到回调地址，复制完整URL即可</p>
    </div>

    <div id="result" style="display:none;" class="status info"></div>
  </div>

  <script>
    async function exchangeToken() {
      const url = document.getElementById('callbackUrl').value;
      if (!url || !url.includes('code=')) {
        alert('请输入有效的回调URL');
        return;
      }
      
      const code = url.match(/code=([^&]+)/);
      if (!code) {
        alert('无法从URL中提取code参数');
        return;
      }

      const resultDiv = document.getElementById('result');
      resultDiv.style.display = 'block';
      resultDiv.className = 'status info';
      resultDiv.innerHTML = '<p>正在换取Token...</p>';

      try {
        const response = await fetch('/api/alibaba/auth/token?code=' + code[1]);
        const data = await response.json();
        
        if (data.success) {
          resultDiv.className = 'status success';
          resultDiv.innerHTML = '<p><strong>Token获取成功!</strong></p><p>授权已完成，可以关闭此页面</p>';
          document.getElementById('callbackUrl').value = '';
        } else {
          resultDiv.className = 'status error';
          resultDiv.innerHTML = '<p><strong>获取失败:</strong> ' + (data.message || '未知错误') + '</p>';
        }
      } catch (error) {
        resultDiv.className = 'status error';
        resultDiv.innerHTML = '<p><strong>请求失败:</strong> ' + error.message + '</p>';
      }
    }

    function formatSeconds(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return hours + '小时' + minutes + '分钟' + secs + '秒';
    }
  </script>
</body>
</html>
  `;
}

function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}小时${minutes}分钟${secs}秒`;
}

// ==================== 模拟数据生成 ====================

const categories = ['电子产品', '服装配饰', '家居用品', '运动户外', '美妆护肤', '食品饮料'];
const suppliers = [
  { id: 'S001', name: '深圳电子科技有限公司', level: '金牌供应商', responseRate: '98%' },
  { id: 'S002', name: '义乌小商品批发中心', level: '实力商家', responseRate: '95%' },
  { id: 'S003', name: '广州服装批发城', level: '金牌供应商', responseRate: '96%' },
  { id: 'S004', name: '杭州美妆工厂', level: '实力商家', responseRate: '97%' },
  { id: 'S005', name: '上海家居用品有限公司', level: '金牌供应商', responseRate: '94%' },
  { id: 'S006', name: '东莞运动用品厂家', level: '普通会员', responseRate: '92%' }
];

const locations = ['广东深圳', '浙江义乌', '广东广州', '浙江杭州', '上海', '广东东莞'];

function generateMockAlibabaResults(keyword: string, page: number, pageSize: number): any[] {
  const results: any[] = [];
  const startIndex = (page - 1) * pageSize;
  
  for (let i = 0; i < pageSize; i++) {
    const index = startIndex + i;
    const supplier = suppliers[index % suppliers.length];
    
    results.push({
      id: `mock_${index + 1}`,
      productId: `mock_${index + 1}`,
      name: `${keyword} - ${['手机壳', '数据线', '充电器', '耳机', '充电宝', '智能手表'][index % 6]} 款式${index + 1}`,
      category: categories[index % categories.length],
      price: (Math.random() * 50 + 10).toFixed(2),
      originalPrice: (Math.random() * 30 + 20).toFixed(2),
      moq: Math.floor(Math.random() * 10) + 1,
      minOrder: Math.floor(Math.random() * 10) + 1,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        level: supplier.level,
        responseRate: supplier.responseRate
      },
      sales: Math.floor(Math.random() * 5000) + 100,
      rating: (Math.random() * 0.5 + 4.5).toFixed(1),
      shipping: Math.random() > 0.7 ? '免邮' : '运费另算',
      image: `https://neeko-copilot.bytedance.net/api/text_to_image?prompt=${encodeURIComponent(keyword + ' product photo white background')}&image_size=square`,
      images: [],
      location: locations[index % locations.length],
      isGoldSupplier: supplier.level === '金牌供应商',
      isTradeAssurance: Math.random() > 0.3,
      deliveryTime: `${Math.floor(Math.random() * 7) + 3}天`,
      specs: [],
      detailUrl: `https://detail.1688.com/offer/mock_${index + 1}.html`
    });
  }
  
  return results;
}

function generateMockProductDetail(productId: string): any {
  const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
  
  return {
    id: productId,
    productId: productId,
    name: '手机壳 - 高级硅胶保护套 防摔防刮',
    category: '电子产品',
    price: '25.00',
    originalPrice: '35.00',
    moq: 10,
    minOrder: 10,
    supplier: {
      id: supplier.id,
      name: supplier.name,
      level: supplier.level,
      responseRate: supplier.responseRate,
      phone: '138****8888',
      contact: '张经理',
      location: '广东深圳',
      establishedYear: 2015,
      employeeCount: 200,
      certifications: ['ISO9001', 'BSCI']
    },
    sales: 3256,
    rating: '4.8',
    shipping: {
      method: ['快递', '物流'],
      freeShippingThreshold: 500,
      estimatedDays: '3-5天'
    },
    image: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=phone%20case%20product%20photo%20white%20background&image_size=square',
    images: [
      'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=phone%20case%20front%20view&image_size=square',
      'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=phone%20case%20back%20view&image_size=square',
      'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=phone%20case%20side%20view&image_size=square'
    ],
    location: '广东深圳',
    isGoldSupplier: supplier.level === '金牌供应商',
    isTradeAssurance: true,
    deliveryTime: '5天',
    description: '<p>高品质硅胶手机壳，防摔防刮，多种颜色可选...</p>',
    reviews: 1234,
    variants: [
      { name: '颜色', options: ['黑色', '白色', '红色', '蓝色'] },
      { name: '型号', options: ['iPhone 15', 'iPhone 14', 'iPhone 13'] }
    ],
    certifications: ['CE', 'ROHS'],
    paymentMethods: ['支付宝', '微信支付', '银行转账'],
    returnPolicy: '7天无理由退换',
    isVerified: true,
    specs: [
      { name: '材质', value: '硅胶' },
      { name: '适用机型', value: 'iPhone系列' },
      { name: '厚度', value: '2mm' }
    ],
    detailUrl: ''
  };
}

function generateMockSupplier(supplierId: string): any {
  const supplier = suppliers.find(s => s.id === supplierId) || suppliers[0];
  
  return {
    id: supplier.id,
    name: supplier.name,
    level: supplier.level,
    responseRate: supplier.responseRate,
    phone: '138****8888',
    contact: '张经理',
    location: '广东深圳',
    establishedYear: 2015,
    employeeCount: 200,
    certifications: ['ISO9001', 'BSCI', 'CE'],
    mainProducts: ['手机配件', '电子产品', '数码配件'],
    annualRevenue: '5000万-1亿',
    exportMarkets: ['东南亚', '欧美', '中东'],
    goldSupplierSince: 2018,
    onTimeDeliveryRate: '98%',
    productQualityRating: '4.8'
  };
}
