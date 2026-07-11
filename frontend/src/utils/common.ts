import { resolveLegacyAssetUrl } from '@/utils/assetUrls';

const DEFAULT_API_BASE_URL = (import.meta.env as any).DEV ? 'http://localhost:3000/api' : '/api';
const API_BASE_URL = ((import.meta.env as any).VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');

export const getBackendBaseUrl = (): string => API_BASE_URL.replace(/\/api$/, '');

// 获取完整的图片URL
export const getFullImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;

  const legacyAssetUrl = resolveLegacyAssetUrl(imagePath);
  if (legacyAssetUrl) {
    return legacyAssetUrl;
  }

  // 如果是完整的URL或浏览器运行时URL，直接返回
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:') ||
    imagePath.startsWith('blob:')
  ) {
    return imagePath;
  }

  // Vite 打包后的前端静态资源应直接由前端站点提供
  if (imagePath.startsWith('/assets/')) {
    return imagePath;
  }

  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
};

// 生成时间戳字符串
export const generateTimestampStr = () => {
  return Date.now().toString();
};

// 获取当前日期字符串
export const getCurrentDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// 获取中文首字母缩写（简化版）
export const getPinyinInitials = (text: string) => {
  if (!text) return '';
  const firstFourChars = text.slice(0, 4);
  const initials = firstFourChars
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      if (code >= 0x4e00 && code <= 0x9fa5) {
        const offset = (code - 0x4e00) % 26;
        return String.fromCharCode(0x61 + offset);
      } else if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
        return char.toLowerCase();
      }
      return '';
    })
    .join('');
  return initials || 'sp';
};

// 生成型号
export const generateModelNumber = (name: string) => {
  if (!name) return '';
  const initials = getPinyinInitials(name);
  const dateStr = getCurrentDateStr();
  return `${initials}_${dateStr}`;
};

// 数字验证函数
export const validateNumber = (_rule: any, value: number | null, callback: Function) => {
  if (value == null || value <= 0) {
    callback(new Error('请输入大于0的数值'));
  } else {
    callback();
  }
};

// 验证图像文件
export const validateImageFile = (file: File) => {
  const isValidType = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isValidType) {
    return { valid: false, message: '只能上传 JPG/PNG 格式的图片' };
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, message: '图片大小不能超过 5MB' };
  }

  return { valid: true };
};

// 图片预览转换
export const imageFileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      resolve(e.target?.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
