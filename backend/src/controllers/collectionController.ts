import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

export const getCollectionItems = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const items = await prisma.collectionItem.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        images: {
          include: {
            image: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    const transformedItems = items.map(item => ({
      ...item,
      images: item.images.map(img => img.image),
      image: item.images.length > 0 ? item.images[0].image : null
    }));

    res.json({
      success: true,
      message: '获取采集库列表成功',
      data: transformedItems
    });
  } catch (error: any) {
    logger.error('获取采集库列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

export const getCollectionItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const item = await prisma.collectionItem.findFirst({
      where: {
        id: parseInt(id),
      },
      include: {
        images: {
          include: {
            image: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: '采集库商品不存在'
      });
    }

    const transformedItem = {
      ...item,
      images: item.images.map(img => img.image),
      image: item.images.length > 0 ? item.images[0].image : null
    };

    res.json({
      success: true,
      message: '获取采集库商品成功',
      data: transformedItem
    });
  } catch (error: any) {
    logger.error('获取采集库商品失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

export const createCollectionItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      name,
      description,
      images = [], // 现在接受图片数组
      category,
      brand,
      modelName,
      packageLength,
      packageWidth,
      packageHeight,
      grossWeight,
      alibabaId,
      supplier,
      price
    } = req.body;

    logger.info('收到创建采集库商品请求:', req.body);

    if (!name || !category || !brand || !alibabaId || price == null) {
      logger.warn('参数验证失败:', req.body);
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }

    const existingItem = await prisma.collectionItem.findFirst({
      where: {
        alibabaId
      }
    });

    if (existingItem) {
      logger.warn('货号重复:', alibabaId);
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_ALIBABA_ID',
        message: '该货号已存在，请使用其他货号'
      });
    }

    const item = await prisma.collectionItem.create({
      data: {
        userId,
        name,
        description: description || '',
        category: category || '',
        brand: brand || '无品牌',
        modelName: modelName || '',
        packageLength: packageLength || 0,
        packageWidth: packageWidth || 0,
        packageHeight: packageHeight || 0,
        grossWeight: grossWeight || 0,
        alibabaId,
        supplier: supplier || '',
        price: price || 0,
        isProcessed: false
      }
    });

    if (images.length > 0) {
      await Promise.all(
        images.map((imageId: number, index: number) =>
          prisma.collectionItemImage.create({
            data: {
              collectionItemId: item.id,
              imageId: imageId,
              order: index
            }
          })
        )
      );
    }

    const resultItem = await prisma.collectionItem.findFirst({
      where: { id: item.id },
      include: {
        images: {
          include: {
            image: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    const transformedResult = {
      ...resultItem!,
      images: resultItem!.images.map(img => img.image),
      image: resultItem!.images.length > 0 ? resultItem!.images[0].image : null
    };

    logger.info('创建采集库商品成功:', item.id);
    res.status(201).json({
      success: true,
      message: '创建采集库商品成功',
      data: transformedResult
    });
  } catch (error: any) {
    logger.error('创建采集库商品失败:', error);
    logger.error('错误堆栈:', error.stack);
    logger.error('请求参数:', req.body);
    res.status(500).json({
      success: false,
      message: error.message || '服务器错误'
    });
  }
};

export const updateCollectionItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const {
      name,
      description,
      images = [],
      category,
      brand,
      modelName,
      packageLength,
      packageWidth,
      packageHeight,
      grossWeight,
      alibabaId,
      supplier,
      price,
      isProcessed
    } = req.body;

    const existingItem = await prisma.collectionItem.findFirst({
      where: {
        alibabaId,
        id: { not: parseInt(id) }
      }
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_ALIBABA_ID',
        message: '该货号已存在，请使用其他货号'
      });
    }

    const item = await prisma.collectionItem.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name,
        description: description || '',
        category: category || '',
        brand: brand || '无品牌',
        modelName: modelName || '',
        packageLength: packageLength || 0,
        packageWidth: packageWidth || 0,
        packageHeight: packageHeight || 0,
        grossWeight: grossWeight || 0,
        alibabaId,
        supplier: supplier || '',
        price: price || 0,
        isProcessed: isProcessed || false
      }
    });

    await prisma.collectionItemImage.deleteMany({
      where: { collectionItemId: item.id }
    });

    if (images.length > 0) {
      await Promise.all(
        images.map((imageId: number, index: number) =>
          prisma.collectionItemImage.create({
            data: {
              collectionItemId: item.id,
              imageId: imageId,
              order: index
            }
          })
        )
      );
    }

    const resultItem = await prisma.collectionItem.findFirst({
      where: { id: item.id },
      include: {
        images: {
          include: {
            image: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    const transformedResult = {
      ...resultItem!,
      images: resultItem!.images.map(img => img.image),
      image: resultItem!.images.length > 0 ? resultItem!.images[0].image : null
    };

    res.json({
      success: true,
      message: '更新采集库商品成功',
      data: transformedResult
    });
  } catch (error: any) {
    logger.error('更新采集库商品失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

export const deleteCollectionItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const item = await prisma.collectionItem.findFirst({
      where: {
        id: parseInt(id),
      }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: '采集库商品不存在'
      });
    }

    await prisma.collectionItemImage.deleteMany({
      where: { collectionItemId: item.id }
    });

    await prisma.collectionItem.delete({
      where: {
        id: parseInt(id),
      }
    });

    res.json({
      success: true,
      message: '删除采集库商品成功'
    });
  } catch (error: any) {
    logger.error('删除采集库商品失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

export const moveToProductLibrary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const item = await prisma.collectionItem.findFirst({
      where: {
        id: parseInt(id),
      },
      include: {
        images: {
          include: {
            image: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: '采集库商品不存在'
      });
    }

    // 更新采集库商品状态
    const updatedCollectionItem = await prisma.collectionItem.update({
      where: {
        id: parseInt(id),
      },
      data: { isProcessed: true },
      include: {
        images: {
          include: {
            image: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    const productItem = await prisma.productItem.create({
      data: {
        userId,
        name: item.name,
        description: item.description,
        category: item.category,
        brand: item.brand,
        modelName: item.modelName,
        packageLength: item.packageLength,
        packageWidth: item.packageWidth,
        packageHeight: item.packageHeight,
        grossWeight: item.grossWeight,
        alibabaId: item.alibabaId,
        supplier: item.supplier || '',
        price: item.price,
        status: 'pending'
      }
    });

    if (item.images.length > 0) {
      await Promise.all(
        item.images.map((img, index) =>
          prisma.productItemImage.create({
            data: {
              productItemId: productItem.id,
              imageId: img.imageId,
              order: index
            }
          })
        )
      );
    }

    // 转换数据格式
    const transformedResult = {
      ...updatedCollectionItem,
      images: updatedCollectionItem.images.map(img => img.image),
      image: updatedCollectionItem.images.length > 0 ? updatedCollectionItem.images[0].image : null
    };

    res.json({
      success: true,
      message: '商品已成功入库到选品库',
      data: transformedResult
    });
  } catch (error: any) {
    logger.error('商品入库失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};
