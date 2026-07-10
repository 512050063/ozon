import prisma from '../config/database';

async function verifyCreatedAt() {
  try {
    console.log('=== 验证商品创建时间存储 ===\n');

    const products = await prisma.product.findMany({
      take: 5,
      where: {
        category: 'ozon_product'
      },
      select: {
        id: true,
        titleOriginal: true,
        ozonProductId: true,
        ozonCreatedAt: true,
        ozonUpdatedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('商品信息（前5条）：');
    for (const product of products) {
      console.log(`\n商品ID: ${product.id}, Ozon商品ID: ${product.ozonProductId}`);
      console.log(`  商品名称: ${product.titleOriginal}`);
      console.log(`  Ozon平台创建时间: ${product.ozonCreatedAt ? product.ozonCreatedAt.toISOString() : '无'}`);
      console.log(`  Ozon平台更新时间: ${product.ozonUpdatedAt ? product.ozonUpdatedAt.toISOString() : '无'}`);
      console.log(`  本地数据库创建时间: ${product.createdAt.toISOString()}`);
      console.log(`  本地数据库更新时间: ${product.updatedAt.toISOString()}`);
    }

    console.log('\n=== 验证完成 ===');
  } catch (error) {
    console.error('验证失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCreatedAt();
