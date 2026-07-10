import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../config/logger';
import { normalizePersistedCategory } from '../utils/productCategory';

const prisma = new PrismaClient();

export const createProductSelection = async (req: Request, res: Response) => {
  try {
    logger.info('收到创建选品请求:', req.body);
    
    const {
      name,
      ozonId,
      category,
      categoryLeaf,
      descriptionCategoryId,
      typeId,
      brand,
      price,
      originalPrice,
      discount,
      rating,
      sales,
      stock,
      reviews,
      imageUrl,
      productUrl
    } = req.body;
    
    if (!name || !ozonId) {
      logger.warn('参数验证失败:', req.body);
      return res.status(400).json({
        success: false,
        message: '缺少必填字段（name或ozonId）'
      });
    }

    const userId = (req as any).user.id;

    const existingProduct = await prisma.productSelection.findFirst({
      where: { ozonId },
      orderBy: { id: 'asc' },
    });

    if (existingProduct) {
      const persistedCategory = normalizePersistedCategory({
        category: category !== undefined ? category : existingProduct.category,
        categoryLeaf: categoryLeaf !== undefined ? categoryLeaf : existingProduct.categoryLeaf,
      });
      // 验证类目是否存在 ozon_categories 表
      let categoryVerified = existingProduct.categoryVerified;
      if (persistedCategory.category && !categoryVerified) {
        const normalizedCategory = persistedCategory.category.trim().toLowerCase();
        const foundCategory = await prisma.ozonCategory.findFirst({
          where: {
            OR: [
              { name: { equals: persistedCategory.category } },
              { name: { equals: normalizedCategory } },
              { path: { contains: persistedCategory.category } }
            ]
          }
        });
        categoryVerified = !!foundCategory;
      }

      logger.info('商品已存在，更新记录:', ozonId);
      const updatedProduct = await prisma.productSelection.update({
        where: { id: existingProduct.id },
        data: {
          name,
          category: persistedCategory.category,
          categoryLeaf: persistedCategory.categoryLeaf,
          descriptionCategoryId: descriptionCategoryId !== undefined ? descriptionCategoryId : existingProduct.descriptionCategoryId,
          typeId: typeId !== undefined ? typeId : existingProduct.typeId,
          brand: brand || '',
          price: price || 0,
          originalPrice: originalPrice || 0,
          discount: discount || 0,
          rating: rating || 0,
          sales: sales || 0,
          stock: stock || 0,
          reviews: reviews || 0,
          imageUrl,
          productUrl,
          categoryVerified
        }
      });

      return res.json({
        success: true,
        data: updatedProduct,
        message: categoryVerified ? '商品已更新' : '商品已更新（类目未匹配到数据库）'
      });
    }

    const persistedCategory = normalizePersistedCategory({ category, categoryLeaf });
    // 验证类目是否存在 ozon_categories 表
    let categoryVerified = false;
    if (persistedCategory.category) {
      const normalizedCategory = persistedCategory.category.trim().toLowerCase();
      const foundCategory = await prisma.ozonCategory.findFirst({
        where: {
          OR: [
            { name: { equals: persistedCategory.category } },
            { name: { equals: normalizedCategory } },
            { path: { contains: persistedCategory.category } }
          ]
        }
      });
      categoryVerified = !!foundCategory;
      logger.info(`类目验证: "${persistedCategory.category}" => ${categoryVerified ? '通过' : '未通过'}`);
    }

    const newProduct = await prisma.productSelection.create({
      data: {
        userId,
        name,
        ozonId,
        category: persistedCategory.category,
        categoryLeaf: persistedCategory.categoryLeaf,
        descriptionCategoryId: descriptionCategoryId ?? null,
        typeId: typeId ?? null,
        brand: brand || '',
        price: price || 0,
        originalPrice: originalPrice || 0,
        discount: discount || 0,
        rating: rating || 0,
        sales: sales || 0,
        stock: stock || 0,
        reviews: reviews || 0,
        imageUrl,
        productUrl,
        categoryVerified
      }
    });

    logger.info('选品创建成功:', newProduct.id);
    res.json({
      success: true,
      data: newProduct,
      message: categoryVerified ? '商品保存成功' : '商品保存成功（类目未匹配到数据库）'
    });
  } catch (error: any) {
    logger.error('创建选品失败:', error);
    res.status(500).json({
      success: false,
      message: `创建失败: ${error.message}`
    });
  }
};

export const getProductSelections = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20, keyword = '', category = '' } = req.query;

    logger.info(`查询选品列表, 用户ID: ${userId}, 页码: ${page}, 每页: ${limit}`);

    const where: any = {};

    if (keyword) {
      where.name = { contains: keyword as string };
    }

    if (category && category !== 'all') {
      where.category = category as string;
    }

    const [items, total] = await Promise.all([
      prisma.productSelection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.productSelection.count({ where })
    ]);

    res.json({
      success: true,
      data: items,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error: any) {
    logger.error('查询选品列表失败:', error);
    res.status(500).json({
      success: false,
      message: `查询失败: ${error.message}`
    });
  }
};

export const getProductSelectionById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    logger.info(`查询选品详情, 用户ID: ${userId}, 选品ID: ${id}`);

    const product = await prisma.productSelection.findFirst({
      where: { id: Number(id) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error: any) {
    logger.error('查询选品详情失败:', error);
    res.status(500).json({
      success: false,
      message: `查询失败: ${error.message}`
    });
  }
};

export const updateProductSelection = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const {
      name,
      category,
      categoryLeaf,
      descriptionCategoryId,
      typeId,
      brand,
      price,
      originalPrice,
      discount,
      rating,
      sales,
      stock,
      reviews,
      imageUrl,
      productUrl,
      status,
      categoryVerified
    } = req.body;

    logger.info(`更新选品, 用户ID: ${userId}, 选品ID: ${id}`);

    const existingProduct = await prisma.productSelection.findFirst({
      where: { id: Number(id) }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    const persistedCategory = normalizePersistedCategory({
      category: category !== undefined ? category : existingProduct.category,
      categoryLeaf: categoryLeaf !== undefined ? categoryLeaf : existingProduct.categoryLeaf,
    });

    const updatedProduct = await prisma.productSelection.update({
      where: { id: Number(id) },
      data: {
        name: name || existingProduct.name,
        category: persistedCategory.category,
        categoryLeaf: persistedCategory.categoryLeaf,
        descriptionCategoryId: descriptionCategoryId !== undefined ? descriptionCategoryId : existingProduct.descriptionCategoryId,
        typeId: typeId !== undefined ? typeId : existingProduct.typeId,
        brand: brand || existingProduct.brand,
        price: price !== undefined ? price : existingProduct.price,
        originalPrice: originalPrice !== undefined ? originalPrice : existingProduct.originalPrice,
        discount: discount !== undefined ? discount : existingProduct.discount,
        rating: rating !== undefined ? rating : existingProduct.rating,
        sales: sales !== undefined ? sales : existingProduct.sales,
        stock: stock !== undefined ? stock : existingProduct.stock,
        reviews: reviews !== undefined ? reviews : existingProduct.reviews,
        imageUrl: imageUrl || existingProduct.imageUrl,
        productUrl: productUrl || existingProduct.productUrl,
        status: status || existingProduct.status,
        categoryVerified: categoryVerified !== undefined ? categoryVerified : existingProduct.categoryVerified
      }
    });

    logger.info('选品更新成功:', updatedProduct.id);
    res.json({
      success: true,
      data: updatedProduct,
      message: '更新成功'
    });
  } catch (error: any) {
    logger.error('更新选品失败:', error);
    res.status(500).json({
      success: false,
      message: `更新失败: ${error.message}`
    });
  }
};

export const deleteProductSelection = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    logger.info(`删除选品, 用户ID: ${userId}, 选品ID: ${id}`);

    const existingProduct = await prisma.productSelection.findFirst({
      where: { id: Number(id) }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    await prisma.productSelection.delete({
      where: { id: Number(id) }
    });

    logger.info('选品删除成功:', id);
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    logger.error('删除选品失败:', error);
    res.status(500).json({
      success: false,
      message: `删除失败: ${error.message}`
    });
  }
};
