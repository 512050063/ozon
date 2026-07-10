import assert from 'assert';
import {
  buildOzonAttributeValueCacheRows,
  buildVariantSummary,
  expandProductSupplySkus,
  normalizeOzonProductTemplate,
  toClientProductTemplate,
} from '../src/services/productSupplyTemplateService';

const rawAttributes = [
  {
    id: 4180,
    name: '名称',
    description: 'Generated Ozon product title',
    type: 'String',
    is_required: true,
    dictionary_id: 0,
  },
  {
    id: 85,
    name: '品牌',
    description: 'Brand',
    type: 'String',
    is_required: true,
    dictionary_id: 28732849,
  },
  {
    id: 9048,
    name: '型号名称（针对合并为一张商品卡片）',
    description: 'Model merge key',
    type: 'String',
    is_required: true,
    dictionary_id: 0,
  },
  {
    id: 23171,
    name: '#主题标签',
    description: 'Hashtags',
    type: 'String',
    is_required: false,
    is_collection: true,
    dictionary_id: 912,
    values: [{ id: 77, value: '#tech' }],
  },
  {
    id: 4191,
    name: '简介',
    description: 'Marketing description',
    type: 'String',
    is_required: false,
    dictionary_id: 0,
  },
  {
    id: 10096,
    name: '商品颜色',
    description: '请选择商品颜色',
    type: 'String',
    is_required: false,
    dictionary_id: 1494,
    is_collection: true,
    is_aspect: true,
    category_dependent: true,
    values: [
      { id: 1, value: '黑色' },
      { id: 2, value: '白色' },
    ],
  },
  {
    id: 20254,
    name: '耳机类型',
    description: 'Headphone kind',
    type: 'String',
    is_required: true,
    dictionary_id: 123,
    category_dependent: true,
    values: [{ id: 9, value: '入耳式' }],
  },
  {
    id: 4382,
    name: '尺寸，毫米',
    description: 'Physical product dimensions',
    type: 'String',
    is_required: false,
    dictionary_id: 0,
    group_name: '主要信息',
  },
  {
    id: 4181,
    name: 'Rich-контент JSON',
    description: 'Hidden technical field',
    type: 'String',
    is_required: false,
    dictionary_id: 0,
  },
  {
    id: 8790,
    name: 'PDF 文件',
    description: 'PDF URL',
    type: 'URL',
    is_required: false,
    dictionary_id: 0,
    attribute_complex_id: 8788,
    complex_is_collection: true,
  },
];

const template = normalizeOzonProductTemplate({
  descriptionCategoryId: 17028922,
  typeId: 971697579,
  language: 'ZH_HANS',
  attributes: rawAttributes,
});

assert.strictEqual(template.descriptionCategoryId, 17028922);
assert.strictEqual(template.typeId, 971697579);
assert.deepStrictEqual(template.commonVariantAttributes.map(attr => attr.id), [23171, 4191]);
assert.strictEqual(template.hiddenAttributes.some(attr => attr.id === 85), true);
assert.strictEqual(template.hiddenAttributes.some(attr => attr.id === 20254), true);
assert.strictEqual(template.hiddenAttributes.some(attr => attr.id === 4181), true);
assert.deepStrictEqual(
  template.skuDimensionCandidates.map(attr => attr.id),
  [10096]
);
assert.strictEqual(template.variantAttributes.some(attr => attr.id === 4382), false);
assert.strictEqual(template.hiddenAttributes.some(attr => attr.id === 8790), false);
assert.deepStrictEqual(template.requiredAttributeIds.sort((a, b) => a - b), [85, 9048, 20254]);
assert.strictEqual(template.hiddenAttributes.find(attr => attr.id === 85)?.type, 'select');
assert.strictEqual(template.skuDimensionCandidates.find(attr => attr.id === 10096)?.type, 'select');

const clientTemplate = toClientProductTemplate({
  ...template,
  variantAttributes: [
    ...template.variantAttributes,
    {
      id: 999,
      name: '大字典非SKU字段',
      description: 'Very large dictionary',
      type: 'select',
      is_required: true,
      dictionary_id: 999,
      group_id: null,
      group_name: null,
      is_collection: false,
      is_dependent: false,
      is_aspect: false,
      category_dependent: false,
      attribute_complex_id: 0,
      complex_is_collection: false,
      precision: null,
      max_value_count: null,
      section: 'variant',
      displaySection: 'commonVariant',
      isSkuDimension: false,
      values: Array.from({ length: 101 }, (_, index) => ({ id: index + 1, value: `选项${index + 1}` })),
    },
  ],
});

assert.strictEqual(clientTemplate.rawAttributes.length, 0);
assert.strictEqual(clientTemplate.skuDimensionCandidates.find(attr => attr.id === 10096)?.values?.length, 2);
assert.strictEqual(clientTemplate.variantAttributes.find(attr => attr.id === 999)?.values, undefined);

assert.deepStrictEqual(
  buildOzonAttributeValueCacheRows(12, [
    { id: 1, info: '黑色', value: 'Black' },
    { id: 1, info: '黑色重复', value: 'Black Duplicate' },
    { id: 2, value: '白色' },
    { id: 0, value: '无效' },
    { value: '缺少ID' },
  ]),
  [
    { attributeId: 12, valueId: 1, value: '黑色' },
    { attributeId: 12, valueId: 2, value: '白色' },
  ]
);

assert.strictEqual(
  buildVariantSummary([
    { attributeId: 85, name: '颜色', value: '黑色' },
    { attributeId: 4298, name: 'Размер', value: '标准版' },
  ]),
  '颜色：黑色 / Размер：标准版'
);

const expanded = expandProductSupplySkus({
  base: {
    name: 'Redmi Buds 6',
    category: '电子产品 > 耳机和耳麦 > 耳机',
    brand: '无品牌',
    modelName: 'RMB_20260624',
    description: 'Wireless headphones',
    imageUrl: 'https://example.com/1.jpg',
    images: ['https://example.com/1.jpg'],
    price: 1299,
    oldPrice: 1599,
    packageLength: 100,
    packageWidth: 80,
    packageHeight: 40,
    grossWeight: 120,
    descriptionCategoryId: 17028922,
    typeId: 971697579,
    attributes: { 9048: 'Wireless headphones' },
    hiddenAttributes: { 4180: '{"content":[]}' },
  },
  skus: [
    {
      offerId: 'RMB-BLK',
      sku: 'SKU-RMB-BLK',
      barcode: '460000000001',
      price: 1299,
      oldPrice: 1599,
      variantAttributes: [
        { attributeId: 85, name: '颜色', value: '黑色', valueId: 1 },
      ],
      attributes: { 85: { value: '黑色', valueId: 1 } },
    },
    {
      offerId: 'RMB-WHT',
      sku: 'SKU-RMB-WHT',
      barcode: '460000000002',
      price: 1399,
      variantAttributes: [
        { attributeId: 85, name: '颜色', value: '白色', valueId: 2 },
      ],
      attributes: { 85: { value: '白色', valueId: 2 } },
    },
  ],
  templateSnapshot: template,
});

assert.strictEqual(expanded.length, 2);
assert.strictEqual(expanded[0].name, 'Redmi Buds 6');
assert.strictEqual(expanded[1].name, 'Redmi Buds 6');
assert.strictEqual(expanded[0].offerId, 'RMB-BLK');
assert.strictEqual(expanded[0].sku, 'SKU-RMB-BLK');
assert.strictEqual(expanded[0].alibabaId, null);
assert.strictEqual(expanded[1].barcode, '460000000002');
assert.strictEqual(expanded[0].variantSummary, '颜色：黑色');
assert.strictEqual(expanded[1].variantSummary, '颜色：白色');
assert.deepStrictEqual(expanded[0].attributes['85'], { value: '黑色', valueId: 1 });
assert.deepStrictEqual(expanded[0].attributes['9048'], 'Wireless headphones');
assert.deepStrictEqual(expanded[0].hiddenAttributes['4180'], '{"content":[]}');
assert.strictEqual(expanded[0].descriptionCategoryId, 17028922);
assert.strictEqual(expanded[0].typeId, 971697579);

assert.throws(
  () => expandProductSupplySkus({
    base: {
      name: 'Duplicate',
      category: '',
      brand: '',
      modelName: '',
      description: '',
      imageUrl: '',
      images: [],
      price: 1,
      packageLength: 1,
      packageWidth: 1,
      packageHeight: 1,
      grossWeight: 1,
      attributes: {},
      hiddenAttributes: {},
    },
    skus: [
      { offerId: 'DUP', sku: 'SKU-1', price: 1, variantAttributes: [], attributes: {} },
      { offerId: 'DUP', sku: 'SKU-2', price: 2, variantAttributes: [], attributes: {} },
    ],
  }),
  /型号名称重复/
);

assert.throws(
  () => expandProductSupplySkus({
    base: {
      name: 'Duplicate SKU',
      category: '',
      brand: '',
      modelName: '',
      description: '',
      imageUrl: '',
      images: [],
      price: 1,
      packageLength: 1,
      packageWidth: 1,
      packageHeight: 1,
      grossWeight: 1,
      attributes: {},
      hiddenAttributes: {},
    },
    skus: [
      { offerId: 'OFFER-1', sku: 'DUP-SKU', price: 1, variantAttributes: [], attributes: {} },
      { offerId: 'OFFER-2', sku: 'DUP-SKU', price: 2, variantAttributes: [], attributes: {} },
    ],
  }),
  /货号重复/
);

console.log('productSupplyTemplateService tests passed');
