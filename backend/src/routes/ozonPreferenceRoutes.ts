import express from 'express';
import {
  getConfig,
  saveConfig,
  syncCategories,
  getCacheStatus,
  getSearchCache,
  clearSearchCache,
} from '../controllers/ozonPreferenceController';

const router = express.Router();

/**
 * @swagger
 * /api/ozon/preference/config:
 *   get:
 *     summary: 获取Ozon优选配置
 *     description: 获取搜索数量、缓存时间等配置
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/config', getConfig);

/**
 * @swagger
 * /api/ozon/preference/config:
 *   post:
 *     summary: 保存Ozon优选配置
 *     description: 保存搜索数量、缓存时间等配置
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             searchLimit:
 *               type: integer
 *               description: 搜索商品数量（10-200）
 *             cacheMaxAge:
 *               type: integer
 *               description: 缓存保存时间（1-24小时）
 *     responses:
 *       200:
 *         description: 保存成功
 */
router.post('/config', saveConfig);

/**
 * @swagger
 * /api/ozon/preference/sync-categories:
 *   post:
 *     summary: 同步Ozon类目
 *     description: 从Ozon平台同步最新类目数据
 *     responses:
 *       200:
 *         description: 同步成功
 */
router.post('/sync-categories', syncCategories);

/**
 * @swagger
 * /api/ozon/preference/cache:
 *   get:
 *     summary: 获取缓存信息
 *     description: 获取搜索结果缓存的大小和文件数
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/cache', getCacheStatus);

router.get('/search-cache', getSearchCache);

/**
 * @swagger
 * /api/ozon/preference/cache:
 *   delete:
 *     summary: 清除缓存
 *     description: 清除所有搜索结果缓存
 *     responses:
 *       200:
 *         description: 清除成功
 */
router.delete('/cache', clearSearchCache);

export default router;
