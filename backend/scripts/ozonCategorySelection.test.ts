import assert from 'assert';
import {
  loadOzonCategories,
  normalizeListingCategoryFields,
  resolveCategorySelection,
} from '../src/services/ozonCategorySelectionService';
import { buildProductSupplyListingPreview } from '../src/services/productSupplyListingService';

const categories = loadOzonCategories();
const top = categories.find(item => item.children?.some(sub => sub.children?.length));
assert.ok(top, 'expected category data with children');
const sub = top.children!.find(item => item.children?.length)!;
const type = sub.children![0];
const fullPath = [top.category_name, sub.category_name, type.type_name].join(' > ');

assert.deepEqual(resolveCategorySelection(categories, sub.description_category_id, type.type_id, ''), {
  fullPath,
  topCatId: top.description_category_id,
  subCatId: sub.description_category_id,
  typeId: type.type_id,
});

assert.deepEqual(resolveCategorySelection(categories, null, null, type.type_name), {
  fullPath,
  topCatId: top.description_category_id,
  subCatId: sub.description_category_id,
  typeId: type.type_id,
});

const normalized = normalizeListingCategoryFields({
  category: fullPath,
  descriptionCategoryId: null,
  typeId: null,
  brand: '',
});

assert.equal(normalized.category, fullPath);
assert.equal(normalized.descriptionCategoryId, sub.description_category_id);
assert.equal(normalized.typeId, type.type_id);
assert.equal(normalized.brand, '无品牌');

const preview = buildProductSupplyListingPreview({
  product: normalizeListingCategoryFields({
    id: 1,
    name: '旧记录商品名称足够长',
    category: fullPath,
    descriptionCategoryId: null,
    typeId: null,
    brand: '',
    modelName: 'MODEL-1',
    description: '描述',
    imageUrl: 'https://example.com/a.png',
    images: ['https://example.com/a.png'],
    packageLength: 10,
    packageWidth: 10,
    packageHeight: 10,
    grossWeight: 10,
    alibabaId: 'SKU-1',
    attributes: {},
    hiddenAttributes: {},
    templateSnapshot: {
      requiredAttributeIds: [],
      variantAttributes: [],
      commonVariantAttributes: [],
      hiddenAttributes: [],
      skuDimensionCandidates: [],
      rawAttributes: [],
    },
  }),
  stores: [{ id: 1, name: '店铺', status: 'active' }],
  pricingStrategies: [{
    id: 1,
    name: '策略',
    basePrice: 1,
    shippingPrice: 0,
    tariffRate: 0,
    profitRate: 0,
    platformFeeRate: 0,
    otherCost: 0,
  }],
  selectedStoreId: 1,
  selectedPricingStrategyId: 1,
  finalPrice: 10,
});

for (const key of ['brand', 'descriptionCategoryId']) {
  assert.equal(preview.checks.find(check => check.key === key)?.status, 'pass');
}

console.log('ozonCategorySelection.test passed');
