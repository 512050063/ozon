import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUpdateStore = defineStore('update', () => {
  type UpdateScope = 'page' | 'global';

  type UpdateMeta = {
    updating: boolean;
    progress: number;
    statusText: string;
    message: string;
    scope: UpdateScope;
    startedAt: number;
    expiresAt: number;
  };

  const UPDATE_TIMEOUT = 180000; // 3分钟
  const UPDATE_STORAGE_KEY = 'ozon_update_store_v1';

  const createMeta = (): UpdateMeta => ({
    updating: false,
    progress: 0,
    statusText: '',
    message: '',
    scope: 'page',
    startedAt: 0,
    expiresAt: 0,
  });

  const createDefaultModules = (): Record<string, UpdateMeta> => ({
    'ozon-preference': createMeta(), // ozon优选
    'product-management': createMeta(), // 商品管理
    'store-management': createMeta(), // 店铺管理
    'order-management': createMeta(), // 订单管理
    'finance-report': createMeta(), // 财务报告
    'promotions': createMeta(), // 促销活动
  });

  const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

  const normalizeMeta = (meta: Partial<UpdateMeta>): UpdateMeta => ({
    ...createMeta(),
    ...meta,
    progress: Math.max(0, Math.min(100, Math.round(meta.progress || 0))),
    scope: meta.scope === 'global' ? 'global' : 'page',
    startedAt: Number(meta.startedAt || 0),
    expiresAt: Number(meta.expiresAt || 0),
  });

  const hydrateModules = (): Record<string, UpdateMeta> => {
    const modules = createDefaultModules();
    if (!canUseStorage()) return modules;

    try {
      const raw = window.localStorage.getItem(UPDATE_STORAGE_KEY);
      if (!raw) return modules;
      const parsed = JSON.parse(raw);
      const now = Date.now();
      Object.entries((parsed?.modules || {}) as Record<string, Partial<UpdateMeta>>).forEach(([module, meta]) => {
        const normalized = normalizeMeta(meta);
        if (normalized.updating && normalized.expiresAt > now) {
          modules[module] = normalized;
        }
      });
    } catch {
      window.localStorage.removeItem(UPDATE_STORAGE_KEY);
    }

    return modules;
  };

  // 各模块更新状态
  const updatingModules = ref<Record<string, UpdateMeta>>(hydrateModules());

  // 各模块的超时定时器
  const timeoutTimers = ref<Record<string, ReturnType<typeof setTimeout> | null>>({});

  const persistUpdates = () => {
    if (!canUseStorage()) return;
    const activeModules = Object.fromEntries(
      Object.entries(updatingModules.value)
        .filter(([, meta]) => meta.updating && meta.expiresAt > Date.now())
        .map(([module, meta]) => [module, { ...meta }])
    );

    if (Object.keys(activeModules).length === 0) {
      window.localStorage.removeItem(UPDATE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(UPDATE_STORAGE_KEY, JSON.stringify({ modules: activeModules }));
  };

  const scheduleTimeout = (module: string, delay: number) => {
    if (timeoutTimers.value[module]) {
      clearTimeout(timeoutTimers.value[module]!);
    }
    timeoutTimers.value[module] = setTimeout(() => {
      stopUpdate(module);
    }, Math.max(0, delay));
  };

  /**
   * 开始更新
   * @param module 模块标识
   */
  const ensureModule = (module: string) => {
    if (!updatingModules.value[module]) {
      updatingModules.value[module] = createMeta();
    }
    return updatingModules.value[module];
  };

  /**
   * 开始更新
   * @param module 模块标识
   * @param options 更新元信息
   */
  const startUpdate = (module: string, options?: { scope?: UpdateScope; statusText?: string; message?: string; progress?: number }) => {
    const meta = ensureModule(module);
    const now = Date.now();
    meta.updating = true;
    meta.scope = options?.scope ?? 'page';
    meta.statusText = options?.statusText ?? meta.statusText ?? '正在更新';
    meta.message = options?.message ?? meta.message ?? '';
    meta.progress = typeof options?.progress === 'number' ? options.progress : meta.progress;
    meta.startedAt = now;
    meta.expiresAt = now + UPDATE_TIMEOUT;
    
    scheduleTimeout(module, UPDATE_TIMEOUT);
    persistUpdates();
  };

  /**
   * 停止更新
   * @param module 模块标识
   */
  const stopUpdate = (module: string) => {
    const meta = ensureModule(module);
    meta.updating = false;
    meta.progress = 0;
    meta.statusText = '';
    meta.message = '';
    meta.scope = 'page';
    meta.startedAt = 0;
    meta.expiresAt = 0;
    if (timeoutTimers.value[module]) {
      clearTimeout(timeoutTimers.value[module]!);
      timeoutTimers.value[module] = null;
    }
    persistUpdates();
  };

  const setUpdateProgress = (module: string, progress: number, message?: string) => {
    const meta = ensureModule(module);
    const nextProgress = Math.max(0, Math.min(100, Math.round(progress || 0)));
    meta.progress = meta.updating ? Math.max(meta.progress, nextProgress) : nextProgress;
    persistUpdates();
  };

  const setUpdateMessage = (module: string, message: string) => {
    const meta = ensureModule(module);
    meta.message = message;
    persistUpdates();
  };

  /**
   * 检查是否正在更新
   * @param module 模块标识
   */
  const isUpdating = (module: string): boolean => {
    return updatingModules.value[module]?.updating || false;
  };

  /**
   * 获取所有更新状态
   */
  const getAllUpdatingStates = () => {
    return { ...updatingModules.value };
  };

  const getModuleMeta = (module: string) => {
    return updatingModules.value[module] || createMeta();
  };

  const getActiveGlobalUpdates = () => {
    return Object.entries(updatingModules.value)
      .filter(([, meta]) => meta.updating && meta.scope === 'global')
      .map(([module, meta]) => ({ module, ...meta }));
  };

  Object.entries(updatingModules.value).forEach(([module, meta]) => {
    if (meta.updating && meta.expiresAt > Date.now()) {
      scheduleTimeout(module, meta.expiresAt - Date.now());
    }
  });

  return {
    updatingModules,
    startUpdate,
    stopUpdate,
    setUpdateProgress,
    setUpdateMessage,
    isUpdating,
    getAllUpdatingStates,
    getModuleMeta,
    getActiveGlobalUpdates,
  };
});
