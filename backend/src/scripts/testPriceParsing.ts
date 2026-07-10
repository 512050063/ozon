import prisma from '../config/database';
import { getOzonProductIds, getOzonProductDetails } from '../services/ozonProductService';

async function testPriceParsing() {
  try {
    console.log('=== 测试 Ozon 价格数据格式 ===\n');

    // 获取店铺信息
    const store = await prisma.ozonStore.findFirst();
    if (!store) {
      console.error('❌ 没有找到店铺信息');
      return;
    }
    console.log('✅ 找到店铺:', store.name);

    // 获取一些产品 ID
    const productIds = await getOzonProductIds(store, 5, 0);
    console.log('✅ 获取到产品 ID:', productIds);

    // 获取产品详情
    const productDetails = await getOzonProductDetails(store, productIds);
    console.log('\n✅ 获取到产品详情:');

    productDetails.forEach((product, index) => {
      console.log(`\n产品 ${index + 1}:`);
      console.log('  - product_id:', product.product_id);
      console.log('  - name:', product.name);
      console.log('  - 原始价格数据:', JSON.stringify(product.price, null, 2));
      console.log('  - 完整产品数据:', JSON.stringify(product, null, 2));
    });

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPriceParsing();
