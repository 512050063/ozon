const OZON_IMAGE_HOST_PATTERN = /(^|\.)ozon(?:ru)?\.(?:ru|cn)$/i;
const ALIBABA_IMAGE_HOST_PATTERN = /(^|\.)alicdn\.com$/i;
const LEGACY_IMAGE_HOST_PATH_PATTERN = /^\/i\/\d{4}\/\d{2}\/\d{2}\/[^/]+\.(?:jpe?g|png|webp|gif)$/i;

export const isOzonRemoteImageUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && OZON_IMAGE_HOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
};

export const isAlibabaRemoteImageUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && ALIBABA_IMAGE_HOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
};

export const shouldProxyRemoteImageUrl = (value: string): boolean => {
  return isOzonRemoteImageUrl(value) || isAlibabaRemoteImageUrl(value);
};

export const isLegacyImageHostUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && LEGACY_IMAGE_HOST_PATH_PATTERN.test(url.pathname);
  } catch {
    return LEGACY_IMAGE_HOST_PATH_PATTERN.test(String(value || '').trim());
  }
};

export const toDisplayImageUrl = (value: string | null | undefined): string => {
  const url = String(value || '').trim();
  if (!url) return '';

  if (isLegacyImageHostUrl(url)) {
    return '';
  }

  if (shouldProxyRemoteImageUrl(url)) {
    return `/api/images/proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
};
