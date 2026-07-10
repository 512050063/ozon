import { Router } from 'express';
import { extractProductType, batchExtractTypes, getBatchStatus, resetBatchStatus } from '../controllers/ozonTypeController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 提取商品类型（单个）
router.post('/extract-type', authenticateToken, extractProductType);

// 批量提取（异步，立即返回）
router.post('/batch-extract', authenticateToken, batchExtractTypes);

// 查询批量提取进度
router.get('/batch-status', authenticateToken, getBatchStatus);

// 强制重置批量提取状态（清理卡住的任务）
router.post('/reset-batch', authenticateToken, resetBatchStatus);

export default router;
