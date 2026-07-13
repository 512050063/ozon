import logger from '../config/logger';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { invalidateCookieStatus } from './ozonPreferenceService';
import { translateText } from './translationService';

export interface OzonSearchProduct {
  sku: string;
  link: string;
  thumbnail: string;
  mainImage: string;
  title: string;
  productType?: string;
  price: string;
  originalPrice: string;
  discount: string;
  rating: string;
  reviewCount: string;
  stock: string;
}

export interface SearchResult {
  success: boolean;
  data: OzonSearchProduct[];
  message: string;
  code?: string;
  fromCache?: boolean;
  cacheAge?: string;
}

const COOKIE_DIR = path.join(__dirname, '../../scripts/data');
const CACHE_DIR = path.join(COOKIE_DIR, 'cache');
const COOKIE_FILE = path.join(COOKIE_DIR, 'ozon_cookies.json');
const USER_SCRIPT_FILE = path.join(__dirname, '../../scripts/ozon/ozon_search.py');
const RESULT_FILE = path.join(COOKIE_DIR, '_ozon_result.json');

const CJK_PATTERN = /[\u3400-\u9fff]/;
const SEARCH_TERM_FALLBACKS: Array<[string, string]> = [
  ['蓝牙耳机', 'беспроводные наушники'],
  ['无线耳机', 'беспроводные наушники'],
  ['头戴耳机', 'накладные наушники'],
  ['入耳式耳机', 'внутриканальные наушники'],
  ['耳机', 'наушники'],
  ['手机壳', 'чехол для телефона'],
  ['手机膜', 'защитное стекло для телефона'],
  ['充电器', 'зарядное устройство'],
  ['数据线', 'кабель для зарядки'],
  ['键盘', 'клавиатура'],
  ['鼠标', 'мышь'],
  ['音箱', 'колонка'],
  ['手表', 'часы'],
  ['玩具', 'игрушки'],
  ['背包', 'рюкзак'],
  ['女装', 'женская одежда'],
  ['男装', 'мужская одежда'],
  ['鞋', 'обувь'],
];

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * 获取 Ozon 配置（searchLimit、cacheMaxAge）
 */
async function getOzonConfig(): Promise<{ searchLimit: number; cacheMaxAge: number }> {
  try {
    const fs = require('fs');
    const path = require('path');
    const configFile = path.join(__dirname, '../../scripts/data/ozon_config.json');
    if (fs.existsSync(configFile)) {
      const content = fs.readFileSync(configFile, 'utf-8');
      const config = JSON.parse(content);
      return {
        searchLimit: config.searchLimit ?? 50,
        cacheMaxAge: config.cacheMaxAge ?? 2,
      };
    }
  } catch (err) {
    logger.warn(`读取 ozon_config.json 失败，使用默认值: ${err}`);
  }
  return { searchLimit: 50, cacheMaxAge: 2 };
}

/**
 * 获取关键词对应的缓存文件路径
 */
function getCacheFilePath(keyword: string): string {
  const hash = crypto.createHash('md5').update(keyword).digest('hex');
  return path.join(CACHE_DIR, `search_${hash}.json`);
}

const DELIVERY_TITLE_PATTERN = /^(\d+\s*分钟内|一小时内|\d+\s*小时内|今天|明天|后天|[一二三四五六七]月\d{1,2}日)/;

function normalizeProductUrl(productUrl: string): string {
  try {
    const url = new URL(productUrl);
    if (url.hostname.includes('ozon.ru') && url.pathname.includes('/product/')) {
      return `${url.origin}${url.pathname}`;
    }
  } catch {
    // ignore invalid URLs and fall back to string cleanup
  }
  return String(productUrl || '').split('?')[0].split('#')[0];
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const match = String(value || '').match(/[\d\s\u00a0\u202f.,]+/);
  if (!match) return 0;

  let token = match[0].replace(/[\s\u00a0\u202f]/g, '');
  const commaIndex = token.lastIndexOf(',');
  const dotIndex = token.lastIndexOf('.');
  if (commaIndex >= 0 && dotIndex >= 0) {
    token = commaIndex > dotIndex
      ? token.replace(/\./g, '').replace(',', '.')
      : token.replace(/,/g, '');
  } else if (commaIndex >= 0) {
    token = token.replace(',', '.');
  }

  const parsed = parseFloat(token);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDiscount(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const match = String(value || '').match(/[−-]\s*(\d+(?:[,.]\d+)?)%/);
  return match ? parseFloat(match[1].replace(',', '.')) || 0 : 0;
}

function hasInvalidDiscountPrice(item: any): boolean {
  const price = parseMoney(item.price);
  const originalPrice = parseMoney(item.original_price || item.originalPrice);
  const discount = parseDiscount(item.discount);
  return discount > 0 && price > 0 && originalPrice <= price;
}

function isBadCachedProduct(item: any): boolean {
  const title = String(item.title || '').trim();
  return DELIVERY_TITLE_PATTERN.test(title) || hasInvalidDiscountPrice(item);
}

function hasMeaningfulTitle(title: unknown): title is string {
  const value = String(title || '').trim();
  return value.length > 1 &&
    !DELIVERY_TITLE_PATTERN.test(value) &&
    !/(大促销|评价积分|哇-价格|本周折扣|剩余数量|降价|就是这个价)/.test(value) &&
    !/^[−-]?\d+%$/.test(value) &&
    !/^(还剩\d+件?|[\d\s]+评价积分)$/.test(value);
}

function updateProductsInCacheFile(
  filePath: string,
  productUrl: string,
  details: { title?: string; productType?: string },
): number {
  if (!fs.existsSync(filePath)) return 0;

  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.trim()) return 0;

  let cached: any;
  try {
    cached = JSON.parse(content);
  } catch {
    return 0;
  }

  if (!cached.products || !Array.isArray(cached.products)) return 0;

  const targetUrl = normalizeProductUrl(productUrl);
  let updated = 0;

  cached.products = cached.products.map((item: any) => {
    const itemUrl = normalizeProductUrl(item.link || item.productUrl || '');
    if (!itemUrl || itemUrl !== targetUrl) return item;

    const next = { ...item };
    if (hasMeaningfulTitle(details.title)) {
      next.title = details.title.trim();
      next.name = details.title.trim();
    }
    if (details.productType && String(details.productType).trim()) {
      next.productType = String(details.productType).trim();
    }
    updated++;
    return next;
  });

  if (updated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(cached, null, 2), 'utf-8');
    fs.utimesSync(filePath, stat.atime, stat.mtime);
  }

  return updated;
}

export function updateCachedOzonSearchProductDetails(
  productUrl: string,
  details: { title?: string; productType?: string },
): number {
  if (!productUrl || (!hasMeaningfulTitle(details.title) && !details.productType)) {
    return 0;
  }

  let updated = 0;
  try {
    const files = fs.existsSync(CACHE_DIR)
      ? fs.readdirSync(CACHE_DIR).filter(file => /^search_.*\.json$/.test(file))
      : [];

    for (const file of files) {
      updated += updateProductsInCacheFile(path.join(CACHE_DIR, file), productUrl, details);
    }
    updated += updateProductsInCacheFile(RESULT_FILE, productUrl, details);

    if (updated > 0) {
      logger.info(`已用详情页数据更新搜索缓存: ${productUrl} (${updated} 条)`);
    }
  } catch (err) {
    logger.warn(`更新搜索缓存商品详情失败: ${err}`);
  }

  return updated;
}

function containsCjk(text: string): boolean {
  return CJK_PATTERN.test(text);
}

function applySearchTermFallback(text: string): string {
  return SEARCH_TERM_FALLBACKS
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((result, [source, target]) => result.split(source).join(target), text)
    .replace(/\s+/g, ' ')
    .trim();
}

async function resolveSearchText(keyword: string, category?: string): Promise<string> {
  const rawSearchText = `${keyword || ''}${category && category !== keyword ? ` ${category}` : ''}`.trim();
  if (!containsCjk(rawSearchText)) {
    return rawSearchText;
  }

  try {
    const translated = (await translateText(rawSearchText, 'zh', 'ru')).trim();
    if (translated && translated !== rawSearchText && !containsCjk(translated)) {
      logger.info(`中文搜索词已通过翻译服务转换: ${rawSearchText} -> ${translated}`);
      return translated;
    }
  } catch (err) {
    logger.warn(`中文搜索词翻译失败，使用本地映射: ${err}`);
  }

  const fallbackText = applySearchTermFallback(rawSearchText);
  if (fallbackText !== rawSearchText && !containsCjk(fallbackText)) {
    logger.info(`中文搜索词已通过本地映射转换: ${rawSearchText} -> ${fallbackText}`);
    return fallbackText;
  }

  logger.warn(`中文搜索词未能转换为俄文，将使用原词搜索: ${rawSearchText}`);
  return rawSearchText;
}

/**
 * 检查缓存是否有效
 */
function checkCache(keyword: string, cacheMaxAgeHours: number, minCount: number): OzonSearchProduct[] | null {
  const cacheFile = getCacheFilePath(keyword);
  if (!fs.existsSync(cacheFile)) return null;

  try {
    const stat = fs.statSync(cacheFile);
    const ageMs = Date.now() - stat.mtimeMs;
    const maxAgeMs = cacheMaxAgeHours * 60 * 60 * 1000;

    if (ageMs > maxAgeMs) {
      logger.info(`缓存已过期 (${(ageMs / 1000 / 60).toFixed(0)} 分钟前，最长 ${cacheMaxAgeHours} 小时)`);
      return null;
    }

    const content = fs.readFileSync(cacheFile, 'utf-8');
    const cached = JSON.parse(content);

    if (cached.products && Array.isArray(cached.products)) {
      if (cached.products.length === 0) {
        logger.warn(`删除空搜索缓存: ${cacheFile}`);
        try {
          fs.unlinkSync(cacheFile);
        } catch (err) {
          logger.warn(`删除空搜索缓存失败: ${err}`);
        }
        return null;
      }
      if (minCount > 0 && cached.products.length < minCount) {
        logger.info(`缓存数量不足: ${keyword} (${cached.products.length}/${minCount})，重新搜索`);
        return null;
      }
      if (cached.products.some(isBadCachedProduct)) {
        logger.info(`搜索缓存包含异常商品名或折扣原价，重新搜索: ${keyword}`);
        return null;
      }

      const ageMinutes = Math.round(ageMs / 1000 / 60);
      logger.info(`命中缓存: ${keyword} (${ageMinutes} 分钟前)`);
      return cached.products.map((item: any) => ({
        sku: item.sku || '',
        link: item.link || '',
        thumbnail: item.thumbnail || '',
        mainImage: item.main_image || item.mainImage || '',
        title: item.title || '',
        productType: item.productType || item.product_type || '',
        price: item.price || '',
        originalPrice: item.original_price || item.originalPrice || '',
        discount: item.discount || '',
        rating: item.rating || '',
        reviewCount: item.review_count || item.reviewCount || '',
        stock: item.stock || ''
      }));
    }
    return null;
  } catch (err) {
    logger.warn(`读取缓存失败: ${err}`);
    return null;
  }
}

export async function getCachedOzonSearchProducts(keyword: string): Promise<SearchResult> {
  const config = await getOzonConfig();
  const cached = checkCache(keyword, config.cacheMaxAge, config.searchLimit);

  if (!cached) {
    return {
      success: true,
      data: [],
      message: '未命中搜索缓存',
      fromCache: false,
    };
  }

  const cacheFile = getCacheFilePath(keyword);
  const stat = fs.statSync(cacheFile);
  const ageMinutes = Math.round((Date.now() - stat.mtimeMs) / 1000 / 60);

  return {
    success: true,
    data: cached,
    message: `成功获取 ${cached.length} 个商品（缓存，${ageMinutes} 分钟前）`,
    fromCache: true,
    cacheAge: `${ageMinutes}分钟前`,
  };
}

/**
 * 保存缓存
 */
function saveCache(keyword: string, products: OzonSearchProduct[]): void {
  if (products.length === 0) {
    logger.warn(`跳过空搜索结果缓存: ${keyword}`);
    return;
  }
  try {
    const cacheFile = getCacheFilePath(keyword);
    fs.writeFileSync(cacheFile, JSON.stringify({
      keyword,
      cachedAt: new Date().toISOString(),
      products,
    }, null, 2), 'utf-8');
    logger.info(`缓存已保存: ${cacheFile}`);
  } catch (err) {
    logger.warn(`保存缓存失败: ${err}`);
  }
}

function normalizeRawProducts(items: any[] = []): OzonSearchProduct[] {
  return items.map((item: any) => ({
    sku: item.sku || '',
    link: item.link || item.productUrl || '',
    thumbnail: item.thumbnail || '',
    mainImage: item.main_image || item.mainImage || '',
    title: item.title || item.name || '',
    productType: item.productType || item.product_type || '',
    price: item.price || '',
    originalPrice: item.original_price || item.originalPrice || '',
    discount: item.discount || '',
    rating: item.rating || '',
    reviewCount: item.review_count || item.reviewCount || '',
    stock: item.stock || ''
  }));
}

export function saveOzonSearchCacheFromWorkerResult(keyword: string, result: any): number {
  const json = result?.json || result;
  const products = json?.products || json?.data || [];
  if (!keyword || !Array.isArray(products) || products.length === 0) {
    return 0;
  }
  const normalized = normalizeRawProducts(products);
  saveCache(keyword, normalized);
  return normalized.length;
}

/**
 * 解析脚本输出中的商品数据
 */
function parseProductsFromOutput(stdout: string): OzonSearchProduct[] | null {
  // Python 脚本最后输出 JSON 行
  const lines = stdout.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    try {
      const parsed = JSON.parse(line);
      if (parsed.products && Array.isArray(parsed.products)) {
        return parsed.products.map((item: any) => ({
          sku: item.sku || '',
          link: item.link || '',
          thumbnail: item.thumbnail || '',
          mainImage: item.main_image || '',
          title: item.title || '',
          productType: item.productType || item.product_type || '',
          price: item.price || '',
          originalPrice: item.original_price || '',
          discount: item.discount || '',
          rating: item.rating || '',
          reviewCount: item.review_count || '',
          stock: item.stock || ''
        }));
      }
    } catch {
      // 不是 JSON 行，继续往前找
    }
  }
  return null;
}

function extractKnownSearchScriptError(output: string): string {
  const knownMessages = [
    'Ozon返回错误页，请稍后重试或重新获取Cookie',
    'Ozon页面仍返回卢布价格，请重新获取Cookie并确认货币为人民币',
  ];
  for (const message of knownMessages) {
    if (output.includes(message)) {
      return message;
    }
  }
  return '';
}

/**
 * 从结果文件读取商品数据
 */
function readProductsFromResultFile(options: {
  keyword?: string;
  category?: string;
  minMtimeMs?: number;
} = {}): OzonSearchProduct[] | null {
  if (!fs.existsSync(RESULT_FILE)) {
    return null;
  }
  try {
    const stat = fs.statSync(RESULT_FILE);
    if (options.minMtimeMs && stat.mtimeMs + 1000 < options.minMtimeMs) {
      logger.warn(`忽略旧搜索结果文件: ${RESULT_FILE}`);
      return null;
    }

    const content = fs.readFileSync(RESULT_FILE, 'utf-8');
    const result = JSON.parse(content);
    if (options.keyword && result.keyword !== options.keyword) {
      logger.warn(`忽略关键词不匹配的搜索结果文件: expected=${options.keyword}, actual=${result.keyword}`);
      return null;
    }
    if (options.category !== undefined && (result.category || '') !== (options.category || '')) {
      logger.warn(`忽略类目不匹配的搜索结果文件: expected=${options.category || ''}, actual=${result.category || ''}`);
      return null;
    }

    if (result.products && Array.isArray(result.products)) {
      return result.products.map((item: any) => ({
        sku: item.sku || '',
        link: item.link || '',
        thumbnail: item.thumbnail || '',
        mainImage: item.main_image || '',
        title: item.title || '',
        productType: item.productType || item.product_type || '',
        price: item.price || '',
        originalPrice: item.original_price || '',
        discount: item.discount || '',
        rating: item.rating || '',
        reviewCount: item.review_count || '',
        stock: item.stock || ''
      }));
    }
    return null;
  } catch {
    return null;
  }
}

export async function searchOzonProducts(keyword: string, category?: string): Promise<SearchResult> {
  logger.info(`开始搜索Ozon商品: ${keyword}${category ? `, category=${category}` : ''}`);

  // 读取配置
  const config = await getOzonConfig();
  logger.info(`配置: searchLimit=${config.searchLimit}, cacheMaxAge=${config.cacheMaxAge}h`);

  // 检查缓存（非强制刷新时使用）
  const cached = checkCache(keyword, config.cacheMaxAge, config.searchLimit);
  if (cached) {
    const cacheFile = getCacheFilePath(keyword);
    const stat = fs.statSync(cacheFile);
    const ageMinutes = Math.round((Date.now() - stat.mtimeMs) / 1000 / 60);
    return {
      success: true,
      data: cached,
      message: `成功获取 ${cached.length} 个商品（缓存，${ageMinutes} 分钟前）`,
      fromCache: true,
      cacheAge: `${ageMinutes}分钟前`,
    };
  }

  // 检查脚本文件
  if (!fs.existsSync(USER_SCRIPT_FILE)) {
    logger.error(`未找到搜索脚本: ${USER_SCRIPT_FILE}`);
    return {
      success: false,
      data: [],
      message: `未找到搜索脚本: ${USER_SCRIPT_FILE}`
    };
  }

  // 检查 Cookie
  if (!fs.existsSync(COOKIE_FILE)) {
    invalidateCookieStatus().catch(() => {});
    return {
      success: false,
      data: [],
      message: '未找到有效的Cookie数据，请先配置Cookie',
      code: 'COOKIE_EXPIRED'
    };
  }

  const searchText = await resolveSearchText(keyword, category);

  return new Promise((resolve) => {
    const pythonPath = process.env.PYTHON_PATH || 'py';
    // 将 searchLimit 作为第二个参数传给 Python 脚本
    const args = [USER_SCRIPT_FILE, keyword, String(config.searchLimit), category || '', searchText];
    const runStartedAt = Date.now();
    try {
      if (fs.existsSync(RESULT_FILE)) {
        fs.unlinkSync(RESULT_FILE);
      }
    } catch (err) {
      logger.warn(`清理旧搜索结果文件失败: ${err}`);
    }
    logger.info(`正在执行搜索脚本: ${pythonPath} ${args.map(arg => `"${arg}"`).join(' ')}`);

    execFile(pythonPath, args, {
      timeout: 120000, 
      encoding: 'utf-8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    }, (error, stdout, stderr) => {
      if (error) {
        const scriptOutput = `${stdout || ''}\n${stderr || ''}\n${error.message || ''}`;
        const expectedMessage = extractKnownSearchScriptError(scriptOutput);
        const message = error.killed
          ? '搜索超时：Ozon访问无响应或被拦截，请稍后重试或重新获取Cookie'
          : expectedMessage || `搜索失败: ${error.message}`;
        logger.error(`搜索脚本执行失败: ${message}`);
        // 仅接受本次脚本新生成且查询条件匹配的结果文件，避免返回上一次搜索残留数据。
        const fallback = readProductsFromResultFile({
          keyword,
          category: category || '',
          minMtimeMs: runStartedAt,
        });
        if (fallback) {
          resolve({
            success: true,
            data: fallback,
            message: `成功获取 ${fallback.length} 个商品（从文件读取）`
          });
          return;
        }
        resolve({
          success: false,
          data: [],
          message,
          code: error.killed ? 'OZON_BLOCKED_OR_TIMEOUT' : expectedMessage ? 'OZON_SCRIPT_ERROR' : undefined,
        });
        return;
      }

      if (stderr) {
        logger.warn(`脚本警告: ${stderr}`);
      }

      // 优先从本次脚本生成的结果文件读取
      const fileProducts = readProductsFromResultFile({
        keyword,
        category: category || '',
        minMtimeMs: runStartedAt,
      });
      if (fileProducts) {
        if (fileProducts.length === 0) {
          resolve({
            success: false,
            data: [],
            message: '未搜索到商品，请检查关键词或稍后重试'
          });
          return;
        }
        saveCache(keyword, fileProducts);
        resolve({
          success: true,
          data: fileProducts,
          message: `成功获取 ${fileProducts.length} 个商品`
        });
        return;
      }

      // 尝试从脚本 stdout 解析
      if (stdout) {
        const parsedProducts = parseProductsFromOutput(stdout);
        if (parsedProducts) {
          if (parsedProducts.length === 0) {
            resolve({
              success: false,
              data: [],
              message: '未搜索到商品，请检查关键词或稍后重试'
            });
            return;
          }
          saveCache(keyword, parsedProducts);
          resolve({
            success: true,
            data: parsedProducts,
            message: `成功获取 ${parsedProducts.length} 个商品`
          });
          return;
        }
      }

      resolve({
        success: false,
        data: [],
        message: '脚本未生成有效的商品数据'
      });
    });
  });
}
