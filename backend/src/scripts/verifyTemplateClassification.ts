import { normalizeOzonProductTemplate } from '../services/productSupplyTemplateService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const template = normalizeOzonProductTemplate({
  descriptionCategoryId: 17028929,
  typeId: 504866264,
  language: 'ZH_HANS',
  attributes: [
    { id: 10096, name: '商品颜色', dictionary_id: 1, is_collection: true, is_required: false },
    { id: 20254, name: '耳机类型', dictionary_id: 2, is_collection: false, is_required: false, group_name: '结构' },
    { id: 20357, name: '无线连接类型', dictionary_id: 3, is_collection: true, is_required: false, group_name: '连接' },
    { id: 21837, name: '臭氧。视频：标题', type: 'string', is_required: false },
    { id: 23171, name: '#主题标签', type: 'string', is_required: false },
  ],
});

const variantIds = new Set(template.variantAttributes.map(attr => attr.id));
const hiddenIds = new Set(template.hiddenAttributes.map(attr => attr.id));

assert(variantIds.has(20254), '耳机类型应当作为可见模板字段');
assert(variantIds.has(20357), '无线连接类型应当作为可见模板字段');
assert(!variantIds.has(21837), 'Ozon 视频标题不应出现在可见模板字段');
assert(!variantIds.has(23171), '主题标签不应出现在可见模板字段');
assert(template.classificationVersion === 2, '模板归类版本应更新为 2');

console.log('PASS verifyTemplateClassification');
