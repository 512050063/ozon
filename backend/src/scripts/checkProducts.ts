import prisma from '../config/database';

async function checkProducts() {
  try {
    console.log('=== 检查数据库中的产品 ===');

    const productCount = await prisma.product.count();
    console.log(`产品表中的产品总数: ${productCount}`);

    const warehouseItemCount = await prisma.warehouseItem.count();
    console.log(`仓库表中的产品总数: ${warehouseItemCount}`);

    const warehouseItems = await prisma.warehouseItem.findMany({
      take: 10,
      include: { product: true }
    });

    console.log('\n仓库表中的前10条记录:');
    for (const item of warehouseItems) {
      console.log(`- ID: ${item.id}, ProductID: ${item.ozonProductId}, Product: ${item.product?.titleOriginal}`);
    }

    const allProducts = await prisma.product.findMany({ take: 10 });
    console.log('\n产品表中的前10条记录:');
    for (const product of allProducts) {
      console.log(`- ID: ${product.id}, Title: ${product.titleOriginal}`);
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
