import type { ProductSupplyTemplate, ProductTemplateAttribute } from '@/api/productSupplyAPI'

type BaseFieldKey = 'name' | 'brand' | 'modelName' | 'type'

const BASE_ATTRIBUTE_ALIASES: Record<BaseFieldKey, string[]> = {
  name: ['名称', '商品名称', 'name', 'product name', 'название'],
  brand: ['品牌', 'brand', 'бренд'],
  modelName: ['型号', '型号名称', '名称模板的模型名称', 'model', 'model name', 'model name for the name template', 'модель', 'название модели'],
  type: ['类型', 'type', 'тип'],
}

const BASE_ATTRIBUTE_PREFIX_ALIASES: Partial<Record<BaseFieldKey, string[]>> = {
  modelName: ['型号名称', '名称模板的模型名称', 'model name', 'model name for the name template', 'название модели'],
}

function normalizeName(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function compactName(value: string | null | undefined): string {
  return normalizeName(value)
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[\s_\-:/：，,。.;；]+/g, '')
}

function stripValues(attr: ProductTemplateAttribute): ProductTemplateAttribute {
  const { values, ...rest } = attr
  return attr.isSkuDimension ? attr : (rest as ProductTemplateAttribute)
}

function stripValuesExceptBase(attr: ProductTemplateAttribute): ProductTemplateAttribute {
  if (isTemplateBaseAttribute(attr)) return attr
  return stripValues(attr)
}

function uniqueById(attributes: ProductTemplateAttribute[]): ProductTemplateAttribute[] {
  const seen = new Set<number>()
  const result: ProductTemplateAttribute[] = []
  for (const attr of attributes) {
    if (!seen.has(attr.id)) {
      seen.add(attr.id)
      result.push(attr)
    }
  }
  return result
}

function getVariantAttributeOrder(attribute: ProductTemplateAttribute): number {
  const normalized = normalizeName(attribute.name)
  if (
    normalized.includes('主题标签') ||
    normalized.includes('hashtag') ||
    normalized.includes('хэштег') ||
    normalized.includes('#')
  ) {
    return 10
  }
  if (normalized === '简介' || normalized.includes('简介')) {
    return 20
  }
  return 100
}

function sortVariantAttributes(attributes: ProductTemplateAttribute[]): ProductTemplateAttribute[] {
  return attributes
    .map((attribute, index) => ({ attribute, index }))
    .sort((left, right) => {
      const orderDiff = getVariantAttributeOrder(left.attribute) - getVariantAttributeOrder(right.attribute)
      return orderDiff || left.index - right.index
    })
    .map(item => item.attribute)
}

export function resolveTemplateBaseField(attribute: ProductTemplateAttribute): BaseFieldKey | null {
  const normalized = normalizeName(attribute.name)
  const compact = compactName(attribute.name)
  for (const [field, aliases] of Object.entries(BASE_ATTRIBUTE_ALIASES) as Array<[BaseFieldKey, string[]]>) {
    if (aliases.some(alias => normalizeName(alias) === normalized || compactName(alias) === compact)) {
      return field
    }
    const prefixAliases = BASE_ATTRIBUTE_PREFIX_ALIASES[field] || []
    if (prefixAliases.some(alias => normalized.startsWith(normalizeName(alias)) || compact.startsWith(compactName(alias)))) {
      return field
    }
  }
  return null
}

export function isTemplateBaseAttribute(attribute: ProductTemplateAttribute): boolean {
  return resolveTemplateBaseField(attribute) !== null
}

export function getProductTemplateDisplay(
  template: ProductSupplyTemplate | null | undefined,
  isEditMode: boolean
) {
  const variantAttributes = Array.isArray(template?.variantAttributes) ? template!.variantAttributes : []
  const rawCommonVariantAttributes = Array.isArray(template?.commonVariantAttributes) ? template!.commonVariantAttributes : []
  const hiddenAttributes = Array.isArray(template?.hiddenAttributes) ? template!.hiddenAttributes : []
  const rawSkuDimensionCandidates = Array.isArray(template?.skuDimensionCandidates) ? template!.skuDimensionCandidates : []
  const hasExplicitCommonVariantAttributes = Array.isArray(template?.commonVariantAttributes)

  const baseAttributes = uniqueById([
    ...variantAttributes.filter(isTemplateBaseAttribute),
    ...rawCommonVariantAttributes.filter(isTemplateBaseAttribute),
    ...hiddenAttributes.filter(isTemplateBaseAttribute),
    ...rawSkuDimensionCandidates.filter(isTemplateBaseAttribute),
  ])

  const baseAttributeIds = new Set(baseAttributes.map(attr => attr.id))
  const skuDimensionCandidates = isEditMode
    ? []
    : rawSkuDimensionCandidates.filter(attr => !baseAttributeIds.has(attr.id))
  const skuDimensionIds = new Set(rawSkuDimensionCandidates.map(attr => attr.id))
  const nonBaseVariantAttributes = variantAttributes.filter(attr => !baseAttributeIds.has(attr.id))
  const commonVariantAttributes = sortVariantAttributes(hasExplicitCommonVariantAttributes
    ? rawCommonVariantAttributes.filter(attr => !baseAttributeIds.has(attr.id) && !skuDimensionIds.has(attr.id))
    : nonBaseVariantAttributes.filter(attr => !skuDimensionIds.has(attr.id)))
  const visibleVariantAttributes = uniqueById(isEditMode
    ? [
        ...commonVariantAttributes,
        ...nonBaseVariantAttributes.filter(attr => skuDimensionIds.has(attr.id)),
      ]
    : commonVariantAttributes)
  const editableVariantAttributes = isEditMode
    ? visibleVariantAttributes
    : commonVariantAttributes
  const visibleHiddenAttributes = uniqueById([
    ...nonBaseVariantAttributes.filter(attr => !skuDimensionIds.has(attr.id) && !commonVariantAttributes.some(common => common.id === attr.id)),
    ...hiddenAttributes.filter(attr => !baseAttributeIds.has(attr.id) && !skuDimensionIds.has(attr.id)),
  ])

  return {
    baseAttributes,
    baseAttributeIds,
    visibleVariantAttributes,
    editableVariantAttributes,
    hiddenAttributes: visibleHiddenAttributes,
    commonVariantAttributes,
    skuDimensionCandidates,
  }
}

export function buildTemplateFieldHints(template: ProductSupplyTemplate | null | undefined) {
  const baseHints: Partial<Record<BaseFieldKey, string>> = {}
  const display = getProductTemplateDisplay(template, false)

  for (const attr of display.baseAttributes) {
    const field = resolveTemplateBaseField(attr)
    if (!field || !attr.description) continue
    if (!baseHints[field]) {
      baseHints[field] = attr.description
    }
  }

  return baseHints
}

export function sanitizeTemplateAttributeRecords(
  attributes: Record<string, any> | null | undefined,
  hiddenAttributes: Record<string, any> | null | undefined,
  baseAttributeIds: Set<number>
) {
  const sanitizeRecord = (record: Record<string, any> | null | undefined) => {
    const next: Record<string, any> = {}
    if (!record || typeof record !== 'object' || Array.isArray(record)) return next
    for (const [key, value] of Object.entries(record)) {
      const id = Number(key)
      if (Number.isFinite(id) && baseAttributeIds.has(id)) continue
      next[key] = value
    }
    return next
  }

  return {
    attributes: sanitizeRecord(attributes),
    hiddenAttributes: sanitizeRecord(hiddenAttributes),
  }
}

export function buildPersistedTemplateSnapshot(
  template: ProductSupplyTemplate | null | undefined,
  isEditMode: boolean
) {
  if (!template) return null

  const display = getProductTemplateDisplay(template, isEditMode)
  return {
    descriptionCategoryId: template.descriptionCategoryId,
    typeId: template.typeId,
    language: template.language,
    baseAttributes: display.baseAttributes.map(stripValuesExceptBase),
    variantAttributes: display.visibleVariantAttributes.map(stripValues),
    commonVariantAttributes: display.commonVariantAttributes.map(stripValues),
    hiddenAttributes: display.hiddenAttributes.map(stripValues),
    skuDimensionCandidates: display.skuDimensionCandidates.map(stripValues),
    requiredAttributeIds: template.requiredAttributeIds.filter(id => !display.baseAttributeIds.has(id)),
    rawAttributes: [],
    source: template.source,
    cachedAt: template.cachedAt,
  }
}
