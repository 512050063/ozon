import { normalizePersistedCategory } from '../utils/productCategory';
import {
  loadOzonCategories,
  resolveCategorySelection,
} from './ozonCategorySelectionService';

export interface ProductSelectionCategoryInput {
  category?: unknown;
  categoryLeaf?: unknown;
  descriptionCategoryId?: unknown;
  typeId?: unknown;
  categoryVerified?: unknown;
}

export interface NormalizedProductSelectionCategory {
  category: string;
  categoryLeaf: string;
  descriptionCategoryId: number | null;
  typeId: number | null;
  categoryVerified: boolean;
}

const toPositiveIntOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) return null;
  return numberValue;
};

export function normalizeProductSelectionCategoryFields(
  input: ProductSelectionCategoryInput,
): NormalizedProductSelectionCategory {
  const persisted = normalizePersistedCategory({
    category: input.category,
    categoryLeaf: input.categoryLeaf,
  });
  const explicitDescriptionCategoryId = toPositiveIntOrNull(input.descriptionCategoryId);
  const explicitTypeId = toPositiveIntOrNull(input.typeId);

  const selection = resolveCategorySelection(
    loadOzonCategories(),
    explicitDescriptionCategoryId,
    explicitTypeId,
    persisted.category || persisted.categoryLeaf,
  );

  const descriptionCategoryId = explicitDescriptionCategoryId || selection.subCatId || null;
  const typeId = explicitTypeId || selection.typeId || null;
  const normalizedCategory = normalizePersistedCategory({
    category: selection.fullPath || persisted.category,
    categoryLeaf: persisted.categoryLeaf,
  });

  return {
    category: normalizedCategory.category,
    categoryLeaf: normalizedCategory.categoryLeaf,
    descriptionCategoryId,
    typeId,
    categoryVerified: input.categoryVerified === true || Boolean(descriptionCategoryId && typeId),
  };
}
