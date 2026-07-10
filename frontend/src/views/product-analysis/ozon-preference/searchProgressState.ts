export const SEARCH_PROGRESS_STATE_KEY = 'pa_search_in_progress';
export const SEARCH_PROGRESS_MAX_AGE_MS = 2 * 60 * 1000;

export type SearchProgressStage = 'startup' | 'environment' | 'fetching' | 'parsing' | 'extracting';

export interface SearchProgressState {
  keyword: string;
  category?: string;
  stage: SearchProgressStage;
  progress: number;
  startedAt: number;
  updatedAt: number;
}

export interface SearchProgressCopy {
  title: string;
  subtitle: string;
}

const STAGE_COPY: Record<SearchProgressStage, SearchProgressCopy> = {
  startup: {
    title: '检查启动状态',
    subtitle: '正在确认任务和授权状态...',
  },
  environment: {
    title: '检测语言货币环境',
    subtitle: '正在确认 Ozon 中文和人民币环境...',
  },
  fetching: {
    title: '获取数据',
    subtitle: '正在从 Ozon 拉取商品列表...',
  },
  parsing: {
    title: '解析商品信息',
    subtitle: '正在整理商品价格、评价和库存...',
  },
  extracting: {
    title: '获取商品类型',
    subtitle: '正在匹配商品描述中的类型信息...',
  },
};

const clampProgress = (progress: number) => Math.max(0, Math.min(100, Math.round(progress)));

const normalizeSearchProgressState = (value: unknown): SearchProgressState | null => {
  if (!value || typeof value !== 'object') return null;
  const state = value as Partial<SearchProgressState>;
  if (!state.keyword || typeof state.keyword !== 'string') return null;
  if (!state.stage || !(state.stage in STAGE_COPY)) return null;
  const startedAt = Number(state.startedAt);
  const updatedAt = Number(state.updatedAt);
  if (!Number.isFinite(startedAt) || !Number.isFinite(updatedAt)) return null;

  return {
    keyword: state.keyword,
    category: typeof state.category === 'string' ? state.category : undefined,
    stage: state.stage,
    progress: clampProgress(Number(state.progress || 0)),
    startedAt,
    updatedAt,
  };
};

export const getSearchProgressCopy = (stage: SearchProgressStage): SearchProgressCopy => STAGE_COPY[stage];

export const writeSearchProgressState = (storage: Storage, state: SearchProgressState) => {
  const normalized = normalizeSearchProgressState(state);
  if (!normalized) return;
  storage.setItem(SEARCH_PROGRESS_STATE_KEY, JSON.stringify(normalized));
};

export const readSearchProgressState = (
  storage: Storage,
  now = Date.now(),
  maxAgeMs = SEARCH_PROGRESS_MAX_AGE_MS,
): SearchProgressState | null => {
  try {
    const raw = storage.getItem(SEARCH_PROGRESS_STATE_KEY);
    if (!raw) return null;
    const state = normalizeSearchProgressState(JSON.parse(raw));
    if (!state) {
      storage.removeItem(SEARCH_PROGRESS_STATE_KEY);
      return null;
    }
    if (now - state.updatedAt > maxAgeMs) {
      storage.removeItem(SEARCH_PROGRESS_STATE_KEY);
      return null;
    }
    return state;
  } catch {
    storage.removeItem(SEARCH_PROGRESS_STATE_KEY);
    return null;
  }
};

export const clearSearchProgressState = (storage: Storage) => {
  storage.removeItem(SEARCH_PROGRESS_STATE_KEY);
};
