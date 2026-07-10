import type { SupplySource, UpdateSupplySourceData } from '@/api/productSupplyAPI';

const toNumber = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const firstNumber = (...values: unknown[]): number => {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
};

const pushImage = (images: string[], value: unknown) => {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach(item => pushImage(images, item));
    return;
  }

  const url = typeof value === 'object'
    ? firstText((value as any).url, (value as any).imageUrl, (value as any).image_url)
    : firstText(value);
  if (url && !images.includes(url)) images.push(url);
};

const normalizeAlibabaImages = (detail: any): string[] => {
  const images: string[] = [];
  pushImage(images, detail?.images);
  pushImage(images, detail?.imageUrls);
  pushImage(images, detail?.image_urls);
  pushImage(images, detail?.productImage?.images);
  pushImage(images, detail?.offerImage?.images);
  pushImage(images, detail?.imageInfo?.images);
  pushImage(images, detail?.imageList);
  pushImage(images, detail?.image);
  pushImage(images, detail?.imageUrl);
  pushImage(images, detail?.image_url);
  pushImage(images, detail?.offerImage?.imageUrl);
  pushImage(images, detail?.imageInfo?.imageUrl);
  return images;
};

const readPriceRanges = (ranges: unknown): number => {
  if (!Array.isArray(ranges)) return 0;
  for (const range of ranges) {
    const price = firstNumber(
      (range as any)?.price,
      (range as any)?.startPrice,
      (range as any)?.salePrice,
      (range as any)?.discountPrice,
    );
    if (price > 0) return price;
  }
  return 0;
};

const readSkuPrice = (detail: any): number => {
  const skuList = detail?.productSkuInfos || detail?.skuInfos || detail?.skuList || detail?.skus;
  if (!Array.isArray(skuList)) return 0;
  for (const sku of skuList) {
    const price = firstNumber(
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
};

const readAlibabaPrice = (detail: any): number => firstNumber(
  detail?.price,
  detail?.referencePrice,
  detail?.offerPrice?.price,
  detail?.offerPrice?.startPrice,
  detail?.priceInfo?.price,
  detail?.priceInfo?.startPrice,
  detail?.priceRange?.price,
  detail?.priceRange?.startPrice,
  readPriceRanges(detail?.productSaleInfo?.priceRanges),
  readPriceRanges(detail?.saleInfo?.priceRanges),
  readSkuPrice(detail),
);

export const extractAlibabaOfferId = (input: string): string => {
  const value = input.trim();
  if (/^\d{6,18}$/.test(value)) return value;
  const standardMatch = value.match(/\/offer\/(\d{6,18})\.html/i);
  if (standardMatch) return standardMatch[1];
  const queryMatch = value.match(/[?&](?:offerId|offer_id|id)=([A-Za-z0-9_-]{6,80})/i);
  if (queryMatch) return queryMatch[1];
  const openOfferMatch = value.match(/[?&]openOfferId=([A-Za-z0-9_-]{6,120})/i);
  if (openOfferMatch) return openOfferMatch[1];
  return '';
};

export const getAlibabaSourceDetailUrl = (source?: Partial<SupplySource | UpdateSupplySourceData> | null): string => {
  const directUrl = firstText(source?.detailUrl);
  if (directUrl) return directUrl;
  const offerId = firstText(source?.alibabaOfferId);
  return offerId && /^\d+$/.test(offerId) ? `https://detail.1688.com/offer/${offerId}.html` : '';
};

export const sourceToPayload = (source: SupplySource | UpdateSupplySourceData): UpdateSupplySourceData => ({
  alibabaOfferId: source.alibabaOfferId,
  subject: source.subject,
  price: source.price,
  consignPrice: source.consignPrice,
  image: source.image,
  images: Array.isArray(source.images) ? source.images : undefined,
  detailUrl: source.detailUrl,
  supplierName: source.supplierName,
  city: source.city,
  province: source.province,
  qualityScore: source.qualityScore,
  qualityDetail: source.qualityDetail,
  yxScoreLevel: source.yxScoreLevel,
  tradeServices: Array.isArray(source.tradeServices) ? source.tradeServices : undefined,
  moq: source.moq,
});

export const normalizeAlibabaDetailToSourcePayload = (
  detail: any,
  fallbackOfferId: string,
  inputUrl: string,
): UpdateSupplySourceData => {
  const images = normalizeAlibabaImages(detail);
  const supplier = detail?.supplierInfo || detail?.supplier || {};
  const company = detail?.companyInfo || detail?.company_info || detail?.shopInfo || detail?.sellerInfo || {};
  const offerId = firstText(detail?.offerId, detail?.productId, detail?.id, fallbackOfferId);
  const supplierName = firstText(
    detail?.supplierName,
    detail?.supplier_name,
    supplier.companyName,
    supplier.name,
    company.companyName,
    company.name,
    company.shopName,
    detail?.loginId,
    detail?.supplierLoginId,
  );

  return {
    alibabaOfferId: offerId,
    subject: firstText(detail?.subject, detail?.name, detail?.title, detail?.productTitle, detail?.product_title, detail?.offerSubject),
    price: readAlibabaPrice(detail),
    consignPrice: firstNumber(detail?.consignPrice, detail?.offerPrice?.consignPrice, detail?.priceInfo?.consignPrice),
    image: images[0] || '',
    images: images.length > 0 ? images : undefined,
    detailUrl: firstText(detail?.detailUrl, detail?.detail_url, inputUrl, getAlibabaSourceDetailUrl({ alibabaOfferId: offerId })),
    supplierName,
    city: firstText(detail?.city, supplier.city, company.city),
    province: firstText(detail?.province, supplier.province, company.province),
    qualityScore: firstNumber(detail?.qualityScore, detail?.quality_score, detail?.qualityEvaluation?.compositeScore),
    qualityDetail: detail?.qualityDetail || detail?.quality_detail || detail?.qualityEvaluation || null,
    yxScoreLevel: firstText(detail?.yxScoreLevel, detail?.yx_score_level),
    tradeServices: detail?.tradeServices || detail?.trade_services || detail?.offerTradeServiceInfo || undefined,
    moq: firstNumber(
      detail?.moq,
      detail?.minOrder,
      detail?.minOrderQuantity,
      detail?.minOrderCount,
      detail?.productSaleInfo?.minOrderQuantity,
      detail?.saleInfo?.minOrderQuantity,
    ) || 1,
  };
};
