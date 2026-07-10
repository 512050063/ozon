import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { cleanupDeletedAvatars } from '../services/avatarService';
import { getUserAvatarState, updateUserAvatarState } from '../services/avatarPersistenceService';
import fs from 'fs';
import path from 'path';
import {
  assertImageBizType,
  buildImageUsageSummary,
} from '../services/imageAssetService';
import { getImageUploadDir } from '../services/publicAssetUrlService';

const UPLOAD_DIR = getImageUploadDir();

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  logger.info(`图片上传目录已创建: ${UPLOAD_DIR}`);
}

const cleanupUserAvatarReferences = async (userId: number, fileUrls: string[]) => {
  if (fileUrls.length === 0) {
    return;
  }

  const user = await getUserAvatarState(prisma, userId);

  if (!user) {
    return;
  }

  const cleaned = cleanupDeletedAvatars(user.avatar, user.avatarHistory, fileUrls);
  const originalHistory = Array.isArray(user.avatarHistory) ? user.avatarHistory : [];

  if (cleaned.avatar === user.avatar && JSON.stringify(cleaned.avatarHistory) === JSON.stringify(originalHistory)) {
    return;
  }

  await updateUserAvatarState(prisma, userId, cleaned);
};

// 获取图片列表
export const getImages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, pageSize = 20, bizType, usedStatus } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const requestedBizType = bizType ? assertImageBizType(bizType) : undefined;

    const imageWhere = {
      provider: 'local' as const,
      ...(requestedBizType ? { bizType: requestedBizType } : {}),
      ...(usedStatus === 'used'
        ? { references: { some: {} } }
        : usedStatus === 'unused'
          ? { references: { none: {} } }
          : {})
    };

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where: imageWhere,
        orderBy: { id: 'desc' },
        skip,
        take,
        include: {
          references: {
            select: {
              refType: true,
              refId: true,
              refKey: true
            }
          }
        }
      }),
      prisma.image.count({ where: imageWhere })
    ]);

    const imagesWithUsage = images.map(image => ({
      ...image,
      ...buildImageUsageSummary(image.references)
    }));

    return res.json({
      success: true,
      message: '获取图片列表成功',
      data: {
        images: imagesWithUsage,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.startsWith('Invalid image biz type:')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    logger.error('获取图片列表失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误: ' + (error.response?.data?.message || error.message)
    });
  }
};

// 获取图片统计信息
export const getImageStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { bizType } = req.query;
    const imageWhere = {
      provider: 'local' as const,
      ...(bizType ? { bizType: assertImageBizType(bizType) } : {})
    };

    const [total, totalSize] = await Promise.all([
      prisma.image.count({ where: imageWhere }),
      prisma.image.aggregate({
        where: imageWhere,
        _sum: { fileSize: true }
      })
    ]);

    const totalStorage = 500 * 1024 * 1024; // 500MB 限制
    const usedStorage = totalSize._sum.fileSize || 0;
    const availableStorage = totalStorage - usedStorage;

    return res.json({
      success: true,
      message: '获取统计信息成功',
      data: {
        total,
        todayCount: 0,
        totalSize: usedStorage,
        totalStorage,
        usedStorage,
        availableStorage
      }
    });
  } catch (error: any) {
    logger.error('获取统计信息失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误: ' + (error.response?.data?.message || error.message)
    });
  }
};

// 上传图片
export const uploadImage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const file = (req as any).file;
    const { source = 'local' } = req.query; // 默认使用本地上传
    const bizType = assertImageBizType(req.body?.bizType ?? req.query?.bizType);

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    if (source === 'imagehost') {
      return res.status(410).json({
        success: false,
        message: '第三方图床已移除，请使用系统内置图片库'
      });
    }

    // 本地上传
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const fileName = `${timestamp}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    fs.writeFileSync(filePath, file.buffer);

    logger.info(`图片上传成功: ${fileName} (${file.size} bytes)`);

    // 处理中文文件名乱码问题
    let originalFilename = file.originalname;
    try {
      if (originalFilename && !/^[\x00-\x7F]*$/.test(originalFilename)) {
        originalFilename = Buffer.from(originalFilename, 'latin1').toString('utf8');
      }
    } catch (e) {
      logger.warn('文件名编码处理失败，使用原始文件名', e);
    }

    const savedImage = await prisma.image.create({
      data: {
        userId,
        bizType,
        provider: 'local',
        fileName: originalFilename,
        fileUrl: `/uploads/images/${fileName}`,
        fileSize: file.size,
        fileType: file.mimetype
      }
    });

    return res.json({
      success: true,
      message: '上传成功',
      data: savedImage
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.startsWith('Invalid image biz type:')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    logger.error('上传图片失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误: ' + (error.response?.data?.message || error.message)
    });
  }
};

// 删除图片
export const deleteImage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { source = 'local' } = req.query;
    const imageId = Number(id);

    if (source === 'imagehost') {
      return res.status(410).json({
        success: false,
        message: '第三方图床已移除，请使用系统内置图片库'
      });
    }

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        provider: 'local'
      }
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    const usedReference = await prisma.imageReference.findFirst({
      where: {
        imageId,
      }
    });

    if (usedReference) {
      return res.status(400).json({
        success: false,
        message: '图片正在使用，禁止删除'
      });
    }

    // 删除本地图片
    const fileName = image.fileUrl.split('/').pop();
    const isManagedLocalPath = image.fileUrl.startsWith('/uploads/images/') || image.fileUrl.startsWith('/images/');
    if (image.provider === 'local' && fileName && isManagedLocalPath) {
      const filePath = path.join(UPLOAD_DIR, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await cleanupUserAvatarReferences(userId, [image.fileUrl]);

    await prisma.imageReference.deleteMany({
      where: {
        imageId,
      }
    });

    await prisma.image.delete({
      where: { id: imageId }
    });

    return res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    logger.error('删除图片失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + (error.response?.data?.message || error.message)
    });
  }
};

// 批量删除图片
export const batchDeleteImages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { ids } = req.body;
    const { source = 'local' } = req.query;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要删除的图片'
      });
    }

    const normalizedIds = ids.map((id: number | string) => Number(id));

    if (source === 'imagehost') {
      return res.status(410).json({
        success: false,
        message: '第三方图床已移除，请使用系统内置图片库'
      });
    }

    const images = await prisma.image.findMany({
      where: {
        id: { in: normalizedIds },
        provider: 'local'
      }
    });

    const usedImages = await prisma.imageReference.findMany({
      where: {
        imageId: { in: images.map(image => image.id) }
      },
      select: {
        imageId: true
      }
    });

    if (usedImages.length > 0) {
      return res.status(400).json({
        success: false,
        message: '存在正在使用的图片，禁止批量删除'
      });
    }

    for (const image of images) {
      const fileName = image.fileUrl.split('/').pop();
      const isManagedLocalPath = image.fileUrl.startsWith('/uploads/images/') || image.fileUrl.startsWith('/images/');
      if (fileName && isManagedLocalPath) {
        const filePath = path.join(UPLOAD_DIR, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await cleanupUserAvatarReferences(userId, images.map(image => image.fileUrl));

    await prisma.imageReference.deleteMany({
      where: {
        imageId: { in: images.map(image => image.id) }
      }
    });

    await prisma.image.deleteMany({
      where: {
        id: { in: images.map(image => image.id) },
        provider: 'local'
      }
    });

    res.json({
      success: true,
      message: '批量删除成功'
    });
  } catch (error: any) {
    logger.error('批量删除图片失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + (error.response?.data?.message || error.message)
    });
  }
};

// 检查图片是否被使用
export const checkImageUsage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const imageReference = await prisma.imageReference.findFirst({
      where: {
        imageId: parseInt(id, 10),
      }
    });

    res.json({
      success: true,
      message: '检查成功',
      data: {
        isUsed: Boolean(imageReference)
      }
    });
  } catch (error: any) {
    logger.error('检查图片使用情况失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + (error.response?.data?.message || error.message)
    });
  }
};

// 批量检查图片是否被使用
export const checkBatchImageUsage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供图片ID数组'
      });
    }

    const references = await prisma.imageReference.findMany({
      where: {
        imageId: {
          in: ids.map((imageId: number) => Number(imageId))
        }
      },
      select: {
        imageId: true
      }
    });
    const usedImageIds = new Set(references.map(reference => reference.imageId));
    const usageResults = ids.map((imageId: number) => ({
      imageId,
      isUsed: usedImageIds.has(Number(imageId))
    }));

    res.json({
      success: true,
      message: '批量检查成功',
      data: usageResults
    });
  } catch (error: any) {
    logger.error('批量检查图片使用情况失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + (error.response?.data?.message || error.message)
    });
  }
};
