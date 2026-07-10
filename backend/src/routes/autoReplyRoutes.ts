import express from 'express';
import {
  getAutoReplyRules,
  getAutoReplyRule,
  createAutoReplyRule,
  updateAutoReplyRule,
  deleteAutoReplyRule,
} from '../controllers/autoReplyController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 获取所有自动回复规则
router.get('/', authenticateToken, getAutoReplyRules);

// 获取单个自动回复规则
router.get('/:id', authenticateToken, getAutoReplyRule);

// 创建自动回复规则
router.post('/', authenticateToken, createAutoReplyRule);

// 更新自动回复规则
router.put('/:id', authenticateToken, updateAutoReplyRule);

// 删除自动回复规则
router.delete('/:id', authenticateToken, deleteAutoReplyRule);

export default router;
