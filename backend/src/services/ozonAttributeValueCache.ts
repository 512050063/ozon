export interface OzonAttributeValueLike {
  id?: number;
  valueId?: number;
  info?: string;
  value?: string;
  [key: string]: any;
}

export interface OzonAttributeValueCacheRow {
  attributeId: number;
  valueId: number;
  value: string;
}

export function buildOzonAttributeValueCacheRows(
  attributeId: number,
  values: OzonAttributeValueLike[]
): OzonAttributeValueCacheRow[] {
  const seen = new Set<number>();
  const rows: OzonAttributeValueCacheRow[] = [];

  for (const item of values) {
    const valueId = Number(item.id ?? item.valueId ?? 0);
    if (!valueId || seen.has(valueId)) continue;

    seen.add(valueId);
    rows.push({
      attributeId,
      valueId,
      value: String(item.info || item.value || ''),
    });
  }

  return rows;
}
