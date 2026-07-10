import assert from 'assert';
import {
  assessProductSupplyListing,
  buildProductSupplyListingPreview,
  calculateProductSupplySuggestedPrice,
} from '../src/services/productSupplyListingService';
import {
  enrichOzonProductAttributesForImport,
  normalizeOzonImageUrlForImport,
} from '../src/services/ozonProductService';

function createBaseProduct(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    name: '蓝牙耳机',
    brand: 'SoundLab',
    modelName: 'SL-A1',
    price: 100,
    description: '示例描述',
    imageUrl: 'https://example.com/main.png',
    images: ['https://example.com/main.png', 'https://example.com/detail.png'],
    category: '耳机',
    descriptionCategoryId: 17028929,
    typeId: 504866264,
    packageLength: 120,
    packageWidth: 80,
    packageHeight: 40,
    grossWeight: 320,
    offerId: 'OFFER-001',
    sku: 'SKU-001',
    alibabaId: null,
    barcode: '1234567890123',
    attributes: {
      1001: { value: '黑色', valueId: 2001 },
      1002: '入耳式',
      1004: '#tech',
    },
    hiddenAttributes: {
      2003: { value: '中国', valueId: 3001 },
    },
    variantAttributes: [],
    templateSnapshot: {
      requiredAttributeIds: [1001, 1002, 2003],
      variantAttributes: [
        { id: 1001, name: '颜色', is_required: true, section: 'variant', type: 'select', values: [] },
        { id: 1002, name: '佩戴方式', is_required: true, section: 'variant', type: 'string', values: [] },
      ],
      commonVariantAttributes: [
        { id: 1004, name: '#主题标签', is_required: false, section: 'variant', displaySection: 'commonVariant', type: 'string', values: [] },
      ],
      hiddenAttributes: [
        { id: 2003, name: '原产国', is_required: true, section: 'hidden', type: 'select', values: [] },
      ],
      skuDimensionCandidates: [],
      rawAttributes: [],
      source: 'cache',
      cachedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

async function main() {
  const incomplete = assessProductSupplyListing(createBaseProduct({
    imageUrl: '',
    images: [],
    descriptionCategoryId: null,
    typeId: null,
    packageLength: 0,
    packageHeight: 0,
    grossWeight: null,
    templateSnapshot: null,
  }));

  assert.equal(incomplete.ready, false);
  assert.deepEqual(incomplete.missingFields, [
    'images',
    'descriptionCategoryId',
    'packageLength',
    'packageHeight',
    'grossWeight',
  ]);

  const complete = assessProductSupplyListing(createBaseProduct());
  assert.equal(complete.ready, true);
  assert.deepEqual(complete.missingFields, []);

  const missingRequiredAttributes = assessProductSupplyListing(createBaseProduct({
    hiddenAttributes: {},
  }));
  assert.equal(missingRequiredAttributes.ready, false);
  assert.deepEqual(missingRequiredAttributes.missingFields, ['requiredAttributes']);
  assert.deepEqual(missingRequiredAttributes.missingAttributeIds, [2003]);

  const missingCommonVariantAttribute = assessProductSupplyListing(createBaseProduct({
    attributes: {
      1001: { value: '黑色', valueId: 2001 },
      1002: '入耳式',
    },
    templateSnapshot: {
      ...createBaseProduct().templateSnapshot,
      requiredAttributeIds: [1001, 1002, 1004, 2003],
    },
  }));
  assert.equal(missingCommonVariantAttribute.ready, false);
  assert.deepEqual(missingCommonVariantAttribute.missingAttributeIds, [1004]);

  const templateRequiredBaseFields = createBaseProduct({
    attributes: {
      1001: { value: '黑色', valueId: 2001 },
      1002: '入耳式',
    },
    templateSnapshot: {
      ...createBaseProduct().templateSnapshot,
      requiredAttributeIds: [1001, 1002, 3001, 3002],
      rawAttributes: [
        { id: 3001, name: '品牌', is_required: true, section: 'raw', type: 'string', values: [] },
        { id: 3002, name: '型号名称（针对合并为一张商品卡片）', is_required: true, section: 'raw', type: 'string', values: [] },
      ],
    },
  });
  const baseFieldTemplateAssessment = assessProductSupplyListing(templateRequiredBaseFields);
  assert.equal(baseFieldTemplateAssessment.ready, true);
  assert.deepEqual(baseFieldTemplateAssessment.missingAttributeIds, []);

  const baseFieldTemplatePreview = buildProductSupplyListingPreview({
    product: templateRequiredBaseFields,
    stores: [{ id: 3, name: '店铺A', status: 'active' }],
    pricingStrategies: [{
      id: 9,
      name: '默认策略',
      basePrice: 1.5,
      shippingPrice: 20,
      tariffRate: 10,
      profitRate: 30,
      platformFeeRate: 5,
      otherCost: 5,
      isDefault: true,
    }],
    selectedStoreId: 3,
    selectedPricingStrategyId: 9,
    finalPrice: 242.5,
  });
  assert.equal(
    baseFieldTemplatePreview.checks.some(check => check.group === '模板信息' && check.status === 'error' && /品牌|型号名称/.test(check.label)),
    false,
  );

  const pricing = calculateProductSupplySuggestedPrice(createBaseProduct(), {
    id: 9,
    name: '默认策略',
    basePrice: 1.5,
    shippingPrice: 20,
    tariffRate: 10,
    profitRate: 30,
    platformFeeRate: 5,
    otherCost: 5,
    isDefault: true,
  });
  assert.equal(pricing.suggestedPrice, 242.5);
  assert.equal(pricing.finalPrice, 242.5);
  assert.equal(pricing.breakdown.length >= 4, true);

  const previewWithoutSelections = buildProductSupplyListingPreview({
    product: createBaseProduct(),
    stores: [],
    pricingStrategies: [],
    selectedStoreId: null,
    selectedPricingStrategyId: null,
    finalPrice: null,
  });
  assert.equal(previewWithoutSelections.canSubmit, false);
  assert.equal(previewWithoutSelections.blockingCount >= 3, true);
  assert.equal(previewWithoutSelections.pricing.strategyName, '未选择');

  const previewWithWarning = buildProductSupplyListingPreview({
    product: createBaseProduct({
      description: '',
      barcode: '',
    }),
    stores: [{ id: 3, name: '店铺A', status: 'active' }],
    pricingStrategies: [{
      id: 9,
      name: '默认策略',
      basePrice: 1.5,
      shippingPrice: 20,
      tariffRate: 10,
      profitRate: 30,
      platformFeeRate: 5,
      otherCost: 5,
      isDefault: true,
    }],
    selectedStoreId: 3,
    selectedPricingStrategyId: 9,
    finalPrice: 242.5,
  });
  assert.equal(previewWithWarning.canSubmit, true);
  assert.equal(previewWithWarning.warningCount >= 2, true);
  assert.equal(previewWithWarning.blockingCount, 0);

  const previewWithoutName = buildProductSupplyListingPreview({
    product: createBaseProduct({
      name: '',
    }),
    stores: [{ id: 3, name: '店铺A', status: 'active' }],
    pricingStrategies: [{
      id: 9,
      name: '默认策略',
      basePrice: 1.5,
      shippingPrice: 20,
      tariffRate: 10,
      profitRate: 30,
      platformFeeRate: 5,
      otherCost: 5,
      isDefault: true,
    }],
    selectedStoreId: 3,
    selectedPricingStrategyId: 9,
    finalPrice: 242.5,
  });
  assert.equal(previewWithoutName.canSubmit, true);
  assert.equal(
    previewWithoutName.checks.some(check => check.key === 'name' && check.status === 'warning' && check.message.includes('Ozon')),
    true,
    '商品名称为空时应允许提交，并提示 Ozon 会自动生成名称',
  );

  const previewWithCnyStore = buildProductSupplyListingPreview({
    product: createBaseProduct(),
    stores: [{ id: 8, name: '人民币店铺', status: 'active', currency: 'CNY' }],
    pricingStrategies: [{
      id: 9,
      name: '默认策略',
      basePrice: 1.5,
      shippingPrice: 20,
      tariffRate: 10,
      profitRate: 30,
      platformFeeRate: 5,
      otherCost: 5,
      isDefault: true,
    }],
    selectedStoreId: 8,
    selectedPricingStrategyId: 9,
    finalPrice: 242.5,
  });
  assert.equal(
    previewWithCnyStore.pricing.currencyCode,
    'CNY',
    '商品库上架预览应使用目标店铺币种，不能固定为 RUB',
  );
  assert.equal(
    previewWithCnyStore.checks.some(check => check.key === 'finalPrice' && check.message.includes('242.5 CNY')),
    true,
    '提交前检查文案应显示目标店铺币种',
  );
  assert.equal(
    previewWithWarning.checks.some(check => check.group === '基础信息' && check.key === 'modelName' && check.label === '型号名称'),
    true,
  );
  assert.equal(
    previewWithWarning.checks.some(check => check.key === 'mainImage' && check.group === '基础信息'),
    true,
    '主图检查应归入基础信息',
  );
  assert.equal(
    previewWithWarning.checks.some(check => check.group === '媒体与图片'),
    false,
    '媒体与图片 tab 不应再单独出现',
  );
  assert.equal(
    previewWithWarning.checks.some(check => check.key === 'mainImageUrl'),
    false,
    '图片公网地址检查已由上架上传图床机制替代，不应阻止上架',
  );
  assert.equal(
    previewWithWarning.checks.some(check => check.group === '模板信息' && check.label === '型号名称'),
    false,
  );
  assert.equal(
    previewWithWarning.checks.some(check => check.key === 'typeId' || check.label === 'Ozon 类型'),
    false,
  );
  assert.equal(
    previewWithWarning.checks.some(check => check.key === 'templateSnapshot' || check.label === '类目属性模板'),
    false,
  );
  for (const key of ['packageLength', 'packageWidth', 'packageHeight', 'grossWeight']) {
    assert.equal(
      previewWithWarning.checks.some(check => check.key === key && check.group === '尺寸重量'),
      true,
      `${key} 应归入尺寸重量分组`,
    );
    assert.equal(
      previewWithWarning.checks.some(check => check.key === key && check.group === '模板信息'),
      false,
      `${key} 不应继续归入模板信息分组`,
    );
  }

  const previewWithApiStyleRequiredAttributes = buildProductSupplyListingPreview({
    product: createBaseProduct({
      attributes: {},
      hiddenAttributes: {},
      templateSnapshot: {
        ...createBaseProduct().templateSnapshot,
        requiredAttributeIds: [10085, 19048, 18229],
        rawAttributes: [
          { attribute_id: 10085, attribute_name: '颜色', is_required: true, type: 'String', values: [] },
          { attribute_id: 19048, attributeName: '连接方式', is_required: true, type: 'String', values: [] },
          { id: 18229, title: '佩戴方式', is_required: true, type: 'String', values: [] },
        ],
      },
    }),
    stores: [{ id: 3, name: '店铺A', status: 'active' }],
    pricingStrategies: [{
      id: 9,
      name: '默认策略',
      basePrice: 1.5,
      shippingPrice: 20,
      tariffRate: 10,
      profitRate: 30,
      platformFeeRate: 5,
      otherCost: 5,
      isDefault: true,
    }],
    selectedStoreId: 3,
    selectedPricingStrategyId: 9,
    finalPrice: 242.5,
  });
  assert.equal(
    previewWithApiStyleRequiredAttributes.checks.some(check => check.key === 'requiredAttribute-10085' && check.label === '颜色'),
    true,
    'API 风格 attribute_id / attribute_name 也应解析出属性名称',
  );
  assert.equal(
    previewWithApiStyleRequiredAttributes.checks.some(check => check.key === 'requiredAttribute-19048' && check.label === '连接方式'),
    true,
    'attributeName 也应解析出属性名称',
  );
  assert.equal(
    previewWithApiStyleRequiredAttributes.checks.some(check => check.key === 'requiredAttribute-18229' && check.label === '佩戴方式'),
    true,
    'title 也应作为属性名称兜底',
  );

  const previewWithBaseFieldRequiredIdsOnly = buildProductSupplyListingPreview({
    product: createBaseProduct({
      brand: '无品牌',
      modelName: 'hk_20260625',
      attributes: {},
      hiddenAttributes: {},
      templateSnapshot: {
        ...createBaseProduct().templateSnapshot,
        requiredAttributeIds: [85, 9048, 8229],
        variantAttributes: [],
        commonVariantAttributes: [],
        hiddenAttributes: [],
        skuDimensionCandidates: [],
        rawAttributes: [],
      },
    }),
    stores: [{ id: 3, name: '店铺A', status: 'active' }],
    pricingStrategies: [{
      id: 9,
      name: '默认策略',
      basePrice: 1.5,
      shippingPrice: 20,
      tariffRate: 10,
      profitRate: 30,
      platformFeeRate: 5,
      otherCost: 5,
      isDefault: true,
    }],
    selectedStoreId: 3,
    selectedPricingStrategyId: 9,
    finalPrice: 242.5,
  });
  assert.equal(
    previewWithBaseFieldRequiredIdsOnly.checks.some(check => /^requiredAttribute-(85|9048|8229)$/.test(check.key)),
    false,
    '已映射为基础字段的 Ozon 必填属性 ID 不应在模板信息中重复报错',
  );

  const previewWithLegacyOfferId = buildProductSupplyListingPreview({
    product: createBaseProduct({
      modelName: '',
      offerId: 'OFFER-LEGACY-001',
    }),
    stores: [{ id: 3, name: '店铺A', status: 'active' }],
    pricingStrategies: [{
      id: 9,
      name: '默认策略',
      basePrice: 1.5,
      shippingPrice: 20,
      tariffRate: 10,
      profitRate: 30,
      platformFeeRate: 5,
      otherCost: 5,
      isDefault: true,
    }],
    selectedStoreId: 3,
    selectedPricingStrategyId: 9,
    finalPrice: 242.5,
  });
  assert.equal(
    previewWithLegacyOfferId.checks.some(check => check.key === 'modelName' && check.status === 'pass'),
    true,
  );

  const previewWithLocalImage = buildProductSupplyListingPreview({
    product: createBaseProduct({
      imageUrl: '/images/local.png',
      images: ['/images/local.png'],
    }),
    stores: [{ id: 3, name: '店铺A', status: 'active' }],
    pricingStrategies: [{
      id: 9,
      name: '默认策略',
      basePrice: 1.5,
      shippingPrice: 20,
      tariffRate: 10,
      profitRate: 30,
      platformFeeRate: 5,
      otherCost: 5,
      isDefault: true,
    }],
    selectedStoreId: 3,
    selectedPricingStrategyId: 9,
    finalPrice: 242.5,
  });
  assert.equal(previewWithLocalImage.canSubmit, true);
  assert.equal(
    previewWithLocalImage.checks.some(check => check.key === 'mainImageUrl'),
    false,
  );

  const multiSkuPreview = buildProductSupplyListingPreview({
    product: createBaseProduct({
      offerId: null,
      sku: null,
      variantSummary: '颜色：黑色 / 尺寸：M',
      skus: [
        { offerId: 'OFFER-1', sku: 'SKU-1', price: 120 },
        { offerId: 'OFFER-1', sku: 'SKU-2', price: 130 },
      ],
    }),
    stores: [{ id: 3, name: '店铺A', status: 'active' }],
    pricingStrategies: [{
      id: 9,
      name: '默认策略',
      basePrice: 1.5,
      shippingPrice: 20,
      tariffRate: 10,
      profitRate: 30,
      platformFeeRate: 5,
      otherCost: 5,
      isDefault: true,
    }],
    selectedStoreId: 3,
    selectedPricingStrategyId: 9,
    finalPrice: 242.5,
    skuItems: [
      { offerId: 'OFFER-1', sku: 'SKU-1', price: 120 },
      { offerId: 'OFFER-1', sku: 'SKU-2', price: 130 },
    ],
  });
  assert.equal(
    multiSkuPreview.checks.some(check => check.key === 'offerIdDuplicate' && check.status === 'error'),
    false,
  );
  assert.equal(
    multiSkuPreview.checks.some(check => check.group === '模板信息' && check.label.includes('型号名称')),
    false,
  );

  const importedAttributes = enrichOzonProductAttributesForImport({
    brand: '无品牌',
    modelName: 'SL-A1',
    attributes: {
      1001: { value: '黑色', valueId: 2001 },
    },
    hiddenAttributes: {
      11863: 'true',
    },
    variantAttributes: [
      { attributeId: 20255, value: ['固定', '移动'] },
    ],
    templateSnapshot: createBaseProduct().templateSnapshot,
  }, []);

  assert.equal(
    importedAttributes.some(item => item.id === 85 && item.values.some((value: any) => value.dictionary_value_id === 126745801 && value.value === 'Нет бренда')),
    true,
  );
  assert.equal(
    importedAttributes.some(item => item.id === 9048 && item.values.some((value: any) => value.value === 'SL-A1')),
    true,
  );
  assert.equal(
    importedAttributes.some(item => item.id === 11863 && item.values.some((value: any) => value.value === 'true')),
    true,
  );
  assert.equal(
    importedAttributes.some(item => item.id === 20255 && item.values.length === 2),
    true,
  );

  const importedAttributesWithRawNoBrand = enrichOzonProductAttributesForImport({
    brand: '无品牌',
    modelName: 'SL-A1',
    attributes: {
      85: { value: '无品牌', valueId: 0 },
      9048: { value: 'SL-A1' },
    },
    hiddenAttributes: {},
    variantAttributes: [],
    templateSnapshot: createBaseProduct().templateSnapshot,
  }, []);

  assert.deepEqual(
    importedAttributesWithRawNoBrand.find(item => item.id === 85)?.values,
    [{ dictionary_value_id: 126745801, value: 'Нет бренда' }],
    '普通属性里的“无品牌”也必须转换成 Ozon 无品牌字典值，不能提交 dictionary_value_id=0',
  );

  assert.equal(
    normalizeOzonImageUrlForImport('http://localhost:3000/images/1782044120518.png'),
    '/images/1782044120518.png',
  );
  assert.equal(
    normalizeOzonImageUrlForImport('http://127.0.0.1:5173/images/test.png'),
    '/images/test.png',
  );
  assert.equal(
    normalizeOzonImageUrlForImport('https://cdn.example.com/image.png'),
    'https://cdn.example.com/image.png',
  );

  console.log('productSupplyListingValidation.test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
