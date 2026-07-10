import prisma from '../config/database';
import logger from '../config/logger';
import { getOzonCategoryAttributes } from './ozonCategoryService';
export { buildOzonAttributeValueCacheRows } from './ozonAttributeValueCache';

export interface TemplateAttributeValue {
  id?: number;
  valueId?: number;
  info?: string;
  value: string;
  [key: string]: any;
}

export interface RawOzonTemplateAttribute {
  id: number;
  name: string;
  description?: string | null;
  type?: string | null;
  attribute_complex_id?: number | null;
  complex_is_collection?: boolean;
  category_dependent?: boolean;
  is_aspect?: boolean;
  is_required?: boolean;
  dictionary_id?: number | null;
  group_id?: number | null;
  group_name?: string | null;
  is_collection?: boolean;
  is_dependent?: boolean;
  precision?: number | null;
  max_value_count?: number | null;
  values?: TemplateAttributeValue[];
}

export interface ProductTemplateAttribute {
  id: number;
  name: string;
  description: string;
  type: 'string' | 'textarea' | 'select' | 'number' | 'boolean';
  is_required: boolean;
  dictionary_id: number;
  group_id: number | null;
  group_name: string | null;
  is_collection: boolean;
  is_dependent: boolean;
  is_aspect: boolean;
  category_dependent: boolean;
  attribute_complex_id: number;
  complex_is_collection: boolean;
  precision: number | null;
  max_value_count: number | null;
  values?: TemplateAttributeValue[];
  section: 'variant' | 'hidden';
  displaySection: 'commonVariant' | 'sku' | 'hidden';
  isSkuDimension: boolean;
}

export interface NormalizedOzonProductTemplate {
  descriptionCategoryId: number;
  typeId: number | null;
  language: string;
  variantAttributes: ProductTemplateAttribute[];
  commonVariantAttributes: ProductTemplateAttribute[];
  hiddenAttributes: ProductTemplateAttribute[];
  skuDimensionCandidates: ProductTemplateAttribute[];
  requiredAttributeIds: number[];
  rawAttributes: RawOzonTemplateAttribute[];
  source: 'cache' | 'ozon' | 'generated';
  cachedAt: string;
  classificationVersion?: number;
}

export interface ClientOzonProductTemplate extends NormalizedOzonProductTemplate {
  rawAttributes: [];
}

export interface VariantAttributeValue {
  attributeId: number;
  name: string;
  value: string;
  valueId?: number;
}

export interface ProductSupplySkuInput {
  offerId: string;
  sku?: string;
  barcode?: string;
  price: number;
  oldPrice?: number | null;
  variantAttributes: VariantAttributeValue[];
  attributes: Record<string, any>;
}

export interface ProductSupplyBaseInput {
  name: string;
  category: string;
  categoryLeaf?: string;
  brand: string;
  modelName: string;
  description: string;
  imageUrl: string;
  images: any[];
  price: number;
  oldPrice?: number | null;
  packageLength?: number | null;
  packageWidth?: number | null;
  packageHeight?: number | null;
  grossWeight?: number | null;
  descriptionCategoryId?: number | null;
  typeId?: number | null;
  attributes: Record<string, any>;
  hiddenAttributes: Record<string, any>;
}

export interface ExpandProductSupplySkusInput {
  base: ProductSupplyBaseInput;
  skus?: ProductSupplySkuInput[];
  templateSnapshot?: NormalizedOzonProductTemplate | Record<string, any> | null;
}

export interface ExpandedProductSupplySku {
  name: string;
  category: string;
  categoryLeaf?: string;
  brand: string;
  modelName: string;
  description: string;
  imageUrl: string;
  images: any[];
  price: number;
  oldPrice: number | null;
  offerId: string | null;
  sku: string | null;
  alibabaId: string | null;
  barcode: string | null;
  packageLength: number | null;
  packageWidth: number | null;
  packageHeight: number | null;
  grossWeight: number | null;
  descriptionCategoryId: number | null;
  typeId: number | null;
  attributes: Record<string, any>;
  variantAttributes: VariantAttributeValue[];
  hiddenAttributes: Record<string, any>;
  templateSnapshot: NormalizedOzonProductTemplate | Record<string, any> | null;
  variantSummary: string;
}

const COMMON_VARIANT_PATTERNS = [
  '简介',
  '标签',
  'хэштег',
  'hashtag',
  '#主题标签',
];

const SKU_DIMENSION_PATTERNS = [
  '颜色',
  'цвет',
  'color',
  'размер',
  '尺寸',
  'size',
  '容量',
  'объем',
  'volume',
  'память',
  'memory',
  '款式',
  'модель',
  'style',
];

const SIZE_DIMENSION_PATTERNS = [
  'размер',
  '尺码',
  '尺寸',
  'size',
  'ширина',
  '宽度',
  'количество',
  '每包数量',
  'pcs',
  '容量',
  'объем',
  'volume',
  'память',
  'memory',
];

const HIDDEN_PATTERNS = [
  'rich',
  'json',
  '隐藏',
  'hidden',
];

const SERVICE_ATTRIBUTE_PATTERNS = [
  '臭氧。视频',
  'ozon. video',
  '视频：',
  'video:',
  '组合成类似的产品',
];

const BASE_ATTRIBUTE_PATTERNS = [
  '名称',
  '商品名称',
  'name',
  'название',
  '品牌',
  'brand',
  'бренд',
  '型号名称',
  '型号',
  '名称模板的模型名称',
  'model name',
  'model name for the name template',
  'model',
  'модель',
  '类型',
  'type',
  'тип',
];

const TYPE_ATTRIBUTE_NAMES = ['类型', 'type', 'тип'];
const COLOR_ATTRIBUTE_PATTERNS = ['颜色', 'цвет', 'color'];
const GENDER_ATTRIBUTE_PATTERNS = ['性别', 'пол', 'gender'];

const TEMPLATE_CLASSIFICATION_VERSION = 4;

function toLower(value?: string | null): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function compactName(value?: string | null): string {
  return toLower(value)
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[\s_\-:/：，,。.;；]+/g, '');
}

function includesAny(value: string, patterns: string[]): boolean {
  return patterns.some(pattern => value.includes(pattern.toLowerCase()));
}

function normalizeAttributeType(attr: RawOzonTemplateAttribute): ProductTemplateAttribute['type'] {
  if (attr.dictionary_id && attr.dictionary_id > 0) return 'select';

  const type = toLower(attr.type);
  if (type === 'integer' || type === 'decimal' || type === 'double') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'text' || type === 'textarea') return 'textarea';
  return 'string';
}

function isNameExact(attr: RawOzonTemplateAttribute, patterns: string[]): boolean {
  const name = toLower(attr.name);
  const compact = compactName(attr.name);
  return patterns.some(pattern => name === toLower(pattern) || compact === compactName(pattern));
}

function isBaseAttribute(attr: RawOzonTemplateAttribute): boolean {
  const name = toLower(attr.name);
  const compact = compactName(attr.name);
  if (isNameExact(attr, TYPE_ATTRIBUTE_NAMES)) return true;
  return BASE_ATTRIBUTE_PATTERNS.some(pattern => {
    const normalized = toLower(pattern);
    const compactPattern = compactName(pattern);
    return name === normalized || name.startsWith(normalized) || compact === compactPattern || compact.startsWith(compactPattern);
  });
}

function isColorAttribute(attr: RawOzonTemplateAttribute): boolean {
  return includesAny(toLower(attr.name), COLOR_ATTRIBUTE_PATTERNS);
}

function isSizeLikeAspectAttribute(attr: RawOzonTemplateAttribute): boolean {
  return attr.is_aspect === true && includesAny(toLower(attr.name), SIZE_DIMENSION_PATTERNS);
}

function hasSizeLikeAspect(attributes: RawOzonTemplateAttribute[]): boolean {
  return attributes.some(attr => !isBaseAttribute(attr) && !isComplexMediaAttribute(attr) && isSizeLikeAspectAttribute(attr));
}

function isSkuDimensionAttribute(attr: RawOzonTemplateAttribute, allAttributes: RawOzonTemplateAttribute[]): boolean {
  if (isBaseAttribute(attr) || isComplexMediaAttribute(attr)) return false;
  if (attr.is_aspect === true) {
    if (isColorAttribute(attr) && hasSizeLikeAspect(allAttributes)) {
      return false;
    }
    return true;
  }
  const name = toLower(attr.name);
  return includesAny(name, SKU_DIMENSION_PATTERNS) && !includesAny(name, [
    '包装',
    'package',
    'packaging',
    '毫米',
    'миллимет',
    'mm',
  ]);
}

function isCommonVariantAttribute(attr: RawOzonTemplateAttribute): boolean {
  const name = toLower(attr.name);
  const groupName = toLower(attr.group_name);
  if (isBaseAttribute(attr) || isComplexMediaAttribute(attr)) return false;
  if (includesAny(name, COMMON_VARIANT_PATTERNS)) return true;
  if (attr.is_aspect === true && isColorAttribute(attr)) return true;
  if (attr.category_dependent === true && includesAny(name, GENDER_ATTRIBUTE_PATTERNS)) return true;
  if (includesAny(groupName, ['вариант', 'variant', '变体'])) return true;
  return false;
}

function isHiddenAttribute(attr: RawOzonTemplateAttribute): boolean {
  const name = toLower(attr.name);
  const groupName = toLower(attr.group_name);
  return includesAny(name, HIDDEN_PATTERNS) || includesAny(groupName, HIDDEN_PATTERNS);
}

function isServiceAttribute(attr: RawOzonTemplateAttribute): boolean {
  const text = [attr.name, attr.description, attr.group_name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return includesAny(text, SERVICE_ATTRIBUTE_PATTERNS);
}

function isComplexMediaAttribute(attr: RawOzonTemplateAttribute): boolean {
  const text = [attr.name, attr.description, attr.group_name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const type = toLower(attr.type);

  if (type === 'url') return true;

  return includesAny(text, [
    'pdf',
    '视频',
    'video',
    'mp4',
    'mov',
    'ссылка',
    'link',
    'url',
    '臭氧',
    'ozon',
  ]);
}

function normalizeAttribute(
  attr: RawOzonTemplateAttribute,
  allAttributes: RawOzonTemplateAttribute[]
): ProductTemplateAttribute {
  const isSkuDimension = isSkuDimensionAttribute(attr, allAttributes);
  const isCommonVariant = !isSkuDimension && isCommonVariantAttribute(attr);
  const section = isSkuDimension || isCommonVariant ? 'variant' : 'hidden';
  const displaySection = isSkuDimension ? 'sku' : (isCommonVariant ? 'commonVariant' : 'hidden');

  return {
    id: attr.id,
    name: attr.name || '',
    description: attr.description || '',
    type: normalizeAttributeType(attr),
    is_required: attr.is_required === true,
    dictionary_id: attr.dictionary_id || 0,
    group_id: attr.group_id || null,
    group_name: attr.group_name || null,
    is_collection: attr.is_collection === true,
    is_dependent: attr.is_dependent === true,
    is_aspect: attr.is_aspect === true,
    category_dependent: attr.category_dependent === true,
    attribute_complex_id: attr.attribute_complex_id || 0,
    complex_is_collection: attr.complex_is_collection === true,
    precision: attr.precision ?? null,
    max_value_count: attr.max_value_count ?? null,
    values: Array.isArray(attr.values) ? attr.values : [],
    section,
    displaySection,
    isSkuDimension,
  };
}

function uniqueAttributesById(attributes: ProductTemplateAttribute[]): ProductTemplateAttribute[] {
  const seen = new Set<number>();
  const result: ProductTemplateAttribute[] = [];
  for (const attr of attributes) {
    if (seen.has(attr.id)) continue;
    seen.add(attr.id);
    result.push(attr);
  }
  return result;
}

function sourceIndex(attributes: RawOzonTemplateAttribute[], id: number): number {
  const index = attributes.findIndex(item => item.id === id);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

export function normalizeOzonProductTemplate(input: {
  descriptionCategoryId: number;
  typeId?: number | null;
  language?: string;
  attributes: RawOzonTemplateAttribute[];
  source?: 'cache' | 'ozon' | 'generated';
  cachedAt?: string;
}): NormalizedOzonProductTemplate {
  const formAttributes = input.attributes.filter(attr => !isComplexMediaAttribute(attr));
  const normalized = formAttributes.map(attr => normalizeAttribute(attr, formAttributes));
  const commonVariantAttributes = uniqueAttributesById(normalized
    .filter(attr => attr.displaySection === 'commonVariant')
    .sort((a, b) => sourceIndex(formAttributes, a.id) - sourceIndex(formAttributes, b.id)));
  const skuDimensionCandidates = uniqueAttributesById(normalized
    .filter(attr => attr.displaySection === 'sku')
    .sort((a, b) => sourceIndex(formAttributes, a.id) - sourceIndex(formAttributes, b.id)));
  const hiddenAttributes = uniqueAttributesById(normalized
    .filter(attr => attr.displaySection === 'hidden')
    .sort((a, b) => Number(b.is_required) - Number(a.is_required) || sourceIndex(formAttributes, a.id) - sourceIndex(formAttributes, b.id)));
  const variantAttributes = uniqueAttributesById([
    ...commonVariantAttributes,
    ...skuDimensionCandidates,
  ]);

  return {
    descriptionCategoryId: input.descriptionCategoryId,
    typeId: input.typeId ?? null,
    language: input.language || 'ZH_HANS',
    variantAttributes,
    commonVariantAttributes,
    hiddenAttributes,
    skuDimensionCandidates,
    requiredAttributeIds: normalized.filter(attr => attr.is_required).map(attr => attr.id),
    rawAttributes: input.attributes,
    source: input.source || 'generated',
    cachedAt: input.cachedAt || new Date().toISOString(),
    classificationVersion: TEMPLATE_CLASSIFICATION_VERSION,
  };
}

function templateNeedsRefresh(template: any): boolean {
  const allAttrs = [
    ...(Array.isArray(template?.variantAttributes) ? template.variantAttributes : []),
    ...(Array.isArray(template?.commonVariantAttributes) ? template.commonVariantAttributes : []),
    ...(Array.isArray(template?.hiddenAttributes) ? template.hiddenAttributes : []),
    ...(Array.isArray(template?.skuDimensionCandidates) ? template.skuDimensionCandidates : []),
  ];

  return allAttrs.some((attr: any) => isComplexMediaAttribute(attr));
}

function hasOzonClassificationMetadata(attributes: any[]): boolean {
  return attributes.some(attr => (
    attr?.is_aspect !== undefined ||
    attr?.category_dependent !== undefined ||
    attr?.attribute_complex_id !== undefined ||
    attr?.complex_is_collection !== undefined
  ));
}

export function buildVariantSummary(values: VariantAttributeValue[]): string {
  return values
    .filter(item => item.name && item.value)
    .map(item => `${item.name}：${item.value}`)
    .join(' / ');
}

function toClientAttribute(attr: ProductTemplateAttribute): ProductTemplateAttribute {
  if (!attr.isSkuDimension && Array.isArray(attr.values) && attr.values.length > 100) {
    const { values, ...rest } = attr;
    return rest as ProductTemplateAttribute;
  }
  return attr;
}

export function toClientProductTemplate(template: NormalizedOzonProductTemplate): ClientOzonProductTemplate {
  return {
    ...template,
    variantAttributes: template.variantAttributes.map(toClientAttribute),
    commonVariantAttributes: template.commonVariantAttributes.map(toClientAttribute),
    hiddenAttributes: template.hiddenAttributes.map(toClientAttribute),
    skuDimensionCandidates: template.skuDimensionCandidates.map(toClientAttribute),
    rawAttributes: [],
  };
}

function assertUniqueOfferIds(skus: ProductSupplySkuInput[]): void {
  const seen = new Set<string>();
  for (const sku of skus) {
    const offerId = (sku.offerId || '').trim();
    if (!offerId) {
      throw new Error('型号名称不能为空');
    }
    if (seen.has(offerId)) {
      throw new Error(`型号名称重复: ${offerId}`);
    }
    seen.add(offerId);
  }
}

function assertUniqueSkus(skus: ProductSupplySkuInput[]): void {
  const seen = new Set<string>();
  for (const sku of skus) {
    const skuCode = (sku.sku || '').trim();
    if (!skuCode) {
      throw new Error('货号不能为空');
    }
    if (seen.has(skuCode)) {
      throw new Error(`货号重复: ${skuCode}`);
    }
    seen.add(skuCode);
  }
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function expandProductSupplySkus(input: ExpandProductSupplySkusInput): ExpandedProductSupplySku[] {
  const skus = input.skus && input.skus.length > 0
    ? input.skus
    : [{
        offerId: '',
        sku: '',
        barcode: '',
        price: input.base.price,
        oldPrice: input.base.oldPrice ?? null,
        variantAttributes: [],
        attributes: {},
      }];

  assertUniqueOfferIds(skus);
  assertUniqueSkus(skus);

  return skus.map(sku => {
    const attributes = {
      ...(input.base.attributes || {}),
      ...(sku.attributes || {}),
    };

    return {
      name: input.base.name,
      category: input.base.category,
      categoryLeaf: input.base.categoryLeaf,
      brand: input.base.brand,
      modelName: input.base.modelName,
      description: input.base.description,
      imageUrl: input.base.imageUrl,
      images: input.base.images || [],
      price: Number(sku.price ?? input.base.price ?? 0),
      oldPrice: sku.oldPrice ?? input.base.oldPrice ?? null,
      offerId: sku.offerId || null,
      sku: sku.sku || null,
      alibabaId: null,
      barcode: sku.barcode || null,
      packageLength: normalizeNullableNumber(input.base.packageLength),
      packageWidth: normalizeNullableNumber(input.base.packageWidth),
      packageHeight: normalizeNullableNumber(input.base.packageHeight),
      grossWeight: normalizeNullableNumber(input.base.grossWeight),
      descriptionCategoryId: input.base.descriptionCategoryId ?? null,
      typeId: input.base.typeId ?? null,
      attributes,
      variantAttributes: sku.variantAttributes || [],
      hiddenAttributes: input.base.hiddenAttributes || {},
      templateSnapshot: input.templateSnapshot || null,
      variantSummary: buildVariantSummary(sku.variantAttributes || []),
    };
  });
}

export async function getProductSupplyTemplate(params: {
  descriptionCategoryId: number;
  typeId?: number | null;
  language?: string;
  forceRefresh?: boolean;
  cacheOnly?: boolean;
}): Promise<NormalizedOzonProductTemplate | null> {
  const language = params.language || 'ZH_HANS';
  const typeId = params.typeId ?? null;
  const templateModel = (prisma as any).ozonProductTemplate;
  const cacheKey = {
    descriptionCategoryId: params.descriptionCategoryId,
    typeId,
    language,
  };

  if (!params.forceRefresh) {
    const cached = await templateModel.findUnique({
      where: {
        descriptionCategoryId_typeId_language: cacheKey,
      },
    });

    if (cached) {
      const rawAttributes = Array.isArray(cached.rawAttributes) ? (cached.rawAttributes as any) : [];
      const cachedVersion = Number((cached.templateJson as any)?.classificationVersion || 0);
      if (params.cacheOnly) {
        const cachedTemplateAttrs = [
          ...((cached.templateJson as any)?.variantAttributes || []),
          ...((cached.templateJson as any)?.commonVariantAttributes || []),
          ...((cached.templateJson as any)?.hiddenAttributes || []),
          ...((cached.templateJson as any)?.skuDimensionCandidates || []),
        ];
        const normalizedTemplate = normalizeOzonProductTemplate({
          descriptionCategoryId: params.descriptionCategoryId,
          typeId,
          language,
          attributes: rawAttributes.length > 0 ? rawAttributes : cachedTemplateAttrs,
          source: 'cache',
          cachedAt: cached.cachedAt.toISOString(),
        });

        if (cachedVersion < TEMPLATE_CLASSIFICATION_VERSION || templateNeedsRefresh(cached.templateJson)) {
          await templateModel.update({
            where: { id: cached.id },
            data: {
              templateJson: normalizedTemplate as any,
              cachedAt: cached.cachedAt,
            },
          });
        }

        return normalizedTemplate;
      }

      if (rawAttributes.length === 0 && cachedVersion < TEMPLATE_CLASSIFICATION_VERSION) {
        logger.info(`模板缓存缺少 Ozon 原始分类元数据，重新获取: category=${params.descriptionCategoryId}, type=${typeId}`);
      } else if (rawAttributes.length > 0 && !hasOzonClassificationMetadata(rawAttributes) && cachedVersion < TEMPLATE_CLASSIFICATION_VERSION) {
        logger.info(`模板缓存原始属性缺少分类元数据，重新获取: category=${params.descriptionCategoryId}, type=${typeId}`);
      } else {
      const cachedTemplateAttrs = [
        ...((cached.templateJson as any)?.variantAttributes || []),
        ...((cached.templateJson as any)?.commonVariantAttributes || []),
        ...((cached.templateJson as any)?.hiddenAttributes || []),
        ...((cached.templateJson as any)?.skuDimensionCandidates || []),
      ];
      const normalizedTemplate = normalizeOzonProductTemplate({
        descriptionCategoryId: params.descriptionCategoryId,
        typeId,
        language,
        attributes: rawAttributes.length > 0 ? rawAttributes : cachedTemplateAttrs,
        source: 'cache',
        cachedAt: cached.cachedAt.toISOString(),
      });

      if (cachedVersion < TEMPLATE_CLASSIFICATION_VERSION || templateNeedsRefresh(cached.templateJson)) {
        await templateModel.update({
          where: { id: cached.id },
          data: {
            templateJson: normalizedTemplate as any,
            cachedAt: cached.cachedAt,
          },
        });
      }

      return normalizedTemplate;
      }
    }
  }

  if (params.cacheOnly) {
    return null;
  }

  logger.info(`获取 Ozon 商品模板: category=${params.descriptionCategoryId}, type=${typeId}`);
  const attributes = await getOzonCategoryAttributes(
    params.descriptionCategoryId,
    typeId ?? undefined,
    undefined,
    undefined,
    'https://api-seller.ozon.ru',
    language
  );

  const template = normalizeOzonProductTemplate({
    descriptionCategoryId: params.descriptionCategoryId,
    typeId,
    language,
    attributes,
    source: 'ozon',
  });

  const existing = await templateModel.findFirst({
    where: cacheKey,
  });

  if (existing) {
    await templateModel.update({
      where: { id: existing.id },
      data: {
        templateJson: template as any,
        rawAttributes: attributes as any,
        source: 'ozon',
        cachedAt: new Date(),
      },
    });
  } else {
    await templateModel.create({
      data: {
        descriptionCategoryId: params.descriptionCategoryId,
        typeId,
        language,
        templateJson: template as any,
        rawAttributes: attributes as any,
        source: 'ozon',
        cachedAt: new Date(),
      },
    });
  }

  return template;
}
