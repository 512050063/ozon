export type ProductSupplyListingAssessment = {
  ready: boolean;
  missingFields: string[];
  missingAttributeIds: number[];
  message: string;
};

export type ListingCheckStatus = 'pass' | 'warning' | 'error';

export type ListingCheckItem = {
  key: string;
  group: '基础信息' | '尺寸重量' | '模板信息' | '上架参数';
  label: string;
  status: ListingCheckStatus;
  message: string;
};

export type PricingStrategyLike = {
  id: number;
  name: string;
  basePrice: number;
  shippingPrice: number;
  tariffRate: number;
  profitRate: number;
  platformFeeRate: number;
  otherCost: number | null;
  isDefault?: boolean;
};

export type StoreLike = {
  id: number;
  name: string;
  status?: string | null;
  currency?: string | null;
};

export type ListingPriceBreakdownItem = {
  key: string;
  label: string;
  amount: number;
};

export type ListingPricingResult = {
  productPrice: number;
  suggestedPrice: number;
  finalPrice: number | null;
  currencyCode: string;
  strategyId: number | null;
  strategyName: string;
  breakdown: ListingPriceBreakdownItem[];
};

export type ListingPreviewResult = {
  product: any;
  stores: StoreLike[];
  pricingStrategies: PricingStrategyLike[];
  pricing: ListingPricingResult;
  checks: ListingCheckItem[];
  canSubmit: boolean;
  blockingCount: number;
  warningCount: number;
};

type BuildPreviewInput = {
  product: any;
  stores: StoreLike[];
  pricingStrategies: PricingStrategyLike[];
  selectedStoreId?: number | null;
  selectedPricingStrategyId?: number | null;
  finalPrice?: number | string | null;
  skuItems?: Array<{ offerId?: string | null; sku?: string | null; price?: number | null }>;
};

function hasMeaningfulValue(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    if ('value' in value || 'valueId' in value || 'id' in value) {
      return hasMeaningfulValue((value as any).value) || hasMeaningfulValue((value as any).valueId) || hasMeaningfulValue((value as any).id);
    }
    return Object.keys(value).length > 0;
  }
  return Boolean(value);
}

function normalizeNumeric(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeTemplateSnapshot(templateSnapshot: any): { requiredAttributeIds: number[]; attributeMetaMap: Map<number, any> } | null {
  if (!templateSnapshot || typeof templateSnapshot !== 'object') {
    return null;
  }

  const requiredAttributeIds = Array.isArray(templateSnapshot.requiredAttributeIds)
    ? templateSnapshot.requiredAttributeIds
        .map((id: any) => Number(id))
        .filter((id: number) => Number.isFinite(id) && id > 0)
    : [];

  const groups = [
    templateSnapshot.baseAttributes,
    templateSnapshot.variantAttributes,
    templateSnapshot.commonVariantAttributes,
    templateSnapshot.hiddenAttributes,
    templateSnapshot.skuDimensionCandidates,
    templateSnapshot.rawAttributes,
  ];
  const attributeMetaMap = new Map<number, any>();
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      const id = getAttributeId(item);
      if (Number.isFinite(id) && !attributeMetaMap.has(id)) {
        attributeMetaMap.set(id, item);
      }
    }
  }

  return {
    requiredAttributeIds,
    attributeMetaMap,
  };
}

function getAttributeId(item: any): number {
  const id = Number(item?.id ?? item?.attribute_id ?? item?.attributeId);
  return Number.isFinite(id) && id > 0 ? id : NaN;
}

function getAttributeDisplayName(item: any): string {
  return String(item?.name ?? item?.attribute_name ?? item?.attributeName ?? item?.title ?? '').trim();
}

const BASE_FIELD_ATTRIBUTE_ID_MAP: Record<number, 'brand' | 'modelName'> = {
  85: 'brand',
  8229: 'modelName',
  9048: 'modelName',
};

function normalizeAttributeName(value: any): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .trim();
}

function isBrandTemplateAttribute(meta: any): boolean {
  const name = normalizeAttributeName(getAttributeDisplayName(meta));
  return Boolean(name && (name.includes('品牌') || name === 'brand' || name.includes('бренд')));
}

function isModelNameTemplateAttribute(attributeId: number, meta: any): boolean {
  const name = normalizeAttributeName(getAttributeDisplayName(meta));
  if (attributeId === 9048 || attributeId === 8229) return true;
  return Boolean(name && (
    name.includes('型号名称') ||
    name.includes('modelname') ||
    name.includes('названиемодели')
  ));
}

function findTemplateDictionaryValue(meta: any, value: any) {
  const text = String(value || '').trim();
  if (!text || !Array.isArray(meta?.values)) return null;
  const normalized = normalizeAttributeName(text);
  return meta.values.find((item: any) => normalizeAttributeName(item?.value) === normalized) || null;
}

function isDictionaryTemplateAttribute(meta: any): boolean {
  return Boolean(Number(meta?.dictionary_id ?? meta?.dictionaryId) > 0);
}

function isBaseFieldTemplateAttribute(meta: any): boolean {
  const attributeId = getAttributeId(meta);
  const name = normalizeAttributeName(getAttributeDisplayName(meta));
  if (!name) return false;

  return (
    isBrandTemplateAttribute(meta) ||
    isModelNameTemplateAttribute(attributeId, meta)
  );
}

function getRequiredListingAttributeIds(templateSnapshot: ReturnType<typeof normalizeTemplateSnapshot>, productData?: any): number[] {
  if (!templateSnapshot) return [];
  return templateSnapshot.requiredAttributeIds.filter(attributeId => {
    const baseFieldKey = BASE_FIELD_ATTRIBUTE_ID_MAP[attributeId];
    if (baseFieldKey && hasMeaningfulValue(productData?.[baseFieldKey])) {
      return false;
    }
    const meta = templateSnapshot.attributeMetaMap.get(attributeId);
    return !isBaseFieldTemplateAttribute(meta);
  });
}

function collectFilledAttributeIds(productData: any): Set<number> {
  const filledIds = new Set<number>();
  const records = [productData.attributes, productData.hiddenAttributes];

  for (const record of records) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) continue;
    for (const [rawId, value] of Object.entries(record)) {
      const attributeId = Number(rawId);
      if (!Number.isFinite(attributeId) || attributeId <= 0) continue;
      if (hasMeaningfulValue(value)) {
        filledIds.add(attributeId);
      }
    }
  }

  if (Array.isArray(productData.variantAttributes)) {
    for (const item of productData.variantAttributes) {
      const attributeId = Number(item?.attributeId);
      if (!Number.isFinite(attributeId) || attributeId <= 0) continue;
      if (hasMeaningfulValue(item?.value) || hasMeaningfulValue(item?.valueId)) {
        filledIds.add(attributeId);
      }
    }
  }

  return filledIds;
}

const FIELD_LABELS: Record<string, string> = {
  images: '商品图片',
  descriptionCategoryId: 'Ozon类目',
  packageLength: '包装长度',
  packageWidth: '包装宽度',
  packageHeight: '包装高度',
  grossWeight: '包装重量',
  requiredAttributes: '必填属性',
};

export function assessProductSupplyListing(productData: any): ProductSupplyListingAssessment {
  const missingFields: string[] = [];

  const imageCandidates = [
    productData?.imageUrl,
    ...(Array.isArray(productData?.images) ? productData.images : []),
  ].filter((item: any) => hasMeaningfulValue(item));
  if (imageCandidates.length === 0) {
    missingFields.push('images');
  }

  if (!hasMeaningfulValue(productData?.descriptionCategoryId)) {
    missingFields.push('descriptionCategoryId');
  }
  if (!hasMeaningfulValue(productData?.packageLength)) {
    missingFields.push('packageLength');
  }
  if (!hasMeaningfulValue(productData?.packageWidth)) {
    missingFields.push('packageWidth');
  }
  if (!hasMeaningfulValue(productData?.packageHeight)) {
    missingFields.push('packageHeight');
  }
  if (!hasMeaningfulValue(productData?.grossWeight)) {
    missingFields.push('grossWeight');
  }

  const templateSnapshot = normalizeTemplateSnapshot(productData?.templateSnapshot);

  const missingAttributeIds: number[] = [];
  const requiredAttributeIds = getRequiredListingAttributeIds(templateSnapshot, productData);
  if (templateSnapshot && requiredAttributeIds.length > 0) {
    const filledAttributeIds = collectFilledAttributeIds(productData);
    for (const attributeId of requiredAttributeIds) {
      if (!filledAttributeIds.has(attributeId)) {
        missingAttributeIds.push(attributeId);
      }
    }
    if (missingAttributeIds.length > 0) {
      missingFields.push('requiredAttributes');
    }
  }

  const uniqueMissingFields = Array.from(new Set(missingFields));
  const ready = uniqueMissingFields.length === 0;
  const message = ready
    ? '商品资料完整，可提交到 Ozon'
    : `商品资料未完善：${uniqueMissingFields.map(field => FIELD_LABELS[field] || field).join('、')}`;

  return {
    ready,
    missingFields: uniqueMissingFields,
    missingAttributeIds,
    message,
  };
}

function buildAttributeLabel(attributeId: number, templateSnapshot: ReturnType<typeof normalizeTemplateSnapshot>): string {
  const meta = templateSnapshot?.attributeMetaMap.get(attributeId);
  return getAttributeDisplayName(meta) || `属性 ${attributeId}`;
}

function normalizeImageUrl(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    return String(value.url || value.fileUrl || value.imageUrl || '').trim();
  }
  return '';
}

function createCheck(group: ListingCheckItem['group'], key: string, label: string, status: ListingCheckStatus, message: string): ListingCheckItem {
  return { group, key, label, status, message };
}

function pickDefaultStrategy(strategies: PricingStrategyLike[]): PricingStrategyLike | null {
  if (strategies.length === 0) return null;
  return strategies.find(item => item.isDefault) || strategies[0];
}

function findStrategy(strategies: PricingStrategyLike[], selectedPricingStrategyId?: number | null): PricingStrategyLike | null {
  if (selectedPricingStrategyId) {
    return strategies.find(item => item.id === selectedPricingStrategyId) || null;
  }
  return pickDefaultStrategy(strategies);
}

function normalizeListingCurrencyCode(value: any): string {
  const currencyCode = String(value || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : 'CNY';
}

function resolveListingCurrencyCode(stores: StoreLike[], selectedStoreId?: number | null): string {
  const selectedStore = selectedStoreId
    ? stores.find(store => store.id === selectedStoreId)
    : null;
  return normalizeListingCurrencyCode(selectedStore?.currency || stores[0]?.currency);
}

export function calculateProductSupplySuggestedPrice(
  product: any,
  strategy: PricingStrategyLike | null,
  finalPrice?: number | string | null,
  currencyCode?: string | null,
): ListingPricingResult {
  const productPrice = roundCurrency(Math.max(0, normalizeNumeric(product?.price) || 0));
  const resolvedCurrencyCode = normalizeListingCurrencyCode(currencyCode);

  if (!strategy) {
    return {
      productPrice,
      suggestedPrice: productPrice,
      finalPrice: normalizeNumeric(finalPrice),
      currencyCode: resolvedCurrencyCode,
      strategyId: null,
      strategyName: '未选择',
      breakdown: [
        {
          key: 'productPrice',
          label: '商品库原价',
          amount: productPrice,
        },
      ],
    };
  }

  const multiplierBase = roundCurrency(productPrice * Number(strategy.basePrice || 0));
  const shipping = roundCurrency(Number(strategy.shippingPrice || 0));
  const otherCost = roundCurrency(Number(strategy.otherCost || 0));
  const ratePercent = Number(strategy.tariffRate || 0) + Number(strategy.profitRate || 0) + Number(strategy.platformFeeRate || 0);
  const rateCost = roundCurrency(multiplierBase * ratePercent / 100);
  const suggestedPrice = roundCurrency(multiplierBase + shipping + otherCost + rateCost);
  const resolvedFinalPrice = normalizeNumeric(finalPrice);

  return {
    productPrice,
    suggestedPrice,
    finalPrice: resolvedFinalPrice ?? suggestedPrice,
    currencyCode: resolvedCurrencyCode,
    strategyId: strategy.id,
    strategyName: strategy.name,
    breakdown: [
      { key: 'productPrice', label: '商品库原价', amount: productPrice },
      { key: 'multiplierBase', label: `价格系数 (${strategy.basePrice}x)`, amount: multiplierBase },
      { key: 'shippingPrice', label: '快递价格', amount: shipping },
      { key: 'otherCost', label: '其他费用', amount: otherCost },
      { key: 'rateCost', label: `费率合计 (${roundCurrency(ratePercent)}%)`, amount: rateCost },
    ],
  };
}

function buildSkuChecks(product: any, skuItems?: Array<{ offerId?: string | null; sku?: string | null; price?: number | null }>): ListingCheckItem[] {
  const checks: ListingCheckItem[] = [];
  const items = Array.isArray(skuItems) && skuItems.length > 0 ? skuItems : null;

  if (!items) {
    if (hasMeaningfulValue(product?.sku)) {
      checks.push(createCheck('模板信息', 'sku', '货号', 'pass', '货号已填写'));
    } else {
      checks.push(createCheck('模板信息', 'sku', '货号', 'error', '请填写货号'));
    }
    return checks;
  }

  if (items.length === 0) {
    checks.push(createCheck('模板信息', 'skuRows', '货号记录', 'error', '请至少生成一条货号记录'));
    return checks;
  }

  const seen = new Set<string>();
  const seenSkus = new Set<string>();
  let duplicateSkuFound = false;
  let missingSkuFound = false;
  let invalidPriceFound = false;

  for (const sku of items) {
    const offerId = String(sku.offerId || '').trim();
    const skuCode = String(sku.sku || '').trim();
    const price = normalizeNumeric(sku.price);
    if (!skuCode) {
      missingSkuFound = true;
    }
    if (skuCode && seenSkus.has(skuCode)) {
      duplicateSkuFound = true;
    }
    if (offerId) seen.add(offerId);
    if (skuCode) seenSkus.add(skuCode);
    if (!price || price <= 0) {
      invalidPriceFound = true;
    }
  }

  checks.push(createCheck(
    '模板信息',
    'skuRows',
    '货号记录',
    missingSkuFound ? 'error' : 'pass',
    missingSkuFound ? '存在未填写货号的记录' : `货号数量：${items.length}`,
  ));

  if (duplicateSkuFound) {
    checks.push(createCheck('模板信息', 'skuDuplicate', '货号唯一性', 'error', '货号存在重复'));
  } else {
    checks.push(createCheck('模板信息', 'skuDuplicate', '货号唯一性', 'pass', '货号未重复'));
  }

  if (invalidPriceFound) {
    checks.push(createCheck('模板信息', 'skuPrice', '货号价格', 'error', '存在价格为空或小于等于 0 的货号记录'));
  } else {
    checks.push(createCheck('模板信息', 'skuPrice', '货号价格', 'pass', '货号价格已填写'));
  }

  return checks;
}

export function buildProductSupplyListingPreview(input: BuildPreviewInput): ListingPreviewResult {
  const product = input.product;
  const stores = input.stores || [];
  const pricingStrategies = input.pricingStrategies || [];
  const selectedStoreId = input.selectedStoreId ?? null;
  const selectedPricingStrategyId = input.selectedPricingStrategyId ?? null;
  const strategy = findStrategy(pricingStrategies, selectedPricingStrategyId);
  const currencyCode = resolveListingCurrencyCode(stores, selectedStoreId);
  const pricing = calculateProductSupplySuggestedPrice(product, strategy, input.finalPrice, currencyCode);
  const hasStrategySelection = Number.isInteger(selectedPricingStrategyId) && Number(selectedPricingStrategyId) > 0;
  const explicitFinalPrice = normalizeNumeric(input.finalPrice);
  const checks: ListingCheckItem[] = [];
  const resolvedModelName = product?.modelName || product?.offerId;
  const templateSnapshot = normalizeTemplateSnapshot(product?.templateSnapshot);
  const brandAttribute = templateSnapshot
    ? Array.from(templateSnapshot.attributeMetaMap.entries()).find(([, meta]) => isBrandTemplateAttribute(meta))
    : null;
  const brandAttributeId = brandAttribute ? brandAttribute[0] : null;
  const brandFilled = hasMeaningfulValue(product?.brand);
  const brandCheckStatus = brandFilled ? 'pass' : 'error';
  const brandCheckMessage = !brandFilled
    ? '请填写品牌'
    : '品牌已填写';

  checks.push(createCheck(
    '上架参数',
    'storeId',
    '目标店铺',
    selectedStoreId ? 'pass' : 'error',
    selectedStoreId ? '已选择上架店铺' : (stores.length > 0 ? '请选择目标店铺' : '请先配置并启用 Ozon 店铺'),
  ));
  checks.push(createCheck(
    '上架参数',
    'pricingStrategyId',
    '定价策略',
    hasStrategySelection ? 'pass' : 'error',
    hasStrategySelection && strategy
      ? `已选择策略：${strategy.name}`
      : (pricingStrategies.length > 0 ? '请选择定价策略' : '请先创建定价策略'),
  ));

  const resolvedFinalPrice = normalizeNumeric(pricing.finalPrice);
  checks.push(createCheck(
    '上架参数',
    'finalPrice',
    '最终上架价格',
    explicitFinalPrice && explicitFinalPrice > 0 ? 'pass' : 'error',
    explicitFinalPrice && explicitFinalPrice > 0 ? `最终价格：${roundCurrency(explicitFinalPrice)} ${pricing.currencyCode}` : '请确认最终上架价格',
  ));

  if (!hasMeaningfulValue(product?.name)) {
    checks.push(createCheck('基础信息', 'name', '商品名称', 'warning', '商品名称为空，Ozon 将按类目、品牌、型号和重要特征自动生成'));
  } else if (String(product.name).trim().length < 6) {
    checks.push(createCheck('基础信息', 'name', '商品名称', 'warning', '商品名称较短，建议补充关键信息'));
  } else {
    checks.push(createCheck('基础信息', 'name', '商品名称', 'pass', '商品名称已填写'));
  }

  checks.push(createCheck(
    '基础信息',
    brandAttributeId ? `requiredAttribute-${brandAttributeId}` : 'brand',
    '品牌',
    brandCheckStatus,
    brandCheckMessage,
  ));
  checks.push(createCheck(
    '基础信息',
    'modelName',
    '型号名称',
    hasMeaningfulValue(resolvedModelName) ? 'pass' : 'error',
    hasMeaningfulValue(resolvedModelName) ? '型号名称已填写' : '请填写型号名称',
  ));
  checks.push(createCheck(
    '基础信息',
    'descriptionCategoryId',
    'Ozon 类目',
    hasMeaningfulValue(product?.descriptionCategoryId) ? 'pass' : 'error',
    hasMeaningfulValue(product?.descriptionCategoryId) ? '类目已选择' : '请先选择商品类目',
  ));

  const descriptionFilled = hasMeaningfulValue(product?.description);
  checks.push(createCheck(
    '基础信息',
    'description',
    '商品描述',
    descriptionFilled ? 'pass' : 'warning',
    descriptionFilled ? '商品描述已填写' : '商品描述为空，建议补充后再上架',
  ));

  const mainImage = normalizeImageUrl(product?.imageUrl || (Array.isArray(product?.images) ? product.images[0] : ''));
  const allImages = [
    mainImage,
    ...(Array.isArray(product?.images) ? product.images.map(normalizeImageUrl) : []),
  ].filter(Boolean);
  checks.push(createCheck(
    '基础信息',
    'mainImage',
    '主图',
    allImages.length > 0 ? 'pass' : 'error',
    allImages.length > 0 ? '主图已填写' : '请上传商品主图',
  ));

  const numberFields: Array<{ key: string; label: string; value: any }> = [
    { key: 'packageLength', label: '包装长度', value: product?.packageLength },
    { key: 'packageWidth', label: '包装宽度', value: product?.packageWidth },
    { key: 'packageHeight', label: '包装高度', value: product?.packageHeight },
    { key: 'grossWeight', label: '重量', value: product?.grossWeight },
  ];
  for (const field of numberFields) {
    const num = normalizeNumeric(field.value);
    checks.push(createCheck(
      '尺寸重量',
      field.key,
      field.label,
      num && num > 0 ? 'pass' : 'error',
      num && num > 0 ? `${field.label}已填写` : `${field.label}必须大于 0`,
    ));
  }

  const listingAssessment = assessProductSupplyListing(product);
  const requiredAttributeIds = getRequiredListingAttributeIds(templateSnapshot, product);

  if (listingAssessment.missingAttributeIds.length > 0) {
    for (const attributeId of listingAssessment.missingAttributeIds) {
      if (brandAttributeId && attributeId === brandAttributeId) {
        continue;
      }
      checks.push(createCheck(
        '模板信息',
        `requiredAttribute-${attributeId}`,
        buildAttributeLabel(attributeId, templateSnapshot),
        'error',
        '必填属性未填写',
      ));
    }
  } else if (templateSnapshot && requiredAttributeIds.length > 0) {
    checks.push(createCheck('模板信息', 'requiredAttributes', '必填属性', 'pass', '必填属性已填写'));
  }

  const optionalEmptyCount = templateSnapshot
    ? Array.from(templateSnapshot.attributeMetaMap.values()).filter(item => item?.is_required !== true).reduce((count, item) => {
        const id = getAttributeId(item);
        if (!Number.isFinite(id)) return count;
        return collectFilledAttributeIds(product).has(id) ? count : count + 1;
      }, 0)
    : 0;
  if (optionalEmptyCount > 0) {
    checks.push(createCheck('模板信息', 'optionalAttributes', '可选属性', 'warning', `仍有 ${optionalEmptyCount} 项可选属性未填写`));
  }

  const barcodeFilled = hasMeaningfulValue(product?.barcode);
  checks.push(createCheck(
    '模板信息',
    'barcode',
    '条形码',
    barcodeFilled ? 'pass' : 'warning',
    barcodeFilled ? '条形码已填写' : '当前商品未填写条形码',
  ));

  checks.push(...buildSkuChecks(product, input.skuItems));

  if (strategy && hasStrategySelection && explicitFinalPrice && explicitFinalPrice > 0) {
    const suggestedPrice = pricing.suggestedPrice;
    const differenceRatio = suggestedPrice > 0 ? Math.abs(explicitFinalPrice - suggestedPrice) / suggestedPrice : 0;
    if (differenceRatio >= 0.3) {
      checks.push(createCheck('上架参数', 'priceDiff', '价格偏差', 'warning', '最终价格与建议价差异较大，请再次确认'));
    } else {
      checks.push(createCheck('上架参数', 'priceDiff', '价格偏差', 'pass', '最终价格与建议价偏差可接受'));
    }
  }

  const blockingCount = checks.filter(item => item.status === 'error').length;
  const warningCount = checks.filter(item => item.status === 'warning').length;

  return {
    product,
    stores,
    pricingStrategies,
    pricing,
    checks,
    canSubmit: blockingCount === 0,
    blockingCount,
    warningCount,
  };
}
