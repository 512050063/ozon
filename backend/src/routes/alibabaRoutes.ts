import express from 'express';
import {
  searchAlibabaProductsController,
  getAlibabaProductDetailController,
  getSupplierInfoController,
  batchGetAlibabaProductsController,
  getAuthPageController,
  exchangeTokenController,
  getTokenStatusController,
  getAuthorizeInfoController,
  saveAlibabaConfigController,
  searchSimilarProductsByImageController,
  searchRecommendSameProductsController
} from '../controllers/alibabaController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 用code换token - 跳过认证，因为callback.html跨域无法携带JWT
// 通过state参数中的userId来识别用户
router.get('/auth/token', exchangeTokenController);

// 所有1688路由需要认证
router.use(authenticateToken);

// 搜索1688货源
router.get('/search', searchAlibabaProductsController);

// 获取商品详情
router.get('/products/:productId', getAlibabaProductDetailController);

// 获取供应商信息
router.get('/suppliers/:supplierId', getSupplierInfoController);

// 批量获取商品信息
router.post('/batch', batchGetAlibabaProductsController);

// 搜同款 - 图片搜索
router.post('/search/image', searchSimilarProductsByImageController);

// 搜同类 - 基于商品ID推荐同类商品
router.get('/search/similar', searchRecommendSameProductsController);

// 授权页面
router.get('/auth/page', getAuthPageController);

// 获取token状态
router.get('/auth/status', getTokenStatusController);

// 获取授权链接信息
router.get('/auth/authorize', getAuthorizeInfoController);

// 保存1688配置
router.post('/config', saveAlibabaConfigController);

export default router;
