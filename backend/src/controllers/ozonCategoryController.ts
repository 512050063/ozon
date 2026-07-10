import { Request, Response } from 'express';
import {
  syncOzonCategories,
  syncOzonCategoriesForStore,
  syncOzonCategoriesForAllStores,
  syncOzonCategoriesIncremental,
  getOzonCategoriesTree,
  getOzonCategoriesList,
  getOzonCategoryById,
  getOzonCategoryAttributes,
  getOzonAttributeValues,
  getOzonCategoryCreatedTime
} from '../services/ozonCategoryService';
import logger from '../config/logger';
import prisma from '../config/database';

/**
 * 同步 Ozon 分类数据
 */
export async function syncCategories(req: Request, res: Response) {
  try {
    // 从请求参数或配置中获取 API 密钥
    const { clientId, apiKey, apiBaseUrl = 'https://api-seller.ozon.ru', storeId } = req.body;

    let result;

    if (storeId) {
      // 为特定店铺同步
      result = await syncOzonCategoriesForStore(Number(storeId));
    } else if (clientId && apiKey) {
      // 使用提供的 API 凭证同步
      result = await syncOzonCategories(clientId, apiKey, apiBaseUrl);
    } else {
      // 没有提供参数，尝试从数据库获取
      result = await syncOzonCategories();
    }

    res.json({
      success: true,
      message: `分类同步成功`,
      data: result,
    });
  } catch (error: any) {
    logger.error('同步分类失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '同步分类失败',
    });
  }
}

/**
 * 为所有激活的 Ozon 店铺同步分类数据
 */
export async function syncCategoriesForAllStores(req: Request, res: Response) {
  try {
    const result = await syncOzonCategoriesForAllStores();

    res.json({
      success: true,
      message: `所有激活店铺分类同步完成`,
      data: result,
    });
  } catch (error: any) {
    logger.error('同步所有店铺分类失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '同步所有店铺分类失败',
    });
  }
}

/**
 * 获取分类树（三级结构）
 */
export async function getCategoriesTree(req: Request, res: Response) {
  try {
    const categoriesTree = await getOzonCategoriesTree();

    res.json({
      success: true,
      data: categoriesTree,
    });
  } catch (error: any) {
    logger.error('获取分类树失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取分类树失败',
    });
  }
}

/**
 * 增量同步分类数据（不清空，只 upsert 新/变化的类目）
 */
export async function syncCategoriesIncremental(req: Request, res: Response) {
  try {
    // 从请求中获取用户ID（需要认证中间件）
    const userId = (req as any).user?.id;
    const { storeId } = req.body;

    const result = await syncOzonCategoriesIncremental(
      undefined,
      undefined,
      'https://api-seller.ozon.ru',
      'ZH_HANS',
      userId,
      storeId ? Number(storeId) : undefined
    );

    res.json({
      success: true,
      data: result,
      message: `增量同步完成：新增 ${result.syncedCount}，更新 ${result.updatedCount}，总计 ${result.totalCount} 个类目`,
    });
  } catch (error: any) {
    logger.error('增量同步分类失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '增量同步分类失败',
    });
  }
}

/**
 * 获取所有分类列表（扁平化）
 */
export async function getCategoriesList(req: Request, res: Response) {
  try {
    const categoriesList = await getOzonCategoriesList();

    res.json({
      success: true,
      data: categoriesList,
    });
  } catch (error: any) {
    logger.error('获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取分类列表失败',
    });
  }
}

/**
 * 获取类目创建时间（用于显示上次更新时间）
 */
export async function getCategoryCreatedTime(req: Request, res: Response) {
  try {
    const createdAt = await getOzonCategoryCreatedTime();

    res.json({
      success: true,
      data: createdAt,
    });
  } catch (error: any) {
    logger.error('获取类目创建时间失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取类目创建时间失败',
    });
  }
}

/**
 * 根据分类 ID 获取分类信息
 */
export async function getCategoryById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '无效的分类 ID',
      });
    }

    const category = await getOzonCategoryById(parseInt(id));

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在',
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    logger.error('获取分类信息失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取分类信息失败',
    });
  }
}

/**
 * 获取分类属性
 */
export async function getCategoryAttributes(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { typeId } = req.query;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '无效的分类 ID',
      });
    }

    const attributes = await getOzonCategoryAttributes(
      parseInt(id),
      typeId ? parseInt(typeId as string) : undefined
    );

    res.json({
      success: true,
      data: attributes,
    });
  } catch (error: any) {
    logger.error('获取分类属性失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取分类属性失败',
    });
  }
}

/**
 * 获取属性值
 */
export async function getAttributeValues(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '无效的属性 ID',
      });
    }

    const values = await getOzonAttributeValues(parseInt(id));

    res.json({
      success: true,
      data: values,
    });
  } catch (error: any) {
    logger.error('获取属性值失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取属性值失败',
    });
  }
}

/**
 * 获取分类统计信息
 */
export async function getCategoriesStats(req: Request, res: Response) {
  try {
    // 这个方法可以添加分类统计信息，如各级分类数量等
    res.json({
      success: true,
      data: {
        total: 0,
        level1: 0,
        level2: 0,
        level3: 0,
      },
    });
  } catch (error: any) {
    logger.error('获取分类统计失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取分类统计失败',
    });
  }
}

/**
 * 获取类目更新同步日志（全局，不绑定店铺）
 */
export async function getCategorySyncLogs(req: Request, res: Response) {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const pageNum = parseInt(page.toString());
    const pageSizeNum = parseInt(pageSize.toString());

    const whereClause: any = { syncType: 'category' };

    const total = await prisma.syncLog.count({ where: whereClause });

    const logs = await prisma.syncLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
      include: {
        user: {
          select: { nickname: true },
        },
      },
    }) as Array<any>;

    const result = logs.map((log: any) => ({
      id: log.id,
      userName: log.user?.nickname || '系统',
      syncedCount: log.syncedCount || 0,
      updatedCount: log.updatedCount || 0,
      deletedCount: log.deletedCount || 0,
      status: log.status,
      message: log.message || '',
      createdAt: log.createdAt,
    }));

    res.json({
      success: true,
      message: '获取类目更新日志成功',
      data: {
        list: result,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
      },
    });
  } catch (error: any) {
    logger.error('获取类目更新日志失败:', error);
    res.status(500).json({
      success: false,
      message: `获取类目更新日志失败: ${error.message}`,
    });
  }
}
