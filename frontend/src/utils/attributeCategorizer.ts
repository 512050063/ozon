/**
 * Ozon 分类属性分类工具
 * 将 API 返回的属性列表拆分为"变体特征"和"隐藏特征"两组
 * 变体特征按用户指定顺序排列：主题标签 → 简介 → 颜色/尺寸等变体 → 货号 → 条形码 → 价格 → 折扣前价格
 */

export interface OzonAttribute {
  id: number
  name: string
  description?: string
  type: string
  is_required: boolean
  dictionary_id: number
  values?: Array<{ value: string; [key: string]: any }>
  group_id?: number
  group_name?: string
  is_collection?: boolean
  is_dependent?: boolean
  precision?: number
}

/**
 * 变体特征分组定义（按用户指定顺序）
 * 每个分组包含中/俄/英多语言关键词
 * priority 越小越靠前
 */
const VARIANT_GROUPS: Array<{
  key: string
  priority: number
  patterns: string[]
}> = [
  {
    key: 'hashtag',
    priority: 1,
    patterns: ['标签', 'хэштег', 'hashtag', 'тег'],
  },
  {
    key: 'description',
    priority: 2,
    patterns: ['简介', 'описание', 'description', 'краткое'],
  },
  {
    key: 'color',
    priority: 3,
    patterns: ['颜色', 'цвет', 'color'],
  },
  {
    key: 'size',
    priority: 4,
    patterns: ['尺寸', 'размер', 'size'],
  },
  {
    key: 'material',
    priority: 5,
    patterns: ['材质', 'материал', 'material'],
  },
  {
    key: 'style',
    priority: 6,
    patterns: ['款式', 'стиль', 'style', 'модель'],
  },
  {
    key: 'weight_attr',
    priority: 7,
    patterns: ['重量', 'вес', 'weight'],
  },
  {
    key: 'quantity',
    priority: 8,
    patterns: ['数量', 'количество', 'quantity'],
  },
  {
    key: 'name_attr',
    priority: 9,
    patterns: ['名称', 'название', 'name'],
  },
  {
    key: 'article',
    priority: 10,
    patterns: ['货号', 'артикул', 'article', 'sku'],
  },
  {
    key: 'barcode',
    priority: 11,
    patterns: ['条形码', 'штрихкод', 'barcode', 'штрих-код', 'ean', 'upc'],
  },
  {
    key: 'price',
    priority: 12,
    patterns: ['价格', 'цена', 'price'],
  },
  {
    key: 'old_price',
    priority: 13,
    patterns: ['折扣前价格', 'старая цена', 'old price', '原价', 'до скидки'],
  },
  {
    key: 'specification',
    priority: 14,
    patterns: ['规格', 'спецификация', 'specification', 'параметр'],
  },
]

/**
 * 变体特征 group_name 匹配模式
 */
const VARIANT_GROUP_PATTERNS: string[] = [
  '变体', 'variant', 'вариант',
  '基础', 'basic', 'основн',
  '规格', 'specification', 'характеристик',
]

/**
 * 获取属性的变体分组优先级
 * @returns 匹配的 priority，未匹配返回 Infinity
 */
function getVariantPriority(attr: OzonAttribute): number {
  const nameLower = attr.name.toLowerCase()

  for (const group of VARIANT_GROUPS) {
    for (const pattern of group.patterns) {
      if (nameLower.includes(pattern.toLowerCase())) {
        return group.priority
      }
    }
  }

  return Infinity
}

/**
 * 判断属性是否属于变体特征
 */
function isVariantAttribute(attr: OzonAttribute): boolean {
  // Layer 1: 根据 API 返回的 group_name 判断
  if (attr.group_name && attr.group_name.trim() !== '') {
    const groupNameLower = attr.group_name.toLowerCase()
    return VARIANT_GROUP_PATTERNS.some(
      pattern => groupNameLower.includes(pattern.toLowerCase())
    )
  }

  // Layer 2: 名称匹配（多语言）
  const nameLower = attr.name.toLowerCase()
  const hasVariantName = VARIANT_GROUPS.some(group =>
    group.patterns.some(pattern => nameLower.includes(pattern.toLowerCase()))
  )
  if (hasVariantName) return true

  // Layer 3: 必填 + 有字典值（下拉选择）= 变体特征
  if (attr.is_required && attr.dictionary_id > 0) {
    return true
  }

  return false
}

/**
 * 将 Ozon 分类属性拆分为"变体特征"和"隐藏特征"两组
 *
 * 变体特征按以下顺序排列：
 * 1. 主题标签
 * 2. 简介
 * 3. 颜色、尺寸、材质、款式等商品变体
 * 4. 货号
 * 5. 条形码
 * 6. 价格
 * 7. 折扣前价格
 * 8. 其他变体属性
 */
export function categorizeAttributes(attributes: OzonAttribute[]): {
  variantAttributes: OzonAttribute[]
  hiddenAttributes: OzonAttribute[]
} {
  const variantAttributes: OzonAttribute[] = []
  const hiddenAttributes: OzonAttribute[] = []

  for (const attr of attributes) {
    if (isVariantAttribute(attr)) {
      variantAttributes.push(attr)
    } else {
      hiddenAttributes.push(attr)
    }
  }

  // 按用户指定顺序排序变体特征
  variantAttributes.sort((a, b) => {
    const priorityA = getVariantPriority(a)
    const priorityB = getVariantPriority(b)
    if (priorityA !== priorityB) return priorityA - priorityB
    // 同优先级按原始顺序（稳定排序）
    return attributes.indexOf(a) - attributes.indexOf(b)
  })

  return { variantAttributes, hiddenAttributes }
}
