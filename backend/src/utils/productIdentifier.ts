export type ProductOfferSource = 'SRC' | 'MAN';

export interface BuildProductOfferIdOptions {
  source: ProductOfferSource;
  sourceOfferId?: string | number | null;
  name?: string | null;
  modelName?: string | null;
  index?: number;
  now?: Date;
}

export interface FillProductOfferIdsOptions extends Omit<BuildProductOfferIdOptions, 'index'> {
  existingOfferIds?: Array<string | null | undefined>;
}

export interface OfferIdRow {
  offerId?: string | null;
  sku?: string | null;
  name?: string | null;
  modelName?: string | null;
  [key: string]: any;
}

function formatDatePart(now: Date): string {
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function sanitizeSeed(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function hashSeed(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0)
    .toString(36)
    .toUpperCase()
    .padStart(5, '0')
    .slice(0, 5);
}

function resolveSeed(options: BuildProductOfferIdOptions): string {
  const sourceSeed = sanitizeSeed(options.sourceOfferId);
  if (sourceSeed) return sourceSeed.slice(-8);

  const textSeed = sanitizeSeed(`${options.modelName || ''}${options.name || ''}`);
  if (textSeed) return textSeed.slice(0, 8);

  return hashSeed(`${options.source}-${formatDatePart(options.now || new Date())}`);
}

export function buildProductOfferId(options: BuildProductOfferIdOptions): string {
  const sequence = String((options.index ?? 0) + 1).padStart(2, '0');
  return `OZ-${options.source}-${formatDatePart(options.now || new Date())}-${resolveSeed(options)}-${sequence}`;
}

export function buildProductSku(options: BuildProductOfferIdOptions): string {
  const sequence = String((options.index ?? 0) + 1).padStart(2, '0');
  return `SKU-${options.source}-${formatDatePart(options.now || new Date())}-${resolveSeed(options)}-${sequence}`;
}

export function fillProductOfferIds<T extends OfferIdRow>(
  rows: T[],
  options: FillProductOfferIdsOptions,
): Array<T & { offerId: string }> {
  const used = new Set(
    (options.existingOfferIds || [])
      .map(value => String(value || '').trim())
      .filter(Boolean),
  );

  return rows.map((row, rowIndex) => {
    const current = String(row.offerId || '').trim();
    let nextOfferId = current;

    if (!nextOfferId || used.has(nextOfferId)) {
      let attemptIndex = rowIndex;
      do {
        nextOfferId = buildProductOfferId({
          ...options,
          name: row.name || options.name,
          modelName: row.modelName || options.modelName,
          index: attemptIndex,
        });
        attemptIndex += 1;
      } while (used.has(nextOfferId));
    }

    used.add(nextOfferId);
    return {
      ...row,
      offerId: nextOfferId,
    };
  });
}

export function fillProductIdentifiers<T extends OfferIdRow>(
  rows: T[],
  options: FillProductOfferIdsOptions & { existingSkus?: Array<string | null | undefined> },
): Array<T & { offerId: string; sku: string }> {
  const usedOfferIds = new Set(
    (options.existingOfferIds || [])
      .map(value => String(value || '').trim())
      .filter(Boolean),
  );
  const usedSkus = new Set(
    (options.existingSkus || [])
      .map(value => String(value || '').trim())
      .filter(Boolean),
  );

  return rows.map((row, rowIndex) => {
    let nextOfferId = String(row.offerId || '').trim();
    let nextSku = String(row.sku || '').trim();

    if (!nextOfferId || usedOfferIds.has(nextOfferId)) {
      let attemptIndex = rowIndex;
      do {
        nextOfferId = buildProductOfferId({
          ...options,
          name: row.name || options.name,
          modelName: row.modelName || options.modelName,
          index: attemptIndex,
        });
        attemptIndex += 1;
      } while (usedOfferIds.has(nextOfferId));
    }

    if (!nextSku || usedSkus.has(nextSku)) {
      let attemptIndex = rowIndex;
      do {
        nextSku = buildProductSku({
          ...options,
          name: row.name || options.name,
          modelName: row.modelName || options.modelName,
          index: attemptIndex,
        });
        attemptIndex += 1;
      } while (usedSkus.has(nextSku) || nextSku === nextOfferId);
    }

    usedOfferIds.add(nextOfferId);
    usedSkus.add(nextSku);
    return {
      ...row,
      offerId: nextOfferId,
      sku: nextSku,
    };
  });
}
