import request from './request';

export interface OzonProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  productUrl: string;
  stock: number;
  productType?: string;
  descriptionCategoryId?: number | null;
  typeId?: number | null;
}

export interface OzonBrowserTask {
  id: number;
  type: string;
  status: 'pending' | 'claimed' | 'running' | 'success' | 'failed' | 'cancelled' | 'expired';
  result?: any;
  errorCode?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 搜索Ozon商品
 * @param keyword - 搜索关键词
 * @param categoryId - 分类ID（可选）
 * @param page - 页码
 * @returns 商品列表
 */
const parseMoney = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value || '');
  const match = raw.match(/[\d\s\u00a0\u202f.,]+/);
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
};

const parseDiscount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const match = String(value || '').match(/[−-]?\s*(\d+(?:[,.]\d+)?)%?/);
  return match ? parseFloat(match[1].replace(',', '.')) || 0 : 0;
};

const deriveOriginalPrice = (price: number, originalPrice: number, discount: number): number => {
  if (discount > 0 && price > 0 && originalPrice <= price) {
    return Number((price / (1 - discount / 100)).toFixed(2));
  }
  return originalPrice;
};

export const normalizeOzonProducts = (items: any[] = []): OzonProduct[] => items.map((item: any) => {
  // 从链接中提取货号（最后面的数字）
  let productId = '';
  const link = item.link || item.productUrl || '';
  if (link) {
    // 匹配 URL 中最后的数字（货号）
    const idMatch = link.match(/(\d+)(?:\/|\?|$)/);
    if (idMatch) {
      productId = idMatch[1];
    }
  }

  const reviewCountStr = typeof item.reviewCount === 'number' ? String(item.reviewCount) : item.reviewCount?.replace(/[^\d]/g, '');
  const stockStr = typeof item.stock === 'number' ? String(item.stock) : item.stock?.replace(/[^\d]/g, '');
  const price = parseMoney(item.price);
  const discount = parseDiscount(item.discount);
  const originalPrice = deriveOriginalPrice(price, parseMoney(item.originalPrice), discount);

  return {
    id: productId || item.id || item.sku || '',
    name: item.title || item.name || '',
    price,
    originalPrice,
    discount,
    rating: parseFloat(item.rating) || 0,
    reviewCount: parseInt(reviewCountStr) || 0,
    imageUrl: item.mainImage || item.thumbnail || item.imageUrl || '',
    productUrl: link,
    stock: parseInt(stockStr) || 0,
    productType: item.productType || '',
    descriptionCategoryId: item.descriptionCategoryId ?? null,
    typeId: item.typeId ?? null,
  };
});

export async function searchOzonProducts(
  keyword: string,
  categoryId?: string,
  page: number = 1
): Promise<{ success: boolean; data: OzonProduct[]; message: string; code?: string; taskId?: number }> {
  const params = new URLSearchParams({
    keyword,
    page: page.toString(),
    _t: Date.now().toString(),
  });
  if (categoryId) {
    params.set('category', categoryId);
  }

  const response = await request.get(`/ozon/search/search?${params.toString()}`);

  if (response.success && response.data) {
    return {
      success: true,
      data: normalizeOzonProducts(response.data),
      message: response.message || '',
      code: response.code,
      taskId: response.taskId,
    };
  }

  return {
    success: response.success,
    data: [],
    message: response.message || '',
    code: response.code,
    taskId: response.taskId,
  };
}

export async function getOzonBrowserTask(taskId: number): Promise<{ success: boolean; data?: OzonBrowserTask; message: string }> {
  const response = await request.get(`/ozon/browser/tasks/${taskId}`);
  return {
    success: response.success,
    data: response.data,
    message: response.message || '',
  };
}

export async function getCachedOzonProducts(
  keyword: string
): Promise<{ success: boolean; data: OzonProduct[]; message: string; fromCache?: boolean; cacheAge?: string }> {
  const params = new URLSearchParams({ keyword });
  const response = await request.get(`/ozon/preference/search-cache?${params.toString()}`);
  return {
    success: response.success,
    data: response.success && response.data ? normalizeOzonProducts(response.data) : [],
    message: response.message || '',
    fromCache: Boolean(response.fromCache),
    cacheAge: response.cacheAge,
  };
}

/**
 * 获取Ozon热销商品
 * @param categoryId - 分类ID（可选）
 * @returns 热销商品列表
 */
export async function getOzonHotProducts(
  categoryId?: string
): Promise<{ success: boolean; data: OzonProduct[]; message: string }> {
  const params = new URLSearchParams();

  if (categoryId) {
    params.set('categoryId', categoryId);
  }

  const response = await request.get(`/ozon/crawler/hot?${params.toString()}`);
  return {
    success: response.success,
    data: response.data || [],
    message: response.message || '',
  };
}

/**
 * 批量提取商品类型
 * @param urls - 商品URL列表
 * @returns 提取结果
 */
export async function batchExtractTypes(
  urls: string[],
  titles?: Record<string, string>
): Promise<{ success: boolean; data: { total: number; started: boolean }; message: string }> {
  const response: any = await request.post('/ozon/type/batch-extract', { urls, titles });
  return {
    success: response.success,
    data: response.data || {
      total: response.total || 0,
      started: Boolean(response.started),
    },
    message: response.message || '',
  };
}

/**
 * 获取批量提取状态
 * @returns 提取状态
 */
export async function getBatchExtractStatus(): Promise<{
  success: boolean;
  data: {
    running: boolean;
    total: number;
    done: number;
    error: number;
    results: Array<{ url: string; type: string; title?: string; status: string }>;
  };
  message: string;
}> {
  const response: any = await request.get('/ozon/type/batch-status');
  return {
    success: response.success,
    data: response.data || {
      running: Boolean(response.running),
      total: response.total || 0,
      done: response.done || 0,
      error: response.error || 0,
      results: response.results || [],
    },
    message: response.message || '',
  };
}

/**
 * 通过 Ozon 商品链接解析单个商品
 */
export async function getOzonProductByUrl(
  productUrl: string
): Promise<{ success: boolean; data: OzonProduct; message: string; code?: string; taskId?: number }> {
  const response = await request.post('/ozon/search/product-by-url', { productUrl });
  return {
    success: response.success,
    data: response.data,
    message: response.message || '',
    code: response.code,
    taskId: response.taskId,
  };
}
