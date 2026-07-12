const LOCAL_ASSISTANT_BASE_URL = 'http://127.0.0.1:17666';

export type LocalAssistantHealth = {
  name: string;
  version: number;
  repoRoot: string;
  workerRunning: boolean;
};

export type LocalAssistantEnvItem = {
  ok: boolean;
  value: string;
  hint: string;
};

export type LocalAssistantEnv = Record<string, LocalAssistantEnvItem>;

export type LocalAssistantWorkerStatus = {
  running: boolean;
  pid?: number | null;
  configPath: string;
  lastConfig?: Record<string, unknown>;
};

export type LocalAssistantStartResponse = {
  running: boolean;
  pid?: number | null;
  configPath: string;
};

export type LocalWorkerConfig = {
  apiBaseUrl: string;
  workerToken: string;
  repoRoot: string;
  pythonPath: string;
  pollIntervalSeconds: number;
  scriptTimeoutSeconds: number;
};

const requestAssistant = async <T>(path: string, options: RequestInit = {}, timeoutMs = 1800): Promise<T> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${LOCAL_ASSISTANT_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await response.json();
    if (!response.ok || data.success === false) {
      throw new Error(data.message || '本机助手请求失败');
    }
    return data.data as T;
  } finally {
    window.clearTimeout(timer);
  }
};

export const ozonLocalAssistantAPI = {
  getHealth: () => requestAssistant<LocalAssistantHealth>('/health'),

  checkEnv: () => requestAssistant<LocalAssistantEnv>('/env/check', {}, 3000),

  getWorkerStatus: () => requestAssistant<LocalAssistantWorkerStatus>('/worker/status'),

  startWorker: (config: LocalWorkerConfig) => requestAssistant<LocalAssistantStartResponse>('/worker/start', {
    method: 'POST',
    body: JSON.stringify({ config }),
  }, 5000),

  stopWorker: () => requestAssistant<LocalAssistantWorkerStatus>('/worker/stop', {
    method: 'POST',
    body: JSON.stringify({}),
  }, 3000),
};
