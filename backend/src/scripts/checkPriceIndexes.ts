import prisma from '../config/database';

async function checkPriceIndexes() {
  try {
    console.log('=== 检查价格指数字段 ===\n');

    const products = await prisma.product.findMany({
      take: 2,
      where: {
        category: 'ozon_product'
      },
      select: {
        id: true,
        titleOriginal: true,
        ozonProductId: true,
        ozonOriginalData: true
      }
    });

    console.log(`找到 ${products.length} 个产品\n`);

    for (const product of products) {
      console.log(`\n产品ID: ${product.id}, Ozon产品ID: ${product.ozonProductId}`);
      console.log(`产品名称: ${product.titleOriginal}`);

      console.log('\n--- ozonOriginalData 中的价格指数相关字段 ---');
      if (product.ozonOriginalData) {
        const original = product.ozonOriginalData as any;
        console.log('price_indexes:', JSON.stringify(original.price_indexes, null, 2));
        console.log('color_index:', original.color_index);
        console.log('ozon_index_data:', JSON.stringify(original.ozon_index_data, null, 2));
        console.log('external_index_data:', JSON.stringify(original.external_index_data, null, 2));
        console.log('self_marketplaces_index_data:', JSON.stringify(original.self_marketplaces_index_data, null, 2));
        console.log('price_index_value:', original.price_index_value);
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

checkPriceIndexes();