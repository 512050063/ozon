import { Router } from 'express';
import {
  getAllPaymentRecords,
  getMyPaymentRecords,
  getPaymentRecordById,
  createPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord,
} from '../controllers/paymentRecordController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 管理员获取所有支付记录
router.get('/all', authenticateToken, getAllPaymentRecords);

// 用户获取自己的支付记录
router.get('/my', authenticateToken, getMyPaymentRecords);

// 获取单个支付记录详情
router.get('/:id', authenticateToken, getPaymentRecordById);

// 创建支付记录
router.post('/', authenticateToken, createPaymentRecord);

// 更新支付记录
router.put('/:id', authenticateToken, updatePaymentRecord);

// 删除支付记录
router.delete('/:id', authenticateToken, deletePaymentRecord);

export default router;
