import type { ProductTemplateAttribute } from '@/api/productSupplyAPI';

const sharedFieldDescription = '所有的变体都会有相同的数值';

const fieldDescriptions = {
  name: '',
  category: sharedFieldDescription,
  brand: sharedFieldDescription,
  modelName: sharedFieldDescription,
};

const fieldTooltips: Record<string, string[]> = {
  name: [
    '请查看名称要求，以便正确填写商品名称并通过审核。您可以不填写此字段。',
    '那么名称将自动从该模板中组合。',
    '公式: 类型 + 品牌 + 型号 + 重要特征（类别）',
  ],
  brand: [
    '所有的变体都会有相同的数值。',
    '请选择商品品牌；无品牌商品可保留“无品牌”。',
  ],
  modelName: [
    '所有的变体都会有相同的数值。',
    '用于区分商品卡片；Ozon 后台为型号名称。',
  ],
  packageLength: [
    '请以毫米为单位测量原包装中的商品的任何一边。如果没有包装，则测量商品。',
    '对不规则形状的商品来说，请测量从一边到另一边的长度。',
    '请把包含几件商品的套装落起来。',
    '在包装中把衣服、纺织品、刺绣套件对折起来。',
  ],
  packageWidth: [
    '请以毫米为单位测量原包装中的商品宽度。',
    '如果商品形状不规则，请填写最大宽度。',
  ],
  packageHeight: [
    '请以毫米为单位测量商品或包装的高度。',
    '若为可压缩商品，请按包装后的高度填写。',
  ],
  grossWeight: [
    '请填写含包装商品重量，单位为克。',
    '如果商品包含配件，请将配件一并计入重量。',
  ],
};

export const splitDescriptionLines = (value: any) => {
  return String(value || '')
    .split(/\r?\n+/)
    .map(line => line.trim())
    .filter(Boolean);
};

export const buildFixedFieldMeta = (brandAttr?: ProductTemplateAttribute, modelAttr?: ProductTemplateAttribute) => {
  const mergeTooltip = (baseLines: string[], attr: any, prependLines: string[] = []) => {
    const lines = [...prependLines];
    for (const line of splitDescriptionLines(attr?.description)) {
      if (!lines.includes(line)) {
        lines.push(line);
      }
    }
    return lines.length > 0 ? lines : baseLines;
  };

  const pickDescription = (attr: any, fallback: string) => {
    return splitDescriptionLines(attr?.description)[0] || fallback;
  };

  return {
    name: {
      label: '商品名称',
      description: '',
      tooltip: fieldTooltips.name,
      required: false,
    },
    category: {
      label: '类目和类型',
      description: fieldDescriptions.category,
      required: true,
    },
    brand: {
      label: brandAttr?.name || '品牌',
      description: pickDescription(brandAttr, fieldDescriptions.brand),
      tooltip: mergeTooltip(fieldTooltips.brand, brandAttr, ['所有的变体都会有相同的数值。']),
      required: brandAttr?.is_required !== false,
    },
    modelName: {
      label: modelAttr?.name || '型号名称',
      description: pickDescription(modelAttr, fieldDescriptions.modelName),
      tooltip: mergeTooltip(fieldTooltips.modelName, modelAttr, ['所有的变体都会有相同的数值。']),
      required: modelAttr?.is_required !== false,
    },
    packageLength: {
      label: '包装长度，毫米',
      tooltip: fieldTooltips.packageLength,
      required: true,
    },
    packageWidth: {
      label: '包装宽度，毫米',
      tooltip: fieldTooltips.packageWidth,
      required: true,
    },
    packageHeight: {
      label: '包装高度，毫米',
      tooltip: fieldTooltips.packageHeight,
      required: true,
    },
    grossWeight: {
      label: '含包装重量，克',
      tooltip: fieldTooltips.grossWeight,
      required: true,
    },
  };
};
