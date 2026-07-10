export interface PersistedCategoryInput {
  category?: unknown;
  categoryLeaf?: unknown;
}

export interface PersistedCategoryFields {
  category: string;
  categoryLeaf: string;
}

const normalizeText = (value: unknown): string => String(value ?? '').trim();

export function extractCategoryLeaf(category: unknown): string {
  const text = normalizeText(category);
  if (!text) return '';
  const parts = text
    .split(/\s*(?:>|\/|\\)\s*/g)
    .map(part => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || text;
}

export function normalizePersistedCategory(input: PersistedCategoryInput): PersistedCategoryFields {
  const category = normalizeText(input.category);
  const categoryLeaf = normalizeText(input.categoryLeaf) || extractCategoryLeaf(category);
  return {
    category,
    categoryLeaf,
  };
}
