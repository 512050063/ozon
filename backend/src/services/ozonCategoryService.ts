import prisma from '../config/database';
import logger from '../config/logger';
import { buildOzonAttributeValueCacheRows } from './ozonAttributeValueCache';

// Ozon 分类 API 端点
const OZON_CATEGORY_API = '/v1/description-category/tree';
const OZON_CATEGORY_ATTRIBUTE_API = '/v1/description-category/attribute';
const OZON_CATEGORY_ATTRIBUTE_VALUES_API = '/v1/description-category/attribute/values';
const ATTRIBUTE_VALUES_CONCURRENCY = 5;
const ATTRIBUTE_VALUES_MAX_ITEMS = 5000;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// Ozon API 请求函数
export async function ozonApiRequest(
  url: string,
  clientId: string,
  apiKey: string,
  method: 'GET' | 'POST' = 'GET',
  data?: any
): Promise<any> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Client-Id': clientId,
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Ozon API request failed: ${response.status}`);
    }

    // 确保响应被正确解码为 UTF-8
    let text = await response.text();

    // 移除不可识别的控制字符
    text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    // 替换 Unicode 转义字符形式的控制字符
    text = text.replace(/\\u00[0-1][0-9A-F]/g, '');
    text = text.replace(/\\u007[F-F]/g, '');

    // 尝试解析 JSON
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (jsonError: any) {
      // 如果解析失败，记录更详细的信息
      const errorPosition = jsonError.message.match(/position (\d+)/);
      if (errorPosition) {
        const pos = parseInt(errorPosition[1]);
        const start = Math.max(0, pos - 50);
        const end = Math.min(text.length, pos + 50);
        logger.error(`JSON 解析失败在位置 ${pos}`);
        logger.error(`附近文本: ${JSON.stringify(text.slice(start, end))}`);
      }
      throw jsonError;
    }

    return parsedData;
  } catch (error: any) {
    logger.error('Ozon API request failed:', error);
    throw error;
  }
}

// 解析分类树并保存到数据库
async function parseAndSaveCategories(
  categories: any[],
  parentOzonId: bigint | null = null,
  parentDbId: number | null = null,
  level: number = 1,
  language: string = 'ZH_HANS'
): Promise<void> {
  for (const category of categories) {
    try {
      let categoryData: any;
      let ozonId: bigint;

      if (category.description_category_id) {
        // 处理第一级和第二级分类（description_category_id）
        ozonId = BigInt(category.description_category_id);
        categoryData = {
          ozonId,
          name: category.category_name || '',
          level,
          parentId: parentDbId,
          ozonParentId: parentOzonId,
          language,
          path: parentOzonId
            ? `${parentOzonId}/${category.description_category_id}`
            : `${category.description_category_id}`,
          updatedAt: new Date(),
        };
      } else if (category.type_id) {
        // 处理第三级类型（type_id）
        ozonId = BigInt(category.type_id);
        categoryData = {
          ozonId,
          name: category.type_name || '',
          level,
          parentId: parentDbId,
          ozonParentId: parentOzonId,
          language,
          path: parentOzonId
            ? `${parentOzonId}/${category.type_id}`
            : `${category.type_id}`,
          updatedAt: new Date(),
        };
      } else {
        logger.warn(`未知类型的节点: ${JSON.stringify(category)}`);
        continue;
      }

      // 检查分类是否已存在（使用 ozonId 和 ozonParentId 组合唯一索引）
      const existingCategory = await prisma.ozonCategory.findFirst({
        where: {
          ozonId: BigInt(ozonId.toString()),
          ozonParentId: parentOzonId ? BigInt(parentOzonId.toString()) : null,
        },
      });

      let currentDbId: number;

      if (existingCategory) {
        // 更新现有分类
        const updated = await prisma.ozonCategory.update({
          where: { id: existingCategory.id },
          data: categoryData,
        });
        currentDbId = updated.id;
      } else {
        // 创建新分类
        const created = await prisma.ozonCategory.create({
          data: categoryData,
        });
        currentDbId = created.id;
      }

      // 递归处理子分类
      if (category.children && category.children.length > 0) {
        await parseAndSaveCategories(category.children, ozonId, currentDbId, level + 1, language);
      }
    } catch (error: any) {
      logger.error(`处理节点失败:`, error.message);
    }
  }
}

/**
 * 同步 Ozon 分类数据（先清空再导入）
 */
export async function syncOzonCategories(
  clientId?: string,
  apiKey?: string,
  apiBaseUrl: string = 'https://api-seller.ozon.ru',
  language: string = 'ZH_HANS',
  clearFirst: boolean = true,
  userId?: number,
  storeId?: number
): Promise<{ totalCount: number; syncedCount: number; updatedCount: number }> {
  try {
    let effectiveClientId: string;
    let effectiveApiKey: string;

    // 如果没有提供 API 凭证，从数据库获取
    if (!clientId || !apiKey) {
      logger.info('未提供 API 凭证，从数据库获取...');
      const store = await prisma.ozonStore.findFirst({
        where: {
          status: 'active',
          ...(storeId ? { id: storeId } : {}),
          ...(userId ? { userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!store) {
        throw new Error('没有找到有效的 Ozon 店铺配置');
      }

      effectiveClientId = store.clientId;
      effectiveApiKey = store.apiKey;
      logger.info(`使用店铺 "${store.name}" 的 API 凭证`);
    } else {
      effectiveClientId = clientId;
      effectiveApiKey = apiKey;
    }

    logger.info('开始同步 Ozon 分类数据...');

    // 如果需要，先清空现有分类数据
    if (clearFirst) {
      logger.info('清空现有分类数据...');
      // 使用TRUNCATE TABLE清空数据（比DELETE更高效，且重置自增ID）
      await prisma.$executeRaw`TRUNCATE TABLE ozon_categories`;
      logger.info('分类数据已清空');
    }

    const fullUrl = `${apiBaseUrl}${OZON_CATEGORY_API}`;

    // 调用 Ozon API 获取分类树
    const apiData = await ozonApiRequest(fullUrl, effectiveClientId, effectiveApiKey, 'POST', { language });

    if (!apiData || !apiData.result || !Array.isArray(apiData.result)) {
      throw new Error('API 返回数据格式无效');
    }

    logger.info(`API 返回 ${apiData.result.length} 个一级分类`);

    // 保存分类到数据库
    await parseAndSaveCategories(apiData.result, null, null, 1, language);

    // 统计同步结果
    const totalCount = await prisma.ozonCategory.count();
    const syncedCount = totalCount; // 这里简化处理，实际应该区分新增和更新

    logger.info(`分类同步完成，共 ${totalCount} 个分类`);

    return {
      totalCount,
      syncedCount,
      updatedCount: totalCount,
    };
  } catch (error: any) {
    logger.error('同步 Ozon 分类失败:', error.message);
    throw error;
  }
}

/**
 * 为特定店铺同步 Ozon 分类数据
 */
export async function syncOzonCategoriesForStore(
  storeId: number,
  language: string = 'ZH_HANS',
  userId?: number
): Promise<{ totalCount: number; syncedCount: number; updatedCount: number }> {
  try {
    // 从数据库获取店铺信息
    const store = await prisma.ozonStore.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error('店铺不存在');
    }

    if (userId && store.userId && store.userId !== userId) {
      throw new Error('无权使用该店铺同步分类');
    }

    logger.info(`为店铺 "${store.name}" 同步分类数据...`);

    return await syncOzonCategories(store.clientId, store.apiKey, 'https://api-seller.ozon.ru', language, true, userId, storeId);
  } catch (error: any) {
    logger.error(`为店铺 ${storeId} 同步分类失败:`, error.message);
    throw error;
  }
}

/**
 * 同步所有激活店铺的 Ozon 分类数据
 */
export async function syncOzonCategoriesForAllStores(
  language: string = 'ZH_HANS',
  userId?: number
): Promise<{
  totalCount: number;
  syncedCount: number;
  updatedCount: number;
  storeCount: number;
  failedStores: number[];
}> {
  try {
    logger.info('开始同步所有激活店铺的分类数据...');

    const activeStores = await prisma.ozonStore.findMany({
      where: {
        status: 'active',
        ...(userId ? { userId } : {}),
      },
    });

    if (activeStores.length === 0) {
      logger.warn('没有找到激活的 Ozon 店铺');
      return {
        totalCount: 0,
        syncedCount: 0,
        updatedCount: 0,
        storeCount: 0,
        failedStores: [],
      };
    }

    logger.info(`找到 ${activeStores.length} 个激活店铺`);

    let totalCount = 0;
    let syncedCount = 0;
    let updatedCount = 0;
    const failedStores: number[] = [];

    for (const store of activeStores) {
      try {
        logger.info(`正在同步店铺 "${store.name}" 的分类数据...`);
        const result = await syncOzonCategoriesForStore(store.id, language, userId);
        totalCount += result.totalCount;
        syncedCount += result.syncedCount;
        updatedCount += result.updatedCount;
        logger.info(`店铺 "${store.name}" 分类同步完成`);
      } catch (error: any) {
        logger.error(`店铺 "${store.name}" 分类同步失败:`, error.message);
        failedStores.push(store.id);
      }
    }

    logger.info(`所有店铺分类同步完成: 成功 ${activeStores.length - failedStores.length} 个，失败 ${failedStores.length} 个`);

    return {
      totalCount,
      syncedCount,
      updatedCount,
      storeCount: activeStores.length,
      failedStores,
    };
  } catch (error: any) {
    logger.error('同步所有店铺分类数据失败:', error.message);
    throw error;
  }
}

/**
 * 从数据库获取分类树（三级结构）
 */
export async function getOzonCategoriesTree(): Promise<any[]> {
  try {
    // 获取所有分类，按层级排序
    const categories = await prisma.ozonCategory.findMany({
      orderBy: [{ level: 'asc' }, { id: 'asc' }],
      include: {
        children: true,
      },
    });

    // 构建分类树结构
    const categoryMap = new Map<number, any>();
    const tree: any[] = [];

    // 先将所有分类放入映射
    categories.forEach((category) => {
      categoryMap.set(Number(category.id), {
        id: Number(category.id),
        name: category.name,
        level: category.level,
        parentId: category.parentId ? Number(category.parentId) : null,
        path: category.path,
        children: [],
      });
    });

    // 构建树结构
    categories.forEach((category) => {
      const categoryNode = categoryMap.get(Number(category.id));
      if (category.level === 1) {
        // 一级分类直接加入树
        tree.push(categoryNode);
      } else if (category.parentId !== null) {
        // 找到父分类并添加到其子分类中
        const parentNode = categoryMap.get(Number(category.parentId));
        if (parentNode) {
          parentNode.children.push(categoryNode);
        }
      }
    });

    logger.info(`从数据库获取到 ${tree.length} 个一级分类`);

    return tree;
  } catch (error: any) {
    logger.error('获取分类树失败:', error.message);
    throw error;
  }
}

/**
 * 获取所有分类列表（扁平化）
 */
export async function getOzonCategoriesList(): Promise<any[]> {
  try {
    const categories = await prisma.ozonCategory.findMany({
      orderBy: [{ level: 'asc' }, { parentId: 'asc' }, { id: 'asc' }],
    });

    return categories.map((category) => ({
      id: Number(category.id),
      name: category.name,
      level: category.level,
      parentId: category.parentId ? Number(category.parentId) : null,
      path: category.path,
    }));
  } catch (error: any) {
    logger.error('获取分类列表失败:', error.message);
    throw error;
  }
}

/**
 * 获取类目最早创建时间（用于显示上次更新时间）
 */
export async function getOzonCategoryCreatedTime(): Promise<Date | null> {
  try {
    // 从 sync_logs 表获取类目同步的最后更新时间
    const lastLog = await prisma.syncLog.findFirst({
      where: { syncType: 'category' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (lastLog) {
      logger.info(`类目最后更新时间(来自sync_logs): ${lastLog.createdAt}`);
      return lastLog.createdAt;
    }
    return null;
  } catch (error: any) {
    logger.error('获取类目更新时间失败:', error.message);
    return null;
  }
}

/**
 * 根据分类 ID 获取分类信息
 */
export async function getOzonCategoryById(categoryId: number): Promise<any> {
  try {
    const category = await prisma.ozonCategory.findUnique({
      where: { id: categoryId },
      include: {
        children: true,
        parent: true,
      },
    });

    if (!category) {
      return null;
    }

    return {
      id: Number(category.id),
      name: category.name,
      level: category.level,
      parentId: category.parentId ? Number(category.parentId) : null,
      path: category.path,
      children: category.children.map((child) => ({
        id: Number(child.id),
        name: child.name,
        level: child.level,
        parentId: Number(child.parentId),
        path: child.path,
      })),
      parent: category.parent
        ? {
            id: Number(category.parent.id),
            name: category.parent.name,
            level: category.parent.level,
            parentId: category.parent.parentId ? Number(category.parent.parentId) : null,
            path: category.parent.path,
          }
        : null,
    };
  } catch (error: any) {
    logger.error(`获取分类 ${categoryId} 失败:`, error.message);
    return null;
  }
}

/**
 * 根据分类 ID 获取商品属性（带数据库缓存）
 * 首次从 Ozon API 拉取并入库，后续从数据库读取，减少 API 调用
 */
export async function getOzonCategoryAttributes(
  categoryId: number,
  typeId?: number,
  clientId?: string,
  apiKey?: string,
  apiBaseUrl: string = 'https://api-seller.ozon.ru',
  language: string = 'ZH_HANS',
  userId?: number,
  storeId?: number
): Promise<any[]> {
  try {
    // Step 1: 先查数据库缓存
    const cachedAttributes = await prisma.ozonCategoryAttribute.findMany({
      where: {
        descriptionCategoryId: categoryId,
        typeId: typeId ?? null,
      },
      include: {
        attributeValues: true,
      },
      orderBy: { id: 'asc' },
    });

    if (cachedAttributes.length > 0) {
      // 检查是否有 select 类型属性缺少 values（缓存可能不完整）
      const hasMissingValues = cachedAttributes.some(
        attr => attr.dictionaryId && attr.dictionaryId > 0 && attr.attributeValues.length === 0
      );

      if (hasMissingValues) {
        logger.info(`缓存属性缺少字典值，重新从 API 获取: categoryId=${categoryId}, typeId=${typeId}`);
        // 删除旧缓存，重新获取
        await prisma.ozonCategoryAttribute.deleteMany({
          where: {
            descriptionCategoryId: categoryId,
            typeId: typeId ?? null,
          },
        });
      } else {
        logger.info(`从数据库缓存获取分类属性: ${cachedAttributes.length} 个`);
        // 将数据库记录转换为前端期望的格式
        return cachedAttributes.map(attr => ({
          id: attr.ozonAttributeId,
          name: attr.name,
          description: attr.description,
          type: attr.type,
          is_required: attr.isRequired,
          dictionary_id: attr.dictionaryId || 0,
          group_id: attr.groupId,
          group_name: attr.groupName,
          is_collection: attr.isCollection,
          is_dependent: attr.isDependent,
          precision: attr.precision,
          values: attr.attributeValues.length > 0
            ? attr.attributeValues.map(v => ({ id: v.valueId, value: v.value }))
            : undefined,
        }));
      }
    }

    // Step 2: 缓存未命中，从 Ozon API 获取
    logger.info(`缓存未命中，从 Ozon API 获取分类属性: categoryId=${categoryId}, typeId=${typeId}`);
    
    let effectiveClientId: string;
    let effectiveApiKey: string;

    if (!clientId || !apiKey) {
      logger.info('未提供 API 凭证，从数据库获取...');
      const store = await prisma.ozonStore.findFirst({
        where: {
          status: 'active',
          ...(storeId ? { id: storeId } : {}),
          ...(userId ? { userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!store) {
        throw new Error('没有找到有效的 Ozon 店铺配置');
      }

      effectiveClientId = store.clientId;
      effectiveApiKey = store.apiKey;
      logger.info(`使用店铺 "${store.name}" 的 API 凭证`);
    } else {
      effectiveClientId = clientId;
      effectiveApiKey = apiKey;
    }

    const fullUrl = `${apiBaseUrl}${OZON_CATEGORY_ATTRIBUTE_API}`;

    // 调用 Ozon API 获取分类属性 — 同时发送两个 ID
    const requestData: any = { language };
    requestData.description_category_id = categoryId;
    if (typeId) {
      requestData.type_id = typeId;
    }

    const apiData = await ozonApiRequest(fullUrl, effectiveClientId, effectiveApiKey, 'POST', requestData);

    if (!apiData || !apiData.result || !Array.isArray(apiData.result)) {
      throw new Error('API 返回数据格式无效');
    }

    logger.info(`从 Ozon API 获取到分类属性: ${apiData.result.length} 个`);

    // Step 3: 存入数据库缓存（upsert 防止重复插入）
    const result = await mapWithConcurrency(apiData.result, ATTRIBUTE_VALUES_CONCURRENCY, async (attr: any) => {
      try {
        // 判断属性类型
        let attrType = 'string';
        if (attr.type) {
          const t = String(attr.type).toLowerCase();
          if (t === 'integer' || t === 'decimal') attrType = 'number';
          else if (t === 'boolean') attrType = 'boolean';
          else if (t === 'url') attrType = 'string';
          else if (t === 'string') attrType = 'string';
        }
        if (attr.dictionary_id && attr.dictionary_id > 0) {
          attrType = 'select';
        }

        // 查找已有缓存记录，避免 upsert 的复合键类型问题
        const existingAttr = await prisma.ozonCategoryAttribute.findFirst({
          where: {
            ozonAttributeId: attr.id,
            descriptionCategoryId: categoryId,
            typeId: typeId ?? null,
          },
        });

        const savedAttr = existingAttr
          ? await prisma.ozonCategoryAttribute.update({
              where: { id: existingAttr.id },
              data: {
                name: attr.name || '',
                description: attr.description || null,
                type: attrType,
                isRequired: attr.is_required === true,
                dictionaryId: attr.dictionary_id || null,
                groupId: attr.group_id || null,
                groupName: attr.group_name || null,
                isCollection: attr.is_collection === true,
                isDependent: attr.is_dependent === true,
                precision: attr.precision || null,
              },
            })
          : await prisma.ozonCategoryAttribute.create({
              data: {
                ozonAttributeId: attr.id,
                descriptionCategoryId: categoryId,
                typeId: typeId ?? null,
                name: attr.name || '',
                description: attr.description || null,
                type: attrType,
                isRequired: attr.is_required === true,
                dictionaryId: attr.dictionary_id || null,
                groupId: attr.group_id || null,
                groupName: attr.group_name || null,
                isCollection: attr.is_collection === true,
                isDependent: attr.is_dependent === true,
                precision: attr.precision || null,
              },
            });

        // 如果有字典值，获取并缓存属性值
        let values: any[] | undefined;
        if (attr.dictionary_id && attr.dictionary_id > 0) {
          try {
            const attrValues = await getOzonAttributeValues(
              attr.id,
              effectiveClientId,
              effectiveApiKey,
              apiBaseUrl,
              language,
              categoryId,
              typeId,
              userId,
              storeId
            );
            const valueRows = buildOzonAttributeValueCacheRows(savedAttr.id, attrValues);
            if (valueRows.length > 0) {
              await prisma.ozonAttributeValue.deleteMany({
                where: { attributeId: savedAttr.id },
              });
              await prisma.ozonAttributeValue.createMany({
                data: valueRows,
                skipDuplicates: true,
              });
            }
            values = attrValues.map((v: any) => ({ id: v.id, value: v.info || v.value || '' }));
            logger.info(`缓存属性 ${attr.name} 的值: ${attrValues.length} 个`);
          } catch (valErr: any) {
            logger.warn(`获取属性值失败 (attr=${attr.name}, dict=${attr.dictionary_id}): ${valErr.message}`);
          }
        }

        return {
          id: attr.id,
          name: attr.name,
          description: attr.description,
          type: attrType,
          is_required: attr.is_required === true,
          dictionary_id: attr.dictionary_id || 0,
          group_id: attr.group_id,
          group_name: attr.group_name,
          is_collection: attr.is_collection === true,
          is_dependent: attr.is_dependent === true,
          precision: attr.precision,
          values,
        };
      } catch (attrErr: any) {
        logger.warn(`缓存属性 ${attr.name} 失败: ${attrErr.message}`);
        // 即使缓存失败，也继续返回 API 数据
        return {
          id: attr.id,
          name: attr.name,
          description: attr.description,
          type: attr.type?.toLowerCase() || 'string',
          is_required: attr.is_required === true,
          dictionary_id: attr.dictionary_id || 0,
          group_id: attr.group_id,
          group_name: attr.group_name,
          is_collection: attr.is_collection === true,
          is_dependent: attr.is_dependent === true,
          precision: attr.precision,
        };
      }
    });

    return result;
  } catch (error: any) {
    logger.error(`获取分类属性失败:`, error.message);
    throw error;
  }
}

/**
 * 根据属性 ID 获取属性值
 */
export async function getOzonAttributeValues(
  attributeId: number,
  clientId?: string,
  apiKey?: string,
  apiBaseUrl: string = 'https://api-seller.ozon.ru',
  language: string = 'ZH_HANS',
  descriptionCategoryId?: number,
  typeId?: number,
  userId?: number,
  storeId?: number
): Promise<any[]> {
  try {
    let effectiveClientId: string;
    let effectiveApiKey: string;

    // 如果没有提供 API 凭证，从数据库获取
    if (!clientId || !apiKey) {
      logger.info('未提供 API 凭证，从数据库获取...');
      const store = await prisma.ozonStore.findFirst({
        where: {
          status: 'active',
          ...(storeId ? { id: storeId } : {}),
          ...(userId ? { userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!store) {
        throw new Error('没有找到有效的 Ozon 店铺配置');
      }

      effectiveClientId = store.clientId;
      effectiveApiKey = store.apiKey;
      logger.info(`使用店铺 "${store.name}" 的 API 凭证`);
    } else {
      effectiveClientId = clientId;
      effectiveApiKey = apiKey;
    }

    const fullUrl = `${apiBaseUrl}${OZON_CATEGORY_ATTRIBUTE_VALUES_API}`;

    const result: any[] = [];
    let lastValueId = 0;
    const limit = 5000;
    let hasMore = true;

    while (hasMore) {
      const requestData: any = {
        attribute_id: attributeId,
        language,
        limit,
        last_value_id: lastValueId,
      };
      if (descriptionCategoryId) {
        requestData.description_category_id = descriptionCategoryId;
      }
      if (typeId) {
        requestData.type_id = typeId;
      }

      const apiData = await ozonApiRequest(fullUrl, effectiveClientId, effectiveApiKey, 'POST', requestData);

      if (!apiData || !apiData.result || !Array.isArray(apiData.result)) {
        throw new Error('API 返回数据格式无效');
      }

      result.push(...apiData.result);
      if (result.length >= ATTRIBUTE_VALUES_MAX_ITEMS) {
        logger.warn(`属性值数量超过上限，停止继续分页: attributeId=${attributeId}, max=${ATTRIBUTE_VALUES_MAX_ITEMS}`);
        break;
      }
      const responseLastValueId = apiData.last_value_id || apiData.result?.[apiData.result.length - 1]?.id || 0;
      hasMore = apiData.has_next === true || (apiData.result.length === limit && responseLastValueId && responseLastValueId !== lastValueId);
      lastValueId = responseLastValueId;
    }

    logger.info(`获取到属性值: attributeId=${attributeId}, count=${result.length}`);

    return result;
  } catch (error: any) {
    logger.error(`获取属性值失败:`, error.message);
    throw error;
  }
}

/**
 * 增量同步类目数据（不清空，仅更新变化的）
 */
export async function syncOzonCategoriesIncremental(
  clientId?: string,
  apiKey?: string,
  apiBaseUrl: string = 'https://api-seller.ozon.ru',
  language: string = 'ZH_HANS',
  userId?: number,
  storeId?: number
): Promise<{ totalCount: number; syncedCount: number; updatedCount: number }> {
  try {
    let effectiveClientId: string;
    let effectiveApiKey: string;

    if (!clientId || !apiKey) {
      logger.info('未提供 API 凭证，从数据库获取...');
      const store = await prisma.ozonStore.findFirst({
        where: {
          status: 'active',
          ...(storeId ? { id: storeId } : {}),
          ...(userId ? { userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!store) {
        throw new Error('没有找到有效的 Ozon 店铺配置');
      }

      effectiveClientId = store.clientId;
      effectiveApiKey = store.apiKey;
      logger.info(`使用店铺 "${store.name}" 的 API 凭证`);
    } else {
      effectiveClientId = clientId;
      effectiveApiKey = apiKey;
    }

    logger.info('开始增量同步 Ozon 分类数据...');

    const fullUrl = `${apiBaseUrl}${OZON_CATEGORY_API}`;
    const apiData = await ozonApiRequest(fullUrl, effectiveClientId, effectiveApiKey, 'POST', { language });

    if (!apiData || !apiData.result || !Array.isArray(apiData.result)) {
      throw new Error('API 返回数据格式无效');
    }

    logger.info(`API 返回 ${apiData.result.length} 个一级分类`);

    // 递归解析并保存（使用 upsert 逻辑）
    let syncedCount = 0;
    let updatedCount = 0;

    async function processCategories(
      categories: any[],
      parentOzonId: bigint | null = null,
      parentDbId: number | null = null,
      level: number = 1
    ): Promise<void> {
      for (const category of categories) {
        try {
          let ozonId: bigint;
          let name: string;

          if (category.description_category_id) {
            ozonId = BigInt(category.description_category_id);
            name = category.category_name || '';
          } else if (category.type_id) {
            ozonId = BigInt(category.type_id);
            name = category.type_name || '';
          } else {
            continue;
          }

          const existing = await prisma.ozonCategory.findFirst({
            where: {
              ozonId,
              ozonParentId: parentOzonId,
            },
          });

          const categoryData = {
            ozonId,
            name,
            level,
            parentId: parentDbId,
            ozonParentId: parentOzonId,
            language,
            path: parentOzonId ? `${parentOzonId}/${ozonId}` : `${ozonId}`,
            updatedAt: new Date(),
          };

          let currentDbId: number;

          if (existing) {
            if (existing.name !== name) {
              await prisma.ozonCategory.update({
                where: { id: existing.id },
                data: categoryData,
              });
              updatedCount++;
            }
            currentDbId = existing.id;
          } else {
            const created = await prisma.ozonCategory.create({
              data: categoryData,
            });
            currentDbId = created.id;
            syncedCount++;
          }

          if (category.children && category.children.length > 0) {
            await processCategories(category.children, ozonId, currentDbId, level + 1);
          }
        } catch (error: any) {
          logger.error(`处理节点失败: ${error.message}`);
        }
      }
    }

    await processCategories(apiData.result);

    const totalCount = await prisma.ozonCategory.count();

    // 写入同步日志
    await prisma.syncLog.create({
      data: {
        syncType: 'category',
        syncedCount,
        updatedCount,
        deletedCount: 0,
        status: 'success',
        message: `增量同步完成，新增 ${syncedCount}，更新 ${updatedCount}，总计 ${totalCount} 条`,
        userId: userId || null,
        ozonStoreId: storeId || 0,
      },
    });

    logger.info(`增量同步完成，新增 ${syncedCount}，更新 ${updatedCount}，总计 ${totalCount} 条`);

    return { totalCount, syncedCount, updatedCount };
  } catch (error: any) {
    logger.error('增量同步失败:', error.message);

    // 写入失败日志
    await prisma.syncLog.create({
      data: {
        syncType: 'category',
        syncedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        status: 'failed',
        message: error.message,
        userId: userId || null,
        ozonStoreId: storeId || 0,
      },
    });

    throw error;
  }
}

/**
 * 获取类目更新同步日志（全局，不绑定店铺）
 */
export async function getCategorySyncLogs(
  page: number = 1,
  pageSize: number = 10
): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
  const whereClause: any = { syncType: 'category' };

  const total = await prisma.syncLog.count({ where: whereClause });

  const logs = await prisma.syncLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { user: { select: { nickname: true } } },
  });

  const result = logs.map((log: any) => ({
    id: log.id,
    userName: log.user?.nickname || '系统',
    syncedCount: log.syncedCount || 0,
    updatedCount: log.updatedCount || 0,
    deletedCount: log.deletedCount || 0,
    status: log.status,
    createdAt: log.createdAt,
  }));

  return { list: result, total, page, pageSize };
}
