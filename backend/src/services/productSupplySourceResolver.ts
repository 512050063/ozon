import logger from '../config/logger';
import { call1688Api, call1688ApiGet, loadToken } from './alibabaService';

const SOURCE_DETAIL_ATTEMPT_TIMEOUT_MS = 12000;
const SOURCE_KEYWORD_ENRICH_TIMEOUT_MS = 8000;

export interface ProductSupplySourcePreview {
  alibabaOfferId: string;
  subject: string;
  price: number;
  consignPrice: number;
  image: string;
  images: string[] | null;
  detailUrl: string;
  supplierName: string;
  city: string;
  province: string;
  qualityScore: number;
  qualityDetail: any;
  yxScoreLevel: string;
  tradeServices: any;
  moq: number;
}

export function extractProductSupplySourceOfferId(input: string): string {
  const value = (input || '').trim();
  if (!value) return '';
  if (/^\d{6,18}$/.test(value)) return value;

  const standardMatch = value.match(/\/offer\/(\d{6,18})\.html/i);
  if (standardMatch) return standardMatch[1];

  const queryMatch = value.match(/[?&](?:offerId|offer_id|id)=([A-Za-z0-9_-]{6,80})/i);
  if (queryMatch) return queryMatch[1];

  const openOfferMatch = value.match(/[?&]openOfferId=([A-Za-z0-9_-]{6,120})/i);
  if (openOfferMatch) return openOfferMatch[1];

  return '';
}

function firstText(...values: any[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return value.toString();
  }
  return '';
}

function parseNumber(value: any): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstPositiveNumber(...values: any[]): number {
  for (const value of values) {
    const parsed = parseNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function pushImage(images: string[], value: any) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach(item => pushImage(images, item));
    return;
  }
  const url = typeof value === 'object'
    ? firstText(value.url, value.imageUrl, value.image_url)
    : firstText(value);
  if (url && !images.includes(url)) images.push(url);
}

function normalizeImages(data: any): string[] {
  const images: string[] = [];
  pushImage(images, data.images);
  pushImage(images, data.imageUrls);
  pushImage(images, data.image_urls);
  pushImage(images, data.productImage?.images);
  pushImage(images, data.offerImage?.images);
  pushImage(images, data.imageInfo?.images);
  pushImage(images, data.imageList);
  pushImage(images, data.image);
  pushImage(images, data.imageUrl);
  pushImage(images, data.image_url);
  pushImage(images, data.offerImage?.imageUrl);
  pushImage(images, data.imageInfo?.imageUrl);
  return images;
}

function readPriceRanges(ranges: any): number {
  if (!Array.isArray(ranges)) return 0;
  for (const range of ranges) {
    const price = firstPositiveNumber(range?.price, range?.startPrice, range?.salePrice, range?.discountPrice);
    if (price > 0) return price;
  }
  return 0;
}

function readSkuPrice(data: any): number {
  const skuList = data.productSkuInfos || data.skuInfos || data.skuList || data.skus;
  if (!Array.isArray(skuList)) return 0;
  for (const sku of skuList) {
    const price = firstPositiveNumber(
      sku?.price,
      sku?.salePrice,
      sku?.discountPrice,
      sku?.referencePrice,
      sku?.priceInfo?.price,
      sku?.priceInfo?.startPrice,
    );
    if (price > 0) return price;
  }
  return 0;
}

function readSourcePrice(data: any): number {
  return firstPositiveNumber(
    data.price,
    data.referencePrice,
    data.offerPrice?.price,
    data.offerPrice?.startPrice,
    data.priceInfo?.price,
    data.priceInfo?.startPrice,
    data.priceRange?.price,
    data.priceRange?.startPrice,
    readPriceRanges(data.productSaleInfo?.priceRanges),
    readPriceRanges(data.saleInfo?.priceRanges),
    readSkuPrice(data),
  );
}

function normalizeOfferId(value: any): string {
  const text = firstText(value);
  return text.replace(/[^\d]/g, '');
}

function offerIdMatches(candidate: any, offerId: string): boolean {
  const expected = normalizeOfferId(offerId);
  if (!expected) return false;
  return [
    candidate?.offerId,
    candidate?.offer_id,
    candidate?.productId,
    candidate?.product_id,
    candidate?.id,
    candidate?.Id,
    candidate?.ID,
  ].some(value => normalizeOfferId(value) === expected);
}

function extractKeywordSearchItems(data: any): any[] {
  const result = data?.result || {};
  if (Array.isArray(result.result)) return result.result;
  if (Array.isArray(result.data)) return result.data;
  if (Array.isArray(result.productList)) return result.productList;
  if (Array.isArray(result.offerList)) return result.offerList;
  if (Array.isArray(result.items)) return result.items;
  if (Array.isArray(result)) return result;
  return [];
}

function pushKeyword(keywords: string[], value: string) {
  const keyword = value.replace(/\s+/g, ' ').trim();
  if (keyword && keyword.length >= 2 && !keywords.includes(keyword)) {
    keywords.push(keyword);
  }
}

function buildSourceKeywordCandidates(source: ProductSupplySourcePreview | null, inputUrl: string, offerId: string): string[] {
  const keywords: string[] = [];
  const subject = source?.subject || '';
  const chineseSegments = subject.match(/[\u4e00-\u9fff]{2,}/g) || [];

  for (const segment of chineseSegments) {
    if (segment.includes('耳机')) pushKeyword(keywords, '耳机');
    if (segment.includes('手表')) pushKeyword(keywords, '手表');
    if (segment.includes('表链')) pushKeyword(keywords, '表链');
    if (segment.includes('手机壳')) pushKeyword(keywords, '手机壳');
    if (segment.includes('充电线')) pushKeyword(keywords, '充电线');
  }

  for (const segment of chineseSegments) {
    const tailCandidates = [
      segment.slice(-2),
      segment.slice(-3),
      segment.slice(0, 4),
      segment.slice(0, 6),
    ];
    tailCandidates.forEach(candidate => pushKeyword(keywords, candidate));
  }

  if (subject) {
    pushKeyword(keywords, subject.replace(/[^\u4e00-\u9fffA-Za-z0-9\s]/g, ' '));
  }
  pushKeyword(keywords, offerId);
  pushKeyword(keywords, inputUrl);

  return keywords.slice(0, 8);
}

async function enrichSourceFromKeywordSearch(
  userId: number,
  accessToken: string,
  offerId: string,
  source: ProductSupplySourcePreview | null,
  inputUrl: string,
): Promise<ProductSupplySourcePreview | null> {
  const isNumericId = /^\d+$/.test(offerId);
  if (!isNumericId) return null;

  const keywords = buildSourceKeywordCandidates(source, inputUrl, offerId);
  for (const keyword of keywords) {
    try {
      const data = await withAttemptTimeout(
        call1688ApiGet(userId, 'com.alibaba.fenxiao', 'product.keywords.search', {
          param: JSON.stringify({ keywords: keyword, beginPage: 1, pageSize: 40 }),
          access_token: accessToken,
        }),
        '1688货源关键词补全接口',
        SOURCE_KEYWORD_ENRICH_TIMEOUT_MS,
      );

      const matched = extractKeywordSearchItems(data).find(item => offerIdMatches(item, offerId));
      if (matched) {
        logger.info(`[product-supply-source] 关键词补全命中 offerId=${offerId}, keyword=${keyword}`);
        return normalizeProductSupplySourceDetail(matched, offerId, inputUrl);
      }
    } catch (error: any) {
      logger.warn(`[product-supply-source] 1688货源关键词补全失败: ${error.message}`);
    }
  }

  return null;
}

export function normalizeProductSupplySourceDetail(
  detail: any,
  fallbackOfferId: string,
  inputUrl = '',
): ProductSupplySourcePreview {
  const data = detail || {};
  const images = normalizeImages(data);
  const supplier = data.supplierInfo || data.supplier || {};
  const company = data.companyInfo || data.company_info || data.shopInfo || data.sellerInfo || {};
  const offerId = firstText(data.offerId, data.productId, data.id, fallbackOfferId);

  return {
    alibabaOfferId: offerId,
    subject: firstText(data.subject, data.name, data.title, data.productTitle, data.product_title, data.offerSubject),
    price: readSourcePrice(data),
    consignPrice: firstPositiveNumber(data.consignPrice, data.offerPrice?.consignPrice, data.priceInfo?.consignPrice),
    image: images[0] || '',
    images: images.length > 0 ? images : null,
    detailUrl: firstText(data.detailUrl, data.detail_url, inputUrl, offerId && /^\d+$/.test(offerId) ? `https://detail.1688.com/offer/${offerId}.html` : ''),
    supplierName: firstText(
      data.supplierName,
      data.supplier_name,
      supplier.companyName,
      supplier.name,
      company.companyName,
      company.name,
      company.shopName,
      data.loginId,
      data.supplierLoginId,
    ),
    city: firstText(data.city, supplier.city, company.city),
    province: firstText(data.province, supplier.province, company.province),
    qualityScore: firstPositiveNumber(data.quality_score, data.qualityScore, data.qualityEvaluation?.compositeScore),
    qualityDetail: data.quality_detail || data.qualityDetail || data.qualityEvaluation || null,
    yxScoreLevel: firstText(data.yx_score_level, data.yxScoreLevel),
    tradeServices: data.trade_services || data.tradeServices || data.offerTradeServiceInfo || null,
    moq: firstPositiveNumber(
      data.moq,
      data.minOrder,
      data.minOrderQuantity,
      data.minOrderCount,
      data.productSaleInfo?.minOrderQuantity,
      data.saleInfo?.minOrderQuantity,
    ) || 1,
  };
}

function pickQueryProductDetailResult(data: any): any | null {
  const result = data?.result || {};
  if (result.success && result.result) return result.result;
  if (result.result && typeof result.result === 'object') return result.result;
  return null;
}

function pickFenxiaoProductInfo(data: any): any | null {
  return data?.productInfo && typeof data.productInfo === 'object' ? data.productInfo : null;
}

function pickProductGetInfo(data: any): any | null {
  return data?.productInfo && typeof data.productInfo === 'object' ? data.productInfo : null;
}

function hasUsableSource(source: ProductSupplySourcePreview): boolean {
  return Boolean(source.subject || source.image || source.price > 0);
}

function hasCompleteSource(source: ProductSupplySourcePreview): boolean {
  return Boolean(source.subject && source.image && source.price > 0 && source.supplierName);
}

function mergeSourcePreview(
  current: ProductSupplySourcePreview | null,
  next: ProductSupplySourcePreview,
): ProductSupplySourcePreview {
  if (!current) return next;
  const currentImages = Array.isArray(current.images) ? current.images : [];
  const nextImages = Array.isArray(next.images) ? next.images : [];
  const mergedImages = [...currentImages];
  for (const image of nextImages) {
    if (image && !mergedImages.includes(image)) mergedImages.push(image);
  }

  return {
    alibabaOfferId: current.alibabaOfferId || next.alibabaOfferId,
    subject: current.subject || next.subject,
    price: current.price > 0 ? current.price : next.price,
    consignPrice: current.consignPrice > 0 ? current.consignPrice : next.consignPrice,
    image: current.image || next.image,
    images: mergedImages.length > 0 ? mergedImages : null,
    detailUrl: current.detailUrl || next.detailUrl,
    supplierName: current.supplierName || next.supplierName,
    city: current.city || next.city,
    province: current.province || next.province,
    qualityScore: current.qualityScore > 0 ? current.qualityScore : next.qualityScore,
    qualityDetail: current.qualityDetail || next.qualityDetail,
    yxScoreLevel: current.yxScoreLevel || next.yxScoreLevel,
    tradeServices: current.tradeServices || next.tradeServices,
    moq: current.moq > 1 ? current.moq : next.moq,
  };
}

function withAttemptTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = SOURCE_DETAIL_ATTEMPT_TIMEOUT_MS,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} 超时`));
    }, timeoutMs);

    promise
      .then(value => resolve(value))
      .catch(error => reject(error))
      .finally(() => clearTimeout(timer));
  });
}

export async function resolveProductSupplySourceFromUrl(
  userId: number,
  inputUrl: string,
): Promise<ProductSupplySourcePreview> {
  const offerId = extractProductSupplySourceOfferId(inputUrl);
  if (!offerId) {
    throw new Error('请输入有效的1688商品链接或商品ID');
  }

  const token = await loadToken(userId);
  if (!token?.access_token) {
    throw new Error('未配置1688授权Token，请先在设置页面完成授权');
  }

  const isNumericId = /^\d+$/.test(offerId);
  const attempts: Array<() => Promise<any | null>> = [
    async () => {
      const data = await call1688Api(userId, 'com.alibaba.fenxiao.crossborder', 'product.search.queryProductDetail', {
        offerDetailParam: JSON.stringify({ [isNumericId ? 'offerId' : 'openOfferId']: offerId }),
        access_token: token.access_token,
      });
      return pickQueryProductDetailResult(data);
    },
    async () => {
      const data = await call1688Api(userId, 'com.alibaba.fenxiao', 'AlibabaFenxiaoProductInfoGet', {
        offerId: isNumericId ? offerId : '0',
        openOfferId: isNumericId ? '' : offerId,
        access_token: token.access_token,
      });
      return pickFenxiaoProductInfo(data);
    },
    async () => {
      const data = await call1688Api(userId, 'com.alibaba.product', 'alibaba.product.get', {
        productId: offerId,
        access_token: token.access_token,
      });
      return pickProductGetInfo(data);
    },
  ];

  const errors: string[] = [];
  let mergedSource: ProductSupplySourcePreview | null = null;
  for (const attempt of attempts) {
    try {
      const detail = await withAttemptTimeout(attempt(), '1688商品详情接口');
      if (detail && Object.keys(detail).length > 0) {
        const source = normalizeProductSupplySourceDetail(detail, offerId, inputUrl);
        if (hasUsableSource(source)) {
          mergedSource = mergeSourcePreview(mergedSource, source);
          if (hasCompleteSource(mergedSource)) {
            return mergedSource;
          }
        }
      }
    } catch (error: any) {
      errors.push(error.message || String(error));
      logger.warn(`[product-supply-source] 1688链接解析尝试失败: ${error.message}`);
    }
  }

  if (mergedSource && hasUsableSource(mergedSource)) {
    if (!hasCompleteSource(mergedSource)) {
      const enrichedSource = await enrichSourceFromKeywordSearch(
        userId,
        token.access_token,
        offerId,
        mergedSource,
        inputUrl,
      );
      if (enrichedSource) {
        mergedSource = mergeSourcePreview(mergedSource, enrichedSource);
      }
    }
    return mergedSource;
  }

  throw new Error(errors[0] || '获取1688商品信息失败');
}
