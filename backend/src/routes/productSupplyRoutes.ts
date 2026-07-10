import express from 'express';
import {
  getProductSupplyItems,
  getProductSupplyItemById,
  getProductSupplyTemplateController,
  getSupplySources,
  previewProductSupplySourceFromUrl,
  createProductSupplyItem,
  updateProductSupplyItem,
  updateProductSupplySource,
  importProductSupplySourceFromUrl,
  unbindProductSupplySource,
  deleteProductSupplyItem,
  getProductSupplyListingPreview,
  listToOzon,
  checkListingStatus
} from '../controllers/productSupplyController';

const router = express.Router();

// 获取商品库列表
router.get('/', getProductSupplyItems);

// 获取 Ozon 商品类型模板（必须在 /:id 之前）
router.get('/templates', getProductSupplyTemplateController);

// 获取已保存的1688货源记录（必须在 /:id 之前）
router.get('/sources', getSupplySources);

// 通过1688链接解析商品库货源预览（必须在 /:id 之前）
router.post('/source/preview-url', previewProductSupplySourceFromUrl);

// 获取单个商品库商品
router.get('/:id', getProductSupplyItemById);

// 创建商品库商品（采集入库）
router.post('/', createProductSupplyItem);

// 上架预览
router.post('/:id/listing-preview', getProductSupplyListingPreview);

// 上架商品到Ozon
router.post('/:id/list-to-ozon', listToOzon);

// 查询上架任务状态
router.get('/:id/listing-status', checkListingStatus);

// 更新货源绑定
router.put('/:id/source', updateProductSupplySource);

// 通过1688链接导入并绑定货源
router.post('/:id/source/from-url', importProductSupplySourceFromUrl);

// 解绑货源
router.delete('/:id/source', unbindProductSupplySource);

// 更新商品库商品
router.put('/:id', updateProductSupplyItem);

// 删除商品库商品
router.delete('/:id', deleteProductSupplyItem);

export default router;
