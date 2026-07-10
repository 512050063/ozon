import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

// 会员等级映射
const MEMBER_LEVELS: Record<string, string> = {
  trial: 'trial',
  free: 'free',
  standard: 'standard',
  professional: 'professional'
};

// 领取试用会员
export const claimTrial = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查是否已经领取过试用
    if (currentUser.hasClaimedTrial) {
      return res.status(400).json({
        success: false,
        message: '您已经领取过试用会员了'
      });
    }

    // 检查是否已经是更高等级会员
    if (currentUser.memberLevel === 'standard' || currentUser.memberLevel === 'professional') {
      return res.status(400).json({
        success: false,
        message: '您已经是高级会员，无法领取试用'
      });
    }

    // 计算试用到期时间（3天后）
    const trialExpiration = new Date();
    trialExpiration.setDate(trialExpiration.getDate() + 3);

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        memberLevel: 'trial',
        hasClaimedTrial: true,
        trialExpiration
      }
    });

    logger.info(`用户领取试用成功: ${updatedUser.username}`);

    res.json({
      success: true,
      message: '试用会员领取成功，有效期3天',
      data: {
        memberLevel: updatedUser.memberLevel,
        trialExpiration
      }
    });
  } catch (error: any) {
    logger.error('领取试用失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 升级会员
export const upgradeMembership = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: '请选择套餐'
      });
    }

    // 验证套餐类型
    if (!['standard', 'professional'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: '无效的套餐类型'
      });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查是否已经是同等级会员
    if (currentUser.memberLevel === plan) {
      return res.status(400).json({
        success: false,
        message: '您已经是该等级会员'
      });
    }

    // 计算会员到期时间（默认一个月）
    const memberExpiration = new Date();
    memberExpiration.setMonth(memberExpiration.getMonth() + 1);

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        memberLevel: plan,
        memberExpiration
      }
    });

    // 创建支付记录（模拟）- 使用try-catch确保会员升级成功不受影响
    let paymentId = null;
    try {
      const paymentRecord = await prisma.paymentRecord.create({
        data: {
          userId: userId,
          amount: plan === 'standard' ? 99 : 299,
          planType: plan,
          status: 'success',
          paymentMethod: 'wechat'
        }
      });
      paymentId = paymentRecord.id;
    } catch (paymentError) {
      logger.warn(`创建支付记录失败: ${paymentError}`);
      // 支付记录创建失败不影响会员升级
    }

    logger.info(`用户升级会员成功: ${updatedUser.username}, 套餐: ${plan}`);

    res.json({
      success: true,
      message: '会员升级成功',
      data: {
        memberLevel: updatedUser.memberLevel,
        memberExpiration,
        paymentId
      }
    });
  } catch (error: any) {
    logger.error('升级会员失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取当前用户会员信息
export const getMembershipInfo = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        memberLevel: true,
        trialExpiration: true,
        memberExpiration: true,
        hasClaimedTrial: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查会员是否过期
    const now = new Date();
    let needsUpdate = false;
    let updatedData: any = {};

    // 检查试用会员是否过期
    if (user.memberLevel === 'trial' && user.trialExpiration && user.trialExpiration < now) {
      updatedData.memberLevel = 'free';
      needsUpdate = true;
    }

    // 检查标准会员是否过期
    if (user.memberLevel === 'standard' && user.memberExpiration && user.memberExpiration < now) {
      updatedData.memberLevel = 'free';
      needsUpdate = true;
    }

    // 检查专业会员是否过期
    if (user.memberLevel === 'professional' && user.memberExpiration && user.memberExpiration < now) {
      updatedData.memberLevel = 'free';
      needsUpdate = true;
    }

    // 如果需要更新，执行数据库操作
    if (needsUpdate) {
      user = await prisma.user.update({
        where: { id: userId },
        data: updatedData,
        select: {
          memberLevel: true,
          trialExpiration: true,
          memberExpiration: true,
          hasClaimedTrial: true,
          createdAt: true
        }
      });
      logger.info(`用户会员过期自动降级: 用户ID=${userId}, 旧等级=${user.memberLevel}, 新等级=${updatedData.memberLevel}`);
    }

    res.json({
      success: true,
      message: '获取会员信息成功',
      data: user
    });
  } catch (error: any) {
    logger.error('获取会员信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};
