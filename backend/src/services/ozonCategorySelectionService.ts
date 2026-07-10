import fs from 'fs';
import path from 'path';
import { normalizePersistedCategory } from '../utils/productCategory';

export interface OzonCategoryType {
  type_id: number;
  type_name: string;
  disabled?: boolean;
}

export interface OzonSubCategory {
  description_category_id: number;
  category_name: string;
  disabled?: boolean;
  children?: OzonCategoryType[];
}

export interface OzonTopCategory {
  description_category_id: number;
  category_name: string;
  disabled?: boolean;
  children?: OzonSubCategory[];
}

export interface ResolvedCategorySelection {
  fullPath: string;
  topCatId: number;
  subCatId: number;
  typeId: number;
}

const CATEGORIES_FILE = path.resolve(__dirname, '../../../frontend/src/assets/ozonCategories.json');

let cachedCategories: OzonTopCategory[] | null = null;

const normalizeText = (value: unknown) => String(value || '').trim();

const buildFullPath = (top: OzonTopCategory, sub: OzonSubCategory, type: OzonCategoryType) =>
  [top.category_name, sub.category_name, type.type_name].filter(Boolean).join(' > ');

const emptySelection = (fallback = ''): ResolvedCategorySelection => ({
  fullPath: normalizeText(fallback),
  topCatId: 0,
  subCatId: 0,
  typeId: 0,
});

export function loadOzonCategories(): OzonTopCategory[] {
  if (cachedCategories) return cachedCategories;
  try {
    const raw = fs.readFileSync(CATEGORIES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    cachedCategories = Array.isArray(parsed?.result) ? parsed.result : [];
  } catch {
    cachedCategories = [];
  }
  return cachedCategories || [];
}

export function resolveCategorySelection(
  categories: OzonTopCategory[],
  descriptionCategoryId?: number | null,
  typeId?: number | null,
  fallback = '',
): ResolvedCategorySelection {
  const subId = Number(descriptionCategoryId || 0);
  const leafTypeId = Number(typeId || 0);

  if (subId && leafTypeId) {
    for (const top of categories || []) {
      const sub = top.children?.find(item => item.description_category_id === subId);
      if (!sub) continue;
      const type = sub.children?.find(item => item.type_id === leafTypeId);
      if (!type) continue;
      return {
        fullPath: buildFullPath(top, sub, type),
        topCatId: top.description_category_id,
        subCatId: sub.description_category_id,
        typeId: type.type_id,
      };
    }
  }

  const fallbackName = normalizeText(fallback);
  if (!fallbackName) return emptySelection();

  const pathParts = fallbackName.split('>').map(item => item.trim()).filter(Boolean);
  const [topName, subName, typeName] = pathParts.length >= 3
    ? [pathParts[0], pathParts[1], pathParts[pathParts.length - 1]]
    : ['', '', fallbackName];

  for (const top of categories || []) {
    if (topName && normalizeText(top.category_name) !== topName) continue;
    for (const sub of top.children || []) {
      if (subName && normalizeText(sub.category_name) !== subName) continue;
      const type = sub.children?.find(item => normalizeText(item.type_name) === typeName);
      if (!type) continue;
      return {
        fullPath: buildFullPath(top, sub, type),
        topCatId: top.description_category_id,
        subCatId: sub.description_category_id,
        typeId: type.type_id,
      };
    }
  }

  return emptySelection(fallbackName);
}

export function normalizeListingCategoryFields<T extends Record<string, any>>(product: T): T {
  const persistedCategory = normalizePersistedCategory({
    category: product.category || '',
    categoryLeaf: product.categoryLeaf || '',
  });
  const selection = resolveCategorySelection(
    loadOzonCategories(),
    product.descriptionCategoryId,
    product.typeId,
    persistedCategory.category || '',
  );
  const fallbackCategory = persistedCategory.category || selection.fullPath;
  const normalizedPersistedCategory = normalizePersistedCategory({
    category: fallbackCategory,
    categoryLeaf: persistedCategory.categoryLeaf,
  });

  return {
    ...product,
    category: normalizedPersistedCategory.category,
    categoryLeaf: normalizedPersistedCategory.categoryLeaf,
    descriptionCategoryId: product.descriptionCategoryId || selection.subCatId || null,
    typeId: product.typeId || selection.typeId || null,
    brand: normalizeText(product.brand) || '无品牌',
  };
}
