require('ts-node/register/transpile-only');
const assert = require('assert');

const { normalizeOzonProductTemplate } = require('../src/services/productSupplyTemplateService');

const rawAttributes = [
  {
    id: 85,
    name: '品牌',
    type: 'String',
    is_required: true,
    dictionary_id: 28732849,
    attribute_complex_id: 0,
  },
  {
    id: 8229,
    name: '类型',
    type: 'String',
    is_required: true,
    dictionary_id: 1960,
    attribute_complex_id: 0,
  },
  {
    id: 10096,
    name: '商品颜色',
    type: 'String',
    is_required: false,
    dictionary_id: 1494,
    is_collection: true,
    is_aspect: true,
    attribute_complex_id: 0,
  },
  {
    id: 8790,
    name: 'PDF 文件',
    type: 'URL',
    is_required: false,
    dictionary_id: 0,
    attribute_complex_id: 8788,
    complex_is_collection: true,
  },
  {
    id: 8789,
    name: 'PDF文件名称',
    type: 'String',
    is_required: false,
    dictionary_id: 0,
    attribute_complex_id: 8788,
    complex_is_collection: true,
  },
  {
    id: 21837,
    name: '臭氧。视频：标题',
    type: 'String',
    is_required: false,
    dictionary_id: 0,
    attribute_complex_id: 100001,
    complex_is_collection: true,
  },
  {
    id: 21841,
    name: '臭氧。视频：链接',
    type: 'String',
    is_required: false,
    dictionary_id: 0,
    attribute_complex_id: 100001,
    complex_is_collection: true,
  },
];

const template = normalizeOzonProductTemplate({
  descriptionCategoryId: 17028929,
  typeId: 504866264,
  language: 'ZH_HANS',
  attributes: rawAttributes,
  source: 'generated',
});

const allVisibleIds = [
  ...template.variantAttributes.map(item => item.id),
  ...template.hiddenAttributes.map(item => item.id),
  ...template.skuDimensionCandidates.map(item => item.id),
];

assert(allVisibleIds.includes(85), 'Brand attribute should remain visible');
assert(allVisibleIds.includes(8229), 'Type attribute should remain visible');
assert(allVisibleIds.includes(10096), 'Color attribute should remain visible');
assert(!allVisibleIds.includes(8790), 'PDF URL attribute should be filtered out from add/edit form template');
assert(!allVisibleIds.includes(8789), 'PDF title attribute should be filtered out from add/edit form template');
assert(!allVisibleIds.includes(21837), 'Ozon video title attribute should be filtered out from add/edit form template');
assert(!allVisibleIds.includes(21841), 'Ozon video link attribute should be filtered out from add/edit form template');

console.log('check-product-template-filtering: ok');
