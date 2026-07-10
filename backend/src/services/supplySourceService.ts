import prisma from '../config/database';
import {
  extractProductSupplySourceOfferId,
  resolveProductSupplySourceFromUrl,
  type ProductSupplySourcePreview,
} from './productSupplySourceResolver';
import { normalizePersistedCategory } from '../utils/productCategory';

export interface SupplySourceListOptions {
  page?: any;
  limit?: any;
  keyword?: any;
}

export function buildSupplySourceData(userId: number, source: any, fallbackName = '') {
  const persistedCategory = normalizePersistedCategory({
    category: source.category || '',
    categoryLeaf: source.categoryLeaf || '',
  });
  return {
    userId,
    alibabaOfferId: (source.alibabaOfferId || '').toString().trim(),
    subject: source.subject || fallbackName,
    category: persistedCategory.category,
    categoryLeaf: persistedCategory.categoryLeaf,
    brand: source.brand || '无品牌',
    descriptionCategoryId: source.descriptionCategoryId || null,
    typeId: source.typeId || null,
    price: source.price !== undefined ? parseFloat(source.price.toString()) : 0,
    consignPrice: source.consignPrice !== undefined ? parseFloat(source.consignPrice.toString()) : 0,
    image: source.image || '',
    images: source.images || null,
    detailUrl: source.detailUrl || '',
    supplierName: source.supplierName || '',
    city: source.city || '',
    province: source.province || '',
    qualityScore: source.qualityScore !== undefined ? parseFloat(source.qualityScore.toString()) : 0,
    qualityDetail: source.qualityDetail || null,
    yxScoreLevel: source.yxScoreLevel || '',
    tradeServices: source.tradeServices || null,
    moq: source.moq !== undefined ? parseInt(source.moq.toString(), 10) || 1 : 1,
  };
}

export async function findReusableSupplySource(client: any, userId: number, alibabaOfferId: string) {
  return client.supplySource.findFirst({
    where: { alibabaOfferId },
    orderBy: { id: 'asc' },
  });
}

export async function upsertSupplySource(userId: number, source: any, fallbackName = '', client: any = prisma) {
  const sourceData = buildSupplySourceData(userId, source, fallbackName);
  if (!sourceData.alibabaOfferId) {
    throw new Error('缺少1688货源ID');
  }

  const existingSource = await findReusableSupplySource(client, userId, sourceData.alibabaOfferId);
  if (existingSource) {
    return client.supplySource.update({
      where: { id: existingSource.id },
      data: sourceData,
    });
  }

  return client.supplySource.create({ data: sourceData });
}

export async function listSupplySources(userId: number, options: SupplySourceListOptions = {}) {
  const pageNumber = Math.max(1, Number(options.page) || 1);
  const limitNumber = Math.min(50, Math.max(1, Number(options.limit) || 20));
  const where: any = {};

  if (options.keyword) {
    const text = String(options.keyword);
    where.OR = [
      { alibabaOfferId: { contains: text } },
      { subject: { contains: text } },
      { supplierName: { contains: text } },
    ];
  }

  const [sources, groupedSources] = await Promise.all([
    prisma.supplySource.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      distinct: ['alibabaOfferId'],
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
      include: {
        _count: { select: { productSupplies: true } },
      },
    }),
    prisma.supplySource.groupBy({
      by: ['alibabaOfferId'],
      where,
    }),
  ]);

  return {
    data: sources.map((source: any) => {
      const boundProductCount = source._count?.productSupplies || 0;
      const { _count, ...sourceData } = source;
      return {
        ...sourceData,
        boundProductCount,
        hasBoundProducts: boundProductCount > 0,
      };
    }),
    total: groupedSources.length,
    page: pageNumber,
    limit: limitNumber,
  };
}

export function assertValidSupplySourceInput(inputUrl: string) {
  const offerId = extractProductSupplySourceOfferId(inputUrl);
  if (!offerId) {
    throw new Error('请输入有效的1688商品链接或商品ID');
  }
  return offerId;
}

export async function previewSupplySourceFromUrl(userId: number, inputUrl: string): Promise<ProductSupplySourcePreview> {
  assertValidSupplySourceInput(inputUrl);
  return resolveProductSupplySourceFromUrl(userId, inputUrl);
}

export async function importSupplySourceFromUrl(userId: number, inputUrl: string, patch: any = {}) {
  const source = await previewSupplySourceFromUrl(userId, inputUrl);
  return upsertSupplySource(userId, { ...source, ...patch }, source.subject);
}

export async function updateSupplySource(userId: number, sourceId: number, source: any) {
  const existingSource = await prisma.supplySource.findFirst({
    where: { id: sourceId },
  });
  if (!existingSource) {
    throw new Error('货源不存在');
  }

  const patch = source || {};
  const mergedSource = {
    ...existingSource,
    ...patch,
    alibabaOfferId: patch.alibabaOfferId || existingSource.alibabaOfferId,
  };

  const sourceData = buildSupplySourceData(userId, mergedSource, existingSource.subject);
  return prisma.supplySource.update({
    where: { id: sourceId },
    data: sourceData,
  });
}

export async function deleteSupplySource(userId: number, sourceId: number) {
  const existingSource = await prisma.supplySource.findFirst({
    where: { id: sourceId },
    include: {
      _count: { select: { productSupplies: true } },
    },
  });
  if (!existingSource) {
    throw new Error('货源不存在');
  }

  if (existingSource._count.productSupplies > 0) {
    throw new Error('货源已绑定商品，不能删除');
  }

  await prisma.supplySource.delete({
    where: { id: sourceId },
  });
}
