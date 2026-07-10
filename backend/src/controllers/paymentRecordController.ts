import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { getPaymentRecordStats } from '../services/paymentRecordStatsService';

const ADMIN_ROLE_CODES = new Set(['admin', 'super_admin', 'operator', 'operation']);

const isAdminRole = (role: unknown) => ADMIN_ROLE_CODES.has(String(role || ''));

// 获取所有支付记录
export const getAllPaymentRecords = async (req: Request, res: Response) => {
  try {

    const { page = '1', limit = '10', username } = req.query;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);

    const where: any = {};
    if (username) {
      where.user = {
        OR: [
          { username: { contains: username as string } },
          { nickname: { contains: username as string } },
        ],
      };
    }

    // 获取支付记录
    const paymentRecords = await prisma.paymentRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limitNumber,
      skip: (pageNumber - 1) * limitNumber,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
      },
    });

    const stats = await getPaymentRecordStats(prisma.paymentRecord, where);

    res.json({
      success: true,
      message: '获取支付记录成功',
      data: {
        data: paymentRecords,
        stats: {
          ...stats,
        },
        pagination: {
          total: stats.totalCount,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(stats.totalCount / limitNumber),
        },
      },
    });
  } catch (error: any) {
    logger.error('获取支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 获取用户的支付记录（用户只能查看自己的记录）
export const getMyPaymentRecords = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;

    const { page = '1', limit = '10', planType, status } = req.query;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);

    const where: any = {
      userId: currentUserId,
    };
    if (planType) {
      where.planType = planType;
    }
    if (status) {
      where.status = status;
    }

    const paymentRecords = await prisma.paymentRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limitNumber,
      skip: (pageNumber - 1) * limitNumber,
    });

    const total = await prisma.paymentRecord.count({ where });

    res.json({
      success: true,
      message: '获取支付记录成功',
      data: {
        data: paymentRecords,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error: any) {
    logger.error('获取支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 获取单个支付记录详情（仅管理员或用户自己）
export const getPaymentRecordById = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;
    const currentUserRole = (req as any).user.role;
    const { id } = req.params;

    const paymentRecord = await prisma.paymentRecord.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            phone: true,
          },
        },
      },
    });

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: '支付记录不存在',
      });
    }

    // 检查权限：管理员或记录所属用户
    if (!isAdminRole(currentUserRole) && paymentRecord.userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: '无权限访问',
      });
    }

    res.json({
      success: true,
      message: '获取支付记录成功',
      data: paymentRecord,
    });
  } catch (error: any) {
    logger.error('获取支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 创建支付记录（通常通过支付系统回调或内部API调用）
export const createPaymentRecord = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;
    const currentUserRole = (req as any).user.role;

    const { userId, amount, planType, status = 'pending', paymentMethod, transactionId } = req.body;

    // 检查权限：管理员或用户自己
    const targetUserId = userId || currentUserId;
    if (!isAdminRole(currentUserRole) && targetUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: '无权限创建该用户的支付记录',
      });
    }

    // 验证必填字段
    if (!amount || !planType) {
      return res.status(400).json({
        success: false,
        message: '金额和套餐类型为必填项',
      });
    }

    const paymentRecord = await prisma.paymentRecord.create({
      data: {
        userId: targetUserId,
        amount,
        planType,
        status,
        paymentMethod,
        transactionId,
      },
    });

    logger.info(`创建支付记录成功: userId=${paymentRecord.userId}, plan=${paymentRecord.planType}, amount=${paymentRecord.amount}`);

    res.status(201).json({
      success: true,
      message: '创建支付记录成功',
      data: paymentRecord,
    });
  } catch (error: any) {
    logger.error('创建支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 更新支付记录（通常用于处理支付状态变更）
export const updatePaymentRecord = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;
    const currentUserRole = (req as any).user.role;
    const { id } = req.params;

    const paymentRecord = await prisma.paymentRecord.findUnique({
      where: { id: parseInt(id) },
    });

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: '支付记录不存在',
      });
    }

    // 检查权限：管理员或记录所属用户
    if (!isAdminRole(currentUserRole) && paymentRecord.userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: '无权限访问',
      });
    }

    const { status, paymentMethod, transactionId } = req.body;

    const updatedPaymentRecord = await prisma.paymentRecord.update({
      where: { id: parseInt(id) },
      data: {
        ...(status && { status }),
        ...(paymentMethod && { paymentMethod }),
        ...(transactionId && { transactionId }),
      },
    });

    logger.info(`更新支付记录成功: ${updatedPaymentRecord.id}`);

    res.json({
      success: true,
      message: '更新支付记录成功',
      data: updatedPaymentRecord,
    });
  } catch (error: any) {
    logger.error('更新支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 删除支付记录（仅管理员）
export const deletePaymentRecord = async (req: Request, res: Response) => {
  try {
    const currentUserRole = (req as any).user.role;

    if (!isAdminRole(currentUserRole)) {
      return res.status(403).json({
        success: false,
        message: '无权限访问',
      });
    }

    const { id } = req.params;

    const paymentRecord = await prisma.paymentRecord.findUnique({
      where: { id: parseInt(id) },
    });

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: '支付记录不存在',
      });
    }

    await prisma.paymentRecord.delete({
      where: { id: parseInt(id) },
    });

    logger.info(`删除支付记录成功: ${id}`);

    res.json({
      success: true,
      message: '删除支付记录成功',
    });
  } catch (error: any) {
    logger.error('删除支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};
