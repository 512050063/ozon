import assert from 'node:assert/strict';
import {
  assertRequiredOzonAttributesForImport,
  buildOzonProductAttributesForImport,
  enrichOzonProductAttributesForImport,
} from '../services/ozonProductService';

const product = {
  brand: '无品牌',
  modelName: 'OZ-SRC-260630-03291783-01',
  attributes: {},
  hiddenAttributes: {},
  variantAttributes: [],
  templateSnapshot: {
    requiredAttributeIds: [85, 9048],
    hiddenAttributes: [
      {
        id: 85,
        name: '品牌',
        type: 'select',
        dictionary_id: 28732849,
        is_required: true,
        values: [{ id: 970736931, value: '无品牌' }],
      },
      {
        id: 9048,
        name: '型号名称（针对合并为一张商品卡片）',
        type: 'string',
        dictionary_id: 0,
        is_required: true,
      },
    ],
  },
};

const attributes = buildOzonProductAttributesForImport(product);
const brand = attributes.find(item => item.id === 85);
const modelName = attributes.find(item => item.id === 9048);
const optionalHeadphoneModel = attributes.find(item => item.id === 10265);

assert.ok(brand, 'Ozon 导入属性应从基础字段补齐品牌');
assert.deepEqual(brand?.values, [{ dictionary_value_id: 970736931, value: '无品牌' }]);
assert.ok(modelName, 'Ozon 导入属性应从基础字段补齐型号名称');
assert.deepEqual(modelName?.values, [{ value: 'OZ-SRC-260630-03291783-01' }]);
assert.equal(optionalHeadphoneModel, undefined, '不应把基础型号名称自动填入耳机型号等可选字典属性');

const productWithoutTemplateValues = {
  ...product,
  descriptionCategoryId: 17028929,
  typeId: 504866264,
  templateSnapshot: {
    ...product.templateSnapshot,
    hiddenAttributes: [
      {
        id: 85,
        name: '品牌',
        type: 'select',
        dictionary_id: 28732849,
        is_required: true,
      },
      {
        id: 9048,
        name: '型号名称（针对合并为一张商品卡片）',
        type: 'string',
        dictionary_id: 0,
        is_required: true,
      },
      {
        id: 10265,
        name: '耳机型号',
        type: 'select',
        dictionary_id: 971082313,
        is_required: false,
      },
    ],
  },
};

const enrichedAttributes = enrichOzonProductAttributesForImport(productWithoutTemplateValues, [
  { ozonAttributeId: 85, valueId: 126745801, value: 'Нет бренда' },
]);
const enrichedBrand = enrichedAttributes.find(item => item.id === 85);
const enrichedModelName = enrichedAttributes.find(item => item.id === 9048);
const enrichedTemplateModelName = enrichedAttributes.find(item => item.id === 12141);

assert.deepEqual(enrichedBrand?.values, [{ dictionary_value_id: 126745801, value: 'Нет бренда' }]);
assert.deepEqual(enrichedModelName?.values, [{ value: 'OZ-SRC-260630-03291783-01' }]);
assert.deepEqual(enrichedTemplateModelName?.values, undefined);
assert.equal(
  enrichedAttributes.find(item => item.id === 10265),
  undefined,
  '数据库字典补齐时也不应误填可选耳机型号',
);

const textBrandAttributes = buildOzonProductAttributesForImport(productWithoutTemplateValues);
const textBrand = textBrandAttributes.find(item => item.id === 85);
assert.deepEqual(
  textBrand?.values,
  [{ dictionary_value_id: 126745801, value: 'Нет бренда' }],
  '商品库品牌固定为“无品牌”时，必须使用 Ozon 字典值，不能按纯文本提交品牌属性',
);

const productWithTemplateModelName = {
  ...productWithoutTemplateValues,
  templateSnapshot: {
    ...productWithoutTemplateValues.templateSnapshot,
    hiddenAttributes: [
      ...(productWithoutTemplateValues.templateSnapshot.hiddenAttributes as any[]),
      {
        id: 12141,
        name: '名称模板的模型名称',
        type: 'string',
        dictionary_id: 0,
        is_required: false,
      },
    ],
  },
};
const attributesWithTemplateModelName = buildOzonProductAttributesForImport(productWithTemplateModelName);
assert.deepEqual(
  attributesWithTemplateModelName.find(item => item.id === 12141)?.values,
  [{ value: 'OZ-SRC-260630-03291783-01' }],
  '名称模板的模型名称需要按型号名称基础字段提交，避免 Ozon 自动截取商品名称',
);

console.log('checkProductSupplyOzonAttributes passed');
