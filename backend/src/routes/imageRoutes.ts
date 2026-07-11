import express from 'express';
import {
  getImages,
  getImageStats,
  uploadImage,
  deleteImage,
  batchDeleteImages,
  checkImageUsage,
  checkBatchImageUsage,
  proxyRemoteImage
} from '../controllers/imageController';
import { authenticateToken } from '../middleware/authMiddleware';
import multer from 'multer';

const router = express.Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 限制
  fileFilter: (req, file, cb) => {
    // 只允许上传图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件') as any, false);
    }
  }
});

// 获取图片列表
router.get('/', authenticateToken, getImages);

// 获取图片统计信息
router.get('/stats', authenticateToken, getImageStats);

// 上传图片
router.post('/upload', authenticateToken, upload.single('file'), uploadImage);

// 批量删除图片
router.delete('/batch', authenticateToken, batchDeleteImages);

// 批量检查图片是否被使用
router.post('/batch/usage', authenticateToken, checkBatchImageUsage);

// 代理 Ozon 远程图片，避免浏览器直连 CDN 被拒绝
router.get('/proxy', proxyRemoteImage);

// 检查图片是否被使用
router.get('/:id/usage', authenticateToken, checkImageUsage);

// 删除图片
router.delete('/:id', authenticateToken, deleteImage);

export default router;
