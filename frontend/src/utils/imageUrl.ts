const OZON_IMAGE_HOST_PATTERN = /(^|\.)ozon(?:ru)?\.(?:ru|cn)$/i;

export const isOzonRemoteImageUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && OZON_IMAGE_HOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
};

export const toDisplayImageUrl = (value: string | null | undefined): string => {
  const url = String(value || '').trim();
  if (!url) return '';

  if (isOzonRemoteImageUrl(url)) {
    return `/api/images/proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
};
