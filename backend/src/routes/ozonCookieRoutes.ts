import express from 'express';
import { fetchOzonCookie, importOzonCookie, getOzonCookie } from '../services/ozonCookieService';
import logger from '../config/logger';
import multer from 'multer';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * @swagger
 * /api/ozon/cookie/fetch:
 *   post:
 *     summary: 一键获取Ozon Cookie
 *     description: 执行Python脚本打开浏览器，设置中文和人民币后保存Cookie
 *     responses:
 *       200:
 *         description: 获取成功
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *             data:
 *               type: object
 *             message:
 *               type: string
 */
router.post('/fetch', async (req, res) => {
  try {
    logger.info('收到一键获取Ozon Cookie请求');
    
    const result = await fetchOzonCookie();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message || 'Cookie获取成功'
      });
    } else {
      res.json({
        success: false,
        data: null,
        message: result.message || 'Cookie获取失败'
      });
    }
  } catch (error: any) {
    logger.error('获取Ozon Cookie失败:', error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: `服务器错误: ${error.message}`
    });
  }
});

/**
 * @swagger
 * /api/ozon/cookie/import:
 *   post:
 *     summary: 手动导入Ozon Cookie
 *     description: 上传JSON文件导入Cookie
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - name: file
 *         in: formData
 *         required: true
 *         description: Cookie JSON文件
 *         type: file
 *     responses:
 *       200:
 *         description: 导入成功
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *             data:
 *               type: object
 *             message:
 *               type: string
 */
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    logger.info('收到手动导入Ozon Cookie请求');
    
    const result = await importOzonCookie(req);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message || 'Cookie导入成功'
      });
    } else {
      res.json({
        success: false,
        data: null,
        message: result.message || 'Cookie导入失败'
      });
    }
  } catch (error: any) {
    logger.error('导入Ozon Cookie失败:', error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: `服务器错误: ${error.message}`
    });
  }
});

/**
 * @swagger
 * /api/ozon/cookie:
 *   get:
 *     summary: 获取当前Ozon Cookie信息
 *     description: 获取已保存的Cookie配置
 *     responses:
 *       200:
 *         description: 获取成功
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *             data:
 *               type: object
 *             message:
 *               type: string
 */
router.get('/', async (req, res) => {
  try {
    logger.info('收到获取Ozon Cookie信息请求');
    
    const result = await getOzonCookie();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: '获取成功'
      });
    } else {
      res.json({
        success: false,
        data: null,
        message: result.message || '未找到Cookie配置'
      });
    }
  } catch (error: any) {
    logger.error('获取Ozon Cookie信息失败:', error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: `服务器错误: ${error.message}`
    });
  }
});

export default router;
