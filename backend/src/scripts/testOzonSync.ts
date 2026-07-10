
import prisma from '../config/database';
import { syncProductsToDatabase, getOzonProductIds, getOzonProductDetails } from '../services/ozonProductService';

async function testSync() {
  try {
    console.log('=== 开始测试Ozon同步功能 ===\n');

    // 1. 获取店铺信息
    const store = await prisma.ozonStore.findFirst();
    if (!store) {
      console.error('❌ 没有找到店铺信息');
      return;
    }
    console.log('✅ 找到店铺:', store.name, '(ID:', store.id, ')');
    console.log('Client ID:', store.clientId);
    console.log('');

    // 2. 测试获取产品ID
    console.log('📋 测试获取产品ID...');
    const productIds = await getOzonProductIds(store, 100, 0);
    console.log('✅ 获取到', productIds.length, '个产品ID');
    if (productIds.length > 0) {
      console.log('前10个ID:', productIds.slice(0, 10));
    }
    console.log('');

    // 3. 测试获取产品详情
    if (productIds.length > 0) {
      console.log('📦 测试获取产品详情...');
      const testIds = productIds.slice(0, 3);
      const productDetails = await getOzonProductDetails(store, testIds);
      console.log('✅ 获取到', productDetails.length, '个产品详情');
      productDetails.forEach((product, index) => {
        console.log(`产品${index + 1}:`);
        console.log('  - product_id:', product.product_id);
        console.log('  - name:', product.name);
        console.log('  - status:', product.statuses);
        console.log('  - price:', product.price);
        console.log('  - stocks:', product.stocks);
      });
    }
    console.log('');

    // 4. 测试实际同步
    console.log('🔄 测试完整同步流程...');
    const result = await syncProductsToDatabase(store.id, 1);
    console.log('✅ 同步完成:', result);

    // 5. 检查同步后的数据
    console.log('\n📊 检查同步后的数据库:');
    const warehouseItems = await prisma.warehouseItem.findMany({
      where: { ozonStoreId: store.id },
      include: { product: true }
    });
    console.log('warehouse_items 表中有', warehouseItems.length, '条记录');
    warehouseItems.forEach((item, index) => {
      console.log(`记录${index + 1}:`);
      console.log('  - ozonProductId:', item.ozonProductId);
      console.log('  - productId:', item.productId);
      console.log('  - product:', item.product?.titleOriginal);
    });

    console.log('\n🎉 测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();
