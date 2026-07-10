import logger from '../config/logger';

/**
 * 属性完整性校验服务
 * 校验商品属性是否满足 Ozon 类目的必填要求
 */

// Redis缓存相关（如果项目有Redis）
const CATEGORY_ATTRS_CACHE_TTL = 30 * 24 * 3600; // 30天

/**
 * 扁平化嵌套属性结构
 */
function flattenAttributes(attrs: any[]): any[] {
  const result: any[] = [];
  for (const attr of attrs) {
    result.push(attr);
    const nested = attr.attributes;
    if (Array.isArray(nested) && nested.length > 0) {
      result.push(...flattenAttributes(nested));
    }
  }
  return result;
}

/**
 * 解析 attributes JSON 为统一的字典格式
 * 
 * 支持两种输入格式：
 * 1. dict: {"31": "品牌名", "123": ["Value1", "Value2"]}
 * 2. list: [{"id": 31, "values": [{"value": "品牌名"}]}]
 * 
 * Returns:
 *     {attribute_id: [value1, value2, ...]}
 */
function parseAttributes(attributesJson: string | null): Record<number, string[]> {
  if (!attributesJson) {
    return {};
  }

  try {
    const data = JSON.parse(attributesJson);
    const result: Record<number, string[]> = {};

    if (typeof data === 'object' && !Array.isArray(data)) {
      for (const key of Object.keys(data)) {
        let attrId: number;
        try {
          attrId = parseInt(key, 10);
        } catch {
          continue;
        }
        const value = data[key];
        if (Array.isArray(value)) {
          result[attrId] = value.filter((v: any) => v != null && v !== '').map(String);
        } else if (value != null && value !== '') {
          result[attrId] = [String(value)];
        }
      }
    } else if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item !== 'object' || item === null) continue;
        const attrId = item.id;
        if (attrId == null) continue;
        let parsedId: number;
        try {
          parsedId = parseInt(String(attrId), 10);
        } catch {
          continue;
        }

        const values = item.values;
        if (!Array.isArray(values)) continue;

        const parsedValues: string[] = [];
        for (const v of values) {
          const val = typeof v === 'object' ? v.value : v;
          if (val != null && val !== '') {
            parsedValues.push(String(val));
          }
        }

        if (parsedValues.length > 0) {
          result[parsedId] = parsedValues;
        }
      }
    }

    return result;
  } catch (error) {
    logger.warn(`Failed to parse attributes JSON: ${attributesJson}`);
    return {};
  }
}

/**
 * 校验物理属性（尺寸重量）是否完整
 * Ozon 要求 depth/width/height/weight/dimension_unit/weight_unit 必须存在且 > 0
 * 
 * 返回: 缺失的字段名列表
 */
function validatePhysicalAttributes(productData: Record<string, any>): string[] {
  const missing: string[] = [];

  // 尺寸字段必须存在且 > 0
  for (const field of ['depth', 'width', 'height']) {
    const val = productData[field];
    if (val == null || (typeof val === 'number' && val <= 0)) {
      missing.push(field);
    }
  }

  // 重量必须存在且 > 0
  const weight = productData.weight;
  if (weight == null || (typeof weight === 'number' && weight <= 0)) {
    missing.push('weight');
  }

  // 单位字段
  if (!productData.dimensionUnit) {
    missing.push('dimensionUnit');
  }
  if (!productData.weightUnit) {
    missing.push('weightUnit');
  }

  return missing;
}

/**
 * 获取类目属性定义（模拟实现，实际应调用Ozon API）
 */
async function fetchCategoryAttributes(
  categoryId: number,
  typeId: number,
  language: string = 'ZH_HANS',
  shopId?: number
): Promise<any[]> {
  // TODO: 实际项目中应调用 Ozon API 获取类目属性定义
  // 这里返回模拟数据作为示例
  logger.debug(`Fetching category attributes for categoryId=${categoryId}, typeId=${typeId}`);
  
  // 模拟类目属性定义
  return [
    { id: 1, name: '品牌', description: '商品品牌', type: 'STRING', is_required: true },
    { id: 2, name: '型号', description: '商品型号', type: 'STRING', is_required: true },
    { id: 3, name: '材质', description: '商品材质', type: 'STRING', is_required: true },
    { id: 4, name: '颜色', description: '商品颜色', type: 'STRING', is_required: false },
    { id: 5, name: '尺寸', description: '商品尺寸', type: 'STRING', is_required: false },
  ];
}

/**
 * 校验属性完整性
 * 
 * @param categoryId - Ozon 类目 ID
 * @param typeId - Ozon 商品类型 ID
 * @param attributesJson - 已填写的属性 JSON 字符串
 * @param productData - 商品数据（用于校验尺寸重量）
 * @param language - 回复语言
 * @param shopId - 店铺ID
 * 
 * @returns 校验结果
 */
export async function validateAttributes(
  categoryId: number,
  typeId: number,
  attributesJson: string | null,
  productData?: Record<string, any>,
  language: string = 'ZH_HANS',
  shopId?: number
): Promise<{
  valid: boolean;
  missing: any[];
  missingDimensions: string[];
  filledCount: number;
  totalCount: number;
  requiredCount: number;
  requiredFilled: number;
}> {
  // 获取类目属性定义
  const rawAttributes = await fetchCategoryAttributes(categoryId, typeId, language, shopId);
  const flatAttributes = flattenAttributes(rawAttributes);

  // 解析已填写的属性
  const filledAttrs = parseAttributes(attributesJson);
  const filledIds = new Set(Object.keys(filledAttrs).map(k => parseInt(k, 10)));

  // 统计
  const totalCount = flatAttributes.length;
  const requiredAttrs = flatAttributes.filter(a => a.is_required === true);
  const requiredCount = requiredAttrs.length;
  const requiredIds = new Set(requiredAttrs.map(a => a.id));
  const requiredFilled = [...requiredIds].filter(id => filledIds.has(id)).length;
  const filledCount = filledIds.size;

  // 找出缺失的必填属性
  const missingIds = [...requiredIds].filter(id => !filledIds.has(id));
  const missing = requiredAttrs.filter(attr => missingIds.includes(attr.id)).map(attr => ({
    id: attr.id,
    name: attr.name,
    description: attr.description,
    type: attr.type,
  }));

  // 校验尺寸重量
  const missingDimensions = productData ? validatePhysicalAttributes(productData) : [];

  return {
    valid: missing.length === 0 && missingDimensions.length === 0,
    missing,
    missingDimensions,
    filledCount,
    totalCount,
    requiredCount,
    requiredFilled,
  };
}

/**
 * 检查商品是否有错误
 */
export function hasProductErrors(product: any): boolean {
  if (!product) return false;
  
  // 检查错误字段
  if (product.errors && Array.isArray(product.errors) && product.errors.length > 0) {
    return true;
  }
  
  // 检查状态是否为错误状态
  const statuses = product.statuses;
  if (statuses) {
    const statusFailed = Array.isArray(statuses) ? statuses[0]?.status_failed : statuses.status_failed;
    if (statusFailed && statusFailed !== '' && statusFailed !== 'none') {
      return true;
    }
  }
  
  return false;
}

/**
 * 获取商品错误信息列表
 */
export function getProductErrors(product: any): any[] {
  if (!product) return [];
  
  const errors: any[] = [];
  
  // 添加API返回的错误
  if (product.errors && Array.isArray(product.errors)) {
    errors.push(...product.errors.map((e: any, index: number) => ({
      id: index,
      type: 'api',
      message: typeof e === 'string' ? e : e.message || JSON.stringify(e),
      code: e.code || null,
    })));
  }
  
  // 添加状态错误
  const statuses = product.statuses;
  if (statuses) {
    const statusFailed = Array.isArray(statuses) ? statuses[0]?.status_failed : statuses.status_failed;
    if (statusFailed && statusFailed !== '' && statusFailed !== 'none') {
      errors.push({
        id: errors.length,
        type: 'status',
        message: `商品状态异常: ${statusFailed}`,
        code: 'STATUS_FAILED',
      });
    }
  }
  
  return errors;
}