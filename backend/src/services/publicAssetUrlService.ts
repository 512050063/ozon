import path from 'path';

const DEFAULT_UPLOAD_ROOT = path.resolve(__dirname, '../../data/uploads');

export type ResolvePublicAssetUrlOptions = {
  publicBaseUrl?: string;
  requireHttps?: boolean;
};

export function getUploadRoot(): string {
  return process.env.UPLOAD_ROOT
    ? path.resolve(process.env.UPLOAD_ROOT)
    : DEFAULT_UPLOAD_ROOT;
}

export function getImageUploadDir(): string {
  return path.join(getUploadRoot(), 'images');
}

export function normalizePublicBaseUrl(value = process.env.PUBLIC_BASE_URL || ''): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    throw new Error('PUBLIC_BASE_URL 未配置，无法生成 Ozon 图片公网地址');
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

export function resolvePublicAssetUrl(value: string, options: ResolvePublicAssetUrlOptions = {}): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    if (options.requireHttps && !raw.toLowerCase().startsWith('https://')) {
      throw new Error(`生产环境要求 HTTPS 图片地址：${raw}`);
    }
    return raw;
  }

  const publicBaseUrl = normalizePublicBaseUrl(options.publicBaseUrl);
  if (options.requireHttps && !publicBaseUrl.toLowerCase().startsWith('https://')) {
    throw new Error('生产环境要求 PUBLIC_BASE_URL 使用 HTTPS');
  }

  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
  return `${publicBaseUrl}${normalizedPath}`;
}

export function isManagedImagePath(value: string): boolean {
  return /^\/(uploads\/images|images|assets\/images\/product-images)\//.test(String(value || '').trim());
}
