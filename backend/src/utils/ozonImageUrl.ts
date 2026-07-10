const OZON_IMAGE_CN_HOST = 'ir-21.ozonru.cn';

export const normalizeOzonImageUrlForDisplay = (value: unknown): string => {
  if (!value) {
    return '';
  }

  const rawUrl = typeof value === 'string'
    ? value
    : (value as { fileUrl?: unknown; url?: unknown; imageUrl?: unknown }).fileUrl
      || (value as { fileUrl?: unknown; url?: unknown; imageUrl?: unknown }).url
      || (value as { fileUrl?: unknown; url?: unknown; imageUrl?: unknown }).imageUrl
      || '';
  const url = String(rawUrl || '').trim();

  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);
    if (/^cdn\d*\.ozon\.ru$/i.test(parsed.hostname)) {
      parsed.hostname = OZON_IMAGE_CN_HOST;
      return parsed.toString();
    }
  } catch {
    return url;
  }

  return url;
};
