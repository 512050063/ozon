import express from 'express';
import { crawlOzonProducts, getOzonHotProducts } from '../services/ozonCrawlerService';
import logger from '../config/logger';

const router = express.Router();

/**
 * @swagger
 * /api/ozon/crawler/search:
 *   get:
 *     summary: 搜索Ozon商品
 *     description: 根据关键词搜索Ozon平台商品
 *     parameters:
 *       - name: keyword
 *         in: query
 *         required: true
 *         description: 搜索关键词
 *         type: string
 *       - name: categoryId
 *         in: query
 *         description: 分类ID
 *         type: string
 *       - name: page
 *         in: query
 *         description: 页码
 *         type: integer
 *         default: 1
 *     responses:
 *       200:
 *         description: 搜索成功
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *             data:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   brand:
 *                     type: string
 *                   price:
 *                     type: number
 *                   originalPrice:
 *                     type: number
 *                   discount:
 *                     type: number
 *                   rating:
 *                     type: number
 *                   reviewCount:
 *                     type: number
 *                   imageUrl:
 *                     type: string
 *                   productUrl:
 *                     type: string
 *             message:
 *               type: string
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword, categoryId, page = 1 } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        data: [],
        message: '请提供搜索关键词'
      });
    }

    logger.info(`收到Ozon搜索请求: keyword=${keyword}, categoryId=${categoryId}, page=${page}`);

    const result = await crawlOzonProducts(
      keyword as string,
      categoryId as string | undefined,
      parseInt(page as string)
    );

    res.json(result);
  } catch (error: any) {
    logger.error('Ozon搜索API错误:', error.message);
    res.status(500).json({
      success: false,
      data: [],
      message: `服务器错误: ${error.message}`
    });
  }
});

/**
 * @swagger
 * /api/ozon/crawler/hot:
 *   get:
 *     summary: 获取Ozon热销商品
 *     description: 获取Ozon平台热销商品列表
 *     parameters:
 *       - name: categoryId
 *         in: query
 *         description: 分类ID
 *         type: string
 *     responses:
 *       200:
 *         description: 获取成功
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *             data:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   brand:
 *                     type: string
 *                   price:
 *                     type: number
 *                   originalPrice:
 *                     type: number
 *                   discount:
 *                     type: number
 *                   rating:
 *                     type: number
 *                   reviewCount:
 *                     type: number
 *                   imageUrl:
 *                     type: string
 *                   productUrl:
 *                     type: string
 *             message:
 *               type: string
 */
router.get('/hot', async (req, res) => {
  try {
    const { categoryId } = req.query;

    logger.info(`收到Ozon热销商品请求: categoryId=${categoryId}`);

    const result = await getOzonHotProducts(categoryId as string | undefined);

    res.json(result);
  } catch (error: any) {
    logger.error('Ozon热销商品API错误:', error.message);
    res.status(500).json({
      success: false,
      data: [],
      message: `服务器错误: ${error.message}`
    });
  }
});

export default router;
