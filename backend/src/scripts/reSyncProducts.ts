import prisma from '../config/database';
import { syncProductsToDatabase } from '../services/ozonProductService';

async function reSyncProducts() {
  try {
    console.log('=== 重新同步 Ozon 产品 ===\n');

    // 获取店铺信息
    const store = await prisma.ozonStore.findFirst();
    if (!store) {
      console.error('❌ 没有找到店铺信息');
      return;
    }
    console.log('✅ 找到店铺:', store.name);

    // 删除现有的产品数据
    console.log('🗑️ 删除现有产品数据...');
    const deleteResult = await prisma.warehouseItem.deleteMany({
      where: { ozonStoreId: store.id }
    });
    console.log('✅ 删除了', deleteResult.count, '条仓库产品记录');

    const deleteProductResult = await prisma.product.deleteMany({
      where: { category: 'ozon_product' }
    });
    console.log('✅ 删除了', deleteProductResult.count, '条产品记录');

    // 重新同步产品
    console.log('🔄 开始重新同步产品...');
    const syncResult = await syncProductsToDatabase(store.id, 1);
    console.log('✅ 同步完成:', syncResult);

    // 验证价格数据
    console.log('\n📊 验证价格数据:');
    const warehouseItems = await prisma.warehouseItem.findMany({
      where: { ozonStoreId: store.id },
      include: { product: true }
    });

    let hasPriceZero = false;
    warehouseItems.forEach((item, index) => {
      console.log(`产品${index + 1}: `);
      console.log(`  - 产品ID: ${item.ozonProductId}`);
      console.log(`  - 产品名称: ${item.product?.titleOriginal}`);
      console.log(`  - 价格: ${item.product?.price}`);

      if (item.product?.price === 0) {
        hasPriceZero = true;
      }
    });

    console.log('\n📈 统计:');
    console.log('  - 总产品数:', warehouseItems.length);
    const zeroPriceCount = warehouseItems.filter(item => item.product?.price === 0).length;
    console.log('  - 价格为0的产品数:', zeroPriceCount);

    if (zeroPriceCount > 0) {
      console.log('❌ 警告: 仍然有产品价格为0');
    } else {
      console.log('✅ 所有产品价格都已正确解析');
    }

    console.log('\n🎉 重新同步完成！');
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reSyncProducts();
