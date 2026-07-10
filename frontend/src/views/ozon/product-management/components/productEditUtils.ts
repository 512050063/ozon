import type { ProductTemplateAttribute } from '@/api/productSupplyAPI';

export const getOzonProductId = (product: any): string => {
  return String(
    product?.productId ||
    product?.ozonProductId ||
    product?.product?.ozonProductId ||
    ''
  );
};

export const normalizeTemplateAttribute = (attr: any): ProductTemplateAttribute => ({
  ...attr,
  id: Number(attr?.id),
  name: attr?.name || '',
  description: attr?.description || '',
  type: ['string', 'textarea', 'select', 'number', 'boolean'].includes(attr?.type) ? attr.type : 'string',
  is_required: attr?.is_required === true,
  dictionary_id: attr?.dictionary_id || 0,
  group_id: attr?.group_id || null,
  group_name: attr?.group_name || null,
  is_collection: attr?.is_collection === true,
  is_dependent: attr?.is_dependent === true,
  precision: attr?.precision ?? null,
  values: Array.isArray(attr?.values) ? attr.values : [],
  section: attr?.section === 'hidden' ? 'hidden' : 'variant',
  isSkuDimension: attr?.isSkuDimension === true,
});

export const normalizeTemplateAttributes = (attrs: any): ProductTemplateAttribute[] => {
  return Array.isArray(attrs)
    ? attrs.filter(attr => attr && attr.id !== undefined && attr.id !== null).map(normalizeTemplateAttribute)
    : [];
};

export const hasValue = (value: any): boolean => {
  if (value === false || value === 0) return true;
  if (Array.isArray(value)) return value.some(item => hasValue(item));
  if (typeof value === 'object' && value !== null) {
    return !!value.value || !!value.valueId || !!value.id;
  }
  return value !== undefined && value !== null && value !== '';
};

export const normalizeAttributeValue = (attr: any): any => {
  if (!attr) return '';
  const values = Array.isArray(attr.values) ? attr.values : [];
  if (values.length > 1) {
    return values
      .map((item: any) => normalizeAttributeValue({ ...attr, values: [item] }))
      .filter((item: any) => hasValue(item));
  }
  const firstValue = values[0] || null;
  if (firstValue?.dictionary_value_id || firstValue?.value_id) {
    return {
      valueId: firstValue.dictionary_value_id || firstValue.value_id,
      value: firstValue.value || '',
    };
  }
  if (typeof firstValue?.value === 'boolean') return firstValue.value;
  if (firstValue?.value !== undefined) return firstValue.value;
  if (typeof attr.value === 'boolean') return attr.value;
  if (attr.value !== undefined) return attr.value;
  if (attr.dictionary_value_id || attr.value_id) {
    return {
      valueId: attr.dictionary_value_id || attr.value_id,
      value: attr.value || '',
    };
  }
  if (attr.type === 'boolean') return false;
  return '';
};

export const buildAttributePayload = (id: number, value: any): any => {
  if (!hasValue(value)) return null;
  if (Array.isArray(value)) {
    const values = value.flatMap(item => {
      const payload = buildAttributePayload(id, item);
      return Array.isArray(payload?.values) ? payload.values : [];
    });
    return values.length > 0 ? { id, values } : null;
  }
  if (typeof value === 'boolean') {
    return value ? { id, values: [{ value: 'true' }] } : null;
  }
  if (typeof value === 'object') {
    const valueId = value.valueId || value.value_id || value.dictionary_value_id || value.id;
    const text = value.value || value.label || value.name || '';
    if (valueId) {
      return {
        id,
        values: [{ dictionary_value_id: Number(valueId), value: text }],
      };
    }
    if (text) {
      return { id, values: [{ value: text }] };
    }
  }
  return { id, values: [{ value: String(value) }] };
};

export const normalizeNumberField = (value: any): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

export const formatNumberInput = (value: number | null): string => {
  return value === null || value === undefined ? '' : String(value);
};

export const parseNumberInput = (value: any, allowDecimal = true): number | null => {
  const raw = String(value ?? '').replace(',', '.');
  const sanitized = allowDecimal
    ? raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
    : raw.replace(/\D/g, '');
  if (!sanitized) return null;
  const numberValue = allowDecimal ? Number(sanitized) : Number.parseInt(sanitized, 10);
  return Number.isFinite(numberValue) ? numberValue : null;
};

export const pickFirst = (...values: any[]) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

export const normalizeImageUrls = (detail: any): string[] => {
  const candidates = [
    detail.primary_image,
    detail.primaryImage ? [detail.primaryImage] : null,
    detail.images,
    detail.images360,
    detail.color_image,
    detail.image ? [detail.image] : null,
  ];
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate) continue;
    const values = Array.isArray(candidate) ? candidate : [candidate];
    for (const item of values) {
      const url = typeof item === 'string' ? item : item?.fileUrl || item?.file_url || item?.url;
      if (url && !seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }
  }
  return urls.slice(0, 8);
};

export const getAttrTextValue = (attr: any): string => {
  const normalized = normalizeAttributeValue(attr);
  if (Array.isArray(normalized)) {
    return normalized
      .map(item => typeof item === 'object' && item !== null ? item.value || '' : String(item || ''))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof normalized === 'object' && normalized !== null) return normalized.value || '';
  return normalized || '';
};

export const normalizeName = (value: any): string => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

export const findAttributeByNames = (attrs: any[], names: string[]) => {
  const normalizedNames = names.map(normalizeName);
  return attrs.find(attr => {
    const name = normalizeName(attr.name || attr.attribute_name);
    return normalizedNames.some(target => name === target || name.includes(target));
  });
};

export const findTemplateAttributeForOzonAttribute = (attr: any, candidates: ProductTemplateAttribute[]) => {
  const attrId = Number(attr?.id);
  if (Number.isFinite(attrId)) {
    const byId = candidates.find(item => item.id === attrId);
    if (byId) return byId;
  }
  const attrName = normalizeName(attr?.name || attr?.attribute_name);
  if (!attrName) return null;
  return candidates.find(item => {
    const templateName = normalizeName(item.name);
    return templateName === attrName || templateName.includes(attrName) || attrName.includes(templateName);
  }) || null;
};

export const getDimensions = (detail: any) => {
  const dimensions = detail.dimensions || detail.dimension || detail.package_dimensions || {};
  const dimensionsInfo = detail.dimensions_info || detail.dimension_info || {};
  const packageInfo = detail.package || detail.package_info || {};
  return {
    length: normalizeNumberField(pickFirst(
      dimensions.length,
      dimensions.depth,
      dimensionsInfo.length,
      dimensionsInfo.depth,
      packageInfo.length,
      packageInfo.depth,
      detail.depth,
      detail.length,
      detail.package_length,
      detail.packageLength
    )),
    width: normalizeNumberField(pickFirst(
      dimensions.width,
      dimensionsInfo.width,
      packageInfo.width,
      detail.width,
      detail.package_width,
      detail.packageWidth
    )),
    height: normalizeNumberField(pickFirst(
      dimensions.height,
      dimensionsInfo.height,
      packageInfo.height,
      detail.height,
      detail.package_height,
      detail.packageHeight
    )),
    weight: normalizeNumberField(pickFirst(
      detail.weight,
      detail.gross_weight,
      detail.grossWeight,
      dimensions.weight,
      dimensions.gross_weight,
      dimensionsInfo.weight,
      dimensionsInfo.gross_weight,
      packageInfo.weight
    )),
  };
};
