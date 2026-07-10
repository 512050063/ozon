import prisma from '../config/database';
import { syncProductsToDatabase, getOzonProductIds, getOzonProductDetails } from '../services/ozonProductService';
import logger from '../config/logger';

async function diagnoseSync() {
  try {
    console.log('=== 开始诊断同步问题 ===\n');

    // 获取店铺信息
    const store = await prisma.ozonStore.findFirst();
    if (!store) {
      console.log('错误：未找到店铺');
      return;
    }
    console.log(`使用店铺: ${store.name} (ID: ${store.id})\n`);

    // 测试1: 获取产品ID
    console.log('--- 测试1: 获取产品ID ---');
    const productIds = await getOzonProductIds(store, 1000, 0);
    console.log(`获取到 ${productIds.length} 个产品ID`);
    if (productIds.length > 0) {
      console.log('前5个产品ID:', productIds.slice(0, 5));
    }
    console.log('');

    // 测试2: 获取产品详情（只取前3个）
    console.log('--- 测试2: 获取产品详情 ---');
    const testIds = productIds.slice(0, 3);
    if (testIds.length > 0) {
      const products = await getOzonProductDetails(store, testIds);
      console.log(`获取到 ${products.length} 个产品详情`);
      for (const p of products) {
        console.log(`- ID: ${p.product_id}, 名称: ${p.name}`);
      }
    } else {
      console.log('没有产品ID可测试');
    }
    console.log('');

    // 测试3: 检查当前数据库状态
    console.log('--- 测试3: 检查当前数据库状态 ---');
    const productCount = await prisma.product.count();
    const warehouseItemCount = await prisma.warehouseItem.count();
    console.log(`产品表: ${productCount} 条记录`);
    console.log(`仓库表: ${warehouseItemCount} 条记录`);
    console.log('');

    // 测试4: 尝试运行一次小批量同步
    console.log('--- 测试4: 尝试运行同步 ---');
    const result = await syncProductsToDatabase(store.id, 1);
    console.log('同步结果:', result);
    console.log('');

    // 测试5: 再次检查数据库状态
    console.log('--- 测试5: 同步后的数据库状态 ---');
    const productCountAfter = await prisma.product.count();
    const warehouseItemCountAfter = await prisma.warehouseItem.count();
    console.log(`产品表: ${productCountAfter} 条记录`);
    console.log(`仓库表: ${warehouseItemCountAfter} 条记录`);

    if (warehouseItemCountAfter > 0) {
      const items = await prisma.warehouseItem.findMany({ take: 3, include: { product: true } });
      console.log('\n前3条仓库记录:');
      for (const item of items) {
        console.log(`- 仓库ID: ${item.id}, 产品ID: ${item.ozonProductId}, 产品标题: ${item.product?.titleOriginal}`);
      }
    }

  } catch (error: any) {
    console.error('诊断过程中出错:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseSync();
