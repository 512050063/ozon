import logger from '../config/logger';
import { exec } from 'child_process';
import * as path from 'path';

interface OzonProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  productUrl: string;
  stock: string;
}

interface CrawlResult {
  success: boolean;
  data: OzonProduct[];
  message: string;
}

// 解析价格字符串为数字
function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const match = priceStr.match(/[\d.,]+/);
  if (match) {
    return parseFloat(match[0].replace(',', ''));
  }
  return 0;
}

// 解析折扣字符串为数字
function parseDiscount(discountStr: string): number {
  if (!discountStr) return 0;
  const match = discountStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// 解析评价数字符串
function parseReviewCount(reviewsStr: string): number {
  if (!reviewsStr) return 0;
  const match = reviewsStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// 调用Python脚本获取真实数据
async function crawlWithPythonScript(keyword: string, limit: number = 10): Promise<CrawlResult> {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '../../scripts/ozon/ozon_search.py');
    const command = `python "${scriptPath}" "${keyword}" ${limit}`;
    
    logger.info(`正在调用Python脚本: ${command}`);
    
    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Python脚本执行失败: ${error.message}`);
        resolve({
          success: false,
          data: [],
          message: `Python脚本执行失败: ${error.message}`
        });
        return;
      }
      
      if (stderr) {
        logger.warn(`Python脚本警告: ${stderr}`);
      }
      
      try {
        const result = JSON.parse(stdout);
        
        if (!result.success) {
          resolve({
            success: false,
            data: [],
            message: result.message || '未获取到商品数据'
          });
          return;
        }
        
        // 转换数据格式
        const products: OzonProduct[] = result.data.map((item: any) => ({
          id: item.id || '',
          name: item.title || item.name || '',
          brand: item.brand || '',
          price: parsePrice(item.current_price),
          originalPrice: parsePrice(item.original_price),
          discount: parseDiscount(item.discount),
          rating: parseFloat(item.rating) || 0,
          reviewCount: parseReviewCount(item.reviews),
          imageUrl: item.main_image || item.imageUrl || '',
          productUrl: item.url || item.productUrl || '',
          stock: item.stock || '充足'
        }));
        
        resolve({
          success: true,
          data: products,
          message: `成功获取 ${products.length} 个商品`
        });
      } catch (parseError) {
        const errorMsg = (parseError as Error).message || String(parseError);
        logger.error(`解析Python脚本输出失败: ${errorMsg}`);
        resolve({
          success: false,
          data: [],
          message: `解析数据失败: ${errorMsg}`
        });
      }
    });
  });
}

// 搜索Ozon商品
export async function crawlOzonProducts(
  keyword: string,
  categoryId?: string,
  page: number = 1
): Promise<CrawlResult> {
  logger.info(`开始搜索Ozon商品: keyword=${keyword}, categoryId=${categoryId}, page=${page}`);
  
  try {
    // 直接调用Python脚本获取真实数据
    const result = await crawlWithPythonScript(keyword, 10);
    
    if (result.success && result.data.length > 0) {
      return result;
    }
    
    // 如果没有获取到数据，返回明确的错误信息
    return {
      success: false,
      data: [],
      message: result.message || '未找到匹配的商品'
    };
    
  } catch (error: any) {
    logger.error(`Ozon商品搜索失败: ${error.message}`);
    return {
      success: false,
      data: [],
      message: `搜索失败: ${error.message}`
    };
  }
}

// 获取热销商品
export async function getOzonHotProducts(categoryId?: string): Promise<CrawlResult> {
  logger.info(`获取Ozon热销商品: categoryId=${categoryId}`);
  
  try {
    // 默认搜索热门商品关键词
    const hotKeywords = ['耳机', '手机壳', '充电宝', '数据线'];
    const randomKeyword = hotKeywords[Math.floor(Math.random() * hotKeywords.length)];
    
    const result = await crawlWithPythonScript(randomKeyword, 10);
    
    if (result.success && result.data.length > 0) {
      return result;
    }
    
    return {
      success: false,
      data: [],
      message: result.message || '未获取到热销商品'
    };
    
  } catch (error: any) {
    logger.error(`获取Ozon热销商品失败: ${error.message}`);
    return {
      success: false,
      data: [],
      message: `获取热销商品失败: ${error.message}`
    };
  }
}
