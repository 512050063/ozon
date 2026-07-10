import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

// 获取所有自动回复规则
export const getAutoReplyRules = async (req: Request, res: Response) => {
  try {
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const where: any = {};

    if (keyword) {
      where.OR = [
        { keyword: { contains: keyword } },
        { replyContent: { contains: keyword } },
        { productSelection: { is: { name: { contains: keyword } } } },
      ];
    }

    const rules = await prisma.autoReplyRule.findMany({
      where,
      include: {
        productSelection: {
          select: { id: true, name: true, ozonId: true, imageUrl: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      message: '获取自动回复规则成功',
      data: rules,
    });
  } catch (error: any) {
    logger.error('获取自动回复规则失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 获取单个自动回复规则
export const getAutoReplyRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rule = await prisma.autoReplyRule.findFirst({
      where: {
        id: parseInt(id),
      },
      include: {
        productSelection: {
          select: { id: true, name: true, ozonId: true, imageUrl: true },
        },
      },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: '自动回复规则不存在',
      });
    }

    res.json({
      success: true,
      message: '获取自动回复规则成功',
      data: rule,
    });
  } catch (error: any) {
    logger.error('获取自动回复规则失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 创建自动回复规则
export const createAutoReplyRule = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { keyword, replyContent, enabled, priority, type, productSelectionId } = req.body;

    // 校验关键词非空
    if (!keyword || !keyword.trim()) {
      return res.status(400).json({
        success: false,
        message: '关键词不能为空',
      });
    }

    // 校验回复内容非空
    if (!replyContent || !replyContent.trim()) {
      return res.status(400).json({
        success: false,
        message: '回复内容不能为空',
      });
    }

    // 校验类型
    const ruleType = type === 'product' ? 'product' : 'store';

    // 如果是商品类型，必须关联商品
    if (ruleType === 'product' && !productSelectionId) {
      return res.status(400).json({
        success: false,
        message: '商品类型规则必须关联一个商品',
      });
    }

    // 自动回复是共享业务规则，同关键词+类型不允许重复
    const existingRule = await prisma.autoReplyRule.findFirst({
      where: {
        keyword: keyword.trim(),
        type: ruleType,
        ...(ruleType === 'product' && { productSelectionId }),
      },
    });

    if (existingRule) {
      return res.status(400).json({
        success: false,
        message: '该关键词在此类型下已存在，请勿重复添加',
      });
    }

    const rule = await prisma.autoReplyRule.create({
      data: {
        userId,
        type: ruleType,
        keyword: keyword.trim(),
        replyContent: replyContent.trim(),
        enabled: enabled !== undefined ? enabled : true,
        priority: priority !== undefined ? priority : 0,
        ...(ruleType === 'product' && productSelectionId && { productSelectionId }),
      },
      include: {
        productSelection: {
          select: { id: true, name: true, ozonId: true, imageUrl: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: '创建自动回复规则成功',
      data: rule,
    });
  } catch (error: any) {
    logger.error('创建自动回复规则失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 更新自动回复规则
export const updateAutoReplyRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { keyword, replyContent, enabled, priority, type, productSelectionId } = req.body;

    // 检查规则是否存在
    const existingRule = await prisma.autoReplyRule.findFirst({
      where: {
        id: parseInt(id),
      },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: '自动回复规则不存在',
      });
    }

    // 如果修改了关键词，校验是否与其他规则重复
    const newKeyword = keyword !== undefined ? keyword.trim() : existingRule.keyword;
    const newType = type !== undefined ? (type === 'product' ? 'product' : 'store') : existingRule.type;
    const newProductSelectionId = newType === 'product'
      ? (productSelectionId !== undefined ? (productSelectionId || null) : existingRule.productSelectionId)
      : null;

    if (!newKeyword) {
      return res.status(400).json({
        success: false,
        message: '关键词不能为空',
      });
    }

    if (replyContent !== undefined && !replyContent.trim()) {
      return res.status(400).json({
        success: false,
        message: '回复内容不能为空',
      });
    }

    if (newType === 'product' && !newProductSelectionId) {
      return res.status(400).json({
        success: false,
        message: '商品类型规则必须关联一个商品',
      });
    }

    if (
      newKeyword !== existingRule.keyword ||
      newType !== existingRule.type ||
      newProductSelectionId !== existingRule.productSelectionId
    ) {
      const duplicateRule = await prisma.autoReplyRule.findFirst({
        where: {
          keyword: newKeyword,
          type: newType,
          id: { not: parseInt(id) },
          ...(newType === 'product' && { productSelectionId: newProductSelectionId }),
        },
      });

      if (duplicateRule) {
        return res.status(400).json({
          success: false,
          message: '该关键词在此类型下已被其他规则使用',
        });
      }
    }

    const rule = await prisma.autoReplyRule.update({
      where: {
        id: parseInt(id),
      },
      data: {
        ...(keyword !== undefined && { keyword: keyword.trim() }),
        ...(replyContent !== undefined && { replyContent: replyContent.trim() }),
        ...(enabled !== undefined && { enabled }),
        ...(priority !== undefined && { priority }),
        ...(type !== undefined && { type: newType }),
        ...((type !== undefined || productSelectionId !== undefined) && {
          productSelectionId: newProductSelectionId,
        }),
      },
      include: {
        productSelection: {
          select: { id: true, name: true, ozonId: true, imageUrl: true },
        },
      },
    });

    res.json({
      success: true,
      message: '更新自动回复规则成功',
      data: rule,
    });
  } catch (error: any) {
    logger.error('更新自动回复规则失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 删除自动回复规则
export const deleteAutoReplyRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rule = await prisma.autoReplyRule.findFirst({
      where: {
        id: parseInt(id),
      },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: '自动回复规则不存在',
      });
    }

    await prisma.autoReplyRule.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.json({
      success: true,
      message: '删除自动回复规则成功',
    });
  } catch (error: any) {
    logger.error('删除自动回复规则失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};
