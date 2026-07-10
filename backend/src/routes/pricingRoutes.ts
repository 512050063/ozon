import express from 'express';
import {
  getPricingStrategies,
  getPricingStrategy,
  createPricingStrategy,
  updatePricingStrategy,
  deletePricingStrategy,
} from '../controllers/pricingController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 获取所有定价策略
router.get('/', authenticateToken, getPricingStrategies);

// 获取单个定价策略
router.get('/:id', authenticateToken, getPricingStrategy);

// 创建定价策略
router.post('/', authenticateToken, createPricingStrategy);

// 更新定价策略
router.put('/:id', authenticateToken, updatePricingStrategy);

// 删除定价策略
router.delete('/:id', authenticateToken, deletePricingStrategy);

export default router;
