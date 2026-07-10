import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  claimTrial,
  upgradeMembership,
  getMembershipInfo
} from '../controllers/membershipController';

const router = express.Router();

// 验证用户身份（除了登录和注册）
router.use(authenticateToken);

// 获取当前用户会员信息
router.get('/', getMembershipInfo);

// 领取试用会员
router.post('/trial', claimTrial);

// 升级会员
router.post('/upgrade', upgradeMembership);

export default router;
