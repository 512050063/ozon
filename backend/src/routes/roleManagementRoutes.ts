import express from 'express';
import {
  getAllRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/roleManagementController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 获取所有角色
router.get('/', authenticateToken, getAllRoles);

// 获取单个角色
router.get('/:id', authenticateToken, getRole);

// 创建角色
router.post('/', authenticateToken, createRole);

// 更新角色
router.put('/:id', authenticateToken, updateRole);

// 删除角色
router.delete('/:id', authenticateToken, deleteRole);

export default router;
