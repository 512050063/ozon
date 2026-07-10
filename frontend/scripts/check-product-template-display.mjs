import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const sourcePath = path.resolve('src/views/warehouse/product-library/components/productTemplateDisplay.ts');
const tempDir = path.resolve('.tmp');
const tempPath = path.join(tempDir, 'productTemplateDisplay.test-runtime.mjs');
const source = fs.readFileSync(sourcePath, 'utf8');

fs.mkdirSync(tempDir, { recursive: true });
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
}).outputText;
fs.writeFileSync(tempPath, transpiled);

const {
  getProductTemplateDisplay,
  resolveTemplateBaseField,
  buildTemplateFieldHints,
} = await import(pathToFileURL(tempPath).href + `?t=${Date.now()}`);

const attr = (id, name, extra = {}) => ({
  id,
  name,
  description: `${name} description`,
  type: 'string',
  is_required: false,
  dictionary_id: 0,
  group_id: null,
  group_name: null,
  is_collection: false,
  is_dependent: false,
  precision: null,
  section: 'variant',
  isSkuDimension: false,
  displaySection: 'hidden',
  is_aspect: false,
  category_dependent: false,
  attribute_complex_id: 0,
  complex_is_collection: false,
  ...extra,
});

const template = {
  descriptionCategoryId: 17028929,
  typeId: 504866264,
  language: 'zh_Hans',
  variantAttributes: [
    attr(4180, '名称', { is_required: true }),
    attr(85, '品牌', { is_required: true }),
    attr(9048, '型号名称（针对合并为一张商品卡片）', { is_required: true }),
    attr(9049, '名称模板的模型名称', { is_required: false }),
    attr(23171, '#主题标签', {
      displaySection: 'commonVariant',
      type: 'select',
      is_collection: true,
      values: [{ id: 99, value: '#tech' }],
    }),
    attr(4191, '简介', { displaySection: 'commonVariant', type: 'textarea' }),
    attr(10096, '商品颜色', {
      is_required: true,
      type: 'select',
      isSkuDimension: true,
      displaySection: 'sku',
      is_aspect: true,
      values: [{ id: 1, value: '黑色' }],
    }),
    attr(23489, '是否有序列号', { type: 'select', values: [{ id: 10, value: '否' }] }),
    attr(20254, '耳机类型', { type: 'select', values: [{ id: 20, value: '入耳式' }] }),
    attr(4384, '配套'),
    attr(22232, '原产国', { type: 'select', values: [{ id: 30, value: '中国' }] }),
    attr(4191, '简介', { type: 'textarea' }),
  ],
  hiddenAttributes: [
    attr(22390, '组合成类似的产品', { section: 'hidden' }),
  ],
  commonVariantAttributes: [
    attr(23171, '#主题标签', {
      displaySection: 'commonVariant',
      type: 'select',
      is_collection: true,
      values: [{ id: 99, value: '#tech' }],
    }),
    attr(4191, '简介', { displaySection: 'commonVariant', type: 'textarea' }),
  ],
  skuDimensionCandidates: [
    attr(10096, '商品颜色', {
      is_required: true,
      type: 'select',
      isSkuDimension: true,
      displaySection: 'sku',
      is_aspect: true,
      values: [{ id: 1, value: '黑色' }],
    }),
  ],
  requiredAttributeIds: [85, 9048, 10096],
  rawAttributes: [],
  source: 'cache',
  cachedAt: '2026-06-27T00:00:00.000Z',
};

assert.equal(resolveTemplateBaseField(template.variantAttributes[0]), 'name', 'Ozon 名称属性需要归入商品信息');
assert.equal(resolveTemplateBaseField(template.variantAttributes[2]), 'modelName', '带括号说明的型号名称需要归入商品信息');

const hints = buildTemplateFieldHints(template);
assert.equal(hints.name, '名称 description');
assert.equal(hints.brand, '品牌 description');
assert.equal(hints.modelName, '型号名称（针对合并为一张商品卡片） description');

const addDisplay = getProductTemplateDisplay(template, false);
assert.deepEqual(addDisplay.skuDimensionCandidates.map(item => item.id), [10096], '添加模式需要保留真实 SKU 维度');
assert.deepEqual(addDisplay.editableVariantAttributes.map(item => item.id), [23171, 4191], '添加模式变体特征区应渲染 Ozon 公共变体字段');
assert.ok(!addDisplay.hiddenAttributes.some(item => item.id === 4180), '名称属于商品信息，不应重复进入隐藏特征');
assert.ok(!addDisplay.hiddenAttributes.some(item => item.id === 85), '品牌属于商品信息，不应重复进入隐藏特征');
assert.ok(!addDisplay.hiddenAttributes.some(item => item.id === 9048), '型号名称属于商品信息，不应重复进入隐藏特征');
assert.ok(!addDisplay.hiddenAttributes.some(item => item.id === 9049), '名称模板的模型名称属于商品信息，不应重复进入隐藏特征');
assert.ok(addDisplay.hiddenAttributes.some(item => item.id === 23489), '非 SKU 技术属性应进入隐藏特征');
assert.ok(addDisplay.hiddenAttributes.some(item => item.id === 20254), '耳机类型应进入隐藏特征而不是变体特征');
assert.ok(addDisplay.hiddenAttributes.some(item => item.id === 22232), '原产国应进入隐藏特征且保留下拉值');
assert.ok(!addDisplay.hiddenAttributes.some(item => item.id === 4191), '简介属于公共变体字段，不应进入隐藏特征');
assert.equal(addDisplay.hiddenAttributes.find(item => item.id === 22232)?.values?.[0]?.value, '中国');
assert.equal(addDisplay.hiddenAttributes.filter(item => item.id === 10096).length, 0, 'SKU 维度不应重复进入隐藏特征');

const editDisplay = getProductTemplateDisplay(template, true);
assert.deepEqual(editDisplay.skuDimensionCandidates, [], '编辑模式不显示多 SKU 维度选择');
assert.ok(editDisplay.editableVariantAttributes.some(item => item.id === 10096), '编辑模式单 SKU 仍可编辑当前 SKU 的变体维度属性');
assert.ok(editDisplay.editableVariantAttributes.some(item => item.id === 23171), '编辑模式仍显示公共变体字段');
assert.ok(editDisplay.hiddenAttributes.some(item => item.id === 23489), '编辑模式技术属性仍归隐藏特征');

const expectDisplay = (title, inputTemplate, expected) => {
  const display = getProductTemplateDisplay(inputTemplate, false);
  assert.deepEqual(display.editableVariantAttributes.map(item => item.id), expected.common, `${title}: 公共变体字段不匹配`);
  assert.deepEqual(display.skuDimensionCandidates.map(item => item.id), expected.sku, `${title}: SKU 维度不匹配`);
  for (const id of [...expected.common, ...expected.sku]) {
    assert.equal(display.hiddenAttributes.some(item => item.id === id), false, `${title}: ${id} 不应重复进入隐藏特征`);
  }
};

const templateFromSections = (title, attrs) => ({
  descriptionCategoryId: 1,
  typeId: 1,
  language: 'zh_Hans',
  variantAttributes: attrs.filter(item => item.displaySection !== 'hidden'),
  commonVariantAttributes: attrs.filter(item => item.displaySection === 'commonVariant'),
  hiddenAttributes: attrs.filter(item => item.displaySection === 'hidden'),
  skuDimensionCandidates: attrs.filter(item => item.displaySection === 'sku'),
  requiredAttributeIds: attrs.filter(item => item.is_required).map(item => item.id),
  rawAttributes: [],
  source: title,
  cachedAt: '2026-06-27T00:00:00.000Z',
});

expectDisplay('拖鞋', templateFromSections('slippers', [
  attr(10096, '商品颜色', { displaySection: 'commonVariant', is_required: true, is_aspect: true }),
  attr(10097, '颜色名称', { displaySection: 'commonVariant', is_aspect: true }),
  attr(9163, '性别', { displaySection: 'commonVariant', is_required: true, category_dependent: true }),
  attr(23171, '#主题标签', { displaySection: 'commonVariant' }),
  attr(4191, '简介', { displaySection: 'commonVariant' }),
  attr(4298, '俄罗斯尺码', { displaySection: 'sku', is_required: true, is_aspect: true }),
  attr(9533, '由制造商规定尺码', { displaySection: 'sku', is_aspect: true }),
  attr(22232, '原产国', { displaySection: 'hidden', is_required: true }),
]), { common: [23171, 4191, 10096, 10097, 9163], sku: [4298, 9533] });

expectDisplay('钥匙扣', templateFromSections('keychain', [
  attr(9163, '性别', { displaySection: 'commonVariant', is_required: true, category_dependent: true }),
  attr(23171, '#主题标签', { displaySection: 'commonVariant' }),
  attr(4191, '简介', { displaySection: 'commonVariant' }),
  attr(10096, '商品颜色', { displaySection: 'sku', is_required: true, is_aspect: true }),
  attr(10097, '颜色名称', { displaySection: 'hidden', is_aspect: true }),
]), { common: [23171, 4191, 9163], sku: [10096] });

expectDisplay('衣服整理架', templateFromSections('hanger', [
  attr(23171, '#主题标签', { displaySection: 'commonVariant' }),
  attr(4191, '简介', { displaySection: 'commonVariant' }),
  attr(10096, '商品颜色', { displaySection: 'sku', is_aspect: true }),
  attr(8416, '宽度，厘米', { displaySection: 'sku', is_aspect: true }),
  attr(8513, '每包数量,pcs', { displaySection: 'sku', is_aspect: true }),
]), { common: [23171, 4191], sku: [10096, 8416, 8513] });

expectDisplay('耳机', templateFromSections('headphones', [
  attr(23171, '#主题标签', { displaySection: 'commonVariant' }),
  attr(4191, '简介', { displaySection: 'commonVariant' }),
  attr(10096, '商品颜色', { displaySection: 'sku', is_required: true, is_aspect: true }),
  attr(20254, '耳机类型', { displaySection: 'hidden', is_required: true, category_dependent: true }),
]), { common: [23171, 4191], sku: [10096] });

console.log('product template display checks passed');
