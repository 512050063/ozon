import prisma from '../config/database';

async function quickCheck() {
  try {
    const products = await prisma.product.findMany({
      where: { category: 'ozon_product' }
    });

    const items = await prisma.warehouseItem.findMany({
      where: { ozonStoreId: 3 },
      include: { product: true }
    });

    console.log('Ozon产品数量:', products.length);
    console.log('仓库商品数量:', items.length);

    if (items.length > 0) {
      console.log('第一个商品:');
      console.log('- 标题:', items[0].product?.titleOriginal);
      console.log('- 价格:', items[0].product?.price);
    } else {
      console.log('没有找到Ozon产品');
    }

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickCheck();
