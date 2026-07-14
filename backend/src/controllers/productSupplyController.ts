import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import {
  submitProductImport,
  checkImportTask,
  replaceProductImageUsageReferences,
  getOzonProductLimits,
  assertOzonProductOperationLimit,
} from '../services/ozonProductService';
import { replaceProductSupplyImageReferences } from '../services/imageAssetService';
import {
  expandProductSupplySkus,
  getProductSupplyTemplate,
  toClientProductTemplate,
  type ExpandedProductSupplySku,
} from '../services/productSupplyTemplateService';
import {
  assessProductSupplyListing,
  buildProductSupplyListingPreview,
} from '../services/productSupplyListingService';
import {
  extractProductSupplySourceOfferId,
} from '../services/productSupplySourceResolver';
import {
  normalizeListingCategoryFields,
} from '../services/ozonCategorySelectionService';
import {
  listSupplySources,
  previewSupplySourceFromUrl,
  upsertSupplySource,
} from '../services/supplySourceService';
import {
  fillProductIdentifiers,
} from '../utils/productIdentifier';

const PRODUCT_SUPPLY_LISTING_ERROR_MAX_LENGTH = 191;

function normalizeProductSupplyListingError(error: any): string | null {
  if (error === null || error === undefined || error === '') return null;
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    return error.map(normalizeProductSupplyListingError).filter(Boolean).join('; ') || null;
  }
  if (typeof error === 'object') {
    const directMessage = error.message || error.error || error.reason || error.description || error.detail;
    if (directMessage) return normalizeProductSupplyListingError(directMessage);
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function truncateProductSupplyListingError(message: any): string | null {
  message = normalizeProductSupplyListingError(message);
  if (!message) return null;
  return message.length > PRODUCT_SUPPLY_LISTING_ERROR_MAX_LENGTH
    ? message.slice(0, PRODUCT_SUPPLY_LISTING_ERROR_MAX_LENGTH)
    : message;
}

function firstProductSupplyListingError(...messages: any[]): string | null {
  for (const message of messages) {
    const normalized = truncateProductSupplyListingError(message);
    if (normalized) return normalized;
  }
  return null;
}

function normalizeImportTaskStatus(status: any): string {
  return String(status || '').trim().toLowerCase();
}

function normalizeImportTaskErrorLevel(level: any): string {
  return String(level || '').trim().toLowerCase();
}

function getImportTaskErrorMessage(error: any): string | null {
  return firstProductSupplyListingError(
    error?.message,
    error?.description,
    error?.error,
    error?.texts?.message,
    error?.texts?.description,
    error,
  );
}

export function resolveProductSupplyListingTaskUpdate(taskResult: any, currentStatus: string) {
  const taskStatus = normalizeImportTaskStatus(taskResult?.status);
  const taskItems = Array.isArray(taskResult?.items) ? taskResult.items : [];
  const importedStatuses = new Set(['imported']);
  const failedImportStatuses = new Set(['failed', 'not_imported', 'skipped']);

  const errorItem = taskItems.find((item: any) => {
    const errors = Array.isArray(item?.errors) ? item.errors : [];
    return errors.some((error: any) => {
      const level = normalizeImportTaskErrorLevel(error?.level ?? error?.texts?.level);
      return level === 'error' || level === 'error_level_error';
    });
  });
  if (errorItem) {
    const firstError = (Array.isArray(errorItem.errors) ? errorItem.errors : []).find((error: any) => {
      const level = normalizeImportTaskErrorLevel(error?.level ?? error?.texts?.level);
      return level === 'error' || level === 'error_level_error';
    });
    return {
      status: 'failed',
      listingError: firstProductSupplyListingError(
        getImportTaskErrorMessage(firstError),
        errorItem?.errorMessage,
        errorItem?.errors,
        taskResult?.message,
        '导入失败',
      ),
      listedAt: undefined,
    };
  }

  const importedItem = taskItems.find((item: any) => importedStatuses.has(normalizeImportTaskStatus(item?.status)));
  if (importedStatuses.has(taskStatus) || importedItem) {
    return {
      status: 'listed',
      listingError: null,
      listedAt: new Date(),
    };
  }

  const failedItem = taskItems.find((item: any) => failedImportStatuses.has(normalizeImportTaskStatus(item?.status)));
  if (failedImportStatuses.has(taskStatus) || failedItem) {
    const statusText = normalizeImportTaskStatus(failedItem?.status || taskStatus);
    const fallbackMessage = statusText === 'skipped'
      ? 'Ozon 跳过了该商品导入任务，商品未创建'
      : '导入失败';
    return {
      status: 'failed',
      listingError: firstProductSupplyListingError(
        failedItem?.errorMessage,
        failedItem?.errors,
        taskResult?.message,
        fallbackMessage,
      ),
      listedAt: undefined,
    };
  }

  return {
    status: currentStatus,
    listingError: null,
    listedAt: undefined,
  };
}

async function syncPendingProductSupplyListingTasks(userId: number) {
  const listingItems = await prisma.productSupply.findMany({
    where: {
      OR: [
        { status: 'listing' },
        { status: 'failed', listingError: null },
      ],
      ozonTaskId: { not: null },
    },
    orderBy: { listingSubmittedAt: 'asc' },
    take: 5,
    select: {
      id: true,
      status: true,
      ozonTaskId: true,
      listingError: true,
      lastListingStoreId: true,
    },
  });

  if (listingItems.length === 0) return;

  const storeIds = Array.from(new Set(
    listingItems
      .map(item => item.lastListingStoreId)
      .filter((id): id is number => Boolean(id)),
  ));

  const stores = await (prisma as any).ozonStore.findMany({
    where: {
      status: 'active',
      ...(storeIds.length > 0 ? { OR: [{ id: { in: storeIds } }, { id: { notIn: storeIds } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  const storeById = new Map(stores.map((store: any) => [store.id, store]));
  const fallbackStore = stores[0];

  for (const item of listingItems) {
    const store = item.lastListingStoreId ? storeById.get(item.lastListingStoreId) : fallbackStore;
    if (!store || !item.ozonTaskId) continue;

    try {
      const taskResult = await checkImportTask(store, item.ozonTaskId);
      if (!taskResult.success) continue;

      const update = resolveProductSupplyListingTaskUpdate(taskResult, item.status);
      const shouldUpdateError = !item.listingError && Boolean(update.listingError);
      if (update.status === item.status && !shouldUpdateError) continue;

      await prisma.productSupply.update({
        where: { id: item.id },
        data: {
          status: update.status,
          listingError: update.listingError,
          ...(update.listedAt ? { listedAt: update.listedAt } : {}),
        },
      });
      logger.info(`商品库列表补偿同步上架状态: productId=${item.id}, taskStatus=${taskResult.status}, localStatus=${update.status}`);
    } catch (error) {
      logger.warn(`商品库列表补偿同步失败: productId=${item.id}`, error);
    }
  }
}

function asJson(value: any): any {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function serializeProductSupply(item: any): any {
  if (!item) return item;
  const normalizedItem = normalizeListingCategoryFields(item);
  const listingAssessment = assessProductSupplyListing(normalizedItem);
  return {
    ...normalizedItem,
    ozonCategoryId: normalizedItem.ozonCategoryId !== null && normalizedItem.ozonCategoryId !== undefined
      ? normalizedItem.ozonCategoryId.toString()
      : null,
    listingReady: listingAssessment.ready,
    listingMissingFields: listingAssessment.missingFields,
    listingValidationMessage: listingAssessment.message,
  };
}

function parseOptionalInt(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalNumber(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableFloat(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeImageArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  const images: string[] = [];
  for (const item of value) {
    const url = typeof item === 'string'
      ? item.trim()
      : String(item?.url || item?.fileUrl || item?.imageUrl || '').trim();
    if (url && !images.includes(url)) {
      images.push(url);
    }
  }
  return images;
}

function resolveProductSupplyImages(bodyImages: any, source: any, imageUrl: any): string[] | null {
  const images = [
    ...normalizeImageArray(bodyImages),
    ...normalizeImageArray(source?.images),
  ];
  const mainImage = typeof imageUrl === 'string'
    ? imageUrl.trim()
    : String(source?.image || '').trim();
  if (mainImage && !images.includes(mainImage)) {
    images.unshift(mainImage);
  }
  return images.length > 0 ? images.slice(0, 8) : null;
}

async function listExistingProductSupplyIdentifiers(userId: number): Promise<{ offerIds: string[]; skus: string[] }> {
  const rows = await prisma.productSupply.findMany({
    select: { offerId: true, sku: true, alibabaId: true },
  });
  const offerIds = rows
    .map(row => row.offerId || (String(row.alibabaId || '').startsWith('OZ-') ? row.alibabaId : ''))
    .filter(Boolean) as string[];
  const skus = rows
    .map(row => row.sku || (!String(row.alibabaId || '').startsWith('OZ-') ? row.alibabaId : ''))
    .filter(Boolean) as string[];
  return { offerIds, skus };
}

async function loadListingContext(userId: number) {
  const storeModel = (prisma as any).ozonStore;
  const [stores, pricingStrategies] = await Promise.all([
    storeModel.findMany({
      where: {
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.pricingStrategy.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    }),
  ]);

  return {
    stores: stores.map((store: any) => ({
      id: store.id,
      name: store.name,
      status: store.status,
    })),
    pricingStrategies,
  };
}

async function buildListingPreviewForItem(
  userId: number,
  item: any,
  options?: {
    storeId?: any;
    pricingStrategyId?: any;
    finalPrice?: any;
  },
) {
  const selectedStoreId = parseOptionalInt(options?.storeId);
  const selectedPricingStrategyId = parseOptionalInt(options?.pricingStrategyId);
  const finalPrice = parseOptionalNumber(options?.finalPrice);
  const { stores, pricingStrategies } = await loadListingContext(userId);

  if (selectedStoreId && !stores.some((store: { id: number }) => store.id === selectedStoreId)) {
    throw new Error('所选 Ozon 店铺不存在或不可用');
  }
  if (selectedPricingStrategyId && !pricingStrategies.some(strategy => strategy.id === selectedPricingStrategyId)) {
    throw new Error('所选定价策略不存在');
  }

  const normalizedItem = normalizeListingCategoryFields(item);
  const preview = buildProductSupplyListingPreview({
    product: normalizedItem,
    stores,
    pricingStrategies,
    selectedStoreId,
    selectedPricingStrategyId,
    finalPrice,
  });

  return {
    selectedStoreId,
    selectedPricingStrategyId,
    finalPrice,
    stores,
    pricingStrategies,
    product: normalizedItem,
    preview: {
      ...preview,
      product: serializeProductSupply(normalizedItem),
    },
  };
}

function buildProductSupplyCreateData(userId: number, sku: ExpandedProductSupplySku, extra?: { supplier?: string; supplySourceId?: number | null }) {
  const normalizedSku = normalizeListingCategoryFields(sku as any);
  return {
    userId,
    name: sku.name,
    category: normalizedSku.category || '',
    categoryLeaf: normalizedSku.categoryLeaf || '',
    brand: normalizedSku.brand || '无品牌',
    modelName: sku.modelName || '',
    offerId: sku.offerId,
    sku: sku.sku,
    alibabaId: sku.alibabaId,
    supplier: extra?.supplier || '',
    price: Number(sku.price || 0),
    status: 'pending',
    imageUrl: sku.imageUrl || '',
    ozonCategoryId: sku.descriptionCategoryId ? BigInt(sku.descriptionCategoryId) : null,
    description: sku.description || '',
    barcode: sku.barcode,
    oldPrice: sku.oldPrice,
    packageLength: parseNullableFloat(sku.packageLength),
    packageWidth: parseNullableFloat(sku.packageWidth),
    packageHeight: parseNullableFloat(sku.packageHeight),
    grossWeight: parseNullableFloat(sku.grossWeight),
    descriptionCategoryId: normalizedSku.descriptionCategoryId,
    typeId: normalizedSku.typeId,
    images: asJson(sku.images || null),
    attributes: asJson(sku.attributes || null),
    variantAttributes: asJson(sku.variantAttributes || null),
    hiddenAttributes: asJson(sku.hiddenAttributes || null),
    templateSnapshot: asJson(sku.templateSnapshot || null),
    variantSummary: sku.variantSummary || null,
    supplySourceId: extra?.supplySourceId || null,
  };
}

export const getProductSupplyTemplateController = async (req: Request, res: Response) => {
  try {
    const { descriptionCategoryId, typeId, language = 'ZH_HANS', forceRefresh, cacheOnly } = req.query;

    if (!descriptionCategoryId || isNaN(Number(descriptionCategoryId))) {
      return res.status(400).json({
        success: false,
        message: '缺少有效的 descriptionCategoryId',
      });
    }

    const template = await getProductSupplyTemplate({
      descriptionCategoryId: Number(descriptionCategoryId),
      typeId: typeId ? Number(typeId) : null,
      language: String(language),
      forceRefresh: forceRefresh === 'true',
      cacheOnly: cacheOnly === 'true',
    });

    res.json({
      success: true,
      data: template ? toClientProductTemplate(template) : null,
    });
  } catch (error: any) {
    logger.error('获取商品模板失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取商品模板失败',
    });
  }
};

export const createProductSupplyItem = async (req: Request, res: Response) => {
  try {
    logger.info('收到创建商品库商品请求:', req.body);

    const { name, category, categoryLeaf, brand, price, imageUrl, ozonCategoryId, description, alibabaId, source, base, skus, templateSnapshot } = req.body;

    if (!base && (!name || price === undefined || price === null)) {
      logger.warn('参数验证失败:', req.body);
      return res.status(400).json({
        success: false,
        message: '缺少必填字段（name或price）'
      });
    }

    const userId = (req as any).user.id;

    // 如果提供了1688货源信息，按1688商品ID复用或更新 SupplySource 表
    let supplySourceId: number | null = null;
    if (source && source.alibabaOfferId) {
      const supplySource = await upsertSupplySource(userId, source, name || base?.name || '');
      supplySourceId = supplySource.id;
      logger.info('货源信息保存/复用成功:', supplySourceId);
    }

    const existingIdentifiers = await listExistingProductSupplyIdentifiers(userId);

    if (base) {
      const normalizedSkus = fillProductIdentifiers(
        Array.isArray(skus) && skus.length > 0
          ? skus
          : [{
              offerId: '',
              sku: '',
              barcode: '',
              price: base.price,
              oldPrice: base.oldPrice ?? null,
              variantAttributes: [],
              attributes: {},
            }],
        {
          source: source?.alibabaOfferId ? 'SRC' : 'MAN',
          sourceOfferId: source?.alibabaOfferId,
          name: base.name,
          modelName: base.modelName,
          existingOfferIds: existingIdentifiers.offerIds,
          existingSkus: existingIdentifiers.skus,
        },
      );
      const expandedSkus = expandProductSupplySkus({
        base,
        skus: normalizedSkus,
        templateSnapshot,
      });

      const createdItems = await prisma.$transaction(async (tx) => {
        const rows = [];
        for (const sku of expandedSkus) {
          const row = await tx.productSupply.create({
            data: buildProductSupplyCreateData(userId, sku, {
              supplier: source?.supplierName || base.supplier || '',
              supplySourceId: expandedSkus.length === 1 ? supplySourceId : null,
            }),
            include: { supplySource: true },
          });
          await replaceProductSupplyImageReferences(tx as any, {
            userId,
            productSupplyId: row.id,
            imageUrl: row.imageUrl,
            images: row.images,
          });
          rows.push(row);
        }
        return rows;
      });

      logger.info(`商品库商品批量创建成功: ${createdItems.length} 条`);
      return res.status(201).json({
        success: true,
        data: createdItems.map(serializeProductSupply),
        message: `已保存 ${createdItems.length} 条 SKU`
      });
    }

    const productImages = resolveProductSupplyImages(req.body.images, source, imageUrl);
    const resolvedImageUrl = imageUrl || productImages?.[0] || source?.image || '';
    const normalizedBody = normalizeListingCategoryFields({
      category,
      categoryLeaf,
      brand,
      descriptionCategoryId: req.body.descriptionCategoryId,
      typeId: req.body.typeId,
    });

    const [{ offerId: generatedOfferId, sku: generatedSku }] = fillProductIdentifiers(
      [{
        offerId: req.body.offerId || '',
        sku: req.body.sku || (!String(alibabaId || '').startsWith('OZ-') ? alibabaId : ''),
        name,
        modelName: req.body.modelName || '',
      }],
      {
        source: source?.alibabaOfferId ? 'SRC' : 'MAN',
        sourceOfferId: source?.alibabaOfferId,
        name,
        modelName: req.body.modelName,
        existingOfferIds: existingIdentifiers.offerIds,
        existingSkus: existingIdentifiers.skus,
      },
    );

    // 创建商品库记录，关联货源
    const newItem = await prisma.productSupply.create({
      data: {
        userId,
        name,
        category: normalizedBody.category || '',
        categoryLeaf: normalizedBody.categoryLeaf || '',
        brand: normalizedBody.brand || '无品牌',
        modelName: req.body.modelName || '',
        offerId: generatedOfferId,
        sku: generatedSku,
        alibabaId: source?.alibabaOfferId || null,
        supplier: source?.supplierName || '',
        price: parseFloat(price.toString()) || 0,
        status: 'pending',
        imageUrl: resolvedImageUrl,
        ozonCategoryId: ozonCategoryId ? BigInt(ozonCategoryId) : null,
        description: description || '',
        barcode: req.body.barcode || null,
        oldPrice: req.body.oldPrice !== undefined && req.body.oldPrice !== null ? parseFloat(req.body.oldPrice.toString()) : null,
        descriptionCategoryId: normalizedBody.descriptionCategoryId || null,
        typeId: normalizedBody.typeId || null,
        images: asJson(productImages),
        attributes: req.body.attributes || null,
        variantAttributes: req.body.variantAttributes || null,
        hiddenAttributes: req.body.hiddenAttributes || null,
        templateSnapshot: req.body.templateSnapshot || null,
        variantSummary: req.body.variantSummary || null,
        supplySourceId
      }
    });

    await replaceProductSupplyImageReferences(prisma, {
      userId,
      productSupplyId: newItem.id,
      imageUrl: newItem.imageUrl,
      images: newItem.images,
    });

    // 返回时带上货源信息
    const result = await prisma.productSupply.findUnique({
      where: { id: newItem.id },
      include: { supplySource: true }
    });

    logger.info('商品库商品创建成功:', newItem.id);
    res.status(201).json({
      success: true,
      data: serializeProductSupply(result),
      message: '采集成功'
    });
  } catch (error: any) {
    logger.error('创建商品库商品失败:', error);
    res.status(500).json({
      success: false,
      message: `创建失败: ${error.message}`
    });
  }
};

export const getProductSupplyItems = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20, keyword = '', status = '' } = req.query;

    logger.info(`查询商品库列表, 用户ID: ${userId}, 页码: ${page}, 每页: ${limit}`);

    const where: any = {};

    await syncPendingProductSupplyListingTasks(userId);

    if (keyword) {
      where.OR = [
        { name: { contains: keyword as string } },
        { category: { contains: keyword as string } },
        { brand: { contains: keyword as string } },
        { offerId: { contains: keyword as string } },
        { sku: { contains: keyword as string } },
        { alibabaId: { contains: keyword as string } },
        { modelName: { contains: keyword as string } }
      ];
    }

    if (status && status !== 'all') {
      if (status === 'pending') {
        where.status = { in: ['pending', 'listing'] };
      } else {
        where.status = status as string;
      }
    }

    const baseWhere: any = {};
    if (keyword) {
      baseWhere.OR = where.OR;
    }

    const [pagedRows, total, statsTotal, pendingCount, listingCount, listedCount, failedCount] = await Promise.all([
      prisma.productSupply.findMany({
        where,
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.productSupply.count({ where }),
      prisma.productSupply.count({ where: baseWhere }),
      prisma.productSupply.count({ where: { ...baseWhere, status: 'pending' } }),
      prisma.productSupply.count({ where: { ...baseWhere, status: 'listing' } }),
      prisma.productSupply.count({ where: { ...baseWhere, status: 'listed' } }),
      prisma.productSupply.count({ where: { ...baseWhere, status: 'failed' } })
    ]);
    const itemIds = pagedRows.map(row => row.id);
    const unsortedItems = itemIds.length > 0
      ? await prisma.productSupply.findMany({
        where: { id: { in: itemIds } },
        include: { supplySource: true },
      })
      : [];
    const itemOrder = new Map(itemIds.map((id, index) => [id, index]));
    const items = unsortedItems.sort((a, b) => (itemOrder.get(a.id) ?? 0) - (itemOrder.get(b.id) ?? 0));

    res.json({
      success: true,
      data: items.map(serializeProductSupply),
      total,
      stats: {
        total: statsTotal,
        pending: pendingCount,
        listing: listingCount,
        pendingAndListing: pendingCount + listingCount,
        listed: listedCount,
        failed: failedCount,
      },
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error: any) {
    logger.error('查询商品库列表失败:', error);
    res.status(500).json({
      success: false,
      message: `查询失败: ${error.message}`
    });
  }
};

export const getProductSupplyItemById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    logger.info(`查询商品库详情, 用户ID: ${userId}, 商品ID: ${id}`);

    const item = await prisma.productSupply.findFirst({
      where: { id: Number(id) },
      include: { supplySource: true }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    res.json({
      success: true,
      data: serializeProductSupply(item)
    });
  } catch (error: any) {
    logger.error('查询商品库详情失败:', error);
    res.status(500).json({
      success: false,
      message: `查询失败: ${error.message}`
    });
  }
};

export const updateProductSupplyItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const {
      name,
      category,
      categoryLeaf,
      brand,
      modelName,
      offerId,
      sku,
      alibabaId,
      supplier,
      price,
      status,
      imageUrl,
      ozonCategoryId,
      description,
      barcode,
      oldPrice,
      packageLength,
      packageWidth,
      packageHeight,
      grossWeight,
      descriptionCategoryId,
      typeId,
      images,
      attributes,
      variantAttributes,
      hiddenAttributes,
      templateSnapshot,
      variantSummary,
    } = req.body;

    logger.info(`更新商品库商品, 用户ID: ${userId}, 商品ID: ${id}`);

    const existingItem = await prisma.productSupply.findFirst({
      where: { id: Number(id) }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    const normalizedUpdateFields = normalizeListingCategoryFields({
      category: category !== undefined ? category : existingItem.category,
      categoryLeaf: categoryLeaf !== undefined ? categoryLeaf : existingItem.categoryLeaf,
      descriptionCategoryId: descriptionCategoryId !== undefined ? descriptionCategoryId : existingItem.descriptionCategoryId,
      typeId: typeId !== undefined ? typeId : existingItem.typeId,
      brand: brand !== undefined ? brand : existingItem.brand,
    });
    const normalizedUpdateImages = images !== undefined ? images : existingItem.images;
    const resolvedUpdateImageUrl = imageUrl !== undefined
      ? (imageUrl || normalizeImageArray(normalizedUpdateImages)[0] || '')
      : existingItem.imageUrl;

    const updatedItem = await prisma.productSupply.update({
      where: { id: Number(id) },
      data: {
        name: name !== undefined ? name : existingItem.name,
        category: normalizedUpdateFields.category,
        categoryLeaf: normalizedUpdateFields.categoryLeaf,
        brand: normalizedUpdateFields.brand,
        modelName: modelName !== undefined ? modelName : existingItem.modelName,
        offerId: offerId !== undefined ? offerId : existingItem.offerId,
        sku: sku !== undefined ? sku : existingItem.sku,
        alibabaId: alibabaId !== undefined ? alibabaId : existingItem.alibabaId,
        supplier: supplier !== undefined ? supplier : existingItem.supplier,
        price: price !== undefined ? parseFloat(price.toString()) : existingItem.price,
        status: status !== undefined ? status : existingItem.status,
        imageUrl: resolvedUpdateImageUrl,
        ozonCategoryId: ozonCategoryId !== undefined ? (ozonCategoryId ? BigInt(ozonCategoryId) : null) : existingItem.ozonCategoryId,
        description: description !== undefined ? description : existingItem.description,
        barcode: barcode !== undefined ? barcode : existingItem.barcode,
        oldPrice: oldPrice !== undefined ? (oldPrice !== null ? parseFloat(oldPrice.toString()) : null) : existingItem.oldPrice,
        packageLength: packageLength !== undefined ? parseNullableFloat(packageLength) : existingItem.packageLength,
        packageWidth: packageWidth !== undefined ? parseNullableFloat(packageWidth) : existingItem.packageWidth,
        packageHeight: packageHeight !== undefined ? parseNullableFloat(packageHeight) : existingItem.packageHeight,
        grossWeight: grossWeight !== undefined ? parseNullableFloat(grossWeight) : existingItem.grossWeight,
        descriptionCategoryId: normalizedUpdateFields.descriptionCategoryId,
        typeId: normalizedUpdateFields.typeId,
        images: normalizedUpdateImages,
        attributes: attributes !== undefined ? attributes : existingItem.attributes,
        variantAttributes: variantAttributes !== undefined ? variantAttributes : existingItem.variantAttributes,
        hiddenAttributes: hiddenAttributes !== undefined ? hiddenAttributes : existingItem.hiddenAttributes,
        templateSnapshot: templateSnapshot !== undefined ? templateSnapshot : existingItem.templateSnapshot,
        variantSummary: variantSummary !== undefined ? variantSummary : existingItem.variantSummary
      },
      include: { supplySource: true }
    });

    await replaceProductSupplyImageReferences(prisma, {
      userId,
      productSupplyId: updatedItem.id,
      imageUrl: updatedItem.imageUrl,
      images: updatedItem.images,
    });

    logger.info('商品库商品更新成功:', updatedItem.id);
    res.json({
      success: true,
      data: serializeProductSupply(updatedItem),
      message: '更新成功'
    });
  } catch (error: any) {
    logger.error('更新商品库商品失败:', error);
    res.status(500).json({
      success: false,
      message: `更新失败: ${error.message}`
    });
  }
};

async function bindSupplySourceSnapshot(userId: number, productId: number, source: any) {
  const existingItem = await prisma.productSupply.findFirst({
    where: { id: productId },
    include: { supplySource: true },
  });

  if (!existingItem) {
    return { errorStatus: 404, errorMessage: '商品不存在' };
  }

  if (!source || !source.alibabaOfferId) {
    return { errorStatus: 400, errorMessage: '缺少1688货源ID' };
  }

  const boundSource = await prisma.$transaction(async (tx) => {
    const reusableSource = await upsertSupplySource(userId, source, existingItem.name, tx);
    await tx.productSupply.update({
      where: { id: productId },
      data: {
        supplySourceId: reusableSource.id,
        supplier: reusableSource.supplierName || existingItem.supplier,
      },
    });
    return reusableSource;
  });
  logger.info(`商品库货源绑定完成: productId=${productId}, supplySourceId=${boundSource.id}, offerId=${boundSource.alibabaOfferId}`);

  const updatedItem = await prisma.productSupply.findFirst({
    where: { id: productId },
    include: { supplySource: true },
  });

  return { item: updatedItem };
}

export const getSupplySources = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await listSupplySources(userId, req.query);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.error('查询1688货源库失败:', error);
    res.status(500).json({
      success: false,
      message: `查询货源失败: ${error.message}`,
    });
  }
};

export const updateProductSupplySource = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { source } = req.body || {};

    const existingItem = await prisma.productSupply.findFirst({
      where: { id: Number(id) },
      include: { supplySource: true },
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    if (!source || !source.alibabaOfferId) {
      return res.status(400).json({
        success: false,
        message: '缺少1688货源ID'
      });
    }

    const bindResult = await bindSupplySourceSnapshot(userId, Number(id), source);
    if (bindResult.errorStatus) {
      return res.status(bindResult.errorStatus).json({
        success: false,
        message: bindResult.errorMessage,
      });
    }

    res.json({
      success: true,
      data: serializeProductSupply(bindResult.item),
      message: '货源绑定已更新'
    });
  } catch (error: any) {
    logger.error('更新商品库货源绑定失败:', error);
    res.status(500).json({
      success: false,
      message: `更新货源绑定失败: ${error.message}`
    });
  }
};

export const importProductSupplySourceFromUrl = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { url } = req.body || {};
    const inputUrl = String(url || '').trim();
    const offerId = extractProductSupplySourceOfferId(inputUrl);

    if (!offerId) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的1688商品链接或商品ID',
      });
    }

    const source = await previewSupplySourceFromUrl(userId, inputUrl);
    const bindResult = await bindSupplySourceSnapshot(userId, Number(id), source);
    if (bindResult.errorStatus) {
      return res.status(bindResult.errorStatus).json({
        success: false,
        message: bindResult.errorMessage,
      });
    }

    res.json({
      success: true,
      data: serializeProductSupply(bindResult.item),
      source,
      message: '1688货源已导入并绑定',
    });
  } catch (error: any) {
    logger.error('通过1688链接导入货源失败:', error);
    res.status(500).json({
      success: false,
      message: `导入货源失败: ${error.message}`,
    });
  }
};

export const previewProductSupplySourceFromUrl = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { url } = req.body || {};
    const inputUrl = String(url || '').trim();

    const offerId = extractProductSupplySourceOfferId(inputUrl);
    if (!offerId) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的1688商品链接或商品ID',
      });
    }

    const source = await previewSupplySourceFromUrl(userId, inputUrl);
    res.json({
      success: true,
      data: source,
      message: '1688货源解析成功',
    });
  } catch (error: any) {
    logger.error('解析商品库1688货源链接失败:', error);
    res.status(500).json({
      success: false,
      message: `解析货源失败: ${error.message}`,
    });
  }
};

export const unbindProductSupplySource = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existingItem = await prisma.productSupply.findFirst({
      where: { id: Number(id) },
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    await prisma.productSupply.update({
      where: { id: Number(id) },
      data: { supplySourceId: null },
    });

    const updatedItem = await prisma.productSupply.findFirst({
      where: { id: Number(id) },
      include: { supplySource: true },
    });

    res.json({
      success: true,
      data: serializeProductSupply(updatedItem),
      message: '货源绑定已解绑'
    });
  } catch (error: any) {
    logger.error('解绑商品库货源失败:', error);
    res.status(500).json({
      success: false,
      message: `解绑货源失败: ${error.message}`
    });
  }
};

export const deleteProductSupplyItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    logger.info(`删除商品库商品, 用户ID: ${userId}, 商品ID: ${id}`);

    const existingItem = await prisma.productSupply.findFirst({
      where: { id: Number(id) }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.imageReference.deleteMany({
        where: {
          refType: 'product_supply',
          refId: Number(id),
        },
      });

      await tx.productSupply.delete({
        where: { id: Number(id) }
      });
    });

    logger.info('商品库商品删除成功:', id);
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    logger.error('删除商品库商品失败:', error);
    res.status(500).json({
      success: false,
      message: `删除失败: ${error.message}`
    });
  }
};

export const getProductSupplyListingPreview = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const item = await prisma.productSupply.findFirst({
      where: { id: Number(id) },
      include: { supplySource: true },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: '商品不存在',
      });
    }

    const { preview } = await buildListingPreviewForItem(userId, item, req.body || {});

    res.json({
      success: true,
      data: preview,
    });
  } catch (error: any) {
    logger.error('获取商品库上架预览失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '获取上架预览失败',
    });
  }
};

/**
 * 上架商品到Ozon（异步）
 * 提交商品到Ozon平台，保存task_id，状态设为listing
 */
export const listToOzon = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { storeId, pricingStrategyId, finalPrice } = req.body || {};

    logger.info(`上架商品到Ozon, 用户ID: ${userId}, 商品ID: ${id}`);

    const item = await prisma.productSupply.findFirst({
      where: { id: Number(id) }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    // 只允许 pending 或 failed 状态的商品上架
    if (!['pending', 'failed'].includes(item.status)) {
      return res.status(400).json({
        success: false,
        message: `当前状态(${item.status})不允许上架操作`
      });
    }

    const selectedStoreId = parseOptionalInt(storeId);
    const selectedPricingStrategyId = parseOptionalInt(pricingStrategyId);
    const finalListingPrice = parseOptionalNumber(finalPrice);

    if (!selectedStoreId) {
      return res.status(400).json({
        success: false,
        message: '请选择目标店铺',
      });
    }
    if (!selectedPricingStrategyId) {
      return res.status(400).json({
        success: false,
        message: '请选择定价策略',
      });
    }
    if (!finalListingPrice || finalListingPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: '最终上架价格必须大于 0',
      });
    }

    const { preview, product: listingProduct } = await buildListingPreviewForItem(userId, item, {
      storeId: selectedStoreId,
      pricingStrategyId: selectedPricingStrategyId,
      finalPrice: finalListingPrice,
    });

    if (!preview.canSubmit) {
      return res.status(400).json({
        success: false,
        message: '商品信息未通过上架前校验',
        data: preview,
      });
    }

    const store = (preview.stores || []).find(item => item.id === selectedStoreId);
    if (!store) {
      return res.status(400).json({
        success: false,
        message: '所选 Ozon 店铺不存在或不可用',
      });
    }

    const storeRecord = await (prisma as any).ozonStore.findFirst({
      where: {
        id: selectedStoreId,
        status: 'active',
      },
    });

    if (!storeRecord) {
      return res.status(400).json({
        success: false,
        message: '未找到可用的 Ozon 店铺',
      });
    }

    try {
      const limits = await getOzonProductLimits(storeRecord);
      assertOzonProductOperationLimit(limits, 'create');
    } catch (limitError: any) {
      if (String(limitError?.message || '').includes('额度已用完')) {
        return res.status(429).json({
          success: false,
          message: limitError.message,
        });
      }
      logger.warn(`获取商品创建额度失败，继续提交商品上架: ${limitError.message}`);
    }

    // 构造提交数据
    const productData = {
      id: listingProduct.id,
      userId,
      name: listingProduct.name,
      brand: listingProduct.brand || '无品牌',
      modelName: listingProduct.modelName || listingProduct.offerId,
      description: listingProduct.description || ' ',
      imageUrl: listingProduct.imageUrl,
      images: listingProduct.images || [],
      ozonCategoryId: listingProduct.ozonCategoryId,
      descriptionCategoryId: listingProduct.descriptionCategoryId,
      typeId: listingProduct.typeId,
      price: preview.pricing.finalPrice,
      packageLength: listingProduct.packageLength,
      packageWidth: listingProduct.packageWidth,
      packageHeight: listingProduct.packageHeight,
      grossWeight: listingProduct.grossWeight,
      attributes: listingProduct.attributes || {},
      hiddenAttributes: listingProduct.hiddenAttributes || {},
      variantAttributes: listingProduct.variantAttributes || [],
      templateSnapshot: listingProduct.templateSnapshot || null,
      offerId: listingProduct.offerId,
      sku: listingProduct.sku,
      barcode: listingProduct.barcode,
      currencyCode: storeRecord.currency || preview.pricing.currencyCode,
    };

    // 提交到Ozon
    const result = await submitProductImport(storeRecord, productData);

    // 更新本地状态
    const updateData: any = {
      status: 'listing',
      listingError: null,
      listingSubmittedAt: new Date(),
      lastListingStoreId: selectedStoreId,
      lastPricingStrategyId: selectedPricingStrategyId,
      lastListingFinalPrice: preview.pricing.finalPrice,
      listingCheckSummary: asJson({
        generatedAt: new Date().toISOString(),
        selectedStoreId,
        selectedStoreName: store.name,
        selectedPricingStrategyId,
        pricing: preview.pricing,
        blockingCount: preview.blockingCount,
        warningCount: preview.warningCount,
        checks: preview.checks,
      }),
    };

    if (result.taskId) {
      updateData.ozonTaskId = result.taskId;
    }

    if (Array.isArray(result.imageIds)) {
      await replaceProductImageUsageReferences({
        userId,
        refType: 'product_supply',
        refId: Number(id),
        imageIds: result.imageIds.map((imageId: number | string) => Number(imageId)),
      });
    }

    const updated = await prisma.productSupply.update({
      where: { id: Number(id) },
      data: updateData,
      include: { supplySource: true }
    });

    logger.info(`商品提交Ozon成功, task_id: ${result.taskId}`);
    res.json({
      success: true,
      data: serializeProductSupply(updated),
      taskId: result.taskId,
      message: result.message || '商品已提交到Ozon'
    });
  } catch (error: any) {
    logger.error('上架商品到Ozon失败:', error);
    const listingError = truncateProductSupplyListingError(error);

    // 提交失败时更新状态为failed
    try {
      await prisma.productSupply.update({
        where: { id: Number(req.params.id) },
        data: {
          status: 'failed',
          listingError,
        }
      });
    } catch (e) {
      logger.error('更新失败状态失败:', e);
    }

    res.status(500).json({
      success: false,
      message: `上架失败: ${listingError || '未知错误'}`
    });
  }
};

/**
 * 查询上架任务状态
 * 前端轮询调用，根据Ozon返回更新本地状态
 */
export const checkListingStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const item = await prisma.productSupply.findFirst({
      where: { id: Number(id) },
      include: { supplySource: true }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    if (!item.ozonTaskId) {
      return res.status(400).json({
        success: false,
        message: '该商品没有上架任务'
      });
    }

    const storeWhere: any = item.lastListingStoreId
      ? {
          id: item.lastListingStoreId,
        }
      : {
          status: 'active',
        };

    const store = await (prisma as any).ozonStore.findFirst({
      where: storeWhere,
      orderBy: { createdAt: 'desc' }
    });

    if (!store) {
      return res.status(400).json({
        success: false,
        message: '未找到活跃的Ozon店铺'
      });
    }

    // 查询任务状态
    const taskResult = await checkImportTask(store, item.ozonTaskId);

    if (!taskResult.success) {
      return res.json({
        success: false,
        status: item.status,
        message: taskResult.message || '查询失败'
      });
    }

    const listingUpdate = resolveProductSupplyListingTaskUpdate(taskResult, item.status);
    // 其他状态(pending等)保持listing不变

    const updated = await prisma.productSupply.update({
      where: { id: Number(id) },
      data: {
        status: listingUpdate.status,
        listingError: listingUpdate.listingError,
        ...(listingUpdate.listedAt ? { listedAt: listingUpdate.listedAt } : {})
      },
      include: { supplySource: true }
    });

    logger.info(`上架状态查询完成, 商品ID: ${id}, 任务状态: ${taskResult.status}, 本地状态: ${listingUpdate.status}`);
    res.json({
      success: true,
      data: serializeProductSupply(updated),
      taskStatus: taskResult.status,
      items: taskResult.items
    });
  } catch (error: any) {
    logger.error('查询上架状态失败:', error);
    const listingError = truncateProductSupplyListingError(error);
    res.status(500).json({
      success: false,
      message: `查询失败: ${listingError || '未知错误'}`
    });
  }
};
