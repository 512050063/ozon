import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

// 获取所有定价策略
export const getPricingStrategies = async (req: Request, res: Response) => {
  try {
    const strategies = await prisma.pricingStrategy.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      message: '获取定价策略成功',
      data: strategies,
    });
  } catch (error: any) {
    logger.error('获取定价策略失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 获取单个定价策略
export const getPricingStrategy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const strategy = await prisma.pricingStrategy.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: '定价策略不存在',
      });
    }

    res.json({
      success: true,
      message: '获取定价策略成功',
      data: strategy,
    });
  } catch (error: any) {
    logger.error('获取定价策略失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 创建定价策略
export const createPricingStrategy = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      name,
      basePrice,
      shippingPrice,
      tariffRate,
      profitRate,
      platformFeeRate,
      otherCost,
      isDefault,
    } = req.body;

    // 如果设置为默认策略，需要将其他策略的 isDefault 设置为 false
    if (isDefault) {
      await prisma.pricingStrategy.updateMany({
        where: {
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const strategy = await prisma.pricingStrategy.create({
      data: {
        userId,
        name,
        basePrice,
        shippingPrice,
        tariffRate,
        profitRate,
        platformFeeRate,
        otherCost,
        isDefault,
      },
    });

    res.status(201).json({
      success: true,
      message: '创建定价策略成功',
      data: strategy,
    });
  } catch (error: any) {
    logger.error('创建定价策略失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 更新定价策略
export const updatePricingStrategy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const {
      name,
      basePrice,
      shippingPrice,
      tariffRate,
      profitRate,
      platformFeeRate,
      otherCost,
      isDefault,
    } = req.body;

    // 如果设置为默认策略，需要将其他策略的 isDefault 设置为 false
    if (isDefault) {
      await prisma.pricingStrategy.updateMany({
        where: {
          isDefault: true,
          id: { not: parseInt(id) },
        },
        data: { isDefault: false },
      });
    }

    const strategy = await prisma.pricingStrategy.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name,
        basePrice,
        shippingPrice,
        tariffRate,
        profitRate,
        platformFeeRate,
        otherCost,
        isDefault,
      },
    });

    res.json({
      success: true,
      message: '更新定价策略成功',
      data: strategy,
    });
  } catch (error: any) {
    logger.error('更新定价策略失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 删除定价策略
export const deletePricingStrategy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const strategy = await prisma.pricingStrategy.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: '定价策略不存在',
      });
    }

    // 如果要删除的是默认策略，需要将另一个策略设置为默认
    if (strategy.isDefault) {
      const otherStrategies = await prisma.pricingStrategy.findMany({
        where: {
          id: { not: parseInt(id) },
        },
      });

      if (otherStrategies.length > 0) {
        await prisma.pricingStrategy.update({
          where: { id: otherStrategies[0].id },
          data: { isDefault: true },
        });
      }
    }

    await prisma.pricingStrategy.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.json({
      success: true,
      message: '删除定价策略成功',
    });
  } catch (error: any) {
    logger.error('删除定价策略失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};
