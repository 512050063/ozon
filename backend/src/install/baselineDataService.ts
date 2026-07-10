import prisma from '../config/database';
import { BASELINE_TABLES, BaselineTableName } from './installTypes';

export type BaselineBundle = {
  version: string;
  createdAt?: string;
  tables: Partial<Record<BaselineTableName | string, any[]>>;
};

export type BaselineImportResult = {
  version: string;
  imported: Record<string, number>;
};

const allowedTables = new Set<string>(BASELINE_TABLES);

export function getAllowedBaselineTables(): string[] {
  return [...BASELINE_TABLES];
}

export function validateBaselineBundle(bundle: BaselineBundle): string[] {
  const errors: string[] = [];
  if (!bundle || typeof bundle !== 'object') {
    return ['基础数据包格式无效'];
  }
  if (!bundle.version || typeof bundle.version !== 'string') {
    errors.push('基础数据包缺少 version');
  }
  if (!bundle.tables || typeof bundle.tables !== 'object' || Array.isArray(bundle.tables)) {
    errors.push('基础数据包缺少 tables');
    return errors;
  }

  for (const [table, rows] of Object.entries(bundle.tables)) {
    if (!allowedTables.has(table)) {
      errors.push(`不允许导入表: ${table}`);
      continue;
    }
    if (!Array.isArray(rows)) {
      errors.push(`表 ${table} 必须是数组`);
    }
  }

  return errors;
}

export async function importBaselineBundle(
  bundle: BaselineBundle,
  prismaClient: any = prisma,
): Promise<BaselineImportResult> {
  const errors = validateBaselineBundle(bundle);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  const imported: Record<string, number> = {};
  const tables = bundle.tables || {};

  if (tables.ozon_error_codes) {
    imported.ozon_error_codes = await importOzonErrorCodes(tables.ozon_error_codes, prismaClient);
  }
  if (tables.ozon_categories) {
    imported.ozon_categories = await importOzonCategories(tables.ozon_categories, prismaClient);
  }
  if (tables.ozon_product_templates) {
    imported.ozon_product_templates = await importOzonProductTemplates(tables.ozon_product_templates, prismaClient);
  }
  if (tables.ozon_category_attributes) {
    imported.ozon_category_attributes = await importOzonCategoryAttributes(tables.ozon_category_attributes, prismaClient);
  }
  if (tables.ozon_attribute_values) {
    imported.ozon_attribute_values = await importOzonAttributeValues(tables.ozon_attribute_values, prismaClient);
  }
  if (tables.translation_cache) {
    imported.translation_cache = await importTranslationCache(tables.translation_cache, prismaClient);
  }

  return {
    version: bundle.version,
    imported,
  };
}

async function importOzonErrorCodes(rows: any[], prismaClient: any): Promise<number> {
  for (const row of rows) {
    const code = String(row.code || '').trim();
    if (!code) continue;
    await prismaClient.ozonErrorCode.upsert({
      where: { code },
      update: {
        messageRu: row.messageRu ?? null,
        messageZh: row.messageZh ?? null,
        level: row.level ?? null,
      },
      create: {
        code,
        messageRu: row.messageRu ?? null,
        messageZh: row.messageZh ?? null,
        level: row.level ?? null,
      },
    });
  }
  return rows.length;
}

async function importOzonCategories(rows: any[], prismaClient: any): Promise<number> {
  for (const row of rows) {
    await prismaClient.ozonCategory.upsert({
      where: {
        ozonId_ozonParentId: {
          ozonId: BigInt(row.ozonId),
          ozonParentId: row.ozonParentId === null || row.ozonParentId === undefined ? null : BigInt(row.ozonParentId),
        },
      },
      update: {
        name: row.name,
        level: Number(row.level || 1),
        parentId: row.parentId ?? null,
        path: row.path ?? null,
        language: row.language || 'ZH_HANS',
      },
      create: {
        id: row.id,
        ozonId: BigInt(row.ozonId),
        name: row.name,
        level: Number(row.level || 1),
        parentId: row.parentId ?? null,
        ozonParentId: row.ozonParentId === null || row.ozonParentId === undefined ? null : BigInt(row.ozonParentId),
        path: row.path ?? null,
        language: row.language || 'ZH_HANS',
      },
    });
  }
  return rows.length;
}

async function importOzonProductTemplates(rows: any[], prismaClient: any): Promise<number> {
  for (const row of rows) {
    await prismaClient.ozonProductTemplate.upsert({
      where: {
        descriptionCategoryId_typeId_language: {
          descriptionCategoryId: Number(row.descriptionCategoryId),
          typeId: row.typeId === undefined ? null : row.typeId,
          language: row.language || 'ZH_HANS',
        },
      },
      update: {
        templateJson: row.templateJson,
        rawAttributes: row.rawAttributes ?? null,
        source: row.source || 'baseline',
        cachedAt: row.cachedAt ? new Date(row.cachedAt) : new Date(),
      },
      create: {
        id: row.id,
        descriptionCategoryId: Number(row.descriptionCategoryId),
        typeId: row.typeId === undefined ? null : row.typeId,
        language: row.language || 'ZH_HANS',
        templateJson: row.templateJson,
        rawAttributes: row.rawAttributes ?? null,
        source: row.source || 'baseline',
        cachedAt: row.cachedAt ? new Date(row.cachedAt) : new Date(),
      },
    });
  }
  return rows.length;
}

async function importOzonCategoryAttributes(rows: any[], prismaClient: any): Promise<number> {
  for (const row of rows) {
    await prismaClient.ozonCategoryAttribute.upsert({
      where: {
        ozonAttributeId_descriptionCategoryId_typeId: {
          ozonAttributeId: Number(row.ozonAttributeId),
          descriptionCategoryId: Number(row.descriptionCategoryId),
          typeId: row.typeId === undefined ? null : row.typeId,
        },
      },
      update: {
        name: row.name,
        description: row.description ?? null,
        type: row.type || 'string',
        isRequired: Boolean(row.isRequired),
        dictionaryId: row.dictionaryId ?? null,
        groupId: row.groupId ?? null,
        groupName: row.groupName ?? null,
        isCollection: Boolean(row.isCollection),
        isDependent: Boolean(row.isDependent),
        precision: row.precision ?? null,
      },
      create: {
        id: row.id,
        ozonAttributeId: Number(row.ozonAttributeId),
        descriptionCategoryId: Number(row.descriptionCategoryId),
        typeId: row.typeId === undefined ? null : row.typeId,
        name: row.name,
        description: row.description ?? null,
        type: row.type || 'string',
        isRequired: Boolean(row.isRequired),
        dictionaryId: row.dictionaryId ?? null,
        groupId: row.groupId ?? null,
        groupName: row.groupName ?? null,
        isCollection: Boolean(row.isCollection),
        isDependent: Boolean(row.isDependent),
        precision: row.precision ?? null,
      },
    });
  }
  return rows.length;
}

async function importOzonAttributeValues(rows: any[], prismaClient: any): Promise<number> {
  for (const row of rows) {
    await prismaClient.ozonAttributeValue.upsert({
      where: {
        attributeId_valueId: {
          attributeId: Number(row.attributeId),
          valueId: Number(row.valueId),
        },
      },
      update: {
        value: row.value,
      },
      create: {
        id: row.id,
        attributeId: Number(row.attributeId),
        valueId: Number(row.valueId),
        value: row.value,
      },
    });
  }
  return rows.length;
}

async function importTranslationCache(rows: any[], prismaClient: any): Promise<number> {
  for (const row of rows) {
    const originalHash = String(row.originalHash || '').trim();
    const sourceLang = String(row.sourceLang || '').trim();
    const targetLang = String(row.targetLang || '').trim();
    if (!originalHash || !sourceLang || !targetLang) continue;

    await prismaClient.translationCache.upsert({
      where: {
        originalHash_sourceLang_targetLang: {
          originalHash,
          sourceLang,
          targetLang,
        },
      },
      update: {
        originalText: row.originalText || '',
        translatedText: row.translatedText || '',
        service: row.service || 'baseline',
        usageCount: Number(row.usageCount || 1),
        expiresAt: row.expiresAt ? new Date(row.expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      create: {
        id: row.id,
        originalText: row.originalText || '',
        originalHash,
        translatedText: row.translatedText || '',
        sourceLang,
        targetLang,
        service: row.service || 'baseline',
        usageCount: Number(row.usageCount || 1),
        expiresAt: row.expiresAt ? new Date(row.expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  }
  return rows.length;
}
