import crypto from 'crypto';

export const IMAGE_BIZ_TYPES = ["avatar", "product"] as const;
export const IMAGE_PROVIDERS = ["local"] as const;

export type ImageBizType = (typeof IMAGE_BIZ_TYPES)[number];
export type ImageProvider = (typeof IMAGE_PROVIDERS)[number];

export type ImageUsageReference = {
  refType: string;
  refId: number;
  refKey: string | null;
};

export type ReplaceImageReferencesInput = {
  userId: number;
  refType: string;
  refId: number;
  imageIds: number[];
  keyBuilder?: (imageId: number, index: number) => string | null | undefined;
};

type ImageReferenceRecord = {
  imageId: number;
  userId: number;
  refType: string;
  refId: number;
  refKey: string | null;
};

type ImageReferenceWriter = {
  imageReference: {
    deleteMany(args: {
      where: {
        userId?: number;
        refType: string;
        refId: number;
      };
    }): Promise<unknown>;
    createMany(args: {
      data: ImageReferenceRecord[];
    }): Promise<unknown>;
  };
};

type ProductSupplyImageReferenceSyncDb = ImageReferenceWriter & {
  image: {
    findMany(args: unknown): Promise<Array<{ id: number }>>;
    createMany(args: unknown): Promise<unknown>;
  };
  productSupply: {
    findMany(args: unknown): Promise<Array<{ id: number; userId: number; imageUrl: unknown; images: unknown }>>;
  };
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const assertImageBizType = (value: unknown): ImageBizType => {
  if (typeof value === "string" && (IMAGE_BIZ_TYPES as readonly string[]).includes(value)) {
    return value as ImageBizType;
  }

  throw new Error(`Invalid image biz type: ${value}`);
};

export const assertImageProvider = (value: unknown): ImageProvider => {
  if (typeof value === "string" && (IMAGE_PROVIDERS as readonly string[]).includes(value)) {
    return value as ImageProvider;
  }

  throw new Error(`Invalid image provider: ${value}`);
};

export const dedupeImageUrls = (urls: Array<string | null | undefined>): string[] => {
  const result: string[] = [];

  for (const url of urls) {
    if (!isNonEmptyString(url)) {
      continue;
    }

    const normalizedUrl = url.trim();
    if (!result.includes(normalizedUrl)) {
      result.push(normalizedUrl);
    }
  }

  return result;
};

export const normalizeRefKey = (refKey: string | null | undefined): string | null => {
  if (!isNonEmptyString(refKey)) {
    return null;
  }

  const normalizedRefKey = refKey.trim();
  if (normalizedRefKey.length > 100) {
    throw new Error(`Invalid ref key: ${normalizedRefKey}`);
  }

  return normalizedRefKey;
};

export const buildImageUsageSummary = (references: ImageUsageReference[]) => {
  return {
    isUsed: references.length > 0,
    usedRefCount: references.length,
    usedRefTypes: Array.from(new Set(references.map((reference) => reference.refType))).sort(),
  };
};

export const replaceImageReferences = async (
  tx: ImageReferenceWriter,
  input: ReplaceImageReferencesInput,
): Promise<ImageReferenceRecord[]> => {
  await tx.imageReference.deleteMany({
    where: {
      userId: input.userId,
      refType: input.refType,
      refId: input.refId,
    },
  });

  const dedupedImageIds = input.imageIds.filter((imageId, index, array) => array.indexOf(imageId) === index);
  const data = dedupedImageIds.map((imageId, index) => ({
    imageId,
    userId: input.userId,
    refType: input.refType,
    refId: input.refId,
    refKey: normalizeRefKey(input.keyBuilder?.(imageId, index)),
  }));

  if (data.length === 0) {
    return [];
  }

  await tx.imageReference.createMany({ data, skipDuplicates: true } as any);

  return data;
};

const stripOrigin = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return trimmed;
  }
};

const normalizeImageUrlCandidates = (url: string): string[] => {
  const values = [url.trim(), stripOrigin(url)].filter(isNonEmptyString);
  return values.filter((item, index) => values.indexOf(item) === index);
};

const getImageFileNameFromUrl = (url: string): string => {
  const fallback = `product-image-${crypto.createHash('sha1').update(url).digest('hex').slice(0, 12)}`;
  try {
    const parsed = new URL(url, 'http://local.invalid');
    const fileName = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    return fileName || fallback;
  } catch {
    const fileName = decodeURIComponent(url.split('?')[0].split('#')[0].split('/').filter(Boolean).pop() || '');
    return fileName || fallback;
  }
};

const inferImageFileType = (url: string): string => {
  const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
  if (cleanUrl.endsWith('.png')) return 'image/png';
  if (cleanUrl.endsWith('.gif')) return 'image/gif';
  if (cleanUrl.endsWith('.webp')) return 'image/webp';
  if (cleanUrl.endsWith('.avif')) return 'image/avif';
  return 'image/jpeg';
};

export const buildProductImageProviderAssetId = (url: string): string =>
  `product-url:${crypto.createHash('sha1').update(url.trim()).digest('hex')}`;

const collectImageUrlsFromValue = (value: unknown, result: string[]) => {
  if (isNonEmptyString(value)) {
    result.push(value.trim());
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectImageUrlsFromValue(item, result));
    return;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    collectImageUrlsFromValue(record.fileUrl, result);
    collectImageUrlsFromValue(record.url, result);
    collectImageUrlsFromValue(record.imageUrl, result);
  }
};

export const collectProductImageUrls = (input: {
  imageUrl?: unknown;
  images?: unknown;
}): string[] => {
  const urls: string[] = [];
  collectImageUrlsFromValue(input.imageUrl, urls);
  collectImageUrlsFromValue(input.images, urls);
  return dedupeImageUrls(urls);
};

export async function findProductImageIdsByUrls(
  db: {
    image: {
      findMany(args: unknown): Promise<Array<{ id: number }>>;
    };
  },
  input: {
    userId?: number;
    imageUrl?: unknown;
    images?: unknown;
  },
): Promise<number[]> {
  const urls = collectProductImageUrls(input);
  if (urls.length === 0) {
    return [];
  }

  const candidates = urls.flatMap(normalizeImageUrlCandidates);
  const records = await db.image.findMany({
    where: {
      bizType: "product",
      provider: "local",
      OR: candidates.map(url => ({
        fileUrl: {
          contains: url,
        },
      })),
    },
    select: {
      id: true,
    },
  });

  return records.map(record => record.id);
}

export async function ensureProductImagesForReferences(
  db: {
    image: {
      findMany(args: unknown): Promise<Array<{ id: number; fileUrl?: unknown; providerAssetId?: unknown }>>;
      createMany(args: unknown): Promise<unknown>;
    };
  },
  input: {
    userId: number;
    imageUrl?: unknown;
    images?: unknown;
  },
): Promise<number[]> {
  const urls = collectProductImageUrls(input);
  if (urls.length === 0) {
    return [];
  }

  const providerAssetIds = urls.map(url => buildProductImageProviderAssetId(url));
  const urlCandidates = urls.flatMap(normalizeImageUrlCandidates);
  const existingRecords = await db.image.findMany({
    where: {
      userId: input.userId,
      bizType: "product",
      provider: "local",
      OR: [
        { providerAssetId: { in: providerAssetIds } },
        ...urlCandidates.map(url => ({ fileUrl: { contains: url } })),
      ],
    },
    select: {
      id: true,
      fileUrl: true,
      providerAssetId: true,
    },
  });

  const missingUrls = urls.filter(url => {
    const providerAssetId = buildProductImageProviderAssetId(url);
    const candidates = normalizeImageUrlCandidates(url);
    return !existingRecords.some(record =>
      record.providerAssetId === providerAssetId ||
      candidates.some(candidate => String(record.fileUrl || '').includes(candidate))
    );
  });

  if (missingUrls.length > 0) {
    await db.image.createMany({
      data: missingUrls.map(url => ({
        userId: input.userId,
        bizType: "product",
        provider: "local",
        providerAssetId: buildProductImageProviderAssetId(url),
        fileName: getImageFileNameFromUrl(url),
        fileUrl: url,
        fileSize: 0,
        fileType: inferImageFileType(url),
      })),
      skipDuplicates: true,
    });
  }

  return findProductImageIdsByUrls(db, input);
}

export async function replaceProductSupplyImageReferences(
  db: ImageReferenceWriter & {
    image: {
      findMany(args: unknown): Promise<Array<{ id: number }>>;
      createMany(args: unknown): Promise<unknown>;
    };
  },
  input: {
    userId: number;
    productSupplyId: number;
    imageUrl?: unknown;
    images?: unknown;
  },
) {
  const imageIds = await ensureProductImagesForReferences(db, {
    userId: input.userId,
    imageUrl: input.imageUrl,
    images: input.images,
  });

  return replaceImageReferences(db, {
    userId: input.userId,
    refType: "product_supply",
    refId: input.productSupplyId,
    imageIds,
    keyBuilder: (_imageId, index) => `image:${index}`,
  });
}

export async function syncProductSupplyImageReferences(
  db: ProductSupplyImageReferenceSyncDb,
): Promise<{ productCount: number; referenceCount: number }> {
  const products = await db.productSupply.findMany({
    select: {
      id: true,
      userId: true,
      imageUrl: true,
      images: true,
    },
  });

  let referenceCount = 0;

  for (const product of products) {
    const references = await replaceProductSupplyImageReferences(db, {
      userId: Number(product.userId),
      productSupplyId: product.id,
      imageUrl: product.imageUrl,
      images: product.images,
    });
    referenceCount += references.length;
  }

  return {
    productCount: products.length,
    referenceCount,
  };
}
