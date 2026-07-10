import path from 'path';
import fs from 'fs';
import { syncOzonCategoriesIncremental } from './ozonCategoryService';

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '../../scripts/data/ozon_config.json');
const CACHE_DIR = path.join(__dirname, '../../scripts/data/cache');
const COOKIE_FILE = path.join(__dirname, '../../scripts/data/ozon_cookies.json');

export interface OzonPreferenceConfig {
  searchLimit: number;
  cacheMaxAge: number;
  cookieStatus: {
    valid: boolean;
    exported_at: string | null;
    lang: string | null;
    currency: string | null;
  } | null;
  cacheSize: string;
  cacheFileCount: number;
}

export interface CacheInfo {
  size: number;
  fileCount: number;
  formattedSize: string;
}

export interface SyncResult {
  newCount: number;
  updatedCount: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  searchLimit: 50,
  cacheMaxAge: 2,
  cookieStatus: null as any,
};

/**
 * 读取配置文件
 */
function readConfigFile(): any {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    // ignore
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * 写入配置文件
 */
function writeConfigFile(data: any): void {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 获取 Ozon 优选配置
 */
export async function getPreferenceConfig(): Promise<OzonPreferenceConfig> {
  const config = readConfigFile();
  repairCookieStatusFromFile(config);
  const cacheInfo = await getCacheInfo();

  return {
    searchLimit: config.searchLimit ?? DEFAULT_CONFIG.searchLimit,
    cacheMaxAge: config.cacheMaxAge ?? DEFAULT_CONFIG.cacheMaxAge,
    cookieStatus: config.cookieStatus || null,
    cacheSize: cacheInfo.formattedSize,
    cacheFileCount: cacheInfo.fileCount,
  };
}

function repairCookieStatusFromFile(config: any): void {
  if (!config.cookieStatus || config.cookieStatus.valid !== false) {
    return;
  }

  try {
    if (!fs.existsSync(COOKIE_FILE)) {
      return;
    }

    const cookieData = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
    const cookies = Array.isArray(cookieData?.cookies) ? cookieData.cookies : [];
    const hasOzonCookie = cookies.some((cookie: any) => {
      const domain = String(cookie?.domain || '').toLowerCase();
      return domain.includes('ozon');
    });

    if (hasOzonCookie) {
      config.cookieStatus.valid = true;
      config.cookieStatus.exported_at = config.cookieStatus.exported_at || cookieData.exported_at || new Date().toISOString();
      config.cookieStatus.lang = config.cookieStatus.lang || cookieData.lang || 'zh';
      config.cookieStatus.currency = config.cookieStatus.currency || cookieData.currency || 'CNY';
      writeConfigFile(config);
    }
  } catch {
    // 保持原状态，避免读取异常时误改配置
  }
}

/**
 * 保存 Ozon 优选配置
 */
export async function savePreferenceConfig(
  searchLimit?: number,
  cacheMaxAge?: number
): Promise<OzonPreferenceConfig> {
  const config = readConfigFile();

  if (searchLimit !== undefined) {
    config.searchLimit = Math.max(10, Math.min(200, searchLimit));
  }
  if (cacheMaxAge !== undefined) {
    config.cacheMaxAge = Math.max(1, Math.min(24, cacheMaxAge));
  }

  writeConfigFile(config);

  return getPreferenceConfig();
}

/**
 * 更新 Cookie 状态（获取/导入成功时调用）
 */
export async function updateCookieStatus(exported_at?: string, lang?: string, currency?: string): Promise<void> {
  const config = readConfigFile();
  config.cookieStatus = {
    valid: true,
    exported_at: exported_at || new Date().toISOString(),
    lang: lang || 'zh',
    currency: currency || 'CNY',
  };
  writeConfigFile(config);
}

/**
 * 标记 Cookie 失效（搜索失败/反爬时调用）
 */
export async function invalidateCookieStatus(): Promise<void> {
  const config = readConfigFile();
  if (config.cookieStatus) {
    config.cookieStatus.valid = fs.existsSync(COOKIE_FILE);
    writeConfigFile(config);
  }
}

/**
 * 清除 Cookie 状态（用户手动清除时调用）
 */
export async function clearCookieStatus(): Promise<void> {
  const config = readConfigFile();
  config.cookieStatus = null;
  writeConfigFile(config);
}

/**
 * 同步 Ozon 类目
 */
export async function syncCategories(): Promise<SyncResult> {
  const result = await syncOzonCategoriesIncremental();
  return {
    newCount: result.syncedCount,
    updatedCount: result.updatedCount,
  };
}

/**
 * 获取缓存信息
 */
export async function getCacheInfo(): Promise<CacheInfo> {
  try {
    const stats = getDirectorySizeSync(CACHE_DIR);
    return {
      size: stats.size,
      fileCount: stats.fileCount,
      formattedSize: formatFileSize(stats.size),
    };
  } catch {
    return {
      size: 0,
      fileCount: 0,
      formattedSize: '0 B',
    };
  }
}

/**
 * 清除缓存
 */
export async function clearCache(): Promise<{ clearedSize: string; fileCount: number }> {
  const beforeInfo = await getCacheInfo();

  try {
    clearDirectorySync(CACHE_DIR);
  } catch {
    // 目录可能不存在，忽略错误
  }

  return {
    clearedSize: beforeInfo.formattedSize,
    fileCount: beforeInfo.fileCount,
  };
}

/**
 * 获取目录大小和文件数（同步）
 */
function getDirectorySizeSync(dir: string): { size: number; fileCount: number } {
  let size = 0;
  let fileCount = 0;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subStats = getDirectorySizeSync(fullPath);
        size += subStats.size;
        fileCount += subStats.fileCount;
      } else {
        const stats = fs.statSync(fullPath);
        size += stats.size;
        fileCount++;
      }
    }
  } catch {
    // 目录不存在或无法访问
  }

  return { size, fileCount };
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

/**
 * 清空目录（同步）
 */
function clearDirectorySync(dir: string): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        clearDirectorySync(fullPath);
        fs.rmdirSync(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  } catch {
    // 忽略错误
  }
}
