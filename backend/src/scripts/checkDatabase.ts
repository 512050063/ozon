import prisma from '../config/database';

async function checkDatabase() {
  try {
    console.log('=== 检查数据库数据 ===');

    // 查询店铺数量
    const storeCount = await prisma.ozonStore.count();
    console.log(`店铺数量: ${storeCount}`);

    // 查询产品数量
    const productCount = await prisma.product.count();
    console.log(`产品数量: ${productCount}`);

    // 查询仓库商品数量
    const warehouseCount = await prisma.warehouseItem.count();
    console.log(`仓库商品数量: ${warehouseCount}`);

    // 查询仓库商品列表（包含产品信息）
    if (warehouseCount > 0) {
      const warehouseItems = await prisma.warehouseItem.findMany({
        include: { product: true },
        take: 5
      });

      console.log('\n=== 产品列表 ===');
      warehouseItems.forEach((item, index) => {
        console.log(`产品 ${index + 1}:`);
        console.log(`  ID: ${item.id}`);
        console.log(`  Ozon产品ID: ${item.ozonProductId}`);
        console.log(`  状态: ${item.status}`);
        console.log(`  库存: ${item.inventoryQuantity}`);
        if (item.product) {
          console.log(`  产品名称: ${item.product.titleOriginal}`);
          console.log(`  价格: ${item.product.price}`);
        }
      });
    } else {
      console.log('\n没有产品数据');
    }

  } catch (error) {
    console.error('检查数据库失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
