import request from './request';

export interface PreferenceConfig {
  searchLimit: number;
  cacheMaxAge: number;
  lastCategorySync: string | null;
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

export const ozonPreferenceAPI = {
  // 获取配置
  getConfig(): Promise<{ success: boolean; data: PreferenceConfig; message: string }> {
    return request.get('/ozon/preference/config');
  },

  // 保存配置
  saveConfig(config: { searchLimit?: number; cacheMaxAge?: number }): Promise<{ success: boolean; data: PreferenceConfig; message: string }> {
    return request.post('/ozon/preference/config', config);
  },

  // 同步类目
  syncCategories(): Promise<{ success: boolean; data: SyncResult; message: string }> {
    return request.post('/ozon/preference/sync-categories');
  },

  // 获取缓存信息
  getCacheInfo(): Promise<{ success: boolean; data: CacheInfo; message: string }> {
    return request.get('/ozon/preference/cache');
  },

  // 清除缓存
  clearCache(): Promise<{ success: boolean; data: { clearedSize: string; fileCount: number }; message: string }> {
    return request.delete('/ozon/preference/cache');
  },
};
