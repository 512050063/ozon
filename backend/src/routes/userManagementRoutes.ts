import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
} from '../controllers/userManagementController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 获取所有用户
router.get('/', authenticateToken, getAllUsers);

// 获取单个用户
router.get('/:id', authenticateToken, getUserById);

// 创建用户
router.post('/', authenticateToken, createUser);

// 更新用户
router.put('/:id', authenticateToken, updateUser);

// 切换用户状态
router.patch('/:id/status', authenticateToken, toggleUserStatus);

// 删除用户
router.delete('/:id', authenticateToken, deleteUser);

export default router;
