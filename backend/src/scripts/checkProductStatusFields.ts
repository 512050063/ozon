import prisma from '../config/database';

async function checkProductStatusFields() {
  try {
    console.log('=== 检查产品状态字段 ===\n');

    const products = await prisma.product.findMany({
      take: 2,
      where: {
        category: 'ozon_product'
      },
      select: {
        id: true,
        titleOriginal: true,
        ozonProductId: true,
        statusName: true,
        ozonOriginalData: true
      }
    });

    console.log(`找到 ${products.length} 个产品\n`);

    for (const product of products) {
      console.log(`\n产品ID: ${product.id}, Ozon产品ID: ${product.ozonProductId}`);
      console.log(`产品名称: ${product.titleOriginal}`);

      console.log('\n--- 数据库存储的字段 ---');
      console.log('statusName:', product.statusName);

      console.log('\n--- 原始数据中的状态相关字段 ---');
      if (product.ozonOriginalData) {
        const original = product.ozonOriginalData as any;
        console.log('status:', original.status);
        console.log('moderate_status:', original.moderate_status);
        console.log('status_name:', original.status_name);
        console.log('validation_status:', original.validation_status);
        console.log('statuses:', JSON.stringify(original.statuses, null, 2));
      }

      console.log('\n' + '='.repeat(60));
    }

    console.log('\n=== 检查完成 ===');
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductStatusFields();