import { Router } from 'express';
import {
  syncCategories,
  syncCategoriesIncremental,
  getCategoriesTree,
  getCategoriesList,
  getCategoryById,
  getCategoriesStats,
  syncCategoriesForAllStores,
  getCategoryAttributes,
  getAttributeValues,
  getCategoryCreatedTime,
  getCategorySyncLogs,
} from '../controllers/ozonCategoryController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 同步分类数据
router.post('/sync', syncCategories);

// 增量同步分类数据（不清空，只 upsert 新/变化的类目），需要认证
router.post('/sync/incremental', authenticateToken, syncCategoriesIncremental);

// 同步所有激活店铺的分类数据
router.post('/sync/all', syncCategoriesForAllStores);

// 获取分类树（三级结构）
router.get('/tree', getCategoriesTree);

// 获取所有分类列表（扁平化）
router.get('/list', getCategoriesList);

// 获取类目创建时间（用于显示上次更新时间）
router.get('/created-time', getCategoryCreatedTime);

// 获取类目更新同步日志（全局，不需要店铺ID）—— 必须在 /:id 之前！
router.get('/sync-logs', getCategorySyncLogs);

// 获取分类统计信息
router.get('/stats', getCategoriesStats);

// 根据分类 ID 获取分类信息
router.get('/:id', getCategoryById);

// 获取分类属性
router.get('/:id/attributes', getCategoryAttributes);

// 获取属性值
router.get('/attributes/:id/values', getAttributeValues);

export default router;
