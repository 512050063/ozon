import express from 'express';
import {
  getApiConfigs,
  getApiConfig,
  updateApiConfig,
  deleteApiConfig,
  testApiConnection,
} from '../controllers/apiConfigController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 获取所有API配置（已按userId过滤，普通用户也可访问自己的配置）
router.get('/', authenticateToken, getApiConfigs);

// 获取单个API配置
router.get('/:platform', authenticateToken, getApiConfig);

// 更新或创建API配置
router.put('/:platform', authenticateToken, updateApiConfig);

// 删除API配置
router.delete('/:platform', authenticateToken, deleteApiConfig);

// 测试API连接
router.post('/:platform/test', authenticateToken, testApiConnection);

export default router;
