import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import logger from '../config/logger';
import { updateCachedOzonSearchProductDetails } from './ozonSearchService';
import {
  createBrowserTask,
  getTaskForUser,
  hasActiveWorkerForUser,
} from './ozonBrowserTaskService';

// 内存缓存：productUrl → type info
type TypeInfo = {
  type: string;
  source: string;
  title?: string;
  status: 'pending' | 'done' | 'error';
  message?: string;
};

type ScriptTypeResult = {
  url?: unknown;
  success?: boolean;
  type?: unknown;
  source?: unknown;
  title?: unknown;
  message?: unknown;
};

const typeCache = new Map<string, TypeInfo>();
let batchRunning = false;  // 标记批量脚本是否正在运行
let batchStartTime = 0;  // 批量任务开始时间
let lastTypeCacheSearchSyncAt = 0;
let activeWorkerBatchTask: { userId: number; taskId: number } | null = null;

// 持久化缓存文件路径
const SCRIPT_DATA_DIR = path.join(__dirname, '../../scripts/data');
const TYPE_CACHE_FILE = path.join(SCRIPT_DATA_DIR, 'ozon_type_cache.json');

export const normalizeTypeExtractionResult = (result: ScriptTypeResult): TypeInfo => {
  const type = String(result.type || '').trim();
  const source = String(result.source || '').trim();
  const title = result.title === undefined ? undefined : String(result.title || '').trim();
  const message = result.message === undefined ? undefined : String(result.message || '').trim();
  const hasType = type.length > 0;

  return {
    type,
    source,
    title,
    status: result.success && hasType ? 'done' : 'error',
    message: hasType ? message : (message || '未获取到商品类型，类型为空'),
  };
};

const normalizeCachedTypeInfo = (info: TypeInfo): TypeInfo => {
  if (info.status === 'done' && !String(info.type || '').trim()) {
    return {
      ...info,
      type: '',
      status: 'error',
      message: info.message || '历史缓存类型为空，已标记为失败',
    };
  }
  return info;
};

function syncSearchCachesFromTypeCache(force = false): number {
  const now = Date.now();
  if (!force && now - lastTypeCacheSearchSyncAt < 10_000) {
    return 0;
  }
  lastTypeCacheSearchSyncAt = now;

  let updated = 0;
  for (const [url, info] of typeCache.entries()) {
    if (info.status !== 'done' && !info.title) continue;
    updated += updateCachedOzonSearchProductDetails(url, {
      title: info.title,
      productType: info.type,
    });
  }
  if (updated > 0) {
    logger.info(`[类型缓存] 已反灌搜索缓存 ${updated} 条商品详情`);
  }
  return updated;
}

/**
 * 从持久化文件加载类型缓存到内存（模块启动时调用）
 */
function loadTypeCacheFromFile(): void {
  try {
    if (!fs.existsSync(TYPE_CACHE_FILE)) return;
    const raw = fs.readFileSync(TYPE_CACHE_FILE, 'utf-8');
    const data = JSON.parse(raw) as Record<string, TypeInfo>;
    for (const [url, info] of Object.entries(data)) {
      // 只恢复已完成或错误的，不覆盖 pending
      if (info.status === 'done' || info.status === 'error') {
        typeCache.set(url, normalizeCachedTypeInfo(info));
      }
    }
    logger.info(`[类型缓存] 已从文件恢复 ${typeCache.size} 条记录`);
    syncSearchCachesFromTypeCache(true);
  } catch (e) {
    logger.warn(`[类型缓存] 文件恢复失败: ${e}`);
  }
}

/**
 * 将内存缓存写入持久化文件
 */
function saveTypeCacheToFile(): void {
  try {
    const obj: Record<string, TypeInfo> = {};
    for (const [url, info] of typeCache.entries()) {
      obj[url] = info;
    }
    if (!fs.existsSync(SCRIPT_DATA_DIR)) {
      fs.mkdirSync(SCRIPT_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TYPE_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    logger.debug(`[类型缓存] 已写入 ${typeCache.size} 条记录到文件`);
  } catch (e) {
    logger.warn(`[类型缓存] 文件写入失败: ${e}`);
  }
}

// 启动时恢复缓存
loadTypeCacheFromFile();

/**
 * 强制重置批量提取状态（用于异常退出后手动清理）
 */
export const forceResetBatchStatus = (): void => {
  if (batchRunning) {
    logger.warn(`强制重置批量提取状态（原状态已运行 ${(Date.now() - batchStartTime) / 1000}秒）`);
  }
  batchRunning = false;
  batchStartTime = 0;
  activeWorkerBatchTask = null;
};

/**
 * 清空缓存（可选，用于新搜索时）
 */
export const clearTypeCache = (): void => {
  typeCache.clear();
  try {
    if (fs.existsSync(TYPE_CACHE_FILE)) {
      fs.unlinkSync(TYPE_CACHE_FILE);
    }
  } catch {}
  logger.info('类型缓存已清空');
};

/**
 * 获取缓存的类型
 */
export const getCachedType = (productUrl: string): TypeInfo | undefined => {
  return typeCache.get(productUrl);
};

/**
 * 批量提取商品类型（异步，不阻塞调用方）
 * 使用批量脚本一次启动Chrome处理所有URL，速度提升2-3倍
 */
const shouldUseLocalWorker = () => process.env.OZON_BROWSER_WORKER_MODE === 'required';

const applyTypeResult = (result: ScriptTypeResult): boolean => {
  const url = String(result.url || '').trim();
  if (!url) return false;
  const normalizedResult = normalizeTypeExtractionResult(result);
  typeCache.set(url, normalizedResult);
  updateCachedOzonSearchProductDetails(url, {
    title: normalizedResult.title,
    productType: normalizedResult.type,
  });
  logger.info(`[批量] ${url} -> ${normalizedResult.type || '(无)'} [${normalizedResult.source || '未知'}]`);
  return true;
};

const applyWorkerTypeTaskResult = (result: any): number => {
  let applied = 0;
  const progressResults = result?.progressResults;
  if (Array.isArray(progressResults)) {
    for (const item of progressResults) {
      if (applyTypeResult(item)) applied++;
    }
  }

  const stdout = String(result?.stdout || '');
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (applyTypeResult(parsed)) applied++;
    } catch {
      // 忽略进度输出
    }
  }

  const jsonResults = result?.json?.results;
  if (Array.isArray(jsonResults)) {
    for (const item of jsonResults) {
      if (applyTypeResult(item)) applied++;
    }
  }
  return applied;
};

const markPendingTypesAsError = (message: string) => {
  for (const [url, info] of typeCache.entries()) {
    if (info.status !== 'pending') continue;
    typeCache.set(url, {
      type: '',
      source: '',
      status: 'error',
      message,
    });
  }
};

export const batchExtractTypes = async (urls: string[], fallbackTitles: Record<string, string> = {}, userId?: number): Promise<{ total: number; started: boolean }> => {
  if (!urls || urls.length === 0) {
    return { total: 0, started: false };
  }

  // 超时保护：如果上次任务运行超过15分钟，自动重置
  if (batchRunning && batchStartTime > 0) {
    const runningTime = Date.now() - batchStartTime;
    if (runningTime > 15 * 60 * 1000) {  // 15分钟
      logger.warn(`检测到卡住的批量任务（已运行 ${runningTime / 1000}秒），自动重置状态`);
      batchRunning = false;
      batchStartTime = 0;
    }
  }

  if (batchRunning) {
    logger.warn('已有批量提取任务正在运行，跳过新的请求');
    return { total: urls.length, started: false };
  }

  clearTypeCache();
  batchRunning = true;
  batchStartTime = Date.now();  // 记录开始时间
  activeWorkerBatchTask = null;
  const total = urls.length;
  
  logger.info(`开始批量提取类型，共 ${total} 个商品（批量模式）`);

  // 标记所有为 pending
  for (const url of urls) {
    typeCache.set(url, { type: '', source: '', status: 'pending' });
  }

  if (shouldUseLocalWorker()) {
    if (!userId) {
      batchRunning = false;
      markPendingTypesAsError('当前登录状态无效，无法启动本机采集器类型任务');
      saveTypeCacheToFile();
      return { total, started: false };
    }

    if (!(await hasActiveWorkerForUser(userId))) {
      batchRunning = false;
      markPendingTypesAsError('本机采集器未在线，无法获取商品类型');
      saveTypeCacheToFile();
      return { total, started: false };
    }

    const task = await createBrowserTask(userId, {
      type: 'type_extract_batch',
      payload: { urls, titles: fallbackTitles },
      priority: 6,
      ttlMs: 20 * 60 * 1000,
    });
    activeWorkerBatchTask = { userId, taskId: task.id };
    saveTypeCacheToFile();
    logger.info(`已创建本机采集器类型提取任务: ${task.id}, URL数量: ${urls.length}`);
    return { total, started: true };
  }

  // 异步执行批量脚本
  (async () => {
    let stdout = '';
    let stderr = '';

    try {
      const scriptPath = path.join(__dirname, '../../scripts/ozon/ozon_extract_type_batch.py');
      const pythonPath = process.env.PYTHON_PATH || 'python';
      
      // 将 URL 列表作为 JSON 通过 stdin 传入
      const urlsJson = JSON.stringify({ urls, titles: fallbackTitles });
      
      logger.info(`执行批量脚本: ${scriptPath}, URL数量: ${urls.length}`);
      
      const child = exec(`"${pythonPath}" "${scriptPath}"`, {
        timeout: 600000,  // 10分钟超时
        encoding: 'utf8',
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      // 通过 stdin 传入 URL 列表
      child.stdin?.write(urlsJson);
      child.stdin?.end();

      child.stdout?.on('data', (data) => {
        stdout += data;
        // 实时解析每一行 JSON 结果
        const lines = data.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const result = JSON.parse(line);
            if (result.url && result.type !== undefined) {
              applyTypeResult(result);
              // 每提取到一条结果就立即写入持久化文件
              saveTypeCacheToFile();
            }
          } catch (e) {
            // 不是 JSON 行，可能是进度信息
            logger.debug(`[批量] 非JSON输出: ${line.substring(0, 100)}`);
          }
        }
      });

      child.stderr?.on('data', (data) => {
        stderr += data;
        logger.info(`[批量] ${data.trim()}`);
      });

      child.on('close', (code) => {
        const elapsed = (Date.now() - batchStartTime) / 1000;
        batchRunning = false;
        batchStartTime = 0;
        logger.info(`[批量] 脚本完成，退出码: ${code}，耗时: ${elapsed.toFixed(1)}秒`);
        // 完成后写入持久化文件
        saveTypeCacheToFile();
        if (code !== 0) {
          logger.error(`[批量] 脚本异常退出: ${stderr || '未知错误'}`);
        }
      });

      child.on('error', (error) => {
        batchRunning = false;
        batchStartTime = 0;
        logger.error(`[批量] 启动失败: ${error.message}`);
        saveTypeCacheToFile();
      });

    } catch (error: any) {
      batchRunning = false;
      logger.error(`[批量] 异常: ${error.message}`);
      saveTypeCacheToFile();
    }
  })();

  return { total, started: true };
};

/**
 * 获取批量提取状态
 */
export const getBatchExtractStatus = async () => {
  if (activeWorkerBatchTask && batchRunning) {
    const task = await getTaskForUser(activeWorkerBatchTask.userId, activeWorkerBatchTask.taskId);
    if (task?.result) {
      const applied = applyWorkerTypeTaskResult(task.result);
      if (applied > 0) saveTypeCacheToFile();
    }
    if (!task || ['failed', 'cancelled', 'expired'].includes(task.status)) {
      batchRunning = false;
      batchStartTime = 0;
      activeWorkerBatchTask = null;
      markPendingTypesAsError(task?.errorMessage || '本机采集器类型任务失败');
      saveTypeCacheToFile();
    } else if (task.status === 'success') {
      batchRunning = false;
      batchStartTime = 0;
      activeWorkerBatchTask = null;
      saveTypeCacheToFile();
    }
  }

  syncSearchCachesFromTypeCache();
  const total = typeCache.size;
  let done = 0;
  let error = 0;
  const results: Array<{url: string, type: string, title?: string, status: string}> = [];

  for (const [url, info] of typeCache.entries()) {
    if (info.status === 'done') done++;
    else if (info.status === 'error') error++;
    results.push({
      url,
      type: info.type,
      title: info.title,
      status: info.status
    });
  }

  return {
    running: batchRunning,
    total,
    done,
    error,
    results
  };
};

/**
 * 提取单个商品类型（兼容旧接口，内部也走批量逻辑）
 */
export const extractProductType = async (productUrl: string, userId?: number): Promise<{type: string, source: string, title?: string}> => {
  const cached = getCachedType(productUrl);
  if (cached && cached.status === 'done') {
    return { type: cached.type, source: cached.source, title: cached.title };
  }

  // 单个提取也走批量脚本
  const result = await batchExtractTypes([productUrl], {}, userId);
  if (!result.started) {
    return { type: '', source: '', title: '' };
  }

  // 等待完成（最多2分钟）
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const info = getCachedType(productUrl);
    if (info && (info.status === 'done' || info.status === 'error')) {
      return { type: info.type, source: info.source, title: info.title };
    }
  }

  return { type: '', source: '', title: '' };
};
