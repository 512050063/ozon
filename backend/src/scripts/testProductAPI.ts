import prisma from '../config/database';
import logger from '../config/logger';
import { getOzonProductIds, getOzonProductDetails } from '../services/ozonProductService';

async function testProductAPI() {
  try {
    logger.info('=== 测试Ozon API产品数据获取 ===');

    // 获取店铺信息
    const store = await prisma.ozonStore.findFirst();
    if (!store) {
      logger.error('未找到店铺信息');
      return;
    }

    logger.info(`使用店铺: ${store.name} (ID: ${store.id})`);

    // 测试获取产品ID
    logger.info('测试获取产品ID...');
    const productIds = await getOzonProductIds(store, 10, 0); // 获取前10个产品ID

    logger.info(`获取到 ${productIds.length} 个产品ID:`, productIds);

    if (productIds.length > 0) {
      // 测试获取产品详情
      logger.info('测试获取产品详情...');
      const productDetails = await getOzonProductDetails(store, productIds.slice(0, 2)); // 获取前2个产品详情

      logger.info(`获取到 ${productDetails.length} 个产品详情`);

      productDetails.forEach((product, index) => {
        logger.info(`产品 ${index + 1}:`, {
          product_id: product.product_id,
          name: product.name,
          price: product.price,
          old_price: product.old_price,
          stock: product.stock
        });
      });
    } else {
      logger.warn('未获取到产品ID，可能是API返回空数据');
    }
  } catch (error) {
    logger.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProductAPI();
