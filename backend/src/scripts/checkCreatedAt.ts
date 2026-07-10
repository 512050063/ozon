import prisma from '../config/database';
import { getOzonProductDetails, getOzonProductIds } from '../services/ozonProductService';
import logger from '../config/logger';

async function checkCreatedAt() {
  try {
    console.log('=== 检查 Ozon API 返回的 created_at 字段 ===\n');

    const store = await prisma.ozonStore.findFirst();
    if (!store) {
      console.log('错误：未找到店铺');
      return;
    }
    console.log(`使用店铺: ${store.name} (ID: ${store.id})\n`);

    const productIds = await getOzonProductIds(store, 3, 0);
    console.log(`获取到 ${productIds.length} 个产品ID\n`);

    const products = await getOzonProductDetails(store, productIds);
    console.log(`获取到 ${products.length} 个产品详情\n`);

    for (const product of products) {
      console.log(`产品ID: ${product.product_id}, 名称: ${product.name}`);
      console.log('原始数据结构:', JSON.stringify(product, null, 2));
      console.log('\n---\n');
    }
  } catch (error: any) {
    console.error('检查失败:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkCreatedAt();
