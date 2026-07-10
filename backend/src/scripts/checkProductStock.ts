import prisma from '../config/database';

async function checkProductStock() {
  try {
    console.log('=== 检查产品库存信息 ===');

    const products = await prisma.product.findMany({
      take: 5,
      select: {
        id: true,
        titleOriginal: true,
        ozonProductId: true,
        stockFbo: true,
        stockFbs: true,
        totalStock: true,
        ozonOriginalData: true
      }
    });

    console.log('产品表中的库存信息:');
    for (const product of products) {
      console.log(`\n产品ID: ${product.id}`);
      console.log(`产品名称: ${product.titleOriginal}`);
      console.log(`Ozon产品ID: ${product.ozonProductId}`);
      console.log(`FBO库存: ${product.stockFbo}`);
      console.log(`FBS库存: ${product.stockFbs}`);
      console.log(`总库存: ${product.totalStock}`);
      
      console.log('\n原始库存数据:');
      if (product.ozonOriginalData) {
        const original = product.ozonOriginalData as any;
        console.log(JSON.stringify(original.stocks, null, 2));
      }
    }

    const warehouseItems = await prisma.warehouseItem.findMany({
      take: 5,
      include: {
        product: true
      }
    });

    console.log('\n=== 仓库表中的库存信息 ===');
    for (const item of warehouseItems) {
      console.log(`\n仓库ID: ${item.id}`);
      console.log(`Ozon产品ID: ${item.ozonProductId}`);
      console.log(`产品名称: ${item.product?.titleOriginal}`);
      console.log(`库存数量: ${item.inventoryQuantity}`);
      console.log(`状态: ${item.status}`);
      console.log(`创建时间: ${item.createdAt}`);
      console.log(`更新时间: ${item.updatedAt}`);
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductStock();