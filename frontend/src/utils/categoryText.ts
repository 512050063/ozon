export function getCategoryLeaf(category?: string | null): string {
  const text = String(category || '').trim();
  if (!text) return '';
  const parts = text
    .split(/\s*(?:>|\/|\\)\s*/g)
    .map(part => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || text;
}

export function getCompactCategoryLeaf(category?: string | null, maxLength = 3): string {
  const leaf = getCategoryLeaf(category);
  return leaf.length > maxLength ? `${leaf.slice(0, maxLength)}...` : leaf;
}
