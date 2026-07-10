import express from 'express';
import {
  getOzonStores,
  getOzonStoreContext,
  getOzonStore,
  getOzonStorePushConfig,
  createOzonStore,
  updateOzonStore,
  deleteOzonStore,
  resetOzonPushSecret,
  setCurrentOzonStore,
  testOzonConnection,
  getOzonProductIdsByStoreId,
  getOzonProductDetails,
  syncOzonProducts,
  getLocalOzonProducts,
  deleteLocalOzonProduct,
  listProductToOzonController,
  updateOzonProductPriceController,
  updateOzonProductStockController,
  syncStockFromOzonController,
  getOzonProductDetailController,
  getSyncLogs,
  getOzonErrorCodes,
  translateOzonErrorCode,
  translateOzonErrorCodes,
  archiveOzonProductController,
  unarchiveOzonProductController,
  updateOzonProductController,
  validateOzonProductController,
  getOzonProductLimitsController
} from '../controllers/ozonStoreController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 错误码映射（必须在 /:id 之前，否则 /:id 会匹配 /error-codes）
router.get('/error-codes', getOzonErrorCodes);
router.post('/translate-error', translateOzonErrorCode);
router.post('/translate-errors', translateOzonErrorCodes);

// 获取所有Ozon店铺
router.get('/', getOzonStores);

// 获取当前店铺上下文
router.get('/context/current', getOzonStoreContext);

// 获取单个Ozon店铺
router.get('/:id', getOzonStore);

// 获取店铺推送配置
router.get('/:id/push-config', getOzonStorePushConfig);

// 重置店铺推送密钥
router.post('/:id/push-secret/reset', resetOzonPushSecret);

// 创建Ozon店铺
router.post('/', createOzonStore);

// 更新Ozon店铺
router.put('/:id', updateOzonStore);

// 删除Ozon店铺
router.delete('/:id', deleteOzonStore);

// 设置当前操作店铺
router.post('/:id/current', setCurrentOzonStore);

// 测试连接
router.post('/test-connection', testOzonConnection);

// 获取店铺产品ID列表
router.get('/:storeId/product-ids', getOzonProductIdsByStoreId);

// 获取 Ozon 商品创建/更新额度
router.get('/:storeId/product-limits', getOzonProductLimitsController);

// 获取产品详情列表
router.post('/:storeId/product-details', getOzonProductDetails);

// 同步产品到本地数据库
router.post('/:storeId/sync-products', syncOzonProducts);

// 获取本地数据库中的产品列表（带分页）
router.get('/:storeId/local-products', getLocalOzonProducts);

// 删除本地数据库中的产品
router.delete('/:storeId/local-products/:productId', deleteLocalOzonProduct);

// 一键上架商品到Ozon
router.post('/:storeId/list-product', listProductToOzonController);

// 更新Ozon商品价格
router.put('/:storeId/products/:productId/price', updateOzonProductPriceController);

// 更新Ozon商品库存
router.put('/:storeId/products/:productId/stock', updateOzonProductStockController);

// 归档Ozon商品
router.post('/:storeId/products/:productId/archive', archiveOzonProductController);

// 取消归档Ozon商品
router.post('/:storeId/products/:productId/unarchive', unarchiveOzonProductController);

// 操作前校验商品是否仍存在，并刷新本地快照
router.post('/:storeId/products/:productId/validate', validateOzonProductController);

// 更新Ozon商品信息（名称、描述、图片、属性、价格等）
router.put('/:storeId/products/:productId', updateOzonProductController);

// 同步库存从Ozon到本地
router.post('/:storeId/sync-stock', syncStockFromOzonController);

// 获取单个商品详情（从Ozon API）
router.get('/:storeId/products/:productId/detail', getOzonProductDetailController);

// 获取同步日志
router.get('/:storeId/sync-logs', getSyncLogs);

export default router;
