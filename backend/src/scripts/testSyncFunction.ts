import prisma from '../config/database';
import logger from '../config/logger';
import { syncProductsToDatabase } from '../services/ozonProductService';

async function testSyncFunction() {
  try {
    logger.info('=== 直接测试同步函数 ===');

    const store = await prisma.ozonStore.findFirst();
    if (!store) {
      logger.error('未找到店铺');
      return;
    }

    logger.info(`使用店铺: ${store.name} (ID: ${store.id})`);

    logger.info('开始同步...');

    const result = await syncProductsToDatabase(store.id);

    logger.info('同步结果:', result);

    logger.info('\n=== 同步后的数据库状态 ===');
    logger.info('店铺数量:', await prisma.ozonStore.count());
    logger.info('产品数量:', await prisma.product.count());
    logger.info('仓库商品数量:', await prisma.warehouseItem.count());

    logger.info('\n产品记录:');
    const products = await prisma.product.findMany();
    console.log(products);

    logger.info('\n仓库商品记录:');
    const warehouseItems = await prisma.warehouseItem.findMany({
      include: { product: true }
    });
    console.log(warehouseItems);

  } catch (error) {
    logger.error('同步测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSyncFunction();
