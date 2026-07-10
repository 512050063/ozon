import express from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  checkSessionStatus,
  forgotPassword,
  verifyForgotPasswordCode,
  getWechatLoginQRCode,
  checkWechatLoginStatus,
  simulateWechatCallback,
  updateProfile,
  uploadAvatar,
  deleteAvatarHistoryItem,
  unbindWechat,
  sendVerificationCode,
  verifyCode,
  changePassword,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 用户注册
router.post('/register', register);

// 用户登录
router.post('/login', login);

// 用户退出
router.post('/logout', authenticateToken, logout);

// 忘记密码
router.post('/forgot-password/verify', verifyForgotPasswordCode);
router.post('/forgot-password', forgotPassword);

// 获取当前用户信息（需要认证）
router.get('/me', authenticateToken, getCurrentUser);

// 当前登录会话状态
router.get('/session/status', authenticateToken, checkSessionStatus);

// 更新用户资料（需要认证）
router.put('/profile', authenticateToken, updateProfile);

// 上传头像（需要认证）
router.post('/avatar', authenticateToken, uploadAvatar);

// 删除历史头像项（需要认证）
router.delete('/avatar/history', authenticateToken, deleteAvatarHistoryItem);

// 微信解绑（需要认证）
router.post('/wechat/unbind', authenticateToken, unbindWechat);

// 验证码相关路由
router.post('/send-verification-code', sendVerificationCode);
router.post('/verify-code', verifyCode);

// 修改密码（通过原密码验证）
router.put('/change-password', authenticateToken, changePassword);

// 微信登录相关路由
router.get('/wechat/qrcode', getWechatLoginQRCode);
router.get('/wechat/status', checkWechatLoginStatus);
router.post('/wechat/callback', simulateWechatCallback);

export default router;
