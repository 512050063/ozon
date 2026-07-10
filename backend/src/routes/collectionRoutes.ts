import express from 'express';
import {
  getCollectionItems,
  getCollectionItem,
  createCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
  moveToProductLibrary
} from '../controllers/collectionController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 获取采集库列表
router.get('/', authenticateToken, getCollectionItems);

// 获取单个采集库商品
router.get('/:id', authenticateToken, getCollectionItem);

// 创建采集库商品
router.post('/', authenticateToken, createCollectionItem);

// 更新采集库商品
router.put('/:id', authenticateToken, updateCollectionItem);

// 删除采集库商品
router.delete('/:id', authenticateToken, deleteCollectionItem);

// 商品入库
router.post('/:id/move', authenticateToken, moveToProductLibrary);

export default router;
