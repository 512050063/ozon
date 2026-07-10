import request from './request';

// 分类 API 接口

/**
 * 同步 Ozon 分类数据
 * @param params 同步参数
 * @returns 同步结果
 */
export async function syncOzonCategories(params: { clientId: string; apiKey: string; apiBaseUrl?: string }): Promise<{
  success: boolean;
  data?: {
    totalCount: number;
    syncedCount: number;
    updatedCount: number;
  };
  message?: string;
}> {
  return request.post('/ozon/categories/sync', params);
}

/**
 * 获取分类树（三级结构）
 * @returns 分类树数据
 */
export async function getOzonCategoriesTree(): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
}> {
  return request.get('/ozon/categories/tree');
}

/**
 * 获取所有分类列表（扁平化）
 * @returns 分类列表
 */
export async function getOzonCategoriesList(): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
}> {
  return request.get('/ozon/categories/list');
}

/**
 * 根据分类 ID 获取分类信息
 * @param id 分类 ID
 * @returns 分类信息
 */
export async function getOzonCategoryById(id: number): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> {
  return request.get(`/ozon/categories/${id}`);
}

/**
 * 获取分类统计信息
 * @returns 分类统计数据
 */
export async function getOzonCategoriesStats(): Promise<{
  success: boolean;
  data?: {
    total: number;
    level1: number;
    level2: number;
    level3: number;
  };
  message?: string;
}> {
  return request.get('/ozon/categories/stats');
}

/**
 * 根据分类 ID 获取分类属性
 * @param id 分类 ID
 * @param typeId 类型 ID（可选）
 * @returns 分类属性列表
 */
export async function getOzonCategoryAttributes(
  id: number,
  typeId?: number
): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
}> {
  const params = typeId ? { typeId } : {};
  return request.get(`/ozon/categories/${id}/attributes`, { params });
}

/**
 * 根据属性 ID 获取属性值
 * @param id 属性 ID
 * @returns 属性值列表
 */
export async function getOzonAttributeValues(id: number): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
}> {
  return request.get(`/ozon/categories/attributes/${id}/values`);
}

/**
 * 获取类目创建时间（用于显示上次更新时间）
 * @returns 创建时间
 */
export async function getOzonCategoryCreatedTime(): Promise<{
  success: boolean;
  data?: string | null;
  message?: string;
}> {
  return request.get('/ozon/categories/created-time');
}

/**
 * 增量同步 Ozon 分类数据
 * @returns 同步结果
 */
export async function syncOzonCategoriesIncremental(): Promise<{
  success: boolean;
  data?: {
    newCount: number;
    updatedCount: number;
  };
  message?: string;
}> {
  const response = await request.post('/ozon/categories/sync/incremental');
  return {
    success: response.success,
    data: response.data || { newCount: 0, updatedCount: 0 },
    message: response.message || '',
  };
}

/**
 * 获取类目更新同步日志（全局，不绑定店铺）
 * @param page 页码，默认1
 * @param pageSize 每页条数，默认10
 * @returns 分页的同步日志
 */
export async function getCategorySyncLogs(page: number = 1, pageSize: number = 10): Promise<{
  success: boolean;
  data?: {
    list: Array<{
      id: number;
      userName: string;
      syncedCount: number;
      updatedCount: number;
      deletedCount: number;
      status: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  };
  message?: string;
}> {
  return request.get(`/ozon/categories/sync-logs?page=${page}&pageSize=${pageSize}`);
}
